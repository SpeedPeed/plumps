import { T } from '../tuning.js';

export default {
  id: 'bomb', name: 'Bombe', emoji: '💣', desc: 'Du hast eine Bombe fallen lassen. LAUF!',
  apply(g, p) { g.dropBomb(p.x, p.y, T.BOMB_FUSE, p.id); },
};
