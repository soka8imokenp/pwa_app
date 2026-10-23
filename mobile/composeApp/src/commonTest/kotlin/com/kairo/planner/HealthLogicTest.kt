package com.kairo.planner

import com.kairo.planner.core.fmt
import com.kairo.planner.domain.health.BodyCompositionCalculator
import com.kairo.planner.domain.health.HealthFormulas
import com.kairo.planner.domain.health.WeightTrend
import com.kairo.planner.domain.planner.Streaks
import com.kairo.planner.model.Gender
import com.kairo.planner.model.Habit
import com.kairo.planner.model.HabitLog
import com.kairo.planner.model.HealthGoal
import com.kairo.planner.model.HealthProfile
import com.kairo.planner.model.MealType
import com.kairo.planner.model.PaceKind
import com.kairo.planner.model.WeightLog
import kotlinx.datetime.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class HealthLogicTest {

    @Test
    fun bmiAndBmr() {
        assertEquals(24.7, HealthFormulas.bmi(80.0, 180.0))
        // Mifflin: 10*80 + 6.25*180 - 5*30 + 5 = 1780
        assertEquals(1780, HealthFormulas.bmr(80.0, 180.0, 30, Gender.MALE))
    }

    @Test
    fun targetsAreSane() {
        val t = HealthFormulas.targets(HealthProfile(age = 30, heightCm = 180.0, currentWeight = 80.0, goal = HealthGoal.LOSE))
        assertTrue(t.calories in 1800..2400, "calories ${t.calories}")
        assertTrue(t.proteinG in 130..160)
        assertTrue(t.carbsG > 0)
        val macroKcal = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9
        assertTrue(kotlin.math.abs(macroKcal - t.calories) <= 10, "macros $macroKcal vs ${t.calories}")
    }

    @Test
    fun bodyCompositionIsPhysiological() {
        val c = BodyCompositionCalculator.calculate(80.0, 500, 180.0, 30, Gender.MALE)
        assertTrue(c.bodyFatPercent in 10.0..30.0, "fat ${c.bodyFatPercent}")
        assertTrue(c.muscleMassKg in 50.0..70.0, "muscle ${c.muscleMassKg}")
        assertTrue(c.waterPercent in 45.0..65.0)
        assertTrue(c.bodyScore in 60..100)
        assertTrue(c.fromImpedance)
    }

    @Test
    fun heavyManDoesNotGetSentinelBmr() {
        val c = BodyCompositionCalculator.calculate(135.0, 450, 185.0, 35, Gender.MALE)
        assertTrue(c.bmr < 3500, "bmr ${c.bmr}")
    }

    @Test
    fun estimateIsFlagged() {
        val c = BodyCompositionCalculator.estimateWithoutImpedance(80.0, 180.0, 30, Gender.MALE)!!
        assertFalse(c.fromImpedance)
    }

    @Test
    fun mealSlots() {
        assertEquals(MealType.BREAKFAST, MealType.forTime("07:00"))
        assertEquals(MealType.LUNCH, MealType.forTime("13:15"))
        assertEquals(MealType.DINNER, MealType.forTime("18:00"))
        assertEquals(MealType.SNACK, MealType.forTime("23:30"))
    }

    private fun w(date: String, kg: Double, at: Long = 0) =
        WeightLog(date + at, date, at, kg, 0.0, null, null, null, "", "manual", null, null)

    @Test
    fun outliersAndPace() {
        val logs = listOf(
            w("2026-10-01", 80.0), w("2026-10-04", 79.8), w("2026-10-08", 79.4),
            w("2026-10-08", 39.7, 1), // half-weight glitch
            w("2026-10-12", 79.0), w("2026-10-15", 78.6),
        )
        val daily = WeightTrend.daily(logs)
        assertTrue(daily.none { it.weight < 50 })
        val pace = WeightTrend.pace(logs)
        assertTrue(pace.kgPerWeek < 0)
        assertEquals(PaceKind.OPTIMAL_LOSS, pace.kind)
    }

    @Test
    fun habitStreakRespectsSchedule() {
        // Mon/Wed/Fri habit. 2026-10-19 is a Monday.
        val habit = Habit("h", "Gym", targetDays = listOf("mon", "wed", "fri"), createdAt = 0, updatedAt = 0)
        val logs = listOf("2026-10-12", "2026-10-14", "2026-10-16", "2026-10-19", "2026-10-21")
            .map { HabitLog("h", it, true, 0) }
        // Thursday 2026-10-22: Tuesday/Thursday rest days must not break the streak.
        val stats = Streaks.habitStats(habit, logs, LocalDate.parse("2026-10-22"))
        assertEquals(5, stats.currentStreak)
        assertFalse(stats.scheduledToday)
    }

    @Test
    fun overallStreak() {
        val s = Streaks.overall(setOf("2026-10-20", "2026-10-21", "2026-10-22"), LocalDate.parse("2026-10-23"))
        assertEquals(3, s.current)
        assertFalse(s.activeToday)
        assertEquals(3, s.longest)
    }

    @Test
    fun formatting() {
        assertEquals("75.0", 75.0.fmt(1))
        assertEquals("0.50", 0.5.fmt(2))
        assertEquals("-1.5", (-1.5).fmt(1))
        assertEquals("12", 12.4.fmt(0))
    }
}
