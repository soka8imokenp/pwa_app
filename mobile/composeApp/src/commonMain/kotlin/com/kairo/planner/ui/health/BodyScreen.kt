package com.kairo.planner.ui.health

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Bluetooth
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.TrendingDown
import androidx.compose.material.icons.rounded.TrendingFlat
import androidx.compose.material.icons.rounded.TrendingUp
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kairo.planner.core.Time
import com.kairo.planner.core.fmt
import com.kairo.planner.core.signed
import com.kairo.planner.i18n.S
import com.kairo.planner.model.BodyComposition
import com.kairo.planner.model.MetricItem
import com.kairo.planner.model.MetricStatus
import com.kairo.planner.model.PaceKind
import com.kairo.planner.model.TrendPoint
import com.kairo.planner.model.WeightLog
import com.kairo.planner.ui.LocalAppState
import com.kairo.planner.ui.LocalSnackbar
import com.kairo.planner.ui.Page
import com.kairo.planner.ui.Sheet
import com.kairo.planner.ui.components.EmptyState
import com.kairo.planner.ui.components.Gap
import com.kairo.planner.ui.components.NeoBadge
import com.kairo.planner.ui.components.NeoButton
import com.kairo.planner.ui.components.NeoButtonStyle
import com.kairo.planner.ui.components.NeoCard
import com.kairo.planner.ui.components.ProgressRing
import com.kairo.planner.ui.components.SectionLabel
import com.kairo.planner.ui.dateShort
import com.kairo.planner.ui.components.SwipeToDelete
import com.kairo.planner.ui.showUndo
import com.kairo.planner.ui.theme.Sumire
import kotlinx.coroutines.launch
import org.koin.compose.viewmodel.koinViewModel

