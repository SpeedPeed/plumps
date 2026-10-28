import { T } from '../tuning.js';

export default {
  id: 'mini', name: 'Mini-Blobs', desc: 'Winzig, flink und leicht wegzuschubsen.',
  globalMods(g, gm) { gm.sizeMul *= T.MINI_SIZE; gm.accMul *= T.MINI_ACC; },
};
