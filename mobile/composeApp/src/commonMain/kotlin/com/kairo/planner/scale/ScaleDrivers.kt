package com.kairo.planner.scale

import com.kairo.planner.core.round

/**
 * A driver knows how to recognise one family of scales and how to decode its data.
 * Two flavours exist:
 *  - [BroadcastScaleDriver]: the weight is inside the advertisement itself (Xiaomi Mi Scale 1/2). No pairing needed.
 *  - [GattScaleDriver]: the app connects and subscribes to measurement characteristics (Bluetooth SIG standard scales).
 *
 * New brands are added by writing one more driver and registering it in [ScaleDrivers.all].
 */
sealed interface ScaleDriver {
    val id: String
    val displayName: String
    fun matches(adv: BleAdvertisement): Boolean
}

interface BroadcastScaleDriver : ScaleDriver {
    /** @param expectedWeightKg the user's last known weight, used to resolve ambiguous unit encodings. */
    fun parse(adv: BleAdvertisement, expectedWeightKg: Double?): ScaleReading?
}

data class GattChannel(val service16: Int, val characteristic16: Int)

interface GattScaleDriver : ScaleDriver {
    val subscriptions: List<GattChannel>
    fun parse(channel: GattChannel, value: ByteArray): ScaleReading?
}

private const val SERVICE_BODY_COMPOSITION = 0x181B
private const val SERVICE_WEIGHT_SCALE = 0x181D
private const val CHAR_WEIGHT_MEASUREMENT = 0x2A9D
private const val CHAR_BODY_COMPOSITION_MEASUREMENT = 0x2A9C

private const val LB_TO_KG = 0.45359237

/** Xiaomi Mi Body Composition Scale 2 (XMTZC02HM / XMTZC05HM) and Mi Body Fat Scale. 13-byte service data on 0x181B. */
object XiaomiMiScale2Driver : BroadcastScaleDriver {
    override val id = "xiaomi_mi_scale_2"
    override val displayName = "Xiaomi Mi Body Composition Scale 2"

    override fun matches(adv: BleAdvertisement): Boolean {
        val data = adv.serviceData(SERVICE_BODY_COMPOSITION) ?: return false
        return data.size == 13
    }

    override fun parse(adv: BleAdvertisement, expectedWeightKg: Double?): ScaleReading? {
        val d = adv.serviceData(SERVICE_BODY_COMPOSITION) ?: return null
        return decode(d, expectedWeightKg)
    }

    fun decode(d: ByteArray, expectedWeightKg: Double?): ScaleReading? {
        if (d.size != 13) return null
        val ctrl0 = d.u8(0)
        val ctrl1 = d.u8(1)
        val isLb = (ctrl0 and 0x01) != 0
        val isJin = (ctrl1 and 0x40) != 0
        val stable = (ctrl1 and 0x20) != 0
        val hasImpedance = (ctrl1 and 0x02) != 0
        val removed = (ctrl1 and 0x80) != 0
        val impedance = d.u16le(9)
        val raw = d.u16le(11)

        var kg = when {
            isLb -> raw / 100.0 * LB_TO_KG
            isJin -> raw / 100.0 / 2.0
            else -> raw / 200.0
        }
        // Some firmware variants send kg in 0.01 steps. If the value is almost exactly half the user's weight, fix it.
        if (!isLb && !isJin && expectedWeightKg != null && expectedWeightKg > 30) {
            val ratio = expectedWeightKg / kg
            if (ratio in 1.85..2.15) kg = raw / 100.0
        }
        if (kg < 2.0 || kg > 250.0) return null

        return ScaleReading(
            weightKg = kg.round(2),
            impedance = impedance.takeIf { hasImpedance && it in 1..3000 },
            stable = stable,
            loadRemoved = removed,
            impedanceExpected = true,
            unit = when {
                isLb -> WeightUnit.LB
                isJin -> WeightUnit.JIN
                else -> WeightUnit.KG
            },
            deviceTimestamp = d.bleDateTime(2),
        )
    }
}

/** Xiaomi Mi Smart Scale (1st gen, XMTZC01HM / XMTZC04HM). 10-byte service data on 0x181D, weight only. */
object XiaomiMiScale1Driver : BroadcastScaleDriver {
    override val id = "xiaomi_mi_scale_1"
    override val displayName = "Xiaomi Mi Smart Scale"

    override fun matches(adv: BleAdvertisement): Boolean {
        val data = adv.serviceData(SERVICE_WEIGHT_SCALE) ?: return false
        return data.size == 10
    }

    override fun parse(adv: BleAdvertisement, expectedWeightKg: Double?): ScaleReading? {
        val d = adv.serviceData(SERVICE_WEIGHT_SCALE) ?: return null
        return decode(d)
    }

    fun decode(d: ByteArray): ScaleReading? {
        if (d.size != 10) return null
        val ctrl = d.u8(0)
        val isLb = (ctrl and 0x01) != 0
        val isJin = (ctrl and 0x10) != 0
        val stable = (ctrl and 0x20) != 0
        val removed = (ctrl and 0x80) != 0
        val raw = d.u16le(1)
        val kg = when {
            isLb -> raw / 100.0 * LB_TO_KG
            isJin -> raw / 100.0 / 2.0
            else -> raw / 200.0
        }
        if (kg < 2.0 || kg > 250.0) return null
        return ScaleReading(
            weightKg = kg.round(2),
            stable = stable,
            loadRemoved = removed,
            impedanceExpected = false,
            unit = when {
                isLb -> WeightUnit.LB
                isJin -> WeightUnit.JIN
                else -> WeightUnit.KG
            },
            deviceTimestamp = d.bleDateTime(3),
        )
    }
}

