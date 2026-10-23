package com.kairo.planner.model

import kotlinx.serialization.Serializable

enum class TaskCategory(val code: String) {
    GENERAL("general"), CODE("code"), DESIGN("design"), HEALTH("health"), LEARN("learn"), ADMIN("admin");

    companion object {
        fun of(code: String?): TaskCategory = entries.firstOrNull { it.code == code } ?: GENERAL
    }
}

@Serializable
data class SubTask(
    val id: String,
    val title: String,
    val isCompleted: Boolean = false,
)

data class Task(
    val id: String,
    val title: String,
    val notes: String = "",
    val isPriority: Boolean = false,
    val isCompleted: Boolean = false,
    val date: String,
    val category: TaskCategory = TaskCategory.GENERAL,
    val estimatedMinutes: Int = 30,
    val subtasks: List<SubTask> = emptyList(),
    /** Day codes ("mon".."sun") on which this task re-creates itself. Empty = one-off task. */
    val recurringDays: List<String> = emptyList(),
    val sortOrder: Int = 0,
    val reminderAt: Long? = null,
    val completedAt: Long? = null,
    val createdAt: Long,
    val updatedAt: Long,
    val deletedAt: Long? = null,
) {
    val isRecurring: Boolean get() = recurringDays.isNotEmpty()
    val subtaskProgress: Float
        get() = if (subtasks.isEmpty()) 0f else subtasks.count { it.isCompleted }.toFloat() / subtasks.size
}

data class Habit(
    val id: String,
    val title: String,
    val icon: String = "bolt",
    val color: String = "#3D6B52",
    val targetDays: List<String>,
    val reminderMinute: Int? = null,
    val archived: Boolean = false,
    val sortOrder: Int = 0,
    val createdAt: Long,
    val updatedAt: Long,
    val deletedAt: Long? = null,
)

data class HabitLog(
    val habitId: String,
    val date: String,
    val completed: Boolean,
    val updatedAt: Long,
)

data class HabitStats(
    val habit: Habit,
    val currentStreak: Int,
    val longestStreak: Int,
    val completedToday: Boolean,
    val scheduledToday: Boolean,
    /** Completion rate over the last 30 scheduled days, 0..100. */
    val completionRate: Int,
    val recent: List<Pair<String, HabitDayState>>,
)

enum class HabitDayState { DONE, MISSED, REST, FUTURE }

enum class FocusMode(val code: String) {
    POMODORO("pomodoro"), DEEP_WORK("deepwork"), STOPWATCH("stopwatch");

    companion object {
        fun of(code: String?) = entries.firstOrNull { it.code == code } ?: POMODORO
    }
}

data class FocusSession(
    val id: String,
    val taskId: String?,
    val taskTitle: String?,
    val durationMinutes: Int,
    val mode: FocusMode,
    val date: String,
    val completedAt: Long,
)

data class LinkItem(
    val id: String,
    val title: String,
    val url: String,
    val icon: String,
    val iconBg: String,
    val category: String,
    val clicks: Int,
    val createdAt: Long,
    val updatedAt: Long,
)

data class DayNote(val date: String, val mood: Int, val note: String)

data class ActivityEntry(
    val id: Long,
    val ts: Long,
    val date: String,
    val action: String,
    val entity: String,
    val title: String,
    val details: String,
)

data class DayOverview(
    val totalPriority: Int,
    val completedPriority: Int,
    val totalTasks: Int,
    val completedTasks: Int,
    val totalHabits: Int,
    val completedHabits: Int,
    val focusMinutes: Int,
) {
    /** Weighted daily score: priorities matter most, then habits, then the rest of the list. */
    val score: Int
        get() {
            var weight = 0.0
            var earned = 0.0
            if (totalPriority > 0) { weight += 0.5; earned += 0.5 * completedPriority / totalPriority }
            if (totalHabits > 0) { weight += 0.3; earned += 0.3 * completedHabits / totalHabits }
            val other = totalTasks - totalPriority
            if (other > 0) { weight += 0.2; earned += 0.2 * (completedTasks - completedPriority).coerceAtLeast(0) / other }
            return if (weight == 0.0) 0 else (earned / weight * 100).toInt()
        }
}

data class StreakSummary(
    val current: Int,
    val longest: Int,
    val activeToday: Boolean,
    val activeDates: Set<String>,
)
