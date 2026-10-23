package com.kairo.planner.ai

import app.cash.sqldelight.coroutines.asFlow
import app.cash.sqldelight.coroutines.mapToList
import com.kairo.planner.core.Time
import com.kairo.planner.core.newId
import com.kairo.planner.data.AppJson
import com.kairo.planner.data.AppSettings
import com.kairo.planner.data.DbDispatcher
import com.kairo.planner.data.HealthRepository
import com.kairo.planner.data.PlannerRepository
import com.kairo.planner.db.SumireDatabase
import com.kairo.planner.model.MealType
import com.kairo.planner.model.TaskCategory
import com.kairo.planner.model.WorkoutCategory
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject
import com.kairo.planner.db.Chat_message as ChatRow

@Serializable
data class ActionChip(val label: String, val ok: Boolean = true)

@Serializable
data class MealSuggestion(
    val name: String,
    val kcal: Int,
    val protein: Double,
    val carbs: Double,
    val fat: Double,
    val mealType: String? = null,
    val grams: Int? = null,
    val waterMl: Int? = null,
)

data class ChatMessage(
    val id: String,
    val role: String,
    val content: String,
    val actions: List<ActionChip>,
    val suggestion: MealSuggestion?,
    val createdAt: Long,
)

enum class NavTarget { TODAY, HABITS, FOCUS, MORE, BODY, FOOD, ACTIVITY, COACH }

private val chipList = ListSerializer(ActionChip.serializer())

