package com.kairo.planner.domain.health

import com.kairo.planner.core.round
import com.kairo.planner.model.BodyComposition
import com.kairo.planner.model.BodyMetric
import com.kairo.planner.model.BodyType
import com.kairo.planner.model.Gender
import com.kairo.planner.model.MetricItem
import com.kairo.planner.model.MetricStatus
import com.kairo.planner.model.ScoreDeduction
import kotlin.math.roundToInt

/**
 * Bio-impedance body composition model used by Xiaomi / Zepp Life scales
 * (reverse-engineered formulas published by the open-source mi-scale projects),
 * plus a 100-point body score.
 *
 * Differences from the original port in the web app:
 *  - no "sentinel" jumps (e.g. BMR → 5000 for heavy men, fat → 75 %); values are clamped to physiological ranges;
 *  - body-score penalties are evaluated in the intended order (the old branch order punished upper-normal fat by 10 points);
 *  - composition is only computed from a real impedance value; weight-only readings get [estimateWithoutImpedance].
 */
object BodyCompositionCalculator {

    const val MIN_IMPEDANCE = 150
    const val MAX_IMPEDANCE = 3000

    fun isValidImpedance(impedance: Int?): Boolean = impedance != null && impedance in MIN_IMPEDANCE..MAX_IMPEDANCE

    fun calculate(weight: Double, impedance: Int, heightCm: Double, age: Int, gender: Gender): BodyComposition {
        val w = weight.coerceIn(10.0, 250.0)
        val h = (if (heightCm > 0) heightCm else 170.0).coerceIn(90.0, 220.0)
        val a = (if (age > 0) age else 30).coerceIn(10, 99)
        val imp = impedance.toDouble()
        val male = gender == Gender.MALE

        // Lean body mass coefficient
        val lbm = (h * 9.058 / 100.0) * (h / 100.0) + w * 0.32 + 12.226 - imp * 0.0068 - a * 0.0542

        // Body fat %
        val fatConst = if (!male) (if (a <= 49) 9.25 else 7.25) else 0.8
        val fatCoeff = when {
            male && w < 61 -> 0.98
            !male && w > 60 -> 0.96 * (if (h > 160) 1.03 else 1.0)
            !male && w < 50 -> 1.02 * (if (h > 160) 1.03 else 1.0)
            else -> 1.0
        }
        val fat = ((1.0 - ((lbm - fatConst) * fatCoeff) / w) * 100).coerceIn(5.0, 60.0).round(1)

        // Water %
        var waterRaw = (100 - fat) * 0.7
        waterRaw *= if (waterRaw <= 50) 1.02 else 0.98
        val water = waterRaw.coerceIn(35.0, 70.0).round(1)

        // Bone mass
        val boneBase = if (!male) 0.245691014 else 0.18016894
        var boneRaw = (boneBase - lbm * 0.05158) * -1
        boneRaw += if (boneRaw > 2.2) 0.1 else -0.1
        val bone = boneRaw.coerceIn(0.5, 5.2).round(2)

        // Muscle mass
        val muscle = (w - fat * 0.01 * w - bone).coerceIn(10.0, 120.0).round(1)

        // Visceral fat (unrounded value is used by the score)
        val visceralRaw = if (!male) {
            if (w > (13 - h * 0.5) * -1) {
                val subsub = (h * 1.45 + h * 0.1158 * h) - 120
                (w * 500 / subsub - 6) + a * 0.07
            } else {
                val sub = 0.691 + h * -0.0024 + h * -0.0024
                ((h * 0.027 - sub * w) * -1) + a * 0.07 - a
            }
        } else {
            if (h < w * 1.6) {
                val sub = ((h * 0.4) - (h * (h * 0.0826))) * -1
                (w * 305 / (sub + 48)) - 2.9 + a * 0.15
            } else {
                val sub = 0.765 + h * -0.0015
                ((h * 0.143 - w * sub) * -1) + a * 0.15 - 5.0
            }
        }
        val visceral = visceralRaw.coerceIn(1.0, 59.0).roundToInt()

        // Basal metabolic rate
        val bmrRaw = if (!male) 864.6 + w * 10.2036 - h * 0.39336 - a * 6.204
        else 877.8 + w * 14.916 - h * 0.726 - a * 8.976
        val bmr = bmrRaw.coerceIn(500.0, 4000.0).roundToInt()

        val protein = ((muscle / w) * 100 - water).coerceIn(5.0, 32.0).round(1)
        val ideal = (if (!male) (h - 70) * 0.6 else (h - 80) * 0.7).round(1)

        val bodyAgeRaw = if (!male) h * -1.1165 + w * 1.5784 + a * 0.4615 + imp * 0.0415 + 83.2548
        else h * -0.7471 + w * 0.9161 + a * 0.4184 + imp * 0.0517 + 54.2267
        val bodyAge = bodyAgeRaw.coerceIn(15.0, 80.0).roundToInt()

        val fatScale = Norms.fat(a, gender)
        val muscleScale = Norms.muscle(h, gender)
        val bodyType = bodyType(fat, muscle, fatScale, muscleScale)
        val bmi = HealthFormulas.bmi(w, h)

        val deductions = score(
            bmi = bmi, fat = fat, muscle = muscle, water = water, visceralRaw = visceralRaw,
            bone = bone, bmr = bmr, protein = protein, weight = w, heightCm = h, age = a, gender = gender,
        )
        val total = deductions.sumOf { it.points }
        return BodyComposition(
            bmi = bmi,
            bodyFatPercent = fat,
            muscleMassKg = muscle,
            waterPercent = water,
            boneMassKg = bone,
            visceralFat = visceral,
            bmr = bmr,
            leanMassKg = lbm.round(1),
            bodyAge = bodyAge,
            proteinPercent = protein,
            idealWeightKg = ideal,
            bodyScore = (100 - total).roundToInt().coerceIn(10, 100),
            bodyType = bodyType,
            deductions = deductions,
            fromImpedance = true,
        )
    }

