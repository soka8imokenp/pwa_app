// Web Audio API Synthesizer (Offline-ready, Zero External Assets)
// Muted Velvet & Warm Tactile Sound Suite (Zero Harsh Highs, Lowpass Filtered, Soft Felt & Wood Acoustics)

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
 * 1. Muted Washi / Felt Tactile Tap (Мягкий глухой тактильный щелчок)
 * Pure low-frequency rounded thud without any sharp high-pitch clicks or ringing
 */
export function playClickSound() {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 0.024;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Lowpass filter strictly cuts all frequencies above 380Hz
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, now);
    filter.Q.setValueAtTime(1.0, now);

    // Warm, deep low-frequency sweep (140Hz -> 52Hz)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + duration);

    // Soft muted volume envelope
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);

    // Micro-tactile vibration on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(8);
    }
  } catch {
    // Ignore
  }
}

/**
 * 2. Muted Velvet Pop (Приглушенный мягкий поп)
 * Warm, rounded low-mid bubble for task completion (zero harsh highs)
 */
export function playTaskCheckSound() {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 0.075;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Lowpass filter cuts all sharp treble above 480Hz
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(480, now);
    filter.Q.setValueAtTime(1.2, now);

    // Warm mid-low sweep (210Hz -> 340Hz)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.035);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }
  } catch {
    // Ignore
  }
}

/**
 * 3. Warm Velvet Harmony (Теплый бархатный аккорд)
 * Deep, muted Rhodes-style pentatonic harmony with zero high-pitch bell ringing
 */
export function playSuccessChime() {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Warm, low-register frequencies (D3, A3, D4, F#4) - all below 380Hz!
    const notes = [
      { freq: 146.83, delay: 0.00, gain: 0.12 }, // D3
      { freq: 220.00, delay: 0.06, gain: 0.11 }, // A3
      { freq: 293.66, delay: 0.12, gain: 0.10 }, // D4
      { freq: 369.99, delay: 0.18, gain: 0.09 }, // F#4
    ];

    notes.forEach(({ freq, delay, gain: peakGain }) => {
      const start = now + delay;
      const duration = 0.45;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Filter strips any bright or shrill overtones
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, start);
      filter.Q.setValueAtTime(0.7, start);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      // Soft 25ms attack (no sharp transients) and gentle warm decay
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(peakGain, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    });

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([15, 35, 20]);
    }
  } catch {
    // Ignore
  }
}

/**
 * 4. Deep Muted Focus Bell (Глубокий мягкий фокус-гонг)
 * Warm, low-register grounding sound for Focus Timer completion (zero metallic ringing)
 */
export function playTimerFinishAlarm() {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 1.6;

    // Deep sub-harmonics: G2 (98Hz), D3 (146.8Hz), G3 (196Hz)
    const harmonics = [
      { freq: 98.00, gain: 0.18 },
      { freq: 146.83, gain: 0.14 },
      { freq: 196.00, gain: 0.10 },
    ];

    harmonics.forEach(({ freq, gain: peakGain }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);
      filter.Q.setValueAtTime(0.8, now);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    });

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 80, 40]);
    }
  } catch {
    // Ignore
  }
}

/**
 * 5. Gentle Velvet Sweep / Soft Delete
 */
export function playDeleteSound() {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 0.05;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + duration);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Ignore
  }
}
