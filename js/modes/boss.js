// Boss-Blob: Einer ist riesig und stark, alle anderen müssen ihn gemeinsam ins Wasser
// schubsen. Hält der Boss bis zum Schluss durch, gewinnt er. Wer ihn runterschubst, punktet.
// Boss wird, wer am seltensten Boss war (bei Gleichstand: wer weniger Punkte hat).
import { T } from '../tuning.js';
import { iconHTML } from '../art/icons.js';

export default {
  id: 'boss', name: 'Boss-Blob',
  desc: 'Einer ist der Boss. Alle anderen: zusammen runterschubsen! Hält der Boss durch, gewinnt er.',
  weight: 1,
  fits: (g) => g.players.size >= 3,
  time: () => T.BOSS_TIME,

  setup(g) {
    const list = [...g.players.values()];
    const count = (p) => g.bossCount.get(p.id) || 0;
    const min = Math.min(...list.map(count));
    let cand = list.filter(p => count(p) === min);
    const low = Math.min(...cand.map(p => p.score));
    cand = cand.filter(p => p.score === low);
    const boss = g.rng.pick(cand);
    g.ms.boss = boss.id;
    g.bossCount.set(boss.id, count(boss) + 1);
  },

  onRemove(g, id) { if (g.ms.boss === id) g.ms.boss = null; },

  playerMods(g, p, pm) {
    if (p.id !== g.ms.boss) return;
    // Je mehr Gegner, desto standfester der Boss
    const take = T.BOSS_TAKE * Math.pow(T.BOSS_TAKE_PER, g.startCount - 3);
    pm.size *= T.BOSS_SIZE; pm.acc *= T.BOSS_ACC; pm.dashMul *= T.BOSS_DASH; pm.mass *= T.BOSS_MASS;
    pm.takeDash *= take; pm.takeBlast *= take; pm.takePups *= take; pm.edge *= T.BOSS_EDGE;
  },

  canRespawn: (g, p) => p.id !== g.ms.boss,

  onFall(g, p) { if (p.id === g.ms.boss) g.ms.killer = p.lastHitBy; },

  checkEnd(g, all, dt) {
    const boss = g.players.get(g.ms.boss);
    if (boss && boss.state === 'alive') return null;
    g.endDelay += dt;
    if (g.endDelay <= T.END_DELAY) return null;
    const k = g.players.get(g.ms.killer);
    return { winner: k && k.id !== g.ms.boss ? k : null };
  },

  // Zeit um: Steht der Boss noch, gewinnt er
  score: (g, p) => (p.id === g.ms.boss && p.state === 'alive' ? 1 : 0),

  botGoal(g, p, ctx) {
    const boss = g.players.get(g.ms.boss);
    if (p.id !== g.ms.boss) { if (boss && boss.state === 'alive') ctx.goal = boss; return; }
    // Ein Bot-Boss bleibt lieber in der Mitte und greift nur an, wer ihm zu nahe kommt
    if (ctx.foe && Math.hypot(ctx.foe.x - p.x, ctx.foe.y - p.y) > 150) { const c = g.shapes[0]; ctx.goal = { x: c.x * 0.5, y: c.y * 0.5 }; ctx.attack = false; }
  },

  snapshot(g, s) { s.bo = g.ms.boss || null; },
  hudMetric: (p, s) => (s.bo === p.id ? `${iconHTML('boss')}BOSS` : ''),
};