/**
 * Any scale implementing the Bluetooth SIG Weight Scale Service (0x181D) and/or Body Composition Service (0x181B).
 * Used by many Beurer, Sanitas, Medisana, Silvercrest, Omron, A&D, Garmin-compatible and white-label scales.
 */
object StandardGattScaleDriver : GattScaleDriver {
    override val id = "ble_standard"
    override val displayName = "Bluetooth Smart Scale (WSS/BCS)"

    private val WEIGHT = GattChannel(SERVICE_WEIGHT_SCALE, CHAR_WEIGHT_MEASUREMENT)
    private val BODY = GattChannel(SERVICE_BODY_COMPOSITION, CHAR_BODY_COMPOSITION_MEASUREMENT)

    override val subscriptions = listOf(WEIGHT, BODY)

    override fun matches(adv: BleAdvertisement): Boolean {
        // Xiaomi broadcast scales also advertise these UUIDs but carry service data; leave those to the Xiaomi drivers.
        if (XiaomiMiScale2Driver.matches(adv) || XiaomiMiScale1Driver.matches(adv)) return false
        return SERVICE_WEIGHT_SCALE in adv.serviceUuids16 || SERVICE_BODY_COMPOSITION in adv.serviceUuids16
    }

    override fun parse(channel: GattChannel, value: ByteArray): ScaleReading? = when (channel) {
        WEIGHT -> parseWeightMeasurement(value)
        BODY -> parseBodyComposition(value)
        else -> null
    }

    /** GATT 0x2A9D. */
    fun parseWeightMeasurement(v: ByteArray): ScaleReading? {
        if (v.size < 3) return null
        val flags = v.u8(0)
        val imperial = (flags and 0x01) != 0
        val raw = v.u16le(1)
        if (raw == 0xFFFF) return null
        var i = 3
        var ts: String? = null
        if ((flags and 0x02) != 0) { ts = v.bleDateTime(i); i += 7 }
        var user: Int? = null
        if ((flags and 0x04) != 0 && v.size > i) { user = v.u8(i).takeIf { it != 0xFF }; i += 1 }
        val kg = if (imperial) raw * 0.01 * LB_TO_KG else raw * 0.005
        if (kg < 2.0 || kg > 300.0) return null
        return ScaleReading(
            weightKg = kg.round(2),
            stable = true,
            loadRemoved = true,
            unit = if (imperial) WeightUnit.LB else WeightUnit.KG,
            deviceTimestamp = ts,
            userIndex = user,
        )
    }

    /** GATT 0x2A9C. Returns a reading with weight when the packet carries it, otherwise weight = 0 and only [ScaleReading.reported]. */
    fun parseBodyComposition(v: ByteArray): ScaleReading? {
        if (v.size < 4) return null
        val flags = v.u16le(0)
        val imperial = (flags and 0x0001) != 0
        val massRes = if (imperial) 0.01 * LB_TO_KG else 0.005
        val fatRaw = v.u16le(2)
        var i = 4
        fun has(bit: Int) = (flags and (1 shl bit)) != 0
        fun next16(): Int? = if (v.size >= i + 2) v.u16le(i).also { i += 2 } else null

        var ts: String? = null
        if (has(1)) { ts = v.bleDateTime(i); i += 7 }
        var user: Int? = null
        if (has(2) && v.size > i) { user = v.u8(i).takeIf { it != 0xFF }; i += 1 }
        val bmrKj = if (has(3)) next16() else null
        val musclePct = if (has(4)) next16() else null
        val muscleMass = if (has(5)) next16() else null
        if (has(6)) next16() // fat free mass
        if (has(7)) next16() // soft lean mass
        val waterMass = if (has(8)) next16() else null
        val impedance = if (has(9)) next16() else null
        val weight = if (has(10)) next16() else null

        val reported = ReportedComposition(
            bodyFatPercent = fatRaw.takeIf { it != 0xFFFF }?.let { (it * 0.1).round(1) },
            musclePercent = musclePct?.let { (it * 0.1).round(1) },
            muscleMassKg = muscleMass?.let { (it * massRes).round(1) },
            waterMassKg = waterMass?.let { (it * massRes).round(1) },
            bmrKcal = bmrKj?.let { (it / 4.184).toInt() },
        )
        val kg = weight?.let { it * massRes } ?: 0.0
        return ScaleReading(
            weightKg = kg.round(2),
            impedance = impedance?.let { it / 10 }?.takeIf { it in 1..3000 },
            stable = true,
            loadRemoved = weight != null,
            unit = if (imperial) WeightUnit.LB else WeightUnit.KG,
            deviceTimestamp = ts,
            reported = reported,
            userIndex = user,
        )
    }
}

object ScaleDrivers {
    val all: List<ScaleDriver> = listOf(XiaomiMiScale2Driver, XiaomiMiScale1Driver, StandardGattScaleDriver)

    fun find(adv: BleAdvertisement): ScaleDriver? = all.firstOrNull { it.matches(adv) }

    fun byId(id: String): ScaleDriver? = all.firstOrNull { it.id == id }
}
