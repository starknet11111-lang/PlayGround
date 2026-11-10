// Tiny WebAudio synth. No external assets, no network.
export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.ambient = null;
    this.lastChime = 0;
    this.noise = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  tone({ freq = 440, type = 'sine', dur = 0.15, vol = 0.2, slide = 0, delay = 0, attack = 0.006, filter = 0 }) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    let node = o;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      node.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(this.master);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  noiseBurst({ dur = 0.2, vol = 0.2, freq = 1200, delay = 0, q = 1 }) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  jump() {
    this.tone({ freq: 340, type: 'triangle', dur: 0.11, vol: 0.12, slide: 260 });
    this.noiseBurst({ dur: 0.06, vol: 0.03, freq: 2400 });
  }
  land() {
    this.tone({ freq: 120, type: 'sine', dur: 0.08, vol: 0.1, slide: -40 });
  }
  phase() {
    this.noiseBurst({ dur: 0.16, vol: 0.1, freq: 1800, q: 0.7 });
    this.tone({ freq: 520, type: 'sine', dur: 0.18, vol: 0.07, slide: 340 });
  }
  blocked() {
    this.tone({ freq: 110, type: 'square', dur: 0.07, vol: 0.05, slide: -20, filter: 500 });
  }
  flip() {
    this.tone({ freq: 180, type: 'sawtooth', dur: 0.22, vol: 0.08, slide: 420, filter: 900 });
  }
  die() {
    this.noiseBurst({ dur: 0.32, vol: 0.22, freq: 420, q: 0.6 });
    this.tone({ freq: 220, type: 'square', dur: 0.28, vol: 0.1, slide: -160, filter: 700 });
  }
  gem() {
    [880, 1320, 1760].forEach((f, i) => this.tone({ freq: f, type: 'sine', dur: 0.14, vol: 0.09, delay: i * 0.045 }));
  }
  adClick() {
    this.tone({ freq: 990, type: 'square', dur: 0.05, vol: 0.06 });
    this.tone({ freq: 1480, type: 'square', dur: 0.08, vol: 0.05, delay: 0.05 });
  }
  goal() {
    [440, 554, 659, 880].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.4, vol: 0.1, delay: i * 0.08 }));
    this.noiseBurst({ dur: 0.5, vol: 0.04, freq: 3000, delay: 0.1 });
  }
  ui() { this.tone({ freq: 660, type: 'sine', dur: 0.05, vol: 0.05 }); }
  deny() { this.tone({ freq: 150, type: 'square', dur: 0.12, vol: 0.06, filter: 400 }); }
  croak() {
    this.tone({ freq: 92, type: 'sawtooth', dur: 0.42, vol: 0.16, slide: -24, filter: 280 });
    this.tone({ freq: 128, type: 'square', dur: 0.38, vol: 0.07, slide: -30, filter: 500, delay: 0.02 });
  }
  shock() {
    this.noiseBurst({ dur: 0.18, vol: 0.28, freq: 3200, q: 0.5 });
    this.tone({ freq: 880, type: 'square', dur: 0.16, vol: 0.18, slide: 140 });
    this.tone({ freq: 220, type: 'sawtooth', dur: 0.2, vol: 0.14, slide: -80 });
  }
  airhorn() {
    const ctx = this.ensure();
    if (!ctx) return;
    [415, 466, 622].forEach((f, i) => {
      this.tone({ freq: f, type: 'sawtooth', dur: 0.5, vol: 0.06, delay: i * 0.01, filter: 1800 });
    });
  }
  implode() {
    for (let i = 0; i < 12; i++) {
      this.tone({ freq: 200 + i * 90, type: 'square', dur: 0.12, vol: 0.05, delay: i * 0.03, slide: -60 });
    }
    this.noiseBurst({ dur: 0.9, vol: 0.2, freq: 900, q: 0.3 });
  }

  startAmbient(theme = 'parallax') {
    const ctx = this.ensure();
    if (!ctx || this.ambient) return;
    const freqSets = {
      parallax: [55, 82.4, 110, 164.8],
      gravitas: [49, 73.4, 98, 146.8],
      thorns: [46.2, 69.3, 92.5, 138.6],
      collapse: [58.3, 87.3, 116.5, 174.6],
      selene: [43.7, 65.4, 87.3, 130.8],
    };
    const freqs = freqSets[theme] || freqSets.parallax;
    const g = ctx.createGain();
    g.gain.value = 0.0;
    g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2);
    g.connect(this.master);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.6;
    filter.connect(g);
    const oscs = [];
    for (const f of freqs) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 12;
      const og = ctx.createGain();
      og.gain.value = 0.22;
      o.connect(og); og.connect(filter);
      o.start();
      oscs.push(o);
    }
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = 0.07;
    lg.gain.value = 180;
    lfo.connect(lg); lg.connect(filter.frequency);
    lfo.start();
    this.ambient = { g, oscs, lfo, filter };
    this.ambientTheme = theme;
  }

  stopAmbient() {
    if (!this.ambient || !this.ctx) return;
    const { g, oscs, lfo } = this.ambient;
    const t = this.ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.4);
    setTimeout(() => {
      try { oscs.forEach((o) => o.stop()); lfo.stop(); } catch { /* already stopped */ }
    }, 500);
    this.ambient = null;
  }

  // sparse ambient chimes; call from the render loop
  tick(t, active) {
    if (!active || !this.ambient) return;
    if (t - this.lastChime > 7.5) {
      this.lastChime = t;
      const notes = [523.25, 587.33, 659.25, 783.99, 880];
      const f = notes[Math.floor(Math.random() * notes.length)];
      this.tone({ freq: f, type: 'sine', dur: 2.4, vol: 0.022, attack: 0.5 });
      this.tone({ freq: f * 2.005, type: 'sine', dur: 1.8, vol: 0.012, attack: 0.4 });
    }
  }
}
