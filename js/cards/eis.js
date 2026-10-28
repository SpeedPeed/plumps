import { T } from '../tuning.js';

export default {
  id: 'eis', name: 'Eisbahn', desc: 'Kaum Reibung. Bremsen ist was für Feiglinge.',
  fits: (mode, map) => !map.moving,
  globalMods(g, gm) { gm.fric = T.EIS_FRIC; },
};
