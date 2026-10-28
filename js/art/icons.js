// Alle Symbole des Spiels als Vektorgrafik (Stil: docs/STYLE.md).
// Gezeichnet wird in einem Kasten von -50..50; drawIcon skaliert auf die gewünschte Größe.
// Dieselben Zeichnungen landen als Bild (iconURL) auch in der Oberfläche – keine Emojis,
// damit es auf jedem Gerät gleich aussieht.

export const INK = '#2A1B3D';
const TAU = Math.PI * 2;

// ---------- Werkzeuge ----------

function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
function ell(c, x, y, rx, ry, a = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, a, 0, TAU); }
function rrect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function poly(c, pts) { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); }
// füllen und mit Tinte umranden
function fs(c, fill, lw = 6) { c.fillStyle = fill; c.fill(); if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); } }
function st(c, lw = 6, col = INK) { c.lineWidth = lw; c.strokeStyle = col; c.stroke(); }
// weiches Glanzlicht oben links
function shine(c, x, y, rx, ry, a = -0.6) { c.save(); c.globalAlpha = 0.55; ell(c, x, y, rx, ry, a); c.fillStyle = '#fff'; c.fill(); c.restore(); }
function star(c, x, y, r1, r2, n = 5, rot = -Math.PI / 2) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + i * Math.PI / n; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  c.closePath();
}
function eyes(c, x, y, gap, r, look = [0, 0]) {
  for (const s of [-1, 1]) { circ(c, x + s * gap, y, r); fs(c, '#fff', 3); circ(c, x + s * gap + look[0], y + look[1], r * 0.5); c.fillStyle = INK; c.fill(); }
}
function heartPath(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.1, x, y - s * 0.45);
  c.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  c.closePath();
}
function blobBody(c, x, y, r, col) { circ(c, x, y, r); fs(c, col); shine(c, x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.18); }

// ---------- Symbole ----------

