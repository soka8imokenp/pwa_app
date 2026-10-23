package com.kairo.planner.ui.planner

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.StarBorder
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kairo.planner.core.ALL_DAY_CODES
import com.kairo.planner.core.Time
import com.kairo.planner.core.key
import com.kairo.planner.core.minutesLabel
import com.kairo.planner.core.newId
import com.kairo.planner.core.plusDays
import com.kairo.planner.data.PlannerRepository
import com.kairo.planner.i18n.S
import com.kairo.planner.model.SubTask
import com.kairo.planner.model.Task
import com.kairo.planner.model.TaskCategory
import com.kairo.planner.platform.LocalPlatform
import com.kairo.planner.platform.UiSound
import com.kairo.planner.ui.LocalSnackbar
import com.kairo.planner.ui.components.FieldLabel
import com.kairo.planner.ui.components.Gap
import com.kairo.planner.ui.components.Haptic
import com.kairo.planner.ui.components.NeoButton
import com.kairo.planner.ui.components.NeoButtonStyle
import com.kairo.planner.ui.components.NeoCard
import com.kairo.planner.ui.components.NeoCheckbox
import com.kairo.planner.ui.components.NeoChip
import com.kairo.planner.ui.components.NeoTextField
import com.kairo.planner.ui.components.SumireSheet
import com.kairo.planner.ui.dateShort
import com.kairo.planner.ui.theme.Sumire
import kotlinx.coroutines.launch
import kotlinx.datetime.LocalDate
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel

private val ESTIMATES = listOf(15, 25, 45, 60, 90, 120)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TaskEditorSheet(initial: Task?, date: String, priority: Boolean, onDismiss: () -> Unit) {
    val repo = koinInject<PlannerRepository>()
    val scope = rememberCoroutineScope()
    val snackbar = LocalSnackbar.current
    val platform = LocalPlatform.current
    val s = S
    var title by remember { mutableStateOf(initial?.title ?: "") }
    var notes by remember { mutableStateOf(initial?.notes ?: "") }
    var category by remember { mutableStateOf(initial?.category ?: TaskCategory.GENERAL) }
    var estimate by remember { mutableStateOf(initial?.estimatedMinutes ?: 30) }
    var isPriority by remember { mutableStateOf(initial?.isPriority ?: priority) }
    var day by remember { mutableStateOf(LocalDate.parse(initial?.date ?: date)) }
    val repeatDays = remember { mutableStateListOf<String>().apply { addAll(initial?.recurringDays ?: emptyList()) } }
    val subtasks = remember { mutableStateListOf<SubTask>().apply { addAll(initial?.subtasks ?: emptyList()) } }
    var newSub by remember { mutableStateOf("") }
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) { if (initial == null) runCatching { focus.requestFocus() } }

    SumireSheet(if (initial == null) s.addTask else s.edit, onDismiss) { close ->
        fun save() {
            if (title.isBlank()) return
            scope.launch {
                if (initial == null) {
                    val created = repo.addTask(
                        title = title, date = day.key(), isPriority = isPriority, category = category,
                        estimatedMinutes = estimate, subtasks = subtasks.map { it.title }, notes = notes, recurringDays = repeatDays.toList(),
                    )
                    if (isPriority && !created.isPriority) snackbar.showSnackbar(s.prioritiesFull)
                } else {
                    val updated = initial.copy(
                        title = title.trim(), notes = notes, category = category, estimatedMinutes = estimate,
                        subtasks = subtasks.toList(), recurringDays = repeatDays.toList(),
                    )
                    repo.saveTask(updated)
                    if (updated.date != day.key()) repo.moveTo(updated, day.key())
                    if (isPriority != initial.isPriority && !repo.setPriority(repo.task(initial.id) ?: updated, isPriority)) {
                        snackbar.showSnackbar(s.prioritiesFull)
                    }
                }
                platform.sound(UiSound.SUCCESS)
                close()
            }
        }

        NeoTextField(
            title, { title = it },
            placeholder = s.taskTitleHint,
            modifier = Modifier.fillMaxWidth().focusRequester(focus),
            textStyle = Sumire.type.section(),
            imeAction = ImeAction.Done,
            onImeAction = { save() },
        )
        Gap(10)
        NeoCard(
            Modifier.fillMaxWidth(),
            color = if (isPriority) Sumire.colors.ochreSoft else Sumire.colors.card,
            contentPadding = androidx.compose.foundation.layout.PaddingValues(14.dp),
            onClick = { isPriority = !isPriority },
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(if (isPriority) Icons.Rounded.Star else Icons.Rounded.StarBorder, null, tint = Sumire.colors.ochre)
                Spacer(Modifier.width(10.dp))
                Column1(s.makePriority, s.top3Hint)
            }
        }

        FieldLabel(s.category)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            TaskCategory.entries.forEach { cat ->
                NeoChip(s.categoryName(cat), category == cat, { category = cat }, color = categoryColor(cat))
            }
        }

        FieldLabel(s.estimate)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            ESTIMATES.forEach { m -> NeoChip(m.minutesLabel(s.hoursShort, s.minutesShort), estimate == m, { estimate = m }) }
        }

        FieldLabel(s.today + " / " + s.tomorrow)
        val today = Time.today()
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            NeoChip(s.today, day == today, { day = today })
            NeoChip(s.tomorrow, day == today.plusDays(1), { day = today.plusDays(1) })
            for (i in 2..6) {
                val d = today.plusDays(i)
                NeoChip(s.weekdayShort(d.dayOfWeek.ordinal + 1) + " " + s.dateShort(d), day == d, { day = d })
            }
            if (day < today) NeoChip(s.dateShort(day), true, {})
        }

        FieldLabel(s.subtasks)
        subtasks.forEachIndexed { i, sub ->
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
                NeoCheckbox(sub.isCompleted, { subtasks[i] = sub.copy(isCompleted = !sub.isCompleted) }, size = 22.dp)
                Spacer(Modifier.width(10.dp))
                Text(
                    sub.title,
                    style = Sumire.type.body().copy(textDecoration = if (sub.isCompleted) TextDecoration.LineThrough else null),
                    color = Sumire.colors.ink,
                    modifier = Modifier.weight(1f),
                )
                Icon(Icons.Rounded.Close, s.delete, tint = Sumire.colors.inkMuted, modifier = Modifier.size(20.dp).clickable { subtasks.removeAt(i) })
            }
        }
        NeoTextField(
            newSub, { newSub = it },
            placeholder = s.addSubtask,
            imeAction = ImeAction.Next,
            onImeAction = {
                if (newSub.isNotBlank()) { subtasks += SubTask(newId(), newSub.trim()); newSub = "" }
            },
            trailing = {
                Icon(Icons.Rounded.Add, s.add, tint = Sumire.colors.matcha, modifier = Modifier.clickable {
                    if (newSub.isNotBlank()) { subtasks += SubTask(newId(), newSub.trim()); newSub = "" }
                })
            },
        )

        FieldLabel(s.repeat)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            ALL_DAY_CODES.forEachIndexed { i, code ->
                NeoChip(s.weekdaysShort[i], code in repeatDays, {
                    if (code in repeatDays) repeatDays.remove(code) else repeatDays.add(code)
                })
            }
        }

        FieldLabel(s.notesHint)
        NeoTextField(notes, { notes = it }, placeholder = s.notesHint, singleLine = false, minLines = 2)

        Gap(20)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            if (initial != null) {
                NeoButton(s.delete, {
                    scope.launch {
                        repo.deleteTask(initial)
                        platform.haptic(Haptic.WARNING)
                        close()
                    }
                }, style = NeoButtonStyle.DANGER, icon = Icons.Rounded.DeleteOutline)
            }
            NeoButton(s.save, ::save, modifier = Modifier.weight(1f), enabled = title.isNotBlank())
        }
    }
}

