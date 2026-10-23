package com.kairo.planner.scale

import com.juul.kable.Bluetooth
import com.juul.kable.Peripheral
import com.juul.kable.PlatformAdvertisement
import com.juul.kable.Scanner
import com.juul.kable.characteristicOf
import com.kairo.planner.core.Time
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.datetime.toInstant
import kotlin.uuid.Uuid

/** Platform hooks the scale manager needs (Bluetooth adapter state, persisted de-dup key). */
interface ScalePlatform {
    fun isBluetoothEnabled(): Boolean
    fun hasPermissions(): Boolean
}

/**
 * Scans for any supported scale, follows a live measurement and emits a final reading.
 *
 * Finalisation rules for broadcast scales (Xiaomi):
 *  - stable + impedance received → done (full body composition);
 *  - stable + person stepped off without impedance (socks, wet feet) → done (weight only);
 *  - stable for [STABLE_WITHOUT_IMPEDANCE_MS] without impedance → done (weight only).
 * Readings whose device timestamp equals the last saved one are ignored, so the cached
 * "last measurement" a Xiaomi scale keeps broadcasting is never imported twice.
 */
class ScaleManager(
    private val scope: CoroutineScope,
    private val platform: ScalePlatform,
) {
    private val _state = MutableStateFlow<ScaleState>(ScaleState.Idle)
    val state: StateFlow<ScaleState> = _state.asStateFlow()

    private var scanJob: Job? = null
    private var gattJob: Job? = null
    private var peripheral: Peripheral? = null
    private val devices = LinkedHashMap<String, DetectedScale>()

    private var expectedWeight: Double? = null
    private var ignoreTimestamp: String? = null
    private var stableSince: Long = 0
    private var sawLivePacket = false
    private var lastStable: ScaleReading? = null

    fun start(expectedWeightKg: Double?, lastSavedDeviceTimestamp: String?) {
        stop()
        if (!platform.hasPermissions()) {
            _state.value = ScaleState.Error(ScaleError.PERMISSION)
            return
        }
        if (!platform.isBluetoothEnabled()) {
            _state.value = ScaleState.Error(ScaleError.BLUETOOTH_OFF)
            return
        }
        expectedWeight = expectedWeightKg
        ignoreTimestamp = lastSavedDeviceTimestamp
        devices.clear()
        sawLivePacket = false
        stableSince = 0
        lastStable = null
        _state.value = ScaleState.Scanning(emptyList())

        val scanner = Scanner { }
        scanJob = scanner.advertisements
            .onEach { onAdvertisement(it) }
            .launchIn(scope)
        scanJob?.invokeOnCompletion { e ->
            if (e != null && e !is kotlinx.coroutines.CancellationException) {
                _state.value = ScaleState.Error(ScaleError.UNKNOWN, e.message)
            }
        }
        // Give up after two minutes of nothing.
        scope.launch {
            delay(120_000)
            if (_state.value is ScaleState.Scanning) {
                stop()
                _state.value = ScaleState.Error(ScaleError.TIMEOUT)
            }
        }
    }

    fun stop() {
        scanJob?.cancel()
        scanJob = null
        gattJob?.cancel()
        gattJob = null
        val p = peripheral
        peripheral = null
        if (p != null) scope.launch { runCatching { p.disconnect() } }
        if (_state.value !is ScaleState.Done && _state.value !is ScaleState.Error) _state.value = ScaleState.Idle
    }

    fun reset() {
        stop()
        _state.value = ScaleState.Idle
    }

    private fun onAdvertisement(platformAdv: PlatformAdvertisement) {
        val adv = KableAdvertisement(platformAdv)
        val driver = ScaleDrivers.find(adv) ?: return
        val device = DetectedScale(
            id = adv.id,
            name = adv.name ?: driver.displayName,
            driverId = driver.id,
            driverName = driver.displayName,
            rssi = adv.rssi,
            connectable = driver is GattScaleDriver,
        )
        devices[device.id] = device

        when (driver) {
            is BroadcastScaleDriver -> {
                val reading = driver.parse(adv, expectedWeight) ?: return
                onBroadcastReading(device, reading)
            }
            is GattScaleDriver -> {
                if (gattJob == null) connectGatt(platformAdv, device, driver)
            }
        }
        val s = _state.value
        if (s is ScaleState.Scanning) _state.value = ScaleState.Scanning(devices.values.toList())
    }

    private fun onBroadcastReading(device: DetectedScale, reading: ScaleReading) {
        if (_state.value is ScaleState.Done) return
        if (reading.weightKg < 5.0) return // empty platform

        val isCachedOldReading = reading.loadRemoved && reading.deviceTimestamp != null && reading.deviceTimestamp == ignoreTimestamp
        if (isCachedOldReading) return

        if (!reading.loadRemoved) sawLivePacket = true
        // A "removed" packet seen before any live packet is the scale's memory of an earlier weigh-in.
        // Accept it only when it is recent, so a measurement made seconds before opening the screen is still picked up,
        // but yesterday's weigh-in is not presented as a new one.
        if (reading.loadRemoved && !sawLivePacket) {
            val age = reading.deviceTimestamp?.let { ageMinutes(it) }
            if (age == null || age > 15) return
        }

        _state.value = ScaleState.Measuring(device, reading)
        val now = Time.nowMs()

        if (reading.stable) {
            if (stableSince == 0L) stableSince = now
            lastStable = reading
        } else {
            stableSince = 0
        }

        val done = when {
            reading.stable && reading.impedance != null -> reading
            reading.stable && reading.loadRemoved -> reading
            !reading.impedanceExpected && reading.stable -> reading
            stableSince > 0 && now - stableSince > STABLE_WITHOUT_IMPEDANCE_MS -> lastStable
            reading.loadRemoved && lastStable != null -> lastStable
            else -> null
        }
        if (done != null) finish(device, done)
    }

    private fun connectGatt(adv: PlatformAdvertisement, device: DetectedScale, driver: GattScaleDriver) {
        gattJob = scope.launch {
            _state.value = ScaleState.Connecting(device)
            val p = Peripheral(adv)
            peripheral = p
            try {
                withTimeoutOrNull(20_000) { p.connect() } ?: run {
                    _state.value = ScaleState.Error(ScaleError.CONNECTION)
                    return@launch
                }
                var composition: ReportedComposition? = null
                var impedance: Int? = null
                _state.value = ScaleState.Measuring(device, ScaleReading(0.0, stable = false))
                driver.subscriptions.forEach { ch ->
                    val characteristic = characteristicOf(uuid16(ch.service16), uuid16(ch.characteristic16))
                    p.observe(characteristic)
                        .onEach { bytes ->
                            val r = driver.parse(ch, bytes) ?: return@onEach
                            r.reported?.let { composition = it }
                            r.impedance?.let { impedance = it }
                            if (r.weightKg >= 5.0) {
                                finish(device, r.copy(reported = r.reported ?: composition, impedance = r.impedance ?: impedance))
                            }
                        }
                        .launchIn(this)
                }
                delay(90_000)
                if (_state.value !is ScaleState.Done) _state.value = ScaleState.Error(ScaleError.TIMEOUT)
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                _state.value = ScaleState.Error(ScaleError.CONNECTION, e.message)
            } finally {
                runCatching { p.disconnect() }
            }
        }
    }

    private fun finish(device: DetectedScale, reading: ScaleReading) {
        if (_state.value is ScaleState.Done) return
        _state.value = ScaleState.Done(device, reading)
        scanJob?.cancel()
        scanJob = null
        gattJob?.cancel()
        gattJob = null
    }

    /** Minutes between the scale's clock stamp and now, or null if it can't be parsed. */
    private fun ageMinutes(stamp: String): Long? = runCatching {
        val (date, time) = stamp.split(' ')
        val (y, mo, d) = date.split('-').map { it.toInt() }
        val (h, mi, se) = time.split(':').map { it.toInt() }
        val ldt = kotlinx.datetime.LocalDateTime(y, mo, d, h, mi, se)
        val ms = ldt.toInstant(Time.zone()).toEpochMilliseconds()
        kotlin.math.abs(Time.nowMs() - ms) / 60_000
    }.getOrNull()

    companion object {
        const val STABLE_WITHOUT_IMPEDANCE_MS = 6_000L
        fun uuid16(short: Int): Uuid = Bluetooth.BaseUuid + short
    }
}

private class KableAdvertisement(private val adv: PlatformAdvertisement) : BleAdvertisement {
    override val id: String = adv.identifier.toString()
    override val name: String? = adv.name ?: adv.peripheralName
    override val rssi: Int = adv.rssi
    override val serviceUuids16: Set<Int> = adv.uuids.mapNotNull { it.toShort16() }.toSet()
    override fun serviceData(uuid16: Int): ByteArray? = adv.serviceData(ScaleManager.uuid16(uuid16))
    override fun manufacturerData(companyId: Int): ByteArray? = adv.manufacturerData(companyId)
}

private fun Uuid.toShort16(): Int? {
    val s = toString().lowercase()
    if (!s.endsWith("-0000-1000-8000-00805f9b34fb") || !s.startsWith("0000")) return null
    return s.substring(4, 8).toIntOrNull(16)
}
