import { T } from '../tuning.js';

export default {
  id: 'flipper', name: 'Flipper', desc: 'Bumper auf der Insel. Ding ding ding!',
  setup(g) {
    for (let i = 0; i < 3; i++) {
      const s = g.safeSpot(60, g.bumpers);
      g.bumpers.push({ x: s.x, y: s.y, r: T.BUMPER_R });
    }
  },
};
