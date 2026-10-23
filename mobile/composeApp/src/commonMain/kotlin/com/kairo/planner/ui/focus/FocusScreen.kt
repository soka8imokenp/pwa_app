package com.kairo.planner.ui.focus

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Fullscreen
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.kairo.planner.core.Time
import com.kairo.planner.core.fmt
import com.kairo.planner.core.key
import com.kairo.planner.core.minusDays
import com.kairo.planner.core.minutesLabel
import com.kairo.planner.core.pad2
import com.kairo.planner.data.PlannerRepository
import com.kairo.planner.domain.planner.FocusController
import com.kairo.planner.domain.planner.FocusPhase
import com.kairo.planner.i18n.S
import com.kairo.planner.model.FocusMode
import com.kairo.planner.platform.LocalPlatform
import com.kairo.planner.ui.components.Gap
import com.kairo.planner.ui.components.NeoButton
import com.kairo.planner.ui.components.NeoButtonStyle
import com.kairo.planner.ui.components.NeoCard
import com.kairo.planner.ui.components.NeoChip
import com.kairo.planner.ui.components.NeoIconButton
import com.kairo.planner.ui.components.ProgressRing
import com.kairo.planner.ui.components.SectionLabel
import com.kairo.planner.ui.components.StatTile
import com.kairo.planner.ui.theme.Sumire
import org.koin.compose.koinInject

