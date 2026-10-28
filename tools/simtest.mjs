#!/usr/bin/env node
// Headless-Test: simuliert ohne Grafik Runden nur mit Bots.
//
//   node tools/simtest.mjs                 alle Kombinationen Modus × Insel × Karte
//   node tools/simtest.mjs --quick         pro Modus × Insel nur 3 zufällige Karten
//   node tools/simtest.mjs --seed 123      anderer Startwert (Standard: 1)
//   node tools/simtest.mjs --only klassik/kreuz/eis   genau eine Kombination (Karte "-" = keine)
//   node tools/simtest.mjs --matches 40    Anzahl gemischter Matches für die Siegverteilung
//   node tools/simtest.mjs --ohne-mechanik Inseln ohne ihre Mechanik (zum Vergleich)
//
// Meldet Abstürze, Runden ohne Ende, durchschnittliche Rundendauer pro Modus und die
// Siegverteilung nach Bot-Stärke. Exit-Code 1, wenn etwas schiefgeht.
import { Game, MODES, MODE_IDS, MAPS, MAP_IDS, CARDS, CARD_IDS, BOT_LEVELS } from '../js/sim.js';
import { T } from '../js/tuning.js';
import { Rng, deriveSeed } from '../js/rng.js';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const QUICK = args.includes('--quick');
const SEED = Number(opt('--seed', 1)) >>> 0;
const ONLY = opt('--only', null);
const MATCHES = Number(opt('--matches', QUICK ? 12 : 40));
const DT = 1 / 60;
// Zum Vergleich: Inseln ohne ihre Mechanik
if (args.includes('--ohne-mechanik')) for (const m of Object.values(MAPS)) { delete m.step; delete m.setup; }

const errors = [];
const stuck = [];

// Wie lange darf eine Runde höchstens dauern (in Spielzeit)?
function roundLimit(g) {
  const time = g.M.time?.();
  if (time) return time + 5;
  const gm = g.gm;
  const vanish = gm.shrinkStart + 1 / gm.shrinkRate;  // bis die Insel ganz weg ist
  return vanish + T.END_DELAY + T.RESPAWN_AT * (T.LEBEN_LIVES + 1) + 10;
}

// Eine einzelne Runde in genau dieser Kombination spielen
function playRound(mode, map, card, seed, levels) {
  const g = new Game({ seed });
  levels.forEach((lvl, i) => { const p = g.addPlayer('b' + i, 'Bot' + i, true); p.botLevel = lvl; });
  g.startMatch();
  g.mode = mode; g.map = map; g.card = card; g.round = 0;
  g.beginCountdown();
  const limit = roundLimit(g);
  const events = { ko: 0, selfKo: 0, falls: 0, hazards: 0 };
  let steps = 0;
  while (g.phase !== 'roundEnd') {
    g.step(DT);
    for (const e of g.drainEvents()) {
      if (e.k === 'ko') { events.ko++; if (e.id === e.victim) events.selfKo++; }
      if ((e.k === 'plumps' || e.k === 'boom') && e.id) events.falls++;
      if (e.k === 'hazard') events.hazards++;
    }
    JSON.stringify(g.snapshot([]));
    if (g.phase === 'play' && g.t > limit) return { stuck: true, t: g.t, g };
    if (++steps > 60 * 600) return { stuck: true, t: g.t, g };
  }
  return { t: g.t, winner: g.roundWinner, g, events };
}

function combos() {
  if (ONLY) {
    const [mo, mp, c] = ONLY.split('/');
    return [[mo, mp, c && c !== '-' ? c : null]];
  }
  const rng = new Rng(SEED);
  const out = [];
  for (const mo of MODE_IDS) {
    for (const mp of MAP_IDS) {
      if (MODES[mo].still && MAPS[mp].moving) continue;
      let cards = [null, ...CARD_IDS.filter(c => CARDS[c].fits?.(mo, MAPS[mp]) ?? true)];
      if (QUICK) cards = [null, ...rng.shuffle(cards.slice(1)).slice(0, 3)];
      for (const c of cards) out.push([mo, mp, c]);
    }
  }
  return out;
}

// ---------- 1) Alle Kombinationen ----------