@Composable
fun BodyScreen(contentPadding: PaddingValues, vm: BodyViewModel = koinViewModel()) {
    val ui by vm.ui.collectAsStateWithLifecycle()
    val app = LocalAppState.current
    val s = S
    val c = Sumire.colors
    val snackbar = LocalSnackbar.current
    val scope = rememberCoroutineScope()
    var inspected by remember { mutableStateOf<TrendPoint?>(null) }

    LazyColumn(contentPadding = contentPadding, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Column(Modifier.padding(horizontal = 16.dp)) {
                Text(s.body, style = Sumire.type.hero(), color = c.ink)
                Gap(12)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    NeoButton(s.connectScale, { app.show(Sheet.Scale) }, Modifier.weight(1f), icon = Icons.Rounded.Bluetooth)
                    NeoButton(s.logWeight, { app.show(Sheet.LogWeight) }, Modifier.weight(1f), icon = Icons.Rounded.Add, style = NeoButtonStyle.SECONDARY)
                }
            }
        }

        if (!ui.profile.isComplete && ui.loaded) {
            item {
                NeoCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp), color = c.ochreSoft, onClick = { app.open(Page.PROFILE) }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.Info, null, tint = c.ochre)
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(s.profileIncomplete, style = Sumire.type.bodyStrong(), color = c.ink)
                            Text(s.profileIncompleteHint, style = Sumire.type.small(), color = c.inkMuted)
                        }
                        Icon(Icons.Rounded.ChevronRight, null, tint = c.ink)
                    }
                }
            }
        }

        val latest = ui.latest
        if (latest == null) {
            if (ui.loaded) item { EmptyState("⚖️", s.noWeightTitle, s.noWeightSubtitle) }
        } else {
            item { WeightHero(ui, inspected) }
            if (ui.trend.size >= 2) {
                item {
                    NeoCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp), contentPadding = PaddingValues(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(horizontal = 4.dp)) {
                            Text(s.trend.uppercase(), style = Sumire.type.label(), color = c.inkMuted, modifier = Modifier.weight(1f))
                            NeoBadge(s.paceLabel(ui.pace.kind), paceColor(ui.pace.kind))
                        }
                        Gap(8)
                        WeightChart(ui.trend.takeLast(60), ui.profile.targetWeight.takeIf { it > 0 }) { inspected = it }
                    }
                }
            }
            latest.composition?.let { comp ->
                item { BodyScoreCard(comp) }
                item {
                    SectionLabel(s.bodyComposition, Modifier.padding(horizontal = 16.dp)) {
                        if (!comp.fromImpedance) NeoBadge(s.estimateBadge, c.ochreSoft)
                    }
                    if (!comp.fromImpedance) {
                        Text(s.estimateHint, style = Sumire.type.small(), color = c.inkMuted, modifier = Modifier.padding(horizontal = 16.dp).padding(bottom = 8.dp))
                    }
                    MetricGrid(ui.items)
                }
            }
            item { SectionLabel(s.history, Modifier.padding(horizontal = 16.dp)) }
            items(ui.logs.take(30), key = { it.id }) { log ->
                SwipeToDelete(onDelete = {
                    vm.delete(log.id)
                    scope.launch { snackbar.showSnackbar("${s.deleted}: ${log.weight.fmt(1)} ${s.kg}") }
                }) { WeightRow(log) }
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun WeightHero(ui: BodyUi, inspected: TrendPoint?) {
    val c = Sumire.colors
    val s = S
    val latest = ui.latest ?: return
    val shown = inspected?.weight ?: latest.weight
    NeoCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp), color = c.matchaSoft) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text(shown.fmt(1), style = Sumire.type.number(48), color = c.ink)
            Spacer(Modifier.width(6.dp))
            Text(s.kg, style = Sumire.type.section(), color = c.inkMuted, modifier = Modifier.padding(bottom = 8.dp))
            Spacer(Modifier.weight(1f))
            ui.weekDelta?.let { d ->
                val icon = when {
                    d < -0.1 -> Icons.Rounded.TrendingDown
                    d > 0.1 -> Icons.Rounded.TrendingUp
                    else -> Icons.Rounded.TrendingFlat
                }
                Column(horizontalAlignment = Alignment.End) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(icon, null, tint = c.ink, modifier = Modifier.size(20.dp))
                        Text(" ${d.signed(1)} ${s.kg}", style = Sumire.type.bodyStrong(), color = c.ink)
                    }
                    Text(s.last7days, style = Sumire.type.small(), color = c.inkMuted)
                }
            }
        }
        Text(
            if (inspected != null) "${s.movingAvg}: ${inspected.movingAvg.fmt(1)} · ${s.dateShort(inspected.date)}"
            else "${s.dateShort(latest.date)} · ${Time.hhmm(latest.measuredAt)} · BMI ${latest.bmi.fmt(1)}",
            style = Sumire.type.small(), color = c.inkMuted,
        )
        val target = ui.profile.targetWeight
        if (target > 0) {
            Gap(12)
            val diff = target - latest.weight
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("${s.goalWeight}: ${target.fmt(1)} ${s.kg}", style = Sumire.type.bodyStrong(), color = c.ink, modifier = Modifier.weight(1f))
                val (date, weeks) = ui.projected
                Text(
                    if (kotlin.math.abs(diff) <= 0.2) s.goalReached
                    else "${s.toGoal} ${diff.signed(1)} · " + (date?.let { s.projected(s.dateShort(it), weeks) } ?: ""),
                    style = Sumire.type.small(), color = c.inkMuted,
                )
            }
        }
    }
}

@Composable
private fun BodyScoreCard(comp: BodyComposition) {
    val c = Sumire.colors
    val s = S
    var expanded by remember { mutableStateOf(false) }
    NeoCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp).animateContentSize(), onClick = { expanded = !expanded }) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            val color = when {
                comp.bodyScore >= 85 -> c.matcha
                comp.bodyScore >= 70 -> c.ochre
                else -> c.terracotta
            }
            ProgressRing(comp.bodyScore / 100f, Modifier.size(78.dp), color = color, stroke = 9.dp) {
                Text("${comp.bodyScore}", style = Sumire.type.number(24), color = c.ink)
            }
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text(s.bodyScore.uppercase(), style = Sumire.type.label(), color = c.inkMuted)
                Text(s.bodyTypeName(comp.bodyType), style = Sumire.type.section(), color = c.ink)
                Text("${s.metricName(com.kairo.planner.model.BodyMetric.BODY_AGE)}: ${comp.bodyAge} · BMR ${comp.bmr}", style = Sumire.type.small(), color = c.inkMuted)
            }
            Icon(Icons.Rounded.ChevronRight, null, tint = c.inkMuted)
        }
        if (expanded && comp.deductions.isNotEmpty()) {
            Gap(12)
            Text(s.deductions.uppercase(), style = Sumire.type.label(), color = c.inkMuted)
            Gap(6)
            comp.deductions.sortedByDescending { it.points }.forEach { d ->
                Row(Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
                    Text(s.metricName(d.metric), style = Sumire.type.body(), color = c.ink, modifier = Modifier.weight(1f))
                    Text("−${d.points.fmt(1)}", style = Sumire.type.number(14), color = c.terracotta)
                }
            }
        }
    }
}

