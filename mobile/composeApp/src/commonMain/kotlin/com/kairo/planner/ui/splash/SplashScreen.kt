package com.kairo.planner.ui.splash

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kairo.planner.resources.Res
import com.kairo.planner.resources.mascot
import com.kairo.planner.ui.theme.Sumire
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.painterResource
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

private val SplashGreen = Color(0xFF3D6B52)
private val SplashGreenDeep = Color(0xFF223D2E)
private val Cream = Color(0xFFF4F0EA)
private val Ink = Color(0xFF24201D)
private val Violet = Color(0xFFB79BE0)
private val VioletDeep = Color(0xFF8E6BBF)
private val Ochre = Color(0xFFF0BB58)

private data class Petal(val x: Float, val speed: Float, val size: Float, val sway: Float, val phase: Float, val spin: Float, val delay: Float, val deep: Boolean)

/**
 * Animated mascot intro (~2.3 s, tap to skip). Pure Compose – no video/Lottie – so it is crisp at any
 * resolution, costs no APK size and starts on the first frame.
 *
 * Timeline: petals start falling → frame pops in with overshoot → Sumire peeks up from inside the frame
 * and settles with a head tilt → sparkles → title letters cascade → zoom-through into the app.
 */
@Composable
fun SplashScreen(statusText: String, onFinished: () -> Unit) {
    val frameScale = remember { Animatable(0f) }
    val mascotRise = remember { Animatable(1f) }
    val tilt = remember { Animatable(-10f) }
    val sparkle = remember { Animatable(0f) }
    val titleProgress = remember { Animatable(0f) }
    val progress = remember { Animatable(0f) }
    val exit = remember { Animatable(0f) }
    var finished by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val petals = remember {
        val rnd = Random(7)
        List(22) {
            Petal(
                x = rnd.nextFloat(),
                speed = 0.18f + rnd.nextFloat() * 0.22f,
                size = 7f + rnd.nextFloat() * 9f,
                sway = 0.02f + rnd.nextFloat() * 0.05f,
                phase = rnd.nextFloat() * 2f * PI.toFloat(),
                spin = rnd.nextFloat() * 360f,
                delay = rnd.nextFloat(),
                deep = rnd.nextBoolean(),
            )
        }
    }
    val infinite = rememberInfiniteTransition()
    val time by infinite.animateFloat(0f, 1f, infiniteRepeatable(tween(6000, easing = LinearEasing)))
    val bob by infinite.animateFloat(-1f, 1f, infiniteRepeatable(tween(1400, easing = FastOutSlowInEasing), RepeatMode.Reverse))

    suspend fun finish() {
        if (finished) return
        finished = true
        exit.animateTo(1f, tween(520, easing = FastOutSlowInEasing))
        onFinished()
    }

    LaunchedEffect(Unit) {
        launch { progress.animateTo(1f, tween(2100, easing = LinearEasing)) }
        launch { frameScale.animateTo(1f, spring(dampingRatio = 0.48f, stiffness = 260f)) }
        delay(180)
        launch { mascotRise.animateTo(0f, spring(dampingRatio = 0.55f, stiffness = Spring.StiffnessMediumLow)) }
        launch {
            tilt.animateTo(6f, tween(420, easing = FastOutSlowInEasing))
            tilt.animateTo(-3f, tween(360, easing = FastOutSlowInEasing))
            tilt.animateTo(0f, spring(dampingRatio = 0.5f))
        }
        delay(420)
        launch { sparkle.animateTo(1f, tween(700, easing = FastOutSlowInEasing)) }
        launch { titleProgress.animateTo(1f, tween(900, easing = LinearEasing)) }
        delay(1500)
        finish()
    }

    val title = "Daily Sumire"
    BoxWithConstraints(
        Modifier
            .fillMaxSize()
            .graphicsLayer { alpha = 1f - exit.value * exit.value }
            .background(Brush.verticalGradient(listOf(SplashGreen, SplashGreenDeep)))
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {
                scope.launch { finish() }
            },
        contentAlignment = Alignment.Center,
    ) {
        val w = constraints.maxWidth.toFloat()
        val h = constraints.maxHeight.toFloat()

        // Falling violet petals
        Canvas(Modifier.fillMaxSize()) {
            petals.forEach { p ->
                val t = ((time + p.delay) * (p.speed / 0.25f)) % 1f
                val y = -40f + t * (h + 80f)
                val x = (p.x + sin(t * 2 * PI.toFloat() * 2 + p.phase) * p.sway) * w
                val r = p.spin + t * 540f
                drawPetal(Offset(x, y), p.size * density, r, if (p.deep) VioletDeep else Violet, alpha = 0.55f + 0.35f * (1 - t))
            }
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.graphicsLayer {
                val e = exit.value
                scaleX = 1f + e * 2.2f
                scaleY = 1f + e * 2.2f
            },
        ) {
            Box(contentAlignment = Alignment.Center) {
                // sparkles around the frame
                Canvas(Modifier.size(260.dp)) {
                    val s = sparkle.value
                    if (s > 0f) {
                        val spots = listOf(Triple(0.08f, 0.22f, 1.0f), Triple(0.9f, 0.16f, 0.8f), Triple(0.86f, 0.82f, 1.2f), Triple(0.14f, 0.78f, 0.7f))
                        spots.forEachIndexed { i, (sx, sy, k) ->
                            val local = ((s - i * 0.12f) / 0.6f).coerceIn(0f, 1f)
                            val pop = if (local < 0.7f) local / 0.7f * 1.25f else 1.25f - (local - 0.7f) / 0.3f * 0.25f
                            drawSparkle(Offset(size.width * sx, size.height * sy), 11.dp.toPx() * k * pop, if (i % 2 == 0) Ochre else Cream)
                        }
                    }
                }
                // frame with hard shadow
                Box(
                    Modifier
                        .size(196.dp)
                        .graphicsLayer {
                            scaleX = frameScale.value
                            scaleY = frameScale.value
                        }
                        .drawBehind {
                            drawCircle(Ink, radius = size.minDimension / 2, center = center + Offset(5.dp.toPx(), 6.dp.toPx()))
                        }
                        .clip(CircleShape)
                        .background(Cream)
                        .border(3.dp, Ink, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Image(
                        painterResource(Res.drawable.mascot),
                        contentDescription = "Sumire",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(196.dp)
                            .graphicsLayer {
                                translationY = mascotRise.value * size.height * 0.85f + bob * 3.dp.toPx()
                                rotationZ = tilt.value
                                transformOrigin = TransformOrigin(0.5f, 1f)
                                val pop = 1f + (1f - frameScale.value.coerceAtMost(1f)) * 0.2f
                                scaleX = pop
                                scaleY = pop
                            },
                    )
                }
            }

            Spacer(Modifier.height(30.dp))

            // Letter cascade
            Row(horizontalArrangement = Arrangement.Center) {
                title.forEachIndexed { i, ch ->
                    val start = i / title.length.toFloat() * 0.7f
                    val local = ((titleProgress.value - start) / 0.3f).coerceIn(0f, 1f)
                    Text(
                        ch.toString(),
                        style = Sumire.type.hero().copy(fontSize = 38.sp, color = Cream),
                        modifier = Modifier.graphicsLayer {
                            alpha = local
                            translationY = (1f - local) * 26.dp.toPx()
                            rotationZ = (1f - local) * -12f
                        },
                    )
                }
            }
            Spacer(Modifier.height(6.dp))
            Text(
                "デイリー・スミレ",
                style = Sumire.type.small().copy(fontSize = 13.sp, letterSpacing = 4.sp, fontWeight = FontWeight.Bold),
                color = Cream.copy(alpha = 0.75f * titleProgress.value),
            )
        }

        // progress + status
        Column(
            Modifier.align(Alignment.BottomCenter).padding(bottom = 64.dp).fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                Modifier
                    .width(140.dp)
                    .height(6.dp)
                    .clip(RoundedCornerShape(50))
                    .background(Cream.copy(alpha = 0.2f)),
            ) {
                Box(
                    Modifier
                        .fillMaxWidth(progress.value)
                        .height(6.dp)
                        .clip(RoundedCornerShape(50))
                        .background(Cream),
                )
            }
            Spacer(Modifier.height(12.dp))
            Text(statusText, style = Sumire.type.small(), color = Cream.copy(alpha = 0.7f))
        }
    }
}

private fun DrawScope.drawPetal(center: Offset, size: Float, rotation: Float, color: Color, alpha: Float) {
    translate(center.x, center.y) {
        rotate(rotation, Offset.Zero) {
            val p = Path().apply {
                moveTo(0f, -size)
                cubicTo(size * 0.9f, -size * 0.6f, size * 0.7f, size * 0.6f, 0f, size)
                cubicTo(-size * 0.7f, size * 0.6f, -size * 0.9f, -size * 0.6f, 0f, -size)
                close()
            }
            drawPath(p, color.copy(alpha = alpha.coerceIn(0f, 1f)))
        }
    }
}

private fun DrawScope.drawSparkle(center: Offset, r: Float, color: Color) {
    if (r <= 0f) return
    val p = Path()
    for (i in 0 until 8) {
        val ang = i * PI.toFloat() / 4f - PI.toFloat() / 2f
        val rad = if (i % 2 == 0) r else r * 0.28f
        val x = center.x + cos(ang) * rad
        val y = center.y + sin(ang) * rad
        if (i == 0) p.moveTo(x, y) else p.lineTo(x, y)
    }
    p.close()
    drawPath(p, color)
}
