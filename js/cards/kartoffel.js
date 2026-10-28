import { T } from '../tuning.js';

const r1 = (v) => Math.round(v * 10) / 10;

function pass(g, id) {
  g.cs.potato = id;
  g.cs.immune = g.t + 0.5;
  g.emit({ k: 'potato', id });
}

export default {
  id: 'kartoffel', name: 'Heiße Kartoffel', desc: 'Wer sie hält, wenn sie explodiert, fliegt raus. Weitergeben durch Rempeln!',
  perk: 'Die Krone hat sie zuerst – und bei ihr tickt sie doppelt so schnell.', perkFor: 'leader',
  fits: (mode) => mode !== 'fangen',
  setup(g) { g.cs.potato = null; g.cs.immune = 0; },

  onCollide(g, a, b) {
    if (g.t <= g.cs.immune) return;
    if (g.cs.potato === a.id) pass(g, b.id);
    else if (g.cs.potato === b.id) pass(g, a.id);
  },

  onFall(g, p) { if (g.cs.potato === p.id) g.cs.potato = null; },
  onRemove(g, id) { if (g.cs.potato === id) g.cs.potato = null; },

  step(g, dt, alive) {
    const h = g.players.get(g.cs.potato);
    if (!h || h.state !== 'alive') {
      g.cs.potato = null;
      if (alive.length >= 2) {
        // Die erste Kartoffel bekommt der Führende
        const leader = !g.cs.started && alive.find(p => g.isLeader(p));
        g.cs.started = true;
        pass(g, (leader || g.rng.pick(alive)).id);
        g.cs.potatoT = g.rng.range(T.KARTOFFEL_MIN, T.KARTOFFEL_MAX);
      }
      return;
    }
    g.cs.potatoT -= dt * (g.isLeader(h) ? T.KARTOFFEL_LEADER : 1);
    if (g.cs.potatoT <= 0) {
      g.cs.potato = null;
      g.blast(h.x, h.y, T.KARTOFFEL_R, T.KARTOFFEL_F, h);
      g.fall(h, 'boom');
    }
  },

  botAdjust(g, p, ctx) {
    if (g.cs.potato === p.id) { ctx.goal = ctx.foe; ctx.potatoHolder = true; return; }
    const h = g.players.get(g.cs.potato);
    if (h && Math.hypot(h.x - p.x, h.y - p.y) < 170) ctx.flee = h;
  },

  snapshot(g, s) {
    s.po = g.cs.potato || null;
    s.pt = g.cs.potato ? r1(g.cs.potatoT) : 0;
  },
};
