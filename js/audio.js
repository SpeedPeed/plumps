// Alle Sounds werden live synthetisiert – keine Audiodateien nötig.

let ctx = null;
let master = null;
export let muted = false;

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

function tone(type, f0, f1, dur, vol = 0.3, delay = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.3, freq = 1000, delay = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

// Ein schwankender Ton (Vibrato), z. B. für das Wackeln an der Kante
function wobbleTone(f, dur, vol, rate) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  const lfo = ctx.createOscillator(), lg = ctx.createGain();
  o.type = 'triangle'; o.frequency.value = f;
  lfo.frequency.value = rate; lg.gain.value = f * 0.25;
  lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t); lfo.start(t);
  o.stop(t + dur + 0.02); lfo.stop(t + dur + 0.02);
}

// Aufladeton: steigt, solange der Dash geladen wird; pro Spieler höchstens einer
const charges = new Map();
export function chargeStart(id, dur) {
  chargeStop(id);
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(620, t + dur);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 1400;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.05);
  o.connect(f).connect(g).connect(master);
  o.start(t);
  o.stop(t + 1.5);
  charges.set(id, { o, g });
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
    c.o.stop(t + 0.06);
  } catch { /* schon gestoppt */ }
}

export const sfx = {
  boing: (p = 0.5) => tone('sine', 180 + p * 200, 520 + p * 300, 0.18, 0.15 + p * 0.2),
  dash: () => noise(0.15, 0.15, 2500),
  plumps: () => { tone('sine', 300, 60, 0.35, 0.4); noise(0.4, 0.25, 800, 0.08); },
  boom: () => { noise(0.6, 0.5, 600); tone('square', 90, 30, 0.4, 0.2); },
  pups: () => { tone('sawtooth', 110, 55, 0.45, 0.18); tone('sawtooth', 95, 70, 0.3, 0.12, 0.05); },
  bumper: () => tone('square', 880, 1320, 0.08, 0.1),
  swap: () => { tone('triangle', 400, 900, 0.15, 0.2); tone('triangle', 900, 400, 0.15, 0.2, 0.15); },
  potato: () => tone('triangle', 600, 300, 0.12, 0.15),
  count: () => tone('sine', 520, 520, 0.12, 0.25),
  go: () => tone('sine', 880, 880, 0.3, 0.3),
  card: () => [0, 1, 2].forEach(i => tone('triangle', 400 + i * 200, 420 + i * 200, 0.12, 0.2, i * 0.08)),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.2, 0.25, i * 0.11)),
  draw: () => tone('sawtooth', 300, 120, 0.6, 0.15),
  regicide: () => [784, 622, 523].forEach((f, i) => tone('square', f, f, 0.15, 0.12, i * 0.1)),
  coin: () => { tone('square', 988, 988, 0.06, 0.08); tone('square', 1319, 1319, 0.12, 0.08, 0.06); },
  punch: () => { noise(0.25, 0.45, 1500); tone('square', 160, 50, 0.2, 0.25); },
  slip: () => tone('sine', 300, 1400, 0.35, 0.2),
  item: () => [660, 880, 1100].forEach((f, i) => tone('sine', f, f, 0.08, 0.15, i * 0.05)),
  respawn: () => tone('triangle', 300, 700, 0.2, 0.15),
  tag: () => { tone('sawtooth', 200, 90, 0.3, 0.15); noise(0.2, 0.15, 500); },
  zone: () => tone('triangle', 500, 750, 0.2, 0.15),
  matchball: () => [392, 523, 659].forEach((f, i) => tone('square', f, f, 0.18, 0.1, i * 0.12)),
  brace: () => { tone('square', 140, 55, 0.12, 0.18); noise(0.12, 0.2, 500); },
  counter: () => {
    [880, 1318, 1760].forEach((f, i) => tone('square', f, f * 0.98, 0.35, 0.09, i * 0.01));
    noise(0.25, 0.25, 4000, 0.02);
  },
  break: () => { noise(0.35, 0.45, 2500); tone('sawtooth', 320, 70, 0.3, 0.2); tone('square', 90, 40, 0.25, 0.2, 0.05); },
  wobble: () => wobbleTone(520, 0.4, 0.14, 14),
  save: () => { tone('triangle', 420, 900, 0.12, 0.18); tone('triangle', 900, 1250, 0.12, 0.15, 0.1); },
  hit: (p = 0.5) => { noise(0.18, 0.25 + p * 0.25, 1200); tone('sine', 220, 70, 0.25, 0.3 + p * 0.2); },
  ko: () => { tone('sawtooth', 240, 110, 0.6, 0.12, 0.12); tone('sawtooth', 300, 140, 0.6, 0.08, 0.12); },
  duel: () => { tone('square', 196, 196, 0.25, 0.12); tone('square', 147, 147, 0.45, 0.12, 0.28); noise(0.5, 0.12, 300, 0.28); },
  champion: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.25, 0.25, i * 0.14)),
};
