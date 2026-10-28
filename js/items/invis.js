import { T } from '../tuning.js';

// Die Unsichtbarkeit selbst passiert nur in der Darstellung (js/render.js)
export default {
  id: 'invis', name: 'Tarnkappe', desc: '5 s lang unsichtbar.',
  apply(g, p) { p.pw.invis = T.INVIS_TIME; },
  effects: { invis: {} },
};
