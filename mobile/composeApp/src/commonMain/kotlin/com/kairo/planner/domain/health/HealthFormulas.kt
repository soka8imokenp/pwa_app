package com.kairo.planner.domain.health

import com.kairo.planner.core.round
import com.kairo.planner.model.Gender
import com.kairo.planner.model.HealthGoal
import com.kairo.planner.model.HealthProfile
import com.kairo.planner.model.HealthTargets
import com.kairo.planner.model.WorkoutCategory
import kotlin.math.max
import kotlin.math.roundToInt

enum class BmiCategory { UNKNOWN, UNDERWEIGHT, NORMAL, OVERWEIGHT, OBESE }

object HealthFormulas {

    fun bmi(weightKg: Double, heightCm: Double): Double {
        if (weightKg <= 0 || heightCm <= 0) return 0.0
        val m = heightCm / 100.0
        return (weightKg / (m * m)).round(1)
    }

    fun bmiCategory(bmi: Double): BmiCategory = when {
        bmi <= 0 -> BmiCategory.UNKNOWN
        bmi < 18.5 -> BmiCategory.UNDERWEIGHT
        bmi < 25.0 -> BmiCategory.NORMAL
        bmi < 30.0 -> BmiCategory.OVERWEIGHT
        else -> BmiCategory.OBESE
    }

    /** Mifflin–St Jeor. */
    fun bmr(weightKg: Double, heightCm: Double, age: Int, gender: Gender): Int {
        if (weightKg <= 0 || heightCm <= 0 || age <= 0) return 0
        val base = 10 * weightKg + 6.25 * heightCm - 5 * age
        val v = if (gender == Gender.MALE) base + 5 else base - 161
        return max(800.0, v).roundToInt()
    }

    /** Deurenberg (1991) BMI-based body fat estimate, used when no impedance reading is available. */
    fun estimatedBodyFat(bmi: Double, age: Int, gender: Gender): Double {
        if (bmi <= 0) return 0.0
        val sex = if (gender == Gender.MALE) 1 else 0
        return (1.20 * bmi + 0.23 * age - 10.8 * sex - 5.4).coerceIn(3.0, 60.0).round(1)
    }

    fun targets(profile: HealthProfile): HealthTargets {
        val w = profile.currentWeight
        val h = profile.heightCm
        if (w <= 0 || h <= 0) {
            return HealthTargets(0.0, 0, 0, 0, 0, 0, 0, 2000, 0.0, 0.0, 0.0, null)
        }
        val bmi = bmi(w, h)
        val bmr = bmr(w, h, profile.age.coerceAtLeast(18), profile.gender)
        val tdee = (bmr * profile.activityLevel.multiplier).roundToInt()

        // A ~20% deficit is safer than a fixed −400 kcal for both small and large bodies.
        val goalCalories = when (profile.goal) {
            HealthGoal.LOSE -> max(if (profile.gender == Gender.MALE) 1500 else 1200, (tdee * 0.8).roundToInt())
            HealthGoal.GAIN -> tdee + 300
            HealthGoal.MAINTAIN -> tdee
        }
        val calories = if (profile.calorieGoalOverride > 0) profile.calorieGoalOverride else goalCalories

        // Protein is dosed on goal weight when overweight, otherwise on current weight.
        val proteinBase = if (bmi >= 27 && profile.targetWeight > 0) profile.targetWeight else w
        val proteinPerKg = when (profile.goal) {
            HealthGoal.MAINTAIN -> 1.6
            else -> 1.8
        }
        val protein = (proteinBase * proteinPerKg).roundToInt()
        val fat = max((calories * 0.25 / 9).roundToInt(), (w * 0.6).roundToInt())
        val carbs = max(0, ((calories - protein * 4 - fat * 9) / 4.0).roundToInt())
        val water = if (profile.waterGoalMl > 0) profile.waterGoalMl else ((w * 33).roundToInt() / 50 * 50).coerceIn(1500, 4500)

        val hm = h / 100.0
        return HealthTargets(
            bmi = bmi,
            bmr = bmr,
            tdee = tdee,
            calories = calories,
            proteinG = protein,
            carbsG = carbs,
            fatG = fat,
            waterMl = water,
            idealWeightMin = (18.5 * hm * hm).round(1),
            idealWeightMax = (24.9 * hm * hm).round(1),
            idealWeight = (21.7 * hm * hm).round(1),
            waistToHeight = if (profile.waistCm > 0) (profile.waistCm / h).round(2) else null,
        )
    }

    // ---------------- Steps ----------------

    /** Walking energy ≈ 0.5 kcal per kg per km (ACSM walking equation, flat ground, ~5 km/h). */
    fun stepCalories(steps: Int, weightKg: Double, heightCm: Double): Int {
        val km = stepDistanceMeters(steps, heightCm) / 1000.0
        return (km * weightKg.coerceIn(35.0, 250.0) * 0.5).roundToInt()
    }

    fun stepDistanceMeters(steps: Int, heightCm: Double): Int {
        val stride = (heightCm.takeIf { it > 0 } ?: 170.0).coerceIn(120.0, 220.0) * 0.415 / 100.0
        return (steps * stride).roundToInt()
    }

    /** ~100 steps per minute is the accepted threshold for moderate-intensity walking. */
    fun stepActiveMinutes(steps: Int): Int = (steps / 100.0).roundToInt()

    // ---------------- Workouts ----------------

    /** Calories = MET × kg × hours. */
    fun workoutCalories(category: WorkoutCategory, minutes: Int, weightKg: Double): Int {
        val kg = if (weightKg > 0) weightKg else 70.0
        return (category.met * kg * minutes / 60.0).roundToInt()
    }
}
