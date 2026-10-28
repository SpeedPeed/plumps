import { T } from '../tuning.js';

// Die Unsichtbarkeit selbst passiert nur in der Darstellung (js/render.js)
export default {
  id: 'invis', name: 'Tarnkappe', desc: '5 s lang fast unsichtbar und etwas flinker. Beim Dash blitzt du auf.',
  apply(g, p) { p.pw.invis = T.INVIS_TIME; },
  effects: { invis: { mods(g, p, pm) { pm.acc *= T.INVIS_ACC; } } },
};
