package com.kairo.planner.sync

import com.kairo.planner.core.Time
import com.kairo.planner.data.AppJson
import com.kairo.planner.data.AppSettings
import com.kairo.planner.data.ChangeListener
import com.kairo.planner.data.DbDispatcher
import com.kairo.planner.db.SumireDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import kotlinx.serialization.json.put
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

sealed interface SyncStatus {
    data object Idle : SyncStatus
    data object Running : SyncStatus
    data class Done(val at: Long, val pushed: Int, val pulled: Int) : SyncStatus
    data class Failed(val message: String) : SyncStatus
}

/** One record type ↔ JSON. `id` must be stable across devices (UUIDs, or natural keys for log tables). */
private class Codec<R : Any>(
    val entity: String,
    val changedSince: (Long) -> List<R>,
    val id: (R) -> String,
    val updatedAt: (R) -> Long,
    val deleted: (R) -> Boolean,
    val encode: (R) -> JsonObject,
    val localUpdatedAt: (String) -> Long?,
    /** Applies a remote record; `deleted` tombstones for tables without soft delete simply remove the row. */
    val apply: (id: String, data: JsonObject, updatedAt: Long, deleted: Boolean) -> Unit,
)

/**
 * Two-way sync with `/api/sync/v2`: push everything changed locally since the last sync, then pull
 * everything the server got from other devices. Last-writer-wins by client `updated_at`.
 * Local writes trigger a debounced sync via [ChangeListener].
 */
