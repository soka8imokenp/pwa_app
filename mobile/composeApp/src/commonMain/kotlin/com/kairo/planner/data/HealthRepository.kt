package com.kairo.planner.data

import app.cash.sqldelight.coroutines.asFlow
import app.cash.sqldelight.coroutines.mapToList
import app.cash.sqldelight.coroutines.mapToOneOrNull
import com.kairo.planner.core.Time
import com.kairo.planner.core.newId
import com.kairo.planner.db.SumireDatabase
import com.kairo.planner.domain.health.BodyCompositionCalculator
import com.kairo.planner.domain.health.HealthFormulas
import com.kairo.planner.model.BodyComposition
import com.kairo.planner.model.HealthProfile
import com.kairo.planner.model.MealLog
import com.kairo.planner.model.MealType
import com.kairo.planner.model.StepLog
import com.kairo.planner.model.WaterLog
import com.kairo.planner.model.WeightLog
import com.kairo.planner.model.WorkoutCategory
import com.kairo.planner.model.WorkoutLog
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import com.kairo.planner.db.Step_log as StepRow
import com.kairo.planner.db.Water_log as WaterRow
import com.kairo.planner.db.Workout_log as WorkoutRow

data class FoodSuggestion(val name: String, val mealType: MealType, val kcal: Int, val protein: Double, val carbs: Double, val fat: Double, val grams: Int?)

