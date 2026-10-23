package com.kairo.planner.scale

/** Platform-neutral view of a BLE advertisement, so drivers are pure functions and unit-testable. */
interface BleAdvertisement {
    val id: String
    val name: String?
    val rssi: Int
    val serviceUuids16: Set<Int>
    fun serviceData(uuid16: Int): ByteArray?
    fun manufacturerData(companyId: Int): ByteArray?
}

enum class WeightUnit { KG, LB, JIN }

/** Extra composition values reported directly by a scale (standard Body Composition Service). */
data class ReportedComposition(
    val bodyFatPercent: Double? = null,
    val musclePercent: Double? = null,
    val muscleMassKg: Double? = null,
    val waterMassKg: Double? = null,
    val bmrKcal: Int? = null,
)

data class ScaleReading(
    val weightKg: Double,
    val impedance: Int? = null,
    val stable: Boolean,
    /** Scale reports that the person stepped off – the reading is final. */
    val loadRemoved: Boolean = false,
    /** Impedance measurement in progress / finished flag as reported by the device. */
    val impedanceExpected: Boolean = false,
    val unit: WeightUnit = WeightUnit.KG,
    /** Scale clock time (may be unsynced, used only for de-duplication). */
    val deviceTimestamp: String? = null,
    val reported: ReportedComposition? = null,
    val userIndex: Int? = null,
)

data class DetectedScale(
    val id: String,
    val name: String,
    val driverId: String,
    val driverName: String,
    val rssi: Int,
    val connectable: Boolean,
)

sealed interface ScaleState {
    data object Idle : ScaleState
    data class Scanning(val devices: List<DetectedScale>) : ScaleState
    data class Connecting(val device: DetectedScale) : ScaleState
    data class Measuring(val device: DetectedScale, val live: ScaleReading) : ScaleState
    data class Done(val device: DetectedScale, val reading: ScaleReading) : ScaleState
    data class Error(val kind: ScaleError, val message: String? = null) : ScaleState
}

enum class ScaleError { BLUETOOTH_OFF, PERMISSION, UNSUPPORTED, CONNECTION, TIMEOUT, UNKNOWN }
