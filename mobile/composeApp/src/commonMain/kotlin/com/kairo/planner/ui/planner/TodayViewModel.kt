package com.kairo.planner.ui.planner

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kairo.planner.core.Time
import com.kairo.planner.core.key
import com.kairo.planner.core.minusDays
import com.kairo.planner.core.plusDays
import com.kairo.planner.data.AppSettings
import com.kairo.planner.data.PlannerRepository
import com.kairo.planner.domain.planner.Streaks
import com.kairo.planner.model.DayNote
import com.kairo.planner.model.DayOverview
import com.kairo.planner.model.HabitStats
import com.kairo.planner.model.StreakSummary
import com.kairo.planner.model.Task
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.datetime.LocalDate

data class TodayUi(
    val date: LocalDate = Time.today(),
    val priorities: List<Task> = emptyList(),
    val tasks: List<Task> = emptyList(),
    val habits: List<HabitStats> = emptyList(),
    val focusMinutes: Int = 0,
    val streak: StreakSummary = StreakSummary(0, 0, false, emptySet()),
    val note: DayNote? = null,
    val overdue: List<Task> = emptyList(),
    val loaded: Boolean = false,
) {
    val isToday: Boolean get() = date == Time.today()
    val overview: DayOverview
        get() = DayOverview(
            totalPriority = priorities.size,
            completedPriority = priorities.count { it.isCompleted },
            totalTasks = priorities.size + tasks.size,
            completedTasks = priorities.count { it.isCompleted } + tasks.count { it.isCompleted },
            totalHabits = habits.count { it.scheduledToday },
            completedHabits = habits.count { it.scheduledToday && it.completedToday },
            focusMinutes = focusMinutes,
        )
}

@OptIn(ExperimentalCoroutinesApi::class)
class TodayViewModel(
    private val planner: PlannerRepository,
    private val settings: AppSettings,
) : ViewModel() {

    val selectedDate = MutableStateFlow(Time.today())
    private val overdueDismissed = MutableStateFlow(false)
    private val overdue = MutableStateFlow<List<Task>>(emptyList())

    private val tasksFlow = selectedDate.flatMapLatest { planner.tasksForDate(it.key()) }
    private val focusFlow = selectedDate.flatMapLatest { planner.focusBetween(it.key(), it.key()) }
    private val noteFlow = selectedDate.flatMapLatest { planner.dayNote(it.key()) }
    private val habitsFlow = combine(
        planner.habits(),
        planner.habitLogsSince(Time.today().minusDays(400).key()),
        selectedDate,
    ) { habits, logs, date -> habits.map { Streaks.habitStats(it, logs, date) } }

    val ui: StateFlow<TodayUi> = combine(
        combine(tasksFlow, focusFlow, noteFlow) { t, f, n -> Triple(t, f, n) },
        habitsFlow,
        planner.activeDates(),
        combine(overdue, overdueDismissed) { o, d -> if (d) emptyList() else o },
        selectedDate,
    ) { (tasks, focus, note), habits, active, overdueList, date ->
        TodayUi(
            date = date,
            priorities = tasks.filter { it.isPriority }.sortedBy { it.sortOrder },
            tasks = tasks.filter { !it.isPriority },
            habits = habits,
            focusMinutes = focus.sumOf { it.durationMinutes },
            streak = Streaks.overall(active, Time.today()),
            note = note,
            overdue = if (date == Time.today()) overdueList else emptyList(),
            loaded = true,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), TodayUi())

    init {
        refreshDay()
    }

    /** Called on start and when the app returns to foreground (the date may have changed overnight). */
    fun refreshDay() {
        viewModelScope.launch {
            val today = Time.today()
            if (selectedDate.value < today && settings.lastRolloverDate != today.key()) selectedDate.value = today
            planner.materializeRecurring(today)
            overdue.value = planner.overdue(today.key())
            planner.trimOldActivity()
        }
    }

    fun selectDate(d: LocalDate) { selectedDate.value = d }
    fun shiftDate(days: Int) { selectedDate.value = selectedDate.value.plusDays(days) }
    fun goToday() { selectedDate.value = Time.today() }

    fun quickAdd(title: String) = viewModelScope.launch { planner.addTask(title, selectedDate.value.key()) }

    fun toggle(task: Task) = viewModelScope.launch { planner.setCompleted(task, !task.isCompleted) }
    fun toggleSubtask(task: Task, subId: String) = viewModelScope.launch { planner.toggleSubtask(task, subId) }
    fun togglePriority(task: Task, onFull: () -> Unit) = viewModelScope.launch {
        if (!planner.setPriority(task, !task.isPriority)) onFull()
    }
    fun moveToTomorrow(task: Task) = viewModelScope.launch { planner.moveTo(task, task.date.let { LocalDate.parse(it) }.plusDays(1).key()) }
    fun moveToToday(task: Task) = viewModelScope.launch { planner.moveTo(task, Time.todayKey()) }
    fun delete(task: Task) = viewModelScope.launch { planner.deleteTask(task) }
    fun restore(task: Task) = viewModelScope.launch { planner.restoreTask(task) }
    fun reorderPriorities(list: List<Task>) = viewModelScope.launch { planner.reorder(list) }

    fun toggleHabit(stats: HabitStats) = viewModelScope.launch {
        planner.setHabitDone(stats.habit.id, selectedDate.value.key(), !stats.completedToday, stats.habit.title)
    }

    fun saveNote(mood: Int, text: String) = viewModelScope.launch { planner.saveDayNote(selectedDate.value.key(), mood, text) }

    fun rolloverOverdue() = viewModelScope.launch {
        planner.rollover(overdue.value, Time.todayKey())
        overdue.value = emptyList()
    }

    fun dismissOverdue() { overdueDismissed.value = true }

    /** Evening review: move open tasks of [date] to the next day. */
    fun closeDay(open: List<Task>) = viewModelScope.launch {
        val next = selectedDate.value.plusDays(1).key()
        planner.rollover(open, next)
        settings.lastRolloverDate = Time.todayKey()
    }
}
