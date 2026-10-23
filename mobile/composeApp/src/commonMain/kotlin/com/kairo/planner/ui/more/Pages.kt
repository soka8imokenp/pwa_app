package com.kairo.planner.ui.more

import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ArrowForward
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.DeleteSweep
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kairo.planner.core.Time
import com.kairo.planner.core.days
import com.kairo.planner.core.key
import com.kairo.planner.core.minusDays
import com.kairo.planner.core.newId
import com.kairo.planner.core.startOfWeek
import com.kairo.planner.data.AppSettings
import com.kairo.planner.data.HealthSync
import com.kairo.planner.data.PlannerRepository
import com.kairo.planner.domain.planner.Streaks
import com.kairo.planner.i18n.S
import com.kairo.planner.model.LinkItem
import com.kairo.planner.platform.HealthConnectStatus
import com.kairo.planner.platform.HealthPlatform
import com.kairo.planner.platform.LocalPlatform
import com.kairo.planner.ui.LocalAppState
import com.kairo.planner.ui.Sheet
import com.kairo.planner.ui.components.EmojiBubble
import com.kairo.planner.ui.components.EmptyState
import com.kairo.planner.ui.components.FieldLabel
import com.kairo.planner.ui.components.Gap
import com.kairo.planner.ui.components.NeoButton
import com.kairo.planner.ui.components.NeoButtonStyle
import com.kairo.planner.ui.components.NeoCard
import com.kairo.planner.ui.components.NeoIconButton
import com.kairo.planner.ui.components.NeoTextField
import com.kairo.planner.ui.components.StatTile
import com.kairo.planner.ui.components.SumireSheet
import com.kairo.planner.ui.components.SwipeToDelete
import com.kairo.planner.ui.dateShort
import com.kairo.planner.ui.planner.TaskCard
import com.kairo.planner.ui.theme.Sumire
import com.kairo.planner.ui.theme.parseHexColor
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