    /**
     * Rough composition for weight-only scales and manual entries. Clearly flagged with [BodyComposition.fromImpedance] = false
     * so the UI can label it as an estimate instead of pretending it was measured.
     */
    fun estimateWithoutImpedance(weight: Double, heightCm: Double, age: Int, gender: Gender): BodyComposition? {
        if (weight <= 0 || heightCm <= 0) return null
        val a = if (age > 0) age else 30
        val bmi = HealthFormulas.bmi(weight, heightCm)
        val fat = HealthFormulas.estimatedBodyFat(bmi, a, gender)
        val lean = weight * (1 - fat / 100)
        val bone = (lean * 0.05158 - 0.1).coerceIn(0.5, 5.2).round(2)
        val muscle = (lean - bone).round(1)
        val water = ((100 - fat) * 0.73).coerceIn(35.0, 70.0).round(1)
        val bmr = (370 + 21.6 * lean).roundToInt() // Katch–McArdle
        val ideal = (if (gender == Gender.MALE) (heightCm - 80) * 0.7 else (heightCm - 70) * 0.6).round(1)
        val protein = ((muscle / weight) * 100 - water).coerceIn(5.0, 32.0).round(1)
        val deductions = score(bmi, fat, muscle, water, 0.0, bone, bmr, protein, weight, heightCm, a, gender)
            .filter { it.metric == BodyMetric.BMI || it.metric == BodyMetric.FAT }
        return BodyComposition(
            bmi = bmi,
            bodyFatPercent = fat,
            muscleMassKg = muscle,
            waterPercent = water,
            boneMassKg = bone,
            visceralFat = 0,
            bmr = bmr,
            leanMassKg = lean.round(1),
            bodyAge = a,
            proteinPercent = protein,
            idealWeightKg = ideal,
            bodyScore = (100 - deductions.sumOf { it.points }).roundToInt().coerceIn(10, 100),
            bodyType = bodyType(fat, muscle, Norms.fat(a, gender), Norms.muscle(heightCm, gender)),
            deductions = deductions,
            fromImpedance = false,
        )
    }