@Composable
private fun Column1(title: String, sub: String) {
    androidx.compose.foundation.layout.Column {
        Text(title, style = Sumire.type.bodyStrong(), color = Sumire.colors.ink)
        Text(sub, style = Sumire.type.small(), color = Sumire.colors.inkMuted)
    }
}

@Composable
fun EveningReviewSheet(onDismiss: () -> Unit, vm: TodayViewModel = koinViewModel()) {
    val ui by vm.ui.collectAsStateWithLifecycle()
    val s = S
    val platform = LocalPlatform.current
    val all = ui.priorities + ui.tasks
    val done = all.filter { it.isCompleted }
    val open = all.filter { !it.isCompleted }
    SumireSheet(s.eveningReview, onDismiss) { close ->
        Text(s.completedToday.uppercase(), style = Sumire.type.label(), color = Sumire.colors.inkMuted)
        Gap(6)
        if (done.isEmpty()) Text("—", color = Sumire.colors.inkMuted)
        done.forEach { Text("✓  ${it.title}", style = Sumire.type.body(), color = Sumire.colors.matcha, modifier = Modifier.padding(vertical = 3.dp)) }
        Gap(14)
        Text(s.leftForTomorrow.uppercase(), style = Sumire.type.label(), color = Sumire.colors.inkMuted)
        Gap(6)
        if (open.isEmpty()) Text("—", color = Sumire.colors.inkMuted)
        open.forEach { t ->
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
                NeoCheckbox(false, { vm.toggle(t) }, size = 22.dp)
                Spacer(Modifier.width(10.dp))
                Text(t.title, style = Sumire.type.body(), color = Sumire.colors.ink)
            }
        }
        Gap(20)
        NeoButton(s.finishDay, {
            vm.closeDay(open)
            platform.sound(UiSound.COMPLETE)
            platform.haptic(Haptic.SUCCESS)
            platform.toast(s.dayClosed)
            close()
        }, modifier = Modifier.fillMaxWidth())
    }
}
