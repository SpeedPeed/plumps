// Team-Plumps: Zwei Teams. Das Team, das zuletzt noch jemanden auf der Insel hat,
// gewinnt – alle im Team bekommen einen Punkt. Nur bei gerader Spielerzahl ab 4.
import { T } from '../tuning.js';

export const TEAMS = [{ name: 'Orange', color: '#E69F00' }, { name: 'Blau', color: '#0072B2' }];
const teamOf = (g, id) => g.ms.team?.[id];

export default {
  id: 'team', name: 'Team-Plumps',
  desc: 'Zwei Teams. Wer zuletzt noch jemanden auf der Insel hat, gewinnt – das ganze Team punktet.',
  weight: 1,
  fits: (g) => g.players.size >= 4 && g.players.size % 2 === 0,
  shrinkStart: () => T.KLASSIK_SHRINK,

  // Ausgeglichene Teams: nach Punkten sortiert im Schlangen-Verfahren (A B B A A B …)
  setup(g) {
    const list = [...g.players.values()].sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
    g.ms.team = {};
    list.forEach((p, i) => { g.ms.team[p.id] = [0, 1, 1, 0][i % 4]; });
  },

  // Teams starten auf gegenüberliegenden Seiten
  afterLayout(g) {
    const placed = [];
    for (const p of g.players.values()) {
      const side = teamOf(g, p.id) ? 1 : -1;
      let s = null;
      for (let i = 0; i < 40 && !s; i++) { const c = g.safeSpot(T.SPAWN_MARGIN, placed); if (c.x * side > 20) s = c; }
      s ||= g.safeSpot(T.SPAWN_MARGIN, placed);
      placed.push(s);
      g.spawnAt(p, s);
    }
  },

  sameTeam: (g, a, b) => teamOf(g, a) != null && teamOf(g, a) === teamOf(g, b),

  onFall(g, p) { g.elimOrder.push(p.id); },
  contenders: (g, all) => all.filter(p => p.state === 'alive'),

  checkEnd(g, all, dt) {
    const alive = all.filter(p => p.state === 'alive');
    const teams = new Set(alive.map(p => teamOf(g, p.id)));
    if (teams.size > 1) return null;
    g.endDelay += dt;
    if (g.endDelay <= T.END_DELAY) return null;
    if (!alive.length) return { winner: null };
    const t = teamOf(g, alive[0].id);
    return { winner: alive[0], mates: all.filter(p => teamOf(g, p.id) === t), label: `Team ${TEAMS[t].name} gewinnt die Runde!` };
  },

  botGoal(g, p, ctx) {
    const foes = [...g.players.values()].filter(q => q.state === 'alive' && teamOf(g, q.id) !== teamOf(g, p.id));
    ctx.goal = ctx.nearest(foes) || ctx.foe;
  },

  snapshot(g, s) { s.te = g.ms.team; },
  hudMetric: (p, s) => (s.te && s.te[p.id] != null ? `<i class="teamdot" style="background:${TEAMS[s.te[p.id]].color}"></i>` : ''),
};
