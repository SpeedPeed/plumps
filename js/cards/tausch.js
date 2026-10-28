import { T } from '../tuning.js';
import { onGround } from '../geometry.js';

export default {
  id: 'tausch', name: 'Platztausch', desc: 'Alle paar Sekunden tauschen alle die Plätze.',
  perk: 'Die Krone landet beim Tausch immer am Rand.', perkFor: 'leader',
  fits: (mode) => mode !== 'farbe',
  setup(g) { g.cs.swapT = 7; },
  step(g, dt, alive) {
    g.cs.swapT -= dt;
    if (g.cs.swapT > 0) return;
    if (alive.length < 2) return;
    g.cs.swapT = T.TAUSCH_EVERY;
    const pos = alive.map(p => [p.x, p.y]);
    // Verschieben um mindestens eins garantiert, dass jeder woanders landet
    const shift = 1 + g.rng.int(alive.length - 1);
    alive.forEach((p, i) => { [p.x, p.y] = pos[(i + shift) % alive.length]; });
    // Die Krone bekommt den Platz, der der Kante am nächsten ist
    const edge = (p) => { let m = 0; while (m < 300 && onGround(g.shapes, g.holes, p.x, p.y, m + 10)) m += 10; return m; };
    const leader = alive.find(p => g.isLeader(p));
    if (leader) {
      const worst = alive.reduce((a, p) => (edge(p) < edge(a) ? p : a), alive[0]);
      [leader.x, worst.x] = [worst.x, leader.x];
      [leader.y, worst.y] = [worst.y, leader.y];
    }
    g.emit({ k: 'swap' });
  },
};
