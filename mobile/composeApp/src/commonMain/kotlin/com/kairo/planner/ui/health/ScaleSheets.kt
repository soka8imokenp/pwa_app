package com.kairo.planner.ui.health

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Bluetooth
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.kairo.planner.core.fmt
import com.kairo.planner.data.AppSettings
import com.kairo.planner.data.HealthRepository
import com.kairo.planner.domain.health.BodyCompositionCalculator
import com.kairo.planner.i18n.S
import com.kairo.planner.model.HealthProfile
import com.kairo.planner.platform.AppPermission
import com.kairo.planner.platform.HealthPlatform
import com.kairo.planner.platform.LocalPlatform
import com.kairo.planner.platform.UiSound
import com.kairo.planner.resources.Res
import com.kairo.planner.resources.mascot
import com.kairo.planner.scale.ScaleError
import com.kairo.planner.scale.ScaleManager
import com.kairo.planner.scale.ScaleReading
import com.kairo.planner.scale.ScaleState
import com.kairo.planner.ui.components.FieldLabel
import com.kairo.planner.ui.components.Gap
import com.kairo.planner.ui.components.Haptic
import com.kairo.planner.ui.components.NeoButton
import com.kairo.planner.ui.components.NeoButtonStyle
import com.kairo.planner.ui.components.NeoCard
import com.kairo.planner.ui.components.NeoTextField
import com.kairo.planner.ui.components.StatTile
import com.kairo.planner.ui.components.SumireSheet
import com.kairo.planner.ui.theme.Sumire
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.painterResource
import org.koin.compose.koinInject

@Composable
fun ScaleSheet(onDismiss: () -> Unit, onManual: () -> Unit) {
    val manager = koinInject<ScaleManager>()
    val health = koinInject<HealthRepository>()
    val settings = koinInject<AppSettings>()
    val healthPlatform = koinInject<HealthPlatform>()
    val platform = LocalPlatform.current
    val scope = rememberCoroutineScope()
    val state by manager.state.collectAsState()
    val profile by remember { health.profile() }.collectAsState(HealthProfile())
    val s = S

    fun begin() {
        scope.launch {
            if (!platform.isGranted(AppPermission.BLUETOOTH) && !platform.request(AppPermission.BLUETOOTH)) {
                manager.start(null, null) // surfaces the permission error state
                return@launch
            }
            manager.start(profile.currentWeight.takeIf { it > 0 }, settings.lastScaleTimestamp.ifEmpty { null })
        }
    }

    LaunchedEffect(Unit) { begin() }
    DisposableEffect(Unit) { onDispose { manager.reset() } }
    LaunchedEffect(state is ScaleState.Done) {
        if (state is ScaleState.Done) {
            platform.haptic(Haptic.SUCCESS)
            platform.sound(UiSound.SUCCESS)
        }
    }

    SumireSheet(s.scaleTitle, onDismiss) { close ->
        AnimatedContent(
            targetState = state,
            contentKey = { it::class },
            transitionSpec = { (fadeIn(tween(220)) + scaleIn(initialScale = 0.96f)) togetherWith fadeOut(tween(150)) },
        ) { st ->
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                when (st) {
                    ScaleState.Idle, is ScaleState.Scanning -> {
                        Radar()
                        Gap(16)
                        Text(s.scaleStepOn, style = Sumire.type.section(), color = Sumire.colors.ink, textAlign = TextAlign.Center)
                        Gap(4)
                        Text(s.scaleSearching, style = Sumire.type.small(), color = Sumire.colors.inkMuted)
                        val devices = (st as? ScaleState.Scanning)?.devices.orEmpty()
                        if (devices.isNotEmpty()) {
                            Gap(12)
                            devices.forEach { d ->
                                Text("${s.devicesFound}: ${d.name} · ${d.rssi} dBm", style = Sumire.type.small(), color = Sumire.colors.matcha)
                            }
                        }
                        Gap(18)
                        Text(s.scaleSupported, style = Sumire.type.small(), color = Sumire.colors.inkMuted, textAlign = TextAlign.Center)
                    }
                    is ScaleState.Connecting -> {
                        Radar()
                        Gap(16)
                        Text(s.scaleConnecting, style = Sumire.type.section(), color = Sumire.colors.ink)
                        Text(st.device.name, style = Sumire.type.small(), color = Sumire.colors.inkMuted)
                    }
                    is ScaleState.Measuring -> LiveWeight(st.live, s.scaleMeasuring, st.device.name)
                    is ScaleState.Done -> DoneView(st.reading, st.device.name, profile)
                    is ScaleState.Error -> ErrorView(st.kind, retry = { begin() }, manual = onManual)
                }
            }
        }
        val done = state as? ScaleState.Done
        if (done != null) {
            Gap(18)
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                NeoButton(s.retry, { begin() }, style = NeoButtonStyle.SECONDARY, icon = Icons.Rounded.Refresh)
                NeoButton(s.scaleSave, {
                    scope.launch {
                        val r = done.reading
                        val log = health.addWeight(
                            weightKg = r.weightKg,
                            impedance = r.impedance,
                            source = "scale:${done.device.driverName}",
                            reportedBodyFat = r.reported?.bodyFatPercent,
                        )
                        r.deviceTimestamp?.let { settings.lastScaleTimestamp = it }
                        settings.preferredScaleId = done.device.id
                        if (settings.healthConnectWrite.value) {
                            healthPlatform.writeWeight(log.measuredAt, r.weightKg, log.composition?.takeIf { it.fromImpedance }?.bodyFatPercent ?: r.reported?.bodyFatPercent)
                        }
                        platform.toast(s.saved)
                        close()
                    }
                }, Modifier.weight(1f))
            }
        } else if (state !is ScaleState.Error) {
            Gap(18)
            NeoButton(s.manualEntry, onManual, Modifier.fillMaxWidth(), style = NeoButtonStyle.GHOST, icon = Icons.Rounded.Edit)
        }
    }
}

