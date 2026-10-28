// Münzrausch: Münzen sammeln, wer fällt, verliert die Hälfte.
import { T } from '../tuning.js';
import { onGround } from '../geometry.js';

const r1 = (v) => Math.round(v * 10) / 10;

export default {
  id: 'muenzen', name: 'Münzrausch', emoji: '🪙',
  desc: 'Sammle Münzen! Wer ins Wasser fällt, verliert die Hälfte.',
  weight: 1,
  time: () => T.MUENZEN_TIME,
  canRespawn: () => true,

  setup(g) { g.ms.coins = []; g.ms.coinT = 0; },
  carryables: (g) => g.ms.coins,

  step(g, dt, alive) {
    g.ms.coinT -= dt;
    if (g.ms.coinT <= 0 && g.ms.coins.length < T.MUENZEN_MAX) {
      g.ms.coinT = T.MUENZEN_EVERY;
      const s = g.safeSpot(25, g.ms.coins);
      g.ms.coins.push({ x: s.x, y: s.y });
    }
    g.ms.coins = g.ms.coins.filter((c) => {
      if (!onGround(g.shapes, g.holes, c.x, c.y)) return false;
      for (const p of alive) {
        if (Math.hypot(p.x - c.x, p.y - c.y) < p.r + T.MUENZEN_PICK_R) {
          p.m += 1;
          g.emit({ k: 'coin', id: p.id, x: c.x, y: c.y });
          return false;
        }
      }
      return true;
    });
  },

  onFall(g, p) {
    if (p.m <= 0) return;
    const lost = Math.ceil(p.m / 2);
    p.m -= lost;
    g.emit({ k: 'coinloss', id: p.id, n: lost });
  },

  score: (g, p) => p.m,

  botGoal(g, p, ctx) {
    ctx.goal = ctx.nearest(g.ms.coins) || ctx.foe;
    ctx.attack = !g.ms.coins.length;
  },

  snapshot(g, s) { s.cn = g.ms.coins.map(c => [r1(c.x), r1(c.y)]); },

  hudMetric: (p) => `🪙 ${p.m}`,
};
