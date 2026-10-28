import { T } from '../tuning.js';

// Enthält die frühere Karte „Turbo-Dash“ – jetzt nur für den Wählenden
export default {
  id: 'zeitlupe', name: 'Zeitlupe', desc: 'Alles läuft in Zeitlupe. Dramatisch.',
  perk: 'Wer wählt, ist flinker und hat einen Turbo-Dash.', perkFor: 'picker',
  globalMods(g, gm) { gm.dtScale = T.ZEITLUPE; },
  playerMods(g, p, pm) { if (g.isPicker(p)) { pm.dashCd = Math.min(pm.dashCd, T.TURBO_DASH_CD); pm.acc *= T.ZEITLUPE_PICKER_ACC; } },
};
