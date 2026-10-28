// Farbkampf: Die Insel in der eigenen Farbe anmalen.
import { T } from '../tuning.js';
import { onGround } from '../geometry.js';

const CELL = 24;
const GRID_N = 28;  // 28×28 Zellen à 24 Einheiten

function countCells(g) {
  const counts = new Map();
  for (const v of g.ms.grid) if (v) counts.set(v - 1, (counts.get(v - 1) || 0) + 1);
  for (const p of g.players.values()) p.m = counts.get(p.ci) || 0;
}

export default {
  id: 'farbe', name: 'Farbkampf', emoji: '🎨',
  desc: 'Färb die Insel in deiner Farbe. Wer am meisten Fläche hat, gewinnt.',
  weight: 1,
  still: true,   // nur auf Inseln, die sich nicht bewegen
  time: () => T.FARBE_TIME,
  canRespawn: () => true,

  setup(g) {
    g.ms.grid = new Uint8Array(GRID_N * GRID_N);
    g.ms.countT = 0;
    g.gridDirty = true;
  },

  step(g, dt, alive) {
    const off = GRID_N * CELL / 2;
    for (const p of alive) {
      const r = p.r + 6;
      const x0 = Math.floor((p.x - r + off) / CELL), x1 = Math.floor((p.x + r + off) / CELL);
      const y0 = Math.floor((p.y - r + off) / CELL), y1 = Math.floor((p.y + r + off) / CELL);
      for (let gy = Math.max(0, y0); gy <= Math.min(GRID_N - 1, y1); gy++) {
        for (let gx = Math.max(0, x0); gx <= Math.min(GRID_N - 1, x1); gx++) {
          const cx = gx * CELL - off + CELL / 2, cy = gy * CELL - off + CELL / 2;
          if (Math.hypot(cx - p.x, cy - p.y) > r) continue;
          if (!onGround(g.shapes, g.holes, cx, cy)) continue;
          const i = gy * GRID_N + gx;
          if (g.ms.grid[i] !== p.ci + 1) { g.ms.grid[i] = p.ci + 1; g.gridDirty = true; }
        }
      }
    }
    g.ms.countT -= dt;
    if (g.ms.countT <= 0) { g.ms.countT = 0.3; countCells(g); }
  },

  beforeScore: countCells,
  onEnd: countCells,
  score: (g, p) => p.m,

  botGoal(g, p, ctx) {
    const b = p.botBrain;
    b.goalT -= ctx.level.react;
    if (!b.goal || b.goalT <= 0 || Math.hypot(b.goal.x - p.x, b.goal.y - p.y) < 30) {
      b.goal = g.safeSpot(50);
      b.goalT = g.rng.range(1.5, 3);
    }
    ctx.goal = g.rng.next() < 0.25 ? ctx.foe : b.goal;
    ctx.attack = ctx.goal === ctx.foe;
  },

  snapshot(g, s, withGrid) {
    if (withGrid && g.ms.grid) s.gr = Array.from(g.ms.grid, v => v.toString(36)).join('');
  },

  hudMetric: (p, s) => {
    const total = s.p.reduce((n, q) => n + q.m, 0);
    return `🎨 ${total ? Math.round(p.m / total * 100) : 0}%`;
  },
};
