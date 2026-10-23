package com.kairo.planner

import android.app.Application
import com.kairo.planner.data.DriverFactory
import com.kairo.planner.di.sharedModule
import com.kairo.planner.notifications.Channels
import com.kairo.planner.platform.AndroidBiometrics
import com.kairo.planner.platform.AndroidHealthPlatform
import com.kairo.planner.platform.AndroidPlatform
import com.kairo.planner.platform.AndroidScalePlatform
import com.kairo.planner.platform.BiometricAuth
import com.kairo.planner.platform.HealthPlatform
import com.kairo.planner.platform.PlatformServices
import com.kairo.planner.scale.ScalePlatform
import com.russhwolf.settings.Settings
import com.russhwolf.settings.SharedPreferencesSettings
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin
import org.koin.dsl.bind
import org.koin.dsl.module

class SumireApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Channels.ensure(this)
        val androidModule = module {
            single<Settings> { SharedPreferencesSettings(getSharedPreferences("sumire_settings", MODE_PRIVATE)) }
            single { DriverFactory(get()) }
            single { AndroidHealthPlatform(get(), get()) } bind HealthPlatform::class
            single<PlatformServices> { AndroidPlatform(get(), get(), get()) }
            single<ScalePlatform> { AndroidScalePlatform(get()) { get<PlatformServices>() } }
            single<BiometricAuth> { AndroidBiometrics(get()) }
        }
        startKoin {
            androidContext(this@SumireApp)
            modules(androidModule, sharedModule)
        }
    }
}
