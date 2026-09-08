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
 * Seamlessly connects to Android Health Connect to automatically pull live steps
 * and burned calories recorded by Samsung Health, Zepp Life, Google Fit, and other fitness apps.
 */
class HealthConnectManager(private val context: Context) {

    val healthConnectClient: HealthConnectClient? by lazy {
        try {
            if (isAvailable()) HealthConnectClient.getOrCreate(context) else null
        } catch (e: Exception) {
            null
        }
    }

    fun isAvailable(): Boolean {
        return try {
            HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
        } catch (e: Exception) {
            false
        }
    }

    val permissions: Set<String> by lazy {
        setOf(
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class)
        )
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
            } catch (e: Exception) {
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

                val stepsResponse = client.readRecords(
                    ReadRecordsRequest(
                        recordType = StepsRecord::class,
                        timeRangeFilter = TimeRangeFilter.between(todayStart, now)
                    )
                )
                val totalSteps = stepsResponse.records.sumOf { it.count }

                var totalKcal = 0.0
                try {
                    val caloriesResponse = client.readRecords(
                        ReadRecordsRequest(
                            recordType = TotalCaloriesBurnedRecord::class,
                            timeRangeFilter = TimeRangeFilter.between(todayStart, now)
                        )
                    )
                    totalKcal = caloriesResponse.records.sumOf { it.energy.inKilocalories }
                } catch (ignored: Exception) {}

                CoroutineScope(Dispatchers.Main).launch {
                    callback.onStepsFetched(totalSteps, totalKcal)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}