const ICONS = {
  // ----- Power-ups -----
  glove(c) {
    rrect(c, -30, 22, 44, 22, 8); fs(c, '#fff');
    c.beginPath(); c.moveTo(-34, 20); c.bezierCurveTo(-46, -10, -30, -44, 4, -42); c.bezierCurveTo(40, -40, 44, 0, 18, 22); c.closePath(); fs(c, '#E8483C');
    ell(c, -26, -2, 12, 16, 0.3); fs(c, '#E8483C');
    shine(c, 0, -26, 16, 8);
    c.beginPath(); c.moveTo(-12, 8); c.quadraticCurveTo(4, 14, 16, 4); st(c, 4);
  },
  anchor(c) {
    circ(c, 0, -34, 9); st(c, 8);
    c.beginPath(); c.moveTo(0, -25); c.lineTo(0, 38); st(c, 10); c.beginPath(); c.moveTo(0, -25); c.lineTo(0, 38); st(c, 5, '#8FA3B8');
    c.beginPath(); c.moveTo(-18, -12); c.lineTo(18, -12); st(c, 9); c.beginPath(); c.moveTo(-18, -12); c.lineTo(18, -12); st(c, 4, '#8FA3B8');
    c.beginPath(); c.moveTo(-34, 10); c.quadraticCurveTo(-30, 40, 0, 40); c.quadraticCurveTo(30, 40, 34, 10); st(c, 10); c.beginPath(); c.moveTo(-34, 10); c.quadraticCurveTo(-30, 40, 0, 40); c.quadraticCurveTo(30, 40, 34, 10); st(c, 5, '#8FA3B8');
    poly(c, [[-40, 4], [-28, 4], [-34, 16]]); fs(c, '#8FA3B8', 4); poly(c, [[40, 4], [28, 4], [34, 16]]); fs(c, '#8FA3B8', 4);
  },
  big(c) {
    rrect(c, -14, -2, 28, 42, 10); fs(c, '#F6E7C8');
    c.beginPath(); c.moveTo(-44, 6); c.bezierCurveTo(-46, -44, 46, -44, 44, 6); c.quadraticCurveTo(0, 14, -44, 6); fs(c, '#E8483C');
    for (const [x, y, r] of [[-22, -12, 7], [6, -24, 8], [26, -6, 6], [-4, -4, 5]]) { circ(c, x, y, r); fs(c, '#fff', 0); }
    shine(c, -20, -24, 10, 5);
  },
  speed(c) {
    for (const y of [-14, 0, 14]) { c.beginPath(); c.moveTo(-48, y); c.lineTo(-30, y); st(c, 5, '#9ED8F5'); }
    c.beginPath(); c.moveTo(-26, 26); c.lineTo(-22, -16); c.quadraticCurveTo(-8, -24, 6, -14); c.lineTo(12, 2); c.quadraticCurveTo(44, 6, 44, 22); c.lineTo(44, 30); c.lineTo(-26, 30); c.closePath(); fs(c, '#3A8FE8');
    rrect(c, -30, 24, 78, 10, 5); fs(c, '#fff', 5);
    c.beginPath(); c.moveTo(-6, -6); c.lineTo(8, -2); c.moveTo(-4, 4); c.lineTo(10, 8); st(c, 4, '#fff');
    shine(c, -10, -12, 8, 4);
  },
  banana(c) {
    c.beginPath(); c.moveTo(-38, -26); c.quadraticCurveTo(-30, 34, 36, 26); c.quadraticCurveTo(40, 30, 34, 36); c.quadraticCurveTo(-46, 44, -46, -22); c.closePath(); fs(c, '#F6D33C');
    c.beginPath(); c.moveTo(-42, -24); c.lineTo(-40, -36); st(c, 7, '#6B4A2A');
    c.beginPath(); c.moveTo(-36, -6); c.quadraticCurveTo(-28, 26, 20, 30); st(c, 3, '#C9A11E');
  },
  bomb(c) {
    circ(c, -4, 8, 32); fs(c, '#3B3552');
    rrect(c, 4, -32, 16, 14, 4); fs(c, '#6E6788');
    c.beginPath(); c.moveTo(14, -32); c.quadraticCurveTo(22, -46, 34, -40); st(c, 5, '#B08A5A');
    star(c, 36, -40, 12, 5, 6); fs(c, '#FFC93C', 3);
    shine(c, -16, -6, 10, 6);
  },
  swap(c) {
    c.lineWidth = 9;
    c.beginPath(); c.arc(0, 0, 30, Math.PI * 1.1, Math.PI * 1.9); st(c, 14); c.beginPath(); c.arc(0, 0, 30, Math.PI * 1.1, Math.PI * 1.9); st(c, 7, '#5ED6A0');
    poly(c, [[34, -24], [40, 2], [16, -6]]); fs(c, '#5ED6A0', 4);
    c.beginPath(); c.arc(0, 0, 30, Math.PI * 0.1, Math.PI * 0.9); st(c, 14); c.beginPath(); c.arc(0, 0, 30, Math.PI * 0.1, Math.PI * 0.9); st(c, 7, '#FF9F43');
    poly(c, [[-34, 24], [-40, -2], [-16, 6]]); fs(c, '#FF9F43', 4);
  },
  invis(c) {
    c.beginPath(); c.moveTo(-40, 30); c.quadraticCurveTo(-10, 18, 6, -44); c.quadraticCurveTo(14, -6, 40, 30); c.closePath();
    c.save(); c.globalAlpha = 0.8; fs(c, '#7A5CC9'); c.restore();
    ell(c, 0, 30, 46, 10); fs(c, '#5E44A8');
    star(c, -4, -2, 8, 3.5); fs(c, '#FFE27A', 0); star(c, 14, 14, 6, 2.5); fs(c, '#FFE27A', 0);
    c.setLineDash([6, 8]); circ(c, 0, 0, 48); st(c, 3, '#A9A3C9'); c.setLineDash([]);
  },

  // ----- Spielmodi -----
  klassik(c) {
    ell(c, 0, 26, 44, 14); fs(c, '#F2D48B');
    ell(c, 0, 22, 36, 10); c.fillStyle = '#7CCB5B'; c.fill();
    c.beginPath(); c.moveTo(-2, 22); c.quadraticCurveTo(-8, -6, 4, -30); st(c, 8, INK); c.beginPath(); c.moveTo(-2, 22); c.quadraticCurveTo(-8, -6, 4, -30); st(c, 4, '#B07A45');
    for (const a of [-2.6, -2, -1.1, -0.4]) { ell(c, 4 + Math.cos(a) * 16, -30 + Math.sin(a) * 10, 18, 7, a); fs(c, '#4E9E3F', 4); }
  },
  leben(c) { heartPath(c, 0, -2, 36); fs(c, '#FF6B6B'); shine(c, -18, -18, 9, 6); },
  huegel(c) {
    c.beginPath(); c.moveTo(-46, 36); c.quadraticCurveTo(0, -40, 46, 36); c.closePath(); fs(c, '#7CCB5B');
    c.beginPath(); c.moveTo(0, -14); c.lineTo(0, -46); st(c, 5);
    poly(c, [[0, -46], [26, -38], [0, -30]]); fs(c, '#FFC93C', 4);
    shine(c, -14, 4, 10, 5);
  },
  muenzen(c) {
    circ(c, 0, 4, 36); fs(c, '#D99A1E'); circ(c, 0, 0, 36); fs(c, '#FFC93C');
    circ(c, 0, 0, 25); st(c, 4, '#D99A1E');
    star(c, 0, 1, 14, 6); fs(c, '#FFE9A3', 3);
    shine(c, -14, -16, 9, 5);
  },
  farbe(c) {
    c.beginPath();
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = i % 2 ? 26 : 38; c.lineTo(Math.cos(a) * r, Math.sin(a) * r + 6); }
    c.closePath(); fs(c, '#4DB3EA');
    circ(c, 10, 12, 14); c.fillStyle = '#F4D54A'; c.fill();
    c.save(); c.translate(14, -10); c.rotate(0.7);
    rrect(c, -6, -44, 12, 34, 5); fs(c, '#B07A45'); rrect(c, -8, -12, 16, 14, 4); fs(c, '#C9D3DF'); c.beginPath(); c.moveTo(-8, 2); c.quadraticCurveTo(0, 22, 8, 2); fs(c, '#E8603C');
    c.restore();
  },
  fangen(c) {
    c.beginPath(); c.moveTo(-36, 30); c.bezierCurveTo(-44, -30, 44, -30, 36, 30);
    for (let i = 0; i <= 6; i++) c.lineTo(36 - i * 12, 30 + (i % 2 ? 10 : 0));
    c.closePath(); fs(c, '#7BE03C');
    eyes(c, 0, -2, 13, 9, [2, 2]);
    shine(c, -16, -18, 9, 5);
  },

  // ----- Chaos-Karten -----
  eis(c) { rrect(c, -34, -30, 68, 64, 16); fs(c, '#BDEBFF'); rrect(c, -22, -20, 30, 22, 8); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fill(); c.beginPath(); c.moveTo(20, 10); c.lineTo(26, 22); st(c, 4, '#7CC7EA'); },
  riesen(c) { blobBody(c, -8, 6, 36, '#CC79A7'); eyes(c, -8, -2, 12, 8); blobBody(c, 36, 30, 10, '#4DB3EA'); eyes(c, 36, 28, 4, 3); },
  mini(c) { for (const [x, y, col] of [[-26, 14, '#E8603C'], [0, -12, '#F4D54A'], [26, 16, '#17A37A']]) { blobBody(c, x, y, 13, col); eyes(c, x, y - 2, 5, 3.5); } },
  spiegel(c) {
    rrect(c, -8, 16, 16, 34, 6); fs(c, '#B07A45');
    ell(c, 0, -10, 30, 36); fs(c, '#C9A0DC'); ell(c, 0, -10, 22, 28); fs(c, '#D8F3FF', 4);
    c.beginPath(); c.moveTo(-12, -22); c.lineTo(4, -32); c.moveTo(-14, -8); c.lineTo(10, -24); st(c, 4, '#fff');
  },
  flummi(c) { circ(c, 0, 0, 36); fs(c, '#FF6B6B'); c.beginPath(); c.arc(0, 0, 36, -0.4, 0.4); c.arc(0, 0, 36, Math.PI - 0.4, Math.PI + 0.4); c.beginPath(); c.moveTo(-36, 0); c.quadraticCurveTo(0, 30, 36, 0); st(c, 6, '#FFC93C'); c.beginPath(); c.moveTo(-30, -18); c.quadraticCurveTo(0, 8, 30, -18); st(c, 6, '#4DB3EA'); circ(c, 0, 0, 36); st(c, 6); shine(c, -14, -18, 10, 6); },
  turbo(c) { poly(c, [[6, -46], [-28, 6], [-4, 6], [-12, 46], [28, -8], [4, -8]]); fs(c, '#FFC93C'); shine(c, -2, -20, 5, 10, 0.5); },
  bomben(c) { c.save(); c.translate(-10, 8); c.scale(0.75, 0.75); ICONS.bomb(c); c.restore(); for (const [x, y] of [[30, -28], [36, 8], [-38, -30]]) { c.beginPath(); c.moveTo(x, y - 12); c.lineTo(x, y + 4); st(c, 5, '#FF6B6B'); } },
  donut(c) { circ(c, 0, 0, 38); fs(c, '#E6B07A'); c.beginPath(); for (let i = 0; i <= 16; i++) { const a = i / 16 * TAU, r = 32 + (i % 2) * 4; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fillStyle = '#FF8CC6'; c.fill(); circ(c, 0, 0, 13); fs(c, '#2C8FC9'); for (let i = 0; i < 9; i++) { const a = i * 0.7, r = 22; c.save(); c.translate(Math.cos(a) * r, Math.sin(a) * r); c.rotate(a * 3); rrect(c, -5, -2, 10, 4, 2); c.fillStyle = ['#FFC93C', '#4DB3EA', '#fff'][i % 3]; c.fill(); c.restore(); } },
  wind(c) { for (const [y, l, col] of [[-22, 60, '#9ED8F5'], [0, 74, '#fff'], [22, 52, '#9ED8F5']]) { c.beginPath(); c.moveTo(-40, y); c.lineTo(-40 + l - 14, y); c.arc(-40 + l - 14, y - 10, 10, Math.PI / 2, -Math.PI * 0.9, true); st(c, 11); c.beginPath(); c.moveTo(-40, y); c.lineTo(-40 + l - 14, y); c.arc(-40 + l - 14, y - 10, 10, Math.PI / 2, -Math.PI * 0.9, true); st(c, 5, col); } },
  magnet(c) { c.beginPath(); c.arc(0, -4, 26, Math.PI, 0); c.lineTo(26, 30); c.lineTo(10, 30); c.lineTo(10, -4); c.arc(0, -4, 10, 0, Math.PI, true); c.lineTo(-10, 30); c.lineTo(-26, 30); c.closePath(); fs(c, '#E8483C'); rrect(c, -26, 18, 16, 14, 2); fs(c, '#C9D3DF'); rrect(c, 10, 18, 16, 14, 2); fs(c, '#C9D3DF'); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 36, -30); c.lineTo(s * 44, -38); st(c, 4, '#FFC93C'); } },
  kartoffel(c) { ell(c, 0, 6, 38, 28, -0.2); fs(c, '#C99A5B'); for (const [x, y] of [[-14, 0], [10, 14], [18, -6]]) { circ(c, x, y, 2.5); c.fillStyle = '#8A6234'; c.fill(); } c.beginPath(); c.moveTo(24, -16); c.quadraticCurveTo(30, -34, 22, -42); st(c, 4, '#6B4A2A'); star(c, 22, -42, 9, 4, 6); fs(c, '#FF9F43', 3); shine(c, -16, -8, 9, 5); },
  dunkel(c) { circ(c, 0, 0, 40); fs(c, '#1E1B3A'); for (const s of [-1, 1]) { c.save(); c.shadowColor = '#FFE066'; c.shadowBlur = 12; ell(c, s * 13, -2, 8, 10); c.fillStyle = '#FFE066'; c.fill(); c.restore(); circ(c, s * 13 + 2, 0, 3.5); c.fillStyle = INK; c.fill(); } },
  schrumpf(c) { ell(c, 0, 8, 22, 12); fs(c, '#7CCB5B'); for (const [a] of [[0], [Math.PI / 2], [Math.PI], [-Math.PI / 2]]) { const x = Math.cos(a), y = Math.sin(a); c.beginPath(); c.moveTo(x * 46, y * 40 + 4); c.lineTo(x * 30, y * 26 + 4); st(c, 6, '#FF6B6B'); poly(c, [[x * 26 - y * 7, y * 22 + 4 + x * 7], [x * 26 + y * 7, y * 22 + 4 - x * 7], [x * 18, y * 14 + 4]]); fs(c, '#FF6B6B', 3); } },
  flipper(c) { circ(c, 0, 0, 36); fs(c, '#FF5FA2'); circ(c, 0, 0, 24); st(c, 6, '#fff'); circ(c, 0, 0, 12); fs(c, '#FFC93C', 4); shine(c, -14, -16, 8, 5); },
  tausch(c) { c.beginPath(); c.moveTo(-36, 26); c.bezierCurveTo(-6, 26, 6, -20, 32, -20); st(c, 12); c.beginPath(); c.moveTo(-36, 26); c.bezierCurveTo(-6, 26, 6, -20, 32, -20); st(c, 6, '#4DB3EA'); poly(c, [[30, -32], [46, -20], [30, -8]]); fs(c, '#4DB3EA', 4); c.beginPath(); c.moveTo(-36, -20); c.bezierCurveTo(-6, -20, 6, 26, 32, 26); st(c, 12); c.beginPath(); c.moveTo(-36, -20); c.bezierCurveTo(-6, -20, 6, 26, 32, 26); st(c, 6, '#FF9F43'); poly(c, [[30, 14], [46, 26], [30, 38]]); fs(c, '#FF9F43', 4); },
  geister(c) { ghostPath(c, 0, 0, 34); fs(c, '#F4F6FF'); eyes(c, 0, -8, 12, 7, [0, 2]); ell(c, 0, 10, 5, 7); c.fillStyle = INK; c.fill(); },
  geschenk(c) { rrect(c, -34, -10, 68, 48, 8); fs(c, '#5ED6A0'); rrect(c, -38, -24, 76, 18, 6); fs(c, '#5ED6A0'); rrect(c, -7, -24, 14, 62, 3); fs(c, '#FF6B6B', 4); for (const s of [-1, 1]) { ell(c, s * 14, -32, 14, 8, s * 0.5); fs(c, '#FF6B6B', 4); } },
  bananen(c) { c.save(); c.translate(-6, 4); c.rotate(-0.3); c.scale(0.8, 0.8); ICONS.banana(c); c.restore(); c.save(); c.translate(16, 10); c.rotate(0.5); c.scale(0.6, 0.6); ICONS.banana(c); c.restore(); },
  zeitlupe(c) { c.beginPath(); c.moveTo(-44, 30); c.lineTo(30, 30); c.quadraticCurveTo(44, 30, 40, 14); c.lineTo(34, 0); c.quadraticCurveTo(26, 22, 0, 22); c.lineTo(-44, 22); c.closePath(); fs(c, '#9FD86A'); circ(c, -4, 0, 24); fs(c, '#D49A5B'); c.beginPath(); for (let i = 0; i < 40; i++) { const a = i * 0.35, r = 2 + i * 0.5; c.lineTo(-4 + Math.cos(a) * r, Math.sin(a) * r); } st(c, 4, '#8A6234'); for (const x of [32, 40]) { c.beginPath(); c.moveTo(x - 2, 6); c.lineTo(x, -14); st(c, 4); circ(c, x, -16, 4); fs(c, '#fff', 3); } },
  wackel(c) { c.beginPath(); c.moveTo(-36, 30); c.lineTo(-26, -18); c.quadraticCurveTo(0, -30, 26, -18); c.lineTo(36, 30); c.closePath(); fs(c, '#FFB347'); c.beginPath(); c.moveTo(-27, -14); c.quadraticCurveTo(0, -26, 27, -14); c.quadraticCurveTo(28, 0, 18, -2); c.quadraticCurveTo(10, 8, 2, -4); c.quadraticCurveTo(-10, 6, -18, -4); c.quadraticCurveTo(-28, 2, -27, -14); fs(c, '#8A4A2A'); ell(c, 0, 32, 46, 8); fs(c, '#fff'); shine(c, -14, 4, 6, 10, 0.2); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 42, -6); c.quadraticCurveTo(s * 48, 4, s * 42, 14); st(c, 4, '#A9A3C9'); } },

  // ----- Emotes -----
  lachen(c) { blobBody(c, 0, 0, 40, '#F4D54A'); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 22, -10); c.lineTo(s * 12, -4); c.lineTo(s * 22, 2); st(c, 5); } c.beginPath(); c.moveTo(-20, 10); c.quadraticCurveTo(0, 40, 20, 10); c.closePath(); fs(c, '#7A2E3A', 5); for (const s of [-1, 1]) { ell(c, s * 34, 4, 5, 8); fs(c, '#9ED8F5', 3); } },
  schreck(c) { blobBody(c, 0, 0, 40, '#B9C4FF'); for (const s of [-1, 1]) { circ(c, s * 14, -8, 11); fs(c, '#fff', 4); circ(c, s * 14, -8, 3); c.fillStyle = INK; c.fill(); } ell(c, 0, 18, 9, 12); fs(c, '#7A2E3A', 5); },
  wut(c) { blobBody(c, 0, 0, 40, '#FF6B6B'); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 26, -22); c.lineTo(s * 6, -12); st(c, 6); circ(c, s * 14, -4, 5); c.fillStyle = INK; c.fill(); } c.beginPath(); c.moveTo(-14, 22); c.quadraticCurveTo(0, 10, 14, 22); st(c, 6); poly(c, [[26, -42], [34, -30], [42, -38], [38, -26]]); fs(c, '#fff', 4); },
  kacka(c) { for (const [y, w, h] of [[24, 40, 16], [6, 32, 14], [-10, 22, 12]]) { ell(c, 0, y, w, h); fs(c, '#9A6A3E'); } c.beginPath(); c.moveTo(-4, -20); c.quadraticCurveTo(6, -34, 10, -40); st(c, 6); c.beginPath(); c.moveTo(-4, -20); c.quadraticCurveTo(6, -34, 10, -40); st(c, 3, '#9A6A3E'); eyes(c, 0, 4, 11, 7, [1, 0]); c.beginPath(); c.moveTo(-10, 20); c.quadraticCurveTo(0, 28, 10, 20); st(c, 4); },
  winken(c) { c.save(); c.rotate(-0.25); rrect(c, -22, -10, 44, 48, 18); fs(c, '#F4C9A0'); for (let i = 0; i < 4; i++) { rrect(c, -22 + i * 11.5, -40 + Math.abs(i - 1.5) * 4, 10, 36, 5); fs(c, '#F4C9A0', 5); } rrect(c, -40, 2, 26, 12, 6); fs(c, '#F4C9A0', 5); c.restore(); for (const s of [-1, 1]) { c.beginPath(); c.arc(0, -4, 48, s > 0 ? -0.9 : Math.PI + 0.5, s > 0 ? -0.5 : Math.PI + 0.9); st(c, 4, '#A9A3C9'); } },

  // ----- Welt & Oberfläche -----
  krone(c) { poly(c, [[-36, 24], [-40, -20], [-18, 2], [0, -32], [18, 2], [40, -20], [36, 24]]); fs(c, '#FFC93C'); rrect(c, -36, 16, 72, 14, 4); fs(c, '#F2A81D'); for (const x of [-18, 0, 18]) { circ(c, x, 23, 4); c.fillStyle = '#FF6B6B'; c.fill(); } shine(c, -16, -2, 6, 10, 0.3); },
  muenze(c) { ICONS.muenzen(c); },
  herz(c) { ICONS.leben(c); },
  totenkopf(c) { circ(c, 0, -6, 30); fs(c, '#F4F6FF'); rrect(c, -16, 14, 32, 18, 6); fs(c, '#F4F6FF'); for (const s of [-1, 1]) { circ(c, s * 12, -6, 8); c.fillStyle = INK; c.fill(); } for (const x of [-8, 0, 8]) { c.beginPath(); c.moveTo(x, 18); c.lineTo(x, 30); st(c, 3); } },
  kartoffelBombe(c) { ICONS.kartoffel(c); },
  glibber(c) { ICONS.fangen(c); },
  pups(c) { for (const [x, y, r] of [[-18, 6, 20], [6, -8, 24], [22, 12, 18], [0, 18, 20]]) { circ(c, x, y, r); fs(c, '#B5D86B'); } for (const [x, y, r] of [[-18, 6, 20], [6, -8, 24], [22, 12, 18], [0, 18, 20]]) { circ(c, x, y, r - 4); c.fillStyle = '#B5D86B'; c.fill(); } shine(c, 0, -16, 10, 5); },
  welle(c) { for (const [y, col] of [[-10, '#4DB3EA'], [14, '#2C8FC9']]) { c.beginPath(); c.moveTo(-44, y); for (let i = 0; i <= 8; i++) c.quadraticCurveTo(-44 + i * 11 - 5.5, y + (i % 2 ? 12 : -12), -44 + i * 11, y); st(c, 12); c.beginPath(); c.moveTo(-44, y); for (let i = 0; i <= 8; i++) c.quadraticCurveTo(-44 + i * 11 - 5.5, y + (i % 2 ? 12 : -12), -44 + i * 11, y); st(c, 6, col); } },
  blitz(c) { ICONS.turbo(c); },
  rettungsring(c) { circ(c, 0, 0, 38); fs(c, '#fff'); circ(c, 0, 0, 16); fs(c, '#2C8FC9'); for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(0, 0, 27, i * Math.PI / 2 + 0.3, i * Math.PI / 2 + 1.0); st(c, 19, '#FF6B6B'); } circ(c, 0, 0, 38); st(c, 6); circ(c, 0, 0, 16); st(c, 6); },
  schild(c) { c.beginPath(); c.moveTo(0, -42); c.lineTo(34, -30); c.quadraticCurveTo(34, 24, 0, 42); c.quadraticCurveTo(-34, 24, -34, -30); c.closePath(); fs(c, '#8FA3B8'); c.beginPath(); c.moveTo(0, -30); c.lineTo(22, -22); c.quadraticCurveTo(22, 14, 0, 30); c.closePath(); c.fillStyle = '#C9D3DF'; c.fill(); },
  bot(c) { c.beginPath(); c.moveTo(0, -30); c.lineTo(0, -42); st(c, 5); circ(c, 0, -44, 5); fs(c, '#FF6B6B', 4); rrect(c, -34, -30, 68, 56, 16); fs(c, '#A9B8D6'); rrect(c, -24, -20, 48, 28, 10); fs(c, '#2A1B3D', 0); for (const s of [-1, 1]) { circ(c, s * 11, -6, 6); c.fillStyle = '#7FE3FF'; c.fill(); } rrect(c, -14, 14, 28, 6, 3); c.fillStyle = INK; c.fill(); },
  tonAn(c) { poly(c, [[-36, -12], [-18, -12], [4, -32], [4, 32], [-18, 12], [-36, 12]]); fs(c, '#FFF6E5'); for (const r of [16, 30]) { c.beginPath(); c.arc(6, 0, r, -0.8, 0.8); st(c, 6, '#FFF6E5'); } },
  tonAus(c) { poly(c, [[-36, -12], [-18, -12], [4, -32], [4, 32], [-18, 12], [-36, 12]]); fs(c, '#FFF6E5'); c.beginPath(); c.moveTo(16, -14); c.lineTo(40, 14); c.moveTo(40, -14); c.lineTo(16, 14); st(c, 7, '#FF6B6B'); },
  tuer(c) { rrect(c, -26, -40, 52, 80, 8); fs(c, '#B07A45'); rrect(c, -16, -30, 32, 26, 4); st(c, 4, '#8A5A2E'); circ(c, 14, 6, 5); fs(c, '#FFC93C', 3); },
  zahnrad(c) { c.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = i % 2 ? 30 : 40; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); fs(c, '#C9D3DF'); circ(c, 0, 0, 13); fs(c, '#1E1B3A'); },
  link(c) { for (const s of [-1, 1]) { c.save(); c.translate(s * 13, s * -13); c.rotate(-Math.PI / 4); rrect(c, -24, -12, 48, 24, 12); st(c, 14); rrect(c, -24, -12, 48, 24, 12); st(c, 7, '#FFF6E5'); c.restore(); } },
  gluehbirne(c) { circ(c, 0, -10, 28); fs(c, '#FFE27A'); rrect(c, -12, 16, 24, 20, 5); fs(c, '#C9D3DF'); c.beginPath(); c.moveTo(-8, -4); c.lineTo(0, 8); c.lineTo(8, -4); st(c, 4, '#D99A1E'); shine(c, -12, -22, 7, 5); },
  medaille1(c) { medal(c, '#FFC93C', '1'); },
  medaille2(c) { medal(c, '#D5DCE6', '2'); },
  medaille3(c) { medal(c, '#E09A5E', '3'); },
  uhr(c) { circ(c, 0, 0, 38); fs(c, '#FFF6E5'); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -24); c.moveTo(0, 0); c.lineTo(16, 8); st(c, 6); },
  pinsel(c) { ICONS.farbe(c); },
  ausrufe(c) { rrect(c, -9, -40, 18, 52, 9); fs(c, '#FFC93C'); circ(c, 0, 30, 10); fs(c, '#FFC93C'); },

  // ----- Insel-Mechaniken -----
  kokos(c) { circ(c, 0, 4, 34); fs(c, '#8A5A2E'); for (const [x, y] of [[-10, -4], [8, -6], [0, 8]]) { circ(c, x, y, 4.5); c.fillStyle = '#3B2414'; c.fill(); } c.beginPath(); for (let i = 0; i < 7; i++) { const a = -2.6 + i * 0.35; c.moveTo(Math.cos(a) * 26, 4 + Math.sin(a) * 26); c.lineTo(Math.cos(a) * 33, 4 + Math.sin(a) * 33); } st(c, 3, '#B07A45'); shine(c, -14, -12, 7, 4); },
  kiste(c) { rrect(c, -34, -34, 68, 68, 6); fs(c, '#C98A4B'); rrect(c, -24, -24, 48, 48, 3); st(c, 4, '#8A5A2E'); c.beginPath(); c.moveTo(-24, -24); c.lineTo(24, 24); c.moveTo(24, -24); c.lineTo(-24, 24); st(c, 6, '#8A5A2E'); },
  lava(c) { c.beginPath(); c.moveTo(0, -42); c.bezierCurveTo(22, -18, 34, 0, 30, 14); c.arc(0, 12, 30, 0.07, Math.PI - 0.07); c.bezierCurveTo(-34, 0, -22, -18, 0, -42); c.closePath(); fs(c, '#FF7A2A'); c.beginPath(); c.moveTo(0, -18); c.bezierCurveTo(12, -4, 16, 6, 14, 14); c.arc(0, 14, 14, 0, Math.PI); c.bezierCurveTo(-16, 6, -12, -4, 0, -18); c.fillStyle = '#FFE066'; c.fill(); },
  maulwurf(c) { ell(c, 0, 30, 44, 12); fs(c, '#8A5A2E'); c.beginPath(); c.arc(0, 18, 30, Math.PI, TAU); c.closePath(); fs(c, '#5B4A5E'); circ(c, 0, 8, 8); fs(c, '#FF9FB0', 4); for (const s of [-1, 1]) { circ(c, s * 13, -2, 3.5); c.fillStyle = INK; c.fill(); ell(c, s * 30, 24, 10, 6, s * 0.4); fs(c, '#FF9FB0', 4); } },
  drehen(c) { c.beginPath(); c.arc(0, 0, 30, -0.3, Math.PI * 1.4); st(c, 14); c.beginPath(); c.arc(0, 0, 30, -0.3, Math.PI * 1.4); st(c, 7, '#FFC93C'); poly(c, [[30, -26], [44, 4], [14, 0]]); fs(c, '#FFC93C', 5); },
  team(c) { blobBody(c, -16, 8, 26, '#E69F00'); eyes(c, -16, 2, 9, 6); blobBody(c, 18, 8, 26, '#0072B2'); eyes(c, 18, 2, 9, 6); c.beginPath(); c.moveTo(-6, 30); c.lineTo(8, 30); st(c, 6); },
  boss(c) { blobBody(c, 0, 8, 36, '#7A3FA0'); for (const s of [-1, 1]) { poly(c, [[s * 14, -24], [s * 30, -46], [s * 32, -18]]); fs(c, '#FFF6E5', 5); c.beginPath(); c.moveTo(s * 22, -8); c.lineTo(s * 6, -2); st(c, 6); circ(c, s * 13, 6, 5); c.fillStyle = '#FFE066'; c.fill(); } c.beginPath(); c.moveTo(-12, 24); c.lineTo(-4, 18); c.lineTo(4, 24); c.lineTo(12, 18); st(c, 5); },
  konter(c) { ICONS.schild(c); poly(c, [[-4, -18], [10, -18], [2, -2], [12, -2], [-6, 24], [0, 4], [-10, 4]]); fs(c, '#FFC93C', 4); },

  // ----- Hüte (Fuß liegt bei y = 30) -----
  zylinder(c) { ell(c, 0, 26, 46, 10); fs(c, '#2E2A40'); rrect(c, -28, -36, 56, 64, 6); fs(c, '#2E2A40'); rrect(c, -28, 8, 56, 12, 2); fs(c, '#E8483C', 4); shine(c, -16, -20, 4, 12, 0); },
  kappe(c) { c.beginPath(); c.moveTo(-34, 26); c.bezierCurveTo(-36, -28, 34, -28, 34, 26); c.closePath(); fs(c, '#E8483C'); ell(c, 34, 24, 24, 7, -0.1); fs(c, '#C2362C'); circ(c, 0, -8, 5); fs(c, '#FFC93C', 3); shine(c, -14, -6, 6, 10, 0.3); },
  strohhut(c) { ell(c, 0, 22, 50, 13); fs(c, '#F2D48B'); c.beginPath(); c.moveTo(-26, 20); c.bezierCurveTo(-26, -18, 26, -18, 26, 20); c.closePath(); fs(c, '#F2D48B'); rrect(c, -26, 6, 52, 9, 3); fs(c, '#4DB3EA', 4); },
  doktorhut(c) { rrect(c, -22, 4, 44, 26, 6); fs(c, '#2E2A40'); poly(c, [[-48, -2], [0, -24], [48, -2], [0, 18]]); fs(c, '#2E2A40'); circ(c, 0, -3, 5); c.fillStyle = '#FFC93C'; c.fill(); c.beginPath(); c.moveTo(0, -3); c.lineTo(34, 6); c.lineTo(36, 26); st(c, 4, '#FFC93C'); },
  bauhelm(c) { c.beginPath(); c.moveTo(-34, 22); c.bezierCurveTo(-34, -32, 34, -32, 34, 22); c.closePath(); fs(c, '#FFC93C'); rrect(c, -44, 18, 88, 10, 5); fs(c, '#F2A81D'); rrect(c, -6, -26, 12, 44, 5); c.fillStyle = '#F2A81D'; c.fill(); shine(c, -18, -8, 6, 10, 0.3); },
  wikinger(c) { c.beginPath(); c.moveTo(-32, 26); c.bezierCurveTo(-32, -24, 32, -24, 32, 26); c.closePath(); fs(c, '#9AA6B6'); rrect(c, -34, 16, 68, 12, 4); fs(c, '#B07A45'); for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 28, 0); c.quadraticCurveTo(s * 52, -6, s * 48, -40); c.quadraticCurveTo(s * 40, -14, s * 24, -10); c.closePath(); fs(c, '#FFF6E5'); } },
  schleife(c) { for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, 8); c.bezierCurveTo(s * 20, -30, s * 52, -6, s * 44, 18); c.bezierCurveTo(s * 34, 30, s * 14, 20, 0, 8); fs(c, '#FF5FA2'); } circ(c, 0, 10, 11); fs(c, '#E0408A'); },
  blume(c) { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ell(c, Math.cos(a) * 20, Math.sin(a) * 20 - 6, 13, 9, a); fs(c, '#FFC93C', 4); } circ(c, 0, -6, 14); fs(c, '#8A5A2E'); c.beginPath(); c.moveTo(0, 8); c.lineTo(0, 30); st(c, 5, '#4E9E3F'); },
  kirschen(c) { c.beginPath(); c.moveTo(-14, 14); c.quadraticCurveTo(-6, -24, 8, -36); c.moveTo(16, 18); c.quadraticCurveTo(14, -16, 8, -36); st(c, 5, '#4E9E3F'); ell(c, 18, -34, 12, 6, -0.5); fs(c, '#7CCB5B', 4); for (const [x, y] of [[-16, 18], [16, 20]]) { circ(c, x, y, 14); fs(c, '#D7263D'); shine(c, x - 5, y - 6, 4, 3); } },
  party(c) { poly(c, [[0, -46], [28, 28], [-28, 28]]); fs(c, '#5ED6A0'); for (const [x, y, col] of [[-8, 0, '#FF6B6B'], [8, 14, '#FFC93C'], [2, -20, '#4DB3EA']]) { circ(c, x, y, 5); c.fillStyle = col; c.fill(); } circ(c, 0, -46, 8); fs(c, '#FFC93C', 4); },
  einhorn(c) { c.beginPath(); c.moveTo(-14, 28); c.lineTo(0, -46); c.lineTo(14, 28); c.closePath(); fs(c, '#FFE9A3'); for (const y of [-18, -2, 14]) { c.beginPath(); c.moveTo(-10 + (y + 46) * 0.05, y + 6); c.lineTo(10 - (y + 46) * 0.05, y - 4); st(c, 4, '#E8A93C'); } },
  pilz(c) { ICONS.big(c); },
  kuerbis(c) { for (const [x, w] of [[-18, 20], [18, 20], [0, 22]]) { ell(c, x, 6, w, 26); fs(c, '#FF9F43'); } rrect(c, -5, -32, 10, 14, 3); fs(c, '#4E9E3F'); for (const s of [-1, 1]) { poly(c, [[s * 14, -6], [s * 6, 4], [s * 20, 4]]); c.fillStyle = INK; c.fill(); } c.beginPath(); c.moveTo(-14, 16); c.lineTo(-6, 22); c.lineTo(0, 16); c.lineTo(6, 22); c.lineTo(14, 16); st(c, 4); },
};