@Composable
private fun Radar() {
    val c = Sumire.colors
    val t = rememberInfiniteTransition()
    val wave by t.animateFloat(0f, 1f, infiniteRepeatable(tween(1800, easing = LinearEasing)))
    Box(Modifier.size(180.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(180.dp)) {
            for (i in 0 until 3) {
                val p = (wave + i / 3f) % 1f
                drawCircle(c.matcha.copy(alpha = (1f - p) * 0.5f), radius = size.minDimension / 2 * (0.35f + p * 0.65f), style = Stroke(3.dp.toPx()))
            }
        }
        Image(
            painterResource(Res.drawable.mascot), null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(84.dp).clip(CircleShape).border(2.5.dp, c.line, CircleShape),
        )
        Icon(
            Icons.Rounded.Bluetooth, null, tint = c.onAccent,
            modifier = Modifier.align(Alignment.BottomEnd).padding(end = 38.dp, bottom = 38.dp).size(26.dp)
                .clip(CircleShape).border(1.5.dp, c.line, CircleShape).padding(4.dp),
        )
    }
}

@Composable
private fun LiveWeight(r: ScaleReading, label: String, device: String) {
    val c = Sumire.colors
    val s = S
    val animated by animateFloatAsState(r.weightKg.toFloat(), spring(dampingRatio = 0.9f, stiffness = 120f))
    Gap(8)
    Text(device, style = Sumire.type.small(), color = c.inkMuted)
    Gap(8)
    Row(verticalAlignment = Alignment.Bottom) {
        Text(animated.toDouble().fmt(1), style = Sumire.type.number(72), color = if (r.stable) c.matcha else c.ink)
        Text(" ${s.kg}", style = Sumire.type.title(), color = c.inkMuted, modifier = Modifier.padding(bottom = 14.dp))
    }
    Gap(6)
    Text(
        if (r.stable && r.impedanceExpected) s.scaleImpedance else label,
        style = Sumire.type.bodyStrong(), color = c.ink, textAlign = TextAlign.Center,
    )
}

@Composable
private fun DoneView(r: ScaleReading, device: String, profile: HealthProfile) {
    val c = Sumire.colors
    val s = S
    Text(s.scaleDone, style = Sumire.type.section(), color = c.matcha)
    Text(device, style = Sumire.type.small(), color = c.inkMuted)
    Gap(6)
    Row(verticalAlignment = Alignment.Bottom) {
        Text(r.weightKg.fmt(1), style = Sumire.type.number(64), color = c.ink)
        Text(" ${s.kg}", style = Sumire.type.title(), color = c.inkMuted, modifier = Modifier.padding(bottom = 12.dp))
    }
    val hasImp = BodyCompositionCalculator.isValidImpedance(r.impedance)
    if (hasImp && profile.isComplete) {
        val comp = remember(r) { BodyCompositionCalculator.calculate(r.weightKg, r.impedance!!, profile.heightCm, profile.age, profile.gender) }
        Gap(12)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatTile(s.metricName(com.kairo.planner.model.BodyMetric.FAT), comp.bodyFatPercent.fmt(1), "%", Modifier.weight(1f))
            StatTile(s.metricName(com.kairo.planner.model.BodyMetric.MUSCLE), comp.muscleMassKg.fmt(1), s.kg, Modifier.weight(1f))
            StatTile(s.bodyScore, comp.bodyScore.toString(), "", Modifier.weight(1f))
        }
    } else if (r.reported?.bodyFatPercent != null) {
        Gap(8)
        Text("${s.metricName(com.kairo.planner.model.BodyMetric.FAT)}: ${r.reported.bodyFatPercent.fmt(1)}%", style = Sumire.type.bodyStrong(), color = c.ink)
    } else if (r.impedanceExpected && !hasImp) {
        Gap(8)
        Text(s.scaleNoImpedance, style = Sumire.type.small(), color = c.inkMuted, textAlign = TextAlign.Center)
    }
    if (!profile.isComplete) {
        Gap(8)
        Text(s.profileIncompleteHint, style = Sumire.type.small(), color = c.ochre, textAlign = TextAlign.Center)
    }
}