const t0 = Date.now();
const list = combos();
const perMode = {};
const perMap = {};
let n = 0, ko = 0, selfKo = 0;
for (const [mo, mp, c] of list) {
  const seed = deriveSeed(SEED, n++);
  const tag = `${mo}/${mp}/${c || '-'} (seed ${seed})`;
  try {
    const res = playRound(mo, mp, c, seed, [0, 1, 2, 1]);
    if (res.stuck) { stuck.push(`${tag}: nach ${res.t.toFixed(0)} s noch nicht vorbei`); continue; }
    const m = (perMode[mo] ||= { rounds: 0, time: 0, draws: 0, max: 0 });
    m.rounds++; m.time += res.t; m.max = Math.max(m.max, res.t);
    if (!res.winner) m.draws++;
    ko += res.events.ko; selfKo += res.events.selfKo;
    const pm = (perMap[mp] ||= { rounds: 0, time: 0, falls: 0, ko: 0, hazards: 0 });
    pm.rounds++; pm.time += res.t; pm.falls += res.events.falls; pm.ko += res.events.ko; pm.hazards += res.events.hazards;
  } catch (e) {
    errors.push(`${tag}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`);
  }
}

console.log(`\nPLUMPS! Headless-Test – Startwert ${SEED}${QUICK ? ' (schnell)' : ''}`);
console.log(`${list.length} Kombinationen in ${((Date.now() - t0) / 1000).toFixed(1)} s\n`);
console.log('Modus            Runden   Ø Dauer   längste   Unentschieden   Limit');
for (const mo of MODE_IDS) {
  const m = perMode[mo];
  if (!m) continue;
  const time = MODES[mo].time?.();
  console.log(`${MODES[mo].name.padEnd(16)} ${String(m.rounds).padStart(6)} ${(m.time / m.rounds).toFixed(1).padStart(8)} s ${m.max.toFixed(1).padStart(7)} s ${String(m.draws).padStart(10)}       ${time ? time + ' s' : 'Schrumpfen'}`);
}
console.log('\nInsel            Ø Dauer   Stürze/Min   ohne Schubser   Warnungen/Min');
for (const mp of MAP_IDS) {
  const m = perMap[mp];
  if (!m) continue;
  const min = m.time / 60;
  console.log(`${MAPS[mp].name.padEnd(16)} ${(m.time / m.rounds).toFixed(1).padStart(6)} s ${(m.falls / min).toFixed(1).padStart(10)} ${(100 * (1 - m.ko / Math.max(1, m.falls))).toFixed(0).padStart(12)} % ${(m.hazards / min).toFixed(1).padStart(12)}`);
}
console.log(`\nRauswürfe: ${ko}, davon sich selbst gutgeschrieben: ${selfKo}`);
if (selfKo) errors.push(`${selfKo} Rauswürfe wurden dem Opfer selbst gutgeschrieben`);

// ---------- 2) Siegverteilung nach Bot-Stärke ----------

