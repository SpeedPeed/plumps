import { T } from '../tuning.js';

export default {
  id: 'geschenk', name: 'Bescherung', desc: 'Power-ups regnen im Sekundentakt.',
  perk: 'Die Krone kann keine Power-ups aufheben.', perkFor: 'leader',
  canPick: (g, p) => !g.isLeader(p),
  globalMods(g, gm) { gm.itemEvery = [T.GESCHENK_MIN, T.GESCHENK_MAX]; gm.itemMax = T.GESCHENK_MAX_ITEMS; },
};
