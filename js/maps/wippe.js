// Holzfloß: Das Floß kippelt – alle rutschen langsam zum tiefen Ende.
// Pfeile auf dem Floß zeigen, wohin es gerade geht.
import { T } from '../tuning.js';

const slope = (t) => Math.cos(t * 0.7);

export default {
  id: 'wippe', name: 'Wippe', moving: true,
  hint: 'Das Floß kippelt: Die Pfeile zeigen, wohin alle rutschen.',
  angle: (t) => Math.sin(t * 0.7) * 0.8,
  shapes: [{ k: 'r', x: 0, y: 0, w: 600, h: 240 }],
  step(g, dt, alive) {
    const a = g.shapes[0].a, s = slope(g.t) * T.WIPPE_F;
    const ax = Math.cos(a) * s, ay = Math.sin(a) * s;
    for (const p of alive) { p.vx += ax * dt; p.vy += ay * dt; }
  },
  snapshot(g) { return { sl: Math.round(slope(g.t) * 100) / 100 }; },
};
