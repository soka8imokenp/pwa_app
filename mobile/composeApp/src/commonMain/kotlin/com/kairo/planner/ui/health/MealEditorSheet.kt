package com.kairo.planner.ui.health

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.PhotoCamera
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.kairo.planner.ai.GeminiException
import com.kairo.planner.ai.SumireAssistant
import com.kairo.planner.core.Time
import com.kairo.planner.core.fmt
import com.kairo.planner.data.HealthRepository
import com.kairo.planner.i18n.LocalStrings
import com.kairo.planner.i18n.S
import com.kairo.planner.model.MealLog
import com.kairo.planner.model.MealType
import com.kairo.planner.platform.LocalPlatform
import com.kairo.planner.ui.components.FieldLabel
import com.kairo.planner.ui.components.Gap
import com.kairo.planner.ui.components.HGap
import com.kairo.planner.ui.components.NeoButton
import com.kairo.planner.ui.components.NeoButtonStyle
import com.kairo.planner.ui.components.NeoChip
import com.kairo.planner.ui.components.NeoTextField
import com.kairo.planner.ui.components.SumireSheet
import com.kairo.planner.ui.theme.Sumire
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MealEditorSheet(initialType: MealType?, meal: MealLog?, onDismiss: () -> Unit, onNeedKey: () -> Unit) {
    val health = koinInject<HealthRepository>()
    val assistant = koinInject<SumireAssistant>()
    val platform = LocalPlatform.current
    val scope = rememberCoroutineScope()
    val s = S
    val langName = languageNameFor(LocalStrings.current.code)
    val recent by remember { health.recentFoods() }.collectAsState(emptyList())

    var name by remember { mutableStateOf(meal?.name ?: "") }
    var kcal by remember { mutableStateOf(meal?.kcal?.toString() ?: "") }
    var protein by remember { mutableStateOf(meal?.protein?.fmt(0) ?: "") }
    var carbs by remember { mutableStateOf(meal?.carbs?.fmt(0) ?: "") }
    var fat by remember { mutableStateOf(meal?.fat?.fmt(0) ?: "") }
    var grams by remember { mutableStateOf(meal?.grams?.toString() ?: "") }
    var type by remember { mutableStateOf(meal?.mealType ?: initialType ?: MealType.forTime(Time.currentHhmm())) }
    var aiUsed by remember { mutableStateOf(meal?.aiEstimated ?: false) }
    var waterMl by remember { mutableStateOf<Int?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    fun estimate(image: ByteArray?) {
        if (name.isBlank() && image == null) return
        busy = true
        error = null
        scope.launch {
            try {
                val r = assistant.estimateMeal(listOf(name, grams.takeIf { it.isNotBlank() }?.let { "$it g" }).filterNotNull().joinToString(", "), image, langName)
                name = r.name
                kcal = r.kcal.toString()
                protein = r.protein.fmt(0)
                carbs = r.carbs.fmt(0)
                fat = r.fat.fmt(0)
                r.grams?.let { grams = it.toString() }
                waterMl = r.waterMl
                aiUsed = true
            } catch (e: GeminiException) {
                if (e.message == "NO_KEY") onNeedKey() else error = e.message
            } catch (e: Exception) {
                error = e.message ?: s.errorGeneric
            } finally {
                busy = false
            }
        }
    }

    SumireSheet(if (meal == null) s.addMeal else s.edit, onDismiss) { close ->
        NeoTextField(name, { name = it }, placeholder = s.mealName, textStyle = Sumire.type.section(), singleLine = false)
        Gap(10)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            NeoButton(
                if (busy) s.aiEstimating else s.aiEstimate, { estimate(null) }, Modifier.weight(1f),
                icon = Icons.Rounded.AutoAwesome, enabled = !busy && name.isNotBlank(),
            )
            NeoButton(s.photoMeal, {
                scope.launch { platform.pickImage(fromCamera = true)?.let { estimate(it) } }
            }, style = NeoButtonStyle.SECONDARY, icon = Icons.Rounded.PhotoCamera, enabled = !busy)
        }
        if (busy) {
            Gap(10)
            Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(Modifier.size(18.dp), color = Sumire.colors.matcha, strokeWidth = 2.dp)
                HGap(10)
                Text(s.aiEstimating, style = Sumire.type.small(), color = Sumire.colors.inkMuted)
            }
        }
        error?.let { Gap(8); Text("⚠️ $it", style = Sumire.type.small(), color = Sumire.colors.terracotta) }

        if (meal == null && recent.isNotEmpty() && name.isBlank()) {
            FieldLabel(s.recentFoods)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                recent.forEach { f ->
                    NeoChip("${f.name} · ${f.kcal}", false, {
                        name = f.name; kcal = f.kcal.toString(); protein = f.protein.fmt(0); carbs = f.carbs.fmt(0); fat = f.fat.fmt(0)
                        grams = f.grams?.toString() ?: ""
                    })
                }
            }
        }

        FieldLabel(s.category)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            MealType.entries.forEach { t -> NeoChip(s.mealTypeName(t), type == t, { type = t }) }
        }
        FieldLabel("${s.calories} / ${s.portion}")
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            NumField(kcal, { kcal = it }, s.kcal, Modifier.weight(1f))
            NumField(grams, { grams = it }, s.grams, Modifier.weight(1f))
        }
        FieldLabel("${s.protein} · ${s.carbs} · ${s.fat} (${s.grams})")
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            NumField(protein, { protein = it }, s.protein.take(1), Modifier.weight(1f))
            NumField(carbs, { carbs = it }, s.carbs.take(1), Modifier.weight(1f))
            NumField(fat, { fat = it }, s.fat.take(1), Modifier.weight(1f))
        }
        Gap(20)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            if (meal != null) {
                NeoButton(s.delete, { scope.launch { health.deleteMeal(meal.id); close() } }, style = NeoButtonStyle.DANGER, icon = Icons.Rounded.DeleteOutline)
            }
            NeoButton(s.save, {
                scope.launch {
                    val k = kcal.toIntOrNull() ?: 0
                    val p = protein.replace(',', '.').toDoubleOrNull() ?: 0.0
                    val cb = carbs.replace(',', '.').toDoubleOrNull() ?: 0.0
                    val f = fat.replace(',', '.').toDoubleOrNull() ?: 0.0
                    if (meal == null) {
                        health.addMeal(Time.todayKey(), name, k, p, cb, f, type, grams = grams.toIntOrNull(), aiEstimated = aiUsed)
                        waterMl?.let { health.addWater(Time.todayKey(), it) }
                    } else {
                        health.updateMeal(meal.copy(name = name.trim(), kcal = k, protein = p, carbs = cb, fat = f, mealType = type, grams = grams.toIntOrNull()))
                    }
                    close()
                }
            }, Modifier.weight(1f), enabled = name.isNotBlank() && kcal.toIntOrNull() != null)
        }
    }
}

@Composable
private fun NumField(value: String, onChange: (String) -> Unit, hint: String, modifier: Modifier) {
    NeoTextField(
        value, { v -> onChange(v.filter { it.isDigit() || it == '.' || it == ',' }.take(5)) },
        modifier = modifier.fillMaxWidth(), placeholder = hint, keyboardType = KeyboardType.Decimal,
        textStyle = Sumire.type.number(18),
    )
}

fun languageNameFor(code: String): String = when (code) {
    "uz" -> "Uzbek (Latin script)"
    "en" -> "English"
    else -> "Russian"
}
