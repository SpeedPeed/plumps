// Prozedurale Musik über WebAudio – keine Audiodateien.
// Fröhlicher Grund-Loop in Dur-Pentatonik mit gezupften Akkorden, Bass, Marimba und
// Schlagzeug. Die Intensität (0–3) steuert Tempo und Schichten: Menü ruhig, Spiel
// lebhaft, schrumpfende Insel schneller, letztes Duell mit Melodie und vollem Schlagzeug.
// Eigene kurze Motive für Kartenwahl und Siegerehrung.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
// Akkordfolge I – V – vi – IV in C-Dur (MIDI-Grundtöne)
const PROG = [[48, [60, 64, 67]], [43, [59, 62, 67]], [45, [57, 60, 64]], [41, [57, 60, 65]]];
const PENTA = [72, 74, 76, 79, 81, 84, 86, 88];
// Finale: a-Moll i – VI – III – V, harmonisch Moll für die Melodie
const PROG_FINAL = [[45, [57, 60, 64]], [41, [57, 60, 65]], [48, [55, 60, 64]], [40, [56, 59, 64]]];
const MINOR = [69, 71, 72, 74, 76, 77, 80, 81];

export class Music {
  constructor(ctx, out) {
    this.ctx = ctx;
    this.out = out;
    this.scene = 'off';
    this.level = 0;
    this.step = 0;
    this.nextT = 0;
    this.timer = null;
    this.seed = 1;
    this.noiseBuf = null;
  }

