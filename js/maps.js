// Inselkarten. Eine Insel ist eine Vereinigung aus Kreisen und (gedrehten) Rechtecken,
// minus Löcher. Karten können sich drehen oder Teile im Kreis fahren lassen.

const TAU = Math.PI * 2;
const ring = (n, dist, r, extra = {}) => Array.from({ length: n }, (_, i) => ({ k: 'c', x: Math.cos(i / n * TAU) * dist, y: Math.sin(i / n * TAU) * dist, r, ...extra }));

export const MAPS = {
  rund:      { name: 'Rundinsel',      emoji: '🏝️', shapes: [{ k: 'c', x: 0, y: 0, r: 300 }] },
  quadrat:   { name: 'Kistenland',     emoji: '📦', shapes: [{ k: 'r', x: 0, y: 0, w: 470, h: 470 }] },
  kreuz:     { name: 'Drehkreuz',      emoji: '✳️', moving: true, angle: (t) => t * 0.25,
               shapes: [{ k: 'r', x: 0, y: 0, w: 600, h: 200 }, { k: 'r', x: 0, y: 0, w: 200, h: 600 }, { k: 'c', x: 0, y: 0, r: 160 }] },
  bruecke:   { name: 'Brückeninseln',  emoji: '🌉', shapes: [{ k: 'c', x: -185, y: 0, r: 140 }, { k: 'c', x: 185, y: 0, r: 140 }, { k: 'r', x: 0, y: 0, w: 300, h: 100 }] },
  archipel:  { name: 'Archipel',       emoji: '🏖️', shapes: [{ k: 'c', x: 0, y: 0, r: 150 }, ...ring(6, 205, 100)] },
  ring:      { name: 'Ringinsel',      emoji: '⭕', shapes: [{ k: 'c', x: 0, y: 0, r: 300 }], holes: [{ x: 0, y: 0, r: 130 }] },
  karussell: { name: 'Karussell',      emoji: '🎠', moving: true,
               shapes: [{ k: 'c', x: 0, y: 0, r: 170 }, ...[0, 1, 2].map(i => ({ k: 'c', r: 100, orbit: { r: 220, s: 0.35, ph: i * TAU / 3 } }))] },
  stern:     { name: 'Seestern',       emoji: '⭐', shapes: [{ k: 'c', x: 0, y: 0, r: 150 },
               ...[0, 1, 2, 3, 4].map(i => { const a = i / 5 * TAU - Math.PI / 2; return { k: 'r', x: Math.cos(a) * 180, y: Math.sin(a) * 180, w: 250, h: 130, a }; })] },
  knolle:    { name: 'Kartoffelinsel', emoji: '🥔', shapes: [{ k: 'c', x: 0, y: 0, r: 190 }, { k: 'c', x: 120, y: -110, r: 140 }, { k: 'c', x: -140, y: 90, r: 130 }, { k: 'c', x: 60, y: 150, r: 110 }, { k: 'c', x: -120, y: -150, r: 100 }] },
  wippe:     { name: 'Wippe',          emoji: '⚖️', moving: true, angle: (t) => Math.sin(t * 0.7) * 0.8, shapes: [{ k: 'r', x: 0, y: 0, w: 600, h: 240 }] },
};
export const MAP_IDS = Object.keys(MAPS);

// Absolute Lage aller Formen zum Zeitpunkt t, skaliert mit k (Schrumpfen)
export function poseShapes(map, t, k) {
  const A = map.angle ? map.angle(t) : 0;
  const c = Math.cos(A), s = Math.sin(A);
  return map.shapes.map((sh) => {
    let x = sh.x || 0, y = sh.y || 0;
    if (sh.orbit) { const a = sh.orbit.ph + sh.orbit.s * t; x = Math.cos(a) * sh.orbit.r; y = Math.sin(a) * sh.orbit.r; }
    const X = (x * c - y * s) * k, Y = (x * s + y * c) * k;
    const a = (sh.a || 0) + A;
    return sh.k === 'c' ? { k: 'c', x: X, y: Y, a, r: sh.r * k } : { k: 'r', x: X, y: Y, a, w: sh.w * k, h: sh.h * k };
  });
}

export function toLocal(sh, x, y) {
  const dx = x - sh.x, dy = y - sh.y, c = Math.cos(-sh.a), s = Math.sin(-sh.a);
  return [dx * c - dy * s, dx * s + dy * c];
}

export function fromLocal(sh, lx, ly) {
  const c = Math.cos(sh.a), s = Math.sin(sh.a);
  return [sh.x + lx * c - ly * s, sh.y + lx * s + ly * c];
}

export function insideShape(sh, x, y, margin = 0) {
  if (sh.k === 'c') return Math.hypot(x - sh.x, y - sh.y) <= sh.r - margin;
  const [lx, ly] = toLocal(sh, x, y);
  return Math.abs(lx) <= sh.w / 2 - margin && Math.abs(ly) <= sh.h / 2 - margin;
}

export function shapeIndexAt(shapes, x, y) {
  for (let i = 0; i < shapes.length; i++) if (insideShape(shapes[i], x, y)) return i;
  return -1;
}

export function onGround(shapes, holes, x, y, margin = 0) {
  for (const h of holes) if (Math.hypot(x - h.x, y - h.y) < h.r + margin) return false;
  for (const sh of shapes) if (insideShape(sh, x, y, margin)) return true;
  return false;
}

// Kompakte Form fürs Netzwerk: [art, x, y, winkel, r|w, h]
const r1 = (v) => Math.round(v * 10) / 10;
export const packShapes = (shapes) => shapes.map(s => (s.k === 'c' ? [0, r1(s.x), r1(s.y), r1(s.a * 100) / 100, r1(s.r)] : [1, r1(s.x), r1(s.y), Math.round(s.a * 1000) / 1000, r1(s.w), r1(s.h)]));
export const unpackShapes = (arr) => arr.map(a => (a[0] === 0 ? { k: 'c', x: a[1], y: a[2], a: a[3], r: a[4] } : { k: 'r', x: a[1], y: a[2], a: a[3], w: a[4], h: a[5] }));
