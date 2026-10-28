// Bots. Jeder Bot entscheidet nur alle paar Zehntelsekunden neu (Reaktionszeit),
// dazwischen bleibt die alte Eingabe stehen. Modi und Karten setzen über
// botGoal/botAdjust das Ziel; Vorsicht am Rand, Stemmen und Kantenrettung sind für alle gleich.
// Die Stärke entscheidet, wie oft und wie gut ein Bot auflädt, stemmt und sich rettet.
import { T, BOT_LEVELS } from './tuning.js';
import { onGround } from './geometry.js';

const TAU = Math.PI * 2;

// Tasten wie ein Mensch drücken: Zähler hochzählen
const press = (p) => { p.input = { ...p.input, d: p.input.d + 1, h: 1 }; };
const release = (p) => { p.input = { ...p.input, u: p.input.u + 1, h: 0 }; };
const tap = (p) => { p.input = { ...p.input, d: p.input.d + 1, u: p.input.u + 1, h: 0 }; };
const brace = (p) => { p.input = { ...p.input, b: p.input.b + 1 }; };
const steer = (p, mx, my) => { p.input = { ...p.input, mx, my }; };

export function botThink(g, p, alive, dt) {
  const L = BOT_LEVELS[p.botLevel ?? g.botLevel] || BOT_LEVELS[0];
  const b = p.botBrain;
  const rng = g.rng;
  b.wobble += dt * 3;

  if (p.state === 'alive') {
    // Losgelassen wird zur geplanten Zeit, unabhängig von der Reaktionszeit
    if (b.releaseAt != null && g.t >= b.releaseAt) { release(p); b.releaseAt = null; }
    reactToDashes(g, p, alive, L);
    rescueFromEdge(g, p, L);
  }

  b.cd -= dt;
  if (b.cd > 0) return;
  b.cd = L.react * rng.range(0.7, 1.3);
  let mx = 0, my = 0, attackFoe = null;

  if (p.state === 'ghost') {
    const target = alive.length ? alive[Math.floor((b.wobble / 5) % alive.length)] : null;
    if (target) {
      mx = target.x - p.gx; my = target.y - p.gy;
      if (Math.hypot(mx, my) < 80 && rng.next() < L.pups) tap(p);
    }
  } else if (p.state === 'alive') {
    const dist = (q) => Math.hypot(q.x - p.x, q.y - p.y);
    const nearest = (list) => list.reduce((a, q) => (!a || dist(q) < dist(a) ? q : a), null);
    const foe = nearest(alive.filter(q => q !== p));
    const ctx = { foe, nearest, level: L, goal: foe, flee: null, attack: true, invert: false, potatoHolder: false };
    // Beim freien Schwabbeln vor der Runde gibt es weder Modus noch Karte
    if (!g.free) { g.M.botGoal?.(g, p, ctx); g.C.botAdjust?.(g, p, ctx); }
    const item = nearest(g.items);
    if (item && dist(item) < 140 && rng.next() < 0.6) { ctx.goal = item; ctx.attack = false; }

    let dash = false;
    if (ctx.flee) {
      const f = ctx.flee, dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy) || 1;
      mx = dx / d - p.x / 400; my = dy / d - p.y / 400;
    } else if (ctx.goal) {
      const goal = ctx.goal, err = L.aimErr;
      mx = goal.x + rng.range(-err, err) - p.x; my = goal.y + rng.range(-err, err) - p.y;
      const d = dist(goal);
      if (ctx.attack && goal === foe && d < L.range + p.r && rng.next() < L.dash) { dash = true; attackFoe = foe; }
      if (ctx.potatoHolder && d < 120) dash = rng.next() < 0.3;
    }
    for (const bo of g.bombs) {
      const dx = p.x - bo.x, dy = p.y - bo.y, d = Math.hypot(dx, dy) || 1;
      if (d < 130) { mx += dx / d * 3; my += dy / d * 3; }
    }
    // Angekündigte Gefahren der Insel meiden (aufmerksame Bots früher)
    for (const h of g.hz) {
      if (h.t > L.react + 1.4 || rng.next() > L.care) continue;
      const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy) || 1;
      if (d < h.r + p.r + 30) { mx += dx / d * 3; my += dy / d * 3; }
    }
    const m = Math.hypot(mx, my) || 1;
    mx /= m; my /= m;

    if (rng.next() < L.derp) { const a = rng.range(0, TAU); mx = Math.cos(a); my = Math.sin(a); dash = false; }
    if (rng.next() < L.care) [mx, my, dash] = avoidEdge(g, p, L, mx, my, dash);
    mx *= L.speed; my *= L.speed;
    if (ctx.invert) { mx = -mx; my = -my; }

    if (dash && !p.charging && b.releaseAt == null && p.dashCd <= 0 && p.braceT <= 0) {
      // Wer stemmt, wird (von guten Bots) mit vollem Dash durchbrochen; sonst je nach Lust aufladen
      const vsBrace = attackFoe && attackFoe.braceT > 0 && (p.botLevel ?? g.botLevel) > 0;
      if (vsBrace || rng.next() < L.charge) {
        press(p);
        b.releaseAt = g.t + (vsBrace ? T.DASH_CHARGE + 0.05 : rng.range(L.hold[0], L.hold[1]));
      } else tap(p);
    }
  }
  const m = Math.hypot(mx, my);
  if (m > 1) { mx /= m; my /= m; }
  steer(p, mx, my);
}

