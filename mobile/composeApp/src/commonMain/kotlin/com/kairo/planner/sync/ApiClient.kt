package com.kairo.planner.sync

import com.kairo.planner.data.AppJson
import com.kairo.planner.data.AppSettings
import io.ktor.client.HttpClient
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class ApiException(message: String, val status: Int = 0) : Exception(message)

@Serializable
data class AccountUser(
    val id: String,
    val email: String,
    val firstName: String = "",
    val lastName: String? = null,
    val username: String? = null,
    val avatarUrl: String? = null,
)

/**
 * Thin REST client for the Daily Sumire server: bearer auth, transparent single-flight token refresh,
 * readable error messages.
 */
class ApiClient(private val http: HttpClient, private val settings: AppSettings) {
    private val refreshMutex = Mutex()

    private val base: String get() = settings.serverUrl.value.trimEnd('/')

    val isSignedIn: Boolean get() = settings.refreshToken.isNotEmpty()

    suspend fun login(email: String, password: String): AccountUser =
        storeSession(postJson("/auth/login", JsonObject(mapOf("email" to str(email.trim()), "password" to str(password))), auth = false))

    suspend fun register(email: String, password: String, firstName: String): AccountUser =
        storeSession(
            postJson(
                "/auth/register",
                JsonObject(mapOf("email" to str(email.trim()), "password" to str(password), "firstName" to str(firstName.trim()))),
                auth = false,
            ),
        )

    suspend fun loginWithGoogle(idToken: String): AccountUser =
        storeSession(postJson("/auth/google", JsonObject(mapOf("idToken" to str(idToken))), auth = false))

    suspend fun logout() {
        val rt = settings.refreshToken
        runCatching { postJson("/auth/logout", JsonObject(mapOf("refreshToken" to str(rt))), auth = false) }
        settings.clearAccount()
    }

    suspend fun postJson(path: String, body: JsonObject, auth: Boolean = true): JsonObject =
        call(auth) { http.post(base + path) { contentType(ContentType.Application.Json); setBody(body.toString()); it(this) } }

    suspend fun getJson(path: String): JsonObject = call(true) { http.get(base + path) { it(this) } }

    private suspend fun call(auth: Boolean, request: suspend ((HttpRequestBuilder) -> Unit) -> HttpResponse): JsonObject {
        suspend fun once(): HttpResponse = request { b -> if (auth && settings.accessToken.isNotEmpty()) b.bearerAuth(settings.accessToken) }
        var res = once()
        if (auth && res.status == HttpStatusCode.Unauthorized && settings.refreshToken.isNotEmpty()) {
            if (refresh()) res = once()
        }
        val text = res.bodyAsText()
        if (!res.status.isSuccess()) {
            val msg = runCatching { AppJson.parseToJsonElement(text).jsonObject["error"]?.jsonPrimitive?.contentOrNull }.getOrNull()
            if (res.status == HttpStatusCode.Unauthorized && auth) settings.clearAccount()
            throw ApiException(msg ?: "HTTP ${res.status.value}", res.status.value)
        }
        return runCatching { AppJson.parseToJsonElement(text).jsonObject }.getOrDefault(JsonObject(emptyMap()))
    }

    /** Single-flight refresh: concurrent 401s wait for one rotation instead of burning the token twice. */
    private suspend fun refresh(): Boolean = refreshMutex.withLock {
        val before = settings.refreshToken
        if (before.isEmpty()) return@withLock false
        val res = http.post("$base/auth/refresh") {
            contentType(ContentType.Application.Json)
            setBody(JsonObject(mapOf("refreshToken" to str(before))).toString())
        }
        if (!res.status.isSuccess()) {
            // Another coroutine may have rotated it already.
            return@withLock settings.refreshToken != before && settings.refreshToken.isNotEmpty()
        }
        storeSession(AppJson.parseToJsonElement(res.bodyAsText()).jsonObject)
        true
    }

    private fun storeSession(o: JsonObject): AccountUser {
        val access = (o["accessToken"] ?: o["token"])?.jsonPrimitive?.contentOrNull ?: throw ApiException("No token in response")
        settings.accessToken = access
        o["refreshToken"]?.jsonPrimitive?.contentOrNull?.let { settings.refreshToken = it }
        val userJson = o["user"]?.jsonObject ?: throw ApiException("No user in response")
        settings.setUserJson(userJson.toString())
        return AppJson.decodeFromJsonElement(AccountUser.serializer(), userJson)
    }

    fun currentUser(): AccountUser? = settings.userJson.value.takeIf { it.isNotEmpty() }?.let {
        runCatching { AppJson.decodeFromString(AccountUser.serializer(), it) }.getOrNull()
    }

    private fun str(v: String) = kotlinx.serialization.json.JsonPrimitive(v)
}
