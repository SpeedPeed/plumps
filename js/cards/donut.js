import { T } from '../tuning.js';

export default {
  id: 'donut', name: 'Donut', desc: 'In die Mitte wird ein Loch gestanzt.',
  perk: 'Die Krone startet direkt am Loch.', perkFor: 'leader',
  // Nur auf Inseln, deren Mitte massiv ist
  fits: (mode, map) => !map.holes && map.id !== 'archipel' && map.id !== 'karussell',
  setup(g) { g.holes.push({ x: 0, y: 0, r: T.DONUT_R }); },
  afterLayout(g) {
    for (const p of g.players.values()) {
      if (!g.isLeader(p) || p.state !== 'alive') continue;
      const a = g.rng.range(0, Math.PI * 2), d = T.DONUT_R + p.r + 18;
      g.spawnAt(p, { x: Math.cos(a) * d, y: Math.sin(a) * d });
    }
  },
};
