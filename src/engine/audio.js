// Synthesized sound: no audio files needed. Every sound is built from noise and oscillators.

export class Audio {
  constructor() { this.ctx = null; this.volume = 0.7; this.loops = {}; }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startAmbience();
  }

  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }

  noise(dur, { freq = 1000, q = 1, type = 'bandpass', gain = 0.3, attack = 0.005, decay = dur, sweep = null, when = 0 } = {}) {
    const c = this.ctx, t = c.currentTime + when;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }

  tone(freq, dur, { type = 'sine', gain = 0.2, attack = 0.01, slide = null, when = 0 } = {}) {
    const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  play(name, vol = 1) {
    if (!this.ctx) return;
    const v = vol;
    switch (name) {
      case 'step': this.noise(0.12, { freq: 380 + Math.random() * 200, q: 0.8, gain: 0.07 * v, type: 'lowpass' }); break;
      case 'stepwood': this.noise(0.1, { freq: 700, q: 3, gain: 0.08 * v }); this.tone(110, 0.08, { gain: 0.05 * v }); break;
      case 'splash': this.noise(0.35, { freq: 1500, q: 0.5, gain: 0.12 * v, sweep: 400 }); break;
      case 'swing': this.noise(0.22, { freq: 600, q: 2, gain: 0.12 * v, sweep: 2400 }); break;
      case 'chop': this.noise(0.15, { freq: 300, q: 1.5, gain: 0.45 * v, type: 'lowpass' }); this.tone(140, 0.12, { type: 'triangle', gain: 0.2 * v, slide: 80 }); break;
      case 'mine': this.tone(1800 + Math.random() * 400, 0.25, { type: 'triangle', gain: 0.18 * v }); this.tone(2600, 0.15, { type: 'sine', gain: 0.1 * v }); this.noise(0.08, { freq: 3000, q: 1, gain: 0.25 * v }); break;
      case 'hit': this.noise(0.12, { freq: 500, q: 1, gain: 0.4 * v, type: 'lowpass' }); this.tone(90, 0.15, { gain: 0.25 * v, slide: 50 }); break;
      case 'block': this.tone(700, 0.18, { type: 'square', gain: 0.08 * v, slide: 500 }); this.noise(0.1, { freq: 1200, q: 2, gain: 0.25 * v }); break;
      case 'hurt': this.noise(0.25, { freq: 400, q: 1, gain: 0.35 * v, type: 'lowpass' }); this.tone(180, 0.25, { type: 'sawtooth', gain: 0.06 * v, slide: 90 }); break;
      case 'squeal': this.tone(900 + Math.random() * 300, 0.25, { type: 'sawtooth', gain: 0.07 * v, slide: 1400 }); break;
      case 'hiss': this.noise(0.6, { freq: 4500, q: 0.7, gain: 0.12 * v, type: 'highpass' }); break;
      case 'buzz': this.tone(180, 0.4, { type: 'sawtooth', gain: 0.05 * v, slide: 200 }); break;
      case 'wail': this.tone(320, 1.4, { type: 'sine', gain: 0.1 * v, slide: 200, attack: 0.3 }); this.tone(331, 1.4, { type: 'sine', gain: 0.08 * v, slide: 190, attack: 0.3 }); break;
      case 'roar': this.noise(1.0, { freq: 200, q: 0.7, gain: 0.5 * v, type: 'lowpass', attack: 0.1 }); this.tone(60, 1.0, { type: 'sawtooth', gain: 0.12 * v, slide: 40, attack: 0.1 }); break;
      case 'pickup': this.tone(520, 0.08, { type: 'triangle', gain: 0.12 * v }); this.tone(780, 0.1, { type: 'triangle', gain: 0.1 * v, when: 0.05 }); break;
      case 'eat': for (let i = 0; i < 3; i++) this.noise(0.08, { freq: 1500, q: 1, gain: 0.15 * v, when: i * 0.13 }); break;
      case 'drink': for (let i = 0; i < 3; i++) this.tone(300 + i * 30, 0.1, { gain: 0.12 * v, slide: 200, when: i * 0.18 }); break;
      case 'craft': this.noise(0.1, { freq: 900, q: 2, gain: 0.2 * v }); this.noise(0.1, { freq: 1200, q: 2, gain: 0.2 * v, when: 0.15 }); this.tone(660, 0.15, { type: 'triangle', gain: 0.1 * v, when: 0.3 }); break;
      case 'anvil': this.tone(1200, 0.6, { type: 'triangle', gain: 0.2 * v }); this.tone(1810, 0.5, { gain: 0.1 * v }); this.noise(0.05, { freq: 4000, gain: 0.3 * v }); break;
      case 'fire': this.noise(0.6, { freq: 800, q: 0.5, gain: 0.25 * v, sweep: 2000, attack: 0.05 }); break;
      case 'ui': this.tone(880, 0.05, { type: 'triangle', gain: 0.06 * v }); break;
      case 'error': this.tone(200, 0.15, { type: 'square', gain: 0.06 * v }); break;
      case 'bow': this.tone(220, 0.25, { type: 'triangle', gain: 0.15 * v, slide: 110 }); this.noise(0.2, { freq: 2000, q: 1, gain: 0.1 * v }); break;
      case 'level': [523, 659, 784, 1047].forEach((f, i) => { this.tone(f, 0.5, { type: 'triangle', gain: 0.12 * v, when: i * 0.11 }); this.tone(f / 2, 0.6, { gain: 0.06 * v, when: i * 0.11 }); }); break;
      case 'quest': [392, 523, 659].forEach((f, i) => this.tone(f, 0.9, { type: 'sine', gain: 0.1 * v, when: i * 0.2, attack: 0.08 })); break;
      case 'coin': this.tone(1400, 0.12, { type: 'square', gain: 0.04 * v }); this.tone(2100, 0.2, { type: 'square', gain: 0.04 * v, when: 0.06 }); break;
      case 'door': this.tone(140, 0.5, { type: 'sawtooth', gain: 0.03 * v, slide: 240 }); this.noise(0.15, { freq: 500, gain: 0.1 * v, when: 0.4 }); break;
      case 'bell': [220, 277, 330, 440].forEach((f, i) => this.tone(f, 4, { gain: 0.08 * v, when: i * 0.02, attack: 0.005 })); break;
      case 'heartbeat': this.tone(55, 0.12, { gain: 0.3 * v }); this.tone(50, 0.12, { gain: 0.25 * v, when: 0.22 }); break;
      case 'whisper': this.noise(1.5, { freq: 2200, q: 6, gain: 0.05 * v, sweep: 1400, attack: 0.5 }); break;
      case 'dig': for (let i = 0; i < 3; i++) this.noise(0.18, { freq: 260, q: 0.8, type: 'lowpass', gain: 0.3 * v, when: i * 0.22 }); break;
      case 'chant': [196, 247, 294].forEach((f, i) => { this.tone(f, 1.6, { type: 'sine', gain: 0.07 * v, attack: 0.25, when: i * 0.05 }); this.tone(f * 2.01, 1.2, { type: 'sine', gain: 0.025 * v, attack: 0.3 }); }); break;
      case 'death': this.tone(220, 2.5, { type: 'sine', gain: 0.15 * v, slide: 55, attack: 0.05 }); this.noise(2, { freq: 300, type: 'lowpass', gain: 0.2 * v, attack: 0.2 }); break;
      default: break;
    }
  }

  // continuous beds: wind, rain, fire crackle, night drone. Levels are set every frame.
  startAmbience() {
    const c = this.ctx;
    const loop = (freq, type, q) => {
      const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); g.gain.value = 0;
      src.connect(f).connect(g).connect(this.master); src.start();
      return { g, f };
    };
    this.loops.wind = loop(400, 'lowpass', 0.5);
    this.loops.rain = loop(3000, 'highpass', 0.3);
    this.loops.fire = loop(1200, 'bandpass', 0.6);
    this.loops.water = loop(600, 'bandpass', 0.4);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 49;
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = 73.5;
    const dg = c.createGain(); dg.gain.value = 0;
    o.connect(dg); o2.connect(dg); dg.connect(this.master); o.start(); o2.start();
    this.loops.drone = { g: dg };
  }

  setAmbience({ wind = 0.05, rain = 0, fire = 0, water = 0, drone = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const set = (k, v) => this.loops[k].g.gain.setTargetAtTime(v, t, 0.5);
    set('wind', wind); set('rain', rain * 0.12); set('fire', fire * 0.08 * (0.7 + Math.random() * 0.6)); set('water', water * 0.04); set('drone', drone * 0.05);
    this.loops.wind.f.frequency.setTargetAtTime(300 + Math.sin(t * 0.3) * 120, t, 1);
  }
}
