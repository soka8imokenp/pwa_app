package com.kairo.planner.data

import com.kairo.planner.core.Time
import com.kairo.planner.core.newId
import com.kairo.planner.db.SumireDatabase
import com.kairo.planner.domain.health.BodyCompositionCalculator
import com.kairo.planner.domain.health.HealthFormulas
import com.kairo.planner.model.ActivityLevel
import com.kairo.planner.model.Gender
import com.kairo.planner.model.HealthGoal
import com.kairo.planner.model.HealthProfile
import com.kairo.planner.model.MealType
import com.kairo.planner.model.SubTask
import com.kairo.planner.model.Task
import com.kairo.planner.model.TaskCategory
import com.kairo.planner.model.WeightLog
import com.kairo.planner.model.WorkoutCategory
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import com.kairo.planner.db.Focus_session as FocusRow
import com.kairo.planner.db.Habit as HabitRow
import com.kairo.planner.db.Link as LinkRow
import com.kairo.planner.db.Water_log as WaterRow
import com.kairo.planner.db.Workout_log as WorkoutRow

/**
 * Backup format v3 (native) and importer for v2 backups produced by the old web/PWA app, so users can
 * carry their history over: Settings → Export in the old app, then Import here.
 */
class BackupService(private val db: SumireDatabase, private val health: HealthRepository) {

    suspend fun export(): String = withContext(DbDispatcher.io) {
        val root = buildJsonObject {
            put("version", 3)
            put("app", "daily-sumire-native")
            put("exportedAt", Time.nowMs())
            put("tasks", buildJsonArray {
                db.taskQueries.selectAll().executeAsList().filter { it.deleted_at == null }.forEach { t ->
                    add(buildJsonObject {
                        put("id", t.id); put("title", t.title); put("notes", t.notes); put("isPriority", t.is_priority == 1L)
                        put("isCompleted", t.is_completed == 1L); put("date", t.date); put("category", t.category)
                        put("estimatedMinutes", t.estimated_minutes); put("subtasks", AppJson.parseToJsonElement(t.subtasks_json))
                        put("recurringDays", t.recurring_days); put("order", t.sort_order); put("createdAt", t.created_at)
                        t.completed_at?.let { put("completedAt", it) }
                    })
                }
            })
            put("habits", buildJsonArray {
                db.habitQueries.selectAllHabits().executeAsList().filter { it.deleted_at == null }.forEach { h ->
                    add(buildJsonObject {
                        put("id", h.id); put("title", h.title); put("icon", h.icon); put("color", h.color)
                        put("targetDays", JsonArray(h.target_days.split(',').filter { it.isNotBlank() }.map { JsonPrimitive(it) }))
                        put("archived", h.archived == 1L); put("createdAt", h.created_at)
                    })
                }
            })
            put("habitLogs", buildJsonArray {
                db.habitQueries.selectAllLogs().executeAsList().forEach { l ->
                    add(buildJsonObject { put("habitId", l.habit_id); put("date", l.date); put("completed", l.completed == 1L) })
                }
            })
            put("focusSessions", buildJsonArray {
                db.focusQueries.selectAllFocus().executeAsList().forEach { f ->
                    add(buildJsonObject {
                        put("taskTitle", f.task_title); put("durationMinutes", f.duration_minutes); put("mode", f.mode)
                        put("date", f.date); put("completedAt", f.completed_at)
                    })
                }
            })
            put("links", buildJsonArray {
                db.linkQueries.selectAllLinks().executeAsList().filter { it.deleted_at == null }.forEach { l ->
                    add(buildJsonObject {
                        put("title", l.title); put("url", l.url); put("icon", l.icon); put("iconBg", l.icon_bg)
                        put("category", l.category); put("clicks", l.clicks); put("createdAt", l.created_at)
                    })
                }
            })
            db.healthQueries.selectProfile().executeAsOneOrNull()?.toModel()?.let { p ->
                put("healthProfile", buildJsonArray {
                    add(buildJsonObject {
                        put("name", p.name); put("age", p.age); put("gender", p.gender.code); put("height", p.heightCm)
                        put("currentWeight", p.currentWeight); put("targetWeight", p.targetWeight); put("waistCm", p.waistCm)
                        put("activityLevel", p.activityLevel.code); put("goal", p.goal.code); put("stepGoal", p.stepGoal)
                    })
                })
            }
            put("weightLogs", buildJsonArray {
                db.healthQueries.selectAllWeights().executeAsList().forEach { w ->
                    add(buildJsonObject {
                        put("date", w.date); put("weight", w.weight); put("bmi", w.bmi); w.body_fat?.let { put("bodyFatPercentage", it) }
                        w.waist_cm?.let { put("waistCm", it) }; w.impedance?.let { put("impedance", it) }; put("note", w.note)
                        put("source", w.source); put("createdAt", w.measured_at)
                    })
                }
            })
            put("mealLogs", buildJsonArray {
                db.healthQueries.selectMealsBetween("0000-00-00", "9999-99-99").executeAsList().forEach { m ->
                    add(buildJsonObject {
                        put("date", m.date); put("name", m.name); put("mealType", m.meal_type); put("kcal", m.kcal)
                        put("proteinGrams", m.protein); put("carbsGrams", m.carbs); put("fatGrams", m.fat); put("time", m.time)
                        put("aiEstimated", m.ai_estimated == 1L); put("createdAt", m.created_at)
                    })
                }
            })
            put("waterLogs", buildJsonArray {
                db.healthQueries.selectWaterChangedSince(-1).executeAsList().filter { it.deleted_at == null }.forEach { w ->
                    add(buildJsonObject { put("date", w.date); put("amountMl", w.amount_ml); put("createdAt", w.created_at) })
                }
            })
            put("workoutLogs", buildJsonArray {
                db.healthQueries.selectWorkoutsBetween("0000-00-00", "9999-99-99").executeAsList().forEach { w ->
                    add(buildJsonObject {
                        put("date", w.date); put("title", w.title); put("category", w.category); put("durationMinutes", w.duration_minutes)
                        put("caloriesBurned", w.calories); put("notes", w.notes); put("createdAt", w.created_at)
                    })
                }
            })
            put("stepLogs", buildJsonArray {
                db.healthQueries.selectStepsBetween("0000-00-00", "9999-99-99").executeAsList().forEach { st ->
                    add(buildJsonObject { put("date", st.date); put("steps", st.steps); put("goal", st.goal); put("source", st.source) })
                }
            })
        }
        root.toString()
    }