function ghostPath(c, x, y, r) {
  c.beginPath(); c.arc(x, y - r * 0.15, r, Math.PI, 0);
  for (let i = 0; i <= 6; i++) c.lineTo(x + r - (i / 6) * r * 2, y + r * 0.95 + (i % 2 ? -r * 0.22 : 0));
  c.closePath();
}

function medal(c, col, n) {
  poly(c, [[-22, -46], [-6, -46], [6, -16], [-10, -16]]); fs(c, '#4DB3EA', 4);
  poly(c, [[22, -46], [6, -46], [-6, -16], [10, -16]]); fs(c, '#FF6B6B', 4);
  circ(c, 0, 10, 30); fs(c, col);
  c.fillStyle = INK; c.font = 'bold 34px Lilita One, Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(n, 0, 13);
}

// Reihenfolge = Index, den Spieler speichern (0 = kein Hut)
export const HAT_IDS = ['', 'zylinder', 'kappe', 'strohhut', 'doktorhut', 'bauhelm', 'wikinger', 'schleife', 'blume', 'kirschen', 'party', 'einhorn', 'pilz', 'kuerbis'];
export const HAT_NAMES = ['Ohne Hut', 'Zylinder', 'Kappe', 'Strohhut', 'Doktorhut', 'Bauhelm', 'Wikinger', 'Schleife', 'Blume', 'Kirschen', 'Partyhut', 'Einhorn', 'Pilz', 'Kürbis'];
export const EMOTE_IDS = ['lachen', 'schreck', 'wut', 'kacka', 'winken'];