@Composable
private fun MetricGrid(items: List<MetricItem>) {
    val c = Sumire.colors
    val s = S
    var open by remember { mutableStateOf<MetricItem?>(null) }
    Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { m ->
                    val bg = when (m.status) {
                        MetricStatus.OPTIMAL -> c.card
                        MetricStatus.ATTENTION -> c.ochreSoft
                        MetricStatus.ALERT -> c.terracottaSoft
                    }
                    NeoCard(
                        Modifier.weight(1f).animateContentSize(),
                        color = bg,
                        contentPadding = PaddingValues(12.dp),
                        onClick = { open = if (open == m) null else m },
                    ) {
                        Text(s.metricName(m.metric).uppercase(), style = Sumire.type.label().copy(fontSize = 10.sp), color = c.inkMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Row(verticalAlignment = Alignment.Bottom) {
                            Text(m.value.fmt(m.decimals), style = Sumire.type.number(22), color = c.ink)
                            if (m.unit.isNotEmpty()) Text(" ${unitLabel(m.unit)}", style = Sumire.type.small(), color = c.inkMuted, modifier = Modifier.padding(bottom = 3.dp))
                        }
                        val range = when {
                            m.rangeLow != null && m.rangeHigh != null -> "${m.rangeLow.fmt(m.decimals)}–${m.rangeHigh.fmt(m.decimals)}"
                            m.rangeLow != null -> "≥ ${m.rangeLow.fmt(m.decimals)}"
                            m.rangeHigh != null -> "≤ ${m.rangeHigh.fmt(m.decimals)}"
                            else -> ""
                        }
                        if (range.isNotEmpty()) Text("${s.norm}: $range", style = Sumire.type.small().copy(fontSize = 11.sp), color = c.inkMuted)
                        if (open == m) {
                            Gap(6)
                            Text(s.metricDescription(m.metric), style = Sumire.type.small(), color = c.ink)
                        }
                    }
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun unitLabel(u: String): String = when (u) {
    "kg" -> S.kg
    "kcal" -> S.kcal
    else -> u
}

@Composable
private fun WeightRow(log: WeightLog) {
    val c = Sumire.colors
    val s = S
    NeoCard(Modifier.fillMaxWidth(), color = c.surface, contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp), shadow = 1.5.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("${s.dateShort(log.date)} · ${Time.hhmm(log.measuredAt)}", style = Sumire.type.bodyStrong(), color = c.ink)
                val src = when {
                    log.source.startsWith("scale") -> "⚖️ " + log.source.removePrefix("scale:")
                    log.source.startsWith("health_connect") -> "❤️ Health Connect"
                    log.source == "assistant" -> "💬 Sumire"
                    else -> "✍️"
                }
                val extra = log.composition?.takeIf { it.fromImpedance }?.let { " · ${s.metricName(com.kairo.planner.model.BodyMetric.FAT)} ${it.bodyFatPercent.fmt(1)}%" } ?: (log.bodyFat?.let { " · ${it.fmt(1)}%" } ?: "")
                Text(src + extra, style = Sumire.type.small(), color = c.inkMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Text(log.weight.fmt(1), style = Sumire.type.number(20), color = c.ink)
            Text(" ${s.kg}", style = Sumire.type.small(), color = c.inkMuted)
        }
    }
}

@Composable
fun paceColor(kind: PaceKind): Color {
    val c = Sumire.colors
    return when (kind) {
        PaceKind.OPTIMAL_LOSS, PaceKind.LEAN_GAIN, PaceKind.MAINTAINING -> c.matchaSoft
        PaceKind.ESTABLISHING -> c.sand
        else -> c.ochreSoft
    }
}
