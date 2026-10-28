// Ton: alles live synthetisiert, keine Audiodateien.
// Effekte haben mehrere Schichten (Körper + Textur), jeder Blob hat eine eigene
// Stimmlage und brabbelt. Musik und Effekte laufen über getrennte Regler.
import { Music } from './music.js';

let ctx = null;
let master = null, sfxBus = null, musicBus = null;
let music = null;
let noiseBuf = null;
export let muted = false;
const vol = { music: 0.5, sfx: 0.8 };

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.7;
    // sanfter Begrenzer, damit viele Effekte gleichzeitig nicht übersteuern
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6;
    master.connect(comp).connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = vol.music * 0.6; musicBus.connect(master);
    music = new Music(ctx, musicBus);
    if (pendingScene) music.set(...pendingScene);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.7;
  return muted;
}

export function setVolumes(m, s) {
  vol.music = m; vol.sfx = s;
  if (musicBus) musicBus.gain.value = m * 0.6;
  if (sfxBus) sfxBus.gain.value = s;
}

let pendingScene = null;
export function setMusic(scene, level = 0) {
  pendingScene = [scene, level];
  if (music) music.set(scene, level);
}

// ---------- Bausteine ----------

function tone(type, f0, f1, dur, v = 0.3, delay = 0, filter = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  if (filter) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filter; o.connect(fl).connect(g); } else o.connect(g);
  g.connect(sfxBus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function getNoise() {
  if (noiseBuf) return noiseBuf;
  const len = ctx.sampleRate;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

// Rauschen durch einen Filter, optional mit wanderndem Filter (für Rauschen/Wusch)
function noise(dur, v = 0.3, freq = 1000, delay = 0, type = 'lowpass', freqTo = 0, q = 1) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = getNoise();
  const f = ctx.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(sfxBus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

// Ein schwankender Ton (Vibrato), z. B. für das Wackeln an der Kante
function wobbleTone(f, dur, v, rate) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  const lfo = ctx.createOscillator(), lg = ctx.createGain();
  o.type = 'triangle'; o.frequency.value = f;
  lfo.frequency.value = rate; lg.gain.value = f * 0.25;
  lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(sfxBus);
  o.start(t); lfo.start(t);
  o.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
}

// ---------- Blob-Stimmen ----------
// Jeder Spielerplatz hat eine eigene Stimmlage. Silben = Sägezahn durch zwei Formant-Filter.
const VOICE = [1.0, 1.28, 0.84, 1.12, 1.42, 0.74];
const VOWELS = [[730, 1090], [530, 1840], [270, 2290], [570, 840], [300, 870]]; // a e i o u

function syllable(pitch, t, dur, vowel, contour = 1, v = 0.12) {
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(pitch, t);
  o.frequency.exponentialRampToValueAtTime(pitch * contour, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const [f1, f2] = VOWELS[vowel];
  for (const [f, q, a] of [[f1, 8, 1], [f2, 10, 0.6]]) {
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const bg = ctx.createGain(); bg.gain.value = a;
    o.connect(bp).connect(bg).connect(g);
  }
  g.connect(sfxBus);
  o.start(t); o.stop(t + dur + 0.02);
}

// kind: 'oof' (getroffen), 'panic' (Kante), 'yay' (Sieg/Rettung), 'chat' (Emote), 'fall' (Plumps)
export function babble(ci, kind) {
  if (!ctx || muted) return;
  const base = 230 * (VOICE[ci % VOICE.length] || 1);
  const t = ctx.currentTime;
  const r = () => Math.random();
  switch (kind) {
    case 'oof': syllable(base * 1.1, t, 0.16, 3, 0.7, 0.16); break;
    case 'panic': for (let i = 0; i < 4; i++) syllable(base * (1.4 + (i % 2) * 0.25), t + i * 0.08, 0.08, 0, 1.05, 0.1); break;
    case 'yay': syllable(base, t, 0.1, 1, 1.3, 0.12); syllable(base * 1.5, t + 0.1, 0.22, 0, 1.25, 0.14); break;
    case 'fall': syllable(base * 1.6, t, 0.6, 0, 0.45, 0.14); break;
    default: { const n = 3 + Math.floor(r() * 3); for (let i = 0; i < n; i++) syllable(base * (0.9 + r() * 0.5), t + i * 0.085, 0.08, Math.floor(r() * 5), 0.9 + r() * 0.3, 0.1); }
  }
}

// ---------- Aufladeton ----------
// Steigt, solange der Dash geladen wird; pro Spieler höchstens einer.
const charges = new Map();
export function chargeStart(id, dur, ci = 0) {
  chargeStop(id);
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const p = VOICE[ci % VOICE.length] || 1;
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sawtooth'; o2.type = 'triangle';
  for (const [osc, m] of [[o, 1], [o2, 2]]) {
    osc.frequency.setValueAtTime(150 * p * m, t);
    osc.frequency.exponentialRampToValueAtTime(600 * p * m, t + dur);
  }
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(3000, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.06, t + 0.05);
  o.connect(f); o2.connect(f); f.connect(g).connect(sfxBus);
  o.start(t); o2.start(t);
  o.stop(t + 1.5); o2.stop(t + 1.5);
  charges.set(id, { o, o2, g });
}
export function chargeStop(id) {
  const c = charges.get(id);
  if (!c || !ctx) return;
  charges.delete(id);
  const t = ctx.currentTime;
  try {
    c.g.gain.cancelScheduledValues(t);
    c.g.gain.setValueAtTime(Math.max(0.0001, c.g.gain.value), t);
    c.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    c.o.stop(t + 0.06); c.o2.stop(t + 0.06);
  } catch { /* schon gestoppt */ }
}

// ---------- Effekte (mindestens zwei Schichten) ----------

export const sfx = {
  boing: (p = 0.5) => { tone('sine', 160 + p * 160, 480 + p * 300, 0.18, 0.15 + p * 0.18); tone('triangle', 900, 300, 0.06, 0.06 + p * 0.06); },
  dash: () => { noise(0.18, 0.18, 600, 0, 'bandpass', 3500, 2); tone('sine', 300, 520, 0.1, 0.06); },
  plumps: () => {
    tone('sine', 320, 70, 0.35, 0.35);
    noise(0.5, 0.22, 1600, 0.06, 'lowpass', 400);
    for (let i = 0; i < 4; i++) tone('sine', 500 + Math.random() * 500, 900 + Math.random() * 600, 0.05, 0.06, 0.15 + i * 0.07); // Blubbern
  },
  boom: () => { noise(0.7, 0.5, 900, 0, 'lowpass', 120); tone('square', 110, 30, 0.45, 0.2, 0, 400); tone('sine', 60, 30, 0.6, 0.35); },
  pups: () => { tone('sawtooth', 120, 60, 0.45, 0.16, 0, 500); tone('sawtooth', 96, 70, 0.32, 0.12, 0.05, 400); noise(0.35, 0.08, 300, 0.02, 'lowpass'); },
  bumper: () => { tone('square', 880, 1320, 0.08, 0.08, 0, 3000); tone('sine', 1760, 1760, 0.15, 0.06, 0.03); },
  swap: () => { tone('triangle', 400, 900, 0.15, 0.16); tone('triangle', 900, 400, 0.15, 0.16, 0.15); noise(0.3, 0.06, 2000, 0, 'bandpass', 6000, 3); },
  potato: () => { tone('triangle', 600, 300, 0.12, 0.13); noise(0.08, 0.06, 2500); },
  count: () => { tone('sine', 523, 523, 0.14, 0.2); tone('triangle', 1046, 1046, 0.08, 0.06); },
  go: () => { tone('sine', 784, 784, 0.3, 0.22); tone('triangle', 1046, 1046, 0.35, 0.12, 0.02); noise(0.3, 0.06, 4000, 0, 'highpass'); },
  card: () => [0, 1, 2].forEach(i => { tone('triangle', 400 + i * 200, 420 + i * 200, 0.12, 0.15, i * 0.08); noise(0.05, 0.05, 3000, i * 0.08, 'highpass'); }),
  win: () => [523, 659, 784, 1046].forEach((f, i) => { tone('triangle', f, f, 0.22, 0.2, i * 0.11); tone('sine', f * 2, f * 2, 0.1, 0.05, i * 0.11); }),
  draw: () => { tone('sawtooth', 300, 120, 0.6, 0.12, 0, 900); tone('triangle', 240, 100, 0.6, 0.1, 0.05); },
  regicide: () => [784, 622, 523].forEach((f, i) => { tone('square', f, f, 0.15, 0.09, i * 0.1, 2400); tone('triangle', f / 2, f / 2, 0.15, 0.08, i * 0.1); }),
  champion: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.25, 0.22, i * 0.14)),
  coin: () => { tone('square', 988, 988, 0.06, 0.06, 0, 4000); tone('square', 1319, 1319, 0.12, 0.06, 0.06, 4000); tone('sine', 2637, 2637, 0.1, 0.03, 0.06); },
  punch: () => { noise(0.25, 0.45, 2500, 0, 'lowpass', 300); tone('square', 160, 50, 0.2, 0.22, 0, 600); tone('sine', 80, 40, 0.3, 0.3); },
  slip: () => { tone('sine', 300, 1400, 0.35, 0.18); noise(0.3, 0.06, 1000, 0, 'bandpass', 4000, 4); },
  item: () => [660, 880, 1100, 1320].forEach((f, i) => { tone('sine', f, f, 0.08, 0.13, i * 0.05); tone('triangle', f * 2, f * 2, 0.05, 0.03, i * 0.05); }),
  respawn: () => { tone('triangle', 300, 700, 0.2, 0.13); noise(0.2, 0.05, 2000, 0, 'bandpass', 5000, 2); },
  tag: () => { tone('sawtooth', 200, 90, 0.3, 0.13, 0, 700); noise(0.25, 0.14, 600, 0, 'lowpass', 200); },
  zone: () => { tone('triangle', 500, 750, 0.2, 0.13); tone('sine', 1000, 1500, 0.15, 0.05, 0.05); },
  matchball: () => [392, 523, 659].forEach((f, i) => { tone('square', f, f, 0.18, 0.08, i * 0.12, 2600); tone('triangle', f / 2, f / 2, 0.2, 0.1, i * 0.12); }),
  brace: () => { tone('square', 140, 55, 0.12, 0.16, 0, 500); noise(0.14, 0.2, 700, 0, 'lowpass', 200); },
  counter: () => {
    [880, 1318, 1760].forEach((f, i) => tone('square', f, f * 0.98, 0.4, 0.07, i * 0.01, 5000));
    tone('sine', 220, 110, 0.3, 0.2);
    noise(0.3, 0.2, 6000, 0.02, 'bandpass', 1500, 2);
  },
  break: () => { noise(0.4, 0.45, 4000, 0, 'bandpass', 800, 1.5); tone('sawtooth', 320, 70, 0.3, 0.16, 0, 1200); tone('square', 90, 40, 0.25, 0.18, 0.05, 400); },
  wobble: () => wobbleTone(520, 0.4, 0.12, 14),
  save: () => { tone('triangle', 420, 900, 0.12, 0.16); tone('triangle', 900, 1250, 0.12, 0.13, 0.1); noise(0.15, 0.05, 3000, 0, 'highpass'); },
  hit: (p = 0.5) => { noise(0.2, 0.25 + p * 0.25, 2000, 0, 'lowpass', 300); tone('sine', 220, 60, 0.28, 0.28 + p * 0.18); tone('square', 120, 50, 0.12, 0.08 * p, 0, 600); },
  ko: () => { tone('sawtooth', 240, 110, 0.6, 0.1, 0.12, 1500); tone('sawtooth', 300, 140, 0.6, 0.07, 0.12, 1500); noise(0.8, 0.1, 500, 0.1, 'lowpass', 150); },
  duel: () => { tone('square', 196, 196, 0.25, 0.1, 0, 1800); tone('square', 147, 147, 0.5, 0.1, 0.28, 1800); tone('sine', 73, 73, 0.6, 0.25, 0.28); noise(0.6, 0.1, 300, 0.28); },
};
