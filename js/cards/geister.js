import { T } from '../tuning.js';

export default {
  id: 'geister', name: 'Geisterstunde', desc: 'Geister pupsen öfter und stärker.',
  perk: 'Geister pusten die Krone doppelt so weit.', perkFor: 'leader',
  fits: (mode) => mode === 'klassik' || mode === 'leben',
  playerMods(g, p, pm) { if (g.isLeader(p)) pm.takePups *= T.GEISTER_LEADER; },
  globalMods(g, gm) { gm.pupsCd = T.GEISTER_PUPS_CD; gm.pupsR = T.PUPS_R * T.GEISTER_PUPS_R; },
};
