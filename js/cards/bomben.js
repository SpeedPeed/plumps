import { T } from '../tuning.js';

export default {
  id: 'bomben', name: 'Bombenhagel', emoji: '💣', desc: 'Es regnet Bomben. Weg von den roten Kreisen!',
  setup(g) { g.cs.bombT = 1.5; },
  step(g, dt, alive) {
    g.cs.bombT -= dt;
    if (g.cs.bombT > 0) return;
    g.cs.bombT = g.rng.range(T.BOMBEN_EVERY_MIN, T.BOMBEN_EVERY_MAX);
    // Bomben fallen bevorzugt in die Nähe von Spielern
    const target = alive.length && g.rng.next() < 0.6 ? g.rng.pick(alive) : null;
    const s = target ? { x: target.x + g.rng.range(-60, 60), y: target.y + g.rng.range(-60, 60) } : g.safeSpot(0);
    g.dropBomb(s.x, s.y, T.BOMBEN_FUSE);
  },
};
