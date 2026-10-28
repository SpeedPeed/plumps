import { T } from '../tuning.js';

export default {
  id: 'riesen', name: 'Riesenblobs', emoji: '🐘', desc: 'Alle sind fett. Wirklich fett.',
  globalMods(g, gm) { gm.sizeMul *= T.RIESEN_SIZE; gm.accMul *= T.RIESEN_ACC; },
};