@Composable
private fun ErrorView(kind: ScaleError, retry: () -> Unit, manual: () -> Unit) {
    val c = Sumire.colors
    val s = S
    val platform = LocalPlatform.current
    val (title, hint) = when (kind) {
        ScaleError.BLUETOOTH_OFF -> s.scaleBtOff to s.scaleBtOffHint
        ScaleError.PERMISSION -> s.scalePermission to s.scalePermissionHint
        ScaleError.TIMEOUT -> s.scaleTimeout to s.scaleTimeoutHint
        ScaleError.CONNECTION -> s.scaleConnectionError to s.scaleTimeoutHint
        else -> s.errorGeneric to s.scaleTimeoutHint
    }
    Gap(12)
    Text("⚠️", style = Sumire.type.hero())
    Gap(8)
    Text(title, style = Sumire.type.section(), color = c.ink, textAlign = TextAlign.Center)
    Gap(4)
    Text(hint, style = Sumire.type.small(), color = c.inkMuted, textAlign = TextAlign.Center)
    Gap(18)
    Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        when (kind) {
            ScaleError.BLUETOOTH_OFF -> NeoButton(s.turnOn, { platform.openBluetoothSettings() }, Modifier.fillMaxWidth(), icon = Icons.Rounded.Bluetooth)
            ScaleError.PERMISSION -> NeoButton(s.openSettings, { platform.openAppSettings() }, Modifier.fillMaxWidth(), icon = Icons.Rounded.Settings)
            else -> {}
        }
        NeoButton(s.retry, retry, Modifier.fillMaxWidth(), style = NeoButtonStyle.SECONDARY, icon = Icons.Rounded.Refresh)
        NeoButton(s.manualEntry, manual, Modifier.fillMaxWidth(), style = NeoButtonStyle.GHOST, icon = Icons.Rounded.Edit)
    }
}

@Composable
fun LogWeightSheet(onDismiss: () -> Unit, vm: BodyViewModel = org.koin.compose.viewmodel.koinViewModel()) {
    val s = S
    val health = koinInject<HealthRepository>()
    val profile by remember { health.profile() }.collectAsState(HealthProfile())
    var weight by remember { mutableStateOf("") }
    var waist by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    LaunchedEffect(profile.currentWeight) {
        if (weight.isEmpty() && profile.currentWeight > 0) weight = profile.currentWeight.fmt(1)
    }
    val parsed = weight.replace(',', '.').toDoubleOrNull()
    SumireSheet(s.logWeight, onDismiss) { close ->
        NeoCard(Modifier.fillMaxWidth()) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.Center, modifier = Modifier.fillMaxWidth()) {
                StepperButton("−0.1") { parsed?.let { weight = (it - 0.1).fmt(1) } }
                Spacer(Modifier.width(12.dp))
                NeoTextField(
                    weight, { weight = it.filter { ch -> ch.isDigit() || ch == '.' || ch == ',' }.take(5) },
                    modifier = Modifier.width(140.dp),
                    keyboardType = KeyboardType.Decimal,
                    textStyle = Sumire.type.number(34).copy(textAlign = TextAlign.Center),
                )
                Spacer(Modifier.width(12.dp))
                StepperButton("+0.1") { parsed?.let { weight = (it + 0.1).fmt(1) } }
            }
            Gap(4)
            Text(s.kg, style = Sumire.type.small(), color = Sumire.colors.inkMuted, modifier = Modifier.align(Alignment.CenterHorizontally))
        }
        FieldLabel("${s.waist} (${s.cm}, ${s.optional})")
        NeoTextField(waist, { waist = it.filter { ch -> ch.isDigit() || ch == '.' }.take(5) }, keyboardType = KeyboardType.Decimal, placeholder = "80")
        FieldLabel(s.note)
        NeoTextField(note, { note = it }, placeholder = s.note)
        Gap(20)
        NeoButton(s.save, {
            parsed?.let {
                vm.addManual(it, waist.toDoubleOrNull(), note)
                close()
            }
        }, Modifier.fillMaxWidth(), enabled = parsed != null && parsed in 20.0..350.0)
    }
}

@Composable
private fun StepperButton(label: String, onClick: () -> Unit) {
    NeoButton(label, onClick, style = NeoButtonStyle.SECONDARY, compact = true)
}

