package com.kairo.planner.domain.planner

import com.kairo.planner.core.code
import com.kairo.planner.core.key
import com.kairo.planner.core.minusDays
import com.kairo.planner.model.Habit
import com.kairo.planner.model.HabitDayState
import com.kairo.planner.model.HabitLog
import com.kairo.planner.model.HabitStats
import com.kairo.planner.model.StreakSummary
import kotlinx.datetime.LocalDate

object Streaks {

    private fun Habit.isScheduled(date: LocalDate): Boolean =
        targetDays.isEmpty() || date.dayOfWeek.code in targetDays

    /**
     * Habit streak that respects the habit's schedule: a Mon/Wed/Fri habit is not broken by an
     * empty Tuesday (the old web version counted every calendar day and broke such streaks).
     * Today only counts if done; an unfinished today never breaks the streak.
     */
    fun habitStats(habit: Habit, logs: List<HabitLog>, today: LocalDate, historyDays: Int = 365): HabitStats {
        val done = logs.asSequence().filter { it.habitId == habit.id && it.completed }.map { it.date }.toHashSet()
        val created = com.kairo.planner.core.Time.dateOf(habit.createdAt)
        val completedToday = today.key() in done

        // Current streak: walk back over scheduled days.
        var current = 0
        var d = if (completedToday) today else today.minusDays(1)
        var guard = 0
        while (guard++ < historyDays) {
            if (habit.isScheduled(d)) {
                if (d.key() in done) current++ else break
            } else if (d.key() in done) {
                current++ // bonus completion on a rest day still counts
            }
            if (d <= created) break
            d = d.minusDays(1)
        }

        // Longest streak across history (oldest → newest).
        var longest = 0
        var run = 0
        for (i in historyDays downTo 0) {
            val day = today.minusDays(i)
            if (day < created) continue
            val isDone = day.key() in done
            when {
                isDone -> { run++; if (run > longest) longest = run }
                habit.isScheduled(day) && day != today -> run = 0
            }
        }
        longest = maxOf(longest, current)

        // Completion rate over the last 30 scheduled days (since creation).
        var scheduled = 0
        var hits = 0
        var i = 0
        while (scheduled < 30 && i < 120) {
            val day = today.minusDays(i++)
            if (day < created) break
            if (day == today && !completedToday) continue
            if (habit.isScheduled(day)) {
                scheduled++
                if (day.key() in done) hits++
            }
        }
        val rate = if (scheduled == 0) 0 else hits * 100 / scheduled

        val recent = (6 downTo 0).map { back ->
            val day = today.minusDays(back)
            val state = when {
                day.key() in done -> HabitDayState.DONE
                !habit.isScheduled(day) -> HabitDayState.REST
                day == today -> HabitDayState.FUTURE
                day < created -> HabitDayState.REST
                else -> HabitDayState.MISSED
            }
            day.key() to state
        }

        return HabitStats(
            habit = habit,
            currentStreak = current,
            longestStreak = longest,
            completedToday = completedToday,
            scheduledToday = habit.isScheduled(today),
            completionRate = rate,
            recent = recent,
        )
    }

    /** Overall activity streak: a day is active if any task, habit, or focus session was completed. */
    fun overall(activeDates: Set<String>, today: LocalDate): StreakSummary {
        val activeToday = today.key() in activeDates
        var current = 0
        var d = if (activeToday) today else today.minusDays(1)
        while (d.key() in activeDates) {
            current++
            d = d.minusDays(1)
        }
        var longest = 0
        var run = 0
        val sorted = activeDates.mapNotNull { runCatching { LocalDate.parse(it) }.getOrNull() }.sorted()
        var prev: LocalDate? = null
        for (day in sorted) {
            run = if (prev != null && prev.minusDays(-1) == day) run + 1 else 1
            if (run > longest) longest = run
            prev = day
        }
        return StreakSummary(current, maxOf(longest, current), activeToday, activeDates)
    }
}
