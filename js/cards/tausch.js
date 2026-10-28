import { T } from '../tuning.js';

export default {
  id: 'tausch', name: 'Platztausch', desc: 'Alle paar Sekunden tauschen alle die Plätze.',
  fits: (mode) => mode !== 'farbe',
  setup(g) { g.cs.swapT = 7; },
  step(g, dt, alive) {
    g.cs.swapT -= dt;
    if (g.cs.swapT > 0 || alive.length < 2) return;
    g.cs.swapT = T.TAUSCH_EVERY;
    const pos = alive.map(p => [p.x, p.y]);
    // Verschieben um mindestens eins garantiert, dass jeder woanders landet
    const shift = 1 + g.rng.int(alive.length - 1);
    alive.forEach((p, i) => { [p.x, p.y] = pos[(i + shift) % alive.length]; });
    g.emit({ k: 'swap' });
  },
};
