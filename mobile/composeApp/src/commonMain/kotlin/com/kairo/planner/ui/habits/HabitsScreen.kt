package com.kairo.planner.ui.habits

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Bedtime
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Code
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.DirectionsRun
import androidx.compose.material.icons.rounded.FitnessCenter
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.LocalCafe
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.MenuBook
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material.icons.rounded.Restaurant
import androidx.compose.material.icons.rounded.SelfImprovement
import androidx.compose.material.icons.rounded.SmokeFree
import androidx.compose.material.icons.rounded.Spa
import androidx.compose.material.icons.rounded.TrackChanges
import androidx.compose.material.icons.rounded.WaterDrop
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kairo.planner.core.ALL_DAY_CODES
import com.kairo.planner.data.PlannerRepository
import com.kairo.planner.i18n.S
import com.kairo.planner.model.Habit
import com.kairo.planner.model.HabitDayState
import com.kairo.planner.model.HabitStats
import com.kairo.planner.platform.LocalPlatform
import com.kairo.planner.platform.UiSound
import com.kairo.planner.ui.LocalAppState
import com.kairo.planner.ui.Sheet
import com.kairo.planner.ui.components.EmptyState
import com.kairo.planner.ui.components.FieldLabel
import com.kairo.planner.ui.components.Gap
import com.kairo.planner.ui.components.NeoButton
import com.kairo.planner.ui.components.NeoButtonStyle
import com.kairo.planner.ui.components.NeoCard
import com.kairo.planner.ui.components.NeoChip
import com.kairo.planner.ui.components.NeoIconButton
import com.kairo.planner.ui.components.NeoTextField
import com.kairo.planner.ui.components.ProgressRing
import com.kairo.planner.ui.components.SumireSheet
import com.kairo.planner.ui.planner.TodayViewModel
import com.kairo.planner.ui.theme.Sumire
import com.kairo.planner.ui.theme.parseHexColor
import kotlinx.coroutines.launch
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel

val HABIT_ICONS: List<Pair<String, ImageVector>> = listOf(
    "bolt" to Icons.Rounded.Bolt,
    "water" to Icons.Rounded.WaterDrop,
    "book" to Icons.Rounded.MenuBook,
    "run" to Icons.Rounded.DirectionsRun,
    "gym" to Icons.Rounded.FitnessCenter,
    "sleep" to Icons.Rounded.Bedtime,
    "meditate" to Icons.Rounded.SelfImprovement,
    "heart" to Icons.Rounded.Favorite,
    "food" to Icons.Rounded.Restaurant,
    "code" to Icons.Rounded.Code,
    "music" to Icons.Rounded.MusicNote,
    "coffee" to Icons.Rounded.LocalCafe,
    "spa" to Icons.Rounded.Spa,
    "target" to Icons.Rounded.TrackChanges,
    "nosmoke" to Icons.Rounded.SmokeFree,
)

val HABIT_COLORS = listOf("#3D6B52", "#476C85", "#C25E40", "#E09F3E", "#B85060", "#8E6BBF", "#2F8F9D", "#6B635B")

@Composable
fun HabitIcon(key: String, tint: Color, modifier: Modifier = Modifier) {
    val icon = HABIT_ICONS.firstOrNull { it.first == key }?.second
    if (icon != null) {
        Icon(icon, null, tint = tint, modifier = modifier)
    } else {
        // Legacy web habits stored emoji icons.
        Text(key.take(2), fontSize = 16.sp, modifier = modifier)
    }
}

