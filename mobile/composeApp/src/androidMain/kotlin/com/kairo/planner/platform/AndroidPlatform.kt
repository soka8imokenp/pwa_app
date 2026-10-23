package com.kairo.planner.platform

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.media.AudioAttributes
import android.media.SoundPool
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.health.connect.client.PermissionController
import com.kairo.planner.BuildConfig
import com.kairo.planner.data.AppSettings
import com.kairo.planner.notifications.FocusNotifier
import com.kairo.planner.notifications.Reminders
import com.kairo.planner.ui.components.Haptic
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import kotlin.math.max
import kotlin.math.roundToInt

class AndroidPlatform(
    private val context: Context,
    private val settings: AppSettings,
    private val healthPlatform: AndroidHealthPlatform,
) : PlatformServices {

    override val platformName = "Android ${Build.VERSION.RELEASE}"
    override val appVersion: String = BuildConfig.VERSION_NAME

    private val vibrator: Vibrator? by lazy {
        if (Build.VERSION.SDK_INT >= 31) (context.getSystemService(VibratorManager::class.java))?.defaultVibrator
        else @Suppress("DEPRECATION") context.getSystemService(Vibrator::class.java)
    }

    // ---------------------------------------------------------------- feedback

    override fun haptic(kind: Haptic) {
        if (!settings.haptics.value) return
        val v = vibrator ?: return
        if (!v.hasVibrator()) return
        val effect = when (kind) {
            Haptic.TICK -> if (Build.VERSION.SDK_INT >= 29) VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK) else VibrationEffect.createOneShot(8, 60)
            Haptic.TAP -> if (Build.VERSION.SDK_INT >= 29) VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK) else VibrationEffect.createOneShot(12, 90)
            Haptic.LONG -> if (Build.VERSION.SDK_INT >= 29) VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK) else VibrationEffect.createOneShot(25, 160)
            Haptic.SUCCESS -> VibrationEffect.createWaveform(longArrayOf(0, 14, 60, 22), intArrayOf(0, 120, 0, 200), -1)
            Haptic.WARNING -> VibrationEffect.createWaveform(longArrayOf(0, 30, 50, 30), intArrayOf(0, 200, 0, 200), -1)
        }
        runCatching { v.vibrate(effect) }
    }

    private val soundPool by lazy {
        SoundPool.Builder()
            .setMaxStreams(3)
            .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
            .build()
    }
    private val sounds = HashMap<UiSound, Int>()

    override fun sound(kind: UiSound) {
        if (!settings.sound.value) return
        val id = sounds.getOrPut(kind) {
            val file = Sounds.ensure(context, kind)
            soundPool.load(file.absolutePath, 1)
        }
        // Freshly loaded samples aren't ready immediately; play on load complete.
        val played = soundPool.play(id, 0.6f, 0.6f, 1, 0, 1f)
        if (played == 0) soundPool.setOnLoadCompleteListener { pool, sampleId, status -> if (status == 0 && sampleId == id) pool.play(id, 0.6f, 0.6f, 1, 0, 1f) }
    }

    override fun openUrl(url: String) {
        val i = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { context.startActivity(i) }
    }

    override fun share(text: String, title: String) {
        val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text)
        context.startActivity(Intent.createChooser(send, title).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    override fun toast(message: String) {
        ContextCompat.getMainExecutor(context).execute { Toast.makeText(context, message, Toast.LENGTH_SHORT).show() }
    }

    // ---------------------------------------------------------------- permissions

    private fun runtimePermissions(p: AppPermission): Array<String> = when (p) {
        AppPermission.BLUETOOTH -> if (Build.VERSION.SDK_INT >= 31) {
            arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
        } else arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
        AppPermission.ACTIVITY_RECOGNITION -> if (Build.VERSION.SDK_INT >= 29) arrayOf(Manifest.permission.ACTIVITY_RECOGNITION) else emptyArray()
        AppPermission.NOTIFICATIONS -> if (Build.VERSION.SDK_INT >= 33) arrayOf(Manifest.permission.POST_NOTIFICATIONS) else emptyArray()
        AppPermission.CAMERA -> arrayOf(Manifest.permission.CAMERA)
        AppPermission.HEALTH_CONNECT -> emptyArray()
    }

    override fun isGranted(permission: AppPermission): Boolean {
        if (permission == AppPermission.HEALTH_CONNECT) return false
        return runtimePermissions(permission).all { ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED }
    }

    override suspend fun request(permission: AppPermission): Boolean {
        val activity = ActivityHolder.activity ?: return false
        if (permission == AppPermission.HEALTH_CONNECT) {
            if (!healthPlatform.isAvailable()) return false
            val granted = activity.awaitResult(PermissionController.createRequestPermissionResultContract(), healthPlatform.permissions)
            return granted.containsAll(healthPlatform.requiredPermissions)
        }
        val perms = runtimePermissions(permission)
        if (perms.isEmpty()) return true
        if (isGranted(permission)) return true
        val result = activity.awaitResult(ActivityResultContracts.RequestMultiplePermissions(), perms)
        return result.values.all { it }
    }

    override fun openAppSettings() {
        val i = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(i)
    }

    @SuppressLint("MissingPermission")
    override fun openBluetoothSettings() {
        val activity = ActivityHolder.activity
        val enable = Intent(android.bluetooth.BluetoothAdapter.ACTION_REQUEST_ENABLE)
        if (activity != null && (Build.VERSION.SDK_INT < 31 || isGranted(AppPermission.BLUETOOTH))) {
            runCatching { activity.startActivity(enable); return }
        }
        context.startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    // ---------------------------------------------------------------- files & images

    override suspend fun pickImage(fromCamera: Boolean): ByteArray? {
        val activity = ActivityHolder.activity ?: return null
        val uri: Uri? = if (fromCamera && context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)) {
            val dir = File(context.cacheDir, "camera").apply { mkdirs() }
            val file = File(dir, "meal_${System.currentTimeMillis()}.jpg")
            val target = FileProvider.getUriForFile(context, "${context.packageName}.files", file)
            val ok = activity.awaitResult(ActivityResultContracts.TakePicture(), target)
            if (ok) target else activity.awaitResult(ActivityResultContracts.PickVisualMedia(), PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
        } else {
            activity.awaitResult(ActivityResultContracts.PickVisualMedia(), PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
        }
        return uri?.let { downscaleJpeg(it) }
    }

    /** Max 1280 px long side, JPEG q82 — plenty for food recognition, keeps uploads ~150 KB. */
    private suspend fun downscaleJpeg(uri: Uri): ByteArray? = withContext(Dispatchers.IO) {
        runCatching {
            val bmp: Bitmap = if (Build.VERSION.SDK_INT >= 28) {
                ImageDecoder.decodeBitmap(ImageDecoder.createSource(context.contentResolver, uri)) { decoder, info, _ ->
                    val long = max(info.size.width, info.size.height)
                    if (long > 1280) {
                        val k = 1280f / long
                        decoder.setTargetSize((info.size.width * k).roundToInt(), (info.size.height * k).roundToInt())
                    }
                    decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
                }
            } else {
                context.contentResolver.openInputStream(uri).use { BitmapFactory.decodeStream(it) }
            }
            val out = ByteArrayOutputStream()
            val long = max(bmp.width, bmp.height)
            val scaled = if (long > 1280) Bitmap.createScaledBitmap(bmp, bmp.width * 1280 / long, bmp.height * 1280 / long, true) else bmp
            scaled.compress(Bitmap.CompressFormat.JPEG, 82, out)
            out.toByteArray()
        }.getOrNull()
    }

    override suspend fun saveFile(fileName: String, mime: String, content: ByteArray): Boolean {
        val activity = ActivityHolder.activity ?: return false
        val uri = activity.awaitResult(ActivityResultContracts.CreateDocument(mime), fileName) ?: return false
        return withContext(Dispatchers.IO) {
            runCatching { context.contentResolver.openOutputStream(uri)?.use { it.write(content) }; true }.getOrDefault(false)
        }
    }

    override suspend fun openFile(mime: String): ByteArray? {
        val activity = ActivityHolder.activity ?: return null
        val uri = activity.awaitResult(ActivityResultContracts.OpenDocument(), arrayOf(mime, "text/plain", "*/*")) ?: return null
        return withContext(Dispatchers.IO) { runCatching { context.contentResolver.openInputStream(uri)?.use { it.readBytes() } }.getOrNull() }
    }

    // ---------------------------------------------------------------- reminders & timer

    override fun scheduleReminder(id: String, atEpochMs: Long, title: String, body: String) = Reminders.scheduleAt(context, id, atEpochMs, title, body)

    override fun cancelReminder(id: String) = Reminders.cancel(context, id)

    override fun scheduleDaily(id: String, minuteOfDay: Int, title: String, body: String) = Reminders.scheduleDaily(context, id, minuteOfDay, title, body)

    override fun startFocusTimer(endsAtEpochMs: Long, title: String) = FocusNotifier.start(context, endsAtEpochMs, title)

    override fun stopFocusTimer() = FocusNotifier.stop(context)

    override suspend fun googleIdToken(webClientId: String): String? {
        val activity = ActivityHolder.activity ?: return null
        val option = com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption.Builder(webClientId).build()
        val request = androidx.credentials.GetCredentialRequest.Builder().addCredentialOption(option).build()
        val result = androidx.credentials.CredentialManager.create(activity).getCredential(activity, request)
        val cred = result.credential
        if (cred is androidx.credentials.CustomCredential &&
            cred.type == com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
        ) {
            return com.google.android.libraries.identity.googleid.GoogleIdTokenCredential.createFrom(cred.data).idToken
        }
        return null
    }

    override fun keepScreenOn(on: Boolean) {
        val w = ActivityHolder.activity?.window ?: return
        ContextCompat.getMainExecutor(context).execute {
            if (on) w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) else w.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }
}
