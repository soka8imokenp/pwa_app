package com.kairo.planner.ui.health

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.DirectionsWalk
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.kairo.planner.core.Time
import com.kairo.planner.core.days
import com.kairo.planner.core.fmt
import com.kairo.planner.core.grouped
import com.kairo.planner.core.key
import com.kairo.planner.core.minusDays
import com.kairo.planner.core.minutesLabel
import com.kairo.planner.data.AppSettings
import com.kairo.planner.data.HealthRepository
import com.kairo.planner.data.HealthSync
import com.kairo.planner.domain.health.HealthFormulas
import com.kairo.planner.i18n.S
import com.kairo.planner.model.HealthProfile
import com.kairo.planner.model.StepLog
import com.kairo.planner.model.WorkoutCategory
import com.kairo.planner.model.WorkoutLog
import com.kairo.planner.platform.AppPermission
import com.kairo.planner.platform.HealthConnectStatus
import com.kairo.planner.platform.HealthPlatform
import com.kairo.planner.platform.LocalPlatform
import com.kairo.planner.ui.LocalAppState
import com.kairo.planner.ui.Page
import com.kairo.planner.ui.Sheet
import com.kairo.planner.ui.components.FieldLabel
import com.kairo.planner.ui.components.Gap
import com.kairo.planner.ui.components.NeoButton
import com.kairo.planner.ui.components.NeoButtonStyle
import com.kairo.planner.ui.components.NeoCard
import com.kairo.planner.ui.components.NeoChip
import com.kairo.planner.ui.components.NeoIconButton
import com.kairo.planner.ui.components.NeoTextField
import com.kairo.planner.ui.components.ProgressRing
import com.kairo.planner.ui.components.SectionLabel
import com.kairo.planner.ui.components.StatTile
import com.kairo.planner.ui.components.SumireSheet
import com.kairo.planner.ui.components.SwipeToDelete
import com.kairo.planner.ui.dateShort
import com.kairo.planner.ui.theme.Sumire
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.datetime.isoDayNumber
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel

data class ActivityUi(
    val profile: HealthProfile = HealthProfile(),
    val today: StepLog? = null,
    val week: List<Pair<String, Int>> = emptyList(),
    val workouts: List<WorkoutLog> = emptyList(),
)

