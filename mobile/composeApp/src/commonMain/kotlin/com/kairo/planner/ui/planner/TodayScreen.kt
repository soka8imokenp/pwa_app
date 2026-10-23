package com.kairo.planner.ui.planner

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ArrowForward
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.NightsStay
import androidx.compose.material.icons.rounded.Repeat
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.StarBorder
import androidx.compose.material.icons.rounded.Timer
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.Text
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kairo.planner.core.Time
import com.kairo.planner.core.minutesLabel
import com.kairo.planner.core.plusDays
import com.kairo.planner.core.startOfWeek
import com.kairo.planner.i18n.S
import com.kairo.planner.model.HabitStats
import com.kairo.planner.model.Task
import com.kairo.planner.model.TaskCategory
import com.kairo.planner.platform.LocalPlatform
import com.kairo.planner.ui.LocalAppState
import com.kairo.planner.ui.LocalSnackbar
import com.kairo.planner.ui.Sheet
import com.kairo.planner.ui.components.Haptic
import com.kairo.planner.ui.components.NeoBadge
import com.kairo.planner.ui.components.NeoButton
import com.kairo.planner.ui.components.NeoButtonStyle
import com.kairo.planner.ui.components.NeoCard
import com.kairo.planner.ui.components.NeoCheckbox
import com.kairo.planner.ui.components.NeoIconButton
import com.kairo.planner.ui.components.NeoTextField
import com.kairo.planner.ui.components.ProgressRing
import com.kairo.planner.ui.components.SectionLabel
import com.kairo.planner.ui.dateLong
import com.kairo.planner.ui.dayLabel
import com.kairo.planner.ui.habits.HabitIcon
import com.kairo.planner.ui.showUndo
import com.kairo.planner.ui.theme.Sumire
import com.kairo.planner.ui.theme.parseHexColor
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.datetime.LocalDate
import kotlinx.datetime.isoDayNumber
import org.koin.compose.viewmodel.koinViewModel