const LINEUPS = [[0, 1, 2], [0, 0, 2, 2], [0, 1, 2, 0, 1, 2]];
// expected = so viele Siege wären es, wenn alle gleich stark wären
const wins = BOT_LEVELS.map(() => 0), expected = BOT_LEVELS.map(() => 0);
const pause = { n: 0, total: 0, max: 0, idleMax: 0, idleTotal: 0 };   // Zeit zwischen zwei Runden
const finaleRule = { matches: 0, ok: 0 };
const mech = BOT_LEVELS.map(() => ({ players: 0, dashes: 0, charged: 0, braces: 0, counters: 0, breaks: 0, saves: 0, falls: 0 }));
let rounds = 0;
for (let i = 0; i < MATCHES; i++) {
  const lineup = LINEUPS[i % LINEUPS.length];
  const seed = deriveSeed(SEED ^ 0xBEEF, i);
  try {
    const g = new Game({ seed });
    lineup.forEach((lvl, j) => { const p = g.addPlayer('b' + j, 'Bot' + j, true); p.botLevel = lvl; });
    g.target = 5;
    g.startMatch();
    let last = g.phase, steps = 0, endAt = null, pickAt = null, lastFinale = false, lastWinner = null;
    while (g.phase !== 'matchEnd' && steps++ < 60 * 60 * 30) {
      g.step(DT);
      const now = steps * DT;
      if (g.phase === 'roundEnd' && last !== 'roundEnd') { endAt = now; lastFinale = g.finale; lastWinner = g.roundWinner; }
      if (g.phase === 'pick' && last !== 'pick') pickAt = now;
      if (g.phase === 'play' && last === 'countdown' && endAt != null) {
        // ohne Spielen = Rundenende + Countdown; während der Kartenwahl schwabbeln alle frei
        const d = now - endAt, idle = d - (now - T.COUNTDOWN - pickAt);
        pause.n++; pause.total += d; pause.max = Math.max(pause.max, d);
        pause.idleTotal += idle; pause.idleMax = Math.max(pause.idleMax, idle);
      }
      for (const e of g.drainEvents()) {
        const lvl = g.players.get(e.id)?.botLevel;
        if (lvl == null) continue;
        if (e.k === 'dash' && e.c > 0.5) mech[lvl].charged++;
        if (e.k === 'brace') mech[lvl].braces++;
      }
      if (g.phase === 'roundEnd' && last !== 'roundEnd') {
        rounds++;
        lineup.forEach(l => { expected[l] += 1 / lineup.length; });
        const w = g.players.get(g.roundWinner);
        if (w) wins[w.botLevel]++;
      }
      last = g.phase;
    }
    if (g.phase !== 'matchEnd') stuck.push(`Match ${i} (seed ${seed}) endet nicht`);
    else {
      finaleRule.matches++;
      if (lastFinale && lastWinner === g.champion) finaleRule.ok++;
    }
    for (const p of g.players.values()) {
      const m = mech[p.botLevel];
      m.players++; m.dashes += p.stats.dashes; m.counters += p.stats.counters; m.breaks += p.stats.breaks;
      m.saves += p.stats.saves; m.falls += p.stats.falls;
    }
  } catch (e) {
    errors.push(`Match ${i} (seed ${seed}): ${e.stack.split('\n').slice(0, 3).join(' | ')}`);
  }
}
console.log(`\nSiegverteilung in ${MATCHES} gemischten Matches (${rounds} Runden):`);
console.log('Stärke    Siege   erwartet   Verhältnis   (1,0 = so gut wie der Durchschnitt)');
BOT_LEVELS.forEach((L, i) => {
  const ratio = expected[i] ? wins[i] / expected[i] : 0;
  console.log(`${L.name.padEnd(8)} ${String(wins[i]).padStart(6)} ${expected[i].toFixed(1).padStart(10)} ${ratio.toFixed(2).padStart(12)}`);
});
console.log(`\nZwischen zwei Runden: Ø ${(pause.total / (pause.n || 1)).toFixed(1)} s, höchstens ${pause.max.toFixed(1)} s`);
console.log(`  davon ohne Spielen (Rundenende + Countdown): Ø ${(pause.idleTotal / (pause.n || 1)).toFixed(1)} s, höchstens ${pause.idleMax.toFixed(1)} s`);
if (pause.idleMax > T.ROUND_END + T.COUNTDOWN + 0.2) errors.push(`Zu lange Pause ohne Spielen: ${pause.idleMax.toFixed(1)} s`);
console.log(`Finale: ${finaleRule.ok} von ${finaleRule.matches} Matches wurden im Finale entschieden`);
if (finaleRule.ok !== finaleRule.matches) errors.push('Ein Match wurde nicht im Finale entschieden');

console.log('\nKampf pro Spieler und Match:');
console.log('Stärke    Dashes  davon geladen  Stemmen  Konter  Durchbrüche  Rettungen  Stürze');
BOT_LEVELS.forEach((L, i) => {
  const m = mech[i], n = m.players || 1, f = (v) => (v / n).toFixed(1).padStart(7);
  console.log(`${L.name.padEnd(8)} ${f(m.dashes)} ${f(m.charged)}       ${f(m.braces)} ${f(m.counters)}  ${f(m.breaks)}     ${f(m.saves)}  ${f(m.falls)}`);
});
const strong = expected[2] ? wins[2] / expected[2] : 0, weak = expected[0] ? wins[0] / expected[0] : 0;
if (rounds && strong <= weak) errors.push(`Schwere Bots (${strong.toFixed(2)}) gewinnen nicht öfter als leichte (${weak.toFixed(2)})`);

// ---------- 3) Treffer-Zuordnung ----------

