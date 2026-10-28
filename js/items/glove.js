import { T } from '../tuning.js';

export default {
  id: 'glove', name: 'Boxhandschuh', desc: 'Deine Dashes hauen 8 s lang extrem rein!',
  apply(g, p) { p.pw.glove = T.GLOVE_TIME; },
  effects: {
    glove: { mods(g, p, pm) { pm.dashMul *= T.GLOVE_MUL; pm.punch = true; } },
  },
};
