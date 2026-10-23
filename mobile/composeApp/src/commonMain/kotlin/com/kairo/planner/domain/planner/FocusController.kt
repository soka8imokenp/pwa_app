package com.kairo.planner.domain.planner

import com.kairo.planner.core.Time
import com.kairo.planner.data.AppSettings
import com.kairo.planner.data.PlannerRepository
import com.kairo.planner.model.FocusMode
import com.kairo.planner.platform.PlatformServices
import com.kairo.planner.platform.UiSound
import com.kairo.planner.ui.components.Haptic
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

enum class FocusPhase { IDLE, FOCUS, BREAK }

data class FocusState(
    val mode: FocusMode = FocusMode.POMODORO,
    val phase: FocusPhase = FocusPhase.IDLE,
    val running: Boolean = false,
    /** Planned length of the current phase in seconds (0 for stopwatch). */
    val plannedSec: Int = 25 * 60,
    /** Seconds elapsed in the current phase. */
    val elapsedSec: Int = 0,
    val taskId: String? = null,
    val taskTitle: String? = null,
    val completedRounds: Int = 0,
    val justFinishedMinutes: Int? = null,
) {
    val remainingSec: Int get() = (plannedSec - elapsedSec).coerceAtLeast(0)
    val progress: Float get() = if (plannedSec <= 0) 0f else elapsedSec.toFloat() / plannedSec
}

/**
 * Wall-clock based timer: elapsed time is derived from timestamps, not from counting ticks,
 * so it stays exact when the app is backgrounded or the device sleeps.
 */
class FocusController(
    private val scope: CoroutineScope,
    private val planner: PlannerRepository,
    private val settings: AppSettings,
    private val platform: () -> PlatformServices,
) {
    private val _state = MutableStateFlow(FocusState(plannedSec = settings.pomodoroMinutes.value * 60))
    val state: StateFlow<FocusState> = _state.asStateFlow()

    private var phaseStartedAt = 0L
    private var accumulatedBeforePause = 0
    private var ticker: Job? = null

    fun setMode(mode: FocusMode) {
        if (_state.value.running) return
        val planned = when (mode) {
            FocusMode.POMODORO -> settings.pomodoroMinutes.value * 60
            FocusMode.DEEP_WORK -> 90 * 60
            FocusMode.STOPWATCH -> 0
        }
        _state.value = FocusState(mode = mode, plannedSec = planned, taskId = _state.value.taskId, taskTitle = _state.value.taskTitle)
        accumulatedBeforePause = 0
    }

    fun setDuration(minutes: Int) {
        if (_state.value.running || _state.value.mode == FocusMode.STOPWATCH) return
        _state.value = _state.value.copy(plannedSec = minutes.coerceIn(1, 240) * 60, elapsedSec = 0)
        accumulatedBeforePause = 0
    }

    fun setTask(id: String?, title: String?) {
        _state.value = _state.value.copy(taskId = id, taskTitle = title)
    }

    fun start() {
        val s = _state.value
        if (s.running) return
        phaseStartedAt = Time.nowMs()
        accumulatedBeforePause = s.elapsedSec
        val phase = if (s.phase == FocusPhase.IDLE) FocusPhase.FOCUS else s.phase
        _state.value = s.copy(running = true, phase = phase, justFinishedMinutes = null)
        platform().haptic(Haptic.TAP)
        if (s.plannedSec > 0) {
            platform().startFocusTimer(Time.nowMs() + (s.plannedSec - s.elapsedSec) * 1000L, s.taskTitle ?: "")
        }
        platform().keepScreenOn(true)
        runTicker()
    }

    fun pause() {
        val s = _state.value
        if (!s.running) return
        ticker?.cancel()
        _state.value = s.copy(running = false, elapsedSec = currentElapsed())
        platform().stopFocusTimer()
        platform().keepScreenOn(false)
    }

    /** Ends the current focus phase early and saves the time spent (≥1 minute). */
    fun finish() {
        val s = _state.value
        ticker?.cancel()
        val elapsed = if (s.running) currentElapsed() else s.elapsedSec
        if (s.phase == FocusPhase.FOCUS) saveSession(elapsed / 60)
        reset(keepTask = true)
    }

    fun reset(keepTask: Boolean = true) {
        ticker?.cancel()
        val s = _state.value
        platform().stopFocusTimer()
        platform().keepScreenOn(false)
        accumulatedBeforePause = 0
        _state.value = FocusState(
            mode = s.mode,
            plannedSec = when (s.mode) {
                FocusMode.POMODORO -> settings.pomodoroMinutes.value * 60
                FocusMode.DEEP_WORK -> if (s.phase == FocusPhase.BREAK) 90 * 60 else s.plannedSec.takeIf { it > 0 } ?: 90 * 60
                FocusMode.STOPWATCH -> 0
            },
            taskId = if (keepTask) s.taskId else null,
            taskTitle = if (keepTask) s.taskTitle else null,
            completedRounds = s.completedRounds,
            justFinishedMinutes = s.justFinishedMinutes,
        )
    }

    fun consumeFinishedEvent() {
        _state.value = _state.value.copy(justFinishedMinutes = null)
    }

    private fun currentElapsed(): Int = accumulatedBeforePause + ((Time.nowMs() - phaseStartedAt) / 1000).toInt()

    private fun runTicker() {
        ticker?.cancel()
        ticker = scope.launch {
            while (isActive) {
                val s = _state.value
                val elapsed = currentElapsed()
                if (s.plannedSec > 0 && elapsed >= s.plannedSec) {
                    onPhaseComplete()
                    break
                }
                _state.value = s.copy(elapsedSec = elapsed)
                delay(250)
            }
        }
    }

    private fun onPhaseComplete() {
        val s = _state.value
        val p = platform()
        p.sound(UiSound.TIMER_END)
        p.haptic(Haptic.SUCCESS)
        p.keepScreenOn(false)
        if (s.phase == FocusPhase.FOCUS) {
            val minutes = s.plannedSec / 60
            saveSession(minutes)
            val rounds = s.completedRounds + 1
            if (s.mode == FocusMode.POMODORO) {
                val breakMin = if (rounds % 4 == 0) settings.breakMinutes.value * 3 else settings.breakMinutes.value
                accumulatedBeforePause = 0
                _state.value = s.copy(phase = FocusPhase.BREAK, running = false, plannedSec = breakMin * 60, elapsedSec = 0, completedRounds = rounds, justFinishedMinutes = minutes)
            } else {
                accumulatedBeforePause = 0
                _state.value = s.copy(phase = FocusPhase.IDLE, running = false, elapsedSec = 0, completedRounds = rounds, justFinishedMinutes = minutes)
            }
        } else {
            accumulatedBeforePause = 0
            _state.value = s.copy(phase = FocusPhase.IDLE, running = false, plannedSec = settings.pomodoroMinutes.value * 60, elapsedSec = 0)
        }
        p.stopFocusTimer()
    }

    private fun saveSession(minutes: Int) {
        if (minutes < 1) return
        val s = _state.value
        scope.launch { planner.addFocus(minutes, s.mode, s.taskId, s.taskTitle) }
    }
}
