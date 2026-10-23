package com.kairo.planner.ui.health

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowUpward
import androidx.compose.material.icons.rounded.DeleteSweep
import androidx.compose.material.icons.rounded.PhotoCamera
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kairo.planner.ai.ChatMessage
import com.kairo.planner.ai.GeminiException
import com.kairo.planner.ai.MealSuggestion
import com.kairo.planner.ai.SumireAssistant
import com.kairo.planner.data.AppSettings
import com.kairo.planner.i18n.LocalStrings
import com.kairo.planner.i18n.S
import com.kairo.planner.platform.LocalPlatform
import com.kairo.planner.resources.Res
import com.kairo.planner.resources.mascot
import com.kairo.planner.ui.LocalAppState
import com.kairo.planner.ui.Page
import com.kairo.planner.ui.components.Gap
import com.kairo.planner.ui.components.NeoBadge
import com.kairo.planner.ui.components.NeoButton
import com.kairo.planner.ui.components.NeoCard
import com.kairo.planner.ui.components.NeoChip
import com.kairo.planner.ui.components.NeoIconButton
import com.kairo.planner.ui.components.NeoTextField
import com.kairo.planner.ui.theme.Sumire
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.painterResource
import org.koin.compose.viewmodel.koinViewModel

class CoachViewModel(private val assistant: SumireAssistant, val settings: AppSettings) : ViewModel() {
    val messages: StateFlow<List<ChatMessage>> = assistant.messages().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    val busy = MutableStateFlow(false)
    val needsKey = MutableStateFlow(false)
    private val logged = MutableStateFlow(setOf<String>())
    val loggedSuggestions: StateFlow<Set<String>> = logged

    fun send(text: String, image: ByteArray?, languageName: String) {
        if (busy.value || (text.isBlank() && image == null)) return
        if (settings.geminiKey.value.isBlank()) { needsKey.value = true; return }
        busy.value = true
        viewModelScope.launch {
            try {
                assistant.send(text, image, languageName)
            } catch (e: GeminiException) {
                if (e.message == "NO_KEY") needsKey.value = true
            } finally {
                busy.value = false
            }
        }
    }

    fun log(messageId: String, s: MealSuggestion) = viewModelScope.launch {
        assistant.logSuggestion(s)
        logged.value = logged.value + messageId
    }

    fun clear() = viewModelScope.launch { assistant.clear() }
}

@Composable
fun CoachScreen(contentPadding: PaddingValues, vm: CoachViewModel = koinViewModel()) {
    val messages by vm.messages.collectAsState()
    val busy by vm.busy.collectAsState()
    val needsKey by vm.needsKey.collectAsState()
    val key by vm.settings.geminiKey.collectAsState()
    val logged by vm.loggedSuggestions.collectAsState()
    val app = LocalAppState.current
    val platform = LocalPlatform.current
    val s = S
    val c = Sumire.colors
    val lang = languageNameFor(LocalStrings.current.code)
    var input by remember { mutableStateOf("") }
    var image by remember { mutableStateOf<ByteArray?>(null) }
    val list = rememberLazyListState()
    val scope = androidx.compose.runtime.rememberCoroutineScope()

    LaunchedEffect(messages.size, busy) {
        val count = messages.size + (if (busy) 1 else 0) + 1
        if (count > 0) list.animateScrollToItem(count - 1)
    }

    Column(Modifier.fillMaxSize().padding(top = contentPadding.calculateTopPadding()).imePadding()) {
        Row(Modifier.padding(horizontal = 16.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Image(
                painterResource(Res.drawable.mascot), null, contentScale = ContentScale.Crop,
                modifier = Modifier.size(44.dp).clip(CircleShape).border(2.dp, c.line, CircleShape),
            )
            Spacer(Modifier.size(10.dp))
            Column(Modifier.weight(1f)) {
                Text(s.coachTitle, style = Sumire.type.title(), color = c.ink)
                Text(s.coachSubtitle, style = Sumire.type.small(), color = c.inkMuted)
            }
            if (messages.isNotEmpty()) NeoIconButton(Icons.Rounded.DeleteSweep, s.coachClear, vm::clear, size = 36.dp)
        }
        LazyColumn(
            state = list,
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (key.isBlank() || needsKey) {
                item {
                    NeoCard(Modifier.fillMaxWidth(), color = c.ochreSoft) {
                        Text(s.coachNoKey, style = Sumire.type.body(), color = c.ink)
                        Gap(10)
                        NeoButton(s.settings, { app.open(Page.SETTINGS) }, compact = true, icon = Icons.Rounded.Settings)
                    }
                }
            }
            if (messages.isEmpty()) {
                item {
                    Column {
                        Bubble(false) { Text(s.welcomeSubtitle, style = Sumire.type.body(), color = c.ink) }
                    }
                }
            }
            items(messages, key = { it.id }) { m ->
                val mine = m.role == "user"
                AnimatedVisibility(true, enter = fadeIn() + slideInVertically { it / 3 }) {
                    Column(Modifier.fillMaxWidth(), horizontalAlignment = if (mine) Alignment.End else Alignment.Start) {
                        Bubble(mine) { MarkdownText(m.content, if (mine) c.onAccent else c.ink) }
                        if (m.actions.isNotEmpty()) {
                            Gap(6)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                m.actions.take(4).forEach { NeoBadge(it.label, if (it.ok) c.matchaSoft else c.terracottaSoft) }
                            }
                        }
                        m.suggestion?.let { sg ->
                            Gap(6)
                            SuggestionCard(sg, done = m.id in logged) { vm.log(m.id, sg) }
                        }
                    }
                }
            }
            if (busy) item { TypingIndicator() }
        }
        if (messages.isEmpty() || input.isEmpty()) {
            LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(s.coachSuggestions) { q -> NeoChip(q, false, { vm.send(q, null, lang) }) }
            }
            Gap(8)
        }
        image?.let {
            Text("📷 ✓", style = Sumire.type.small(), color = c.matcha, modifier = Modifier.padding(horizontal = 20.dp))
        }
        Row(
            Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, bottom = contentPadding.calculateBottomPadding() + 8.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            NeoIconButton(Icons.Rounded.PhotoCamera, s.attachPhoto, {
                scope.launch { image = platform.pickImage(fromCamera = false) }
            }, size = 46.dp, color = if (image != null) c.matchaSoft else c.card)
            Spacer(Modifier.size(8.dp))
            NeoTextField(
                input, { input = it },
                modifier = Modifier.weight(1f),
                placeholder = s.coachHint,
                singleLine = false,
                imeAction = ImeAction.Send,
                onImeAction = {
                    vm.send(input, image, lang); input = ""; image = null
                },
            )
            Spacer(Modifier.size(8.dp))
            NeoIconButton(Icons.Rounded.ArrowUpward, null, {
                vm.send(input, image, lang); input = ""; image = null
            }, size = 46.dp, color = c.matcha, tint = c.onAccent)
        }
    }
}

