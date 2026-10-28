import { T } from '../tuning.js';

// Enthält die frühere Karte „Flummi“: Bumper und federnde Zusammenstöße
export default {
  id: 'flipper', name: 'Flipper', desc: 'Bumper auf der Insel, jeder Stoß federt. Ding ding ding!',
  perk: 'Wer wählt, ist schwer und prallt kaum ab.', perkFor: 'picker',
  globalMods(g, gm) { gm.restitution = T.FLUMMI_RESTITUTION; },
  playerMods(g, p, pm) { if (g.isPicker(p)) pm.mass *= T.FLIPPER_MASS; },
  setup(g) {
    for (let i = 0; i < 3; i++) {
      const s = g.safeSpot(60, g.bumpers);
      g.bumpers.push({ x: s.x, y: s.y, r: T.BUMPER_R });
    }
  },
};
