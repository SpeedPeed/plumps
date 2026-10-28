// Kistenland: Schwere Kisten stehen herum. Man kann sie schieben – auch in andere hinein
// und ins Wasser. Versunkene Kisten fallen mit Vorwarnung neu vom Himmel.
import { T } from '../tuning.js';
import { onGround } from '../geometry.js';

function place(g, x, y) { g.crates.push({ x, y, vx: 0, vy: 0, r: T.CRATE_R, by: null, byT: -99, a: g.rng.range(-0.3, 0.3) }); }

function dropCrate(g, delay) {
  const { x, y } = g.safeSpot(T.CRATE_R + 10, [...g.crates, ...[...g.players.values()].filter(p => p.state === 'alive')]);
  g.warn({
    kind: 'crate', x, y, r: T.CRATE_R + 6, warn: delay,
    fire(g) {
      g.emit({ k: 'impact', kind: 'crate', x, y });
      g.blast(x, y, T.CRATE_R + 30, T.CRATE_LAND_F, null, null);
      place(g, x, y);
    },
  });
}

export default {
  id: 'quadrat', name: 'Kistenland',
  hint: 'Kisten lassen sich schieben – ramm sie in die anderen!',
  shapes: [{ k: 'r', x: 0, y: 0, w: 470, h: 470 }],

  setup(g) {
    for (let i = 0; i < T.CRATES; i++) {
      const s = g.safeSpot(T.CRATE_R + 30, g.crates);
      place(g, s.x, s.y);
    }
  },

  step(g, dt, alive) {
    const k = Math.exp(-T.CRATE_FRIC * dt);
    for (const c of g.crates) {
      c.vx *= k; c.vy *= k;
      c.x += c.vx * dt; c.y += c.vy * dt;
      for (const p of alive) {
        const dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy), min = c.r + p.r;
        if (d >= min || d === 0) continue;
        const nx = dx / d, ny = dy / d;
        const mp = p.r * p.r * g.playerMods(p).mass, mc = c.r * c.r * T.CRATE_MASS;
        const ov = min - d;
        p.x -= nx * ov * mc / (mp + mc); p.y -= ny * ov * mc / (mp + mc);
        c.x += nx * ov * mp / (mp + mc); c.y += ny * ov * mp / (mp + mc);
        const rv = (c.vx - p.vx) * nx + (c.vy - p.vy) * ny;
        if (rv >= 0) continue;
        const j = -(1 + 0.4) * rv / (1 / mp + 1 / mc);
        // Wer schiebt, bekommt die Kiste gutgeschrieben; wer getroffen wird, dem wird der Schieber gutgeschrieben
        const pushing = p.vx * nx + p.vy * ny > c.vx * nx + c.vy * ny + 40;
        if (pushing) { c.by = p.id; c.byT = g.t; }
        else if (-rv > T.CRATE_HIT_SPEED && c.by && g.t - c.byT < 3) { g.credit(p, c.by); g.emit({ k: 'boing', x: (c.x + p.x) / 2, y: (c.y + p.y) / 2, p: 0.8 }); }
        p.vx -= j / mp * nx; p.vy -= j / mp * ny;
        c.vx += j / mc * nx; c.vy += j / mc * ny;
        if (p.dashT > 0 && pushing) { c.vx += nx * T.CRATE_DASH; c.vy += ny * T.CRATE_DASH; }
      }
    }
    // Kisten untereinander
    for (let i = 0; i < g.crates.length; i++) for (let j = i + 1; j < g.crates.length; j++) {
      const a = g.crates[i], b = g.crates[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
      if (d >= min || d === 0) continue;
      const nx = dx / d, ny = dy / d, ov = (min - d) / 2;
      a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
      const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rv < 0) { a.vx += rv * nx; a.vy += rv * ny; b.vx -= rv * nx; b.vy -= rv * ny; }
    }
    // Ins Wasser geschobene Kisten versinken und kommen später neu von oben
    for (const c of g.crates) {
      if (onGround(g.shapes, g.holes, c.x, c.y)) continue;
      c.gone = true;
      g.emit({ k: 'splash', x: c.x, y: c.y });
      dropCrate(g, T.CRATE_BACK);
    }
    g.crates = g.crates.filter(c => !c.gone);
  },
};
