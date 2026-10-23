package com.kairo.planner.data

import com.kairo.planner.model.ActivityEntry
import com.kairo.planner.model.ActivityLevel
import com.kairo.planner.model.BodyComposition
import com.kairo.planner.model.DayNote
import com.kairo.planner.model.FocusMode
import com.kairo.planner.model.FocusSession
import com.kairo.planner.model.Gender
import com.kairo.planner.model.Habit
import com.kairo.planner.model.HabitLog
import com.kairo.planner.model.HealthGoal
import com.kairo.planner.model.HealthProfile
import com.kairo.planner.model.LinkItem
import com.kairo.planner.model.MealLog
import com.kairo.planner.model.MealType
import com.kairo.planner.model.StepLog
import com.kairo.planner.model.SubTask
import com.kairo.planner.model.Task
import com.kairo.planner.model.TaskCategory
import com.kairo.planner.model.WaterLog
import com.kairo.planner.model.WeightLog
import com.kairo.planner.model.WorkoutCategory
import com.kairo.planner.model.WorkoutLog
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import com.kairo.planner.db.Activity_log as ActivityRow
import com.kairo.planner.db.Day_note as DayNoteRow
import com.kairo.planner.db.Focus_session as FocusRow
import com.kairo.planner.db.Habit as HabitRow
import com.kairo.planner.db.Habit_log as HabitLogRow
import com.kairo.planner.db.Health_profile as ProfileRow
import com.kairo.planner.db.Link as LinkRow
import com.kairo.planner.db.Meal_log as MealRow
import com.kairo.planner.db.Step_log as StepRow
import com.kairo.planner.db.Task as TaskRow
import com.kairo.planner.db.Water_log as WaterRow
import com.kairo.planner.db.Weight_log as WeightRow
import com.kairo.planner.db.Workout_log as WorkoutRow

val AppJson = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
    explicitNulls = false
    isLenient = true
}

private val subtaskList = ListSerializer(SubTask.serializer())

private fun Long.bool() = this != 0L
private fun Boolean.long() = if (this) 1L else 0L
private fun String.csv(): List<String> = split(',').map { it.trim() }.filter { it.isNotEmpty() }

fun TaskRow.toModel() = Task(
    id = id,
    title = title,
    notes = notes,
    isPriority = is_priority.bool(),
    isCompleted = is_completed.bool(),
    date = date,
    category = TaskCategory.of(category),
    estimatedMinutes = estimated_minutes.toInt(),
    subtasks = runCatching { AppJson.decodeFromString(subtaskList, subtasks_json) }.getOrDefault(emptyList()),
    recurringDays = recurring_days.csv(),
    sortOrder = sort_order.toInt(),
    reminderAt = reminder_at,
    completedAt = completed_at,
    createdAt = created_at,
    updatedAt = updated_at,
    deletedAt = deleted_at,
)

fun Task.toRow() = TaskRow(
    id = id,
    title = title,
    notes = notes,
    is_priority = isPriority.long(),
    is_completed = isCompleted.long(),
    date = date,
    category = category.code,
    estimated_minutes = estimatedMinutes.toLong(),
    subtasks_json = AppJson.encodeToString(subtaskList, subtasks),
    recurring_days = recurringDays.joinToString(","),
    sort_order = sortOrder.toLong(),
    reminder_at = reminderAt,
    completed_at = completedAt,
    created_at = createdAt,
    updated_at = updatedAt,
    deleted_at = deletedAt,
)

fun HabitRow.toModel() = Habit(
    id = id,
    title = title,
    icon = icon,
    color = color,
    targetDays = target_days.csv(),
    reminderMinute = reminder_minute?.toInt(),
    archived = archived.bool(),
    sortOrder = sort_order.toInt(),
    createdAt = created_at,
    updatedAt = updated_at,
    deletedAt = deleted_at,
)

fun Habit.toRow() = HabitRow(
    id = id,
    title = title,
    icon = icon,
    color = color,
    target_days = targetDays.joinToString(","),
    reminder_minute = reminderMinute?.toLong(),
    archived = archived.long(),
    sort_order = sortOrder.toLong(),
    created_at = createdAt,
    updated_at = updatedAt,
    deleted_at = deletedAt,
)

