// Acker: Ein Maulwurf buddelt Löcher. Erst wackelt die Erde, dann ist da ein Loch.
import { T } from '../tuning.js';
import { holeCycle } from './hazards.js';

export default {
  id: 'knolle', name: 'Kartoffelinsel',
  hint: 'Maulwurf! Wo die Erde bebt, ist gleich ein Loch.',
  shapes: [
    { k: 'c', x: 0, y: 0, r: 190 }, { k: 'c', x: 120, y: -110, r: 140 }, { k: 'c', x: -140, y: 90, r: 130 },
    { k: 'c', x: 60, y: 150, r: 110 }, { k: 'c', x: -120, y: -150, r: 100 },
  ],
  step(g, dt, alive) { holeCycle(g, dt, alive, { every: T.MOLE_EVERY, first: [4, 6], R: T.MOLE_R, open: T.MOLE_OPEN }); },
};
