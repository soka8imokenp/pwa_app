package com.kairo.planner.platform

import androidx.compose.runtime.staticCompositionLocalOf
import com.kairo.planner.ui.components.Haptic

enum class AppPermission { BLUETOOTH, ACTIVITY_RECOGNITION, NOTIFICATIONS, CAMERA, HEALTH_CONNECT }

enum class UiSound { TAP, SUCCESS, COMPLETE, TIMER_END, DELETE }

/** Everything the shared UI needs from the OS. Implemented per platform; a no-op version exists for previews/tests. */
interface PlatformServices {
    val platformName: String
    val appVersion: String

    fun haptic(kind: Haptic)
    fun sound(kind: UiSound)
    fun openUrl(url: String)
    fun share(text: String, title: String = "")
    fun toast(message: String)

    fun isGranted(permission: AppPermission): Boolean
    suspend fun request(permission: AppPermission): Boolean
    fun openAppSettings()
    fun openBluetoothSettings()

    /** Lets the user pick an image; returns JPEG bytes already downscaled for upload, or null. */
    suspend fun pickImage(fromCamera: Boolean): ByteArray?

    /** Saves [content] to a user-chosen file. */
    suspend fun saveFile(fileName: String, mime: String, content: ByteArray): Boolean
    suspend fun openFile(mime: String): ByteArray?

    fun scheduleReminder(id: String, atEpochMs: Long, title: String, body: String)
    fun cancelReminder(id: String)
    fun scheduleDaily(id: String, minuteOfDay: Int, title: String, body: String)

    fun startFocusTimer(endsAtEpochMs: Long, title: String)
    fun stopFocusTimer()

    fun keepScreenOn(on: Boolean)

    /** Native "Sign in with Google" – returns a Google ID token for [webClientId], or null if cancelled/unsupported. */
    suspend fun googleIdToken(webClientId: String): String? = null
}

val LocalPlatform = staticCompositionLocalOf<PlatformServices> { NoopPlatform }

object NoopPlatform : PlatformServices {
    override val platformName = "preview"
    override val appVersion = "dev"
    override fun haptic(kind: Haptic) {}
    override fun sound(kind: UiSound) {}
    override fun openUrl(url: String) {}
    override fun share(text: String, title: String) {}
    override fun toast(message: String) {}
    override fun isGranted(permission: AppPermission) = false
    override suspend fun request(permission: AppPermission) = false
    override fun openAppSettings() {}
    override fun openBluetoothSettings() {}
    override suspend fun pickImage(fromCamera: Boolean): ByteArray? = null
    override suspend fun saveFile(fileName: String, mime: String, content: ByteArray) = false
    override suspend fun openFile(mime: String): ByteArray? = null
    override fun scheduleReminder(id: String, atEpochMs: Long, title: String, body: String) {}
    override fun cancelReminder(id: String) {}
    override fun scheduleDaily(id: String, minuteOfDay: Int, title: String, body: String) {}
    override fun startFocusTimer(endsAtEpochMs: Long, title: String) {}
    override fun stopFocusTimer() {}
    override fun keepScreenOn(on: Boolean) {}
}
