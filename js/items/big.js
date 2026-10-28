import { T } from '../tuning.js';

export default {
  id: 'big', name: 'Riesenpilz', emoji: '🍄', desc: 'Du bist 7 s lang riesig!',
  apply(g, p) { p.pw.big = T.BIG_TIME; },
  effects: {
    big: { mods(g, p, pm) { pm.size *= T.BIG_SIZE; } },
  },
};
