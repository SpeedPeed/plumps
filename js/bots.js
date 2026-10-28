// Bots. Jeder Bot entscheidet nur alle paar Zehntelsekunden neu (Reaktionszeit),
// dazwischen bleibt die alte Eingabe stehen. Modi und Karten setzen über
// botGoal/botAdjust das Ziel; die Vorsicht am Rand ist für alle gleich.
import { T, BOT_LEVELS } from './tuning.js';
import { onGround } from './geometry.js';

const TAU = Math.PI * 2;

export function botThink(g, p, alive, dt) {
  const L = BOT_LEVELS[p.botLevel ?? g.botLevel] || BOT_LEVELS[0];
  const b = p.botBrain;
  const rng = g.rng;
  b.wobble += dt * 3;
  b.cd -= dt;
  if (b.cd > 0) return;
  b.cd = L.react * rng.range(0.7, 1.3);
  let mx = 0, my = 0, dash = false;

  if (p.state === 'ghost') {
    const target = alive.length ? alive[Math.floor((b.wobble / 5) % alive.length)] : null;
    if (target) {
      mx = target.x - p.gx; my = target.y - p.gy;
      if (Math.hypot(mx, my) < 80 && rng.next() < L.pups) dash = true;
    }
  } else if (p.state === 'alive') {
    const dist = (q) => Math.hypot(q.x - p.x, q.y - p.y);
    const nearest = (list) => list.reduce((a, q) => (!a || dist(q) < dist(a) ? q : a), null);
    const foe = nearest(alive.filter(q => q !== p));
    const ctx = { foe, nearest, level: L, goal: foe, flee: null, attack: true, invert: false, potatoHolder: false };
    g.M.botGoal?.(g, p, ctx);
    g.C.botAdjust?.(g, p, ctx);
    const item = nearest(g.items);
    if (item && dist(item) < 140 && rng.next() < 0.6) { ctx.goal = item; ctx.attack = false; }

    if (ctx.flee) {
      const f = ctx.flee, dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy) || 1;
      mx = dx / d - p.x / 400; my = dy / d - p.y / 400;
    } else if (ctx.goal) {
      const goal = ctx.goal, err = L.aimErr;
      mx = goal.x + rng.range(-err, err) - p.x; my = goal.y + rng.range(-err, err) - p.y;
      const d = dist(goal);
      if (ctx.attack && goal === foe && d < L.range + p.r && rng.next() < L.dash) dash = true;
      if (ctx.potatoHolder && d < 120) dash = rng.next() < 0.3;
    }
    for (const bo of g.bombs) {
      const dx = p.x - bo.x, dy = p.y - bo.y, d = Math.hypot(dx, dy) || 1;
      if (d < 130) { mx += dx / d * 3; my += dy / d * 3; }
    }
    const m = Math.hypot(mx, my) || 1;
    mx /= m; my /= m;

    if (rng.next() < L.derp) { const a = rng.range(0, TAU); mx = Math.cos(a); my = Math.sin(a); dash = false; }
    if (rng.next() < L.care) [mx, my, dash] = avoidEdge(g, p, L, mx, my, dash);
    mx *= L.speed; my *= L.speed;
    if (ctx.invert) { mx = -mx; my = -my; }
  }
  const m = Math.hypot(mx, my);
  if (m > 1) { mx /= m; my /= m; }
  p.input = { mx, my, d: p.input.d + (dash ? 1 : 0) };
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
