// Vulkan: Aus dem Krater spritzen Lavabrocken auf den Ring.
import { T } from '../tuning.js';
import { dropCycle } from './hazards.js';

export default {
  id: 'ring', name: 'Ringinsel',
  hint: 'Der Vulkan spuckt! Rote Kreise zeigen, wo Lava landet.',
  shapes: [{ k: 'c', x: 0, y: 0, r: 300 }],
  holes: [{ x: 0, y: 0, r: 130 }],
  step(g, dt, alive) { dropCycle(g, dt, alive, { kind: 'lava', every: T.LAVA_EVERY, first: [3, 5], R: T.LAVA_R, F: T.LAVA_F }); },
};
