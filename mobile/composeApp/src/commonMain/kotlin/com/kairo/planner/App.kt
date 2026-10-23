package com.kairo.planner

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import com.kairo.planner.data.AppLanguage
import com.kairo.planner.data.AppSettings
import com.kairo.planner.data.HealthSync
import com.kairo.planner.data.ThemeMode
import com.kairo.planner.domain.planner.AppLock
import com.kairo.planner.i18n.LocalStrings
import com.kairo.planner.i18n.stringsFor
import com.kairo.planner.platform.AppPermission
import com.kairo.planner.platform.BiometricAuth
import com.kairo.planner.platform.LocalPlatform
import com.kairo.planner.platform.PlatformServices
import com.kairo.planner.ui.MainScaffold
import com.kairo.planner.ui.onboarding.OnboardingScreen
import com.kairo.planner.ui.planner.TodayViewModel
import com.kairo.planner.ui.security.LockScreen
import com.kairo.planner.ui.splash.SplashScreen
import com.kairo.planner.ui.theme.SumireTheme
import kotlinx.coroutines.launch
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel

@Composable
fun App(platform: PlatformServices) {
    val settings = koinInject<AppSettings>()
    val lock = koinInject<AppLock>()
    val sync = koinInject<HealthSync>()
    val biometric = koinInject<BiometricAuth>()
    val langCode by settings.language.collectAsState()
    val themeName by settings.theme.collectAsState()
    val bio by settings.biometrics.collectAsState()
    val locked by lock.locked.collectAsState()
    val strings = stringsFor(AppLanguage.of(langCode.ifEmpty { "ru" }))
    val dark = when (ThemeMode.entries.firstOrNull { it.name == themeName } ?: ThemeMode.SYSTEM) {
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
    }
    var splashDone by rememberSaveable { mutableStateOf(false) }
    var onboarded by remember { mutableStateOf(settings.onboardingDone) }
    val scope = rememberCoroutineScope()

    CompositionLocalProvider(LocalStrings provides strings, LocalPlatform provides platform) {
        SumireTheme(dark = dark) {
            val today: TodayViewModel = koinViewModel()

            LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
                lock.onForeground()
                today.refreshDay()
                scope.launch {
                    sync.refreshSteps()
                    sync.importFromHealthConnect()
                }
            }
            LifecycleEventEffect(Lifecycle.Event.ON_STOP) { lock.onBackground() }

            LaunchedEffect(Unit) {
                val m = settings.eveningReviewMinute.value
                if (m >= 0 && platform.isGranted(AppPermission.NOTIFICATIONS)) {
                    platform.scheduleDaily("evening", m, strings.reminderEveningTitle, strings.reminderEveningBody)
                }
            }

            Box(Modifier.fillMaxSize()) {
                when {
                    !onboarded && splashDone -> OnboardingScreen { onboarded = true }
                    else -> MainScaffold()
                }
                AnimatedVisibility(locked && splashDone, enter = fadeIn(), exit = fadeOut()) {
                    LockScreen(
                        onUnlock = { lock.tryUnlock(it) },
                        onBiometric = if (bio && biometric.isAvailable()) {
                            { scope.launch { if (biometric.authenticate(strings.unlock)) lock.unlockWithBiometrics() } }
                        } else null,
                    )
                }
                if (!splashDone) {
                    SplashScreen(statusText = strings.splashLoading) { splashDone = true }
                }
            }
        }
    }
}
