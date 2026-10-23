package com.kairo.planner.platform

import kotlinx.datetime.LocalDate

data class ExternalWeight(
    val id: String,
    val timeMs: Long,
    val weightKg: Double,
    val bodyFatPercent: Double?,
    val sourceApp: String,
)

data class ExternalWorkout(
    val id: String,
    val startMs: Long,
    val durationMinutes: Int,
    val type: String,
    val title: String?,
    val calories: Int?,
    val sourceApp: String,
)

enum class HealthConnectStatus { AVAILABLE, NEEDS_UPDATE, NOT_INSTALLED, UNSUPPORTED }

/**
 * Health data hub (Android: Health Connect + the phone's step-counter sensor; iOS: HealthKit later).
 * Every vendor app that syncs to Health Connect (Zepp Life, Mi Fitness, Samsung Health, Renpho, Eufy,
 * Withings, Huawei Health, Garmin, Fitbit, Google Fit...) becomes a data source through this interface.
 */
interface HealthPlatform {
    fun status(): HealthConnectStatus
    suspend fun hasPermissions(): Boolean
    fun openInstall()
    fun openSettings()

    suspend fun readSteps(date: LocalDate): Int?
    suspend fun readWeights(sinceMs: Long): List<ExternalWeight>
    suspend fun readWorkouts(sinceMs: Long): List<ExternalWorkout>

    suspend fun writeWeight(timeMs: Long, weightKg: Double, bodyFatPercent: Double?): Boolean
    suspend fun writeHydration(timeMs: Long, ml: Int): Boolean

    /** Hardware step counter (TYPE_STEP_COUNTER). */
    fun hasStepSensor(): Boolean
    /** Reads the sensor once and returns today's steps according to the persisted baseline, or null. */
    suspend fun readSensorStepsToday(): Int?
    /** Ensures background step tracking (periodic worker) is scheduled. */
    fun ensureBackgroundStepTracking()
}

object NoopHealthPlatform : HealthPlatform {
    override fun status() = HealthConnectStatus.UNSUPPORTED
    override suspend fun hasPermissions() = false
    override fun openInstall() {}
    override fun openSettings() {}
    override suspend fun readSteps(date: LocalDate): Int? = null
    override suspend fun readWeights(sinceMs: Long) = emptyList<ExternalWeight>()
    override suspend fun readWorkouts(sinceMs: Long) = emptyList<ExternalWorkout>()
    override suspend fun writeWeight(timeMs: Long, weightKg: Double, bodyFatPercent: Double?) = false
    override suspend fun writeHydration(timeMs: Long, ml: Int) = false
    override fun hasStepSensor() = false
    override suspend fun readSensorStepsToday(): Int? = null
    override fun ensureBackgroundStepTracking() {}
}
