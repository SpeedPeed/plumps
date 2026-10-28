import { T } from '../tuning.js';

export default {
  id: 'bomben', name: 'Bombenhagel', desc: 'Es regnet Bomben. Weg von den roten Kreisen!',
  perk: 'Bomben zielen bevorzugt auf die Krone.', perkFor: 'leader',
  setup(g) { g.cs.bombT = 1.5; },
  step(g, dt, alive) {
    g.cs.bombT -= dt;
    if (g.cs.bombT > 0) return;
    g.cs.bombT = g.rng.range(T.BOMBEN_EVERY_MIN, T.BOMBEN_EVERY_MAX);
    const leaders = alive.filter(p => g.isLeader(p));
    const r = g.rng.next();
    const target = leaders.length && r < T.BOMBEN_LEADER ? g.rng.pick(leaders)
      : alive.length && r < 0.75 ? g.rng.pick(alive) : null;
    const s = target ? { x: target.x + g.rng.range(-60, 60), y: target.y + g.rng.range(-60, 60) } : g.safeSpot(0);
    g.dropBomb(s.x, s.y, T.BOMBEN_FUSE);
  },
};
