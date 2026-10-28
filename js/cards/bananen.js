import { T } from '../tuning.js';

export default {
  id: 'bananen', name: 'Bananenrepublik', desc: 'Überall liegen Bananenschalen.',
  perk: 'Hinter der Krone wachsen neue Schalen.', perkFor: 'leader',
  step(g, dt, alive) {
    g.cs.peelT = (g.cs.peelT ?? T.BANANEN_LEADER_EVERY) - dt;
    if (g.cs.peelT > 0) return;
    g.cs.peelT = T.BANANEN_LEADER_EVERY;
    for (const p of alive) {
      if (!g.isLeader(p) || g.bananas.length >= T.BANANA_MAX) continue;
      g.bananas.push({ x: p.x - p.fx * (p.r + 16), y: p.y - p.fy * (p.r + 16), owner: null, t: T.BANANA_LIFE, born: g.t });
    }
  },
  setup(g) {
    for (let i = 0; i < T.BANANEN_START; i++) {
      const s = g.safeSpot(20, g.bananas);
      g.bananas.push({ x: s.x, y: s.y, owner: null, t: 99, born: -99 });
    }
  },
};
