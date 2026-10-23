package com.kairo.planner.ui.health

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kairo.planner.data.AppSettings
import com.kairo.planner.data.HealthRepository
import com.kairo.planner.data.HealthSync
import com.kairo.planner.domain.health.BodyCompositionCalculator
import com.kairo.planner.domain.health.HealthFormulas
import com.kairo.planner.domain.health.WeightTrend
import com.kairo.planner.model.HealthProfile
import com.kairo.planner.model.HealthTargets
import com.kairo.planner.model.MetricItem
import com.kairo.planner.model.PaceKind
import com.kairo.planner.model.TrendPoint
import com.kairo.planner.model.WeightLog
import com.kairo.planner.model.WeightPace
import com.kairo.planner.platform.HealthPlatform
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.datetime.LocalDate

data class BodyUi(
    val profile: HealthProfile = HealthProfile(),
    val targets: HealthTargets? = null,
    val logs: List<WeightLog> = emptyList(),
    val latest: WeightLog? = null,
    val trend: List<TrendPoint> = emptyList(),
    val pace: WeightPace = WeightPace(0.0, PaceKind.ESTABLISHING),
    val weekDelta: Double? = null,
    val items: List<MetricItem> = emptyList(),
    val projected: Pair<LocalDate?, Int> = null to 0,
    val loaded: Boolean = false,
)

class BodyViewModel(
    private val health: HealthRepository,
    private val sync: HealthSync,
    private val settings: AppSettings,
    private val platform: HealthPlatform,
) : ViewModel() {

    val ui: StateFlow<BodyUi> = combine(health.profile(), health.weights()) { profile, logs ->
        val latest = logs.lastOrNull()
        val trend = WeightTrend.movingAverage(logs)
        val pace = WeightTrend.pace(logs)
        val weekDelta = if (trend.size >= 2) {
            val last = trend.last()
            val lastDate = LocalDate.parse(last.date)
            val ref = trend.lastOrNull { LocalDate.parse(it.date) <= LocalDate.fromEpochDays(lastDate.toEpochDays() - 6) } ?: trend.first()
            if (ref.date == last.date) null else last.movingAvg - ref.movingAvg
        } else null
        val comp = latest?.composition
        BodyUi(
            profile = profile,
            targets = HealthFormulas.targets(profile),
            logs = logs.reversed(),
            latest = latest,
            trend = trend,
            pace = pace,
            weekDelta = weekDelta,
            items = if (comp != null) BodyCompositionCalculator.metricItems(comp, profile.heightCm, profile.age, profile.gender, latest.weight) else emptyList(),
            projected = WeightTrend.projectGoal(latest?.weight ?: profile.currentWeight, profile.targetWeight, profile.goal, pace),
            loaded = true,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), BodyUi())

    fun addManual(weight: Double, waist: Double?, note: String) = viewModelScope.launch {
        val log = health.addWeight(weight, source = "manual", note = note, waistCm = waist)
        if (settings.healthConnectWrite.value) platform.writeWeight(log.measuredAt, weight, null)
    }

    fun delete(id: String) = viewModelScope.launch { health.deleteWeight(id) }

    fun importHealthConnect(onDone: (Int) -> Unit) = viewModelScope.launch { onDone(sync.importFromHealthConnect()) }
}
