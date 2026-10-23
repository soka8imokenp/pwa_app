package com.kairo.planner.steps

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.kairo.planner.data.HealthSync
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

/** Runs every ~15 minutes: samples the step counter / Health Connect and stores today's total. */
class StepWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params), KoinComponent {
    private val sync: HealthSync by inject()

    override suspend fun doWork(): Result = runCatching {
        sync.refreshSteps()
        Result.success()
    }.getOrElse { Result.retry() }
}
