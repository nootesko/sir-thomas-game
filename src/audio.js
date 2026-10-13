// Procedural WebAudio sounds: no asset files needed.
export class Audio {
  constructor() { this.ctx = null; this.wind = null; }
  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
    // the game starts without a click, so the browser keeps the context suspended until the first key or mouse press
    const resume = () => { if (this.ctx.state === 'suspended') this.ctx.resume(); window.removeEventListener('pointerdown', resume); window.removeEventListener('keydown', resume); };
    window.addEventListener('pointerdown', resume); window.addEventListener('keydown', resume);
  }
  noiseBuffer(sec = 1) {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * sec, this.ctx.sampleRate);
    const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  burst({ dur = 0.2, freq = 800, q = 1, gain = 0.4, type = 'bandpass', sweep = null }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuffer(dur + 0.1);
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t + dur + 0.1);
  }
  tone({ freq = 440, dur = 0.3, gain = 0.2, type = 'square', slide = null }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur);
  }
  swing() { this.burst({ dur: 0.18, freq: 1200, sweep: 300, gain: 0.25 }); }
  hit() { this.burst({ dur: 0.12, freq: 2500, q: 2, gain: 0.5 }); this.tone({ freq: 220, dur: 0.08, gain: 0.15 }); }
  hurt() { this.tone({ freq: 160, dur: 0.25, gain: 0.3, type: 'sawtooth', slide: 60 }); }
  block() { this.tone({ freq: 900, dur: 0.15, gain: 0.25, type: 'triangle', slide: 400 }); this.burst({ dur: 0.1, freq: 3000, gain: 0.2 }); }
  dodge() { this.burst({ dur: 0.25, freq: 600, sweep: 1500, gain: 0.15 }); }
  crash() { this.burst({ dur: 1.2, freq: 120, type: 'lowpass', gain: 1.0 }); this.burst({ dur: 0.6, freq: 2000, gain: 0.4 }); }
  boom() { this.burst({ dur: 2.0, freq: 80, type: 'lowpass', gain: 1.2 }); this.tone({ freq: 60, dur: 1.5, gain: 0.5, type: 'sine', slide: 20 }); }
  pickup() { [660, 880, 1320].forEach((f, i) => setTimeout(() => this.tone({ freq: f, dur: 0.15, gain: 0.15 }), i * 90)); }
  fire() { this.burst({ dur: 0.8, freq: 400, type: 'lowpass', gain: 0.3 }); }
  squeak() { this.tone({ freq: 1100, dur: 0.12, gain: 0.12, type: 'square', slide: -400 }); }
  wolf() { this.tone({ freq: 300, dur: 0.5, gain: 0.2, type: 'sawtooth', slide: 180 }); }
  vulture() { this.tone({ freq: 700, dur: 0.35, gain: 0.25, type: 'sawtooth', slide: 350 }); }
  chime() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone({ freq: f, dur: 0.5, gain: 0.15, type: 'triangle' }), i * 140)); }
  setWind(on) {
    if (!this.ctx) return;
    if (on && !this.wind) {
      const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuffer(4); src.loop = true;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
      const g = this.ctx.createGain(); g.gain.value = 0.0; g.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 4);
      src.connect(f); f.connect(g); g.connect(this.master); src.start();
      const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.15;
      const lg = this.ctx.createGain(); lg.gain.value = 250; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
      this.wind = { src, g };
    } else if (!on && this.wind) {
      this.wind.g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);
      const w = this.wind; setTimeout(() => w.src.stop(), 2500); this.wind = null;
    }
  }
}
