package com.kairo.planner.data

import app.cash.sqldelight.coroutines.asFlow
import app.cash.sqldelight.coroutines.mapToList
import app.cash.sqldelight.coroutines.mapToOneOrNull
import com.kairo.planner.core.Time
import com.kairo.planner.core.code
import com.kairo.planner.core.key
import com.kairo.planner.core.minusDays
import com.kairo.planner.core.newId
import com.kairo.planner.db.SumireDatabase
import com.kairo.planner.model.ActivityEntry
import com.kairo.planner.model.DayNote
import com.kairo.planner.model.FocusMode
import com.kairo.planner.model.FocusSession
import com.kairo.planner.model.Habit
import com.kairo.planner.model.HabitLog
import com.kairo.planner.model.LinkItem
import com.kairo.planner.model.SubTask
import com.kairo.planner.model.Task
import com.kairo.planner.model.TaskCategory
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import kotlinx.datetime.LocalDate
import com.kairo.planner.db.Day_note as DayNoteRow
import com.kairo.planner.db.Focus_session as FocusRow
import com.kairo.planner.db.Link as LinkRow

/** Emitted after every local write so the sync engine can push soon. */
fun interface ChangeListener { fun onLocalChange() }

class PlannerRepository(
    private val db: SumireDatabase,
    private val changes: ChangeListener,
) {
    private val tq get() = db.taskQueries
    private val hq get() = db.habitQueries
    private val fq get() = db.focusQueries
    private val lq get() = db.linkQueries
    private val mq get() = db.miscQueries
    private val io get() = DbDispatcher.io

    // ------------------------------------------------------------------ Tasks

    fun tasksForDate(date: String): Flow<List<Task>> =
        tq.selectForDate(date).asFlow().mapToList(io).map { rows -> rows.map { it.toModel() } }

    fun backlog(): Flow<List<Task>> =
        tq.selectBacklog().asFlow().mapToList(io).map { rows -> rows.map { it.toModel() } }

    fun tasksBetween(from: String, to: String): Flow<List<Task>> =
        tq.selectBetween(from, to).asFlow().mapToList(io).map { rows -> rows.map { it.toModel() } }

    suspend fun task(id: String): Task? = withContext(io) { tq.selectById(id).executeAsOneOrNull()?.toModel() }

    suspend fun searchTasks(query: String): List<Task> = withContext(io) { tq.search(query).executeAsList().map { it.toModel() } }

    suspend fun addTask(
        title: String,
        date: String,
        isPriority: Boolean = false,
        category: TaskCategory = TaskCategory.GENERAL,
        estimatedMinutes: Int = 30,
        subtasks: List<String> = emptyList(),
        notes: String = "",
        recurringDays: List<String> = emptyList(),
        reminderAt: Long? = null,
    ): Task = withContext(io) {
        val now = Time.nowMs()
        val priorityAllowed = !isPriority || priorityCount(date) < MAX_PRIORITIES
        val existing = tq.selectForDate(date).executeAsList()
        val task = Task(
            id = newId(),
            title = title.trim(),
            notes = notes,
            isPriority = priorityAllowed && isPriority,
            date = date,
            category = category,
            estimatedMinutes = estimatedMinutes,
            subtasks = subtasks.filter { it.isNotBlank() }.map { SubTask(newId(), it.trim()) },
            recurringDays = recurringDays,
            sortOrder = (existing.maxOfOrNull { it.sort_order } ?: -1).toInt() + 1,
            reminderAt = reminderAt,
            createdAt = now,
            updatedAt = now,
        )
        tq.upsert(task.toRow())
        log("created", if (task.isPriority) "priority" else "task", task.title)
        changes.onLocalChange()
        task
    }

    suspend fun saveTask(task: Task) = withContext(io) {
        tq.upsert(task.copy(updatedAt = Time.nowMs()).toRow())
        changes.onLocalChange()
    }

    suspend fun setCompleted(task: Task, completed: Boolean) = withContext(io) {
        val now = Time.nowMs()
        tq.upsert(
            task.copy(
                isCompleted = completed,
                completedAt = if (completed) now else null,
                subtasks = if (completed) task.subtasks.map { it.copy(isCompleted = true) } else task.subtasks,
                updatedAt = now,
            ).toRow(),
        )
        log(if (completed) "completed" else "uncompleted", if (task.isPriority) "priority" else "task", task.title)
        changes.onLocalChange()
    }

    suspend fun toggleSubtask(task: Task, subtaskId: String) = withContext(io) {
        val subs = task.subtasks.map { if (it.id == subtaskId) it.copy(isCompleted = !it.isCompleted) else it }
        val allDone = subs.isNotEmpty() && subs.all { it.isCompleted }
        val now = Time.nowMs()
        tq.upsert(
            task.copy(
                subtasks = subs,
                isCompleted = if (allDone) true else task.isCompleted && subs.all { it.isCompleted },
                completedAt = if (allDone) now else task.completedAt,
                updatedAt = now,
            ).toRow(),
        )
        changes.onLocalChange()
    }

    /** @return false when the day already has [MAX_PRIORITIES] priorities. */
    suspend fun setPriority(task: Task, priority: Boolean): Boolean = withContext(io) {
        if (priority && !task.isPriority && priorityCount(task.date) >= MAX_PRIORITIES) return@withContext false
        tq.upsert(task.copy(isPriority = priority, updatedAt = Time.nowMs()).toRow())
        log(if (priority) "promoted" else "demoted", "task", task.title)
        changes.onLocalChange()
        true
    }

    suspend fun moveTo(task: Task, date: String) = withContext(io) {
        val keepPriority = task.isPriority && priorityCount(date) < MAX_PRIORITIES
        tq.upsert(task.copy(date = date, isPriority = keepPriority, updatedAt = Time.nowMs()).toRow())
        changes.onLocalChange()
    }

    suspend fun reorder(ordered: List<Task>) = withContext(io) {
        val now = Time.nowMs()
        db.transaction {
            ordered.forEachIndexed { i, t -> tq.upsert(t.copy(sortOrder = i, updatedAt = now).toRow()) }
        }
        changes.onLocalChange()
    }

    suspend fun deleteTask(task: Task) = withContext(io) {
        tq.softDelete(Time.nowMs(), task.id)
        log("deleted", "task", task.title)
        changes.onLocalChange()
    }

    suspend fun restoreTask(task: Task) = withContext(io) {
        tq.upsert(task.copy(deletedAt = null, updatedAt = Time.nowMs()).toRow())
        changes.onLocalChange()
    }

    private fun priorityCount(date: String): Int =
        tq.selectForDate(date).executeAsList().count { it.is_priority == 1L && it.deleted_at == null }

    /** Unfinished tasks from previous days. */
    suspend fun overdue(today: String): List<Task> = withContext(io) {
        tq.selectOpenBefore(today).executeAsList().map { it.toModel() }.filter { !it.isRecurring }
    }

    /** Moves every unfinished task from earlier days to [today] (priorities keep their flag while slots remain). */
    suspend fun rollover(tasks: List<Task>, today: String) = withContext(io) {
        val now = Time.nowMs()
        var slots = MAX_PRIORITIES - priorityCount(today)
        db.transaction {
            tasks.forEach { t ->
                val keep = t.isPriority && slots > 0
                if (keep) slots--
                tq.upsert(t.copy(date = today, isPriority = keep, updatedAt = now).toRow())
            }
        }
        if (tasks.isNotEmpty()) changes.onLocalChange()
    }

    /** Creates today's instances of recurring tasks. Instance id is deterministic, so this is idempotent. */
    suspend fun materializeRecurring(date: LocalDate) = withContext(io) {
        val dayCode = date.dayOfWeek.code
        val key = date.key()
        val templates = tq.selectRecurringTemplates().executeAsList().map { it.toModel() }
        val now = Time.nowMs()
        var created = false
        db.transaction {
            templates.filter { dayCode in it.recurringDays && it.date <= key }.forEach { tpl ->
                val instanceId = "${tpl.id}@$key"
                if (tpl.date == key) return@forEach // the template itself lives on its creation day
                if (tq.selectById(instanceId).executeAsOneOrNull() == null) {
                    tq.upsert(
                        tpl.copy(
                            id = instanceId,
                            date = key,
                            isCompleted = false,
                            completedAt = null,
                            recurringDays = emptyList(),
                            subtasks = tpl.subtasks.map { it.copy(isCompleted = false) },
                            createdAt = now,
                            updatedAt = now,
                        ).toRow(),
                    )
                    created = true
                }
            }
        }
        if (created) changes.onLocalChange()
    }

    // ------------------------------------------------------------------ Habits

    fun habits(): Flow<List<Habit>> = hq.selectActive().asFlow().mapToList(io).map { rows -> rows.map { it.toModel() } }

    suspend fun habitsOnce(): List<Habit> = withContext(io) { hq.selectActive().executeAsList().map { it.toModel() } }

    fun habitLogsSince(date: String): Flow<List<HabitLog>> =
        hq.selectLogsSince(date).asFlow().mapToList(io).map { rows -> rows.map { it.toModel() } }

    suspend fun saveHabit(habit: Habit) = withContext(io) {
        hq.upsertHabit(habit.copy(updatedAt = Time.nowMs()).toRow())
        changes.onLocalChange()
    }

    suspend fun addHabit(title: String, icon: String, color: String, days: List<String>, reminderMinute: Int?): Habit = withContext(io) {
        val now = Time.nowMs()
        val order = hq.selectActive().executeAsList().size
        val h = Habit(newId(), title.trim(), icon, color, days, reminderMinute, false, order, now, now)
        hq.upsertHabit(h.toRow())
        log("created", "habit", h.title)
        changes.onLocalChange()
        h
    }

    suspend fun deleteHabit(habit: Habit) = withContext(io) {
        hq.softDeleteHabit(Time.nowMs(), habit.id)
        changes.onLocalChange()
    }

    suspend fun setHabitDone(habitId: String, date: String, done: Boolean, title: String = "") = withContext(io) {
        hq.upsertLog(habitId, date, if (done) 1L else 0L, Time.nowMs())
        if (done) log("habit", "habit", title)
        changes.onLocalChange()
    }

    // ------------------------------------------------------------------ Focus

    fun focusBetween(from: String, to: String): Flow<List<FocusSession>> =
        fq.selectFocusBetween(from, to).asFlow().mapToList(io).map { rows -> rows.map { it.toModel() } }

    suspend fun addFocus(minutes: Int, mode: FocusMode, taskId: String?, taskTitle: String?) = withContext(io) {
        if (minutes <= 0) return@withContext
        val now = Time.nowMs()
        fq.insertFocus(FocusRow(newId(), taskId, taskTitle, minutes.toLong(), mode.code, Time.todayKey(), now, now))
        log("focus", "focus", taskTitle ?: mode.code, "$minutes min")
        changes.onLocalChange()
    }

    // ------------------------------------------------------------------ Links

    fun links(): Flow<List<LinkItem>> = lq.selectLinks().asFlow().mapToList(io).map { rows -> rows.map { it.toModel() } }

    suspend fun saveLink(link: LinkItem) = withContext(io) {
        val now = Time.nowMs()
        lq.upsertLink(LinkRow(link.id, link.title, link.url, link.icon, link.iconBg, link.category, link.clicks.toLong(), link.createdAt, now, null))
        changes.onLocalChange()
    }

    suspend fun clickLink(id: String) = withContext(io) { lq.incrementClicks(Time.nowMs(), id) }

    suspend fun deleteLink(id: String) = withContext(io) {
        lq.softDeleteLink(Time.nowMs(), id)
        changes.onLocalChange()
    }

    // ------------------------------------------------------------------ Streak inputs

    /** Every date on which anything was accomplished (task, habit, focus). */
    fun activeDates(): Flow<Set<String>> = combine(
        tq.selectCompleted().asFlow().mapToList(io),
        hq.selectCompletedDates().asFlow().mapToList(io),
        fq.selectFocusDates().asFlow().mapToList(io),
    ) { a, b, c -> (a + b + c).toSet() }

    // ------------------------------------------------------------------ Day notes & activity

    fun dayNote(date: String): Flow<DayNote?> =
        mq.selectDayNote(date).asFlow().mapToOneOrNull(io).map { it?.toModel() }

    suspend fun saveDayNote(date: String, mood: Int, note: String) = withContext(io) {
        mq.upsertDayNote(DayNoteRow(date, mood.toLong(), note, Time.nowMs()))
    }

    fun recentActivity(limit: Long = 200): Flow<List<ActivityEntry>> =
        mq.selectRecentActivity(limit).asFlow().mapToList(io).map { rows -> rows.map { it.toModel() } }

    suspend fun clearActivity() = withContext(io) { mq.clearActivity() }

    fun log(action: String, entity: String, title: String, details: String = "") {
        val now = Time.nowMs()
        mq.insertActivity(now, Time.todayKey(), action, entity, title, details)
    }

    suspend fun trimOldActivity() = withContext(io) {
        mq.trimActivity(Time.startOfDayMs(Time.today().minusDays(120)))
        tq.purgeDeletedBefore(Time.startOfDayMs(Time.today().minusDays(60)))
    }

    companion object {
        const val MAX_PRIORITIES = 3
    }
}
