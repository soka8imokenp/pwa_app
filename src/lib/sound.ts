// Web Audio API Synthesizer (Offline-ready, Zero External Assets)
// High-Fidelity Japanese Editorial Sound Engine (Tactile Wood, Marimba Pop, Crystal Chimes & Zen Singing Bowl)

let audioCtx: AudioContext | null = null;
let soundMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setSoundMuted(muted: boolean) {
  soundMuted = muted;
  if (typeof window !== 'undefined') {
    localStorage.setItem('kairo_sound_muted', String(muted));
  }
}

export function isSoundMuted(): boolean {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('kairo_sound_muted');
    if (saved !== null) {
      soundMuted = saved === 'true';
    }
  }
  return soundMuted;
}

/**
 * 1. Tactile Bamboo / Wooden Washi Tap
 * Ultra-satisfying crisp mechanical tap for buttons, navigation and numeric keypad
 */
export function playClickSound() {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Component A: Resonant wooden body tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.035);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);

    // Component B: High-end crisp tactile click
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1800, now);
    clickOsc.frequency.exponentialRampToValueAtTime(400, now + 0.015);

    clickGain.gain.setValueAtTime(0.09, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.015);

    // Subtle tactile vibration on supported mobile devices
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(8);
    }
  } catch {
    // Ignore autoplay restrictions
  }
}

/**
 * 2. Satisfying Marimba / Water Drop Pop
 * Juicy, rewarding harmonic pop when marking a task or habit as done
 */
export function playTaskCheckSound() {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Fundamental Pop Tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(480, now);
    osc1.frequency.exponentialRampToValueAtTime(860, now + 0.06);

    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.14);

    // Harmonic Sparkle Overtone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1290, now + 0.01);
    osc2.frequency.exponentialRampToValueAtTime(1720, now + 0.07);

    gain2.gain.setValueAtTime(0.12, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.01);
    osc2.stop(now + 0.11);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
  } catch {
    // Ignore
  }
}

/**
 * 3. Kyoto Crystal Pentatonic Victory Chime
 * Shimmering, euphoric Japanese harp chord for Rule of 3, Daily debrief & Streaks
 */
export function playSuccessChime() {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Japanese Insen/Pentatonic Harmony: D5 (587Hz), F#5 (740Hz), A5 (880Hz), B5 (988Hz), D6 (1175Hz)
    const notes = [
      { freq: 587.33, delay: 0.00, gain: 0.16 },
      { freq: 739.99, delay: 0.07, gain: 0.15 },
      { freq: 880.00, delay: 0.14, gain: 0.18 },
      { freq: 987.77, delay: 0.21, gain: 0.16 },
      { freq: 1174.66, delay: 0.28, gain: 0.22 },
    ];

    notes.forEach(({ freq, delay, gain: maxGain }) => {
      const noteStart = now + delay;
      const duration = 0.65;

      // Main harmonic oscillator
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);

      // Shimmering detune chorusing
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(freq * 2, noteStart);

      // Bell envelope: smooth 15ms attack + long acoustic decay
      gainNode.gain.setValueAtTime(0.001, noteStart);
      gainNode.gain.linearRampToValueAtTime(maxGain, noteStart + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.001, noteStart + duration);

      subGain.gain.setValueAtTime(0.001, noteStart);
      subGain.gain.linearRampToValueAtTime(maxGain * 0.25, noteStart + 0.01);
      subGain.gain.exponentialRampToValueAtTime(0.001, noteStart + duration * 0.6);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(noteStart);
      osc.stop(noteStart + duration);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(noteStart);
      subOsc.stop(noteStart + duration * 0.6);
    });

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([20, 50, 30]);
    }
  } catch {
    // Ignore
  }
}

/**
 * 4. Deep Zen Kyoto Singing Bowl Gong
 * Rich, harmonic mindful bell for Focus Timer completion
 */
export function playTimerFinishAlarm() {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 2.8;

    // Singing bowl harmonic spectrum: E4 (329.6Hz), B4 (493.8Hz), E5 (659.2Hz), G#5 (830.6Hz)
    const harmonics = [
      { freq: 329.63, detune: 0, gain: 0.25 },
      { freq: 331.00, detune: 1.5, gain: 0.15 }, // Binaural pulsation beat
      { freq: 493.88, detune: 0, gain: 0.18 },
      { freq: 659.25, detune: 0, gain: 0.14 },
      { freq: 830.61, detune: 0, gain: 0.08 },
    ];

    harmonics.forEach(({ freq, detune, gain: peakGain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq + detune, now);

      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(peakGain, now + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0005, now + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    });

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([60, 100, 60, 100, 80]);
    }
  } catch {
    // Ignore
  }
}

/**
 * 5. Gentle Paper Slide / Soft Delete
 */
export function playDeleteSound() {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  } catch {
    // Ignore
  }
}
