import { T } from '../tuning.js';

export default {
  id: 'speed', name: 'Turboschuhe', desc: '7 s lang schneller und mehr Dashes.',
  apply(g, p) { p.pw.speed = T.SPEED_TIME; },
  effects: {
    speed: { mods(g, p, pm) { pm.acc *= T.SPEED_ACC; pm.dashCd *= T.SPEED_DASH_CD; } },
  },
};
