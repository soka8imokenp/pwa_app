// Web Audio API Ambient Sound Generator for Focus & Flow
let audioCtx: AudioContext | null = null;
let currentNoiseNode: AudioNode | null = null;
let currentGainNode: GainNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export type AmbientSoundType = 'none' | 'rain' | 'whitenoise' | 'binaural' | 'waves';

export function stopAmbientSound() {
  if (currentGainNode && audioCtx) {
    try {
      currentGainNode.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      setTimeout(() => {
        if (currentNoiseNode) {
          (currentNoiseNode as any).stop?.();
          currentNoiseNode.disconnect();
          currentNoiseNode = null;
        }
      }, 350);
    } catch {
      // ignore
    }
  }
}

export function playAmbientSound(type: AmbientSoundType, volume = 0.3) {
  stopAmbientSound();
  if (type === 'none') return;

  const ctx = getAudioContext();
  const bufferSize = 2 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  // Synthesize custom sound textures
  if (type === 'rain') {
    // Pink noise with random droplets
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else if (type === 'waves') {
    // Brown noise for deep ocean waves
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }
  } else if (type === 'binaural') {
    // 40Hz Alpha focus wave drone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(136.1, ctx.currentTime); // Om frequency
    gain.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    currentNoiseNode = osc;
    currentGainNode = gain;
    return;
  } else {
    // Pure White Noise
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.15;
    }
  }

  const whiteNoise = ctx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;
  whiteNoise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = type === 'rain' ? 'lowpass' : 'bandpass';
  filter.frequency.value = type === 'rain' ? 1200 : 800;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(volume * 0.4, ctx.currentTime);

  whiteNoise.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  whiteNoise.start();
  currentNoiseNode = whiteNoise;
  currentGainNode = gainNode;
}
