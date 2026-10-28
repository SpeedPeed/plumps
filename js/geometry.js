// Geometrie der Inseln: Eine Insel ist eine Vereinigung aus Kreisen und
// (gedrehten) Rechtecken, minus Löcher. Die Inseln selbst stehen in js/maps/.

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
