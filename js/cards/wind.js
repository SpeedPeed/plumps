import { T } from '../tuning.js';

export default {
  id: 'wind', name: 'Sturmflut', desc: 'Ein drehender Sturm schiebt alle herum.',
  fits: (mode, map) => !map.moving,
  force(g) {
    const a = g.t * T.WIND_TURN;
    return [Math.cos(a) * T.WIND_F, Math.sin(a) * T.WIND_F];
  },
};
