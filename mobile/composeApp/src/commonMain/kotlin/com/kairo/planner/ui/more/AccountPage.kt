package com.kairo.planner.ui.more

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CloudSync
import androidx.compose.material.icons.rounded.Logout
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.kairo.planner.core.Time
import com.kairo.planner.data.AppSettings
import com.kairo.planner.i18n.S
import com.kairo.planner.sync.ApiClient
import com.kairo.planner.sync.ApiException
import com.kairo.planner.sync.SyncEngine
import com.kairo.planner.sync.SyncStatus
import com.kairo.planner.ui.components.FieldLabel
import com.kairo.planner.ui.components.Gap
import com.kairo.planner.ui.components.HGap
import com.kairo.planner.ui.components.NeoButton
import com.kairo.planner.ui.components.NeoButtonStyle
import com.kairo.planner.ui.components.NeoCard
import com.kairo.planner.ui.components.NeoChip
import com.kairo.planner.ui.components.NeoTextField
import com.kairo.planner.ui.dateShort
import com.kairo.planner.ui.theme.Sumire
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

@Composable
fun AccountPage(onBack: () -> Unit) {
    val api = koinInject<ApiClient>()
    val sync = koinInject<SyncEngine>()
    val settings = koinInject<AppSettings>()
    val backup = koinInject<com.kairo.planner.data.BackupService>()
    val platform = com.kairo.planner.platform.LocalPlatform.current
    val scope = rememberCoroutineScope()
    val s = S
    val c = Sumire.colors
    val userJson by settings.userJson.collectAsState()
    val status by sync.status.collectAsState()
    val server by settings.serverUrl.collectAsState()
    val user = remember(userJson) { api.currentUser() }

    var register by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var serverDraft by remember(server) { mutableStateOf(server) }

    PageScaffold(s.account, onBack) {
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (user != null && api.isSignedIn) {
                NeoCard(Modifier.fillMaxWidth(), color = c.matchaSoft) {
                    Text(user.firstName.ifBlank { user.email }, style = Sumire.type.title(), color = c.ink)
                    Text(user.email, style = Sumire.type.small(), color = c.inkMuted)
                    Gap(12)
                    val st = status
                    Text(
                        when (st) {
                            SyncStatus.Running -> s.syncing
                            is SyncStatus.Failed -> "⚠️ ${st.message}"
                            is SyncStatus.Done -> s.lastSynced("${s.dateShort(Time.dateOf(st.at))} ${Time.hhmm(st.at)} · ↑${st.pushed} ↓${st.pulled}")
                            SyncStatus.Idle -> if (settings.lastSyncAt > 0) s.lastSynced("${s.dateShort(Time.dateOf(settings.lastSyncAt))} ${Time.hhmm(settings.lastSyncAt)}") else s.neverSynced
                        },
                        style = Sumire.type.small(), color = c.ink,
                    )
                    Gap(12)
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        NeoButton(s.syncNow, { scope.launch { sync.syncNow() } }, Modifier.weight(1f), icon = Icons.Rounded.CloudSync, enabled = status != SyncStatus.Running)
                        NeoButton(s.signOut, { scope.launch { api.logout() } }, style = NeoButtonStyle.SECONDARY, icon = Icons.Rounded.Logout)
                    }
                }
            } else {
                NeoCard(Modifier.fillMaxWidth()) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        NeoChip(s.signIn, !register, { register = false; error = null })
                        NeoChip(s.signUp, register, { register = true; error = null })
                    }
                    Gap(6)
                    Text(s.accountHint, style = Sumire.type.small(), color = c.inkMuted)
                    if (register) {
                        FieldLabel(s.firstName)
                        NeoTextField(name, { name = it }, placeholder = s.firstName)
                    }
                    FieldLabel(s.email)
                    NeoTextField(email, { email = it.trim() }, placeholder = "you@example.com", keyboardType = KeyboardType.Email)
                    FieldLabel(s.password)
                    NeoTextField(password, { password = it }, placeholder = "••••••••", keyboardType = KeyboardType.Password, password = true)
                    error?.let { Gap(8); Text("⚠️ $it", style = Sumire.type.small(), color = c.terracotta) }
                    Gap(16)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        NeoButton(
                            if (register) s.signUp else s.signIn,
                            {
                                busy = true
                                error = null
                                scope.launch {
                                    try {
                                        val account = if (register) api.register(email, password, name.ifBlank { email.substringBefore('@') })
                                        else api.login(email, password)
                                        // First sync after sign-in pushes everything local and pulls the cloud copy.
                                        settings.lastSyncAt = 0
                                        settings.lastPullServerTs = 0
                                        // One-time migration of data the old web/Capacitor app synced (protocol v1).
                                        if (!register && settings.legacyImportedFor != account.id) {
                                            runCatching { backup.import(api.getJson("/sync/pull").toString()) }
                                                .onSuccess { settings.legacyImportedFor = account.id }
                                        }
                                        sync.syncNow()
                                    } catch (e: ApiException) {
                                        error = e.message
                                    } catch (e: Exception) {
                                        error = e.message ?: s.signInFailed
                                    } finally {
                                        busy = false
                                    }
                                }
                            },
                            Modifier.weight(1f),
                            enabled = !busy && email.contains('@') && password.length >= (if (register) 8 else 1),
                        )
                        if (busy) {
                            HGap(12)
                            CircularProgressIndicator(Modifier.size(22.dp), color = c.matcha, strokeWidth = 2.dp)
                        }
                    }
                    Gap(10)
                    NeoButton(
                        "Google",
                        {
                            busy = true
                            error = null
                            scope.launch {
                                try {
                                    val token = platform.googleIdToken(AppSettings.GOOGLE_WEB_CLIENT_ID)
                                    if (token != null) {
                                        val account = api.loginWithGoogle(token)
                                        settings.lastSyncAt = 0
                                        settings.lastPullServerTs = 0
                                        if (settings.legacyImportedFor != account.id) {
                                            runCatching { backup.import(api.getJson("/sync/pull").toString()) }
                                                .onSuccess { settings.legacyImportedFor = account.id }
                                        }
                                        sync.syncNow()
                                    }
                                } catch (e: Exception) {
                                    if (e is kotlinx.coroutines.CancellationException) throw e
                                    error = e.message ?: s.signInFailed
                                } finally {
                                    busy = false
                                }
                            }
                        },
                        Modifier.fillMaxWidth(),
                        style = NeoButtonStyle.SECONDARY,
                        enabled = !busy,
                    )
                }
            }
            NeoCard(Modifier.fillMaxWidth()) {
                FieldLabel(s.server)
                NeoTextField(serverDraft, { serverDraft = it.trim() }, keyboardType = KeyboardType.Uri, onImeAction = { settings.setServerUrl(serverDraft) })
                Gap(8)
                NeoButton(s.save, { settings.setServerUrl(serverDraft) }, compact = true, style = NeoButtonStyle.SECONDARY, enabled = serverDraft != server && serverDraft.startsWith("http"))
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}