class SyncEngine(
    private val db: SumireDatabase,
    private val api: ApiClient,
    private val settings: AppSettings,
    private val scope: CoroutineScope,
) : ChangeListener {
    private val mutex = Mutex()
    private var debounce: Job? = null
    private val _status = MutableStateFlow<SyncStatus>(SyncStatus.Idle)
    val status: StateFlow<SyncStatus> = _status.asStateFlow()

    override fun onLocalChange() {
        if (!api.isSignedIn) return
        debounce?.cancel()
        debounce = scope.launch {
            delay(4_000)
            syncNow()
        }
    }

    suspend fun syncNow(): SyncStatus = mutex.withLock {
        if (!api.isSignedIn) return@withLock SyncStatus.Idle.also { _status.value = it }
        _status.value = SyncStatus.Running
        val result = try {
            val startedAt = Time.nowMs()
            val pushed = push(settings.lastSyncAt)
            val pulled = pull()
            settings.lastSyncAt = startedAt
            SyncStatus.Done(Time.nowMs(), pushed, pulled)
        } catch (e: Exception) {
            if (e is kotlinx.coroutines.CancellationException) throw e
            SyncStatus.Failed(e.message ?: "sync error")
        }
        _status.value = result
        result
    }

    private suspend fun push(since: Long): Int {
        val records = withContext(DbDispatcher.io) {
            codecs.flatMap { c ->
                @Suppress("UNCHECKED_CAST")
                val codec = c as Codec<Any>
                codec.changedSince(since).map { row ->
                    buildJsonObject {
                        put("entity", codec.entity)
                        put("id", codec.id(row))
                        put("updatedAt", codec.updatedAt(row))
                        put("deleted", codec.deleted(row))
                        put("data", codec.encode(row).toString())
                    }
                }
            }
        }
        records.chunked(500).forEach { chunk ->
            api.postJson("/sync/v2/push", JsonObject(mapOf("records" to JsonArray(chunk))))
        }
        return records.size
    }

    private suspend fun pull(): Int {
        var cursor = settings.lastPullServerTs
        var total = 0
        var pages = 0
        while (pages++ < 50) {
            val page = api.getJson("/sync/v2/pull?since=$cursor&limit=500")
            val recs = page["records"]?.jsonArray ?: JsonArray(emptyList())
            withContext(DbDispatcher.io) {
                db.transaction {
                    recs.forEach { el ->
                        val r = el.jsonObject
                        val entity = r.s("entity") ?: return@forEach
                        val id = r.s("id") ?: return@forEach
                        val updatedAt = r["updatedAt"]?.jsonPrimitive?.longOrNull ?: return@forEach
                        val deleted = r["deleted"]?.jsonPrimitive?.contentOrNull == "true"
                        val data = runCatching { AppJson.parseToJsonElement(r.s("data") ?: "{}").jsonObject }.getOrNull() ?: return@forEach
                        val codec = byEntity[entity] ?: return@forEach
                        val local = codec.localUpdatedAt(id)
                        if (local == null || updatedAt > local) {
                            runCatching { codec.apply(id, data, updatedAt, deleted) }
                            total++
                        }
                    }
                }
            }
            cursor = page["cursor"]?.jsonPrimitive?.longOrNull ?: cursor
            settings.lastPullServerTs = cursor
            if (page["hasMore"]?.jsonPrimitive?.contentOrNull != "true") break
        }
        return total
    }

    // ------------------------------------------------------------------ codecs

    private val tq get() = db.taskQueries
    private val hq get() = db.habitQueries
    private val fq get() = db.focusQueries
    private val lq get() = db.linkQueries
    private val q get() = db.healthQueries
    private val mq get() = db.miscQueries

    private val codecs: List<Codec<*>> by lazy {
        listOf(
            Codec<TaskRow>(
                "task", { tq.selectChangedSince(it).executeAsList() }, { it.id }, { it.updated_at }, { it.deleted_at != null },
                { r ->
                    obj(
                        "title" to r.title, "notes" to r.notes, "isPriority" to r.is_priority, "isCompleted" to r.is_completed,
                        "date" to r.date, "category" to r.category, "estimatedMinutes" to r.estimated_minutes,
                        "subtasks" to AppJson.parseToJsonElement(r.subtasks_json), "recurringDays" to r.recurring_days,
                        "sortOrder" to r.sort_order, "reminderAt" to r.reminder_at, "completedAt" to r.completed_at,
                        "createdAt" to r.created_at, "deletedAt" to r.deleted_at,
                    )
                },
                { tq.selectById(it).executeAsOneOrNull()?.updated_at },
                { id, d, u, del ->
                    tq.upsert(
                        TaskRow(
                            id, d.s("title") ?: "", d.s("notes") ?: "", d.l("isPriority") ?: 0, d.l("isCompleted") ?: 0,
                            d.s("date") ?: Time.todayKey(), d.s("category") ?: "general", d.l("estimatedMinutes") ?: 30,
                            d["subtasks"]?.toString() ?: "[]", d.s("recurringDays") ?: "", d.l("sortOrder") ?: 0,
                            d.l("reminderAt"), d.l("completedAt"), d.l("createdAt") ?: u, u, if (del) (d.l("deletedAt") ?: u) else null,
                        ),
                    )
                },
            ),
            Codec<HabitRow>(
                "habit", { hq.selectHabitsChangedSince(it).executeAsList() }, { it.id }, { it.updated_at }, { it.deleted_at != null },
                { r ->
                    obj(
                        "title" to r.title, "icon" to r.icon, "color" to r.color, "targetDays" to r.target_days,
                        "reminderMinute" to r.reminder_minute, "archived" to r.archived, "sortOrder" to r.sort_order,
                        "createdAt" to r.created_at, "deletedAt" to r.deleted_at,
                    )
                },
                { hq.selectHabitById(it).executeAsOneOrNull()?.updated_at },
                { id, d, u, del ->
                    hq.upsertHabit(
                        HabitRow(
                            id, d.s("title") ?: "", d.s("icon") ?: "bolt", d.s("color") ?: "#3D6B52", d.s("targetDays") ?: "",
                            d.l("reminderMinute"), d.l("archived") ?: 0, d.l("sortOrder") ?: 0, d.l("createdAt") ?: u, u,
                            if (del) (d.l("deletedAt") ?: u) else null,
                        ),
                    )
                },
            ),
            Codec<HabitLogRow>(
                "habit_log", { hq.selectLogsChangedSince(it).executeAsList() }, { "${it.habit_id}|${it.date}" }, { it.updated_at }, { false },
                { r -> obj("habitId" to r.habit_id, "date" to r.date, "completed" to r.completed) },
                { key -> key.split('|').let { hq.selectLog(it[0], it.getOrElse(1) { "" }).executeAsOneOrNull()?.updated_at } },
                { _, d, u, _ -> hq.upsertLog(d.s("habitId") ?: error("missing field"), d.s("date") ?: error("missing field"), d.l("completed") ?: 0, u) },
            ),
            Codec<FocusRow>(
                "focus", { fq.selectFocusChangedSince(it).executeAsList() }, { it.id }, { it.updated_at }, { false },
                { r ->
                    obj(
                        "taskId" to r.task_id, "taskTitle" to r.task_title, "durationMinutes" to r.duration_minutes,
                        "mode" to r.mode, "date" to r.date, "completedAt" to r.completed_at,
                    )
                },
                { fq.selectFocusById(it).executeAsOneOrNull()?.updated_at },
                { id, d, u, _ ->
                    fq.insertFocus(FocusRow(id, d.s("taskId"), d.s("taskTitle"), d.l("durationMinutes") ?: 0, d.s("mode") ?: "pomodoro", d.s("date") ?: error("missing field"), d.l("completedAt") ?: u, u))
                },
            ),
            Codec<LinkRow>(
                "link", { lq.selectLinksChangedSince(it).executeAsList() }, { it.id }, { it.updated_at }, { it.deleted_at != null },
                { r ->
                    obj(
                        "title" to r.title, "url" to r.url, "icon" to r.icon, "iconBg" to r.icon_bg, "category" to r.category,
                        "clicks" to r.clicks, "createdAt" to r.created_at, "deletedAt" to r.deleted_at,
                    )
                },
                { lq.selectLinkById(it).executeAsOneOrNull()?.updated_at },
                { id, d, u, del ->
                    lq.upsertLink(LinkRow(id, d.s("title") ?: "", d.s("url") ?: "", d.s("icon") ?: "🔗", d.s("iconBg") ?: "#DDE8DE", d.s("category") ?: "general", d.l("clicks") ?: 0, d.l("createdAt") ?: u, u, if (del) u else null))
                },
            ),
            Codec<ProfileRow>(
                "profile", { since -> q.selectProfile().executeAsList().filter { it.updated_at > since } }, { "user" }, { it.updated_at }, { false },
                { r ->
                    obj(
                        "name" to r.name, "age" to r.age, "gender" to r.gender, "heightCm" to r.height_cm, "currentWeight" to r.current_weight,
                        "targetWeight" to r.target_weight, "waistCm" to r.waist_cm, "activityLevel" to r.activity_level, "goal" to r.goal,
                        "stepGoal" to r.step_goal, "waterGoalMl" to r.water_goal_ml, "calorieGoalOverride" to r.calorie_goal_override,
                    )
                },
                { q.selectProfile().executeAsOneOrNull()?.updated_at },
                { _, d, u, _ ->
                    q.upsertProfile(
                        ProfileRow(
                            "user", d.s("name") ?: "", 0, d.l("age") ?: 0, d.s("gender") ?: "male", d.d("heightCm") ?: 0.0,
                            d.d("currentWeight") ?: 0.0, d.d("targetWeight") ?: 0.0, d.d("waistCm") ?: 0.0, d.s("activityLevel") ?: "moderate",
                            d.s("goal") ?: "maintain", d.l("stepGoal") ?: 10_000, d.l("waterGoalMl") ?: 0, d.l("calorieGoalOverride") ?: 0, u,
                        ),
                    )
                },
            ),
            Codec<WeightRow>(
                "weight", { q.selectWeightsChangedSince(it).executeAsList() }, { it.id }, { it.updated_at }, { it.deleted_at != null },
                { r ->
                    obj(
                        "date" to r.date, "measuredAt" to r.measured_at, "weight" to r.weight, "bmi" to r.bmi, "bodyFat" to r.body_fat,
                        "waistCm" to r.waist_cm, "impedance" to r.impedance, "note" to r.note, "source" to r.source,
                        "metrics" to r.metrics_json?.let { AppJson.parseToJsonElement(it) }, "externalId" to r.external_id, "createdAt" to r.created_at,
                    )
                },
                { q.selectWeightById(it).executeAsOneOrNull()?.updated_at },
                { id, d, u, del ->
                    q.upsertWeight(
                        WeightRow(
                            id, d.s("date") ?: error("missing field"), d.l("measuredAt") ?: u, d.d("weight") ?: error("missing field"), d.d("bmi") ?: 0.0,
                            d.d("bodyFat"), d.d("waistCm"), d.l("impedance"), d.s("note") ?: "", d.s("source") ?: "sync",
                            d["metrics"]?.takeIf { it !is JsonNull }?.toString(), d.s("externalId"), d.l("createdAt") ?: u, u, if (del) u else null,
                        ),
                    )
                },
            ),
            Codec<MealRow>(
                "meal", { q.selectMealsChangedSince(it).executeAsList() }, { it.id }, { it.updated_at }, { it.deleted_at != null },
                { r ->
                    obj(
                        "date" to r.date, "time" to r.time, "name" to r.name, "mealType" to r.meal_type, "kcal" to r.kcal,
                        "protein" to r.protein, "carbs" to r.carbs, "fat" to r.fat, "grams" to r.grams, "aiEstimated" to r.ai_estimated,
                        "createdAt" to r.created_at,
                    )
                },
                { q.selectMealById(it).executeAsOneOrNull()?.updated_at },
                { id, d, u, del ->
                    q.upsertMeal(
                        MealRow(
                            id, d.s("date") ?: error("missing field"), d.s("time") ?: "", d.s("name") ?: "", d.s("mealType") ?: "snack", d.l("kcal") ?: 0,
                            d.d("protein") ?: 0.0, d.d("carbs") ?: 0.0, d.d("fat") ?: 0.0, d.l("grams"), d.l("aiEstimated") ?: 0,
                            d.l("createdAt") ?: u, u, if (del) u else null,
                        ),
                    )
                },
            ),
            Codec<WaterRow>(
                "water", { q.selectWaterChangedSince(it).executeAsList() }, { it.id }, { it.updated_at }, { it.deleted_at != null },
                { r -> obj("date" to r.date, "amountMl" to r.amount_ml, "createdAt" to r.created_at) },
                { q.selectWaterById(it).executeAsOneOrNull()?.updated_at },
                { id, d, u, del -> q.upsertWater(WaterRow(id, d.s("date") ?: error("missing field"), d.l("amountMl") ?: 0, d.l("createdAt") ?: u, u, if (del) u else null)) },
            ),
            Codec<WorkoutRow>(
                "workout", { q.selectWorkoutsChangedSince(it).executeAsList() }, { it.id }, { it.updated_at }, { it.deleted_at != null },
                { r ->
                    obj(
                        "date" to r.date, "title" to r.title, "category" to r.category, "durationMinutes" to r.duration_minutes,
                        "calories" to r.calories, "notes" to r.notes, "source" to r.source, "externalId" to r.external_id, "createdAt" to r.created_at,
                    )
                },
                { q.selectWorkoutById(it).executeAsOneOrNull()?.updated_at },
                { id, d, u, del ->
                    q.upsertWorkout(
                        WorkoutRow(
                            id, d.s("date") ?: error("missing field"), d.s("title") ?: "", d.s("category") ?: "cardio", d.l("durationMinutes") ?: 0,
                            d.l("calories") ?: 0, d.s("notes") ?: "", d.s("source") ?: "sync", d.s("externalId"), d.l("createdAt") ?: u, u, if (del) u else null,
                        ),
                    )
                },
            ),
            Codec<StepRow>(
                "steps", { q.selectStepsChangedSince(it).executeAsList() }, { it.date }, { it.updated_at }, { false },
                { r ->
                    obj(
                        "steps" to r.steps, "goal" to r.goal, "calories" to r.calories, "distanceM" to r.distance_m,
                        "activeMinutes" to r.active_minutes, "source" to r.source,
                    )
                },
                { q.selectStepsForDate(it).executeAsOneOrNull()?.updated_at },
                { date, d, u, _ ->
                    // Steps from two phones: keep the larger count for the day.
                    val local = q.selectStepsForDate(date).executeAsOneOrNull()
                    val remoteSteps = d.l("steps") ?: 0
                    if (local == null || remoteSteps >= local.steps) {
                        q.upsertSteps(StepRow(date, remoteSteps, d.l("goal") ?: 10_000, d.l("calories") ?: 0, d.l("distanceM") ?: 0, d.l("activeMinutes") ?: 0, d.s("source") ?: "sync", u))
                    }
                },
            ),
            Codec<DayNoteRow>(
                "day_note", { mq.selectDayNotesChangedSince(it).executeAsList() }, { it.date }, { it.updated_at }, { false },
                { r -> obj("mood" to r.mood, "note" to r.note) },
                { mq.selectDayNote(it).executeAsOneOrNull()?.updated_at },
                { date, d, u, _ -> mq.upsertDayNote(DayNoteRow(date, d.l("mood") ?: 0, d.s("note") ?: "", u)) },
            ),
        )
    }

    private val byEntity: Map<String, Codec<*>> by lazy { codecs.associateBy { it.entity } }
}

private fun obj(vararg pairs: Pair<String, Any?>): JsonObject = buildJsonObject {
    pairs.forEach { (k, v) ->
        when (v) {
            null -> {}
            is String -> put(k, v)
            is Number -> put(k, v)
            is Boolean -> put(k, v)
            is JsonElement -> put(k, v)
            else -> put(k, v.toString())
        }
    }
}

private fun JsonObject.s(k: String): String? = (this[k] as? JsonPrimitive)?.takeIf { it !is JsonNull }?.contentOrNull

private fun JsonObject.l(k: String): Long? = (this[k] as? JsonPrimitive)?.contentOrNull?.let { it.toLongOrNull() ?: it.toDoubleOrNull()?.toLong() ?: (if (it == "true") 1L else if (it == "false") 0L else null) }

private fun JsonObject.d(k: String): Double? = (this[k] as? JsonPrimitive)?.contentOrNull?.toDoubleOrNull()
