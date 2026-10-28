import { T } from '../tuning.js';

export default {
  id: 'zeitlupe', name: 'Zeitlupe', desc: 'Alles läuft in Zeitlupe. Dramatisch.',
  globalMods(g, gm) { gm.dtScale = T.ZEITLUPE; },
};
