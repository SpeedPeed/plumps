import { T } from '../tuning.js';

export default {
  id: 'schrumpf', name: 'Schrumpf-Insel', desc: 'Die Insel schrumpft sofort und schnell.',
  perk: 'Wer wählt, startet mit Anker.', perkFor: 'picker',
  fits: (mode) => mode === 'klassik' || mode === 'leben',
  setup(g) { const p = g.players.get(g.cardOwner); if (p) p.pw.anchor = T.SCHRUMPF_ANCHOR; },
  globalMods(g, gm) { gm.shrinkStart = T.SCHRUMPF_START; gm.shrinkRate = T.SCHRUMPF_RATE; },
};
