// Konterkönig: Punkte gibt es nur für Konter (+2) und Durchbrüche (+1), Rausfallen kostet einen.
// Dashes sind extra stark – wer nicht stemmt, fliegt.
import { T } from '../tuning.js';
import { iconHTML } from '../art/icons.js';

export default {
  id: 'konter', name: 'Konterkönig',
  desc: 'Konter +2, Durchbruch +1, Rausfallen −1. Dashes sind extra stark – stemm im richtigen Moment!',
  weight: 1,
  time: () => T.KONTER_TIME,
  canRespawn: () => true,
  botBrace: T.KONTER_BOT_BRACE,

  playerMods(g, p, pm) { pm.dashMul *= T.KONTER_DASH; },

  onCounter(g, p) { p.m += 2; g.emit({ k: 'points', id: p.id, n: 2 }); },
  onBreak(g, p) { p.m += 1; g.emit({ k: 'points', id: p.id, n: 1 }); },
  onFall(g, p) { p.m -= 1; g.emit({ k: 'points', id: p.id, n: -1 }); },

  score: (g, p) => p.m,

  hudMetric: (p) => `${iconHTML('konter')}${Math.round(p.m)}`,
};
