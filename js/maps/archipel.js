// Sandbank: Immer wieder versinkt eine der kleinen Inseln für ein paar Sekunden.
import { T } from '../tuning.js';
import { sinkCycle } from './hazards.js';

const TAU = Math.PI * 2;
const ring = (n, dist, r) => Array.from({ length: n }, (_, i) => ({ k: 'c', x: Math.cos(i / n * TAU) * dist, y: Math.sin(i / n * TAU) * dist, r }));

export default {
  id: 'archipel', name: 'Archipel',
  hint: 'Blubbert eine Sandbank, geht sie gleich unter. Rüberhüpfen!',
  shapes: [{ k: 'c', x: 0, y: 0, r: 150 }, ...ring(6, 205, 100)],
  // Am liebsten die Sandbank, auf der gerade jemand steht
  step(g, dt) { sinkCycle(g, dt, { pick: pickBusy(1, 7), every: T.SINK_EVERY, first: [6, 9] }); },
};

// Index einer Form zwischen from und to (exklusiv), bevorzugt eine mit Spielern drauf
export function pickBusy(from, to) {
  return (g) => {
    const idx = Array.from({ length: to - from }, (_, i) => from + i).filter(i => !(i in g.shapeMul));
    if (!idx.length) return null;
    const alive = [...g.players.values()].filter(p => p.state === 'alive');
    const busy = idx.filter(i => alive.some(p => Math.hypot(p.x - g.shapes[i].x, p.y - g.shapes[i].y) < 110));
    return g.rng.pick(busy.length && g.rng.next() < 0.7 ? busy : idx);
  };
}
