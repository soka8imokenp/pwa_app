package com.kairo.planner.ui.health

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kairo.planner.core.Time
import com.kairo.planner.core.key
import com.kairo.planner.core.plusDays
import com.kairo.planner.data.FoodSuggestion
import com.kairo.planner.data.HealthRepository
import com.kairo.planner.domain.health.HealthFormulas
import com.kairo.planner.model.HealthProfile
import com.kairo.planner.model.HealthTargets
import com.kairo.planner.model.MealLog
import com.kairo.planner.model.NutritionTotals
import com.kairo.planner.model.WaterLog
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.datetime.LocalDate

data class FoodUi(
    val date: LocalDate = Time.today(),
    val profile: HealthProfile = HealthProfile(),
    val targets: HealthTargets? = null,
    val meals: List<MealLog> = emptyList(),
    val water: List<WaterLog> = emptyList(),
    val burnedKcal: Int = 0,
    val recent: List<FoodSuggestion> = emptyList(),
) {
    val totals: NutritionTotals
        get() = NutritionTotals(meals.sumOf { it.kcal }, meals.sumOf { it.protein }, meals.sumOf { it.carbs }, meals.sumOf { it.fat })
    val waterMl: Int get() = water.sumOf { it.amountMl }.coerceAtLeast(0)
}

@OptIn(ExperimentalCoroutinesApi::class)
class FoodViewModel(private val health: HealthRepository) : ViewModel() {
    val date = MutableStateFlow(Time.today())

    val ui: StateFlow<FoodUi> = combine(
        date,
        health.profile(),
        date.flatMapLatest { health.mealsForDate(it.key()) },
        date.flatMapLatest { health.waterForDate(it.key()) },
        combine(
            date.flatMapLatest { health.workoutsBetween(it.key(), it.key()) },
            date.flatMapLatest { health.stepsForDate(it.key()) },
            health.recentFoods(),
        ) { w, st, r -> Triple(w, st, r) },
    ) { d, profile, meals, water, (workouts, steps, recent) ->
        FoodUi(
            date = d,
            profile = profile,
            targets = HealthFormulas.targets(profile),
            meals = meals,
            water = water,
            burnedKcal = workouts.sumOf { it.calories } + (steps?.calories ?: 0),
            recent = recent,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), FoodUi())

    fun shift(days: Int) { date.value = date.value.plusDays(days).coerceAtMost(Time.today()) }

    fun addWater(ml: Int) = viewModelScope.launch { health.addWater(date.value.key(), ml) }

    fun undoWater() = viewModelScope.launch { ui.value.water.lastOrNull()?.let { health.deleteWater(it.id) } }

    fun deleteMeal(id: String) = viewModelScope.launch { health.deleteMeal(id) }
}
