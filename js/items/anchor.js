import { T } from '../tuning.js';

export default {
  id: 'anchor', name: 'Anker', emoji: '⚓', desc: '6 s lang bist du kaum wegzuschubsen.',
  apply(g, p) { p.pw.anchor = T.ANCHOR_TIME; },
  effects: {
    anchor: {
      mods(g, p, pm) {
        pm.mass *= T.ANCHOR_MASS;
        pm.acc *= T.ANCHOR_ACC;
        pm.takeDash *= T.ANCHOR_TAKE_DASH;
        pm.takePups *= T.ANCHOR_TAKE_PUPS;
        pm.takeBlast *= T.ANCHOR_TAKE_BLAST;
      },
    },
  },
};