class HealthRepository(
    private val db: SumireDatabase,
    private val planner: PlannerRepository,
    private val changes: ChangeListener,
) {
    private val q get() = db.healthQueries
    private val io get() = DbDispatcher.io

    // ------------------------------------------------------------------ Profile

    fun profile(): Flow<HealthProfile> =
        q.selectProfile().asFlow().mapToOneOrNull(io).map { it?.toModel() ?: HealthProfile() }

    suspend fun currentProfile(): HealthProfile = withContext(io) { q.selectProfile().executeAsOneOrNull()?.toModel() ?: HealthProfile() }

    suspend fun saveProfile(profile: HealthProfile) = withContext(io) {
        q.upsertProfile(profile.copy(updatedAt = Time.nowMs()).toRow())
        changes.onLocalChange()
    }

    // ------------------------------------------------------------------ Weight

    fun weights(): Flow<List<WeightLog>> = q.selectAllWeights().asFlow().mapToList(io).map { r -> r.map { it.toModel() } }

    fun weightsBetween(from: String, to: String): Flow<List<WeightLog>> =
        q.selectWeightsBetween(from, to).asFlow().mapToList(io).map { r -> r.map { it.toModel() } }

    /**
     * Stores a weigh-in. Body composition is computed from impedance when available; for weight-only
     * readings an explicitly-flagged estimate is attached instead.
     */
    suspend fun addWeight(
        weightKg: Double,
        impedance: Int? = null,
        source: String = "manual",
        note: String = "",
        waistCm: Double? = null,
        measuredAt: Long = Time.nowMs(),
        externalId: String? = null,
        reportedBodyFat: Double? = null,
    ): WeightLog = withContext(io) {
        val profile = currentProfile()
        val composition: BodyComposition? = when {
            BodyCompositionCalculator.isValidImpedance(impedance) ->
                BodyCompositionCalculator.calculate(weightKg, impedance!!, profile.heightCm, profile.age, profile.gender)
            else -> BodyCompositionCalculator.estimateWithoutImpedance(weightKg, profile.heightCm, profile.age, profile.gender)
        }
        val bodyFat = reportedBodyFat ?: composition?.takeIf { it.fromImpedance }?.bodyFatPercent
        val log = WeightLog(
            id = newId(),
            date = Time.dateOf(measuredAt).toString(),
            measuredAt = measuredAt,
            weight = weightKg,
            bmi = HealthFormulas.bmi(weightKg, profile.heightCm),
            bodyFat = bodyFat,
            waistCm = waistCm,
            impedance = impedance?.takeIf { BodyCompositionCalculator.isValidImpedance(it) },
            note = note,
            source = source,
            composition = composition,
            externalId = externalId,
        )
        val now = Time.nowMs()
        q.upsertWeight(log.toRow(now))
        // Keep the profile's current weight in sync with the newest reading.
        val latest = q.selectLatestWeight().executeAsOneOrNull()
        if (latest?.id == log.id) {
            q.upsertProfile(
                profile.copy(
                    currentWeight = weightKg,
                    waistCm = waistCm ?: profile.waistCm,
                    updatedAt = now,
                ).toRow(),
            )
        }
        planner.log("weight", "scale", "${weightKg} kg", source)
        changes.onLocalChange()
        log
    }

    suspend fun hasExternalWeight(externalId: String): Boolean = withContext(io) {
        q.selectWeightByExternal(externalId).executeAsOneOrNull() != null
    }

    suspend fun deleteWeight(id: String) = withContext(io) {
        q.softDeleteWeight(Time.nowMs(), id)
        val profile = currentProfile()
        q.selectLatestWeight().executeAsOneOrNull()?.let { latest ->
            q.upsertProfile(profile.copy(currentWeight = latest.weight, updatedAt = Time.nowMs()).toRow())
        }
        changes.onLocalChange()
    }

    /** Recomputes every stored composition after the user fixes height/age/sex in the profile. */
    suspend fun recomputeCompositions() = withContext(io) {
        val profile = currentProfile()
        val now = Time.nowMs()
        db.transaction {
            q.selectAllWeights().executeAsList().map { it.toModel() }.forEach { w ->
                val comp = if (BodyCompositionCalculator.isValidImpedance(w.impedance)) {
                    BodyCompositionCalculator.calculate(w.weight, w.impedance!!, profile.heightCm, profile.age, profile.gender)
                } else {
                    BodyCompositionCalculator.estimateWithoutImpedance(w.weight, profile.heightCm, profile.age, profile.gender)
                }
                q.upsertWeight(
                    w.copy(
                        bmi = HealthFormulas.bmi(w.weight, profile.heightCm),
                        composition = comp,
                        bodyFat = w.bodyFat ?: comp?.takeIf { it.fromImpedance }?.bodyFatPercent,
                    ).toRow(now),
                )
            }
        }
    }

    // ------------------------------------------------------------------ Meals

    fun mealsForDate(date: String): Flow<List<MealLog>> =
        q.selectMealsForDate(date).asFlow().mapToList(io).map { r -> r.map { it.toModel() } }

    fun mealsBetween(from: String, to: String): Flow<List<MealLog>> =
        q.selectMealsBetween(from, to).asFlow().mapToList(io).map { r -> r.map { it.toModel() } }

    fun recentFoods(): Flow<List<FoodSuggestion>> = q.recentMealNames().asFlow().mapToList(io).map { rows ->
        rows.map { FoodSuggestion(it.name, MealType.of(it.meal_type), it.kcal.toInt(), it.protein, it.carbs, it.fat, it.grams?.toInt()) }
    }

    suspend fun addMeal(
        date: String,
        name: String,
        kcal: Int,
        protein: Double,
        carbs: Double,
        fat: Double,
        mealType: MealType? = null,
        time: String? = null,
        grams: Int? = null,
        aiEstimated: Boolean = false,
    ): MealLog = withContext(io) {
        val now = Time.nowMs()
        val t = time?.takeIf { it.matches(Regex("\\d{1,2}:\\d{2}")) } ?: Time.currentHhmm()
        val meal = MealLog(
            id = newId(),
            date = date,
            time = t.padStart(5, '0'),
            name = name.trim(),
            mealType = mealType ?: MealType.forTime(t),
            kcal = kcal.coerceIn(0, 10_000),
            protein = protein.coerceIn(0.0, 1000.0),
            carbs = carbs.coerceIn(0.0, 1000.0),
            fat = fat.coerceIn(0.0, 1000.0),
            grams = grams,
            aiEstimated = aiEstimated,
            createdAt = now,
        )
        q.upsertMeal(meal.toRow(now))
        planner.log("meal", "nutrition", meal.name, "${meal.kcal} kcal")
        changes.onLocalChange()
        meal
    }

    suspend fun updateMeal(meal: MealLog) = withContext(io) {
        q.upsertMeal(meal.toRow(Time.nowMs()))
        changes.onLocalChange()
    }

    suspend fun deleteMeal(id: String) = withContext(io) {
        q.softDeleteMeal(Time.nowMs(), id)
        changes.onLocalChange()
    }

    suspend fun findMealByName(date: String, query: String): MealLog? = withContext(io) {
        val needle = query.lowercase().trim()
        q.selectMealsForDate(date).executeAsList().map { it.toModel() }
            .lastOrNull { it.name.lowercase().contains(needle) || needle.contains(it.name.lowercase()) }
    }

    // ------------------------------------------------------------------ Water

    fun waterForDate(date: String): Flow<List<WaterLog>> =
        q.selectWaterForDate(date).asFlow().mapToList(io).map { r -> r.map { it.toModel() } }

    fun waterTotalsBetween(from: String, to: String): Flow<Map<String, Int>> =
        q.selectWaterBetween(from, to).asFlow().mapToList(io).map { r -> r.associate { it.date to (it.total ?: 0L).toInt() } }

    suspend fun addWater(date: String, ml: Int) = withContext(io) {
        if (ml == 0) return@withContext
        val now = Time.nowMs()
        q.upsertWater(WaterRow(newId(), date, ml.coerceIn(-5000, 5000).toLong(), now, now, null))
        planner.log("water", "nutrition", "$ml ml")
        changes.onLocalChange()
    }

    suspend fun deleteWater(id: String) = withContext(io) {
        q.softDeleteWater(Time.nowMs(), id)
        changes.onLocalChange()
    }

    // ------------------------------------------------------------------ Workouts

    fun workoutsBetween(from: String, to: String): Flow<List<WorkoutLog>> =
        q.selectWorkoutsBetween(from, to).asFlow().mapToList(io).map { r -> r.map { it.toModel() } }

    suspend fun addWorkout(
        date: String,
        title: String,
        category: WorkoutCategory,
        minutes: Int,
        calories: Int? = null,
        notes: String = "",
        source: String = "manual",
        externalId: String? = null,
    ) = withContext(io) {
        if (externalId != null && q.selectWorkoutByExternal(externalId).executeAsOneOrNull() != null) return@withContext
        val now = Time.nowMs()
        val kcal = calories ?: HealthFormulas.workoutCalories(category, minutes, currentProfile().currentWeight)
        q.upsertWorkout(
            WorkoutRow(newId(), date, title.trim(), category.code, minutes.toLong(), kcal.toLong(), notes, source, externalId, now, now, null),
        )
        planner.log("workout", "health", title, "$minutes min")
        changes.onLocalChange()
    }

    suspend fun deleteWorkout(id: String) = withContext(io) {
        q.softDeleteWorkout(Time.nowMs(), id)
        changes.onLocalChange()
    }

    // ------------------------------------------------------------------ Steps

    fun stepsBetween(from: String, to: String): Flow<List<StepLog>> =
        q.selectStepsBetween(from, to).asFlow().mapToList(io).map { r -> r.map { it.toModel() } }

    fun stepsForDate(date: String): Flow<StepLog?> =
        q.selectStepsForDate(date).asFlow().mapToOneOrNull(io).map { it?.toModel() }

    /**
     * Writes the day's step total. Manual edits always win; automatic sources only ever raise the count,
     * so a late Health Connect sync can't wipe out sensor steps and vice versa.
     */
    suspend fun setSteps(date: String, steps: Int, source: String, force: Boolean = false) = withContext(io) {
        val existing = q.selectStepsForDate(date).executeAsOneOrNull()
        if (!force && existing != null && existing.source == "manual" && source != "manual") return@withContext
        if (!force && existing != null && source != "manual" && steps < existing.steps) return@withContext
        val p = currentProfile()
        val safe = steps.coerceIn(0, 200_000)
        q.upsertSteps(
            StepRow(
                date = date,
                steps = safe.toLong(),
                goal = (existing?.goal ?: p.stepGoal.toLong()),
                calories = HealthFormulas.stepCalories(safe, p.currentWeight, p.heightCm).toLong(),
                distance_m = HealthFormulas.stepDistanceMeters(safe, p.heightCm).toLong(),
                active_minutes = HealthFormulas.stepActiveMinutes(safe).toLong(),
                source = source,
                updated_at = Time.nowMs(),
            ),
        )
        if (existing == null || existing.steps != safe.toLong()) changes.onLocalChange()
    }

    suspend fun setStepGoal(goal: Int) = withContext(io) {
        val p = currentProfile()
        q.upsertProfile(p.copy(stepGoal = goal.coerceIn(1000, 100_000), updatedAt = Time.nowMs()).toRow())
        q.selectStepsForDate(Time.todayKey()).executeAsOneOrNull()?.let {
            q.upsertSteps(it.copy(goal = goal.toLong(), updated_at = Time.nowMs()))
        }
        changes.onLocalChange()
    }
}
