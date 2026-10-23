package com.kairo.planner.ai

import com.kairo.planner.core.Time
import com.kairo.planner.core.fmt
import com.kairo.planner.core.key
import com.kairo.planner.core.minusDays
import com.kairo.planner.data.HealthRepository
import com.kairo.planner.data.PlannerRepository
import com.kairo.planner.domain.health.BodyCompositionCalculator
import com.kairo.planner.domain.health.HealthFormulas
import com.kairo.planner.domain.health.WeightTrend
import com.kairo.planner.domain.planner.Streaks
import kotlinx.coroutines.flow.first

/** Compact, factual snapshot of the user's data that is sent with every AI request. */
class ContextBuilder(
    private val planner: PlannerRepository,
    private val health: HealthRepository,
) {
    suspend fun build(): String {
        val today = Time.today()
        val todayKey = today.key()
        val weekAgo = today.minusDays(6).key()
        val sb = StringBuilder()

        // Planner
        val tasks = planner.tasksForDate(todayKey).first()
        val habits = planner.habits().first()
        val logs = planner.habitLogsSince(today.minusDays(60).key()).first()
        val focus = planner.focusBetween(todayKey, todayKey).first()
        val streak = Streaks.overall(planner.activeDates().first(), today)
        sb.appendLine("## Planner – today ($todayKey, ${today.dayOfWeek})")
        sb.appendLine("Activity streak: ${streak.current} days (best ${streak.longest}); active today: ${streak.activeToday}")
        if (tasks.isEmpty()) sb.appendLine("Tasks: none")
        tasks.forEach { t ->
            val subs = if (t.subtasks.isNotEmpty()) " [${t.subtasks.count { it.isCompleted }}/${t.subtasks.size} steps]" else ""
            sb.appendLine("- ${if (t.isCompleted) "[x]" else "[ ]"} ${if (t.isPriority) "(TOP3) " else ""}${t.title} · ${t.category.code} · ${t.estimatedMinutes}m$subs")
        }
        if (habits.isNotEmpty()) {
            sb.appendLine("Habits:")
            habits.forEach { h ->
                val s = Streaks.habitStats(h, logs, today)
                sb.appendLine("- ${if (s.completedToday) "[x]" else if (s.scheduledToday) "[ ]" else "[rest]"} ${h.title} · streak ${s.currentStreak} · ${s.completionRate}% last 30")
            }
        }
        sb.appendLine("Focus today: ${focus.sumOf { it.durationMinutes }} min in ${focus.size} sessions")
        val note = planner.dayNote(todayKey).first()
        if (note != null && (note.note.isNotBlank() || note.mood > 0)) sb.appendLine("Day note: mood ${note.mood}/5 – ${note.note}")

        // Health
        val profile = health.currentProfile()
        val targets = HealthFormulas.targets(profile)
        sb.appendLine()
        sb.appendLine("## Health profile")
        if (!profile.isComplete) sb.appendLine("Profile incomplete (age/height/weight missing).")
        sb.appendLine("Sex ${profile.gender.code}, age ${profile.age}, height ${profile.heightCm.fmt(0)} cm, weight ${profile.currentWeight.fmt(1)} kg, goal weight ${profile.targetWeight.fmt(1)} kg, goal ${profile.goal.code}, activity ${profile.activityLevel.code}")
        sb.appendLine("Targets: ${targets.calories} kcal, P${targets.proteinG} C${targets.carbsG} F${targets.fatG} g, water ${targets.waterMl} ml, BMR ${targets.bmr}, TDEE ${targets.tdee}, BMI ${targets.bmi}")

        val meals = health.mealsForDate(todayKey).first()
        val water = health.waterForDate(todayKey).first().sumOf { it.amountMl }
        sb.appendLine()
        sb.appendLine("## Nutrition today")
        if (meals.isEmpty()) sb.appendLine("No meals logged.")
        meals.forEach { m -> sb.appendLine("- ${m.time} ${m.mealType.code}: ${m.name} – ${m.kcal} kcal, P${m.protein.fmt(0)} C${m.carbs.fmt(0)} F${m.fat.fmt(0)}") }
        sb.appendLine("Totals: ${meals.sumOf { it.kcal }} kcal, P${meals.sumOf { it.protein }.fmt(0)} C${meals.sumOf { it.carbs }.fmt(0)} F${meals.sumOf { it.fat }.fmt(0)}; water $water ml")

        val weekMeals = health.mealsBetween(weekAgo, todayKey).first()
        if (weekMeals.isNotEmpty()) {
            val byDay = weekMeals.groupBy { it.date }.mapValues { (_, v) -> v.sumOf { it.kcal } }
            sb.appendLine("Calories last 7 days: " + byDay.entries.sortedBy { it.key }.joinToString { "${it.key.takeLast(5)}=${it.value}" })
        }

        // Movement
        val steps = health.stepsBetween(weekAgo, todayKey).first()
        val todaySteps = steps.firstOrNull { it.date == todayKey }
        val workouts = health.workoutsBetween(weekAgo, todayKey).first()
        sb.appendLine()
        sb.appendLine("## Movement")
        sb.appendLine("Steps today: ${todaySteps?.steps ?: 0} / goal ${profile.stepGoal}, ${((todaySteps?.distanceM ?: 0) / 1000.0).fmt(2)} km, ${todaySteps?.calories ?: 0} kcal")
        if (steps.isNotEmpty()) sb.appendLine("Steps 7 days: " + steps.joinToString { "${it.date.takeLast(5)}=${it.steps}" })
        workouts.forEach { w -> sb.appendLine("- workout ${w.date}: ${w.title} (${w.category.code}) ${w.durationMinutes} min, ${w.calories} kcal") }

        // Body
        val weights = health.weights().first()
        sb.appendLine()
        sb.appendLine("## Body / smart scale")
        if (weights.isEmpty()) {
            sb.appendLine("No weigh-ins yet.")
        } else {
            val trend = WeightTrend.movingAverage(weights).takeLast(10)
            val pace = WeightTrend.pace(weights)
            sb.appendLine("Recent (date: weight / 7d avg): " + trend.joinToString { "${it.date.takeLast(5)}: ${it.weight.fmt(1)}/${it.movingAvg.fmt(1)}" })
            sb.appendLine("Pace: ${pace.kgPerWeek} kg/week (${pace.kind})")
            val last = weights.last()
            val c = last.composition
            if (c != null) {
                val src = if (c.fromImpedance) "bio-impedance measurement" else "BMI-based estimate (no impedance)"
                sb.appendLine("Latest composition ($src, ${last.date}): score ${c.bodyScore}/100, type ${c.bodyType}, fat ${c.bodyFatPercent}%, muscle ${c.muscleMassKg} kg, water ${c.waterPercent}%, bone ${c.boneMassKg} kg, visceral ${c.visceralFat}, BMR ${c.bmr}, protein ${c.proteinPercent}%, body age ${c.bodyAge}")
                if (c.deductions.isNotEmpty()) sb.appendLine("Score deductions: " + c.deductions.joinToString { "${it.metric} -${it.points}" })
                BodyCompositionCalculator.metricItems(c, profile.heightCm, profile.age, profile.gender, last.weight)
                    .filter { it.status.name != "OPTIMAL" }
                    .takeIf { it.isNotEmpty() }
                    ?.let { list -> sb.appendLine("Out of range: " + list.joinToString { "${it.metric}=${it.value}" }) }
            }
        }
        return sb.toString()
    }
}
