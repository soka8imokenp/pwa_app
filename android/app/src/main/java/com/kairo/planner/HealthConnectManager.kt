package com.kairo.planner

import android.content.Context
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * HealthConnectManager:
 * Connects directly to Android Health Connect to pull actual daily steps
 * recorded by Samsung Health, Zepp Life, and Google Fit.
 */
class HealthConnectManager(private val context: Context) {

    val healthConnectClient: HealthConnectClient? by lazy {
        try {
            if (isAvailable()) HealthConnectClient.getOrCreate(context) else null
        } catch (e: Throwable) {
            null
        }
    }

    fun isAvailable(): Boolean {
        return try {
            HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
        } catch (e: Throwable) {
            false
        }
    }

    val permissions: Set<String> by lazy {
        try {
            setOf(
                HealthPermission.getReadPermission(StepsRecord::class),
                HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class)
            )
        } catch (e: Throwable) {
            emptySet()
        }
    }

    fun createPermissionContract(): androidx.activity.result.contract.ActivityResultContract<Set<String>, Set<String>> {
        return PermissionController.createRequestPermissionResultContract()
    }

    interface StepCallback {
        fun onStepsFetched(steps: Long, caloriesKcal: Double)
    }

    fun checkAndRequestPermissions(launcher: ActivityResultLauncher<Set<String>>, onGranted: Runnable) {
        val client = healthConnectClient ?: return
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                if (granted.containsAll(permissions)) {
                    onGranted.run()
                } else {
                    launcher.launch(permissions)
                }
            } catch (e: Throwable) {
                e.printStackTrace()
            }
        }
    }

    fun readTodaySteps(callback: StepCallback) {
        val client = healthConnectClient ?: return
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val zoneId = ZoneId.systemDefault()
                val todayStart = LocalDate.now(zoneId).atStartOfDay(zoneId).toInstant()
                val now = Instant.now()

                var totalSteps = 0L
                try {
                    val aggResponse = client.aggregate(
                        androidx.health.connect.client.request.AggregateRequest(
                            metrics = setOf(StepsRecord.COUNT_TOTAL),
                            timeRangeFilter = TimeRangeFilter.between(todayStart, now)
                        )
                    )
                    totalSteps = aggResponse[StepsRecord.COUNT_TOTAL] ?: 0L
                } catch (e: Throwable) {
                    totalSteps = 0L
                }

                if (totalSteps == 0L) {
                    val stepsResponse = client.readRecords(
                        ReadRecordsRequest(
                            recordType = StepsRecord::class,
                            timeRangeFilter = TimeRangeFilter.between(todayStart, now)
                        )
                    )
                    totalSteps = stepsResponse.records.sumOf { it.count }
                }

                var totalKcal = 0.0
                try {
                    val caloriesResponse = client.readRecords(
                        ReadRecordsRequest(
                            recordType = TotalCaloriesBurnedRecord::class,
                            timeRangeFilter = TimeRangeFilter.between(todayStart, now)
                        )
                    )
                    totalKcal = caloriesResponse.records.sumOf { it.energy.inKilocalories }
                } catch (ignored: Throwable) {}

                CoroutineScope(Dispatchers.Main).launch {
                    callback.onStepsFetched(totalSteps, totalKcal)
                }
            } catch (e: Throwable) {
                e.printStackTrace()
            }
        }
    }

    fun openHealthConnectSettings() {
        try {
            val intent = android.content.Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)
            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        } catch (e: Throwable) {
            try {
                val intent = android.content.Intent("android.health.connect.action.HEALTH_HOME_SETTINGS")
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(intent)
            } catch (e2: Throwable) {
                e2.printStackTrace()
            }
        }
    }
}