@Composable
fun TodayScreen(contentPadding: PaddingValues, vm: TodayViewModel = koinViewModel()) {
    val ui by vm.ui.collectAsStateWithLifecycle()
    val app = LocalAppState.current
    val snackbar = LocalSnackbar.current
    val platform = LocalPlatform.current
    val scope = rememberCoroutineScope()
    val s = S

    val onDelete: (Task) -> Unit = { t ->
        vm.delete(t)
        platform.haptic(Haptic.WARNING)
        scope.launch { snackbar.showUndo("${s.deleted}: ${t.title}", s.undo) { vm.restore(t) } }
    }
    val onFull = { scope.launch { snackbar.showSnackbar(s.prioritiesFull) }; Unit }

    LazyColumn(contentPadding = contentPadding, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item(key = "week") { WeekStrip(ui.date, ui.streak.activeDates, onSelect = vm::selectDate, onShift = vm::shiftDate) }

        item(key = "summary") { DaySummaryCard(ui) }

        if (ui.overdue.isNotEmpty()) {
            item(key = "overdue") {
                NeoCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp), color = Sumire.colors.ochreSoft) {
                    Text(s.overdueTitle, style = Sumire.type.section(), color = Sumire.colors.ink)
                    Spacer(Modifier.height(4.dp))
                    Text(s.overdueBody(ui.overdue.size), style = Sumire.type.small(), color = Sumire.colors.inkMuted)
                    Spacer(Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        NeoButton(s.moveAll, vm::rolloverOverdue, compact = true, icon = Icons.Rounded.ArrowForward)
                        NeoButton(s.dismiss, vm::dismissOverdue, compact = true, style = NeoButtonStyle.SECONDARY)
                    }
                }
            }
        }

        item(key = "top3-label") {
            SectionLabel(s.top3, Modifier.padding(horizontal = 16.dp)) {
                Text("${ui.priorities.count { it.isCompleted }}/3", style = Sumire.type.number(13), color = Sumire.colors.inkMuted)
            }
        }
        val slots = 3
        items(ui.priorities, key = { "p-" + it.id }) { task ->
            SwipeableTask(task, onDelete = onDelete, onTomorrow = vm::moveToTomorrow) {
                TaskCard(
                    task = task,
                    priority = true,
                    onToggle = { vm.toggle(task) },
                    onToggleSub = { vm.toggleSubtask(task, it) },
                    onOpen = { app.show(Sheet.TaskEditor(task, task.date)) },
                    onStar = { vm.togglePriority(task, onFull) },
                )
            }
        }
        if (ui.priorities.size < slots) {
            items(slots - ui.priorities.size, key = { "slot-$it" }) { i ->
                EmptySlot(index = ui.priorities.size + i + 1) {
                    app.show(Sheet.TaskEditor(null, ui.date.toString(), priority = true))
                }
            }
        }

        item(key = "tasks-label") {
            SectionLabel(s.otherTasks, Modifier.padding(horizontal = 16.dp, vertical = 0.dp).padding(top = 8.dp)) {
                NeoIconButton(Icons.Rounded.Add, s.addTask, { app.show(Sheet.TaskEditor(null, ui.date.toString())) }, size = 32.dp)
            }
        }
        item(key = "quick-add") { QuickAdd(onAdd = { vm.quickAdd(it) }) }
        items(ui.tasks, key = { "t-" + it.id }) { task ->
            SwipeableTask(task, onDelete = onDelete, onTomorrow = vm::moveToTomorrow) {
                TaskCard(
                    task = task,
                    priority = false,
                    onToggle = { vm.toggle(task) },
                    onToggleSub = { vm.toggleSubtask(task, it) },
                    onOpen = { app.show(Sheet.TaskEditor(task, task.date)) },
                    onStar = { vm.togglePriority(task, onFull) },
                )
            }
        }

        if (ui.habits.isNotEmpty()) {
            item(key = "habits") {
                Column {
                    SectionLabel(s.habits, Modifier.padding(horizontal = 16.dp)) {
                        val sched = ui.habits.filter { it.scheduledToday }
                        Text(s.habitsProgress(sched.count { it.completedToday }, sched.size), style = Sumire.type.small(), color = Sumire.colors.inkMuted)
                    }
                    LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(ui.habits, key = { it.habit.id }) { h -> HabitPill(h) { vm.toggleHabit(h) } }
                    }
                }
            }
        }

        item(key = "mood") { MoodCard(ui, onSave = vm::saveNote) }

        if (ui.isToday && Time.now().hour >= 18) {
            item(key = "review") {
                NeoCard(
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    color = Sumire.colors.indigoSoft,
                    onClick = { app.show(Sheet.EveningReview) },
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.NightsStay, null, tint = Sumire.colors.indigo, modifier = Modifier.size(28.dp))
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(s.eveningReview, style = Sumire.type.section(), color = Sumire.colors.ink)
                            Text(s.eveningReviewHint, style = Sumire.type.small(), color = Sumire.colors.inkMuted)
                        }
                        Icon(Icons.Rounded.ChevronRight, null, tint = Sumire.colors.ink)
                    }
                }
            }
        }
        item(key = "bottom") { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun WeekStrip(selected: LocalDate, active: Set<String>, onSelect: (LocalDate) -> Unit, onShift: (Int) -> Unit) {
    val c = Sumire.colors
    val today = Time.today()
    val start = selected.startOfWeek()
    val s = S
    Column(Modifier.padding(horizontal = 16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(s.dayLabel(selected, today), style = Sumire.type.hero(), color = c.ink)
                Text(s.dateLong(selected), style = Sumire.type.small(), color = c.inkMuted)
            }
            NeoIconButton(Icons.Rounded.ChevronLeft, null, { onShift(-7) }, size = 34.dp)
            Spacer(Modifier.width(6.dp))
            if (selected != today) {
                NeoIconButton(Icons.Rounded.CalendarMonth, s.today, { onSelect(today) }, size = 34.dp, color = c.matchaSoft)
                Spacer(Modifier.width(6.dp))
            }
            NeoIconButton(Icons.Rounded.ChevronRight, null, { onShift(7) }, size = 34.dp)
        }
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            for (i in 0 until 7) {
                val d = start.plusDays(i)
                val isSel = d == selected
                val isToday = d == today
                val bg by animateColorAsState(if (isSel) c.ink else if (isToday) c.matchaSoft else c.card)
                val fg = if (isSel) c.canvas else c.ink
                Column(
                    Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(14.dp))
                        .background(bg)
                        .border(1.5.dp, c.line.copy(alpha = if (isSel || isToday) 1f else 0.25f), RoundedCornerShape(14.dp))
                        .clickable { onSelect(d) }
                        .padding(vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(s.weekdaysShort[d.dayOfWeek.isoDayNumber - 1], style = Sumire.type.label().copy(fontSize = 10.sp), color = fg.copy(alpha = 0.7f))
                    Text(d.day.toString(), style = Sumire.type.number(16), color = fg)
                    Spacer(Modifier.height(3.dp))
                    Box(
                        Modifier.size(5.dp).clip(CircleShape)
                            .background(if (d.toString() in active) (if (isSel) c.ochre else c.matcha) else Color.Transparent),
                    )
                }
            }
        }
    }
}

