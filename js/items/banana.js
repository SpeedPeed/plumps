import { T } from '../tuning.js';

export default {
  id: 'banana', name: 'Bananen', emoji: '🍌', desc: 'Du lässt Bananenschalen fallen.',
  apply(g, p) { p.pw.banana = T.BANANA_DROP_TIME; p.bananaT = 0; },
  effects: {
    // Solange der Effekt läuft, fallen hinter dem Blob Schalen auf den Boden
    banana: {
      step(g, p, dt) {
        p.bananaT -= dt;
        if (p.bananaT > 0 || g.bananas.length >= T.BANANA_MAX) return;
        p.bananaT = T.BANANA_DROP_EVERY;
        g.bananas.push({ x: p.x - p.fx * (p.r + 14), y: p.y - p.fy * (p.r + 14), owner: p.id, t: T.BANANA_LIFE, born: g.t });
      },
    },
    // Wer auf eine Schale tritt, rutscht unkontrolliert
    slip: { mods(g, p, pm) { pm.acc *= T.SLIP_ACC; pm.fric = T.SLIP_FRIC; } },
  },
};
