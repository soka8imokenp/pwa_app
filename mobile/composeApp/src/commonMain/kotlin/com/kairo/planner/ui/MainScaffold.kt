package com.kairo.planner.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.ContentTransform
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.DirectionsWalk
import androidx.compose.material.icons.rounded.GridView
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.MonitorWeight
import androidx.compose.material.icons.rounded.Repeat
import androidx.compose.material.icons.rounded.Restaurant
import androidx.compose.material.icons.rounded.Timer
import androidx.compose.material3.Icon
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kairo.planner.ai.SumireAssistant
import com.kairo.planner.core.Time
import com.kairo.planner.i18n.S
import com.kairo.planner.platform.LocalPlatform
import com.kairo.planner.platform.PlatformBackHandler
import com.kairo.planner.ui.components.Haptic
import com.kairo.planner.ui.focus.FocusScreen
import com.kairo.planner.ui.habits.HabitEditorSheet
import com.kairo.planner.ui.habits.HabitsScreen
import com.kairo.planner.ui.health.ActivityScreen
import com.kairo.planner.ui.health.BodyScreen
import com.kairo.planner.ui.health.CoachScreen
import com.kairo.planner.ui.health.FoodScreen
import com.kairo.planner.ui.health.LogWeightSheet
import com.kairo.planner.ui.health.MealEditorSheet
import com.kairo.planner.ui.health.ScaleSheet
import com.kairo.planner.ui.health.StepsEditorSheet
import com.kairo.planner.ui.health.WorkoutEditorSheet
import com.kairo.planner.ui.more.AboutPage
import com.kairo.planner.ui.more.ActivityLogPage
import com.kairo.planner.ui.more.BacklogPage
import com.kairo.planner.ui.more.HealthConnectPage
import com.kairo.planner.ui.more.LinkEditorSheet
import com.kairo.planner.ui.more.LinksPage
import com.kairo.planner.ui.more.MoreScreen
import com.kairo.planner.ui.more.ProfilePage
import com.kairo.planner.ui.more.SettingsPage
import com.kairo.planner.ui.more.StatsPage
import com.kairo.planner.ui.planner.EveningReviewSheet
import com.kairo.planner.ui.planner.TaskEditorSheet
import com.kairo.planner.ui.planner.TodayScreen
import com.kairo.planner.ui.planner.TodayViewModel
import com.kairo.planner.ui.theme.Dimens
import com.kairo.planner.ui.theme.Sumire
import org.koin.compose.koinInject
import org.koin.compose.viewmodel.koinViewModel

private val HeaderHeight = 64.dp
private val DockHeight = 76.dp

@Composable
fun MainScaffold(app: AppState = remember { AppState() }) {
    val snackbar = remember { SnackbarHostState() }
    val assistant = koinInject<SumireAssistant>()
    LaunchedEffect(Unit) { assistant.navigation.collect { app.navigate(it) } }

    PlatformBackHandler(enabled = app.sheet != null || app.pages.isNotEmpty() || app.healthMode && app.healthTab != HealthTab.BODY || !app.healthMode && app.plannerTab != PlannerTab.TODAY) {
        app.handleBack()
    }

    CompositionLocalProvider(LocalAppState provides app, LocalSnackbar provides snackbar) {
        val c = Sumire.colors
        val top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
        val bottom = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
        val contentPadding = PaddingValues(top = top + HeaderHeight + 4.dp, bottom = bottom + DockHeight + 16.dp)

        Box(Modifier.fillMaxSize().background(c.canvas)) {
            val tabKey = if (app.healthMode) "h:${app.healthTab}" else "p:${app.plannerTab}"
            AnimatedContent(
                targetState = tabKey,
                transitionSpec = { tabTransition() },
                modifier = Modifier.fillMaxSize(),
            ) { key ->
                when (key) {
                    "p:TODAY" -> TodayScreen(contentPadding)
                    "p:HABITS" -> HabitsScreen(contentPadding)
                    "p:FOCUS" -> FocusScreen(contentPadding)
                    "p:MORE" -> MoreScreen(contentPadding)
                    "h:BODY" -> BodyScreen(contentPadding)
                    "h:FOOD" -> FoodScreen(contentPadding)
                    "h:ACTIVITY" -> ActivityScreen(contentPadding)
                    "h:COACH" -> CoachScreen(contentPadding)
                }
            }

            // Header fade so content scrolls under it softly.
            Box(
                Modifier.fillMaxWidth().height(top + HeaderHeight + 12.dp)
                    .background(Brush.verticalGradient(listOf(c.canvas, c.canvas, c.canvas.copy(alpha = 0f)))),
            )
            Header(app, Modifier.statusBarsPadding().height(HeaderHeight))

            Box(
                Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(bottom + DockHeight + 24.dp)
                    .background(Brush.verticalGradient(listOf(c.canvas.copy(alpha = 0f), c.canvas.copy(alpha = 0.92f), c.canvas))),
            )
            Dock(app, Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = 10.dp))

            // Pushed pages
            AnimatedContent(
                targetState = app.pages.lastOrNull(),
                transitionSpec = {
                    if (targetState != null && (initialState == null || app.pages.size > 1)) {
                        (slideInHorizontally(tween(320, easing = FastOutSlowInEasing)) { it } + fadeIn()) togetherWith fadeOut(tween(200))
                    } else {
                        fadeIn(tween(200)) togetherWith (slideOutHorizontally(tween(280)) { it } + fadeOut(tween(280)))
                    }
                },
            ) { page ->
                if (page != null) {
                    Box(Modifier.fillMaxSize().background(c.canvas).clickable(remember { MutableInteractionSource() }, null) {}) {
                        val back = { app.pop(); Unit }
                        when (page) {
                            Page.SETTINGS -> SettingsPage(back)
                            Page.BACKLOG -> BacklogPage(back)
                            Page.STATS -> StatsPage(back)
                            Page.LINKS -> LinksPage(back)
                            Page.ACTIVITY_LOG -> ActivityLogPage(back)
                            Page.PROFILE -> ProfilePage(back)
                            Page.HEALTH_CONNECT -> HealthConnectPage(back)
                            Page.ABOUT -> AboutPage(back)
                        }
                    }
                }
            }

            SnackbarHost(snackbar, Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = DockHeight + 20.dp)) { data ->
                Snackbar(
                    data,
                    shape = RoundedCornerShape(14.dp),
                    containerColor = c.ink,
                    contentColor = c.canvas,
                    actionColor = c.ochre,
                    modifier = Modifier.padding(horizontal = 16.dp),
                )
            }
        }

        SheetHost(app)
    }
}