  rnd() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }

  // scene: 'menu' | 'play' | 'final' | 'pick' | 'win' | 'off'; level: 0..3 (bei 'play' und 'final')
  set(scene, level = 0) {
    if (scene === this.scene && level === this.level) return;
    const changed = scene !== this.scene;
    this.scene = scene; this.level = level;
    if (scene === 'off') { this.stop(); return; }
    if (changed && scene === 'win') { this.fanfare(); }
    if (!this.timer) this.start();
    if (changed) this.step = 0;
  }

  start() {
    this.nextT = this.ctx.currentTime + 0.05;
    this.timer = setInterval(() => this.tick(), 25);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  bpm() {
    if (this.scene === 'menu') return 100;
    if (this.scene === 'pick') return 120;
    if (this.scene === 'win') return 108;
    if (this.scene === 'final') return this.level >= 3 ? 150 : 140;
    return [112, 116, 126, 136][this.level] || 116;
  }

  tick() {
    const ahead = this.ctx.currentTime + 0.12;
    while (this.nextT < ahead) {
      this.playStep(this.step, this.nextT);
      this.nextT += 60 / this.bpm() / 4;   // Sechzehntel
      this.step++;
    }
  }

  playStep(step, t) {
    const s16 = step % 16, bar = Math.floor(step / 16);
    const [bass, chord] = PROG[bar % 4];
    const sc = this.scene, L = this.level;

    if (sc === 'pick') {
      // Kartenwahl: neugieriges Zupf-Arpeggio, kein Schlagzeug
      if (s16 % 2 === 0) this.pluck(NOTE(chord[(s16 / 2) % 3] + 12), t, 0.06, 0.16);
      if (s16 === 0) this.bass(NOTE(bass), t, 0.12);
      if (s16 % 4 === 2) this.hat(t, 0.025);
      return;
    }

    if (sc === 'final') {
      // Finale: Moll, treibender Achtel-Bass, Pauken auf jedem Viertel, ständige Melodie
      const [fb, fc] = PROG_FINAL[bar % 4];
      if (s16 % 2 === 0) this.bass(NOTE(fb + (s16 % 4 === 2 ? 12 : 0)), t, 0.13);
      if (s16 % 4 === 2) fc.forEach((n, i) => this.pluck(NOTE(n), t + i * 0.01, 0.04, 0.16));
      if (s16 % 4 === 0) this.kick(t, 0.34);
      if (s16 === 4 || s16 === 12 || (L >= 3 && s16 === 14)) this.snare(t, 0.16);
      this.hat(t, s16 % 2 ? 0.025 : 0.045);
      if ([0, 3, 6, 8, 11, 14].includes(s16) || (L >= 3 && s16 % 2 === 0)) {
        const i = (bar * 3 + s16) % MINOR.length;
        this.marimba(NOTE(MINOR[(i + Math.floor(this.rnd() * 3)) % MINOR.length]), t, 0.07);
      }
      if (s16 === 0 && bar % 2 === 0) this.osc('sawtooth', NOTE(fb + 24), t, 0.9, 0.025, 1400); // Bläser-Fläche
      return;
    }

    // Bass
    if (s16 === 0 || s16 === 6 || (s16 === 10 && sc !== 'menu')) this.bass(NOTE(bass + (s16 === 6 ? 7 : 0)), t, sc === 'menu' ? 0.1 : 0.14);
    // Gezupfte Akkorde auf den Offbeats
    if (s16 % 4 === 2) chord.forEach((n, i) => this.pluck(NOTE(n), t + i * 0.012, sc === 'menu' ? 0.035 : 0.045, 0.22));
    if (sc === 'menu') {
      if (s16 === 0 || s16 === 8) this.marimba(NOTE(PENTA[Math.floor(this.rnd() * 5)]), t, 0.05);
      return;
    }
    // Schlagzeug
    if (s16 === 0 || s16 === 8 || (L >= 2 && s16 === 10)) this.kick(t, 0.32);
    if (s16 === 4 || s16 === 12) this.snare(t, 0.14);
    if (s16 % 2 === 0 || L >= 2) this.hat(t, s16 % 4 === 2 ? 0.05 : 0.03);
    // Melodie ab Stufe 1, dichter ab Stufe 3
    const melodyAt = L >= 3 ? [0, 2, 3, 6, 8, 10, 11, 14] : L >= 1 ? [0, 3, 6, 10] : [];
    if (melodyAt.includes(s16) && (bar % 2 === 0 || L >= 3)) {
      const n = PENTA[Math.floor(this.rnd() * PENTA.length)];
      this.marimba(NOTE(n - (L >= 3 ? 0 : 12)), t, 0.07);
    }
  }

  // ---------- Klangerzeuger ----------

  env(g, t, vol, dur, attack = 0.005) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  osc(type, f, t, dur, vol, filter) {
    const c = this.ctx;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f;
    this.env(g, t, vol, dur);
    if (filter) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filter; o.connect(fl).connect(g); } else o.connect(g);
    g.connect(this.out);
    o.start(t); o.stop(t + dur + 0.05);
  }

  pluck(f, t, vol, dur) { this.osc('triangle', f, t, dur, vol); this.osc('square', f * 2, t, dur * 0.4, vol * 0.25, 2400); }
  bass(f, t, vol) { this.osc('triangle', f, t, 0.3, vol); this.osc('sine', f / 2, t, 0.25, vol * 0.6); }
  marimba(f, t, vol) { this.osc('sine', f, t, 0.35, vol); this.osc('sine', f * 4, t, 0.08, vol * 0.3); }

  noise() {
    if (this.noiseBuf) return this.noiseBuf;
    const c = this.ctx, len = c.sampleRate * 0.3;
    const b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = b;
    return b;
  }

  drumNoise(t, vol, dur, type, freq) {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noise();
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = c.createGain(); this.env(g, t, vol, dur, 0.002);
    src.connect(f).connect(g).connect(this.out);
    src.start(t); src.stop(t + dur + 0.02);
  }

  kick(t, vol) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    this.env(g, t, vol, 0.18, 0.002);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + 0.2);
  }
  snare(t, vol) { this.drumNoise(t, vol, 0.12, 'bandpass', 1800); this.osc('triangle', 190, t, 0.08, vol * 0.5); }
  hat(t, vol) { this.drumNoise(t, vol, 0.04, 'highpass', 7000); }

  // Siegesfanfare (einmalig)
  fanfare() {
    const t = this.ctx.currentTime + 0.05;
    [[60, 0], [64, 0.14], [67, 0.28], [72, 0.42], [67, 0.62], [72, 0.76]].forEach(([n, d]) => {
      this.osc('square', NOTE(n), t + d, 0.3, 0.06, 2600);
      this.osc('triangle', NOTE(n), t + d, 0.4, 0.08);
    });
    this.kick(t + 0.42, 0.3); this.kick(t + 0.76, 0.35);
    this.nextT = t + 1.3;
  }
}
