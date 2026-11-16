// Every sound in Emberkeep, synthesised live with WebAudio: no audio files,
// no network, just oscillators and noise. Created on the first user gesture
// (browsers block audio before one); silent until then, and M mutes it all.
export function createAudio() {
  let context = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') void context.resume();
      return context;
    }
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.35;
      master.connect(context.destination);
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, duration, type, volume, slideTo) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function noise(duration, volume, lowpass) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    shoot(kind) {
      if (kind === 'cannon') { tone(160, 0.18, 'sawtooth', 0.25, 60); noise(0.12, 0.12, 900); }
      else if (kind === 'frost') tone(880, 0.12, 'sine', 0.14, 1320);
      else tone(660 + Math.random() * 220, 0.07, 'square', 0.08, 440);
    },
    hit() { noise(0.05, 0.08, 2400); },
    kill() { tone(520, 0.1, 'sine', 0.16, 780); },
    coin() { tone(1046, 0.09, 'sine', 0.12, 1568); },
    place() { tone(330, 0.12, 'triangle', 0.2, 495); tone(495, 0.1, 'triangle', 0.14, 660); },
    error() { tone(180, 0.15, 'square', 0.12, 120); },
    leak() { tone(220, 0.4, 'sawtooth', 0.25, 55); noise(0.3, 0.15, 500); },
    horn() { tone(196, 0.5, 'sawtooth', 0.2, 294); tone(294, 0.5, 'sawtooth', 0.14, 392); },
    waveClear() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.18), i * 90)); },
    victory() { [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.2), i * 130)); },
    defeat() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'sawtooth', 0.16), i * 160)); },
  };
}
