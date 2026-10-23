package com.kairo.planner.platform

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.net.Uri
import androidx.core.content.ContextCompat
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.BodyFatRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HydrationRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.records.metadata.Metadata
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.units.Mass
import androidx.health.connect.client.units.Percentage
import androidx.health.connect.client.units.Volume
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.kairo.planner.core.Time
import com.kairo.planner.data.AppSettings
import com.kairo.planner.steps.StepWorker
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.datetime.LocalDate
import kotlinx.datetime.atStartOfDayIn
import kotlinx.datetime.plus
import kotlinx.datetime.DateTimeUnit
import kotlin.time.toJavaInstant
import java.time.Instant
import java.time.ZoneId
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume

class AndroidHealthPlatform(
    private val context: Context,
    private val settings: AppSettings,
) : HealthPlatform {

    val requiredPermissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(WeightRecord::class),
    )

    val permissions = requiredPermissions + setOf(
        HealthPermission.getReadPermission(BodyFatRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
        HealthPermission.getWritePermission(WeightRecord::class),
        HealthPermission.getWritePermission(BodyFatRecord::class),
        HealthPermission.getWritePermission(HydrationRecord::class),
    )

    private val client: HealthConnectClient? by lazy {
        if (isAvailable()) runCatching { HealthConnectClient.getOrCreate(context) }.getOrNull() else null
    }

    fun isAvailable(): Boolean = HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE

    override fun status(): HealthConnectStatus = when (HealthConnectClient.getSdkStatus(context)) {
        HealthConnectClient.SDK_AVAILABLE -> HealthConnectStatus.AVAILABLE
        HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> HealthConnectStatus.NEEDS_UPDATE
        else -> if (android.os.Build.VERSION.SDK_INT >= 28) HealthConnectStatus.NOT_INSTALLED else HealthConnectStatus.UNSUPPORTED
    }

    private suspend fun granted(): Set<String> =
        runCatching { client?.permissionController?.getGrantedPermissions() }.getOrNull() ?: emptySet()

    override suspend fun hasPermissions(): Boolean = client != null && granted().containsAll(requiredPermissions)

    private suspend fun can(p: String) = p in granted()

    override fun openInstall() {
        val uri = Uri.parse("market://details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding")
        val i = Intent(Intent.ACTION_VIEW, uri).setPackage("com.android.vending").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { context.startActivity(i) }.onFailure {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }

    override fun openSettings() {
        val action = if (android.os.Build.VERSION.SDK_INT >= 34) "android.health.connect.action.MANAGE_HEALTH_PERMISSIONS" else HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS
        val i = Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        if (android.os.Build.VERSION.SDK_INT >= 34) i.putExtra(Intent.EXTRA_PACKAGE_NAME, context.packageName)
        runCatching { context.startActivity(i) }.onFailure {
            runCatching { context.startActivity(Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
        }
    }

    private fun LocalDate.startInstant(): Instant = atStartOfDayIn(Time.zone()).toJavaInstant()

    override suspend fun readSteps(date: LocalDate): Int? {
        val c = client ?: return null
        if (!can(HealthPermission.getReadPermission(StepsRecord::class))) return null
        return runCatching {
            val start = date.startInstant()
            val end = minOf(date.plus(1, DateTimeUnit.DAY).startInstant(), Instant.now())
            val r = c.aggregate(AggregateRequest(setOf(StepsRecord.COUNT_TOTAL), TimeRangeFilter.between(start, end)))
            r[StepsRecord.COUNT_TOTAL]?.toInt()
        }.getOrNull()
    }

    override suspend fun readWeights(sinceMs: Long): List<ExternalWeight> {
        val c = client ?: return emptyList()
        if (!can(HealthPermission.getReadPermission(WeightRecord::class))) return emptyList()
        return runCatching {
            val filter = TimeRangeFilter.after(Instant.ofEpochMilli(sinceMs))
            val weights = c.readRecords(ReadRecordsRequest(WeightRecord::class, filter, pageSize = 1000)).records
            val fats = if (can(HealthPermission.getReadPermission(BodyFatRecord::class))) {
                c.readRecords(ReadRecordsRequest(BodyFatRecord::class, filter, pageSize = 1000)).records
            } else emptyList()
            weights.map { w ->
                // Pair body fat measured within 5 minutes of the weigh-in (scales write both at once).
                val fat = fats.minByOrNull { kotlin.math.abs(it.time.toEpochMilli() - w.time.toEpochMilli()) }
                    ?.takeIf { kotlin.math.abs(it.time.toEpochMilli() - w.time.toEpochMilli()) < 5 * 60_000 }
                ExternalWeight(
                    id = w.metadata.id,
                    timeMs = w.time.toEpochMilli(),
                    weightKg = w.weight.inKilograms,
                    bodyFatPercent = fat?.percentage?.value,
                    sourceApp = w.metadata.dataOrigin.packageName,
                )
            }
        }.getOrDefault(emptyList())
    }

    override suspend fun readWorkouts(sinceMs: Long): List<ExternalWorkout> {
        val c = client ?: return emptyList()
        if (!can(HealthPermission.getReadPermission(ExerciseSessionRecord::class))) return emptyList()
        return runCatching {
            val sessions = c.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, TimeRangeFilter.after(Instant.ofEpochMilli(sinceMs)), pageSize = 500)).records
            val canCalories = can(HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class))
            sessions.map { s ->
                val kcal = if (canCalories) runCatching {
                    c.aggregate(AggregateRequest(setOf(TotalCaloriesBurnedRecord.ENERGY_TOTAL), TimeRangeFilter.between(s.startTime, s.endTime)))[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories?.toInt()
                }.getOrNull() else null
                ExternalWorkout(
                    id = s.metadata.id,
                    startMs = s.startTime.toEpochMilli(),
                    durationMinutes = ((s.endTime.toEpochMilli() - s.startTime.toEpochMilli()) / 60_000).toInt().coerceAtLeast(1),
                    type = exerciseName(s.exerciseType),
                    title = s.title,
                    calories = kcal,
                    sourceApp = s.metadata.dataOrigin.packageName,
                )
            }
        }.getOrDefault(emptyList())
    }

    override suspend fun writeWeight(timeMs: Long, weightKg: Double, bodyFatPercent: Double?): Boolean {
        val c = client ?: return false
        if (!can(HealthPermission.getWritePermission(WeightRecord::class))) return false
        return runCatching {
            val t = Instant.ofEpochMilli(timeMs)
            val offset = ZoneId.systemDefault().rules.getOffset(t)
            val records = buildList {
                add(WeightRecord(time = t, zoneOffset = offset, weight = Mass.kilograms(weightKg), metadata = Metadata.manualEntry()))
                if (bodyFatPercent != null && can(HealthPermission.getWritePermission(BodyFatRecord::class))) {
                    add(BodyFatRecord(time = t, zoneOffset = offset, percentage = Percentage(bodyFatPercent), metadata = Metadata.manualEntry()))
                }
            }
            c.insertRecords(records)
            true
        }.getOrDefault(false)
    }

    override suspend fun writeHydration(timeMs: Long, ml: Int): Boolean {
        val c = client ?: return false
        if (ml <= 0 || !can(HealthPermission.getWritePermission(HydrationRecord::class))) return false
        return runCatching {
            val end = Instant.ofEpochMilli(timeMs)
            val start = end.minusSeconds(60)
            val offset = ZoneId.systemDefault().rules.getOffset(end)
            c.insertRecords(listOf(HydrationRecord(start, offset, end, offset, Volume.milliliters(ml.toDouble()), Metadata.manualEntry())))
            true
        }.getOrDefault(false)
    }

    // ---------------------------------------------------------------- phone step counter

    private val sensorManager by lazy { context.getSystemService(SensorManager::class.java) }

    override fun hasStepSensor(): Boolean =
        context.packageManager.hasSystemFeature(PackageManager.FEATURE_SENSOR_STEP_COUNTER) &&
            sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null

    private fun sensorPermitted(): Boolean = android.os.Build.VERSION.SDK_INT < 29 ||
        ContextCompat.checkSelfPermission(context, android.Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED

    /** TYPE_STEP_COUNTER is cumulative since boot; deliver the first event and stop listening. */
    private suspend fun readRawCounter(): Long? {
        val sm = sensorManager ?: return null
        val sensor = sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) ?: return null
        return withTimeoutOrNull(5_000) {
            suspendCancellableCoroutine { cont ->
                val listener = object : SensorEventListener {
                    override fun onSensorChanged(event: SensorEvent) {
                        sm.unregisterListener(this)
                        if (cont.isActive) cont.resume(event.values[0].toLong())
                    }
                    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
                }
                sm.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL)
                cont.invokeOnCancellation { sm.unregisterListener(listener) }
            }
        }
    }

    /**
     * Accumulates deltas between readings into "today", surviving reboots (counter reset)
     * and midnight (new day starts from the next delta).
     */
    @Synchronized
    private fun accumulate(raw: Long): Int {
        val today = Time.todayKey()
        if (settings.sensorBaselineDate != today) {
            settings.sensorBaselineDate = today
            settings.sensorStepsToday = 0
        }
        val last = settings.sensorLastRaw
        val delta = when {
            last < 0 -> 0L
            raw >= last -> raw - last
            else -> raw // device rebooted, counter restarted from 0
        }
        if (delta in 0..40_000) settings.sensorStepsToday = settings.sensorStepsToday + delta
        settings.sensorLastRaw = raw
        return settings.sensorStepsToday.toInt()
    }

    override suspend fun readSensorStepsToday(): Int? {
        if (!hasStepSensor() || !sensorPermitted()) return null
        val raw = readRawCounter() ?: return if (settings.sensorBaselineDate == Time.todayKey()) settings.sensorStepsToday.toInt() else null
        return accumulate(raw)
    }

    override fun ensureBackgroundStepTracking() {
        if (!hasStepSensor() && !isAvailable()) return
        val req = PeriodicWorkRequestBuilder<StepWorker>(15, TimeUnit.MINUTES).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork("steps", ExistingPeriodicWorkPolicy.KEEP, req)
    }

    private fun exerciseName(type: Int): String = when (type) {
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING, ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL -> "running"
        ExerciseSessionRecord.EXERCISE_TYPE_WALKING -> "walking"
        ExerciseSessionRecord.EXERCISE_TYPE_HIKING -> "hiking"
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING, ExerciseSessionRecord.EXERCISE_TYPE_BIKING_STATIONARY -> "biking"
        ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL, ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_OPEN_WATER -> "swimming"
        ExerciseSessionRecord.EXERCISE_TYPE_YOGA -> "yoga"
        ExerciseSessionRecord.EXERCISE_TYPE_PILATES -> "pilates"
        ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING, ExerciseSessionRecord.EXERCISE_TYPE_WEIGHTLIFTING -> "strength"
        ExerciseSessionRecord.EXERCISE_TYPE_CALISTHENICS -> "calisthenics"
        ExerciseSessionRecord.EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING -> "hiit"
        ExerciseSessionRecord.EXERCISE_TYPE_STRETCHING -> "stretching"
        ExerciseSessionRecord.EXERCISE_TYPE_FOOTBALL_AMERICAN, ExerciseSessionRecord.EXERCISE_TYPE_SOCCER,
        ExerciseSessionRecord.EXERCISE_TYPE_BASKETBALL, ExerciseSessionRecord.EXERCISE_TYPE_VOLLEYBALL -> "ball sport"
        ExerciseSessionRecord.EXERCISE_TYPE_TENNIS, ExerciseSessionRecord.EXERCISE_TYPE_BADMINTON -> "tennis"
        ExerciseSessionRecord.EXERCISE_TYPE_BOXING, ExerciseSessionRecord.EXERCISE_TYPE_MARTIAL_ARTS -> "martial arts"
        else -> "workout"
    }
}