    private fun bodyType(fat: Double, muscle: Double, fatScale: DoubleArray, muscleScale: DoubleArray): BodyType {
        val fatFactor = when {
            fat > fatScale[2] -> 0
            fat < fatScale[1] -> 2
            else -> 1
        }
        val index = when {
            muscle > muscleScale[1] -> 2 + fatFactor * 3
            muscle < muscleScale[0] -> fatFactor * 3
            else -> 1 + fatFactor * 3
        }
        return BodyType.entries[index]
    }

    /** Linear penalty that is [atFrom] at value == from and [atTo] at value == to, clamped between them. */
    private fun ramp(value: Double, from: Double, to: Double, atFrom: Double, atTo: Double): Double {
        if (from == to) return atTo
        val t = ((value - from) / (to - from)).coerceIn(0.0, 1.0)
        return atFrom + (atTo - atFrom) * t
    }

    private fun score(
        bmi: Double, fat: Double, muscle: Double, water: Double, visceralRaw: Double,
        bone: Double, bmr: Int, protein: Double, weight: Double, heightCm: Double, age: Int, gender: Gender,
    ): List<ScoreDeduction> {
        val out = ArrayList<ScoreDeduction>()
        fun add(metric: BodyMetric, points: Double) {
            if (points > 0.05) out += ScoreDeduction(metric, points.round(1))
        }
        val fatScale = Norms.fat(age, gender)

        // BMI: underweight is penalised on its own; high BMI only when fat is high too (muscular people are fine).
        add(
            BodyMetric.BMI,
            when {
                bmi <= 14.0 -> 30.0
                bmi < 15.0 -> ramp(bmi, 14.0, 15.0, 30.0, 15.0)
                bmi < 18.5 && age >= 18 -> ramp(bmi, 15.0, 18.5, 15.0, 5.0)
                fat >= fatScale[2] && bmi >= 32.0 -> 10.0
                fat >= fatScale[2] && bmi >= 25.0 -> ramp(bmi, 25.0, 32.0, 5.0, 10.0)
                else -> 0.0
            },
        )

        val fatBest = fatScale[2] - if (gender == Gender.MALE) 3.0 else 2.0
        add(
            BodyMetric.FAT,
            when {
                fat < fatScale[0] -> ramp(fat, fatScale[0], 1.0, 3.0, 10.0)
                fat < fatBest -> 0.0
                fat <= fatScale[2] -> ramp(fat, fatBest, fatScale[2], 3.0, 9.0)
                fat < fatScale[3] -> ramp(fat, fatScale[2], fatScale[3], 10.0, 20.0)
                else -> 20.0
            },
        )

        if (visceralRaw <= 0.0) return out // estimate mode: only BMI and fat are meaningful

        val muscleLow = Norms.muscle(heightCm, gender)[0]
        add(
            BodyMetric.MUSCLE,
            when {
                muscle >= muscleLow -> 0.0
                muscle < muscleLow - 5 -> 10.0
                else -> ramp(muscle, muscleLow, muscleLow - 5, 5.0, 10.0)
            },
        )

        val waterLow = Norms.water(gender)[0]
        add(
            BodyMetric.WATER,
            when {
                water >= waterLow -> 0.0
                water <= waterLow - 5 -> 10.0
                else -> ramp(water, waterLow, waterLow - 5, 5.0, 10.0)
            },
        )

        add(
            BodyMetric.VISCERAL,
            when {
                visceralRaw < 10.0 -> 0.0
                visceralRaw >= 15.0 -> 15.0
                else -> ramp(visceralRaw, 10.0, 15.0, 10.0, 15.0)
            },
        )

        val boneLow = Norms.bone(weight, gender)[0]
        add(
            BodyMetric.BONE,
            when {
                bone >= boneLow -> 0.0
                bone <= boneLow - 0.3 -> 10.0
                else -> ramp(bone, boneLow, boneLow - 0.3, 5.0, 10.0)
            },
        )

        val bmrTarget = Norms.bmrTarget(weight, age, gender)
        add(
            BodyMetric.BMR,
            when {
                bmr >= bmrTarget -> 0.0
                bmr <= bmrTarget - 300 -> 6.0
                else -> ramp(bmr.toDouble(), bmrTarget.toDouble(), bmrTarget - 300.0, 3.0, 6.0)
            },
        )

        add(
            BodyMetric.PROTEIN,
            when {
                protein > 17.0 -> 0.0
                protein < 10.0 -> 10.0
                protein <= 16.0 -> ramp(protein, 16.0, 10.0, 5.0, 10.0)
                else -> ramp(protein, 17.0, 16.0, 3.0, 5.0)
            },
        )
        return out
    }

