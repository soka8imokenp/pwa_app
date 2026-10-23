package com.kairo.planner.ui

import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.kairo.planner.ai.NavTarget
import com.kairo.planner.model.Habit
import com.kairo.planner.model.LinkItem
import com.kairo.planner.model.MealLog
import com.kairo.planner.model.MealType
import com.kairo.planner.model.Task

enum class PlannerTab { TODAY, HABITS, FOCUS, MORE }

enum class HealthTab { BODY, FOOD, ACTIVITY, COACH }

/** Full-screen pages pushed on top of the tabs (from the "More" tab or settings). */
enum class Page { SETTINGS, BACKLOG, STATS, LINKS, ACTIVITY_LOG, PROFILE, HEALTH_CONNECT, ABOUT, ACCOUNT }

sealed interface Sheet {
    data class TaskEditor(val task: Task? = null, val date: String, val priority: Boolean = false) : Sheet
    data class HabitEditor(val habit: Habit? = null) : Sheet
    data object LogWeight : Sheet
    data object Scale : Sheet
    data class MealEditor(val type: MealType? = null, val meal: MealLog? = null) : Sheet
    data object WorkoutEditor : Sheet
    data object StepsEditor : Sheet
    data object EveningReview : Sheet
    data class LinkEditor(val link: LinkItem? = null) : Sheet
}

/** UI navigation state. Kept deliberately simple: two tab sets, a page stack and one sheet at a time. */
@Stable
class AppState {
    var healthMode by mutableStateOf(false)
    var plannerTab by mutableStateOf(PlannerTab.TODAY)
    var healthTab by mutableStateOf(HealthTab.BODY)
    var pages by mutableStateOf(listOf<Page>())
        private set
    var sheet by mutableStateOf<Sheet?>(null)
        private set

    fun open(page: Page) { pages = pages + page }
    fun clearPages() { pages = emptyList() }
    fun pop(): Boolean {
        if (pages.isEmpty()) return false
        pages = pages.dropLast(1)
        return true
    }
    fun show(s: Sheet) { sheet = s }
    fun dismissSheet() { sheet = null }

    fun navigate(target: NavTarget) {
        pages = emptyList()
        when (target) {
            NavTarget.TODAY -> { healthMode = false; plannerTab = PlannerTab.TODAY }
            NavTarget.HABITS -> { healthMode = false; plannerTab = PlannerTab.HABITS }
            NavTarget.FOCUS -> { healthMode = false; plannerTab = PlannerTab.FOCUS }
            NavTarget.MORE -> { healthMode = false; plannerTab = PlannerTab.MORE }
            NavTarget.BODY -> { healthMode = true; healthTab = HealthTab.BODY }
            NavTarget.FOOD -> { healthMode = true; healthTab = HealthTab.FOOD }
            NavTarget.ACTIVITY -> { healthMode = true; healthTab = HealthTab.ACTIVITY }
            NavTarget.COACH -> { healthMode = true; healthTab = HealthTab.COACH }
        }
    }

    /** @return true if something was closed. */
    fun handleBack(): Boolean = when {
        sheet != null -> { sheet = null; true }
        pop() -> true
        healthMode && healthTab != HealthTab.BODY -> { healthTab = HealthTab.BODY; true }
        !healthMode && plannerTab != PlannerTab.TODAY -> { plannerTab = PlannerTab.TODAY; true }
        else -> false
    }
}
