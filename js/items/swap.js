import { onGround } from '../geometry.js';

// Wie weit ist es bis zur Kante?
const margin = (g, p) => { let m = 0; while (m < 300 && onGround(g.shapes, g.holes, p.x, p.y, m + 10)) m += 10; return m; };

export default {
  id: 'swap', name: 'Tauschticket', desc: 'Du tauschst den Platz mit dem, der am sichersten steht!',
  apply(g, p, alive) {
    const others = alive.filter(q => q !== p && q.state === 'alive');
    if (!others.length) return;
    const q = others.reduce((a, o) => (margin(g, o) > margin(g, a) ? o : a), others[0]);
    [p.x, q.x] = [q.x, p.x];
    [p.y, q.y] = [q.y, p.y];
    g.emit({ k: 'swap' });
  },
};
