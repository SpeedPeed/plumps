// Tropen: Von der Palme fallen Kokosnüsse. Der Schatten wächst, dann Wumms.
import { T } from '../tuning.js';
import { dropCycle } from './hazards.js';

export default {
  id: 'rund', name: 'Rundinsel',
  hint: 'Kokosnüsse! Wo ein Schatten wächst, schlägt gleich eine ein.',
  shapes: [{ k: 'c', x: 0, y: 0, r: 300 }],
  step(g, dt, alive) { dropCycle(g, dt, alive, { kind: 'kokos', every: T.KOKOS_EVERY, first: [4, 6], R: T.KOKOS_R, F: T.KOKOS_F }); },
};
