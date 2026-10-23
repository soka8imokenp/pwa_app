package com.kairo.planner.core

import kotlin.math.abs
import kotlin.math.pow
import kotlin.math.roundToLong
import kotlin.uuid.Uuid

fun newId(): String = Uuid.random().toString()

fun Double.round(decimals: Int): Double {
    val f = 10.0.pow(decimals)
    return (this * f).roundToLong() / f
}

/** Locale-independent fixed-point formatting (String.format is JVM-only). */
fun Double.fmt(decimals: Int = 1): String {
    if (isNaN() || isInfinite()) return "—"
    val f = 10.0.pow(decimals).roundToLong()
    val scaled = (abs(this) * f).roundToLong()
    val sign = if (this < 0 && scaled != 0L) "-" else ""
    if (decimals == 0) return sign + scaled.toString()
    val intPart = scaled / f
    val frac = (scaled % f).toString().padStart(decimals, '0')
    return "$sign$intPart.$frac"
}

fun Float.fmt(decimals: Int = 1): String = toDouble().fmt(decimals)

/** Groups thousands with a thin space: 12 345. */
fun Long.grouped(): String {
    val s = abs(this).toString()
    val sb = StringBuilder()
    s.reversed().forEachIndexed { i, c ->
        if (i > 0 && i % 3 == 0) sb.append(' ')
        sb.append(c)
    }
    return (if (this < 0) "-" else "") + sb.reverse().toString()
}

fun Int.grouped(): String = toLong().grouped()

fun Int.signed(): String = if (this > 0) "+$this" else toString()

fun Double.signed(decimals: Int = 1): String = if (this > 0) "+" + fmt(decimals) else fmt(decimals)

fun Int.minutesLabel(h: String, m: String): String {
    val hours = this / 60
    val mins = this % 60
    return when {
        hours == 0 -> "$mins $m"
        mins == 0 -> "$hours $h"
        else -> "$hours $h $mins $m"
    }
}
