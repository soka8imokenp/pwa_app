package com.kairo.planner.core

import kotlinx.datetime.DateTimeUnit
import kotlinx.datetime.DayOfWeek
import kotlinx.datetime.LocalDate
import kotlinx.datetime.LocalDateTime
import kotlinx.datetime.TimeZone
import kotlinx.datetime.atStartOfDayIn
import kotlinx.datetime.daysUntil
import kotlinx.datetime.isoDayNumber
import kotlinx.datetime.minus
import kotlinx.datetime.plus
import kotlinx.datetime.toLocalDateTime
import kotlin.time.Clock
import kotlin.time.Instant

/** All date math is done in the device's local calendar, never in UTC, so "today" matches the user's wall clock. */
object Time {
    fun nowMs(): Long = Clock.System.now().toEpochMilliseconds()

    fun zone(): TimeZone = TimeZone.currentSystemDefault()

    fun now(): LocalDateTime = Clock.System.now().toLocalDateTime(zone())

    fun today(): LocalDate = now().date

    fun todayKey(): String = today().toString()

    fun dateOf(epochMs: Long): LocalDate = Instant.fromEpochMilliseconds(epochMs).toLocalDateTime(zone()).date

    fun dateTimeOf(epochMs: Long): LocalDateTime = Instant.fromEpochMilliseconds(epochMs).toLocalDateTime(zone())

    fun startOfDayMs(date: LocalDate): Long = date.atStartOfDayIn(zone()).toEpochMilliseconds()

    fun endOfDayMs(date: LocalDate): Long = startOfDayMs(date.plus(1, DateTimeUnit.DAY)) - 1

    fun parse(key: String): LocalDate? = runCatching { LocalDate.parse(key) }.getOrNull()

    fun hhmm(epochMs: Long): String {
        val t = dateTimeOf(epochMs)
        return "${t.hour.pad2()}:${t.minute.pad2()}"
    }

    fun currentHhmm(): String {
        val t = now()
        return "${t.hour.pad2()}:${t.minute.pad2()}"
    }
}

fun Int.pad2(): String = toString().padStart(2, '0')

fun LocalDate.key(): String = toString()

fun LocalDate.minusDays(days: Int): LocalDate = minus(days, DateTimeUnit.DAY)

fun LocalDate.plusDays(days: Int): LocalDate = plus(days, DateTimeUnit.DAY)

fun LocalDate.daysTo(other: LocalDate): Int = daysUntil(other)

/** Monday-based start of week, matching the RU/UZ calendar convention. */
fun LocalDate.startOfWeek(): LocalDate = minusDays(dayOfWeek.isoDayNumber - 1)

val DayOfWeek.code: String
    get() = when (this) {
        DayOfWeek.MONDAY -> "mon"
        DayOfWeek.TUESDAY -> "tue"
        DayOfWeek.WEDNESDAY -> "wed"
        DayOfWeek.THURSDAY -> "thu"
        DayOfWeek.FRIDAY -> "fri"
        DayOfWeek.SATURDAY -> "sat"
        DayOfWeek.SUNDAY -> "sun"
    }

val ALL_DAY_CODES = listOf("mon", "tue", "wed", "thu", "fri", "sat", "sun")

fun ClosedRange<LocalDate>.days(): List<LocalDate> {
    val out = ArrayList<LocalDate>()
    var d = start
    while (d <= endInclusive) {
        out += d
        d = d.plusDays(1)
    }
    return out
}
