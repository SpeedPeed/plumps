import { T } from '../tuning.js';

export default {
  id: 'magnet', name: 'Magnetfeld', desc: 'Alle Blobs ziehen sich an.',
  perk: 'Die Krone zieht alle an. Viel Spaß im Gedränge!', perkFor: 'leader',
  force(g, p, alive) {
    let ax = 0, ay = 0;
    const leaders = alive.filter(q => g.isLeader(q));
    // Ohne Führenden ziehen sich alle gegenseitig an
    const magnets = leaders.length ? leaders : alive;
    for (const q of magnets) {
      if (q === p) continue;
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
      const f = Math.min(900, 90000 / d) * T.MAGNET_F * (leaders.length ? T.MAGNET_LEADER : 1);
      ax += dx / d * f; ay += dy / d * f;
    }
    return [ax, ay];
  },
};
