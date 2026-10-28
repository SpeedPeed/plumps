import { T } from '../tuning.js';

export default {
  id: 'flummi', name: 'Flummi', desc: 'Jeder Zusammenstoß katapultiert.',
  globalMods(g, gm) { gm.restitution = T.FLUMMI_RESTITUTION; },
};
