// Hügelkönig: Allein im wandernden Kreis stehen füllt den Balken.
import { T } from '../tuning.js';
import { onGround } from '../geometry.js';

const r1 = (v) => Math.round(v * 10) / 10;

function moveZone(g) {
  const old = g.ms.zone;
  const s = g.safeSpot(T.HUEGEL_ZONE_R, old ? [old] : []);
  g.ms.zone = { x: s.x, y: s.y, r: T.HUEGEL_ZONE_R, t: T.HUEGEL_MOVE, owner: null };
}

export default {
  id: 'huegel', name: 'Hügelkönig',
  desc: 'Steh ALLEIN im leuchtenden Kreis, bis dein Balken voll ist.',
  weight: 1,
  time: () => T.HUEGEL_TIME,
  canRespawn: () => true,

  setup(g) { moveZone(g); },
  carryables: (g) => (g.ms.zone ? [g.ms.zone] : []),

  step(g, dt, alive) {
    const z = g.ms.zone;
    z.t -= dt;
    if (z.t <= 0 || !onGround(g.shapes, g.holes, z.x, z.y, 20)) { moveZone(g); g.emit({ k: 'zone' }); }
    const zone = g.ms.zone;
    const inside = alive.filter(p => Math.hypot(p.x - zone.x, p.y - zone.y) < zone.r);
    zone.owner = inside.length === 1 ? inside[0].id : inside.length > 1 ? 'contested' : null;
    if (inside.length === 1) inside[0].m = Math.min(1, inside[0].m + dt / T.HUEGEL_FILL);
  },

  checkEnd(g, all) {
    const w = all.find(p => p.m >= 1);
    return w ? { winner: w } : null;
  },

  score: (g, p) => p.m,

  botGoal(g, p, ctx) {
    const z = g.ms.zone;
    if (!z) return;
    const inZone = Math.hypot(p.x - z.x, p.y - z.y) < z.r - 15;
    const foe = ctx.foe;
    ctx.goal = inZone ? (foe && Math.hypot(foe.x - z.x, foe.y - z.y) < z.r + 30 ? foe : null) : z;
    ctx.attack = inZone;
  },

  snapshot(g, s) {
    const z = g.ms.zone;
    s.zn = z ? [r1(z.x), r1(z.y), z.r, z.owner || null] : null;
  },

  hudMetric: (p) => `<span class="bar"><i style="width:${Math.round(p.m * 100)}%"></i></span>`,
};