    /** Imports v2 (web) or v3 (native) backups. Merges into existing data; never deletes. */
    suspend fun import(json: String): Int = withContext(DbDispatcher.io) {
        val root = AppJson.parseToJsonElement(json).jsonObject
        val now = Time.nowMs()
        var count = 0
        val habitIdMap = HashMap<String, String>()

        db.transaction {
            root.arr("habits").forEach { el ->
                val h = el.jsonObject
                val oldId = h.s("id") ?: newId()
                val id = if (oldId.length >= 32) oldId else newId()
                habitIdMap[oldId] = id
                db.habitQueries.upsertHabit(
                    HabitRow(
                        id = id,
                        title = h.s("title") ?: return@forEach,
                        icon = h.s("icon") ?: "bolt",
                        color = h.s("color") ?: "#3D6B52",
                        target_days = h.list("targetDays").ifEmpty { com.kairo.planner.core.ALL_DAY_CODES }.joinToString(","),
                        reminder_minute = null,
                        archived = if (h.b("archived") == true) 1L else 0L,
                        sort_order = h.l("order") ?: 0L,
                        created_at = h.l("createdAt") ?: now,
                        updated_at = now,
                        deleted_at = null,
                    ),
                )
                count++
            }
            root.arr("habitLogs").forEach { el ->
                val l = el.jsonObject
                val hid = habitIdMap[l.s("habitId") ?: return@forEach] ?: l.s("habitId") ?: return@forEach
                db.habitQueries.upsertLog(hid, l.s("date") ?: return@forEach, if (l.b("completed") != false) 1L else 0L, now)
            }
            root.arr("tasks").forEach { el ->
                val t = el.jsonObject
                val subs = (t["subtasks"] as? JsonArray)?.mapNotNull { s ->
                    val o = s as? JsonObject ?: return@mapNotNull null
                    SubTask(o.s("id") ?: newId(), o.s("title") ?: return@mapNotNull null, o.b("isCompleted") ?: false)
                } ?: emptyList()
                val oldId = t.s("id")
                val task = Task(
                    id = if (oldId != null && oldId.length >= 32) oldId else newId(),
                    title = t.s("title") ?: return@forEach,
                    notes = t.s("notes") ?: "",
                    isPriority = t.b("isPriority") ?: false,
                    isCompleted = t.b("isCompleted") ?: false,
                    date = t.s("date") ?: Time.todayKey(),
                    category = TaskCategory.of(t.s("category")),
                    estimatedMinutes = (t.l("estimatedMinutes") ?: 30L).toInt(),
                    subtasks = subs,
                    recurringDays = (t["recurringDays"] as? JsonArray)?.mapNotNull { (it as? JsonPrimitive)?.contentOrNull }
                        ?: t.s("recurringDays")?.split(',')?.filter { it.isNotBlank() } ?: emptyList(),
                    sortOrder = (t.l("order") ?: 0L).toInt(),
                    completedAt = t.l("completedAt"),
                    createdAt = t.l("createdAt") ?: now,
                    updatedAt = now,
                )
                db.taskQueries.upsert(task.toRow())
                count++
            }
            root.arr("focusSessions").forEach { el ->
                val f = el.jsonObject
                db.focusQueries.insertFocus(
                    FocusRow(
                        newId(), null, f.s("taskTitle"), f.l("durationMinutes") ?: return@forEach, f.s("mode") ?: "pomodoro",
                        f.s("date") ?: return@forEach, f.l("completedAt") ?: now, now,
                    ),
                )
                count++
            }
            root.arr("links").forEach { el ->
                val l = el.jsonObject
                db.linkQueries.upsertLink(
                    LinkRow(newId(), l.s("title") ?: return@forEach, l.s("url") ?: return@forEach, l.s("icon") ?: "🔗", l.s("iconBg") ?: "#DDE8DE", l.s("category") ?: "general", l.l("clicks") ?: 0, l.l("createdAt") ?: now, now, null),
                )
            }
            root.arr("waterLogs").forEach { el ->
                val w = el.jsonObject
                db.healthQueries.upsertWater(WaterRow(newId(), w.s("date") ?: return@forEach, w.l("amountMl") ?: return@forEach, w.l("createdAt") ?: now, now, null))
                count++
            }
            root.arr("workoutLogs").forEach { el ->
                val w = el.jsonObject
                db.healthQueries.upsertWorkout(
                    WorkoutRow(
                        newId(), w.s("date") ?: return@forEach, w.s("title") ?: "Workout", WorkoutCategory.of(w.s("category")).code,
                        w.l("durationMinutes") ?: 30, w.l("caloriesBurned") ?: 0, w.s("notes") ?: "", "import", null, w.l("createdAt") ?: now, now, null,
                    ),
                )
                count++
            }
        }

        // Profile first, so imported weights get a correct BMI/composition.
        root.arr("healthProfile").firstOrNull()?.jsonObject?.let { p ->
            health.saveProfile(
                HealthProfile(
                    name = p.s("name") ?: "",
                    age = (p.l("age") ?: 0L).toInt(),
                    gender = Gender.of(p.s("gender")),
                    heightCm = p.d("height") ?: 0.0,
                    currentWeight = p.d("currentWeight") ?: 0.0,
                    targetWeight = p.d("targetWeight") ?: 0.0,
                    waistCm = p.d("waistCm") ?: 0.0,
                    activityLevel = ActivityLevel.of(p.s("activityLevel")),
                    goal = HealthGoal.of(p.s("goal")),
                    stepGoal = (p.l("stepGoal") ?: 10_000L).toInt(),
                ),
            )
        }
        val profile = health.currentProfile()
        withContext(DbDispatcher.io) {
            db.transaction {
                root.arr("weightLogs").forEach { el ->
                    val w = el.jsonObject
                    val kg = w.d("weight") ?: return@forEach
                    val imp = w.l("impedance")?.toInt()
                    val comp = if (BodyCompositionCalculator.isValidImpedance(imp)) {
                        BodyCompositionCalculator.calculate(kg, imp!!, profile.heightCm, profile.age, profile.gender)
                    } else BodyCompositionCalculator.estimateWithoutImpedance(kg, profile.heightCm, profile.age, profile.gender)
                    val at = w.l("createdAt") ?: Time.startOfDayMs(Time.parse(w.s("date") ?: "") ?: Time.today()) + 8 * 3600_000L
                    db.healthQueries.upsertWeight(
                        WeightLog(
                            id = newId(), date = w.s("date") ?: Time.dateOf(at).toString(), measuredAt = at, weight = kg,
                            bmi = HealthFormulas.bmi(kg, profile.heightCm), bodyFat = w.d("bodyFatPercentage"),
                            waistCm = w.d("waistCm"), impedance = imp, note = w.s("note") ?: "", source = w.s("source") ?: "import",
                            composition = comp, externalId = null,
                        ).toRow(now),
                    )
                    count++
                }
                root.arr("mealLogs").forEach { el ->
                    val m = el.jsonObject
                    db.healthQueries.upsertMeal(
                        com.kairo.planner.model.MealLog(
                            id = newId(), date = m.s("date") ?: return@forEach, time = m.s("time") ?: "12:00", name = m.s("name") ?: return@forEach,
                            mealType = MealType.of(m.s("mealType")), kcal = (m.l("kcal") ?: 0L).toInt(), protein = m.d("proteinGrams") ?: 0.0,
                            carbs = m.d("carbsGrams") ?: 0.0, fat = m.d("fatGrams") ?: 0.0, grams = null, aiEstimated = m.b("aiEstimated") ?: false,
                            createdAt = m.l("createdAt") ?: now,
                        ).toRow(now),
                    )
                    count++
                }
                root.arr("stepLogs").forEach { el ->
                    val st = el.jsonObject
                    val steps = (st.l("steps") ?: return@forEach).toInt()
                    db.healthQueries.upsertSteps(
                        com.kairo.planner.db.Step_log(
                            date = st.s("date") ?: return@forEach, steps = steps.toLong(), goal = st.l("goal") ?: profile.stepGoal.toLong(),
                            calories = HealthFormulas.stepCalories(steps, profile.currentWeight, profile.heightCm).toLong(),
                            distance_m = HealthFormulas.stepDistanceMeters(steps, profile.heightCm).toLong(),
                            active_minutes = HealthFormulas.stepActiveMinutes(steps).toLong(), source = st.s("source") ?: "import", updated_at = now,
                        ),
                    )
                }
            }
        }
        count
    }

    private fun JsonObject.arr(k: String): List<kotlinx.serialization.json.JsonElement> = (this[k] as? JsonArray)?.toList() ?: emptyList()
    private fun JsonObject.s(k: String): String? = (this[k] as? JsonPrimitive)?.contentOrNull?.takeIf { it.isNotEmpty() && it != "null" }
    private fun JsonObject.l(k: String): Long? = (this[k] as? JsonPrimitive)?.contentOrNull?.toDoubleOrNull()?.toLong()
    private fun JsonObject.d(k: String): Double? = (this[k] as? JsonPrimitive)?.contentOrNull?.toDoubleOrNull()
    private fun JsonObject.b(k: String): Boolean? = (this[k] as? JsonPrimitive)?.contentOrNull?.toBooleanStrictOrNull()
    private fun JsonObject.list(k: String): List<String> = (this[k] as? JsonArray)?.mapNotNull { (it as? JsonPrimitive)?.contentOrNull } ?: emptyList()
}