class ActivityViewModel(
    private val health: HealthRepository,
    private val sync: HealthSync,
    val settings: AppSettings,
) : ViewModel() {
    private val today = Time.today()
    private val from = today.minusDays(6)

    val ui: StateFlow<ActivityUi> = combine(
        health.profile(),
        health.stepsBetween(from.key(), today.key()),
        health.workoutsBetween(today.minusDays(29).key(), today.key()),
    ) { p, steps, workouts ->
        val map = steps.associateBy { it.date }
        ActivityUi(
            profile = p,
            today = map[today.key()],
            week = (from..today).days().map { it.key() to (map[it.key()]?.steps ?: 0) },
            workouts = workouts,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ActivityUi())

    fun refresh() = viewModelScope.launch { sync.refreshSteps() }
    fun setSteps(steps: Int) = viewModelScope.launch { health.setSteps(Time.todayKey(), steps, "manual", force = true) }
    fun setGoal(goal: Int) = viewModelScope.launch { health.setStepGoal(goal) }
    fun deleteWorkout(id: String) = viewModelScope.launch { health.deleteWorkout(id) }
    fun addWorkout(title: String, cat: WorkoutCategory, minutes: Int, kcal: Int?) =
        viewModelScope.launch { health.addWorkout(Time.todayKey(), title, cat, minutes, kcal) }
}

@Composable
fun ActivityScreen(contentPadding: PaddingValues, vm: ActivityViewModel = koinViewModel()) {
    val ui by vm.ui.collectAsStateWithLifecycle()
    val app = LocalAppState.current
    val platform = LocalPlatform.current
    val healthPlatform = koinInject<HealthPlatform>()
    val scope = rememberCoroutineScope()
    val s = S
    val c = Sumire.colors
    var sensorGranted by remember { mutableStateOf(platform.isGranted(AppPermission.ACTIVITY_RECOGNITION)) }

    LaunchedEffect(Unit) {
        vm.refresh()
        healthPlatform.ensureBackgroundStepTracking()
    }

    val steps = ui.today?.steps ?: 0
    val goal = ui.profile.stepGoal
    LazyColumn(contentPadding = contentPadding, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Row(Modifier.padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(s.activity, style = Sumire.type.hero(), color = c.ink, modifier = Modifier.weight(1f))
                NeoIconButton(Icons.Rounded.Refresh, null, { vm.refresh() }, size = 36.dp)
            }
        }
        if (!sensorGranted && healthPlatform.hasStepSensor()) {
            item {
                NeoCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp), color = c.ochreSoft) {
                    Text(s.enableStepTracking, style = Sumire.type.section(), color = c.ink)
                    Text(s.enableStepTrackingHint, style = Sumire.type.small(), color = c.inkMuted)
                    Gap(10)
                    NeoButton(s.grant, {
                        scope.launch {
                            sensorGranted = platform.request(AppPermission.ACTIVITY_RECOGNITION)
                            if (sensorGranted) {
                                healthPlatform.ensureBackgroundStepTracking()
                                vm.refresh()
                            }
                        }
                    }, compact = true)
                }
            }
        }
        item {
            NeoCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ProgressRing(steps.toFloat() / goal.coerceAtLeast(1), Modifier.size(132.dp), color = c.matcha, stroke = 13.dp) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Rounded.DirectionsWalk, null, tint = c.matcha, modifier = Modifier.size(22.dp))
                            Text(steps.grouped(), style = Sumire.type.number(24), color = c.ink)
                            Text("/ ${goal.grouped()}", style = Sumire.type.small(), color = c.inkMuted)
                        }
                    }
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            if (steps >= goal) s.stepGoalReached else s.stepsLeft((goal - steps).grouped()),
                            style = Sumire.type.bodyStrong(), color = if (steps >= goal) c.matcha else c.ink,
                        )
                        Text("${s.distance}: ${((ui.today?.distanceM ?: 0) / 1000.0).fmt(2)} ${s.km}", style = Sumire.type.small(), color = c.inkMuted)
                        Text("${s.activeTime}: ${(ui.today?.activeMinutes ?: 0).minutesLabel(s.hoursShort, s.minutesShort)}", style = Sumire.type.small(), color = c.inkMuted)
                        Text("${s.calories}: ${ui.today?.calories ?: 0} ${s.kcal}", style = Sumire.type.small(), color = c.inkMuted)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            NeoButton(s.edit, { app.show(Sheet.StepsEditor) }, compact = true, style = NeoButtonStyle.SECONDARY, icon = Icons.Rounded.Edit)
                        }
                    }
                }
            }
        }
        item {
            NeoCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
                Text(s.weekSteps.uppercase(), style = Sumire.type.label(), color = c.inkMuted)
                Gap(8)
                WeekBars(ui.week, goal)
            }
        }
        if (healthPlatform.status() != HealthConnectStatus.UNSUPPORTED) {
            item {
                NeoCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp), color = c.plumSoft, onClick = { app.open(Page.HEALTH_CONNECT) }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.Favorite, null, tint = c.plum)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(s.healthConnect, style = Sumire.type.bodyStrong(), color = c.ink)
                            Text(s.healthConnectHint, style = Sumire.type.small(), color = c.inkMuted, maxLines = 2)
                        }
                    }
                }
            }
        }
        item {
            SectionLabel(s.workouts, Modifier.padding(horizontal = 16.dp)) {
                NeoIconButton(Icons.Rounded.Add, s.addWorkout, { app.show(Sheet.WorkoutEditor) }, size = 32.dp)
            }
        }
        if (ui.workouts.isEmpty()) {
            item { Text(s.noWorkouts, style = Sumire.type.small(), color = c.inkMuted, modifier = Modifier.padding(horizontal = 20.dp)) }
        }
        items(ui.workouts, key = { it.id }) { w ->
            SwipeToDelete(onDelete = { vm.deleteWorkout(w.id) }) {
                NeoCard(Modifier.fillMaxWidth(), color = c.card, shadow = 1.5.dp, contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(workoutEmoji(w.category), fontSize = 22.sp)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(w.title, style = Sumire.type.bodyStrong(), color = c.ink, maxLines = 1)
                            Text("${s.dateShort(w.date)} · ${s.workoutCategoryName(w.category)} · ${w.durationMinutes.minutesLabel(s.hoursShort, s.minutesShort)}", style = Sumire.type.small(), color = c.inkMuted)
                        }
                        Text("${w.calories}", style = Sumire.type.number(16), color = c.terracotta)
                        Text(" ${s.kcal}", style = Sumire.type.small(), color = c.inkMuted)
                    }
                }
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun WeekBars(week: List<Pair<String, Int>>, goal: Int) {
    val c = Sumire.colors
    val s = S
    val measurer = rememberTextMeasurer()
    val anim = remember { Animatable(0f) }
    LaunchedEffect(week) { anim.snapTo(0f); anim.animateTo(1f, tween(700, easing = FastOutSlowInEasing)) }
    val max = (week.maxOfOrNull { it.second } ?: 0).coerceAtLeast(goal).coerceAtLeast(1)
    val labelStyle = Sumire.type.small().copy(fontSize = 10.sp, color = c.inkMuted, textAlign = TextAlign.Center)
    val todayKey = Time.todayKey()
    Canvas(Modifier.fillMaxWidth().height(140.dp)) {
        val bottom = 18.dp.toPx()
        val h = size.height - bottom
        val slot = size.width / week.size
        val bw = slot * 0.56f
        val gy = h - h * goal / max
        drawLine(c.ochre, Offset(0f, gy), Offset(size.width, gy), 1.5.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f, 8f)))
        week.forEachIndexed { i, (date, v) ->
            val bh = (h * v / max * anim.value).coerceAtLeast(3.dp.toPx())
            val x = slot * i + (slot - bw) / 2
            val color = if (v >= goal) c.matcha else if (date == todayKey) c.indigo else c.sand
            drawRoundRect(color, Offset(x, h - bh), Size(bw, bh), CornerRadius(6.dp.toPx()))
            drawRoundRect(c.line, Offset(x, h - bh), Size(bw, bh), CornerRadius(6.dp.toPx()), style = androidx.compose.ui.graphics.drawscope.Stroke(1.25.dp.toPx()))
            val day = runCatching { kotlinx.datetime.LocalDate.parse(date).dayOfWeek.isoDayNumber }.getOrDefault(1)
            val label = s.weekdaysShort[day - 1]
            val layout = measurer.measure(label, labelStyle)
            drawText(layout, topLeft = Offset(slot * i + (slot - layout.size.width) / 2, size.height - layout.size.height))
        }
    }
}

