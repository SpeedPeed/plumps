import { T } from '../tuning.js';

export default {
  id: 'magnet', name: 'Magnetfeld', emoji: '🧲', desc: 'Alle Blobs ziehen sich gegenseitig an.',
  force(g, p, alive) {
    let ax = 0, ay = 0;
    for (const q of alive) {
      if (q === p) continue;
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
      const f = Math.min(900, 90000 / d) * T.MAGNET_F;
      ax += dx / d * f; ay += dy / d * f;
    }
    return [ax, ay];
  },
};
