package com.kairo.planner

import androidx.compose.ui.window.ComposeUIViewController
import com.kairo.planner.data.DriverFactory
import com.kairo.planner.di.sharedModule
import com.kairo.planner.platform.BiometricAuth
import com.kairo.planner.platform.HealthPlatform
import com.kairo.planner.platform.NoBiometrics
import com.kairo.planner.platform.NoopHealthPlatform
import com.kairo.planner.platform.NoopPlatform
import com.kairo.planner.platform.PlatformServices
import com.kairo.planner.scale.ScalePlatform
import com.russhwolf.settings.NSUserDefaultsSettings
import com.russhwolf.settings.Settings
import org.koin.core.context.startKoin
import org.koin.dsl.module
import platform.Foundation.NSUserDefaults
import platform.UIKit.UIViewController

private var koinStarted = false

/**
 * iOS entry point. Health (HealthKit) and platform services are stubs for now; the shared UI,
 * database, AI assistant and BLE scales (via Kable/CoreBluetooth) already work.
 */
fun MainViewController(): UIViewController {
    if (!koinStarted) {
        koinStarted = true
        startKoin {
            modules(
                module {
                    single<Settings> { NSUserDefaultsSettings(NSUserDefaults.standardUserDefaults) }
                    single { DriverFactory() }
                    single<PlatformServices> { NoopPlatform }
                    single<HealthPlatform> { NoopHealthPlatform }
                    single<BiometricAuth> { NoBiometrics }
                    single<ScalePlatform> {
                        object : ScalePlatform {
                            override fun isBluetoothEnabled() = true
                            override fun hasPermissions() = true
                        }
                    }
                },
                sharedModule,
            )
        }
    }
    return ComposeUIViewController { App(NoopPlatform) }
}
