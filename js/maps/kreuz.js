// Schrottplatz: Das Drehkreuz dreht regelmäßig kurz schnell rückwärts – mit Warnung.
import { T } from '../tuning.js';
import { spinPhase, announceSpin } from './hazards.js';

const PLAN = { calm: T.SPIN_CALM, warn: T.HZ_WARN, fast: T.SPIN_FAST };
const W0 = 0.25, W1 = -0.75;

// Winkel = Integral der Drehgeschwindigkeit über den Zeitplan
function angle(t) {
  const per = PLAN.calm + PLAN.warn + PLAN.fast;
  const full = Math.floor(t / per), u = t - full * per;
  const perTurn = (PLAN.calm + PLAN.warn) * W0 + PLAN.fast * W1;
  const calmPart = Math.min(u, PLAN.calm + PLAN.warn) * W0;
  const fastPart = Math.max(0, u - PLAN.calm - PLAN.warn) * W1;
  return full * perTurn + calmPart + fastPart;
}

export default {
  id: 'kreuz', name: 'Drehkreuz', moving: true,
  hint: 'Blinken die Pfeile, dreht das Kreuz gleich schnell rückwärts. Festhalten!',
  angle,
  shapes: [{ k: 'r', x: 0, y: 0, w: 600, h: 200 }, { k: 'r', x: 0, y: 0, w: 200, h: 600 }, { k: 'c', x: 0, y: 0, r: 160 }],
  step(g) { announceSpin(g, spinPhase(g.t, PLAN), 'spin'); },
  snapshot(g) { const sp = spinPhase(g.t, PLAN); return { sp: sp.ph === 'calm' ? 0 : sp.ph === 'warn' ? 1 : 2, dir: -1 }; },
};
