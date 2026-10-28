import { T } from '../tuning.js';

export default {
  id: 'zeitlupe', name: 'Zeitlupe', emoji: '🐌', desc: 'Alles läuft in Zeitlupe. Dramatisch.',
  globalMods(g, gm) { gm.dtScale = T.ZEITLUPE; },
};
