// Glibber-Fangen: Wer den Glibber hat, gibt ihn durch Rempeln weiter.
// Wer ihn am kürzesten hatte, gewinnt.
import { T } from '../tuning.js';
import { iconHTML } from '../art/icons.js';

function passTag(g, id) {
  g.ms.tagger = id;
  g.ms.immune = g.t + T.FANGEN_IMMUNE;
  g.emit({ k: 'tag', id });
}

export default {
  id: 'fangen', name: 'Glibber-Fangen',
  desc: 'Wer den Glibber hat, gibt ihn durch Rempeln weiter. Wer ihn am kürzesten hatte, gewinnt.',
  weight: 1,
  time: () => T.FANGEN_TIME,
  canRespawn: () => true,
  tieRandom: true,

  afterLayout(g) {
    const all = [...g.players.values()];
    g.ms.tagger = all.length ? g.rng.pick(all).id : null;
    g.ms.immune = 0;
  },

  onRemove(g, id) { if (g.ms.tagger === id) g.ms.tagger = null; },

  playerMods(g, p, pm) { if (g.ms.tagger === p.id) pm.acc *= T.FANGEN_ACC; },

  onCollide(g, a, b) {
    if (g.t <= g.ms.immune) return;
    if (g.ms.tagger === a.id) passTag(g, b.id);
    else if (g.ms.tagger === b.id) passTag(g, a.id);
  },

  step(g, dt, alive) {
    if (!g.ms.tagger || !g.players.has(g.ms.tagger)) {
      if (alive.length) passTag(g, g.rng.pick(alive).id);
    }
    const t = g.players.get(g.ms.tagger);
    if (t) t.m += dt;
  },

  score: (g, p) => -p.m,

  botGoal(g, p, ctx) {
    if (g.ms.tagger === p.id) { ctx.goal = ctx.foe; return; }
    const t = g.players.get(g.ms.tagger);
    if (t && t.state === 'alive') ctx.flee = t;
    else ctx.goal = ctx.foe;
  },

  snapshot(g, s) { s.ig = g.ms.tagger || null; },

  hudMetric: (p) => `${iconHTML('glibber')}${p.m.toFixed(1)}s`,
};
