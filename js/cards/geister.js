import { T } from '../tuning.js';

export default {
  id: 'geister', name: 'Geisterstunde', desc: 'Geister pupsen öfter und stärker.',
  fits: (mode) => mode === 'klassik' || mode === 'leben',
  globalMods(g, gm) { gm.pupsCd = T.GEISTER_PUPS_CD; gm.pupsR = T.PUPS_R * T.GEISTER_PUPS_R; },
};
