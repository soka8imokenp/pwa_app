package com.kairo.planner.ui

import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.runtime.staticCompositionLocalOf
import com.kairo.planner.core.pad2
import com.kairo.planner.i18n.Strings
import kotlinx.datetime.LocalDate
import kotlinx.datetime.isoDayNumber

val LocalAppState = staticCompositionLocalOf<AppState> { error("AppState not provided") }

val LocalSnackbar = staticCompositionLocalOf<SnackbarHostState> { error("Snackbar not provided") }

suspend fun SnackbarHostState.showUndo(message: String, actionLabel: String, onUndo: () -> Unit) {
    currentSnackbarData?.dismiss()
    val r = showSnackbar(message, actionLabel = actionLabel, withDismissAction = false, duration = SnackbarDuration.Short)
    if (r == SnackbarResult.ActionPerformed) onUndo()
}

fun Strings.dayLabel(date: LocalDate, today: LocalDate): String = when (date) {
    today -> this.today
    LocalDate.fromEpochDays(today.toEpochDays() - 1) -> yesterday
    LocalDate.fromEpochDays(today.toEpochDays() + 1) -> tomorrow
    else -> weekdaysFull[date.dayOfWeek.isoDayNumber - 1]
}

fun Strings.dateLong(date: LocalDate): String = "${date.day} ${monthsShort[date.month.ordinal]} · ${weekdaysFull[date.dayOfWeek.isoDayNumber - 1]}"

fun Strings.dateShort(date: LocalDate): String = "${date.day} ${monthsShort[date.month.ordinal]}"

fun Strings.dateShort(key: String): String = runCatching { dateShort(LocalDate.parse(key)) }.getOrDefault(key)

fun minuteOfDayLabel(m: Int): String = "${(m / 60).pad2()}:${(m % 60).pad2()}"