private fun clock(sec: Int): String {
    val h = sec / 3600
    val m = (sec % 3600) / 60
    val s = sec % 60
    return if (h > 0) "$h:${m.pad2()}:${s.pad2()}" else "${m.pad2()}:${s.pad2()}"
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FocusScreen(contentPadding: PaddingValues) {
    val controller = koinInject<FocusController>()
    val repo = koinInject<PlannerRepository>()
    val state by controller.state.collectAsState()
    val today = Time.today()
    val sessions by remember { repo.focusBetween(today.key(), today.key()) }.collectAsState(emptyList())
    val week by remember { repo.focusBetween(today.minusDays(6).key(), today.key()) }.collectAsState(emptyList())
    val tasks by remember { repo.tasksForDate(today.key()) }.collectAsState(emptyList())
    val s = S
    val c = Sumire.colors
    val platform = LocalPlatform.current
    var zen by remember { mutableStateOf(false) }

    LaunchedEffect(state.justFinishedMinutes) {
        state.justFinishedMinutes?.let {
            platform.toast(s.focusDoneBody(it))
            controller.consumeFinishedEvent()
        }
    }

    val isBreak = state.phase == FocusPhase.BREAK
    val ringColor = if (isBreak) c.indigo else c.matcha
    val display = if (state.mode == FocusMode.STOPWATCH) state.elapsedSec else state.remainingSec

    LazyColumn(contentPadding = contentPadding, verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Row(Modifier.padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(s.focus, style = Sumire.type.hero(), color = c.ink, modifier = Modifier.weight(1f))
                NeoIconButton(Icons.Rounded.Fullscreen, s.zenMode, { zen = true })
            }
        }
        item {
            Row(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FocusMode.entries.forEach { m ->
                    NeoChip(s.focusModeName(m), state.mode == m, { controller.setMode(m) })
                }
            }
        }
        item {
            NeoCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp), contentPadding = PaddingValues(20.dp)) {
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    val breathe = rememberInfiniteTransition()
                    val pulse by breathe.animateFloat(1f, 1.025f, infiniteRepeatable(tween(2000, easing = FastOutSlowInEasing), RepeatMode.Reverse))
                    ProgressRing(
                        progress = if (state.mode == FocusMode.STOPWATCH) (state.elapsedSec % 3600) / 3600f else state.progress,
                        modifier = Modifier.size(240.dp).graphicsLayer {
                            val p = if (state.running) pulse else 1f
                            scaleX = p; scaleY = p
                        },
                        color = ringColor,
                        stroke = 14.dp,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                if (isBreak) s.breakTime.uppercase() else s.focusModeName(state.mode).uppercase(),
                                style = Sumire.type.label(),
                                color = c.inkMuted,
                            )
                            Text(clock(display), style = Sumire.type.number(52), color = c.ink)
                            state.taskTitle?.let {
                                Text(it, style = Sumire.type.small(), color = c.inkMuted, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = 24.dp))
                            }
                        }
                    }
                }
                Gap(18)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (state.running) {
                        NeoButton(s.pause, controller::pause, Modifier.weight(1f), icon = Icons.Rounded.Pause, style = NeoButtonStyle.SECONDARY)
                    } else {
                        NeoButton(if (state.elapsedSec > 0) s.resume else s.start, controller::start, Modifier.weight(1f), icon = Icons.Rounded.PlayArrow)
                    }
                    if (state.elapsedSec > 0 || state.running) {
                        NeoIconButton(Icons.Rounded.Check, s.finish, controller::finish, size = 48.dp, color = c.matchaSoft)
                        NeoIconButton(Icons.Rounded.Refresh, s.reset, { controller.reset() }, size = 48.dp)
                    }
                }
                if (state.mode == FocusMode.POMODORO && !state.running && state.elapsedSec == 0 && !isBreak) {
                    Gap(14)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(15, 25, 45, 50, 60).forEach { m ->
                            NeoChip("$m ${s.minutesShort}", state.plannedSec == m * 60, { controller.setDuration(m) })
                        }
                    }
                }
                if (state.mode == FocusMode.DEEP_WORK && !state.running && state.elapsedSec == 0) {
                    Gap(14)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(60, 90, 120, 180).forEach { m ->
                            NeoChip(m.minutesLabel(s.hoursShort, s.minutesShort), state.plannedSec == m * 60, { controller.setDuration(m) })
                        }
                    }
                }
            }
        }
        item {
            SectionLabel(s.focusOn, Modifier.padding(horizontal = 16.dp))
            FlowRow(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                NeoChip(s.noTaskSelected, state.taskId == null, { controller.setTask(null, null) })
                tasks.filter { !it.isCompleted }.forEach { t ->
                    NeoChip(t.title.take(28), state.taskId == t.id, { controller.setTask(t.id, t.title) }, leading = if (t.isPriority) "★" else null)
                }
            }
        }
        item {
            Row(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile(s.focusToday, sessions.sumOf { it.durationMinutes }.toString(), s.minutesShort, Modifier.weight(1f))
                StatTile(s.sessionsToday, sessions.size.toString(), "", Modifier.weight(1f))
                StatTile(s.totalWeek, (week.sumOf { it.durationMinutes } / 60.0).fmt(1), s.hoursShort, Modifier.weight(1f))
            }
        }
        items(sessions, key = { it.id }) { f ->
            Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(Time.hhmm(f.completedAt), style = Sumire.type.number(13), color = c.inkMuted)
                Spacer(Modifier.width(12.dp))
                Text(f.taskTitle ?: s.focusModeName(f.mode), style = Sumire.type.body(), color = c.ink, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("${f.durationMinutes} ${s.minutesShort}", style = Sumire.type.bodyStrong(), color = c.matcha)
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }

    if (zen) {
        Dialog(onDismissRequest = { zen = false }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
            Box(
                Modifier.fillMaxSize().background(Color(0xFF151311)).clickable { if (state.running) controller.pause() else controller.start() },
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(clock(display), style = Sumire.type.number(88), color = Color(0xFFF2ECE3))
                    AnimatedVisibility(!state.running, enter = fadeIn(), exit = fadeOut()) {
                        Text(s.pause.uppercase(), style = Sumire.type.label().copy(fontSize = 14.sp), color = Color(0xFFA89F95))
                    }
                    state.taskTitle?.let { Text(it, style = Sumire.type.body(), color = Color(0xFFA89F95), modifier = Modifier.padding(top = 12.dp)) }
                }
                NeoIconButton(Icons.Rounded.Fullscreen, s.close, { zen = false }, Modifier.align(Alignment.TopEnd).padding(24.dp), color = Color(0xFF211E1B), tint = Color(0xFFF2ECE3))
            }
        }
    }
}