private fun AnimatedContentTransitionScope<String>.tabTransition(): ContentTransform {
    val modeChanged = initialState.first() != targetState.first()
    return if (modeChanged) {
        (fadeIn(tween(260)) + scaleIn(initialScale = 0.97f, animationSpec = tween(260))) togetherWith fadeOut(tween(160))
    } else {
        (fadeIn(tween(220)) + slideInVertically(tween(260, easing = FastOutSlowInEasing)) { it / 24 }) togetherWith
            (fadeOut(tween(140)) + slideOutVertically(tween(140)) { -it / 40 })
    }
}

@Composable
private fun Header(app: AppState, modifier: Modifier) {
    val c = Sumire.colors
    val s = S
    val platform = LocalPlatform.current
    val today: TodayViewModel = koinViewModel()
    val ui by today.ui.collectAsStateWithLifecycle()
    Row(modifier.fillMaxWidth().padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
        // Segmented mode switch with a sliding pill
        BoxWithConstraints(
            Modifier
                .widthIn(max = 260.dp)
                .weight(1f)
                .height(44.dp)
                .drawBehind {
                    drawRoundRect(c.line, topLeft = Offset(2.dp.toPx(), 2.dp.toPx()), size = size, cornerRadius = CornerRadius(14.dp.toPx()))
                }
                .clip(RoundedCornerShape(14.dp))
                .background(c.card)
                .border(Dimens.border, c.line, RoundedCornerShape(14.dp)),
        ) {
            val half = maxWidth / 2
            val x by animateDpAsState(if (app.healthMode) half else 0.dp, spring(dampingRatio = 0.75f, stiffness = 500f))
            Box(
                Modifier.offset(x = x).width(half).height(44.dp).padding(4.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (app.healthMode) c.terracottaSoft else c.matchaSoft)
                    .border(1.5.dp, c.line, RoundedCornerShape(10.dp)),
            )
            Row(Modifier.fillMaxSize()) {
                listOf(false to s.modePlanner, true to s.modeHealth).forEach { (health, label) ->
                    Box(
                        Modifier.weight(1f).fillMaxSize().clickable(remember { MutableInteractionSource() }, null) {
                            if (app.healthMode != health) {
                                platform.haptic(Haptic.TICK)
                                app.healthMode = health
                            }
                        },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            label,
                            style = Sumire.type.bodyStrong().copy(fontSize = 14.sp, fontWeight = if (app.healthMode == health) FontWeight.ExtraBold else FontWeight.SemiBold),
                            color = if (app.healthMode == health) c.ink else c.inkMuted,
                        )
                    }
                }
            }
        }
        Spacer(Modifier.width(10.dp))
        // Streak flame
        val active = ui.streak.activeToday
        val flame by animateColorAsState(if (active) c.terracotta else c.inkMuted.copy(alpha = 0.6f))
        Row(
            Modifier
                .height(44.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(if (active) c.terracottaSoft else c.card)
                .border(1.5.dp, c.line, RoundedCornerShape(14.dp))
                .clickable { app.navigate(com.kairo.planner.ai.NavTarget.TODAY); app.open(Page.STATS) }
                .padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Rounded.LocalFireDepartment, null, tint = flame, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(4.dp))
            Text("${ui.streak.current}", style = Sumire.type.number(16), color = c.ink)
        }
        Spacer(Modifier.width(8.dp))
        Text(greetingEmoji(), fontSize = 22.sp)
    }
}