class SumireAssistant(
    private val db: SumireDatabase,
    private val gemini: GeminiClient,
    private val context: ContextBuilder,
    private val planner: PlannerRepository,
    private val health: HealthRepository,
    private val settings: AppSettings,
) {
    private val _navigation = MutableSharedFlow<NavTarget>(extraBufferCapacity = 4)
    val navigation: SharedFlow<NavTarget> = _navigation

    fun messages(): Flow<List<ChatMessage>> =
        db.miscQueries.selectChat().asFlow().mapToList(DbDispatcher.io).map { rows -> rows.map { it.toModel() } }

    suspend fun clear() = withContext(DbDispatcher.io) { db.miscQueries.clearChat() }

    fun models(): List<String> = listOf(settings.geminiModel.value, DEFAULT_MODEL, "gemini-2.5-flash-lite", "gemini-2.0-flash")

    /** Sends a user message (optionally with a photo) and stores both sides of the conversation. */
    suspend fun send(text: String, image: ByteArray? = null, languageName: String): ChatMessage {
        val key = settings.geminiKey.value
        val now = Time.nowMs()
        val userMsg = ChatMessage(newId(), "user", text.ifBlank { if (image != null) "📷" else "" }, emptyList(), null, now)
        store(userMsg)

        val history = withContext(DbDispatcher.io) { db.miscQueries.selectChat().executeAsList().map { it.toModel() } }
            .dropLast(1)
            .takeLast(12)
        val turns = ArrayList<Turn>()
        history.forEach { m ->
            val stamp = stampFor(m.createdAt)
            turns += Turn(if (m.role == "user") "user" else "model", listOf(Part.Text("$stamp ${m.content}")))
        }
        val userParts = buildList {
            if (image != null) add(Part.Image(image))
            add(Part.Text("[Today ${Time.currentHhmm()}] " + text.ifBlank { "Evaluate this meal photo: dish, portion, kcal and macros." }))
        }
        turns += Turn("user", userParts)

        val system = buildSystemPrompt(languageName, context.build())
        val chips = ArrayList<ActionChip>()
        var suggestion: MealSuggestion? = null
        var finalText = ""

        try {
            for (round in 0 until 5) {
                val result = gemini.generate(key, models(), system, turns, tools = TOOLS, temperature = 0.45)
                if (result.calls.isEmpty() || round == 4) {
                    finalText = result.text
                    break
                }
                turns += Turn("model", result.parts)
                val responses = result.calls.map { call ->
                    val (chip, response, sugg) = execute(call)
                    chip?.let { chips += it }
                    if (sugg != null) suggestion = sugg
                    Part.Response(call.name, response)
                }
                turns += Turn("user", responses)
            }
        } catch (e: GeminiException) {
            finalText = if (e.message == "NO_KEY") "" else "⚠️ ${e.message}"
            if (e.message == "NO_KEY") throw e
        }
        val reply = ChatMessage(
            newId(), "assistant",
            finalText.ifBlank { if (chips.isNotEmpty()) "✓" else "…" },
            chips, suggestion, Time.nowMs(),
        )
        store(reply)
        return reply
    }

    /** Quick structured estimate used by the "Add food" sheet. */
    suspend fun estimateMeal(description: String, image: ByteArray?, languageName: String): MealSuggestion {
        val schema = buildJsonObject {
            put("type", "OBJECT")
            putJsonObject("properties") {
                putJsonObject("name") { put("type", "STRING") }
                putJsonObject("kcal") { put("type", "INTEGER") }
                putJsonObject("protein") { put("type", "NUMBER") }
                putJsonObject("carbs") { put("type", "NUMBER") }
                putJsonObject("fat") { put("type", "NUMBER") }
                putJsonObject("grams") { put("type", "INTEGER") }
                putJsonObject("waterMl") { put("type", "INTEGER") }
            }
            putJsonArray("required") { add(kotlinx.serialization.json.JsonPrimitive("name")); add(kotlinx.serialization.json.JsonPrimitive("kcal")) }
        }
        val parts = buildList {
            if (image != null) add(Part.Image(image))
            add(Part.Text(description.ifBlank { "Identify the dish in the photo." }))
        }
        val system = """
            You are a precise nutritionist. Estimate the total calories and macros of the described or photographed food
            for the portion given (assume a typical single portion if none). Use realistic values from standard food
            composition tables (USDA / regional cuisine incl. Uzbek and Russian dishes). Name the dish briefly in $languageName.
            "waterMl" is only for drinks (volume of liquid), otherwise 0. "grams" is the estimated portion weight.
        """.trimIndent()
        val r = gemini.generate(settings.geminiKey.value, models(), system, listOf(Turn("user", parts)), temperature = 0.2, maxTokens = 400, jsonSchema = schema)
        val o = AppJson.parseToJsonElement(r.text).let { it as JsonObject }
        return MealSuggestion(
            name = o.str("name") ?: description,
            kcal = o.int("kcal") ?: 0,
            protein = o.num("protein") ?: 0.0,
            carbs = o.num("carbs") ?: 0.0,
            fat = o.num("fat") ?: 0.0,
            grams = o.int("grams")?.takeIf { it > 0 },
            waterMl = o.int("waterMl")?.takeIf { it > 0 },
        )
    }

    suspend fun logSuggestion(s: MealSuggestion) {
        val today = Time.todayKey()
        health.addMeal(today, s.name, s.kcal, s.protein, s.carbs, s.fat, s.mealType?.let { MealType.of(it) }, grams = s.grams, aiEstimated = true)
        s.waterMl?.let { health.addWater(today, it) }
    }

    // ------------------------------------------------------------------ tools

    private suspend fun execute(call: Part.Call): Triple<ActionChip?, JsonObject, MealSuggestion?> {
        val a = call.args
        val today = Time.todayKey()
        return try {
            when (call.name) {
                "log_meal" -> {
                    val name = a.str("name") ?: return fail("name missing")
                    val meal = health.addMeal(
                        today, name, a.int("kcal") ?: 0, a.num("protein") ?: 0.0, a.num("carbs") ?: 0.0, a.num("fat") ?: 0.0,
                        a.str("mealType")?.let { MealType.of(it) }, a.str("time"), a.int("grams"), aiEstimated = true,
                    )
                    ok("🍽 ${meal.name} · ${meal.kcal} kcal", "logged" to meal.name)
                }
                "suggest_meal" -> {
                    val s = MealSuggestion(
                        a.str("name") ?: "?", a.int("kcal") ?: 0, a.num("protein") ?: 0.0, a.num("carbs") ?: 0.0, a.num("fat") ?: 0.0,
                        a.str("mealType"), a.int("grams"), a.int("waterMl"),
                    )
                    Triple(null, jsonOf("shown_to_user" to true), s)
                }
                "delete_meal" -> {
                    val m = health.findMealByName(today, a.str("name") ?: "") ?: return fail("meal not found today")
                    health.deleteMeal(m.id)
                    ok("🗑 ${m.name}", "deleted" to m.name)
                }
                "log_water" -> {
                    val ml = a.int("amountMl") ?: return fail("amountMl missing")
                    health.addWater(today, ml)
                    ok("💧 +$ml ml", "logged_ml" to ml)
                }
                "log_weight" -> {
                    val kg = a.num("weight") ?: return fail("weight missing")
                    if (kg !in 20.0..350.0) return fail("unrealistic weight")
                    health.addWeight(kg, source = "assistant", note = a.str("note") ?: "")
                    ok("⚖️ $kg kg", "logged_kg" to kg)
                }
                "log_workout" -> {
                    val title = a.str("title") ?: return fail("title missing")
                    val minutes = a.int("durationMinutes") ?: 30
                    health.addWorkout(today, title, WorkoutCategory.of(a.str("category")), minutes, a.int("caloriesBurned"), source = "assistant")
                    ok("🏃 $title · $minutes min", "logged" to title)
                }
                "log_steps" -> {
                    val steps = a.int("steps") ?: return fail("steps missing")
                    health.setSteps(a.str("date") ?: today, steps, "manual", force = true)
                    ok("👟 $steps", "steps" to steps)
                }
                "set_step_goal" -> {
                    val goal = a.int("goal") ?: return fail("goal missing")
                    health.setStepGoal(goal)
                    ok("🎯 $goal", "goal" to goal)
                }
                "create_task" -> {
                    val title = a.str("title") ?: return fail("title missing")
                    val t = planner.addTask(
                        title = title,
                        date = a.str("date") ?: today,
                        isPriority = a.bool("isPriority") ?: false,
                        category = TaskCategory.of(a.str("category")),
                        estimatedMinutes = a.int("estimatedMinutes") ?: 30,
                        subtasks = a.strList("subtasks"),
                    )
                    ok("✅ ${t.title}${if (t.isPriority) " ★" else ""}", "created" to t.title, "priority" to t.isPriority)
                }
                "complete_task" -> {
                    val q = a.str("title") ?: return fail("title missing")
                    val t = planner.searchTasks(q).firstOrNull { !it.isCompleted } ?: return fail("task not found")
                    planner.setCompleted(t, true)
                    ok("☑️ ${t.title}", "completed" to t.title)
                }
                "delete_task" -> {
                    val q = a.str("title") ?: return fail("title missing")
                    val t = planner.searchTasks(q).firstOrNull() ?: return fail("task not found")
                    planner.deleteTask(t)
                    ok("🗑 ${t.title}", "deleted" to t.title)
                }
                "create_habit" -> {
                    val title = a.str("title") ?: return fail("title missing")
                    val days = a.strList("targetDays").ifEmpty { com.kairo.planner.core.ALL_DAY_CODES }
                    planner.addHabit(title, a.str("icon") ?: "bolt", "#3D6B52", days, null)
                    ok("🔁 $title", "created" to title)
                }
                "log_habit" -> {
                    val q = a.str("title")?.lowercase() ?: return fail("title missing")
                    val h = planner.habitsOnce().firstOrNull { it.title.lowercase().contains(q) || q.contains(it.title.lowercase()) }
                        ?: return fail("habit not found")
                    planner.setHabitDone(h.id, today, true, h.title)
                    ok("🔥 ${h.title}", "done" to h.title)
                }
                "append_scratchpad" -> {
                    val note = a.str("note") ?: return fail("note missing")
                    settings.scratchpad = (settings.scratchpad.trimEnd() + "\n• " + note).trimStart()
                    ok("📝 ${note.take(40)}", "appended" to true)
                }
                "navigate" -> {
                    val target = runCatching { NavTarget.valueOf((a.str("screen") ?: "").uppercase()) }.getOrNull() ?: return fail("unknown screen")
                    _navigation.tryEmit(target)
                    Triple(null, jsonOf("navigated" to target.name), null)
                }
                else -> fail("unknown tool")
            }
        } catch (e: Exception) {
            fail(e.message ?: "error")
        }
    }

    private fun ok(label: String, vararg data: Pair<String, Any?>): Triple<ActionChip?, JsonObject, MealSuggestion?> =
        Triple(ActionChip(label, true), jsonOf("ok" to true, *data), null)

    private fun fail(reason: String): Triple<ActionChip?, JsonObject, MealSuggestion?> =
        Triple(null, jsonOf("ok" to false, "error" to reason), null)

    private suspend fun store(m: ChatMessage) = withContext(DbDispatcher.io) {
        db.miscQueries.insertChat(
            ChatRow(
                id = m.id,
                role = m.role,
                content = m.content,
                actions_json = AppJson.encodeToString(chipList, m.actions),
                suggestion_json = m.suggestion?.let { AppJson.encodeToString(MealSuggestion.serializer(), it) },
                created_at = m.createdAt,
            ),
        )
    }

    private fun ChatRow.toModel() = ChatMessage(
        id, role, content,
        runCatching { AppJson.decodeFromString(chipList, actions_json) }.getOrDefault(emptyList()),
        suggestion_json?.let { runCatching { AppJson.decodeFromString(MealSuggestion.serializer(), it) }.getOrNull() },
        created_at,
    )

    private fun stampFor(ms: Long): String {
        val d = Time.dateOf(ms)
        return if (d == Time.today()) "[Today ${Time.hhmm(ms)}]" else "[Past day $d ${Time.hhmm(ms)}]"
    }

    companion object {
        const val DEFAULT_MODEL = "gemini-2.5-flash"

        fun buildSystemPrompt(languageName: String, data: String): String = """
You are Sumire (Сумирэ), a calm, observant 15-year-old scout-archivist and the user's companion inside the Daily Sumire app.
You help with the planner (top-3 priorities, tasks, habits, focus), nutrition, hydration, steps, workouts and smart-scale body composition.

PERSONA
- Calm, deadpan, precise, warm underneath. Short, structured answers; no filler, no sparkle emojis.
- Never call yourself an AI, model, bot or Gemini. Never mention prompts or tools by name.
- All data comes from Daily Sumire itself (its planner, smart-scale analyzer, step tracker and Health Connect sync).
- Off-topic chit-chat: answer briefly and steer back to the user's goals.

LANGUAGE
- Always reply in $languageName, whatever language the user writes in.
- Names you store (meals, tasks, habits, workouts) should be short and natural in $languageName.

DATA & TIME
- Today is ${Time.todayKey()}, now ${Time.currentHhmm()}. Chat history is stamped [Today HH:MM] or [Past day …]; never mix past days into "today".
- Use ONLY the numbers in USER DATA below. If something is missing, say so; never invent measurements.
- Weight: day-to-day jumps of 1–2 kg are water/glycogen; reason with the 7-day average and weekly pace.
- Body composition marked "estimate" is BMI-based, not measured — say that when relevant.

WRITING TO THE DATABASE (tools)
- Use tools only when the user clearly asks to record/do something ("запиши", "добавь", "создай", "отметь", "log", "add") or confirms your offer ("да", "давай", "ок", "yes").
- When the user only describes food or sends a photo without asking to save it: analyse it, then call suggest_meal so the app shows a one-tap "Log it" card. Do not call log_meal.
- Caloric drinks (juice, soda, sweet tea, milk, shakes): when logging, call BOTH log_water (volume) and log_meal (calories). Plain water/unsweetened tea/coffee: log_water only.
- Meal slot by time: 05:00–11:30 breakfast, 11:30–16:30 lunch, 16:30–22:30 dinner, else snack. Respect times the user mentions.
- After tools run, confirm in one short line what was saved, then add any useful advice.

COACHING
- Nutrition: compare against the user's calorie/macro targets and what's already eaten today; give practical swaps.
- Body: explain score deductions, body type and out-of-range metrics with concrete protocols (protein 1.6–2.2 g/kg, progressive strength training 3–5×/week, Zone 2 cardio for visceral fat, sleep, hydration).
- Safety: no medical diagnoses; suggest a doctor for symptoms, eating disorders, pregnancy or medication questions. Never recommend below 1200 kcal (women) / 1500 kcal (men) without medical supervision.

USER DATA
$data
""".trimIndent()

        private fun prop(type: String, desc: String, enum: List<String>? = null, items: String? = null) = buildJsonObject {
            put("type", type)
            put("description", desc)
            if (enum != null) putJsonArray("enum") { enum.forEach { add(kotlinx.serialization.json.JsonPrimitive(it)) } }
            if (items != null) putJsonObject("items") { put("type", items) }
        }

        private fun fn(name: String, desc: String, required: List<String>, vararg props: Pair<String, JsonObject>) = buildJsonObject {
            put("name", name)
            put("description", desc)
            putJsonObject("parameters") {
                put("type", "OBJECT")
                putJsonObject("properties") { props.forEach { (k, v) -> put(k, v) } }
                putJsonArray("required") { required.forEach { add(kotlinx.serialization.json.JsonPrimitive(it)) } }
            }
        }

        private val mealTypes = listOf("breakfast", "lunch", "dinner", "snack")

        val TOOLS: JsonArray = buildJsonArray {
            add(fn("log_meal", "Save a meal or caloric drink to today's food log. Only when the user asked to save or confirmed.", listOf("name", "kcal"),
                "name" to prop("STRING", "Short dish name"),
                "kcal" to prop("INTEGER", "Total kcal"),
                "protein" to prop("NUMBER", "Protein g"),
                "carbs" to prop("NUMBER", "Carbs g"),
                "fat" to prop("NUMBER", "Fat g"),
                "grams" to prop("INTEGER", "Portion weight g"),
                "mealType" to prop("STRING", "Meal slot", mealTypes),
                "time" to prop("STRING", "HH:MM if the user mentioned a time"),
            ))
            add(fn("suggest_meal", "Show the user a one-tap card to log the analysed food. Use when food was described/photographed but not explicitly to be saved.", listOf("name", "kcal"),
                "name" to prop("STRING", "Short dish name"),
                "kcal" to prop("INTEGER", "Total kcal"),
                "protein" to prop("NUMBER", "Protein g"),
                "carbs" to prop("NUMBER", "Carbs g"),
                "fat" to prop("NUMBER", "Fat g"),
                "grams" to prop("INTEGER", "Portion weight g"),
                "mealType" to prop("STRING", "Meal slot", mealTypes),
                "waterMl" to prop("INTEGER", "Liquid volume in ml if it is a drink"),
            ))
            add(fn("delete_meal", "Remove a meal logged today by name.", listOf("name"), "name" to prop("STRING", "Meal name keywords")))
            add(fn("log_water", "Log drunk fluid volume in ml.", listOf("amountMl"), "amountMl" to prop("INTEGER", "Volume in ml")))
            add(fn("log_weight", "Record a body weight in kg.", listOf("weight"), "weight" to prop("NUMBER", "kg"), "note" to prop("STRING", "Optional note")))
            add(fn("log_workout", "Record a workout.", listOf("title", "durationMinutes"),
                "title" to prop("STRING", "Workout name"),
                "durationMinutes" to prop("INTEGER", "Minutes"),
                "caloriesBurned" to prop("INTEGER", "Active kcal if known"),
                "category" to prop("STRING", "Type", WorkoutCategory.entries.map { it.code }),
            ))
            add(fn("log_steps", "Set the step count for a day (manual override).", listOf("steps"), "steps" to prop("INTEGER", "Steps"), "date" to prop("STRING", "YYYY-MM-DD, default today")))
            add(fn("set_step_goal", "Change the daily step goal.", listOf("goal"), "goal" to prop("INTEGER", "Steps per day")))
            add(fn("create_task", "Create a task in the planner.", listOf("title"),
                "title" to prop("STRING", "Task title"),
                "isPriority" to prop("BOOLEAN", "Put into today's top 3"),
                "category" to prop("STRING", "Category", TaskCategory.entries.map { it.code }),
                "estimatedMinutes" to prop("INTEGER", "Estimate in minutes"),
                "date" to prop("STRING", "YYYY-MM-DD, default today"),
                "subtasks" to prop("ARRAY", "Checklist steps", items = "STRING"),
            ))
            add(fn("complete_task", "Mark a task as done by title keywords.", listOf("title"), "title" to prop("STRING", "Title keywords")))
            add(fn("delete_task", "Delete a task by title keywords.", listOf("title"), "title" to prop("STRING", "Title keywords")))
            add(fn("create_habit", "Create a habit tracker.", listOf("title"),
                "title" to prop("STRING", "Habit name"),
                "icon" to prop("STRING", "Icon key", listOf("bolt", "water", "book", "run", "sleep", "heart", "meditate", "food", "code", "music")),
                "targetDays" to prop("ARRAY", "mon..sun", items = "STRING"),
            ))
            add(fn("log_habit", "Mark a habit as done today.", listOf("title"), "title" to prop("STRING", "Habit name keywords")))
            add(fn("append_scratchpad", "Append a note to the scratchpad.", listOf("note"), "note" to prop("STRING", "Note text")))
            add(fn("navigate", "Open a screen of the app.", listOf("screen"), "screen" to prop("STRING", "Screen", NavTarget.entries.map { it.name.lowercase() })))
        }
    }
}
