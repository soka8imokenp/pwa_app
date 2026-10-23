package com.kairo.planner.model

import kotlinx.serialization.Serializable

enum class Gender(val code: String) {
    MALE("male"), FEMALE("female");

    companion object {
        fun of(code: String?) = if (code == "female") FEMALE else MALE
    }
}

enum class ActivityLevel(val code: String, val multiplier: Double) {
    SEDENTARY("sedentary", 1.2),
    LIGHT("light", 1.375),
    MODERATE("moderate", 1.55),
    VERY_ACTIVE("very_active", 1.725);

    companion object {
        fun of(code: String?) = entries.firstOrNull { it.code == code } ?: MODERATE
    }
}

enum class HealthGoal(val code: String) {
    LOSE("lose"), MAINTAIN("maintain"), GAIN("gain");

    companion object {
        fun of(code: String?) = entries.firstOrNull { it.code == code } ?: MAINTAIN
    }
}

enum class MealType(val code: String) {
    BREAKFAST("breakfast"), LUNCH("lunch"), DINNER("dinner"), SNACK("snack");

    companion object {
        fun of(code: String?) = entries.firstOrNull { it.code == code } ?: SNACK

        /** Picks the slot from a wall-clock time (HH:MM). */
        fun forTime(hhmm: String): MealType {
            val parts = hhmm.split(":")
            val minutes = (parts.getOrNull(0)?.toIntOrNull() ?: 12) * 60 + (parts.getOrNull(1)?.toIntOrNull() ?: 0)
            return when (minutes) {
                in 5 * 60 until 11 * 60 + 30 -> BREAKFAST
                in 11 * 60 + 30 until 16 * 60 + 30 -> LUNCH
                in 16 * 60 + 30 until 22 * 60 + 30 -> DINNER
                else -> SNACK
            }
        }
    }
}

enum class WorkoutCategory(val code: String, val met: Double) {
    STRENGTH("strength", 5.0),
    CARDIO("cardio", 7.0),
    RUN("run", 9.8),
    WALK("walk", 3.5),
    CYCLING("cycling", 7.5),
    SWIM("swim", 8.0),
    HIIT("hiit", 8.0),
    YOGA("yoga", 2.5),
    SPORTS("sports", 6.5);

    companion object {
        /** Accepts the legacy web codes too (gym, stretch) so imported backups keep their meaning. */
        fun of(code: String?) = when (code) {
            "gym" -> STRENGTH
            "stretch" -> YOGA
            else -> entries.firstOrNull { it.code == code } ?: CARDIO
        }
    }
}

data class HealthProfile(
    val name: String = "",
    val age: Int = 0,
    val gender: Gender = Gender.MALE,
    val heightCm: Double = 0.0,
    val currentWeight: Double = 0.0,
    val targetWeight: Double = 0.0,
    val waistCm: Double = 0.0,
    val activityLevel: ActivityLevel = ActivityLevel.MODERATE,
    val goal: HealthGoal = HealthGoal.MAINTAIN,
    val stepGoal: Int = 10_000,
    val waterGoalMl: Int = 0,
    val calorieGoalOverride: Int = 0,
    val updatedAt: Long = 0,
) {
    val isComplete: Boolean get() = age > 0 && heightCm > 0 && currentWeight > 0
}

@Serializable
data class BodyComposition(
    val bmi: Double,
    val bodyFatPercent: Double,
    val muscleMassKg: Double,
    val waterPercent: Double,
    val boneMassKg: Double,
    val visceralFat: Int,
    val bmr: Int,
    val leanMassKg: Double,
    val bodyAge: Int,
    val proteinPercent: Double,
    val idealWeightKg: Double,
    val bodyScore: Int,
    val bodyType: BodyType,
    val deductions: List<ScoreDeduction> = emptyList(),
    /** True when the values come from a real impedance reading rather than an estimate. */
    val fromImpedance: Boolean = true,
)

@Serializable
data class ScoreDeduction(val metric: BodyMetric, val points: Double)

@Serializable
enum class BodyType {
    OBESE, OVERWEIGHT, THICK_SET, LACK_EXERCISE, BALANCED, BALANCED_MUSCULAR, SKINNY, BALANCED_SKINNY, SKINNY_MUSCULAR
}

@Serializable
enum class BodyMetric { BMI, FAT, MUSCLE, WATER, VISCERAL, BONE, BMR, PROTEIN, BODY_AGE, IDEAL_WEIGHT }

enum class MetricStatus { OPTIMAL, ATTENTION, ALERT }

data class MetricItem(
    val metric: BodyMetric,
    val value: Double,
    val unit: String,
    val decimals: Int,
    val status: MetricStatus,
    val rangeLow: Double?,
    val rangeHigh: Double?,
)

data class WeightLog(
    val id: String,
    val date: String,
    val measuredAt: Long,
    val weight: Double,
    val bmi: Double,
    val bodyFat: Double?,
    val waistCm: Double?,
    val impedance: Int?,
    val note: String,
    val source: String,
    val composition: BodyComposition?,
    val externalId: String?,
)

data class MealLog(
    val id: String,
    val date: String,
    val time: String,
    val name: String,
    val mealType: MealType,
    val kcal: Int,
    val protein: Double,
    val carbs: Double,
    val fat: Double,
    val grams: Int?,
    val aiEstimated: Boolean,
    val createdAt: Long,
)

data class WaterLog(val id: String, val date: String, val amountMl: Int, val createdAt: Long)

data class WorkoutLog(
    val id: String,
    val date: String,
    val title: String,
    val category: WorkoutCategory,
    val durationMinutes: Int,
    val calories: Int,
    val notes: String,
    val source: String,
    val createdAt: Long,
)

data class StepLog(
    val date: String,
    val steps: Int,
    val goal: Int,
    val calories: Int,
    val distanceM: Int,
    val activeMinutes: Int,
    val source: String,
)

data class HealthTargets(
    val bmi: Double,
    val bmr: Int,
    val tdee: Int,
    val calories: Int,
    val proteinG: Int,
    val carbsG: Int,
    val fatG: Int,
    val waterMl: Int,
    val idealWeightMin: Double,
    val idealWeightMax: Double,
    val idealWeight: Double,
    val waistToHeight: Double?,
)

data class NutritionTotals(
    val kcal: Int = 0,
    val protein: Double = 0.0,
    val carbs: Double = 0.0,
    val fat: Double = 0.0,
)

data class WeightPace(val kgPerWeek: Double, val kind: PaceKind)

enum class PaceKind { ESTABLISHING, AGGRESSIVE_LOSS, OPTIMAL_LOSS, MAINTAINING, LEAN_GAIN, FAST_GAIN }

data class TrendPoint(val date: String, val weight: Double, val movingAvg: Double)