private fun greetingEmoji(): String = when (Time.now().hour) {
    in 5..11 -> "🌤"
    in 12..17 -> "☀️"
    in 18..22 -> "🌙"
    else -> "✨"
}

private data class DockItem(val icon: ImageVector, val label: String, val selected: Boolean, val onClick: () -> Unit)

@Composable
private fun Dock(app: AppState, modifier: Modifier) {
    val c = Sumire.colors
    val s = S
    val platform = LocalPlatform.current
    val items = if (app.healthMode) {
        listOf(
            DockItem(Icons.Rounded.MonitorWeight, s.tabBody, app.healthTab == HealthTab.BODY) { app.healthTab = HealthTab.BODY },
            DockItem(Icons.Rounded.Restaurant, s.tabFood, app.healthTab == HealthTab.FOOD) { app.healthTab = HealthTab.FOOD },
            DockItem(Icons.Rounded.DirectionsWalk, s.tabActivity, app.healthTab == HealthTab.ACTIVITY) { app.healthTab = HealthTab.ACTIVITY },
            DockItem(Icons.Rounded.AutoAwesome, s.tabCoach, app.healthTab == HealthTab.COACH) { app.healthTab = HealthTab.COACH },
        )
    } else {
        listOf(
            DockItem(Icons.Rounded.CheckCircle, s.tabToday, app.plannerTab == PlannerTab.TODAY) { app.plannerTab = PlannerTab.TODAY },
            DockItem(Icons.Rounded.Repeat, s.tabHabits, app.plannerTab == PlannerTab.HABITS) { app.plannerTab = PlannerTab.HABITS },
            DockItem(Icons.Rounded.Timer, s.tabFocus, app.plannerTab == PlannerTab.FOCUS) { app.plannerTab = PlannerTab.FOCUS },
            DockItem(Icons.Rounded.GridView, s.tabMore, app.plannerTab == PlannerTab.MORE) { app.plannerTab = PlannerTab.MORE },
        )
    }
    Row(
        modifier
            .padding(horizontal = 16.dp)
            .widthIn(max = 420.dp)
            .fillMaxWidth()
            .height(DockHeight - 10.dp)
            .drawBehind {
                drawRoundRect(c.line, topLeft = Offset(2.5.dp.toPx(), 3.dp.toPx()), size = size, cornerRadius = CornerRadius(22.dp.toPx()))
            }
            .clip(RoundedCornerShape(22.dp))
            .background(c.card)
            .border(Dimens.border, c.line, RoundedCornerShape(22.dp))
            .padding(5.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        items.forEach { item ->
            val bg by animateColorAsState(if (item.selected) (if (app.healthMode) c.terracottaSoft else c.matchaSoft) else Color.Transparent, tween(200))
            val tint by animateColorAsState(if (item.selected) c.ink else c.inkMuted, tween(200))
            Column(
                Modifier
                    .weight(1f)
                    .fillMaxSize()
                    .clip(RoundedCornerShape(16.dp))
                    .background(bg)
                    .border(if (item.selected) 1.5.dp else 0.dp, if (item.selected) c.line else Color.Transparent, RoundedCornerShape(16.dp))
                    .clickable(remember { MutableInteractionSource() }, null) {
                        if (!item.selected) platform.haptic(Haptic.TICK)
                        app.clearPages()
                        item.onClick()
                    },
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Icon(item.icon, item.label, tint = tint, modifier = Modifier.size(22.dp))
                Spacer(Modifier.height(2.dp))
                Text(item.label, style = Sumire.type.small().copy(fontSize = 10.5.sp, fontWeight = if (item.selected) FontWeight.Bold else FontWeight.Medium), color = tint, maxLines = 1)
            }
        }
    }
}

@Composable
private fun SheetHost(app: AppState) {
    val sheet = app.sheet ?: return
    val dismiss = { app.dismissSheet() }
    when (sheet) {
        is Sheet.TaskEditor -> TaskEditorSheet(sheet.task, sheet.date, sheet.priority, dismiss)
        is Sheet.HabitEditor -> HabitEditorSheet(sheet.habit, dismiss)
        Sheet.LogWeight -> LogWeightSheet(dismiss)
        Sheet.Scale -> ScaleSheet(dismiss, onManual = { app.show(Sheet.LogWeight) })
        is Sheet.MealEditor -> MealEditorSheet(sheet.type, sheet.meal, dismiss, onNeedKey = { app.dismissSheet(); app.open(Page.SETTINGS) })
        Sheet.WorkoutEditor -> WorkoutEditorSheet(dismiss)
        Sheet.StepsEditor -> StepsEditorSheet(dismiss)
        Sheet.EveningReview -> EveningReviewSheet(dismiss)
        is Sheet.LinkEditor -> LinkEditorSheet(sheet.link, dismiss)
    }
}
