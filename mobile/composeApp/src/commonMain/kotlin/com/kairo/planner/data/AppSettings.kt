package com.kairo.planner.data

import com.russhwolf.settings.Settings
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class AppLanguage(val code: String, val nativeName: String) {
    RU("ru", "Русский"), UZ("uz", "Oʻzbekcha"), EN("en", "English");

    companion object {
        fun of(code: String?) = entries.firstOrNull { it.code == code } ?: RU
    }
}

enum class AppMode { PLANNER, HEALTH }

enum class ThemeMode { SYSTEM, LIGHT, DARK }

/** Typed key-value preferences with observable state. */
class AppSettings(private val s: Settings) {

    private inner class Pref<T>(private val key: String, default: T, private val read: (String, T) -> T, private val write: (String, T) -> Unit) {
        private val flow = MutableStateFlow(read(key, default))
        val state: StateFlow<T> = flow.asStateFlow()
        var value: T
            get() = flow.value
            set(v) {
                write(key, v)
                flow.value = v
            }
    }

    private fun str(key: String, def: String) = Pref(key, def, { k, d -> s.getString(k, d) }, { k, v -> s.putString(k, v) })
    private fun bool(key: String, def: Boolean) = Pref(key, def, { k, d -> s.getBoolean(k, d) }, { k, v -> s.putBoolean(k, v) })
    private fun long(key: String, def: Long) = Pref(key, def, { k, d -> s.getLong(k, d) }, { k, v -> s.putLong(k, v) })
    private fun int(key: String, def: Int) = Pref(key, def, { k, d -> s.getInt(k, d) }, { k, v -> s.putInt(k, v) })

    private val languagePref = str("language", "")
    val language: StateFlow<String> = languagePref.state
    fun setLanguage(lang: AppLanguage) { languagePref.value = lang.code }
    val hasChosenLanguage: Boolean get() = languagePref.value.isNotEmpty()

    private val themePref = str("theme", ThemeMode.SYSTEM.name)
    val theme: StateFlow<String> = themePref.state
    fun setTheme(mode: ThemeMode) { themePref.value = mode.name }

    private val modePref = str("app_mode", AppMode.PLANNER.name)
    val appMode: StateFlow<String> = modePref.state
    fun setAppMode(mode: AppMode) { modePref.value = mode.name }

    private val geminiKeyPref = str("gemini_api_key", "")
    val geminiKey: StateFlow<String> = geminiKeyPref.state
    fun setGeminiKey(key: String) { geminiKeyPref.value = key.trim() }

    private val geminiModelPref = str("gemini_model", "")
    val geminiModel: StateFlow<String> = geminiModelPref.state
    fun setGeminiModel(model: String) { geminiModelPref.value = model.trim() }

    private val serverUrlPref = str("server_url", DEFAULT_SERVER_URL)
    val serverUrl: StateFlow<String> = serverUrlPref.state
    fun setServerUrl(url: String) { serverUrlPref.value = url.trim().trimEnd('/') }

    var accessToken by delegate(str("access_token", ""))
    var refreshToken by delegate(str("refresh_token", ""))
    private val userJsonPref = str("user_json", "")
    val userJson: StateFlow<String> = userJsonPref.state
    fun setUserJson(json: String) { userJsonPref.value = json }

    var lastSyncAt by delegate(long("last_sync_at", 0L))
    var lastPullServerTs by delegate(long("last_pull_server_ts", 0L))
    /** Account id whose legacy (v1) cloud data was already imported – the import is not idempotent. */
    var legacyImportedFor by delegate(str("legacy_imported_for", ""))

    private val soundPref = bool("sound", true)
    val sound: StateFlow<Boolean> = soundPref.state
    fun setSound(on: Boolean) { soundPref.value = on }

    private val hapticsPref = bool("haptics", true)
    val haptics: StateFlow<Boolean> = hapticsPref.state
    fun setHaptics(on: Boolean) { hapticsPref.value = on }

    // App lock
    var pinHash by delegate(str("pin_hash", ""))
    var pinSalt by delegate(str("pin_salt", ""))
    private val biometricsPref = bool("biometrics", false)
    val biometrics: StateFlow<Boolean> = biometricsPref.state
    fun setBiometrics(on: Boolean) { biometricsPref.value = on }

    // Steps
    private val stepSourcePref = str("step_source", "auto")
    val stepSource: StateFlow<String> = stepSourcePref.state
    fun setStepSource(src: String) { stepSourcePref.value = src }
    var sensorBaseline by delegate(long("sensor_baseline", -1L))
    var sensorBaselineDate by delegate(str("sensor_baseline_date", ""))
    var sensorStepsToday by delegate(long("sensor_steps_today", 0L))
    var sensorLastRaw by delegate(long("sensor_last_raw", -1L))

    // Scale
    var lastScaleTimestamp by delegate(str("last_scale_ts", ""))
    var preferredScaleId by delegate(str("preferred_scale", ""))
    private val healthConnectWritePref = bool("hc_write", true)
    val healthConnectWrite: StateFlow<Boolean> = healthConnectWritePref.state
    fun setHealthConnectWrite(on: Boolean) { healthConnectWritePref.value = on }
    var lastHealthConnectImport by delegate(long("hc_last_import", 0L))

    // Reminders
    private val eveningReviewPref = int("evening_review_minute", -1)
    val eveningReviewMinute: StateFlow<Int> = eveningReviewPref.state
    fun setEveningReviewMinute(m: Int) { eveningReviewPref.value = m }
    private val waterRemindersPref = bool("water_reminders", false)
    val waterReminders: StateFlow<Boolean> = waterRemindersPref.state
    fun setWaterReminders(on: Boolean) { waterRemindersPref.value = on }

    // Focus defaults
    private val pomodoroPref = int("pomodoro_minutes", 25)
    val pomodoroMinutes: StateFlow<Int> = pomodoroPref.state
    fun setPomodoroMinutes(m: Int) { pomodoroPref.value = m.coerceIn(5, 120) }
    private val breakPref = int("break_minutes", 5)
    val breakMinutes: StateFlow<Int> = breakPref.state
    fun setBreakMinutes(m: Int) { breakPref.value = m.coerceIn(1, 60) }

    var scratchpad by delegate(str("scratchpad", ""))
    var onboardingDone by delegate(bool("onboarding_done", false))
    var seeded by delegate(bool("seeded", false))
    var lastRolloverDate by delegate(str("last_rollover", ""))

    private fun <T> delegate(p: Pref<T>) = object : kotlin.properties.ReadWriteProperty<Any?, T> {
        override fun getValue(thisRef: Any?, property: kotlin.reflect.KProperty<*>): T = p.value
        override fun setValue(thisRef: Any?, property: kotlin.reflect.KProperty<*>, value: T) { p.value = value }
    }

    fun clearAccount() {
        accessToken = ""
        refreshToken = ""
        setUserJson("")
        lastSyncAt = 0
        lastPullServerTs = 0
    }

    companion object {
        const val DEFAULT_SERVER_URL = "https://daily.kawaii.uz/api"
        /** Public OAuth web client id of daily.kawaii.uz – the audience of Google ID tokens the server accepts. */
        const val GOOGLE_WEB_CLIENT_ID = "98363494043-t58b883m6upt2mrtegt90e7lq08srq01.apps.googleusercontent.com"
    }
}