// ---------- Öffentliche Schnittstelle ----------

// Zeichnet ein Symbol zentriert bei (x, y) in der Größe s
export function drawIcon(ctx, id, x, y, s, alpha = 1) {
  const f = ICONS[id];
  if (!f) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 100, s / 100);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (alpha !== 1) ctx.globalAlpha *= alpha;
  f(ctx);
  ctx.restore();
}

// Hut auf einen Kopf setzen: (x, y) = Scheitel, w = Kopfbreite
export function drawHat(ctx, hat, x, y, w) {
  const id = HAT_IDS[hat];
  if (!id) return;
  const s = w * 1.15;
  drawIcon(ctx, id, x, y - s * 0.3 + w * 0.12, s);
}

// Symbole als Bild für die Oberfläche (zwischengespeichert)
const urlCache = new Map();
export function iconURL(id, px = 64) {
  const key = id + '@' + px;
  if (urlCache.has(key)) return urlCache.get(key);
  const cv = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = cv.height = Math.round(px * dpr);
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  drawIcon(ctx, id, px / 2, px / 2, px * 0.92);
  const url = cv.toDataURL('image/png');
  urlCache.set(key, url);
  return url;
}

export function iconHTML(id, cls = 'ic') {
  if (!ICONS[id]) return '';
  return `<img class="${cls}" src="${iconURL(id, 96)}" alt="" draggable="false">`;
}

export const hasIcon = (id) => !!ICONS[id];
export const ICON_IDS = Object.keys(ICONS);
