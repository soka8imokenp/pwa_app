package com.kairo.planner

import android.graphics.Color
import android.os.Bundle
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.fragment.app.FragmentActivity
import com.kairo.planner.platform.ActivityHolder
import com.kairo.planner.platform.PlatformServices
import org.koin.android.ext.android.inject

/**
 * FragmentActivity (a ComponentActivity) so BiometricPrompt works.
 * The system splash only shows the brand colour for a frame; the animated mascot intro is drawn in Compose.
 */
class MainActivity : FragmentActivity() {
    private val platform: PlatformServices by inject()

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT),
        )
        ActivityHolder.attach(this)
        setContent { App(platform) }
    }

    override fun onResume() {
        super.onResume()
        ActivityHolder.attach(this)
    }

    override fun onDestroy() {
        ActivityHolder.detach(this)
        super.onDestroy()
    }
}