@Composable
private fun DaySummaryCard(ui: TodayUi) {
    val c = Sumire.colors
    val s = S
    val o = ui.overview
    NeoCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp), color = c.card) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            ProgressRing(o.score / 100f, Modifier.size(84.dp), stroke = 9.dp) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("${o.score}", style = Sumire.type.number(24), color = c.ink)
                    Text("%", style = Sumire.type.small().copy(fontSize = 10.sp), color = c.inkMuted)
                }
            }
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(s.dayScore.uppercase(), style = Sumire.type.label(), color = c.inkMuted)
                SummaryRow(Icons.Rounded.Star, c.ochre, "${o.completedPriority}/${o.totalPriority.coerceAtLeast(3)}", s.top3)
                SummaryRow(Icons.Rounded.Timer, c.indigo, o.focusMinutes.minutesLabel(s.hoursShort, s.minutesShort), s.focusToday)
                SummaryRow(Icons.Rounded.LocalFireDepartment, c.terracotta, "${ui.streak.current} ${s.streakDays}", s.streak)
            }
        }
    }
}

@Composable
private fun SummaryRow(icon: androidx.compose.ui.graphics.vector.ImageVector, tint: Color, value: String, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(value, style = Sumire.type.bodyStrong(), color = Sumire.colors.ink)
        Spacer(Modifier.width(6.dp))
        Text(label, style = Sumire.type.small(), color = Sumire.colors.inkMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SwipeableTask(task: Task, onDelete: (Task) -> Unit, onTomorrow: (Task) -> Unit, content: @Composable () -> Unit) {
    val c = Sumire.colors
    val state = rememberSwipeToDismissBoxState(
        confirmValueChange = { v ->
            when (v) {
                SwipeToDismissBoxValue.EndToStart -> { onDelete(task); true }
                SwipeToDismissBoxValue.StartToEnd -> { onTomorrow(task); true }
                SwipeToDismissBoxValue.Settled -> false
            }
        },
        positionalThreshold = { it * 0.35f },
    )
    SwipeToDismissBox(
        state = state,
        modifier = Modifier.padding(horizontal = 16.dp),
        backgroundContent = {
            val dir = state.dismissDirection
            val bg = if (dir == SwipeToDismissBoxValue.EndToStart) c.terracotta else c.indigo
            Row(
                Modifier.fillMaxWidth().height(64.dp).clip(RoundedCornerShape(20.dp)).background(bg).padding(horizontal = 20.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = if (dir == SwipeToDismissBoxValue.EndToStart) Arrangement.End else Arrangement.Start,
            ) {
                Icon(if (dir == SwipeToDismissBoxValue.EndToStart) Icons.Rounded.DeleteOutline else Icons.Rounded.ArrowForward, null, tint = c.onAccent)
                Spacer(Modifier.width(8.dp))
                Text(if (dir == SwipeToDismissBoxValue.EndToStart) S.delete else S.moveToTomorrow, color = c.onAccent, style = Sumire.type.bodyStrong())
            }
        },
    ) { content() }
}

@Composable
fun TaskCard(
    task: Task,
    priority: Boolean,
    onToggle: () -> Unit,
    onToggleSub: (String) -> Unit,
    onOpen: () -> Unit,
    onStar: () -> Unit,
) {
    val c = Sumire.colors
    val s = S
    val alpha by animateFloatAsState(if (task.isCompleted) 0.55f else 1f)
    NeoCard(
        Modifier.fillMaxWidth().animateContentSize(spring(stiffness = 400f)),
        color = if (priority) c.card else c.surface,
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
        onClick = onOpen,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            NeoCheckbox(task.isCompleted, onToggle, color = if (priority) c.matcha else c.indigo)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f).graphicsLayer { this.alpha = alpha }) {
                Text(
                    task.title,
                    style = Sumire.type.bodyStrong().copy(textDecoration = if (task.isCompleted) TextDecoration.LineThrough else null),
                    color = c.ink,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    NeoBadge(s.categoryName(task.category), categoryColor(task.category))
                    Icon(Icons.Rounded.Schedule, null, tint = c.inkMuted, modifier = Modifier.size(13.dp))
                    Text(task.estimatedMinutes.minutesLabel(s.hoursShort, s.minutesShort), style = Sumire.type.small(), color = c.inkMuted)
                    if (task.isRecurring || task.id.contains('@')) Icon(Icons.Rounded.Repeat, null, tint = c.inkMuted, modifier = Modifier.size(13.dp))
                    if (task.subtasks.isNotEmpty()) {
                        Text("· ${task.subtasks.count { it.isCompleted }}/${task.subtasks.size}", style = Sumire.type.small(), color = c.inkMuted)
                    }
                }
            }
            Icon(
                if (task.isPriority) Icons.Rounded.Star else Icons.Rounded.StarBorder,
                s.makePriority,
                tint = if (task.isPriority) c.ochre else c.inkMuted.copy(alpha = 0.6f),
                modifier = Modifier.size(26.dp).clip(CircleShape).clickable(onClick = onStar).padding(2.dp),
            )
        }
        if (task.subtasks.isNotEmpty() && !task.isCompleted) {
            Spacer(Modifier.height(8.dp))
            task.subtasks.forEach { sub ->
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).clickable { onToggleSub(sub.id) }.padding(start = 38.dp, top = 4.dp, bottom = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        Modifier.size(16.dp).clip(RoundedCornerShape(5.dp))
                            .background(if (sub.isCompleted) c.matcha else c.card)
                            .border(1.5.dp, c.line, RoundedCornerShape(5.dp)),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        sub.title,
                        style = Sumire.type.small().copy(textDecoration = if (sub.isCompleted) TextDecoration.LineThrough else null),
                        color = if (sub.isCompleted) c.inkMuted else c.ink,
                    )
                }
            }
        }
    }
}

