import { T } from '../tuning.js';

export default {
  id: 'wackel', name: 'Wackelpudding', emoji: '🍮', desc: 'Alle schwabbeln unkontrolliert durch die Gegend.',
  fits: (mode, map) => !map.moving,
  input: (g, p, inp) => ({
    mx: inp.mx + Math.sin(g.t * 3 + p.ci * 2) * T.WACKEL,
    my: inp.my + Math.cos(g.t * 2.3 + p.ci) * T.WACKEL,
  }),
};