@Composable
fun HabitsScreen(contentPadding: PaddingValues, vm: TodayViewModel = koinViewModel()) {
    val ui by vm.ui.collectAsStateWithLifecycle()
    val app = LocalAppState.current
    val s = S
    val scheduled = ui.habits.filter { it.scheduledToday }
    val doneCount = scheduled.count { it.completedToday }

    LazyColumn(contentPadding = contentPadding, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Row(Modifier.padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(s.habits, style = Sumire.type.hero(), color = Sumire.colors.ink)
                    Text(s.habitsProgress(doneCount, scheduled.size), style = Sumire.type.small(), color = Sumire.colors.inkMuted)
                }
                ProgressRing(if (scheduled.isEmpty()) 0f else doneCount.toFloat() / scheduled.size, Modifier.size(56.dp), stroke = 7.dp) {
                    Text("$doneCount", style = Sumire.type.number(16), color = Sumire.colors.ink)
                }
                Spacer(Modifier.width(10.dp))
                NeoIconButton(Icons.Rounded.Add, s.addHabit, { app.show(Sheet.HabitEditor()) }, color = Sumire.colors.matcha, tint = Sumire.colors.onAccent, size = 48.dp)
            }
        }
        if (ui.habits.isEmpty()) {
            item {
                EmptyState("🌱", s.noHabitsTitle, s.noHabitsSubtitle) {
                    NeoButton(s.addHabit, { app.show(Sheet.HabitEditor()) }, icon = Icons.Rounded.Add)
                }
            }
        }
        items(ui.habits, key = { it.habit.id }) { h ->
            HabitCard(h, onToggle = { vm.toggleHabit(h) }, onEdit = { app.show(Sheet.HabitEditor(h.habit)) })
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun HabitCard(h: HabitStats, onToggle: () -> Unit, onEdit: () -> Unit) {
    val c = Sumire.colors
    val s = S
    val color = parseHexColor(h.habit.color)
    val platform = LocalPlatform.current
    NeoCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp), onClick = onEdit) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(42.dp).clip(RoundedCornerShape(13.dp)).background(color.copy(alpha = 0.18f)).border(1.5.dp, c.line, RoundedCornerShape(13.dp)),
                contentAlignment = Alignment.Center,
            ) { HabitIcon(h.habit.icon, color, Modifier.size(22.dp)) }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(h.habit.title, style = Sumire.type.bodyStrong(), color = c.ink, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.LocalFireDepartment, null, tint = c.terracotta, modifier = Modifier.size(14.dp))
                    Text(" ${h.currentStreak} · ${s.bestStreak} ${h.longestStreak} · ${h.completionRate}%", style = Sumire.type.small(), color = c.inkMuted)
                }
            }
            val done = h.completedToday
            val bg by animateColorAsState(if (done) color else c.card)
            val sc by animateFloatAsState(if (done) 1.08f else 1f, spring(dampingRatio = 0.35f, stiffness = 600f))
            Box(
                Modifier
                    .size(48.dp)
                    .graphicsLayer { scaleX = sc; scaleY = sc }
                    .clip(CircleShape)
                    .background(bg)
                    .border(1.75.dp, c.line, CircleShape)
                    .clickable {
                        platform.sound(if (done) UiSound.TAP else UiSound.SUCCESS)
                        onToggle()
                    },
                contentAlignment = Alignment.Center,
            ) {
                if (done) Icon(Icons.Rounded.Check, null, tint = c.onAccent, modifier = Modifier.size(26.dp))
                else if (!h.scheduledToday) Text(s.restDay.take(1), color = c.inkMuted)
            }
        }
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            h.recent.forEach { (date, state) ->
                val dayIdx = runCatching { kotlinx.datetime.LocalDate.parse(date).dayOfWeek.ordinal }.getOrDefault(0)
                Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height(10.dp)
                            .clip(RoundedCornerShape(50))
                            .background(
                                when (state) {
                                    HabitDayState.DONE -> color
                                    HabitDayState.MISSED -> c.terracottaSoft
                                    HabitDayState.REST -> c.sand.copy(alpha = 0.5f)
                                    HabitDayState.FUTURE -> c.sand
                                },
                            ),
                    )
                    Spacer(Modifier.height(3.dp))
                    Text(s.weekdaysShort[dayIdx], style = Sumire.type.small().copy(fontSize = 10.sp), color = c.inkMuted)
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun HabitEditorSheet(initial: Habit?, onDismiss: () -> Unit) {
    val repo = koinInject<PlannerRepository>()
    val scope = rememberCoroutineScope()
    val s = S
    var title by remember { mutableStateOf(initial?.title ?: "") }
    var icon by remember { mutableStateOf(initial?.icon ?: "bolt") }
    var color by remember { mutableStateOf(initial?.color ?: HABIT_COLORS.first()) }
    val days = remember { mutableStateListOf<String>().apply { addAll(initial?.targetDays ?: ALL_DAY_CODES) } }

    SumireSheet(if (initial == null) s.addHabit else s.edit, onDismiss) { close ->
        NeoTextField(title, { title = it }, placeholder = s.habitTitleHint, textStyle = Sumire.type.section())
        FieldLabel(s.habitDays)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            NeoChip(s.everyDay, days.size == 7, { days.clear(); days.addAll(ALL_DAY_CODES) })
            NeoChip(s.weekdays, days.toSet() == ALL_DAY_CODES.take(5).toSet(), { days.clear(); days.addAll(ALL_DAY_CODES.take(5)) })
        }
        Gap(8)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            ALL_DAY_CODES.forEachIndexed { i, code ->
                NeoChip(s.weekdaysShort[i], code in days, {
                    if (code in days) { if (days.size > 1) days.remove(code) } else days.add(code)
                })
            }
        }
        FieldLabel(s.icon)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            HABIT_ICONS.forEach { (key, vec) ->
                val sel = key == icon
                Box(
                    Modifier.size(44.dp).clip(RoundedCornerShape(12.dp))
                        .background(if (sel) parseHexColor(color) else Sumire.colors.card)
                        .border(if (sel) 1.75.dp else 1.dp, Sumire.colors.line.copy(alpha = if (sel) 1f else 0.3f), RoundedCornerShape(12.dp))
                        .clickable { icon = key },
                    contentAlignment = Alignment.Center,
                ) { Icon(vec, key, tint = if (sel) Sumire.colors.onAccent else Sumire.colors.ink, modifier = Modifier.size(22.dp)) }
            }
        }
        FieldLabel(s.color)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            HABIT_COLORS.forEach { hex ->
                val sel = hex == color
                Box(
                    Modifier.size(if (sel) 34.dp else 30.dp).clip(CircleShape).background(parseHexColor(hex))
                        .border(if (sel) 3.dp else 1.5.dp, Sumire.colors.line, CircleShape)
                        .clickable { color = hex },
                )
            }
        }
        Gap(24)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            if (initial != null) {
                NeoButton(s.delete, { scope.launch { repo.deleteHabit(initial); close() } }, style = NeoButtonStyle.DANGER, icon = Icons.Rounded.DeleteOutline)
            }
            NeoButton(s.save, {
                scope.launch {
                    if (initial == null) repo.addHabit(title, icon, color, days.toList(), null)
                    else repo.saveHabit(initial.copy(title = title.trim(), icon = icon, color = color, targetDays = days.toList()))
                    close()
                }
            }, modifier = Modifier.weight(1f), enabled = title.isNotBlank())
        }
    }
}