@Composable
fun categoryColor(cat: TaskCategory): Color {
    val c = Sumire.colors
    return when (cat) {
        TaskCategory.GENERAL -> c.sand
        TaskCategory.CODE -> c.violetSoft
        TaskCategory.DESIGN -> c.plumSoft
        TaskCategory.HEALTH -> c.matchaSoft
        TaskCategory.LEARN -> c.indigoSoft
        TaskCategory.ADMIN -> c.ochreSoft
    }
}

@Composable
private fun EmptySlot(index: Int, onClick: () -> Unit) {
    val c = Sumire.colors
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .clip(RoundedCornerShape(20.dp))
            .border(1.5.dp, c.line.copy(alpha = 0.35f), RoundedCornerShape(20.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("$index", style = Sumire.type.number(18), color = c.inkMuted.copy(alpha = 0.6f))
        Spacer(Modifier.width(14.dp))
        Text(S.emptyPrioritySlot, style = Sumire.type.body(), color = c.inkMuted, modifier = Modifier.weight(1f))
        Icon(Icons.Rounded.Add, null, tint = c.inkMuted)
    }
}

/** Inline "type and press enter" task creation – the fastest path for the most frequent action. */
@Composable
private fun QuickAdd(onAdd: (String) -> Unit) {
    var text by remember { mutableStateOf("") }
    val submit = {
        if (text.isNotBlank()) {
            onAdd(text.trim())
            text = ""
        }
    }
    NeoTextField(
        text, { text = it },
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        placeholder = S.taskTitleHint,
        imeAction = androidx.compose.ui.text.input.ImeAction.Done,
        onImeAction = submit,
        leading = { Icon(Icons.Rounded.Add, null, tint = Sumire.colors.inkMuted) },
        trailing = if (text.isNotBlank()) {
            { Icon(Icons.Rounded.ArrowForward, S.add, tint = Sumire.colors.matcha, modifier = Modifier.clickable(onClick = submit)) }
        } else null,
    )
}

@Composable
fun HabitPill(h: HabitStats, onToggle: () -> Unit) {
    val c = Sumire.colors
    val color = parseHexColor(h.habit.color)
    val done = h.completedToday
    val bg by animateColorAsState(if (done) color else c.card)
    val scale by animateFloatAsState(if (done) 1f else 0.96f, spring(dampingRatio = 0.4f, stiffness = 500f))
    NeoCard(
        Modifier.width(132.dp).graphicsLayer { scaleX = scale; scaleY = scale; alpha = if (h.scheduledToday || done) 1f else 0.55f },
        color = bg,
        contentPadding = PaddingValues(12.dp),
        onClick = onToggle,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            HabitIcon(h.habit.icon, if (done) c.onAccent else c.ink, Modifier.size(20.dp))
            Spacer(Modifier.weight(1f))
            Icon(Icons.Rounded.LocalFireDepartment, null, tint = if (done) c.onAccent else c.terracotta, modifier = Modifier.size(16.dp))
            Text("${h.currentStreak}", style = Sumire.type.number(14), color = if (done) c.onAccent else c.ink)
        }
        Spacer(Modifier.height(10.dp))
        Text(
            h.habit.title,
            style = Sumire.type.small().copy(fontWeight = FontWeight.Bold),
            color = if (done) c.onAccent else c.ink,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            minLines = 2,
        )
    }
}

