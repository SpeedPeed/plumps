import { T } from '../tuning.js';

export default {
  id: 'eis', name: 'Eisbahn', desc: 'Kaum Reibung. Bremsen ist was für Feiglinge.',
  perk: 'Wer wählt, hat Spikes und rutscht nicht.', perkFor: 'picker',
  fits: (mode, map) => !map.moving,
  globalMods(g, gm) { gm.fric = T.EIS_FRIC; },
  playerMods(g, p, pm) { if (g.isPicker(p)) pm.fric = Math.max(pm.fric, T.EIS_PICKER_FRIC); },
};
