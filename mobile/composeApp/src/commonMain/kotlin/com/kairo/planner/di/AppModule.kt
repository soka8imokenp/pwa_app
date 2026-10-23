package com.kairo.planner.di

import com.kairo.planner.ai.ContextBuilder
import com.kairo.planner.ai.GeminiClient
import com.kairo.planner.ai.SumireAssistant
import com.kairo.planner.data.AppJson
import com.kairo.planner.data.AppSettings
import com.kairo.planner.data.BackupService
import com.kairo.planner.data.ChangeListener
import com.kairo.planner.data.DriverFactory
import com.kairo.planner.data.HealthRepository
import com.kairo.planner.data.HealthSync
import com.kairo.planner.data.PlannerRepository
import com.kairo.planner.data.createDatabase
import com.kairo.planner.domain.planner.AppLock
import com.kairo.planner.domain.planner.FocusController
import com.kairo.planner.platform.PlatformServices
import com.kairo.planner.scale.ScaleManager
import com.kairo.planner.ui.health.ActivityViewModel
import com.kairo.planner.ui.health.BodyViewModel
import com.kairo.planner.ui.health.CoachViewModel
import com.kairo.planner.ui.health.FoodViewModel
import com.kairo.planner.ui.planner.TodayViewModel
import io.ktor.client.HttpClient
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import org.koin.core.module.Module
import org.koin.core.module.dsl.viewModelOf
import org.koin.core.qualifier.named
import org.koin.dsl.module

/** Application-wide coroutine scope for work that must outlive a screen (timers, BLE, saving). */
val APP_SCOPE = named("appScope")

/**
 * Shared graph. The platform module must provide: [DriverFactory], `Settings`, [PlatformServices],
 * [com.kairo.planner.platform.HealthPlatform], [com.kairo.planner.scale.ScalePlatform] and
 * [com.kairo.planner.platform.BiometricAuth].
 */
val sharedModule: Module = module {
    single(APP_SCOPE) { CoroutineScope(SupervisorJob() + Dispatchers.Default) }
    single { createDatabase(get<DriverFactory>()) }
    single { AppSettings(get()) }
    single<ChangeListener> { ChangeListener { } }
    single {
        HttpClient {
            install(ContentNegotiation) { json(AppJson) }
            install(HttpTimeout) {
                connectTimeoutMillis = 15_000
                requestTimeoutMillis = 60_000
                socketTimeoutMillis = 60_000
            }
        }
    }
    single { PlannerRepository(get(), get()) }
    single { HealthRepository(get(), get(), get()) }
    single { HealthSync(get(), get(), get()) }
    single { BackupService(get(), get()) }
    single { GeminiClient(get()) }
    single { ContextBuilder(get(), get()) }
    single { SumireAssistant(get(), get(), get(), get(), get(), get()) }
    single { ScaleManager(get(APP_SCOPE), get()) }
    single { AppLock(get()) }
    single { FocusController(get(APP_SCOPE), get(), get()) { get<PlatformServices>() } }

    viewModelOf(::TodayViewModel)
    viewModelOf(::BodyViewModel)
    viewModelOf(::FoodViewModel)
    viewModelOf(::ActivityViewModel)
    viewModelOf(::CoachViewModel)
}
