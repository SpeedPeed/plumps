import { T } from '../tuning.js';

export default {
  id: 'geschenk', name: 'Bescherung', desc: 'Power-ups regnen im Sekundentakt.',
  globalMods(g, gm) { gm.itemEvery = [T.GESCHENK_MIN, T.GESCHENK_MAX]; gm.itemMax = T.GESCHENK_MAX_ITEMS; },
};