private val moods = listOf("😫", "😕", "😐", "🙂", "🤩")

@Composable
private fun MoodCard(ui: TodayUi, onSave: (Int, String) -> Unit) {
    val c = Sumire.colors
    var text by remember(ui.date) { mutableStateOf(ui.note?.note ?: "") }
    var mood by remember(ui.date) { mutableStateOf(ui.note?.mood ?: 0) }
    LaunchedEffect(ui.note?.date) {
        if (ui.note != null) {
            if (text.isEmpty()) text = ui.note.note
            if (mood == 0) mood = ui.note.mood
        }
    }
    // Debounced autosave
    LaunchedEffect(text, mood) {
        if (text == (ui.note?.note ?: "") && mood == (ui.note?.mood ?: 0)) return@LaunchedEffect
        delay(600)
        onSave(mood, text)
    }
    NeoCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
        Text(S.moodQuestion, style = Sumire.type.section(), color = c.ink)
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            moods.forEachIndexed { i, e ->
                val sel = mood == i + 1
                val sc by animateFloatAsState(if (sel) 1.25f else 1f, spring(dampingRatio = 0.4f))
                Box(
                    Modifier
                        .size(46.dp)
                        .graphicsLayer { scaleX = sc; scaleY = sc }
                        .clip(CircleShape)
                        .background(if (sel) c.ochreSoft else Color.Transparent)
                        .border(if (sel) 1.5.dp else 0.dp, if (sel) c.line else Color.Transparent, CircleShape)
                        .clickable { mood = if (sel) 0 else i + 1 },
                    contentAlignment = Alignment.Center,
                ) { Text(e, fontSize = 24.sp) }
            }
        }
        Spacer(Modifier.height(12.dp))
        NeoTextField(text, { text = it }, placeholder = S.dayNoteHint, singleLine = false, minLines = 2)
    }
}

@Composable
fun AnimatedSection(visible: Boolean, content: @Composable () -> Unit) {
    AnimatedVisibility(visible, enter = fadeIn() + expandVertically(), exit = fadeOut() + shrinkVertically()) { content() }
}
