package com.kairo.planner

import com.kairo.planner.scale.BleAdvertisement
import com.kairo.planner.scale.ScaleDrivers
import com.kairo.planner.scale.StandardGattScaleDriver
import com.kairo.planner.scale.WeightUnit
import com.kairo.planner.scale.XiaomiMiScale1Driver
import com.kairo.planner.scale.XiaomiMiScale2Driver
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertSame
import kotlin.test.assertTrue

private fun bytes(hex: String) = ByteArray(hex.length / 2) { hex.substring(it * 2, it * 2 + 2).toInt(16).toByte() }

private class FakeAdv(
    private val data: Map<Int, ByteArray> = emptyMap(),
    override val serviceUuids16: Set<Int> = emptySet(),
) : BleAdvertisement {
    override val id = "AA:BB"
    override val name: String? = null
    override val rssi = -60
    override fun serviceData(uuid16: Int) = data[uuid16]
    override fun manufacturerData(companyId: Int): ByteArray? = null
}

class ScaleDriversTest {

    @Test
    fun miScale2StableWithImpedance() {
        // ctrl0=02 ctrl1=22 (stable+impedance) 2026-10-23 08:30:00, impedance 500, weight 15000/200 = 75.0 kg
        val r = XiaomiMiScale2Driver.decode(bytes("0222ea070a17081e00f401983a"), null)
        assertNotNull(r)
        assertEquals(75.0, r.weightKg)
        assertEquals(500, r.impedance)
        assertTrue(r.stable)
        assertFalse(r.loadRemoved)
        assertEquals(WeightUnit.KG, r.unit)
        assertEquals("2026-10-23 8:30:0", r.deviceTimestamp)
    }

    @Test
    fun miScale2WithoutImpedanceFlagIgnoresImpedanceBytes() {
        val r = XiaomiMiScale2Driver.decode(bytes("0220ea070a17081e00f401983a"), null)
        assertNotNull(r)
        assertNull(r.impedance)
        assertTrue(r.stable)
    }

    @Test
    fun miScale2HalfWeightFirmwareIsCorrected() {
        // raw 7500 → 37.5 kg with /200 but the user weighs ~75 kg, so /100 is used.
        val r = XiaomiMiScale2Driver.decode(bytes("0220ea070a17081e0000004c1d"), expectedWeightKg = 74.0)
        assertNotNull(r)
        assertEquals(75.0, r.weightKg)
    }

    @Test
    fun miScale2PoundsAreConvertedToKg() {
        // ctrl0 bit0 = lb; raw 16535 /100 = 165.35 lb = 75.0 kg
        val r = XiaomiMiScale2Driver.decode(bytes("0320ea070a17081e0000009740"), null)
        assertNotNull(r)
        assertEquals(WeightUnit.LB, r.unit)
        assertEquals(75.0, r.weightKg, 0.01)
    }

    @Test
    fun miScale1Decodes() {
        val r = XiaomiMiScale1Driver.decode(bytes("22983aea070a17081e00"))
        assertNotNull(r)
        assertEquals(75.0, r.weightKg)
        assertTrue(r.stable)
    }

    @Test
    fun driverSelectionPrefersXiaomiOverStandard() {
        val mi2 = FakeAdv(mapOf(0x181B to bytes("0222ea070a17081e00f401983a")), setOf(0x181B))
        assertSame(XiaomiMiScale2Driver, ScaleDrivers.find(mi2))
        val generic = FakeAdv(serviceUuids16 = setOf(0x181D))
        assertSame(StandardGattScaleDriver, ScaleDrivers.find(generic))
        assertNull(ScaleDrivers.find(FakeAdv()))
    }

    @Test
    fun standardWeightMeasurement() {
        val r = StandardGattScaleDriver.parseWeightMeasurement(bytes("00983a"))
        assertNotNull(r)
        assertEquals(75.0, r.weightKg)
        assertNull(StandardGattScaleDriver.parseWeightMeasurement(bytes("00ffff")))
    }

    @Test
    fun standardBodyComposition() {
        // flags: weight present (bit 10) | impedance (bit 9) → 0x0600; fat 20.0 %; impedance 5000 (=500.0 Ω); weight 75 kg
        val r = StandardGattScaleDriver.parseBodyComposition(bytes("0006c8008813983a"))
        assertNotNull(r)
        assertEquals(75.0, r.weightKg)
        assertEquals(20.0, r.reported?.bodyFatPercent)
        assertEquals(500, r.impedance)
    }
}
