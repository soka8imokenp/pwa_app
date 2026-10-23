package com.kairo.planner.domain.health

import com.kairo.planner.core.Time
import com.kairo.planner.core.daysTo
import com.kairo.planner.core.plusDays
import com.kairo.planner.core.round
import com.kairo.planner.model.HealthGoal
import com.kairo.planner.model.PaceKind
import com.kairo.planner.model.TrendPoint
import com.kairo.planner.model.WeightLog
import com.kairo.planner.model.WeightPace
import kotlinx.datetime.LocalDate
import kotlin.math.abs
import kotlin.math.ceil

object WeightTrend {

    /** Drops impossible values and scale glitches (e.g. a half-weight packet) relative to the median. */
    fun filterOutliers(logs: List<WeightLog>): List<WeightLog> {
        val valid = logs.filter { it.weight in 20.0..350.0 }
        if (valid.size <= 2) return valid
        val sorted = valid.map { it.weight }.sorted()
        val median = sorted[sorted.size / 2]
        return valid.filter { it.weight >= median * 0.6 && it.weight <= median * 1.6 }
    }

    /**
     * One value per day. Morning weigh-ins are the most comparable, so the earliest reading of the day wins,
     * except that a reading with full body composition beats a bare one.
     */
    fun consolidateByDay(logs: List<WeightLog>): List<WeightLog> =
        logs.groupBy { it.date }
            .map { (_, day) ->
                val withComp = day.filter { it.composition?.fromImpedance == true }
                (withComp.ifEmpty { day }).minBy { it.measuredAt }
            }
            .sortedBy { it.date }

    fun daily(logs: List<WeightLog>): List<WeightLog> = consolidateByDay(filterOutliers(logs))

    /** Calendar-window moving average (not "last N entries"), so gaps don't distort the trend. */
    fun movingAverage(logs: List<WeightLog>, windowDays: Int = 7): List<TrendPoint> {
        val days = daily(logs)
        if (days.isEmpty()) return emptyList()
        val parsed = days.mapNotNull { l -> Time.parse(l.date)?.let { it to l.weight } }
        return parsed.map { (date, weight) ->
            val from = date.plusDays(-(windowDays - 1))
            val window = parsed.filter { it.first in from..date }.map { it.second }
            TrendPoint(date.toString(), weight, window.average().round(2))
        }
    }

    fun pace(logs: List<WeightLog>): WeightPace {
        val trend = movingAverage(logs)
        if (trend.size < 2) return WeightPace(0.0, PaceKind.ESTABLISHING)
        val latest = trend.last()
        val latestDate = LocalDate.parse(latest.date)
        // Compare smoothed values ~1-4 weeks apart.
        val base = trend.dropLast(1).lastOrNull {
            val d = LocalDate.parse(it.date).daysTo(latestDate)
            d in 7..28
        } ?: trend.first()
        val days = LocalDate.parse(base.date).daysTo(latestDate)
        if (days < 3) return WeightPace(0.0, PaceKind.ESTABLISHING)
        val perWeek = ((latest.movingAvg - base.movingAvg) / days * 7).round(2)
        val kind = when {
            perWeek <= -1.0 -> PaceKind.AGGRESSIVE_LOSS
            perWeek < -0.15 -> PaceKind.OPTIMAL_LOSS
            perWeek <= 0.15 -> PaceKind.MAINTAINING
            perWeek <= 0.5 -> PaceKind.LEAN_GAIN
            else -> PaceKind.FAST_GAIN
        }
        return WeightPace(perWeek, kind)
    }

    /** Projected date to reach the goal. Uses the real pace only when it moves towards the goal. */
    fun projectGoal(current: Double, target: Double, goal: HealthGoal, pace: WeightPace): Pair<LocalDate?, Int> {
        val delta = target - current
        if (target <= 0 || abs(delta) <= 0.2) return null to 0
        val movingTowards = (delta < 0 && pace.kgPerWeek < -0.1) || (delta > 0 && pace.kgPerWeek > 0.1)
        val rate = when {
            movingTowards -> abs(pace.kgPerWeek).coerceAtMost(1.0)
            goal == HealthGoal.GAIN -> 0.3
            else -> 0.5
        }
        val weeks = ceil(abs(delta) / rate).toInt().coerceAtLeast(1)
        return Time.today().plusDays(weeks * 7) to weeks
    }
}
