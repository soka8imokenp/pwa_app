// Web Audio API Synthesizer (Offline-ready, zero external assets)

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
}

export function isSoundMuted() {
  return soundMuted;
}

// 1. Soft Tactile Mechanical Click
export function playClickSound() {
  if (soundMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

// 2. Satisfying Task Check Pop
export function playTaskCheckSound() {
  if (soundMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.09);
  } catch (e) {
    // Ignore
  }
}

// 3. Victory / Rule of 3 Completion Chime
export function playSuccessChime() {
  if (soundMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.07);

      gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.07);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + index * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.07 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + index * 0.07);
      osc.stop(ctx.currentTime + index * 0.07 + 0.35);
    });
  } catch (e) {
    // Ignore
  }
}

// 4. Focus Timer Completed Bell
export function playTimerFinishAlarm() {
  if (soundMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const chords = [587.33, 739.99, 880.00]; // D5, F#5, A5
    chords.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.9);
    });
  } catch (e) {
    // Ignore
  }
}
