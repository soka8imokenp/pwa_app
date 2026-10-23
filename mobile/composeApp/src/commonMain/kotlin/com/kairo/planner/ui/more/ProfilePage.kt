package com.kairo.planner.ui.more

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.kairo.planner.core.fmt
import com.kairo.planner.data.HealthRepository
import com.kairo.planner.domain.health.HealthFormulas
import com.kairo.planner.i18n.S
import com.kairo.planner.model.ActivityLevel
import com.kairo.planner.model.Gender
import com.kairo.planner.model.HealthGoal
import com.kairo.planner.model.HealthProfile
import com.kairo.planner.platform.LocalPlatform
import com.kairo.planner.ui.components.FieldLabel
import com.kairo.planner.ui.components.Gap
import com.kairo.planner.ui.components.NeoButton
import com.kairo.planner.ui.components.NeoCard
import com.kairo.planner.ui.components.NeoChip
import com.kairo.planner.ui.components.NeoTextField
import com.kairo.planner.ui.components.StatTile
import com.kairo.planner.ui.theme.Sumire
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

class ProfileDraft(p: HealthProfile) {
    var name by mutableStateOf(p.name)
    var age by mutableStateOf(if (p.age > 0) p.age.toString() else "")
    var gender by mutableStateOf(p.gender)
    var height by mutableStateOf(if (p.heightCm > 0) p.heightCm.fmt(0) else "")
    var weight by mutableStateOf(if (p.currentWeight > 0) p.currentWeight.fmt(1) else "")
    var target by mutableStateOf(if (p.targetWeight > 0) p.targetWeight.fmt(1) else "")
    var activity by mutableStateOf(p.activityLevel)
    var goal by mutableStateOf(p.goal)
    var water by mutableStateOf(if (p.waterGoalMl > 0) p.waterGoalMl.toString() else "")
    var calories by mutableStateOf(if (p.calorieGoalOverride > 0) p.calorieGoalOverride.toString() else "")
    private val base = p

    private fun num(s: String) = s.replace(',', '.').toDoubleOrNull()

    fun toProfile(): HealthProfile = base.copy(
        name = name.trim(),
        age = age.toIntOrNull()?.coerceIn(5, 110) ?: 0,
        gender = gender,
        heightCm = num(height)?.coerceIn(80.0, 250.0) ?: 0.0,
        currentWeight = num(weight)?.coerceIn(20.0, 350.0) ?: 0.0,
        targetWeight = num(target)?.coerceIn(20.0, 350.0) ?: 0.0,
        activityLevel = activity,
        goal = goal,
        waterGoalMl = water.toIntOrNull()?.coerceIn(500, 6000) ?: 0,
        calorieGoalOverride = calories.toIntOrNull()?.coerceIn(800, 6000) ?: 0,
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ProfileForm(d: ProfileDraft, showAdvanced: Boolean = true) {
    val s = S
    FieldLabel(s.yourName)
    NeoTextField(d.name, { d.name = it }, placeholder = s.firstName)
    FieldLabel(s.gender)
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        NeoChip(s.male, d.gender == Gender.MALE, { d.gender = Gender.MALE }, leading = "♂")
        NeoChip(s.female, d.gender == Gender.FEMALE, { d.gender = Gender.FEMALE }, leading = "♀")
    }
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Column(Modifier.weight(1f)) {
            FieldLabel("${s.age}, ${s.years}")
            NeoTextField(d.age, { d.age = it.filter(Char::isDigit).take(3) }, keyboardType = KeyboardType.Number, placeholder = "30")
        }
        Column(Modifier.weight(1f)) {
            FieldLabel("${s.height}, ${s.cm}")
            NeoTextField(d.height, { d.height = it.filter { c -> c.isDigit() || c == '.' }.take(5) }, keyboardType = KeyboardType.Decimal, placeholder = "175")
        }
    }
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Column(Modifier.weight(1f)) {
            FieldLabel("${s.currentWeight}, ${s.kg}")
            NeoTextField(d.weight, { d.weight = it.filter { c -> c.isDigit() || c == '.' || c == ',' }.take(5) }, keyboardType = KeyboardType.Decimal, placeholder = "75")
        }
        Column(Modifier.weight(1f)) {
            FieldLabel("${s.targetWeight}, ${s.kg}")
            NeoTextField(d.target, { d.target = it.filter { c -> c.isDigit() || c == '.' || c == ',' }.take(5) }, keyboardType = KeyboardType.Decimal, placeholder = "70")
        }
    }
    FieldLabel(s.healthGoal)
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        HealthGoal.entries.forEach { g -> NeoChip(s.goalName(g), d.goal == g, { d.goal = g }) }
    }
    FieldLabel(s.activityLevel)
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        ActivityLevel.entries.forEach { a -> NeoChip(s.activityLevelName(a), d.activity == a, { d.activity = a }) }
    }
    if (showAdvanced) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Column(Modifier.weight(1f)) {
                FieldLabel("${s.calorieGoal} (${s.auto})")
                NeoTextField(d.calories, { d.calories = it.filter(Char::isDigit).take(4) }, keyboardType = KeyboardType.Number, placeholder = s.auto)
            }
            Column(Modifier.weight(1f)) {
                FieldLabel("${s.waterGoal}, ${s.ml}")
                NeoTextField(d.water, { d.water = it.filter(Char::isDigit).take(4) }, keyboardType = KeyboardType.Number, placeholder = s.auto)
            }
        }
    }
}

@Composable
fun ProfilePage(onBack: () -> Unit) {
    val health = koinInject<HealthRepository>()
    val platform = LocalPlatform.current
    val scope = rememberCoroutineScope()
    val profile by remember { health.profile() }.collectAsState(null)
    val s = S
    val loaded = profile
    PageScaffold(s.healthProfile, onBack) {
        if (loaded == null) return@PageScaffold
        val draft = remember { ProfileDraft(loaded) }
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp)) {
            NeoCard(Modifier.fillMaxWidth()) { ProfileForm(draft) }
            Gap(12)
            val preview = HealthFormulas.targets(draft.toProfile())
            if (preview.calories > 0) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatTile("BMR", preview.bmr.toString(), S.kcal, Modifier.weight(1f))
                    StatTile("TDEE", preview.tdee.toString(), S.kcal, Modifier.weight(1f))
                    StatTile(s.goal, preview.calories.toString(), S.kcal, Modifier.weight(1f), color = Sumire.colors.matchaSoft)
                }
                Gap(8)
                Text(
                    "${s.protein} ${preview.proteinG} ${s.grams} · ${s.carbs} ${preview.carbsG} ${s.grams} · ${s.fat} ${preview.fatG} ${s.grams} · ${s.water} ${preview.waterMl} ${s.ml}",
                    style = Sumire.type.small(), color = Sumire.colors.inkMuted,
                )
            }
            Gap(16)
            NeoButton(s.save, {
                scope.launch {
                    val old = health.currentProfile()
                    val new = draft.toProfile()
                    health.saveProfile(new)
                    if (old.heightCm != new.heightCm || old.age != new.age || old.gender != new.gender) health.recomputeCompositions()
                    platform.toast(s.saved)
                    onBack()
                }
            }, Modifier.fillMaxWidth())
            Spacer(Modifier.height(32.dp))
        }
    }
}
