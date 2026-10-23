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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.Upload
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kairo.planner.core.Time
import com.kairo.planner.data.AppLanguage
import com.kairo.planner.data.AppSettings
import com.kairo.planner.data.BackupService
import com.kairo.planner.data.ThemeMode
import com.kairo.planner.domain.planner.AppLock
import com.kairo.planner.i18n.S
import com.kairo.planner.platform.AppPermission
import com.kairo.planner.platform.LocalPlatform
import com.kairo.planner.ui.components.FieldLabel
import com.kairo.planner.ui.components.Gap
import com.kairo.planner.ui.components.NeoButton
import com.kairo.planner.ui.components.NeoButtonStyle
import com.kairo.planner.ui.components.NeoCard
import com.kairo.planner.ui.components.NeoChip
import com.kairo.planner.ui.components.NeoTextField
import com.kairo.planner.ui.minuteOfDayLabel
import com.kairo.planner.ui.theme.Sumire
import com.kairo.planner.ui.security.PinDialog
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SettingsPage(onBack: () -> Unit) {
    val settings = koinInject<AppSettings>()
    val backup = koinInject<BackupService>()
    val lock = koinInject<AppLock>()
    val platform = LocalPlatform.current
    val scope = rememberCoroutineScope()
    val s = S
    val c = Sumire.colors
    val lang by settings.language.collectAsState()
    val theme by settings.theme.collectAsState()
    val sound by settings.sound.collectAsState()
    val haptics by settings.haptics.collectAsState()
    val key by settings.geminiKey.collectAsState()
    val model by settings.geminiModel.collectAsState()
    val pomodoro by settings.pomodoroMinutes.collectAsState()
    val breakMin by settings.breakMinutes.collectAsState()
    val evening by settings.eveningReviewMinute.collectAsState()
    val water by settings.waterReminders.collectAsState()
    val biometrics by settings.biometrics.collectAsState()
    var keyDraft by remember { mutableStateOf(key) }
    var pinMode by remember { mutableStateOf(false) }
    var hasPin by remember { mutableStateOf(lock.hasPin) }

    PageScaffold(s.settings, onBack) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            NeoCard(Modifier.fillMaxWidth()) {
                Text(s.language.uppercase(), style = Sumire.type.label(), color = c.inkMuted)
                Gap(8)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AppLanguage.entries.forEach { l -> NeoChip(l.nativeName, (lang.ifEmpty { "ru" }) == l.code, { settings.setLanguage(l) }) }
                }
                FieldLabel(s.theme)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(ThemeMode.SYSTEM to s.themeSystem, ThemeMode.LIGHT to s.themeLight, ThemeMode.DARK to s.themeDark).forEach { (m, label) ->
                        NeoChip(label, theme == m.name, { settings.setTheme(m) })
                    }
                }
                Gap(8)
                ToggleRow(s.sounds, sound) { settings.setSound(it) }
                ToggleRow(s.haptics, haptics) { settings.setHaptics(it) }
            }

            NeoCard(Modifier.fillMaxWidth()) {
                Text("SUMIRE AI", style = Sumire.type.label(), color = c.inkMuted)
                FieldLabel(s.geminiKey)
                NeoTextField(keyDraft, { keyDraft = it.trim() }, placeholder = "AIza…", onImeAction = { settings.setGeminiKey(keyDraft) })
                Gap(4)
                Text(s.geminiKeyHint, style = Sumire.type.small(), color = c.inkMuted)
                Gap(8)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    NeoButton(s.save, { settings.setGeminiKey(keyDraft); platform.toast(s.saved) }, compact = true, enabled = keyDraft != key)
                    NeoButton("aistudio.google.com", { platform.openUrl("https://aistudio.google.com/apikey") }, compact = true, style = NeoButtonStyle.SECONDARY)
                }
                FieldLabel(s.geminiModel)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("" to s.auto, "gemini-2.5-flash" to "2.5 Flash", "gemini-2.5-flash-lite" to "2.5 Flash-Lite", "gemini-2.5-pro" to "2.5 Pro").forEach { (id, label) ->
                        NeoChip(label, model == id, { settings.setGeminiModel(id) })
                    }
                }
            }

            NeoCard(Modifier.fillMaxWidth()) {
                Text(s.focus.uppercase(), style = Sumire.type.label(), color = c.inkMuted)
                FieldLabel(s.pomodoroLength)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(20, 25, 30, 45, 50).forEach { m -> NeoChip("$m ${s.minutesShort}", pomodoro == m, { settings.setPomodoroMinutes(m) }) }
                }
                FieldLabel(s.breakLength)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(3, 5, 10, 15).forEach { m -> NeoChip("$m ${s.minutesShort}", breakMin == m, { settings.setBreakMinutes(m) }) }
                }
            }

            NeoCard(Modifier.fillMaxWidth()) {
                Text(s.notifications.uppercase(), style = Sumire.type.label(), color = c.inkMuted)
                Gap(6)
                ToggleRow(s.eveningReminder, evening >= 0) { on ->
                    scope.launch {
                        if (on && !platform.isGranted(AppPermission.NOTIFICATIONS) && !platform.request(AppPermission.NOTIFICATIONS)) return@launch
                        settings.setEveningReviewMinute(if (on) 21 * 60 else -1)
                        if (on) platform.scheduleDaily("evening", 21 * 60, s.reminderEveningTitle, s.reminderEveningBody)
                        else platform.cancelReminder("evening")
                    }
                }
                if (evening >= 0) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(19 * 60, 20 * 60, 21 * 60, 22 * 60).forEach { m ->
                            NeoChip(minuteOfDayLabel(m), evening == m, {
                                settings.setEveningReviewMinute(m)
                                platform.scheduleDaily("evening", m, s.reminderEveningTitle, s.reminderEveningBody)
                            })
                        }
                    }
                }
                ToggleRow(s.waterReminder, water) { on ->
                    scope.launch {
                        if (on && !platform.isGranted(AppPermission.NOTIFICATIONS) && !platform.request(AppPermission.NOTIFICATIONS)) return@launch
                        settings.setWaterReminders(on)
                        if (on) listOf(10, 13, 16, 19).forEach { h -> platform.scheduleDaily("water_$h", h * 60, s.reminderWaterTitle, s.reminderWaterBody) }
                        else listOf(10, 13, 16, 19).forEach { h -> platform.cancelReminder("water_$h") }
                    }
                }
            }

            NeoCard(Modifier.fillMaxWidth()) {
                Text(s.security.uppercase(), style = Sumire.type.label(), color = c.inkMuted)
                Gap(6)
                ToggleRow(s.appLock, hasPin) { on ->
                    if (on) pinMode = true else { lock.removePin(); hasPin = false; settings.setBiometrics(false) }
                }
                if (hasPin) ToggleRow(s.biometrics, biometrics) { settings.setBiometrics(it) }
            }

            NeoCard(Modifier.fillMaxWidth()) {
                Text(s.backupRestore.uppercase(), style = Sumire.type.label(), color = c.inkMuted)
                Gap(10)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    NeoButton(s.exportData, {
                        scope.launch {
                            val json = backup.export()
                            platform.saveFile("daily-sumire-${Time.todayKey()}.json", "application/json", json.encodeToByteArray())
                        }
                    }, Modifier.weight(1f), compact = true, icon = Icons.Rounded.Upload, style = NeoButtonStyle.SECONDARY)
                    NeoButton(s.importData, {
                        scope.launch {
                            val bytes = platform.openFile("application/json") ?: return@launch
                            runCatching { backup.import(bytes.decodeToString()) }
                                .onSuccess { platform.toast("${s.importDone}: $it") }
                                .onFailure { platform.toast(s.importFailed) }
                        }
                    }, Modifier.weight(1f), compact = true, icon = Icons.Rounded.Download, style = NeoButtonStyle.SECONDARY)
                }
                Gap(8)
                Text(s.privacy, style = Sumire.type.small(), color = c.inkMuted)
            }
            Spacer(Modifier.height(32.dp))
        }
    }

    if (pinMode) {
        PinDialog(
            setup = true,
            onDismiss = { pinMode = false },
            onPin = { pin ->
                lock.setPin(pin)
                hasPin = true
                pinMode = false
                true
            },
        )
    }
}

@Composable
fun ToggleRow(title: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    val c = Sumire.colors
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
        Text(title, style = Sumire.type.body(), color = c.ink, modifier = Modifier.weight(1f))
        Switch(
            checked = checked,
            onCheckedChange = onChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = c.onAccent, checkedTrackColor = c.matcha, checkedBorderColor = c.line,
                uncheckedThumbColor = c.ink, uncheckedTrackColor = c.sand, uncheckedBorderColor = c.line,
            ),
        )
    }
}
