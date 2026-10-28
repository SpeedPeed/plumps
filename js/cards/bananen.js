import { T } from '../tuning.js';

export default {
  id: 'bananen', name: 'Bananenrepublik', desc: 'Überall liegen Bananenschalen.',
  setup(g) {
    for (let i = 0; i < T.BANANEN_START; i++) {
      const s = g.safeSpot(20, g.bananas);
      g.bananas.push({ x: s.x, y: s.y, owner: null, t: 99, born: -99 });
    }
  },
};
