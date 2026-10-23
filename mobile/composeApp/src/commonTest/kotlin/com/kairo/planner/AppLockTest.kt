package com.kairo.planner

import com.kairo.planner.data.AppSettings
import com.kairo.planner.domain.planner.AppLock
import com.russhwolf.settings.MapSettings
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class AppLockTest {

    @Test
    fun pinIsHashedAndVerified() {
        val settings = AppSettings(MapSettings())
        val lock = AppLock(settings)
        lock.setPin("1234")
        assertTrue(lock.hasPin)
        assertNotEquals("1234", settings.pinHash)
        assertEquals(64, settings.pinHash.length)
        assertEquals(0, lock.tryUnlock("0000"))
        assertEquals(-1, lock.tryUnlock("1234"))
        assertFalse(lock.locked.value)
    }

    @Test
    fun lockoutAfterFiveFailures() {
        val lock = AppLock(AppSettings(MapSettings()))
        lock.setPin("4321")
        repeat(4) { assertEquals(0, lock.tryUnlock("0000")) }
        assertTrue(lock.tryUnlock("0000") > 0)
        // Even the right PIN is refused during the lockout.
        assertTrue(lock.tryUnlock("4321") > 0)
    }

    @Test
    fun samePinDifferentSaltGivesDifferentHash() {
        val a = AppSettings(MapSettings()).also { AppLock(it).setPin("1111") }
        val b = AppSettings(MapSettings()).also { AppLock(it).setPin("1111") }
        assertNotEquals(a.pinHash, b.pinHash)
    }
}