function duel(setup) {
  const g = new Game({ seed: 7 });
  const a = g.addPlayer('a', 'A'), b = g.addPlayer('b', 'B');
  g.startMatch(); g.mode = 'klassik'; g.map = 'rund'; g.card = null; g.round = 0; g.beginCountdown();
  g.phase = 'play';
  Object.assign(a, { x: -40, y: 0, vx: 0, vy: 0, dashT: 0, lastHitBy: null });
  Object.assign(b, { x: 0, y: 0, vx: 0, vy: 0, dashT: 0, lastHitBy: null });
  setup(g, a, b);
  g.collide([a, b]);
  return { g, a, b };
}
const checks = [
  ['Dash trifft Stehenden: nur das Opfer bekommt den Angreifer', () => { const { a, b } = duel((g, a) => { a.vx = 500; a.dashT = 0.2; }); return b.lastHitBy === 'a' && a.lastHitBy === null; }],
  ['Gleich schnelles Aufeinanderprallen zählt für niemanden', () => { const { a, b } = duel((g, a, b) => { a.vx = 150; b.vx = -150; }); return a.lastHitBy === null && b.lastHitBy === null; }],
  ['Deutlich Schnellerer ohne Dash ist Angreifer', () => { const { a, b } = duel((g, a, b) => { a.vx = 450; b.vx = -40; }); return b.lastHitBy === 'a' && a.lastHitBy === null; }],
  ['Wer gerammt wird, bekommt keinen Rauswurf, wenn der Rammer fällt', () => {
    const { g, a, b } = duel((g, a) => { a.vx = 500; a.dashT = 0.2; });
    g.fall(a, 'fall');
    return b.stats.ko === 0;
  }],
  ['Rauswurf durch Dash wird dem Angreifer gutgeschrieben', () => {
    const { g, a, b } = duel((g, a) => { a.vx = 500; a.dashT = 0.2; });
    g.fall(b, 'fall');
    return a.stats.ko === 1;
  }],
  ['Eigene Banane löscht keinen fremden Treffer', () => {
    const { g, a, b } = duel((g, a) => { a.vx = 500; a.dashT = 0.2; });
    g.bananas.push({ x: b.x, y: b.y, owner: 'b', t: 5, born: -99 });
    g.bananaStep(0, [b]);
    return b.lastHitBy === 'a';
  }],
  ['Fremde Bombe schreibt dem Werfer gut, eigene niemandem', () => {
    const { g, a, b } = duel(() => {});
    g.blast(b.x, b.y, 95, 600, null, 'a');
    const credited = b.lastHitBy === 'a';
    a.lastHitBy = null;
    g.blast(a.x, a.y, 95, 600, null, 'a');
    return credited && a.lastHitBy === null;
  }],
];
// Spieler a steht links, b rechts, beide mitten auf der Rundinsel; Eingaben laufen über setInput wie beim echten Spiel
function arena() {
  const g = new Game({ seed: 9 });
  const a = g.addPlayer('a', 'A'), b = g.addPlayer('b', 'B');
  g.startMatch(); g.mode = 'klassik'; g.map = 'rund'; g.card = null; g.round = 0; g.beginCountdown();
  g.phase = 'play'; g.items = []; g.itemT = 99;
  Object.assign(a, { x: -60, y: 0, vx: 0, vy: 0, fx: 1, fy: 0 });
  Object.assign(b, { x: 0, y: 0, vx: 0, vy: 0, fx: -1, fy: 0 });
  const input = (p, ch) => g.setInput(p.id, { ...p.input, ...ch });
  const run = (sec) => { for (let i = 0; i < Math.round(sec * 60); i++) g.step(DT); };
  return { g, a, b, input, run };
}
function dashEvents(g) { return g.drainEvents().filter(e => e.k === 'dash'); }
checks.push(
  ['Antippen ergibt einen ungeladenen Dash', () => {
    const { g, a, input, run } = arena();
    input(a, { d: a.input.d + 1, u: a.input.u + 1 }); run(0.05);
    const ev = dashEvents(g);
    return ev.length === 1 && ev[0].c === 0;
  }],
  ['Halten lädt den Dash auf (voll nach DASH_CHARGE)', () => {
    const { g, a, input, run } = arena();
    input(a, { d: a.input.d + 1, h: 1 }); run(T.DASH_CHARGE + 0.05);
    const during = a.charging;
    input(a, { u: a.input.u + 1, h: 0 }); run(0.02);
    const ev = dashEvents(g);
    return during && ev.length === 1 && ev[0].c === 1;
  }],
  ['Perfektes Stemmen kontert einen Dash und schreibt dem Stemmer gut', () => {
    const { g, a, b, input, run } = arena();
    input(b, { b: b.input.b + 1 }); run(0.02);
    a.x = -50; input(a, { d: a.input.d + 1, u: a.input.u + 1 }); run(0.08);
    const ev = g.drainEvents();
    return ev.some(e => e.k === 'counter') && a.vx < 0 && a.lastHitBy === 'b' && a.dazeT > 0;
  }],
  ['Spätes Stemmen dämpft den Knockback', () => {
    const hit = (braceEarly) => {
      const { g, a, b, input, run } = arena();
      if (braceEarly) { input(b, { b: b.input.b + 1 }); run(T.BRACE_PERFECT + 0.03); }
      a.x = -46; input(a, { d: a.input.d + 1, u: a.input.u + 1 }); run(0.05);
      return Math.hypot(b.vx, b.vy);
    };
    return hit(true) < hit(false) * 0.6;
  }],
  ['Voll geladener Dash bricht durchs Stemmen', () => {
    const { g, a, b, input, run } = arena();
    a.x = -200;
    input(a, { d: a.input.d + 1, h: 1 }); run(T.DASH_CHARGE + 0.05);
    input(b, { b: b.input.b + 1 }); run(0.01);
    input(a, { u: a.input.u + 1, h: 0 }); run(0.3);
    return g.drainEvents().some(e => e.k === 'break') && b.dazeT >= 0;
  }],
  ['Knapp über der Kante: Gegensteuern rettet', () => {
    const { g, a, input, run } = arena();
    Object.assign(a, { x: 300 + a.r * 0.5, y: 0, vx: 0 });
    input(a, { mx: -1, my: 0 }); run(T.EDGE_TIME + 0.1);
    const ev = g.drainEvents();
    return a.state === 'alive' && ev.some(e => e.k === 'wobble') && ev.some(e => e.k === 'save');
  }],
  ['Knapp über der Kante ohne Gegensteuern: Plumps nach EDGE_TIME', () => {
    const { g, a, run } = arena();
    Object.assign(a, { x: 300 + a.r * 0.5, y: 0, vx: 0 });
    run(T.EDGE_TIME * 0.5);
    const still = a.state === 'alive';
    run(T.EDGE_TIME);
    return still && a.state !== 'alive';
  }],
  ['Weit über der Kante: sofort Plumps', () => {
    const { g, a, run } = arena();
    Object.assign(a, { x: 300 + a.r * 1.5, y: 0, vx: 0 });
    run(0.02);
    return a.state === 'falling';
  }],
);
checks.push(
  ['Wer mitten im Match beitritt, bekommt den Punktestand des Letzten', () => {
    const g = new Game({ seed: 3 });
    for (let i = 0; i < 3; i++) g.addPlayer('b' + i, 'B', true);
    g.startMatch();
    [...g.players.values()].forEach((p, i) => { p.score = 2 + i; });
    const n = g.addPlayer('neu', 'Neu');
    return n.score === 2 && n.state === 'ghost';
  }],
  ['Wer mitten im Match geht, wird durch einen Bot ersetzt', () => {
    const g = new Game({ seed: 3 });
    g.addPlayer('a', 'A'); g.addPlayer('b', 'B');
    g.startMatch();
    g.botify('a');
    return g.players.get('a').bot && g.players.size === 2;
  }],
  ['Mit Matchball gibt es den letzten Punkt nur im Finale', () => {
    const g = new Game({ seed: 3 });
    const a = g.addPlayer('a', 'A'), b = g.addPlayer('b', 'B', true);
    g.target = 3; g.startMatch();
    a.score = 2; g.phase = 'play'; g.endRound(a);
    const capped = a.score === 2;
    g.afterRoundEnd();
    const isFinale = g.finale && g.phase === 'pick' && g.mode === 'klassik' && !g.options;
    g.beginCountdown(); g.phase = 'play'; g.endRound(a); g.afterRoundEnd();
    return capped && isFinale && g.phase === 'matchEnd' && g.champion === 'a';
  }],
  ['Farbe lässt sich nur wählen, wenn sie frei ist', () => {
    const g = new Game({ seed: 3 });
    const a = g.addPlayer('a', 'A'), b = g.addPlayer('b', 'B');
    return !g.setColor('a', b.ci) && g.setColor('a', 5) && a.ci === 5;
  }],
);
let failedChecks = 0;
console.log('\nPrüfungen:');
for (const [name, fn] of checks) {
  let ok = false;
  try { ok = fn(); } catch (e) { errors.push(`${name}: ${e.message}`); }
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failedChecks++;
}
if (failedChecks) errors.push(`${failedChecks} Prüfungen zur Treffer-Zuordnung fehlgeschlagen`);

// ---------- Ergebnis ----------

if (stuck.length) { console.log(`\nRunden ohne Ende (${stuck.length}):`); stuck.slice(0, 20).forEach(s => console.log('  ' + s)); }
if (errors.length) { console.log(`\nFehler (${errors.length}):`); errors.slice(0, 20).forEach(s => console.log('  ' + s)); }
const ok = !stuck.length && !errors.length;
console.log(ok ? '\nOK – keine Abstürze, keine Runden ohne Ende.' : '\nFEHLGESCHLAGEN');
process.exit(ok ? 0 : 1);