@Composable
private fun Bubble(mine: Boolean, content: @Composable () -> Unit) {
    val c = Sumire.colors
    val shape = RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp, bottomStart = if (mine) 18.dp else 4.dp, bottomEnd = if (mine) 4.dp else 18.dp)
    Box(
        Modifier
            .widthIn(max = 320.dp)
            .clip(shape)
            .background(if (mine) c.matcha else c.card)
            .border(1.5.dp, c.line, shape)
            .padding(horizontal = 14.dp, vertical = 10.dp),
    ) { content() }
}

@Composable
private fun SuggestionCard(sg: MealSuggestion, done: Boolean, onLog: () -> Unit) {
    val c = Sumire.colors
    val s = S
    NeoCard(Modifier.widthIn(max = 320.dp), color = c.violetSoft, contentPadding = PaddingValues(12.dp)) {
        Text(sg.name, style = Sumire.type.bodyStrong(), color = c.ink)
        Text("${sg.kcal} ${s.kcal} · ${s.protein.take(1)} ${sg.protein.toInt()} · ${s.carbs.take(1)} ${sg.carbs.toInt()} · ${s.fat.take(1)} ${sg.fat.toInt()}", style = Sumire.type.small(), color = c.inkMuted)
        Gap(8)
        NeoButton(if (done) "✓ ${s.actionDone}" else s.logIt, onLog, compact = true, enabled = !done)
    }
}

@Composable
private fun TypingIndicator() {
    val t = rememberInfiniteTransition()
    val p by t.animateFloat(0f, 1f, infiniteRepeatable(tween(900, easing = LinearEasing), RepeatMode.Restart))
    Bubble(false) {
        Row(horizontalArrangement = Arrangement.spacedBy(5.dp)) {
            repeat(3) { i ->
                val phase = ((p + i * 0.2f) % 1f)
                Box(
                    Modifier.size(7.dp).graphicsLayer { translationY = -kotlin.math.sin(phase * kotlin.math.PI.toFloat()) * 6f }
                        .clip(CircleShape).background(Sumire.colors.inkMuted),
                )
            }
        }
    }
}

/** Renders **bold**, bullet lines and headings – enough for chat replies without a markdown dependency. */
@Composable
fun MarkdownText(text: String, color: androidx.compose.ui.graphics.Color) {
    val lines = text.lines()
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        lines.forEach { raw ->
            val line = raw.trimEnd()
            when {
                line.isBlank() -> Spacer(Modifier.size(4.dp))
                line.startsWith("#") -> Text(line.trimStart('#', ' '), style = Sumire.type.bodyStrong(), color = color)
                line.trimStart().startsWith("- ") || line.trimStart().startsWith("* ") || line.trimStart().startsWith("• ") ->
                    Row {
                        Text("•  ", style = Sumire.type.body(), color = color)
                        Text(bold(line.trimStart().drop(2)), style = Sumire.type.body(), color = color)
                    }
                else -> Text(bold(line), style = Sumire.type.body(), color = color)
            }
        }
    }
}

private fun bold(s: String) = buildAnnotatedString {
    var i = 0
    while (i < s.length) {
        val start = s.indexOf("**", i)
        if (start < 0) { append(s.substring(i)); break }
        val end = s.indexOf("**", start + 2)
        if (end < 0) { append(s.substring(i)); break }
        append(s.substring(i, start))
        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(s.substring(start + 2, end)) }
        i = end + 2
    }
}
