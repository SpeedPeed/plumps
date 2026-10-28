// Bausteine für Insel-Mechaniken. Jede Gefahr kündigt sich an (g.warn): Sie steht
// als Warnung in g.hz, alle sehen sie kommen, und erst nach Ablauf passiert etwas.
import { T } from '../tuning.js';
import { onGround } from '../geometry.js';

const range = (g, [a, b]) => g.rng.range(a, b);

// Etwas fällt vom Himmel (Kokosnuss, Lavabrocken, Kiste): Schatten wächst, dann Wumms.
// Zielt bevorzugt auf Spieler, damit niemand ewig verschont bleibt.
export function dropCycle(g, dt, alive, { kind, every, first = every, R, F, warn = T.HZ_WARN, onLand }) {
  const S = g.mapS.drop ??= { next: range(g, first) };
  S.next -= dt;
  if (S.next > 0) return;
  S.next = range(g, every);
  let x, y;
  const target = alive.length && g.rng.next() < T.HZ_AIM ? g.rng.pick(alive) : null;
  if (target) {
    x = target.x + g.rng.range(-50, 50); y = target.y + g.rng.range(-50, 50);
    if (!onGround(g.shapes, g.holes, x, y)) ({ x, y } = g.safeSpot(10));
  } else ({ x, y } = g.safeSpot(10));
  g.warn({
    kind, x, y, r: R, warn,
    fire(g) {
      g.emit({ k: 'impact', kind, x, y });
      g.blast(x, y, R, F, null, null);
      onLand?.(g, x, y);
    },
  });
}

// Ein Teil der Insel geht unter (Brücke, Sandbank, Seestern-Arm) und taucht später wieder auf.
// pick(g) liefert den Index der Form oder null.
export function sinkCycle(g, dt, { pick, every, first = every, warn = T.HZ_WARN, down = T.SINK_DOWN }) {
  const S = g.mapS.sink ??= { next: range(g, first), list: [] };
  S.next -= dt;
  if (S.next <= 0 && !S.list.length) {
    S.next = range(g, every);
    const i = pick(g);
    const sh = i == null ? null : g.shapes[i];
    if (sh) {
      const r = sh.k === 'c' ? sh.r : Math.hypot(sh.w, sh.h) / 2;
      g.warn({ kind: 'sink', i, x: sh.x, y: sh.y, r, warn, fire(g) { S.list.push({ i, ph: 'sink', t: T.SINK_ANIM, x: sh.x, y: sh.y }); g.emit({ k: 'sink', i, x: sh.x, y: sh.y }); } });
    }
  }
  for (const s of S.list) {
    s.t -= dt;
    if (s.ph === 'sink') {
      g.shapeMul[s.i] = Math.max(0, s.t / T.SINK_ANIM);
      if (s.t <= 0) { s.ph = 'down'; s.t = down; }
    } else if (s.ph === 'down') {
      g.shapeMul[s.i] = 0;
      if (s.t <= 0) { s.ph = 'rise'; s.t = T.RISE_ANIM; g.emit({ k: 'rise', i: s.i, x: s.x, y: s.y }); }
    } else {
      g.shapeMul[s.i] = 1 - Math.max(0, s.t / T.RISE_ANIM);
      if (s.t <= 0) { delete g.shapeMul[s.i]; s.done = true; }
    }
  }
  S.list = S.list.filter(s => !s.done);
}

// Ein Loch tut sich auf (Maulwurf) und schließt sich wieder
export function holeCycle(g, dt, alive, { every, first = every, R, open, warn = T.HZ_WARN }) {
  const S = g.mapS.hole ??= { next: range(g, first), open: [] };
  S.next -= dt;
  if (S.next <= 0) {
    S.next = range(g, every);
    const target = alive.length && g.rng.next() < T.HZ_AIM ? g.rng.pick(alive) : null;
    let { x, y } = target && onGround(g.shapes, g.holes, target.x, target.y, R) ? target : g.safeSpot(R);
    x += g.rng.range(-25, 25); y += g.rng.range(-25, 25);
    g.warn({
      kind: 'mole', x, y, r: R, warn,
      fire(g) {
        const h = { x, y, r: R, tmp: true };
        g.holes.push(h);
        S.open.push({ h, until: g.t + open });
        g.emit({ k: 'impact', kind: 'mole', x, y });
      },
    });
  }
  for (const o of S.open) if (g.t >= o.until) { g.holes = g.holes.filter(h => h !== o.h); o.done = true; }
  S.open = S.open.filter(o => !o.done);
}

// Zeitplan für Inseln, die regelmäßig „aufdrehen“: normal – Warnung – Turbo.
// Liefert den Abschnitt und wie weit er fortgeschritten ist.
export function spinPhase(t, { calm, warn, fast, offset = 0 }) {
  const per = calm + warn + fast;
  const u = ((t - offset) % per + per) % per;
  if (t < offset || u < calm) return { ph: 'calm', p: 0, n: Math.floor((t - offset) / per) };
  if (u < calm + warn) return { ph: 'warn', p: (u - calm) / warn, n: Math.floor((t - offset) / per) };
  return { ph: 'fast', p: (u - calm - warn) / fast, n: Math.floor((t - offset) / per) };
}

// Warnung für das Aufdrehen einmal pro Zyklus ankündigen
export function announceSpin(g, sp, kind) {
  if (sp.ph === 'warn' && g.mapS.spinWarned !== sp.n) {
    g.mapS.spinWarned = sp.n;
    g.emit({ k: 'hazard', kind });
  }
}