    /** Per-metric status + norm range for the body composition cards. */
    fun metricItems(c: BodyComposition, heightCm: Double, age: Int, gender: Gender, weight: Double): List<MetricItem> {
        val fatScale = Norms.fat(if (age > 0) age else 30, gender)
        val muscleScale = Norms.muscle(heightCm, gender)
        val waterScale = Norms.water(gender)
        val boneScale = Norms.bone(weight, gender)
        val bmrTarget = Norms.bmrTarget(weight, if (age > 0) age else 30, gender)
        val items = ArrayList<MetricItem>()

        items += MetricItem(
            BodyMetric.BMI, c.bmi, "", 1,
            when {
                c.bmi in 18.5..24.9 -> MetricStatus.OPTIMAL
                c.bmi in 17.5..27.9 -> MetricStatus.ATTENTION
                else -> MetricStatus.ALERT
            },
            18.5, 24.9,
        )
        items += MetricItem(
            BodyMetric.FAT, c.bodyFatPercent, "%", 1,
            when {
                c.bodyFatPercent in fatScale[1]..fatScale[2] -> MetricStatus.OPTIMAL
                c.bodyFatPercent in fatScale[0]..fatScale[3] -> MetricStatus.ATTENTION
                else -> MetricStatus.ALERT
            },
            fatScale[1], fatScale[2],
        )
        items += MetricItem(
            BodyMetric.MUSCLE, c.muscleMassKg, "kg", 1,
            if (c.muscleMassKg >= muscleScale[0]) MetricStatus.OPTIMAL else MetricStatus.ATTENTION,
            muscleScale[0], muscleScale[1],
        )
        items += MetricItem(
            BodyMetric.WATER, c.waterPercent, "%", 1,
            if (c.waterPercent >= waterScale[0]) MetricStatus.OPTIMAL else MetricStatus.ATTENTION,
            waterScale[0], waterScale[1],
        )
        if (c.fromImpedance) {
            items += MetricItem(
                BodyMetric.VISCERAL, c.visceralFat.toDouble(), "", 0,
                when {
                    c.visceralFat <= 9 -> MetricStatus.OPTIMAL
                    c.visceralFat <= 14 -> MetricStatus.ATTENTION
                    else -> MetricStatus.ALERT
                },
                1.0, 9.0,
            )
        }
        items += MetricItem(
            BodyMetric.BMR, c.bmr.toDouble(), "kcal", 0,
            if (c.bmr >= bmrTarget) MetricStatus.OPTIMAL else MetricStatus.ATTENTION,
            bmrTarget.toDouble(), null,
        )
        items += MetricItem(
            BodyMetric.PROTEIN, c.proteinPercent, "%", 1,
            when {
                c.proteinPercent >= 16.0 -> MetricStatus.OPTIMAL
                c.proteinPercent >= 14.0 -> MetricStatus.ATTENTION
                else -> MetricStatus.ALERT
            },
            16.0, 20.0,
        )
        items += MetricItem(
            BodyMetric.BONE, c.boneMassKg, "kg", 1,
            if (c.boneMassKg >= boneScale[0]) MetricStatus.OPTIMAL else MetricStatus.ATTENTION,
            boneScale[0], boneScale[1],
        )
        if (c.fromImpedance) {
            items += MetricItem(
                BodyMetric.BODY_AGE, c.bodyAge.toDouble(), "", 0,
                if (age <= 0 || c.bodyAge <= age) MetricStatus.OPTIMAL else MetricStatus.ATTENTION,
                null, age.toDouble().takeIf { age > 0 },
            )
        }
        items += MetricItem(
            BodyMetric.IDEAL_WEIGHT, c.idealWeightKg, "kg", 1, MetricStatus.OPTIMAL, null, null,
        )
        return items
    }
}