fun HabitLogRow.toModel() = HabitLog(habit_id, date, completed.bool(), updated_at)

fun FocusRow.toModel() = FocusSession(
    id = id,
    taskId = task_id,
    taskTitle = task_title,
    durationMinutes = duration_minutes.toInt(),
    mode = FocusMode.of(mode),
    date = date,
    completedAt = completed_at,
)

fun LinkRow.toModel() = LinkItem(id, title, url, icon, icon_bg, category, clicks.toInt(), created_at, updated_at)

fun ProfileRow.toModel() = HealthProfile(
    name = name,
    age = age.toInt(),
    gender = Gender.of(gender),
    heightCm = height_cm,
    currentWeight = current_weight,
    targetWeight = target_weight,
    waistCm = waist_cm,
    activityLevel = ActivityLevel.of(activity_level),
    goal = HealthGoal.of(goal),
    stepGoal = step_goal.toInt(),
    waterGoalMl = water_goal_ml.toInt(),
    calorieGoalOverride = calorie_goal_override.toInt(),
    updatedAt = updated_at,
)

fun HealthProfile.toRow() = ProfileRow(
    id = "user",
    name = name,
    birth_year = 0,
    age = age.toLong(),
    gender = gender.code,
    height_cm = heightCm,
    current_weight = currentWeight,
    target_weight = targetWeight,
    waist_cm = waistCm,
    activity_level = activityLevel.code,
    goal = goal.code,
    step_goal = stepGoal.toLong(),
    water_goal_ml = waterGoalMl.toLong(),
    calorie_goal_override = calorieGoalOverride.toLong(),
    updated_at = updatedAt,
)

fun WeightRow.toModel() = WeightLog(
    id = id,
    date = date,
    measuredAt = measured_at,
    weight = weight,
    bmi = bmi,
    bodyFat = body_fat,
    waistCm = waist_cm,
    impedance = impedance?.toInt(),
    note = note,
    source = source,
    composition = metrics_json?.let { runCatching { AppJson.decodeFromString(BodyComposition.serializer(), it) }.getOrNull() },
    externalId = external_id,
)

fun WeightLog.toRow(now: Long) = WeightRow(
    id = id,
    date = date,
    measured_at = measuredAt,
    weight = weight,
    bmi = bmi,
    body_fat = bodyFat,
    waist_cm = waistCm,
    impedance = impedance?.toLong(),
    note = note,
    source = source,
    metrics_json = composition?.let { AppJson.encodeToString(BodyComposition.serializer(), it) },
    external_id = externalId,
    created_at = now,
    updated_at = now,
    deleted_at = null,
)

fun MealRow.toModel() = MealLog(
    id = id,
    date = date,
    time = time,
    name = name,
    mealType = MealType.of(meal_type),
    kcal = kcal.toInt(),
    protein = protein,
    carbs = carbs,
    fat = fat,
    grams = grams?.toInt(),
    aiEstimated = ai_estimated.bool(),
    createdAt = created_at,
)

fun MealLog.toRow(now: Long) = MealRow(
    id = id,
    date = date,
    time = time,
    name = name,
    meal_type = mealType.code,
    kcal = kcal.toLong(),
    protein = protein,
    carbs = carbs,
    fat = fat,
    grams = grams?.toLong(),
    ai_estimated = aiEstimated.long(),
    created_at = createdAt,
    updated_at = now,
    deleted_at = null,
)

fun WaterRow.toModel() = WaterLog(id, date, amount_ml.toInt(), created_at)

fun WorkoutRow.toModel() = WorkoutLog(
    id = id,
    date = date,
    title = title,
    category = WorkoutCategory.of(category),
    durationMinutes = duration_minutes.toInt(),
    calories = calories.toInt(),
    notes = notes,
    source = source,
    createdAt = created_at,
)

fun StepRow.toModel() = StepLog(date, steps.toInt(), goal.toInt(), calories.toInt(), distance_m.toInt(), active_minutes.toInt(), source)

fun ActivityRow.toModel() = ActivityEntry(id, ts, date, action, entity, title, details)

fun DayNoteRow.toModel() = DayNote(date, mood.toInt(), note)
