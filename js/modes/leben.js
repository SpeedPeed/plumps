// Drei Leben: Wer fällt, verliert ein Leben und kommt zurück. Ohne Leben wird man Geist.
import { T } from '../tuning.js';

export default {
  id: 'leben', name: 'Drei Leben', emoji: '❤️',
  desc: 'Jeder hat 3 Leben. Wer am Ende noch welche hat, gewinnt.',
  weight: 1,
  shrinkStart: () => T.LEBEN_SHRINK,

  setup(g) { for (const p of g.players.values()) p.lives = T.LEBEN_LIVES; },

  onFall(g, p) {
    p.lives--;
    if (p.lives <= 0) g.elimOrder.push(p.id);
  },

  canRespawn: (g, p) => p.lives > 0,

  checkEnd(g, all, dt) {
    // Wer noch Leben hat, ist im Spiel – auch während er gerade ins Wasser fällt
    const inGame = all.filter(p => p.lives > 0 && (p.state === 'alive' || p.state === 'falling'));
    if (inGame.length > 1) return null;
    g.endDelay += dt;
    if (g.endDelay <= T.END_DELAY) return null;
    return { winner: inGame[0] || null };
  },

  hudMetric: (p) => (p.lv > 0 ? '❤️'.repeat(p.lv) : '💀'),
};