// Kommt ein Dash auf mich zu? Dann (je nach Stärke) stemmen – gute Bots mit gutem Timing.
function reactToDashes(g, p, alive, L) {
  const b = p.botBrain;
  if (p.braceCd > 0 || p.charging || p.dazeT > 0) return;
  for (const q of alive) {
    if (q === p || q.dashT <= 0) continue;
    const key = q.id + ':' + q.stats.dashes;
    if (b.seenDash[q.id] === key) continue;
    const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1;
    const approach = (q.vx * dx + q.vy * dy) / d;
    if (approach < 150 || d > 200) continue;
    const tti = Math.max(0, d - p.r - q.r) / approach;
    if (tti > L.braceAt) continue;
    b.seenDash[q.id] = key;               // pro Dash nur einmal entscheiden
    if (g.rng.next() < L.brace) { brace(p); return; }
  }
}

// An der Kante: zurück auf die Insel steuern, gute Bots dashen sich zurück
function rescueFromEdge(g, p, L) {
  const b = p.botBrain;
  if (p.edgeAge <= 0) { b.edgeHandled = false; return; }
  if (b.edgeHandled) return;
  b.edgeHandled = true;
  if (g.rng.next() >= L.save) return;
  let best = null;
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU, dx = Math.cos(a), dy = Math.sin(a);
    if (onGround(g.shapes, g.holes, p.x + dx * 40, p.y + dy * 40, 10)) {
      const s = -(dx * p.vx + dy * p.vy);  // möglichst gegen den Schwung
      if (!best || s > best[2]) best = [dx, dy, s];
    }
  }
  if (!best) return;
  steer(p, best[0], best[1]);
  b.cd = Math.max(b.cd, 0.3);               // die Rettung nicht gleich wieder überschreiben
  // Die Blickrichtung folgt im selben Schritt der Eingabe, der Dash geht also Richtung Insel
  if (p.dashCd <= 0 && !p.charging && g.rng.next() < L.save * 0.6) tap(p);
}

// Vorsicht am Rand: wohin trägt uns der Schwung, und ist da noch Boden?
// Wer langsam reagiert, muss weiter vorausschauen.
function avoidEdge(g, p, L, mx, my, dash) {
  const ahead = (dx, dy, s) => onGround(g.shapes, g.holes, p.x + dx * s, p.y + dy * s, 12);
  const look = L.react + 0.3;
  const momentumBad = !onGround(g.shapes, g.holes, p.x + p.vx * look, p.y + p.vy * look, 12);
  const reach = 45 + Math.hypot(p.vx, p.vy) * L.react + 0.5 * T.ACC * L.speed * L.react * L.react;
  if (!momentumBad && ahead(mx, my, reach) && ahead(mx, my, reach / 2)) return [mx, my, dash];
  let best = null, bestScore = -1e9;
  const sp = Math.hypot(p.vx, p.vy) || 1;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU, dx = Math.cos(a), dy = Math.sin(a);
    if (!ahead(dx, dy, reach) || !ahead(dx, dy, 25)) continue;
    const s = dx * mx + dy * my - (momentumBad ? 2.5 * (dx * p.vx + dy * p.vy) / sp : 0);
    if (s > bestScore) { bestScore = s; best = [dx, dy]; }
  }
  return best ? [best[0], best[1], false] : [mx, my, false];
}