@Composable
fun BacklogPage(onBack: () -> Unit) {
    val repo = koinInject<PlannerRepository>()
    val app = LocalAppState.current
    val scope = rememberCoroutineScope()
    val tasks by remember { repo.backlog() }.collectAsState(emptyList())
    val s = S
    PageScaffold(s.backlog, onBack, actions = {
        NeoIconButton(Icons.Rounded.Add, s.addTask, { app.show(Sheet.TaskEditor(null, Time.todayKey())) })
    }) {
        if (tasks.isEmpty()) EmptyState("📦", s.backlog, s.noTasksSubtitle)
        LazyColumn(contentPadding = PaddingValues(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            tasks.groupBy { it.date }.entries.sortedByDescending { it.key }.forEach { (date, list) ->
                item(key = "d-$date") {
                    Text(s.dateShort(date), style = Sumire.type.label(), color = Sumire.colors.inkMuted, modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp))
                }
                items(list, key = { it.id }) { t ->
                    SwipeToDelete(onDelete = { scope.launch { repo.deleteTask(t) } }) {
                        Column {
                            TaskCard(
                                t, priority = false,
                                onToggle = { scope.launch { repo.setCompleted(t, !t.isCompleted) } },
                                onToggleSub = { id -> scope.launch { repo.toggleSubtask(t, id) } },
                                onOpen = { app.show(Sheet.TaskEditor(t, t.date)) },
                                onStar = { scope.launch { repo.moveTo(t, Time.todayKey()); repo.setPriority(t.copy(date = Time.todayKey()), true) } },
                            )
                            if (t.date != Time.todayKey()) {
                                Row(Modifier.padding(top = 6.dp)) {
                                    NeoButton(s.moveToToday, { scope.launch { repo.moveTo(t, Time.todayKey()) } }, compact = true, style = NeoButtonStyle.SECONDARY, icon = Icons.Rounded.ArrowForward)
                                }
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

@Composable
fun StatsPage(onBack: () -> Unit) {
    val repo = koinInject<PlannerRepository>()
    val today = Time.today()
    val from30 = today.minusDays(29)
    val tasks by remember { repo.tasksBetween(from30.key(), today.key()) }.collectAsState(emptyList())
    val focus by remember { repo.focusBetween(from30.key(), today.key()) }.collectAsState(emptyList())
    val logs by remember { repo.habitLogsSince(from30.key()) }.collectAsState(emptyList())
    val active by remember { repo.activeDates() }.collectAsState(emptySet())
    val s = S
    val c = Sumire.colors
    val streak = Streaks.overall(active, today)
    val days7 = (today.minusDays(6)..today).days().map { it.key() }
    PageScaffold(s.stats, onBack) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile(s.streak, "${streak.current}", s.streakDays, Modifier.weight(1f), color = c.terracottaSoft)
                StatTile(s.longestStreak, "${streak.longest}", s.streakDays, Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile(s.tasksDone, "${tasks.count { it.isCompleted && it.date in days7 }}", "", Modifier.weight(1f), sub = s.last7days)
                StatTile(s.focusMinutes, "${focus.filter { it.date in days7 }.sumOf { it.durationMinutes }}", s.minutesShort, Modifier.weight(1f), sub = s.last7days)
                StatTile(s.habitsDone, "${logs.count { it.completed && it.date in days7 }}", "", Modifier.weight(1f), sub = s.last7days)
            }
            NeoCard(Modifier.fillMaxWidth()) {
                Text(s.last7days.uppercase(), style = Sumire.type.label(), color = c.inkMuted)
                Gap(10)
                val values = days7.map { d -> tasks.count { it.isCompleted && it.date == d } to focus.filter { it.date == d }.sumOf { it.durationMinutes } }
                val maxT = (values.maxOfOrNull { it.first } ?: 1).coerceAtLeast(1)
                Canvas(Modifier.fillMaxWidth().height(120.dp)) {
                    val slot = size.width / 7
                    values.forEachIndexed { i, (t, _) ->
                        val h = size.height * t / maxT
                        drawRoundRect(c.matcha, Offset(slot * i + slot * 0.2f, size.height - h), Size(slot * 0.6f, h.coerceAtLeast(2f)), CornerRadius(6.dp.toPx()))
                    }
                }
                Row {
                    days7.forEach { d ->
                        val idx = kotlinx.datetime.LocalDate.parse(d).dayOfWeek.ordinal
                        Text(s.weekdaysShort[idx], style = Sumire.type.small().copy(fontSize = 10.sp), color = c.inkMuted, modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    }
                }
            }
            NeoCard(Modifier.fillMaxWidth()) {
                Text(s.activityHeatmap.uppercase(), style = Sumire.type.label(), color = c.inkMuted)
                Gap(10)
                Heatmap(active)
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun Heatmap(active: Set<String>, weeks: Int = 16) {
    val c = Sumire.colors
    val today = Time.today()
    val start = today.startOfWeek().minusDays((weeks - 1) * 7)
    Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
        for (w in 0 until weeks) {
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                for (d in 0 until 7) {
                    val day = start.minusDays(-(w * 7 + d))
                    val on = day.key() in active
                    Box(
                        Modifier.size(14.dp).clip(RoundedCornerShape(3.dp))
                            .background(if (day > today) c.canvas else if (on) c.matcha else c.sand),
                    )
                }
            }
        }
    }
}

@Composable
fun LinksPage(onBack: () -> Unit) {
    val repo = koinInject<PlannerRepository>()
    val app = LocalAppState.current
    val platform = LocalPlatform.current
    val scope = rememberCoroutineScope()
    val links by remember { repo.links() }.collectAsState(emptyList())
    val s = S
    PageScaffold(s.links, onBack, actions = { NeoIconButton(Icons.Rounded.Add, s.addLink, { app.show(Sheet.LinkEditor()) }) }) {
        if (links.isEmpty()) EmptyState("🔗", s.links, s.noLinks)
        LazyColumn(contentPadding = PaddingValues(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(links, key = { it.id }) { l ->
                SwipeToDelete(onDelete = { scope.launch { repo.deleteLink(l.id) } }) {
                    NeoCard(Modifier.fillMaxWidth(), onClick = {
                        scope.launch { repo.clickLink(l.id) }
                        platform.openUrl(if (l.url.startsWith("http")) l.url else "https://${l.url}")
                    }, onLongClick = { app.show(Sheet.LinkEditor(l)) }, contentPadding = PaddingValues(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            EmojiBubble(l.icon, parseHexColor(l.iconBg))
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(l.title, style = Sumire.type.bodyStrong(), color = Sumire.colors.ink)
                                Text(l.url, style = Sumire.type.small(), color = Sumire.colors.inkMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                            Text("${l.clicks}", style = Sumire.type.number(13), color = Sumire.colors.inkMuted)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun LinkEditorSheet(initial: LinkItem?, onDismiss: () -> Unit) {
    val repo = koinInject<PlannerRepository>()
    val scope = rememberCoroutineScope()
    val s = S
    var title by remember { mutableStateOf(initial?.title ?: "") }
    var url by remember { mutableStateOf(initial?.url ?: "") }
    var icon by remember { mutableStateOf(initial?.icon ?: "🔗") }
    val bgs = listOf("#DDE8DE", "#FBECCF", "#DEE8EF", "#F7E3DC", "#F9E2E5", "#EDE5F7")
    var bg by remember { mutableStateOf(initial?.iconBg ?: bgs.first()) }
    SumireSheet(if (initial == null) s.addLink else s.edit, onDismiss) { close ->
        FieldLabel(s.linkTitle)
        NeoTextField(title, { title = it }, placeholder = "YouTube")
        FieldLabel(s.linkUrl)
        NeoTextField(url, { url = it.trim() }, placeholder = "https://", keyboardType = androidx.compose.ui.text.input.KeyboardType.Uri)
        FieldLabel(s.icon)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("🔗", "▶️", "🎵", "💻", "📚", "☕", "📰", "🛒", "💬", "📅", "🎨", "⭐").forEach { e ->
                Box(Modifier.clip(RoundedCornerShape(10.dp)).then(if (e == icon) Modifier.background(Sumire.colors.matchaSoft) else Modifier)) {
                    Text(e, fontSize = 22.sp, modifier = Modifier.clickableNoRipple { icon = e }.padding(6.dp))
                }
            }
        }
        FieldLabel(s.color)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            bgs.forEach { hex ->
                Box(Modifier.size(if (hex == bg) 34.dp else 28.dp).clip(RoundedCornerShape(50)).background(parseHexColor(hex)).clickableNoRipple { bg = hex })
            }
        }
        Gap(20)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            if (initial != null) NeoButton(s.delete, { scope.launch { repo.deleteLink(initial.id); close() } }, style = NeoButtonStyle.DANGER, icon = Icons.Rounded.DeleteOutline)
            NeoButton(s.save, {
                scope.launch {
                    val now = Time.nowMs()
                    repo.saveLink(
                        LinkItem(initial?.id ?: newId(), title.trim(), url, icon, bg, initial?.category ?: "general", initial?.clicks ?: 0, initial?.createdAt ?: now, now),
                    )
                    close()
                }
            }, Modifier.weight(1f), enabled = title.isNotBlank() && url.isNotBlank())
        }
    }
}

private fun Modifier.clickableNoRipple(onClick: () -> Unit) = this.clickable(onClick = onClick)

@Composable
fun ActivityLogPage(onBack: () -> Unit) {
    val repo = koinInject<PlannerRepository>()
    val scope = rememberCoroutineScope()
    val entries by remember { repo.recentActivity() }.collectAsState(emptyList())
    val s = S
    val c = Sumire.colors
    PageScaffold(s.activityLog, onBack, actions = {
        if (entries.isNotEmpty()) NeoIconButton(Icons.Rounded.DeleteSweep, s.clearLog, { scope.launch { repo.clearActivity() } })
    }) {
        if (entries.isEmpty()) EmptyState("🗂", s.activityLog, s.noActivity)
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(entries, key = { it.id }) { e ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        when (e.action) {
                            "completed" -> "✅"; "created" -> "➕"; "deleted" -> "🗑"; "focus" -> "⏱"; "weight" -> "⚖️"
                            "habit" -> "🔥"; "meal" -> "🍽"; "water" -> "💧"; "workout" -> "🏃"; "promoted" -> "⭐"; else -> "•"
                        },
                        fontSize = 18.sp,
                    )
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(e.title, style = Sumire.type.body(), color = c.ink, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        if (e.details.isNotEmpty()) Text(e.details, style = Sumire.type.small(), color = c.inkMuted)
                    }
                    Text("${s.dateShort(e.date)} ${Time.hhmm(e.ts)}", style = Sumire.type.small(), color = c.inkMuted)
                }
            }
        }
    }
}

@Composable
fun HealthConnectPage(onBack: () -> Unit) {
    val hp = koinInject<HealthPlatform>()
    val sync = koinInject<HealthSync>()
    val settings = koinInject<AppSettings>()
    val platform = LocalPlatform.current
    val scope = rememberCoroutineScope()
    val s = S
    val c = Sumire.colors
    var status by remember { mutableStateOf(hp.status()) }
    var granted by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    val write by settings.healthConnectWrite.collectAsState()
    androidx.compose.runtime.LaunchedEffect(Unit) { granted = hp.hasPermissions() }
    PageScaffold(s.healthConnect, onBack) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            NeoCard(Modifier.fillMaxWidth(), color = c.plumSoft) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Favorite, null, tint = c.plum, modifier = Modifier.size(28.dp))
                    Spacer(Modifier.width(12.dp))
                    Text(if (granted) s.healthConnectConnected else s.healthConnect, style = Sumire.type.section(), color = c.ink)
                }
                Gap(8)
                Text(s.healthConnectHint, style = Sumire.type.small(), color = c.inkMuted)
                Gap(12)
                when (status) {
                    HealthConnectStatus.NOT_INSTALLED, HealthConnectStatus.NEEDS_UPDATE ->
                        NeoButton(s.healthConnectInstall, { hp.openInstall() }, Modifier.fillMaxWidth())
                    HealthConnectStatus.UNSUPPORTED -> Text("—", color = c.inkMuted)
                    HealthConnectStatus.AVAILABLE -> if (!granted) {
                        NeoButton(s.healthConnectConnect, {
                            scope.launch {
                                granted = platform.request(com.kairo.planner.platform.AppPermission.HEALTH_CONNECT)
                                status = hp.status()
                            }
                        }, Modifier.fillMaxWidth())
                    } else {
                        NeoButton(s.importFromHealthConnect, {
                            busy = true
                            scope.launch {
                                val n = sync.importFromHealthConnect(full = true)
                                sync.refreshSteps()
                                busy = false
                                platform.toast(s.importedWeights(n))
                            }
                        }, Modifier.fillMaxWidth(), icon = Icons.Rounded.Download, enabled = !busy)
                        Gap(8)
                        NeoButton(s.openSettings, { hp.openSettings() }, Modifier.fillMaxWidth(), style = NeoButtonStyle.SECONDARY)
                    }
                }
            }
            NeoCard(Modifier.fillMaxWidth()) { ToggleRow(s.writeToHealthConnect, write) { settings.setHealthConnectWrite(it) } }
            NeoCard(Modifier.fillMaxWidth()) {
                Text(s.connectScale.uppercase(), style = Sumire.type.label(), color = c.inkMuted)
                Gap(6)
                Text(s.scaleSupported, style = Sumire.type.small(), color = c.ink)
            }
        }
    }
}

@Composable
fun AboutPage(onBack: () -> Unit) {
    val platform = LocalPlatform.current
    val s = S
    val c = Sumire.colors
    PageScaffold(s.about, onBack) {
        Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            NeoCard(Modifier.fillMaxWidth()) {
                Text(s.appName, style = Sumire.type.title(), color = c.ink)
                Text("${s.version} ${platform.appVersion} · ${platform.platformName}", style = Sumire.type.small(), color = c.inkMuted)
                Gap(10)
                Text(s.privacy, style = Sumire.type.body(), color = c.ink)
            }
            NeoCard(Modifier.fillMaxWidth()) {
                Text("Open source", style = Sumire.type.label(), color = c.inkMuted)
                Gap(6)
                Text(
                    "Kotlin Multiplatform · Compose Multiplatform · SQLDelight · Ktor · Koin · Kable · kotlinx-datetime · Health Connect\n" +
                        "Fonts: Space Grotesk, Plus Jakarta Sans, JetBrains Mono (SIL Open Font License 1.1)",
                    style = Sumire.type.small(), color = c.ink,
                )
            }
        }
    }
}
