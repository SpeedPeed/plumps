import { T } from '../tuning.js';

export default {
  id: 'donut', name: 'Donut', emoji: '🍩', desc: 'In die Mitte wird ein Loch gestanzt.',
  // Nur auf Inseln, deren Mitte massiv ist
  fits: (mode, map) => !map.holes && map.id !== 'archipel' && map.id !== 'karussell',
  setup(g) { g.holes.push({ x: 0, y: 0, r: T.DONUT_R }); },
};
