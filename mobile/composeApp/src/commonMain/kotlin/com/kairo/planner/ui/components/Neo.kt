package com.kairo.planner.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kairo.planner.platform.LocalPlatform
import com.kairo.planner.ui.theme.Dimens
import com.kairo.planner.ui.theme.Sumire

/**
 * The signature neo-brutalist surface: ink border + hard offset shadow.
 * When clickable, the card "presses into" its shadow with a spring – the tactile feel of the app.
 */
@Composable
fun NeoCard(
    modifier: Modifier = Modifier,
    color: Color = Sumire.colors.card,
    radius: Dp = Dimens.radius,
    shadow: Dp = Dimens.shadow,
    contentPadding: PaddingValues = PaddingValues(16.dp),
    onClick: (() -> Unit)? = null,
    onLongClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val c = Sumire.colors
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val press by animateDpAsState(
        if (pressed && onClick != null) shadow else 0.dp,
        spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessHigh),
    )
    val shape = RoundedCornerShape(radius)
    val platform = LocalPlatform.current
    Box(
        modifier
            .drawBehind {
                if (shadow > 0.dp) {
                    val s = shadow.toPx()
                    drawRoundRect(
                        color = c.line,
                        topLeft = Offset(s, s),
                        size = Size(size.width, size.height),
                        cornerRadius = CornerRadius(radius.toPx()),
                    )
                }
            }
            .offset(press, press)
            .clip(shape)
            .background(color)
            .border(Dimens.border, c.line, shape)
            .then(
                if (onClick != null) {
                    Modifier.combinedClickableCompat(
                        interaction = interaction,
                        onClick = { platform.haptic(Haptic.TAP); onClick() },
                        onLongClick = onLongClick?.let { lc -> { platform.haptic(Haptic.LONG); lc() } },
                    )
                } else Modifier,
            ),
    ) {
        Column(Modifier.padding(contentPadding), content = content)
    }
}

enum class Haptic { TAP, LONG, SUCCESS, WARNING, TICK }

enum class NeoButtonStyle { PRIMARY, SECONDARY, GHOST, DANGER }

