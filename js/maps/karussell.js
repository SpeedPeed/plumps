// Süßigkeiten-Karussell: Die äußeren Inseln drehen regelmäßig auf –
// dann zieht die Fliehkraft alle nach außen.
import { T } from '../tuning.js';
import { spinPhase, announceSpin } from './hazards.js';

const TAU = Math.PI * 2;
const PLAN = { calm: T.SPIN_CALM, warn: T.HZ_WARN, fast: T.SPIN_FAST };
const S = 0.35;

// Verzerrte Zeit: im Turbo läuft das Karussell KARUSSELL_TURBO-mal so schnell
function warp(t) {
  const per = PLAN.calm + PLAN.warn + PLAN.fast;
  const full = Math.floor(t / per), u = t - full * per;
  const slow = PLAN.calm + PLAN.warn;
  return full * (slow + PLAN.fast * T.KARUSSELL_TURBO) + Math.min(u, slow) + Math.max(0, u - slow) * T.KARUSSELL_TURBO;
}

export default {
  id: 'karussell', name: 'Karussell', moving: true,
  hint: 'Blinken die Pfeile, dreht das Karussell auf. Außen fliegt man leichter runter!',
  warp,
  shapes: [
    { k: 'c', x: 0, y: 0, r: 170 },
    ...[0, 1, 2].map(i => ({ k: 'c', r: 100, orbit: { r: 220, s: S, ph: i * TAU / 3 } })),
  ],
  step(g, dt, alive) {
    const sp = spinPhase(g.t, PLAN);
    announceSpin(g, sp, 'spin');
    // Fliehkraft auf den äußeren Inseln: a = ω² · r
    const w = S * (sp.ph === 'fast' ? T.KARUSSELL_TURBO : 1);
    const a = w * w * 220 * T.FLIEH;
    for (const p of alive) {
      const d = Math.hypot(p.x, p.y);
      if (d < 170 || d < 1) continue;
      p.vx += p.x / d * a * dt; p.vy += p.y / d * a * dt;
    }
  },
  snapshot(g) { const sp = spinPhase(g.t, PLAN); return { sp: sp.ph === 'calm' ? 0 : sp.ph === 'warn' ? 1 : 2, dir: 1 }; },
};
