package com.kairo.planner.ui.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.kairo.planner.data.AppLanguage
import com.kairo.planner.data.AppSettings
import com.kairo.planner.data.HealthRepository
import com.kairo.planner.i18n.S
import com.kairo.planner.model.HealthProfile
import com.kairo.planner.resources.Res
import com.kairo.planner.resources.mascot
import com.kairo.planner.ui.components.Gap
import com.kairo.planner.ui.components.NeoButton
import com.kairo.planner.ui.components.NeoButtonStyle
import com.kairo.planner.ui.components.NeoCard
import com.kairo.planner.ui.more.ProfileDraft
import com.kairo.planner.ui.more.ProfileForm
import com.kairo.planner.ui.theme.Sumire
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.painterResource
import org.koin.compose.koinInject

@Composable
fun OnboardingScreen(onDone: () -> Unit) {
    val settings = koinInject<AppSettings>()
    val health = koinInject<HealthRepository>()
    val scope = rememberCoroutineScope()
    val lang by settings.language.collectAsState()
    var step by remember { mutableStateOf(0) }
    val draft = remember { ProfileDraft(HealthProfile()) }
    val s = S
    val c = Sumire.colors

    Box(Modifier.fillMaxSize().background(c.canvas).statusBarsPadding().navigationBarsPadding().imePadding()) {
        AnimatedContent(
            targetState = step,
            transitionSpec = {
                (slideInHorizontally(tween(320)) { it / 3 } + fadeIn(tween(320))) togetherWith
                    (slideOutHorizontally(tween(260)) { -it / 3 } + fadeOut(tween(200)))
            },
        ) { st ->
            when (st) {
                0 -> Column(
                    Modifier.fillMaxSize().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    val bob = rememberInfiniteTransition()
                    val y by bob.animateFloat(-6f, 6f, infiniteRepeatable(tween(1600, easing = FastOutSlowInEasing), RepeatMode.Reverse))
                    Image(
                        painterResource(Res.drawable.mascot), null, contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(150.dp)
                            .graphicsLayer { translationY = y }
                            .drawBehind { drawCircle(c.line, size.minDimension / 2, center + Offset(5f, 6f)) }
                            .clip(CircleShape)
                            .border(3.dp, c.line, CircleShape),
                    )
                    Gap(24)
                    Text(s.welcomeTitle, style = Sumire.type.hero(), color = c.ink, textAlign = TextAlign.Center)
                    Gap(8)
                    Text(s.welcomeSubtitle, style = Sumire.type.body(), color = c.inkMuted, textAlign = TextAlign.Center)
                    Gap(28)
                    Text(s.chooseLanguage.uppercase(), style = Sumire.type.label(), color = c.inkMuted)
                    Gap(10)
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                        AppLanguage.entries.forEach { l ->
                            NeoCard(
                                Modifier.fillMaxWidth(),
                                color = if ((lang.ifEmpty { "ru" }) == l.code) c.matchaSoft else c.card,
                                onClick = { settings.setLanguage(l) },
                            ) {
                                Text(l.nativeName, style = Sumire.type.section(), color = c.ink, modifier = Modifier.align(Alignment.CenterHorizontally))
                            }
                        }
                    }
                    Gap(24)
                    NeoButton(s.letsStart, {
                        if (lang.isEmpty()) settings.setLanguage(AppLanguage.RU)
                        step = 1
                    }, Modifier.fillMaxWidth())
                }
                else -> Column(Modifier.fillMaxSize()) {
                    Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 16.dp)) {
                        Text(s.aboutYou, style = Sumire.type.hero(), color = c.ink)
                        Gap(6)
                        Text(s.aboutYouHint, style = Sumire.type.small(), color = c.inkMuted)
                        Gap(8)
                        ProfileForm(draft, showAdvanced = false)
                        Spacer(Modifier.height(24.dp))
                    }
                    Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        NeoButton(s.skip, { settings.onboardingDone = true; onDone() }, style = NeoButtonStyle.SECONDARY)
                        NeoButton(s.done, {
                            scope.launch {
                                health.saveProfile(draft.toProfile())
                                draft.toProfile().currentWeight.takeIf { it > 0 }?.let { health.addWeight(it, source = "manual") }
                                settings.onboardingDone = true
                                onDone()
                            }
                        }, Modifier.weight(1f))
                    }
                }
            }
        }
    }
}
