// Korallenriff: Der Seestern zieht ab und zu einen Arm ein.
import { T } from '../tuning.js';
import { sinkCycle } from './hazards.js';
import { pickBusy } from './archipel.js';

const TAU = Math.PI * 2;

export default {
  id: 'stern', name: 'Seestern',
  hint: 'Der Seestern zieht Arme ein! Leuchtet einer, schnell zur Mitte.',
  shapes: [
    { k: 'c', x: 0, y: 0, r: 150 },
    ...[0, 1, 2, 3, 4].map(i => {
      const a = i / 5 * TAU - Math.PI / 2;
      return { k: 'r', x: Math.cos(a) * 180, y: Math.sin(a) * 180, w: 250, h: 130, a };
    }),
  ],
  step(g, dt) { sinkCycle(g, dt, { pick: pickBusy(1, 6), every: T.SINK_EVERY, first: [8, 11] }); },
};
