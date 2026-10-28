import { T } from '../tuning.js';

export default {
  id: 'speed', name: 'Turboschuhe', desc: '8 s lang schneller, mehr und stärkere Dashes.',
  apply(g, p) { p.pw.speed = T.SPEED_TIME; },
  effects: {
    speed: { mods(g, p, pm) { pm.acc *= T.SPEED_ACC; pm.dashCd *= T.SPEED_DASH_CD; pm.dashMul *= T.SPEED_DASH; } },
  },
};
