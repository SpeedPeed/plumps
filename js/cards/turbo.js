import { T } from '../tuning.js';

export default {
  id: 'turbo', name: 'Turbo-Dash', emoji: '⚡', desc: 'Dash lädt fast sofort nach.',
  globalMods(g, gm) { gm.dashCd = T.TURBO_DASH_CD; },
};