@Composable
fun NeoButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    style: NeoButtonStyle = NeoButtonStyle.PRIMARY,
    enabled: Boolean = true,
    compact: Boolean = false,
) {
    val c = Sumire.colors
    val bg = when (style) {
        NeoButtonStyle.PRIMARY -> c.matcha
        NeoButtonStyle.SECONDARY -> c.card
        NeoButtonStyle.GHOST -> Color.Transparent
        NeoButtonStyle.DANGER -> c.terracotta
    }
    val fg = when (style) {
        NeoButtonStyle.PRIMARY, NeoButtonStyle.DANGER -> c.onAccent
        else -> c.ink
    }
    val alpha by animateFloatAsState(if (enabled) 1f else 0.45f)
    val shadow = if (style == NeoButtonStyle.GHOST) 0.dp else 2.dp
    NeoCard(
        modifier = modifier.graphicsLayer { this.alpha = alpha },
        color = bg,
        radius = 14.dp,
        shadow = shadow,
        contentPadding = PaddingValues(horizontal = if (compact) 12.dp else 18.dp, vertical = if (compact) 8.dp else 13.dp),
        onClick = if (enabled) onClick else null,
    ) {
        Row(
            Modifier.align(Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            if (icon != null) {
                Icon(icon, null, tint = fg, modifier = Modifier.size(if (compact) 16.dp else 18.dp))
                Spacer(Modifier.width(8.dp))
            }
            Text(
                text,
                style = Sumire.type.bodyStrong().copy(fontSize = if (compact) 13.sp else 15.sp, fontWeight = FontWeight.Bold),
                color = fg,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
fun NeoIconButton(
    icon: ImageVector,
    contentDescription: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    color: Color = Sumire.colors.card,
    tint: Color = Sumire.colors.ink,
    size: Dp = 40.dp,
) {
    NeoCard(
        modifier = modifier.size(size),
        color = color,
        radius = 12.dp,
        shadow = 2.dp,
        contentPadding = PaddingValues(0.dp),
        onClick = onClick,
    ) {
        Box(Modifier.size(size - Dimens.border * 2), contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription, tint = tint, modifier = Modifier.size(size * 0.48f))
        }
    }
}

@Composable
fun NeoChip(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    color: Color = Sumire.colors.matchaSoft,
    leading: String? = null,
) {
    val c = Sumire.colors
    val bg by animateColorAsState(if (selected) color else c.card, tween(180))
    val shape = RoundedCornerShape(50)
    val platform = LocalPlatform.current
    Row(
        modifier
            .clip(shape)
            .background(bg)
            .border(if (selected) Dimens.border else 1.dp, if (selected) c.line else c.line.copy(alpha = 0.35f), shape)
            .clickable { platform.haptic(Haptic.TICK); onClick() }
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (leading != null) {
            Text(leading, fontSize = 14.sp)
            Spacer(Modifier.width(6.dp))
        }
        Text(text, style = Sumire.type.small().copy(fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium), color = c.ink)
    }
}

@Composable
fun NeoBadge(text: String, color: Color = Sumire.colors.matchaSoft, modifier: Modifier = Modifier, textColor: Color = Sumire.colors.ink) {
    val shape = RoundedCornerShape(8.dp)
    Text(
        text.uppercase(),
        modifier = modifier
            .clip(shape)
            .background(color)
            .border(1.25.dp, Sumire.colors.line, shape)
            .padding(horizontal = 7.dp, vertical = 3.dp),
        style = Sumire.type.label().copy(fontSize = 9.5.sp, letterSpacing = 0.8.sp),
        color = textColor,
        maxLines = 1,
    )
}

@Composable
fun SectionLabel(text: String, modifier: Modifier = Modifier, trailing: @Composable (RowScope.() -> Unit)? = null) {
    Row(modifier.fillMaxWidth().padding(top = 6.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(text.uppercase(), style = Sumire.type.label(), color = Sumire.colors.inkMuted, modifier = Modifier.weight(1f))
        trailing?.invoke(this)
    }
}

@Composable
fun ProgressRing(
    progress: Float,
    modifier: Modifier = Modifier,
    color: Color = Sumire.colors.matcha,
    track: Color = Sumire.colors.sand,
    stroke: Dp = 10.dp,
    content: @Composable BoxScope.() -> Unit = {},
) {
    val animated by animateFloatAsState(progress.coerceIn(0f, 1.5f), spring(dampingRatio = 0.8f, stiffness = 60f))
    Box(modifier, contentAlignment = Alignment.Center) {
        Canvas(Modifier.matchParentSize().padding(stroke / 2)) {
            val st = Stroke(stroke.toPx(), cap = StrokeCap.Round)
            drawArc(track, -90f, 360f, false, style = st)
            drawArc(color, -90f, 360f * animated.coerceAtMost(1f), false, style = st)
            if (animated > 1f) {
                drawArc(color.copy(alpha = 0.55f), -90f, 360f * (animated - 1f), false, style = Stroke(stroke.toPx() * 0.55f, cap = StrokeCap.Round))
            }
        }
        content()
    }
}

@Composable
fun ProgressBar(
    progress: Float,
    modifier: Modifier = Modifier,
    color: Color = Sumire.colors.matcha,
    height: Dp = 10.dp,
) {
    val c = Sumire.colors
    val animated by animateFloatAsState(progress.coerceIn(0f, 1f), spring(dampingRatio = 0.85f, stiffness = 80f))
    val shape = RoundedCornerShape(50)
    Box(
        modifier
            .height(height)
            .clip(shape)
            .background(c.sand)
            .border(1.25.dp, c.line, shape),
    ) {
        Box(
            Modifier
                .fillMaxWidth(animated)
                .height(height)
                .clip(shape)
                .background(color),
        )
    }
}

@Composable
fun IconBubble(icon: ImageVector, bg: Color, tint: Color = Sumire.colors.ink, size: Dp = 38.dp) {
    Box(
        Modifier
            .size(size)
            .clip(RoundedCornerShape(12.dp))
            .background(bg)
            .border(1.5.dp, Sumire.colors.line, RoundedCornerShape(12.dp)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(size * 0.5f))
    }
}

@Composable
fun EmojiBubble(emoji: String, bg: Color, size: Dp = 38.dp) {
    Box(
        Modifier
            .size(size)
            .clip(RoundedCornerShape(12.dp))
            .background(bg)
            .border(1.5.dp, Sumire.colors.line, RoundedCornerShape(12.dp)),
        contentAlignment = Alignment.Center,
    ) {
        Text(emoji, fontSize = (size.value * 0.45f).sp)
    }
}

@Composable
fun NeoTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    singleLine: Boolean = true,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Done,
    onImeAction: () -> Unit = {},
    textStyle: TextStyle? = null,
    minLines: Int = 1,
    trailing: @Composable (() -> Unit)? = null,
    leading: @Composable (() -> Unit)? = null,
) {
    val c = Sumire.colors
    val shape = RoundedCornerShape(14.dp)
    val style = (textStyle ?: Sumire.type.body()).copy(color = c.ink)
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = singleLine,
        minLines = minLines,
        textStyle = style,
        cursorBrush = SolidColor(c.matcha),
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
        keyboardActions = KeyboardActions(onAny = { onImeAction() }),
        modifier = modifier,
        decorationBox = { inner ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(shape)
                    .background(c.surface)
                    .border(1.5.dp, c.line, shape)
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = if (singleLine) Alignment.CenterVertically else Alignment.Top,
            ) {
                if (leading != null) {
                    leading()
                    Spacer(Modifier.width(10.dp))
                }
                Box(Modifier.weight(1f)) {
                    if (value.isEmpty()) Text(placeholder, style = style.copy(color = c.inkMuted.copy(alpha = 0.7f)))
                    inner()
                }
                if (trailing != null) {
                    Spacer(Modifier.width(8.dp))
                    trailing()
                }
            }
        },
    )
}

@Composable
fun EmptyState(emoji: String, title: String, subtitle: String, modifier: Modifier = Modifier, action: (@Composable () -> Unit)? = null) {
    Column(modifier.fillMaxWidth().padding(vertical = 28.dp, horizontal = 24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(emoji, fontSize = 40.sp)
        Spacer(Modifier.height(10.dp))
        Text(title, style = Sumire.type.section(), color = Sumire.colors.ink, textAlign = TextAlign.Center)
        Spacer(Modifier.height(4.dp))
        Text(subtitle, style = Sumire.type.small(), color = Sumire.colors.inkMuted, textAlign = TextAlign.Center)
        if (action != null) {
            Spacer(Modifier.height(16.dp))
            action()
        }
    }
}

@Composable
fun NeoCheckbox(checked: Boolean, onToggle: () -> Unit, color: Color = Sumire.colors.matcha, size: Dp = 26.dp) {
    val c = Sumire.colors
    val bg by animateColorAsState(if (checked) color else c.card, tween(160))
    val scale by animateFloatAsState(if (checked) 1f else 0f, spring(dampingRatio = 0.45f, stiffness = 500f))
    val platform = LocalPlatform.current
    Box(
        Modifier
            .size(size)
            .clip(RoundedCornerShape(8.dp))
            .background(bg)
            .border(Dimens.border, c.line, RoundedCornerShape(8.dp))
            .clickable {
                platform.haptic(if (checked) Haptic.TICK else Haptic.SUCCESS)
                onToggle()
            },
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            Icons.Rounded.Check,
            null,
            tint = c.onAccent,
            modifier = Modifier.size(size * 0.7f).graphicsLayer { scaleX = scale; scaleY = scale },
        )
    }
}

@Composable
fun Dot(color: Color, size: Dp = 8.dp) {
    Box(Modifier.size(size).clip(CircleShape).background(color).border(1.dp, Sumire.colors.line, CircleShape))
}

@Composable
fun StatTile(label: String, value: String, unit: String = "", modifier: Modifier = Modifier, color: Color = Sumire.colors.card, sub: String? = null) {
    NeoCard(modifier, color = color, contentPadding = PaddingValues(14.dp)) {
        Text(label.uppercase(), style = Sumire.type.label().copy(fontSize = 10.sp), color = Sumire.colors.inkMuted, maxLines = 1)
        Spacer(Modifier.height(6.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            Text(value, style = Sumire.type.number(22), color = Sumire.colors.ink, maxLines = 1)
            if (unit.isNotEmpty()) {
                Spacer(Modifier.width(3.dp))
                Text(unit, style = Sumire.type.small(), color = Sumire.colors.inkMuted, modifier = Modifier.padding(bottom = 3.dp))
            }
        }
        if (sub != null) {
            Spacer(Modifier.height(2.dp))
            Text(sub, style = Sumire.type.small().copy(fontSize = 11.sp), color = Sumire.colors.inkMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
fun Divider(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().height(1.dp).background(Sumire.colors.line.copy(alpha = 0.15f)))
}
