import { T } from '../tuning.js';

export default {
  id: 'wind', name: 'Sturmflut', desc: 'Ein drehender Sturm schiebt alle herum.',
  perk: 'Wer wählt, steht im Windschatten.', perkFor: 'picker',
  fits: (mode, map) => !map.moving,
  force(g, p) {
    if (g.isPicker(p)) return [0, 0];
    const a = g.t * T.WIND_TURN;
    return [Math.cos(a) * T.WIND_F, Math.sin(a) * T.WIND_F];
  },
};
