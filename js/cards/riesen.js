import { T } from '../tuning.js';

// Früher zwei Karten (Riesenblobs, Mini-Blobs) – jetzt eine mit Ansage
export default {
  id: 'riesen', name: 'Riese & Zwerg', desc: 'Einer wird riesig, einer winzig.',
  perk: 'Wer wählt, wird riesig – die Krone winzig.', perkFor: 'leader',
  playerMods(g, p, pm) {
    if (g.isPicker(p)) { pm.size *= T.RIESE_SIZE; pm.acc *= T.RIESE_ACC; }
    else if (g.isLeader(p)) { pm.size *= T.ZWERG_SIZE; pm.acc *= T.ZWERG_ACC; }
  },
};
