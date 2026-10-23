package com.kairo.planner.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kairo.planner.resources.Res
import com.kairo.planner.resources.jetbrains_mono
import com.kairo.planner.resources.plus_jakarta_sans
import com.kairo.planner.resources.space_grotesk
import org.jetbrains.compose.resources.Font

@Immutable
data class SumireColors(
    val canvas: Color,
    val card: Color,
    val surface: Color,
    val ink: Color,
    val inkMuted: Color,
    val line: Color,
    val matcha: Color,
    val matchaSoft: Color,
    val matchaDark: Color,
    val terracotta: Color,
    val terracottaSoft: Color,
    val ochre: Color,
    val ochreSoft: Color,
    val indigo: Color,
    val indigoSoft: Color,
    val plum: Color,
    val plumSoft: Color,
    val violet: Color,
    val violetSoft: Color,
    val sand: Color,
    val onAccent: Color,
    val isDark: Boolean,
)

val LightSumire = SumireColors(
    canvas = Color(0xFFF4F0EA),
    card = Color(0xFFFFFFFF),
    surface = Color(0xFFFAF8F5),
    ink = Color(0xFF24201D),
    inkMuted = Color(0xFF6B635B),
    line = Color(0xFF24201D),
    matcha = Color(0xFF3D6B52),
    matchaSoft = Color(0xFFDDE8DE),
    matchaDark = Color(0xFF2F5440),
    terracotta = Color(0xFFC25E40),
    terracottaSoft = Color(0xFFF7E3DC),
    ochre = Color(0xFFE09F3E),
    ochreSoft = Color(0xFFFBECCF),
    indigo = Color(0xFF476C85),
    indigoSoft = Color(0xFFDEE8EF),
    plum = Color(0xFFB85060),
    plumSoft = Color(0xFFF9E2E5),
    violet = Color(0xFF8E6BBF),
    violetSoft = Color(0xFFEDE5F7),
    sand = Color(0xFFE8E0D2),
    onAccent = Color(0xFFFFFFFF),
    isDark = false,
)

val DarkSumire = SumireColors(
    canvas = Color(0xFF151311),
    card = Color(0xFF211E1B),
    surface = Color(0xFF2A2623),
    ink = Color(0xFFF2ECE3),
    inkMuted = Color(0xFFA89F95),
    line = Color(0xFF4A433D),
    matcha = Color(0xFF7DB592),
    matchaSoft = Color(0xFF26382C),
    matchaDark = Color(0xFF9CCBAE),
    terracotta = Color(0xFFE38667),
    terracottaSoft = Color(0xFF3D2620),
    ochre = Color(0xFFF0BB58),
    ochreSoft = Color(0xFF3B3020),
    indigo = Color(0xFF86AECB),
    indigoSoft = Color(0xFF1F2D38),
    plum = Color(0xFFE08593),
    plumSoft = Color(0xFF3A2228),
    violet = Color(0xFFB79BE0),
    violetSoft = Color(0xFF2E2540),
    sand = Color(0xFF39332D),
    onAccent = Color(0xFF151311),
    isDark = true,
)

val LocalSumireColors = staticCompositionLocalOf { LightSumire }

object Dimens {
    val border = 1.75.dp
    val shadow = 2.5.dp
    val radius = 20.dp
    val radiusSmall = 14.dp
    val gutter = 16.dp
}

@Immutable
data class SumireType(
    val display: FontFamily,
    val body: FontFamily,
    val mono: FontFamily,
) {
    fun hero() = TextStyle(fontFamily = display, fontWeight = FontWeight.Bold, fontSize = 34.sp, letterSpacing = (-1.2).sp, lineHeight = 38.sp)
    fun title() = TextStyle(fontFamily = display, fontWeight = FontWeight.Bold, fontSize = 22.sp, letterSpacing = (-0.6).sp, lineHeight = 26.sp)
    fun section() = TextStyle(fontFamily = display, fontWeight = FontWeight.Bold, fontSize = 17.sp, letterSpacing = (-0.3).sp)
    fun label() = TextStyle(fontFamily = body, fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.1.sp)
    fun bodyStrong() = TextStyle(fontFamily = body, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, lineHeight = 21.sp)
    fun body() = TextStyle(fontFamily = body, fontWeight = FontWeight.Normal, fontSize = 15.sp, lineHeight = 21.sp)
    fun small() = TextStyle(fontFamily = body, fontWeight = FontWeight.Medium, fontSize = 12.5.sp, lineHeight = 17.sp)
    fun number(size: Int = 28) = TextStyle(fontFamily = mono, fontWeight = FontWeight.Bold, fontSize = size.sp, letterSpacing = (-0.5).sp)
}

val LocalSumireType = staticCompositionLocalOf<SumireType> { error("SumireType not provided") }

object Sumire {
    val colors: SumireColors
        @Composable get() = LocalSumireColors.current
    val type: SumireType
        @Composable get() = LocalSumireType.current
}

@Composable
private fun rememberSumireType(): SumireType {
    val display = FontFamily(
        Font(Res.font.space_grotesk, FontWeight.Medium),
        Font(Res.font.space_grotesk, FontWeight.SemiBold),
        Font(Res.font.space_grotesk, FontWeight.Bold),
    )
    val body = FontFamily(
        Font(Res.font.plus_jakarta_sans, FontWeight.Normal),
        Font(Res.font.plus_jakarta_sans, FontWeight.Medium),
        Font(Res.font.plus_jakarta_sans, FontWeight.SemiBold),
        Font(Res.font.plus_jakarta_sans, FontWeight.Bold),
        Font(Res.font.plus_jakarta_sans, FontWeight.ExtraBold),
    )
    val mono = FontFamily(
        Font(Res.font.jetbrains_mono, FontWeight.Medium),
        Font(Res.font.jetbrains_mono, FontWeight.Bold),
    )
    return SumireType(display, body, mono)
}

private fun SumireColors.toMaterial(): ColorScheme = if (isDark) {
    darkColorScheme(
        primary = matcha, onPrimary = onAccent, secondary = ochre, tertiary = terracotta,
        background = canvas, onBackground = ink, surface = card, onSurface = ink,
        surfaceVariant = surface, onSurfaceVariant = inkMuted, outline = line, error = plum,
    )
} else {
    lightColorScheme(
        primary = matcha, onPrimary = onAccent, secondary = ochre, tertiary = terracotta,
        background = canvas, onBackground = ink, surface = card, onSurface = ink,
        surfaceVariant = surface, onSurfaceVariant = inkMuted, outline = line, error = plum,
    )
}

@Composable
fun SumireTheme(dark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val colors = if (dark) DarkSumire else LightSumire
    val type = rememberSumireType()
    val typography = Typography(
        bodyLarge = type.body(),
        bodyMedium = type.body(),
        bodySmall = type.small(),
        titleLarge = type.title(),
        titleMedium = type.section(),
        labelLarge = type.bodyStrong(),
        labelMedium = type.small(),
        labelSmall = type.label(),
    )
    CompositionLocalProvider(LocalSumireColors provides colors, LocalSumireType provides type) {
        MaterialTheme(colorScheme = colors.toMaterial(), typography = typography, content = content)
    }
}

fun parseHexColor(hex: String, fallback: Color = Color(0xFF3D6B52)): Color {
    val h = hex.removePrefix("#")
    val v = h.toLongOrNull(16) ?: return fallback
    return when (h.length) {
        6 -> Color(0xFF000000 or v)
        8 -> Color(v)
        else -> fallback
    }
}
