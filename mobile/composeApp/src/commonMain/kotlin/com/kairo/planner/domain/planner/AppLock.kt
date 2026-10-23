package com.kairo.planner.domain.planner

import com.kairo.planner.core.Time
import com.kairo.planner.data.AppSettings
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.random.Random

expect fun sha256(data: ByteArray): ByteArray

/** PIN app lock. The PIN is stored as salted, iterated SHA-256 – never in plain text. */
class AppLock(private val settings: AppSettings) {
    private val _locked = MutableStateFlow(settings.pinHash.isNotEmpty())
    val locked: StateFlow<Boolean> = _locked.asStateFlow()

    private var failures = 0
    private var lockedUntil = 0L
    private var backgroundedAt = 0L

    val hasPin: Boolean get() = settings.pinHash.isNotEmpty()

    fun setPin(pin: String) {
        val salt = Random.nextBytes(16).toHex()
        settings.pinSalt = salt
        settings.pinHash = hash(pin, salt)
        _locked.value = false
    }

    fun removePin() {
        settings.pinHash = ""
        settings.pinSalt = ""
        _locked.value = false
    }

    /** @return remaining lockout seconds (> 0) if too many attempts, 0 if wrong, -1 if unlocked. */
    fun tryUnlock(pin: String): Int {
        val now = Time.nowMs()
        if (now < lockedUntil) return ((lockedUntil - now) / 1000).toInt() + 1
        return if (hash(pin, settings.pinSalt) == settings.pinHash) {
            failures = 0
            _locked.value = false
            -1
        } else {
            failures++
            if (failures >= 5) {
                lockedUntil = now + 30_000L * (failures - 4)
                ((lockedUntil - now) / 1000).toInt()
            } else 0
        }
    }

    fun unlockWithBiometrics() { failures = 0; _locked.value = false }

    fun onBackground() { backgroundedAt = Time.nowMs() }

    /** Re-locks when the app was in background for more than a minute. */
    fun onForeground() {
        if (hasPin && backgroundedAt > 0 && Time.nowMs() - backgroundedAt > 60_000) _locked.value = true
    }

    private fun hash(pin: String, salt: String): String {
        var h = (salt + ":" + pin).encodeToByteArray()
        repeat(20_000) { h = sha256(h + salt.encodeToByteArray()) }
        return h.toHex()
    }
}

private fun ByteArray.toHex() = joinToString("") { (it.toInt() and 0xFF).toString(16).padStart(2, '0') }
