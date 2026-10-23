package com.kairo.planner.ui.health

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kairo.planner.core.fmt
import com.kairo.planner.model.TrendPoint
import com.kairo.planner.ui.theme.Sumire
import kotlinx.datetime.LocalDate
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/**
 * Weight trend: raw weigh-ins as dots, 7-day moving average as a smooth line, goal as a dashed line.
 * X axis is calendar time (gaps stay gaps). Drag/tap to inspect a day.
 */
@Composable
fun WeightChart(points: List<TrendPoint>, goal: Double?, modifier: Modifier = Modifier, onSelect: (TrendPoint?) -> Unit = {}) {
    val c = Sumire.colors
    val measurer = rememberTextMeasurer()
    val reveal = remember { Animatable(0f) }
    LaunchedEffect(points.size) {
        reveal.snapTo(0f)
        reveal.animateTo(1f, tween(900, easing = FastOutSlowInEasing))
    }
    var selected by remember(points) { mutableStateOf<Int?>(null) }
    val labelStyle = Sumire.type.small().copy(fontSize = 10.sp, color = c.inkMuted)

    if (points.isEmpty()) {
        Box(modifier.fillMaxWidth().height(180.dp))
        return
    }
    val days = points.map { LocalDate.parse(it.date).toEpochDays().toFloat() }
    val minDay = days.first()
    val maxDay = max(days.last(), minDay + 1f)
    val values = points.flatMap { listOf(it.weight, it.movingAvg) } + listOfNotNull(goal?.takeIf { it > 0 })
    var lo = values.min()
    var hi = values.max()
    if (hi - lo < 2.0) { val mid = (hi + lo) / 2; lo = mid - 1.0; hi = mid + 1.0 }
    val pad = (hi - lo) * 0.12
    lo -= pad; hi += pad

    fun pick(x: Float, width: Float, left: Float, right: Float): Int {
        val day = minDay + (x - left) / (width - left - right) * (maxDay - minDay)
        return days.indices.minBy { abs(days[it] - day) }
    }

    Canvas(
        modifier
            .fillMaxWidth()
            .height(190.dp)
            .pointerInput(points) {
                detectTapGestures { o ->
                    val i = pick(o.x, size.width.toFloat(), 34.dp.toPx(), 8.dp.toPx())
                    selected = if (selected == i) null else i
                    onSelect(selected?.let { points[it] })
                }
            }
            .pointerInput(points) {
                detectDragGestures(onDragEnd = { }) { change, _ ->
                    val i = pick(change.position.x, size.width.toFloat(), 34.dp.toPx(), 8.dp.toPx())
                    selected = i
                    onSelect(points[i])
                }
            },
    ) {
        val left = 34.dp.toPx()
        val right = 8.dp.toPx()
        val top = 8.dp.toPx()
        val bottom = 20.dp.toPx()
        val w = size.width - left - right
        val h = size.height - top - bottom
        fun x(day: Float) = left + (day - minDay) / (maxDay - minDay) * w
        fun y(v: Double) = top + ((hi - v) / (hi - lo) * h).toFloat()

        // grid + labels
        val steps = 4
        for (i in 0..steps) {
            val v = lo + (hi - lo) * i / steps
            val yy = y(v)
            drawLine(c.line.copy(alpha = 0.08f), Offset(left, yy), Offset(size.width - right, yy), 1.dp.toPx())
            drawLabel(measurer, v.fmt(0), Offset(0f, yy - 7.dp.toPx()), labelStyle)
        }

        clipRect(right = left + w * reveal.value + right) {
            // goal line
            if (goal != null && goal > 0 && goal in lo..hi) {
                val gy = y(goal)
                drawLine(c.ochre, Offset(left, gy), Offset(size.width - right, gy), 1.5.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 8f)))
            }
            // moving average: smooth cubic path + soft fill
            val pts = points.mapIndexed { i, p -> Offset(x(days[i]), y(p.movingAvg)) }
            val path = Path()
            pts.forEachIndexed { i, p ->
                if (i == 0) path.moveTo(p.x, p.y) else {
                    val prev = pts[i - 1]
                    val cx = (prev.x + p.x) / 2
                    path.cubicTo(cx, prev.y, cx, p.y, p.x, p.y)
                }
            }
            if (pts.size > 1) {
                val fill = Path().apply {
                    addPath(path)
                    lineTo(pts.last().x, top + h)
                    lineTo(pts.first().x, top + h)
                    close()
                }
                drawPath(fill, Brush.verticalGradient(listOf(c.matcha.copy(alpha = 0.22f), Color.Transparent), startY = top, endY = top + h))
                drawPath(path, c.matcha, style = Stroke(3.dp.toPx(), cap = StrokeCap.Round))
            }
            // raw points
            points.forEachIndexed { i, p ->
                val o = Offset(x(days[i]), y(p.weight))
                drawCircle(c.card, 4.dp.toPx(), o)
                drawCircle(c.ink, 4.dp.toPx(), o, style = Stroke(1.5.dp.toPx()))
            }
        }

        // selection
        selected?.let { i ->
            val p = points[i]
            val sx = x(days[i])
            drawLine(c.ink.copy(alpha = 0.4f), Offset(sx, top), Offset(sx, top + h), 1.dp.toPx())
            drawCircle(c.matcha, 6.dp.toPx(), Offset(sx, y(p.weight)))
            val text = "${p.weight.fmt(1)} · ${p.date.takeLast(5)}"
            val layout = measurer.measure(text, Sumire_type_small_bold)
            val bx = min(max(left, sx - layout.size.width / 2f - 8.dp.toPx()), size.width - layout.size.width - 16.dp.toPx())
            drawRoundRect(c.ink, Offset(bx, top), Size(layout.size.width + 16.dp.toPx(), layout.size.height + 8.dp.toPx()), CornerRadius(8.dp.toPx()))
            drawText(layout, color = c.canvas, topLeft = Offset(bx + 8.dp.toPx(), top + 4.dp.toPx()))
        }

        // first/last date labels
        drawLabel(measurer, points.first().date.takeLast(5), Offset(left, size.height - 14.dp.toPx()), labelStyle)
        val lastLabel = points.last().date.takeLast(5)
        val lw = measurer.measure(lastLabel, labelStyle).size.width
        drawLabel(measurer, lastLabel, Offset(size.width - right - lw, size.height - 14.dp.toPx()), labelStyle)
    }
}

private val Sumire_type_small_bold = androidx.compose.ui.text.TextStyle(fontSize = 11.sp, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawLabel(m: TextMeasurer, text: String, at: Offset, style: androidx.compose.ui.text.TextStyle) {
    drawText(m, text, at, style)
}
