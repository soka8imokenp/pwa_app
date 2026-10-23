package com.kairo.planner.ai

import com.kairo.planner.data.AppJson
import io.ktor.client.HttpClient
import io.ktor.client.plugins.timeout
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject
import kotlin.io.encoding.Base64
import kotlin.io.encoding.ExperimentalEncodingApi

class GeminiException(message: String, val code: Int = 0) : Exception(message)

sealed interface Part {
    data class Text(val text: String) : Part
    data class Image(val bytes: ByteArray, val mime: String = "image/jpeg") : Part
    data class Call(val name: String, val args: JsonObject) : Part
    data class Response(val name: String, val result: JsonObject) : Part
}

data class Turn(val role: String, val parts: List<Part>)

data class GeminiResult(val parts: List<Part>, val model: String) {
    val text: String get() = parts.filterIsInstance<Part.Text>().joinToString("") { it.text }.trim()
    val calls: List<Part.Call> get() = parts.filterIsInstance<Part.Call>()
}

/**
 * Minimal Gemini REST client (generateContent) with tool calling, images and model fallback.
 * The key travels in the `x-goog-api-key` header – never in the URL, so it doesn't end up in proxy logs.
 */
class GeminiClient(private val http: HttpClient) {

    suspend fun generate(
        apiKey: String,
        models: List<String>,
        system: String,
        turns: List<Turn>,
        tools: JsonArray? = null,
        temperature: Double = 0.5,
        maxTokens: Int = 2048,
        jsonSchema: JsonObject? = null,
    ): GeminiResult {
        if (apiKey.isBlank()) throw GeminiException("NO_KEY")
        val body = buildJsonObject {
            putJsonObject("systemInstruction") { putJsonArray("parts") { add(buildJsonObject { put("text", system) }) } }
            put("contents", encodeTurns(turns))
            if (tools != null) {
                putJsonArray("tools") { add(buildJsonObject { put("functionDeclarations", tools) }) }
            }
            putJsonObject("generationConfig") {
                put("temperature", temperature)
                put("maxOutputTokens", maxTokens)
                if (jsonSchema != null) {
                    put("responseMimeType", "application/json")
                    put("responseSchema", jsonSchema)
                }
            }
        }
        var last: GeminiException? = null
        for (model in models.distinct().filter { it.isNotBlank() }) {
            try {
                val res = http.post("https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent") {
                    contentType(ContentType.Application.Json)
                    header("x-goog-api-key", apiKey)
                    setBody(body.toString())
                    timeout { requestTimeoutMillis = 60_000 }
                }
                val text = res.bodyAsText()
                if (!res.status.isSuccess()) {
                    val msg = runCatching {
                        AppJson.parseToJsonElement(text).jsonObject["error"]?.jsonObject?.get("message")?.jsonPrimitive?.contentOrNull
                    }.getOrNull() ?: "HTTP ${res.status.value}"
                    last = GeminiException(msg, res.status.value)
                    // A bad key won't get better with another model.
                    if (res.status.value == 400 && msg.contains("API key", ignoreCase = true)) throw last
                    if (res.status.value == 403) throw last
                    continue
                }
                return GeminiResult(decodeParts(AppJson.parseToJsonElement(text).jsonObject), model)
            } catch (e: GeminiException) {
                throw e
            } catch (e: Exception) {
                last = GeminiException(e.message ?: "network")
            }
        }
        throw last ?: GeminiException("No model available")
    }

    @OptIn(ExperimentalEncodingApi::class)
    private fun encodeTurns(turns: List<Turn>): JsonArray = buildJsonArray {
        turns.forEach { t ->
            add(
                buildJsonObject {
                    put("role", t.role)
                    putJsonArray("parts") {
                        t.parts.forEach { p ->
                            add(
                                when (p) {
                                    is Part.Text -> buildJsonObject { put("text", p.text) }
                                    is Part.Image -> buildJsonObject {
                                        putJsonObject("inlineData") {
                                            put("mimeType", p.mime)
                                            put("data", Base64.encode(p.bytes))
                                        }
                                    }
                                    is Part.Call -> buildJsonObject {
                                        putJsonObject("functionCall") {
                                            put("name", p.name)
                                            put("args", p.args)
                                        }
                                    }
                                    is Part.Response -> buildJsonObject {
                                        putJsonObject("functionResponse") {
                                            put("name", p.name)
                                            put("response", p.result)
                                        }
                                    }
                                },
                            )
                        }
                    }
                },
            )
        }
    }

    private fun decodeParts(root: JsonObject): List<Part> {
        val candidate = root["candidates"]?.jsonArray?.firstOrNull()?.jsonObject
            ?: run {
                val reason = root["promptFeedback"]?.jsonObject?.get("blockReason")?.jsonPrimitive?.contentOrNull
                throw GeminiException(reason ?: "Empty response")
            }
        val parts = candidate["content"]?.jsonObject?.get("parts")?.jsonArray ?: return emptyList()
        return parts.mapNotNull { el ->
            val o = el.jsonObject
            when {
                o["thought"]?.jsonPrimitive?.contentOrNull == "true" -> null
                o.containsKey("text") -> Part.Text(o["text"]!!.jsonPrimitive.content)
                o.containsKey("functionCall") -> {
                    val fc = o["functionCall"]!!.jsonObject
                    Part.Call(fc["name"]!!.jsonPrimitive.content, fc["args"] as? JsonObject ?: JsonObject(emptyMap()))
                }
                else -> null
            }
        }
    }
}

// ---- tiny JSON helpers for tool args ----

fun JsonObject.str(key: String): String? = (this[key] as? JsonPrimitive)?.contentOrNull?.takeIf { it.isNotBlank() }

fun JsonObject.num(key: String): Double? = (this[key] as? JsonPrimitive)?.contentOrNull?.toDoubleOrNull()

fun JsonObject.int(key: String): Int? = num(key)?.toInt()

fun JsonObject.bool(key: String): Boolean? = (this[key] as? JsonPrimitive)?.contentOrNull?.toBooleanStrictOrNull()

fun JsonObject.strList(key: String): List<String> =
    (this[key] as? JsonArray)?.mapNotNull { (it as? JsonPrimitive)?.contentOrNull } ?: emptyList()

fun jsonOf(vararg pairs: Pair<String, Any?>): JsonObject = buildJsonObject {
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
