package com.kairo.planner.ui.health

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Undo
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kairo.planner.core.Time
import com.kairo.planner.core.fmt
import com.kairo.planner.core.grouped
import com.kairo.planner.i18n.S
import com.kairo.planner.model.MealLog
import com.kairo.planner.model.MealType
import com.kairo.planner.platform.LocalPlatform
import com.kairo.planner.platform.UiSound
import com.kairo.planner.ui.LocalAppState
import com.kairo.planner.ui.Sheet
import com.kairo.planner.ui.components.Gap
import com.kairo.planner.ui.components.Haptic
import com.kairo.planner.ui.components.NeoBadge
import com.kairo.planner.ui.components.NeoButton
import com.kairo.planner.ui.components.NeoButtonStyle
import com.kairo.planner.ui.components.NeoCard
import com.kairo.planner.ui.components.NeoIconButton
import com.kairo.planner.ui.components.ProgressBar
import com.kairo.planner.ui.components.ProgressRing
import com.kairo.planner.ui.components.SectionLabel
import com.kairo.planner.ui.components.SwipeToDelete
import com.kairo.planner.ui.dayLabel
import com.kairo.planner.ui.theme.Sumire
import org.koin.compose.viewmodel.koinViewModel

@Composable
fun FoodScreen(contentPadding: PaddingValues, vm: FoodViewModel = koinViewModel()) {
    val ui by vm.ui.collectAsStateWithLifecycle()
    val app = LocalAppState.current
    val s = S
    val c = Sumire.colors

    LazyColumn(contentPadding = contentPadding, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            Row(Modifier.padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(s.food, style = Sumire.type.hero(), color = c.ink)
                    Text(s.dayLabel(ui.date, Time.today()), style = Sumire.type.small(), color = c.inkMuted)
                }
                NeoIconButton(Icons.Rounded.ChevronLeft, null, { vm.shift(-1) }, size = 36.dp)
                Spacer(Modifier.width(6.dp))
                NeoIconButton(Icons.Rounded.ChevronRight, null, { vm.shift(1) }, size = 36.dp)
            }
        }
        item { CaloriesCard(ui) }
        item { WaterCard(ui, onAdd = vm::addWater, onUndo = vm::undoWater) }
        item {
            NeoButton(s.addMeal, { app.show(Sheet.MealEditor()) }, Modifier.fillMaxWidth().padding(horizontal = 16.dp), icon = Icons.Rounded.AutoAwesome)
        }
        MealType.entries.forEach { type ->
            val list = ui.meals.filter { it.mealType == type }
            item(key = "h-$type") {
                SectionLabel("${s.mealTypeName(type)}${if (list.isNotEmpty()) " · ${list.sumOf { it.kcal }} ${s.kcal}" else ""}", Modifier.padding(horizontal = 16.dp)) {
                    NeoIconButton(Icons.Rounded.Add, s.addMeal, { app.show(Sheet.MealEditor(type)) }, size = 30.dp)
                }
            }
            items(list, key = { it.id }) { meal ->
                SwipeToDelete(onDelete = { vm.deleteMeal(meal.id) }) {
                    MealRow(meal) { app.show(Sheet.MealEditor(meal.mealType, meal)) }
                }
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun CaloriesCard(ui: FoodUi) {
    val c = Sumire.colors
    val s = S
    val t = ui.targets
    val goal = t?.calories?.takeIf { it > 0 } ?: 2000
    val eaten = ui.totals.kcal
    val budget = goal + ui.burnedKcal / 2 // only half of estimated activity is "earned back" – estimates run high
    val left = budget - eaten
    NeoCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            ProgressRing(
                eaten.toFloat() / budget,
                Modifier.size(120.dp),
                color = if (left < 0) c.terracotta else c.matcha,
                stroke = 12.dp,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(kotlin.math.abs(left).grouped(), style = Sumire.type.number(24), color = c.ink)
                    Text((if (left >= 0) s.caloriesLeft else s.caloriesOver).uppercase(), style = Sumire.type.label().copy(fontSize = 9.sp), color = c.inkMuted)
                }
            }
            Spacer(Modifier.width(16.dp))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                KcalLine(s.goal, goal, c.ink)
                KcalLine(s.eaten, eaten, c.matcha)
                KcalLine(s.burned, ui.burnedKcal, c.terracotta)
            }
        }
        Gap(16)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            MacroBar(s.protein, ui.totals.protein, t?.proteinG ?: 0, c.terracotta, Modifier.weight(1f))
            MacroBar(s.carbs, ui.totals.carbs, t?.carbsG ?: 0, c.ochre, Modifier.weight(1f))
            MacroBar(s.fat, ui.totals.fat, t?.fatG ?: 0, c.indigo, Modifier.weight(1f))
        }
    }
}

