// Letzter Blob: Wer als Letzter auf der Insel steht, gewinnt. Rausgeflogene werden Geister.
import { T } from '../tuning.js';

export default {
  id: 'klassik', name: 'Letzter Blob', emoji: '🏝️',
  desc: 'Wer als Letzter auf der Insel steht, gewinnt die Runde.',
  weight: 2,
  shrinkStart: () => T.KLASSIK_SHRINK,

  onFall(g, p) { g.elimOrder.push(p.id); },

  checkEnd(g, all, dt) {
    const inGame = all.filter(p => p.state === 'alive');
    if (inGame.length > 1) return null;
    g.endDelay += dt;
    if (g.endDelay <= T.END_DELAY) return null;
    return { winner: inGame[0] || null };
  },

  hudMetric: () => '',
};
