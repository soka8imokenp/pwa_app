package com.kairo.planner.data

import com.kairo.planner.core.Time
import com.kairo.planner.core.key
import com.kairo.planner.core.minusDays
import com.kairo.planner.model.WorkoutCategory
import com.kairo.planner.platform.HealthConnectStatus
import com.kairo.planner.platform.HealthPlatform
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Pulls steps (Health Connect and/or the phone sensor), weights and workouts into the local DB.
 * Source "auto" takes the larger of Health Connect and the sensor for each day, because Health Connect
 * already de-duplicates watch + phone, while the sensor works even when no fitness app is installed.
 */
class HealthSync(
    private val platform: HealthPlatform,
    private val health: HealthRepository,
    private val settings: AppSettings,
) {
    private val mutex = Mutex()
    private val _lastResult = MutableStateFlow<String?>(null)
    val lastResult: StateFlow<String?> = _lastResult.asStateFlow()

    suspend fun refreshSteps() = mutex.withLock {
        val source = settings.stepSource.value
        if (source == "manual") return@withLock
        val today = Time.today()
        val hcOk = source != "sensor" && platform.status() == HealthConnectStatus.AVAILABLE && platform.hasPermissions()
        val sensor = if (source != "hc") platform.readSensorStepsToday() else null
        val hcToday = if (hcOk) platform.readSteps(today) else null
        val best = listOfNotNull(sensor, hcToday).maxOrNull()
        if (best != null) {
            val src = if (hcToday != null && hcToday >= (sensor ?: 0)) "health_connect" else "sensor"
            health.setSteps(today.key(), best, src)
        }
        // Back-fill the last week from Health Connect (the sensor can't look back).
        if (hcOk) {
            for (i in 1..6) {
                val d = today.minusDays(i)
                platform.readSteps(d)?.let { if (it > 0) health.setSteps(d.key(), it, "health_connect") }
            }
        }
    }

    /** Imports weigh-ins and workouts written by other apps (Zepp Life, Renpho, Samsung Health…). */
    suspend fun importFromHealthConnect(full: Boolean = false): Int = mutex.withLock {
        if (platform.status() != HealthConnectStatus.AVAILABLE || !platform.hasPermissions()) return@withLock 0
        val since = if (full || settings.lastHealthConnectImport == 0L) Time.nowMs() - 365L * 24 * 3600 * 1000
        else settings.lastHealthConnectImport - 3L * 24 * 3600 * 1000
        var imported = 0
        val ownPackage = "com.kairo.planner"
        platform.readWeights(since)
            .filter { !it.sourceApp.startsWith(ownPackage) }
            .forEach { w ->
                val ext = "hc:${w.id}"
                if (!health.hasExternalWeight(ext)) {
                    health.addWeight(
                        weightKg = w.weightKg,
                        source = "health_connect:${w.sourceApp}",
                        measuredAt = w.timeMs,
                        externalId = ext,
                        reportedBodyFat = w.bodyFatPercent,
                    )
                    imported++
                }
            }
        platform.readWorkouts(since)
            .filter { !it.sourceApp.startsWith(ownPackage) }
            .forEach { wo ->
                health.addWorkout(
                    date = Time.dateOf(wo.startMs).key(),
                    title = wo.title ?: wo.type,
                    category = mapWorkout(wo.type),
                    minutes = wo.durationMinutes,
                    calories = wo.calories,
                    source = "health_connect:${wo.sourceApp}",
                    externalId = "hc:${wo.id}",
                )
            }
        settings.lastHealthConnectImport = Time.nowMs()
        _lastResult.value = "weights:$imported"
        imported
    }

    private fun mapWorkout(type: String): WorkoutCategory {
        val t = type.lowercase()
        return when {
            "run" in t -> WorkoutCategory.RUN
            "walk" in t || "hik" in t -> WorkoutCategory.WALK
            "bik" in t || "cycl" in t -> WorkoutCategory.CYCLING
            "swim" in t -> WorkoutCategory.SWIM
            "yoga" in t || "pilates" in t || "stretch" in t -> WorkoutCategory.YOGA
            "strength" in t || "weight" in t || "calisthenics" in t -> WorkoutCategory.STRENGTH
            "interval" in t || "hiit" in t -> WorkoutCategory.HIIT
            "ball" in t || "tennis" in t || "sport" in t || "boxing" in t || "martial" in t -> WorkoutCategory.SPORTS
            else -> WorkoutCategory.CARDIO
        }
    }
}