@Composable
private fun KcalLine(label: String, v: Int, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(8.dp).padding(0.dp)) { Canvas(Modifier.size(8.dp)) { drawCircle(color) } }
        Spacer(Modifier.width(8.dp))
        Text(label, style = Sumire.type.small(), color = Sumire.colors.inkMuted, modifier = Modifier.width(72.dp))
        Text("${v.grouped()} ${S.kcal}", style = Sumire.type.bodyStrong(), color = Sumire.colors.ink)
    }
}

@Composable
private fun MacroBar(label: String, value: Double, target: Int, color: Color, modifier: Modifier) {
    Column(modifier) {
        Text(label.uppercase(), style = Sumire.type.label().copy(fontSize = 10.sp), color = Sumire.colors.inkMuted)
        Gap(4)
        ProgressBar(if (target > 0) (value / target).toFloat() else 0f, Modifier.fillMaxWidth(), color = color, height = 8.dp)
        Gap(4)
        Text("${value.fmt(0)} / $target ${S.grams}", style = Sumire.type.small().copy(fontSize = 11.sp), color = Sumire.colors.ink)
    }
}

@Composable
private fun WaterCard(ui: FoodUi, onAdd: (Int) -> Unit, onUndo: () -> Unit) {
    val c = Sumire.colors
    val s = S
    val platform = LocalPlatform.current
    val target = ui.targets?.waterMl ?: 2000
    val progress by animateFloatAsState((ui.waterMl.toFloat() / target).coerceIn(0f, 1f), spring(dampingRatio = 0.7f, stiffness = 90f))
    NeoCard(Modifier.fillMaxWidth().padding(horizontal = 16.dp), color = c.indigoSoft) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            // glass
            Canvas(Modifier.size(width = 46.dp, height = 64.dp)) {
                val r = 8.dp.toPx()
                drawRoundRect(c.card, size = size, cornerRadius = CornerRadius(r))
                val h = size.height * progress
                drawRoundRect(c.indigo, topLeft = Offset(0f, size.height - h), size = Size(size.width, h), cornerRadius = CornerRadius(r))
                drawRoundRect(c.line, size = size, cornerRadius = CornerRadius(r), style = Stroke(1.75.dp.toPx()))
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(s.water.uppercase(), style = Sumire.type.label(), color = c.inkMuted)
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(ui.waterMl.grouped(), style = Sumire.type.number(26), color = c.ink)
                    Text(" / ${target.grouped()} ${s.ml}", style = Sumire.type.small(), color = c.inkMuted, modifier = Modifier.padding(bottom = 4.dp))
                }
            }
            if (ui.water.isNotEmpty()) NeoIconButton(Icons.Rounded.Undo, s.undo, onUndo, size = 36.dp)
        }
        Gap(12)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(150, 250, 330, 500).forEach { ml ->
                NeoButton("+$ml", {
                    onAdd(ml)
                    platform.haptic(Haptic.TICK)
                    if (ui.waterMl < target && ui.waterMl + ml >= target) platform.sound(UiSound.COMPLETE)
                }, Modifier.weight(1f), style = NeoButtonStyle.SECONDARY, compact = true)
            }
        }
    }
}

@Composable
private fun MealRow(meal: MealLog, onClick: () -> Unit) {
    val c = Sumire.colors
    val s = S
    NeoCard(Modifier.fillMaxWidth(), color = c.card, shadow = 1.5.dp, contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp), onClick = onClick) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(meal.name, style = Sumire.type.bodyStrong(), color = c.ink, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                    if (meal.aiEstimated) {
                        Spacer(Modifier.width(6.dp))
                        NeoBadge("AI", c.violetSoft)
                    }
                }
                Text(
                    "${meal.time} · ${s.protein.take(1)} ${meal.protein.fmt(0)} · ${s.carbs.take(1)} ${meal.carbs.fmt(0)} · ${s.fat.take(1)} ${meal.fat.fmt(0)}" +
                        (meal.grams?.let { " · $it ${s.grams}" } ?: ""),
                    style = Sumire.type.small(), color = c.inkMuted,
                )
            }
            Text("${meal.kcal}", style = Sumire.type.number(18), color = c.ink)
            Text(" ${s.kcal}", style = Sumire.type.small(), color = c.inkMuted)
        }
    }
}
