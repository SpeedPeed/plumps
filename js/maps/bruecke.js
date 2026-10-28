// Brückeninseln: Die Brücke knarzt, bricht ein und wird später wieder aufgebaut.
import { T } from '../tuning.js';
import { sinkCycle } from './hazards.js';

export default {
  id: 'bruecke', name: 'Brückeninseln',
  hint: 'Die Brücke knarzt? Runter da – gleich bricht sie ein!',
  shapes: [{ k: 'c', x: -185, y: 0, r: 140 }, { k: 'c', x: 185, y: 0, r: 140 }, { k: 'r', x: 0, y: 0, w: 300, h: 100 }],
  step(g, dt) { sinkCycle(g, dt, { pick: () => 2, every: T.BRUECKE_EVERY, first: [9, 12], down: T.BRUECKE_DOWN }); },
};
