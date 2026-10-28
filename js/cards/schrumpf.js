import { T } from '../tuning.js';

export default {
  id: 'schrumpf', name: 'Schrumpf-Insel', emoji: '🫠', desc: 'Die Insel schrumpft sofort und schnell.',
  fits: (mode) => mode === 'klassik' || mode === 'leben',
  globalMods(g, gm) { gm.shrinkStart = T.SCHRUMPF_START; gm.shrinkRate = T.SCHRUMPF_RATE; },
};