fun workoutEmoji(c: WorkoutCategory) = when (c) {
    WorkoutCategory.STRENGTH -> "🏋️"
    WorkoutCategory.CARDIO -> "❤️‍🔥"
    WorkoutCategory.RUN -> "🏃"
    WorkoutCategory.WALK -> "🚶"
    WorkoutCategory.CYCLING -> "🚴"
    WorkoutCategory.SWIM -> "🏊"
    WorkoutCategory.HIIT -> "⚡"
    WorkoutCategory.YOGA -> "🧘"
    WorkoutCategory.SPORTS -> "⚽"
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun WorkoutEditorSheet(onDismiss: () -> Unit, vm: ActivityViewModel = koinViewModel()) {
    val s = S
    val ui by vm.ui.collectAsStateWithLifecycle()
    var title by remember { mutableStateOf("") }
    var cat by remember { mutableStateOf(WorkoutCategory.STRENGTH) }
    var minutes by remember { mutableStateOf(45) }
    var kcal by remember { mutableStateOf("") }
    val estimated = HealthFormulas.workoutCalories(cat, minutes, ui.profile.currentWeight)
    SumireSheet(s.addWorkout, onDismiss) { close ->
        NeoTextField(title, { title = it }, placeholder = s.workoutTitle, textStyle = Sumire.type.section())
        FieldLabel(s.category)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            WorkoutCategory.entries.forEach { w -> NeoChip(s.workoutCategoryName(w), cat == w, { cat = w }, leading = workoutEmoji(w)) }
        }
        FieldLabel(s.duration)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(15, 20, 30, 45, 60, 75, 90, 120).forEach { m -> NeoChip(m.minutesLabel(s.hoursShort, s.minutesShort), minutes == m, { minutes = m }) }
        }
        FieldLabel("${s.calories} (${s.auto}: $estimated ${s.kcal})")
        NeoTextField(kcal, { kcal = it.filter(Char::isDigit).take(4) }, placeholder = estimated.toString(), keyboardType = KeyboardType.Number)
        Gap(20)
        NeoButton(s.save, {
            vm.addWorkout(title.ifBlank { s.workoutCategoryName(cat) }, cat, minutes, kcal.toIntOrNull())
            close()
        }, Modifier.fillMaxWidth())
    }
}

@Composable
fun StepsEditorSheet(onDismiss: () -> Unit, vm: ActivityViewModel = koinViewModel()) {
    val s = S
    val ui by vm.ui.collectAsStateWithLifecycle()
    val source by vm.settings.stepSource.collectAsState()
    var steps by remember { mutableStateOf((ui.today?.steps ?: 0).toString()) }
    var goal by remember { mutableStateOf(ui.profile.stepGoal.toString()) }
    SumireSheet(s.editSteps, onDismiss) { close ->
        FieldLabel(s.stepsTitle)
        NeoTextField(steps, { steps = it.filter(Char::isDigit).take(6) }, keyboardType = KeyboardType.Number, textStyle = Sumire.type.number(24))
        FieldLabel(s.stepGoal)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(6000, 8000, 10000, 12000).forEach { g -> NeoChip(g.grouped(), goal == g.toString(), { goal = g.toString() }) }
        }
        Gap(8)
        NeoTextField(goal, { goal = it.filter(Char::isDigit).take(6) }, keyboardType = KeyboardType.Number)
        FieldLabel(s.stepSource)
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("auto" to s.stepSourceAuto, "sensor" to s.stepSourceSensor, "hc" to s.stepSourceHc, "manual" to s.stepSourceManual).forEach { (k, label) ->
                NeoChip(label, source == k, { vm.settings.setStepSource(k) })
            }
        }
        Gap(20)
        NeoButton(s.save, {
            steps.toIntOrNull()?.let { if (it != (ui.today?.steps ?: 0)) vm.setSteps(it) }
            goal.toIntOrNull()?.let { if (it != ui.profile.stepGoal) vm.setGoal(it) }
            close()
        }, Modifier.fillMaxWidth())
    }
}