/** Normative tables (age/height/sex) used by the Zepp Life body score. */
internal object Norms {
    /** [low, normalMin, normalMax, obese] */
    fun fat(age: Int, gender: Gender): DoubleArray {
        val male = gender == Gender.MALE
        return when {
            age < 12 -> if (male) doubleArrayOf(7.0, 16.0, 25.0, 30.0) else doubleArrayOf(12.0, 21.0, 30.0, 34.0)
            age < 14 -> if (male) doubleArrayOf(7.0, 16.0, 25.0, 30.0) else doubleArrayOf(15.0, 24.0, 33.0, 37.0)
            age < 16 -> if (male) doubleArrayOf(7.0, 16.0, 25.0, 30.0) else doubleArrayOf(18.0, 27.0, 36.0, 40.0)
            age < 18 -> if (male) doubleArrayOf(7.0, 16.0, 25.0, 30.0) else doubleArrayOf(20.0, 28.0, 37.0, 41.0)
            age < 40 -> if (male) doubleArrayOf(11.0, 17.0, 22.0, 27.0) else doubleArrayOf(21.0, 28.0, 35.0, 40.0)
            age < 60 -> if (male) doubleArrayOf(12.0, 18.0, 23.0, 28.0) else doubleArrayOf(22.0, 29.0, 36.0, 41.0)
            else -> if (male) doubleArrayOf(14.0, 20.0, 25.0, 30.0) else doubleArrayOf(23.0, 30.0, 37.0, 42.0)
        }
    }

    /** [low, high] by height. */
    fun muscle(heightCm: Double, gender: Gender): DoubleArray {
        val male = gender == Gender.MALE
        return when {
            male && heightCm >= 170 -> doubleArrayOf(49.4, 59.5)
            male && heightCm >= 160 -> doubleArrayOf(44.0, 52.5)
            male && heightCm > 0 -> doubleArrayOf(38.5, 46.5)
            male -> doubleArrayOf(44.0, 52.5)
            heightCm >= 160 -> doubleArrayOf(36.5, 42.6)
            heightCm >= 150 -> doubleArrayOf(32.9, 37.6)
            heightCm > 0 -> doubleArrayOf(29.1, 34.8)
            else -> doubleArrayOf(32.9, 37.6)
        }
    }

    fun water(gender: Gender): DoubleArray =
        if (gender == Gender.MALE) doubleArrayOf(55.0, 65.1) else doubleArrayOf(45.0, 60.1)

    fun bone(weight: Double, gender: Gender): DoubleArray = if (gender == Gender.MALE) {
        when {
            weight >= 75 -> doubleArrayOf(2.0, 4.2)
            weight >= 60 -> doubleArrayOf(1.9, 4.1)
            else -> doubleArrayOf(1.6, 3.9)
        }
    } else {
        when {
            weight >= 60 -> doubleArrayOf(1.8, 3.9)
            weight >= 45 -> doubleArrayOf(1.5, 3.8)
            else -> doubleArrayOf(1.3, 3.6)
        }
    }

    fun bmrTarget(weight: Double, age: Int, gender: Gender): Int {
        val coeff = if (gender == Gender.MALE) {
            when {
                age < 30 -> 21.6
                age < 50 -> 20.07
                else -> 19.35
            }
        } else {
            when {
                age < 30 -> 21.24
                age < 50 -> 19.53
                else -> 18.63
            }
        }
        return (weight * coeff).roundToInt()
    }
}
