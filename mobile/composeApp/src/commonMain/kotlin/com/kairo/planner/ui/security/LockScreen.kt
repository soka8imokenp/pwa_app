package com.kairo.planner.ui.security

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Backspace
import androidx.compose.material.icons.rounded.Fingerprint
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
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
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.kairo.planner.i18n.S
import com.kairo.planner.platform.LocalPlatform
import com.kairo.planner.resources.Res
import com.kairo.planner.resources.mascot
import com.kairo.planner.ui.components.Haptic
import com.kairo.planner.ui.theme.Sumire
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.painterResource

/** Shared PIN pad. In setup mode it asks twice and checks both entries match. */
@Composable
fun PinPad(
    title: String,
    error: String?,
    errorTick: Int,
    onComplete: (String) -> Unit,
    biometric: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val c = Sumire.colors
    var pin by remember { mutableStateOf("") }
    val shake = remember { Animatable(0f) }
    val platform = LocalPlatform.current
    LaunchedEffect(title) { pin = "" }
    LaunchedEffect(errorTick) {
        if (error != null) {
            pin = ""
            platform.haptic(Haptic.WARNING)
            shake.animateTo(0f, spring(dampingRatio = 0.2f, stiffness = 1200f), initialVelocity = 2400f)
        }
    }
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Image(painterResource(Res.drawable.mascot), null, contentScale = ContentScale.Crop, modifier = Modifier.size(84.dp).clip(CircleShape).border(2.5.dp, c.line, CircleShape))
        Spacer(Modifier.height(16.dp))
        Text(title, style = Sumire.type.title(), color = c.ink)
        Spacer(Modifier.height(6.dp))
        Text(error ?: " ", style = Sumire.type.small(), color = c.terracotta)
        Spacer(Modifier.height(16.dp))
        Row(Modifier.graphicsLayer { translationX = shake.value / 20f }, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            repeat(4) { i ->
                Box(Modifier.size(16.dp).clip(CircleShape).background(if (i < pin.length) c.matcha else c.sand).border(1.5.dp, c.line, CircleShape))
            }
        }
        Spacer(Modifier.height(28.dp))
        val keys = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "bio", "0", "del")
        keys.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(18.dp), modifier = Modifier.padding(vertical = 8.dp)) {
                row.forEach { k ->
                    Box(
                        Modifier.size(72.dp).clip(CircleShape)
                            .background(if (k == "bio" || k == "del") c.canvas else c.card)
                            .border(if (k == "bio" || k == "del") 0.dp else 1.5.dp, c.line, CircleShape)
                            .clickable(enabled = k != "bio" || biometric != null) {
                                platform.haptic(Haptic.TICK)
                                when (k) {
                                    "del" -> pin = pin.dropLast(1)
                                    "bio" -> biometric?.invoke()
                                    else -> if (pin.length < 4) {
                                        pin += k
                                        if (pin.length == 4) onComplete(pin)
                                    }
                                }
                            },
                        contentAlignment = Alignment.Center,
                    ) {
                        when (k) {
                            "del" -> Icon(Icons.Rounded.Backspace, null, tint = c.ink)
                            "bio" -> if (biometric != null) Icon(Icons.Rounded.Fingerprint, null, tint = c.matcha, modifier = Modifier.size(30.dp))
                            else -> Text(k, style = Sumire.type.number(26), color = c.ink)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun LockScreen(onUnlock: (String) -> Int, onBiometric: (() -> Unit)?) {
    val s = S
    var error by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableStateOf(0) }
    LaunchedEffect(Unit) { onBiometric?.invoke() }
    Box(Modifier.fillMaxSize().background(Sumire.colors.canvas), contentAlignment = Alignment.Center) {
        PinPad(
            title = s.enterPin,
            error = error,
            errorTick = attempt,
            onComplete = { pin ->
                when (val r = onUnlock(pin)) {
                    -1 -> error = null
                    0 -> { error = s.wrongPin; attempt++ }
                    else -> { error = "${s.wrongPin} · ${r}s"; attempt++ }
                }
            },
            biometric = onBiometric,
        )
    }
}

@Composable
fun PinDialog(setup: Boolean, onDismiss: () -> Unit, onPin: (String) -> Boolean) {
    val s = S
    var first by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableStateOf(0) }
    val scope = rememberCoroutineScope()
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(Modifier.fillMaxSize().background(Sumire.colors.canvas), contentAlignment = Alignment.Center) {
            PinPad(
                title = if (!setup) s.enterPin else if (first == null) s.createPin else s.repeatPin,
                error = error,
                errorTick = attempt,
                onComplete = { pin ->
                    scope.launch {
                        if (!setup) {
                            if (!onPin(pin)) { error = s.wrongPin; attempt++ }
                        } else if (first == null) {
                            first = pin
                        } else if (first == pin) {
                            onPin(pin)
                        } else {
                            first = null
                            error = s.pinMismatch
                            attempt++
                        }
                    }
                },
            )
        }
    }
}
