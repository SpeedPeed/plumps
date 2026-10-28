// Blobs zeichnen: Körper mit Glanz, Muster (zweites Erkennungsmerkmal neben der Farbe),
// Gesichter mit Ausdrücken und Namensschild. Stil: docs/STYLE.md
import { INK } from './icons.js';

const TAU = Math.PI * 2;

export const PATTERN_NAMES = ['Punkte', 'Streifen', 'Sterne', 'Zickzack', 'Ringe', 'Sommersprossen'];

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
const luminance = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };

// Muster innerhalb eines Kreises (Mittelpunkt 0,0) – vorher auf den Körper beschneiden
export function drawPattern(c, ci, r, color) {
  const light = luminance(color) > 0.6;
  c.fillStyle = light ? 'rgba(42,27,61,0.22)' : 'rgba(255,255,255,0.32)';
  c.strokeStyle = c.fillStyle;
  c.lineWidth = r * 0.16;
  c.lineCap = 'round';
  switch (ci % 6) {
    case 0: // Punkte
      for (const [x, y, s] of [[-0.45, 0.35, 0.2], [0.5, 0.25, 0.16], [0.05, 0.62, 0.14], [0.62, -0.3, 0.12], [-0.62, -0.15, 0.12]]) { c.beginPath(); c.arc(x * r, y * r, s * r, 0, TAU); c.fill(); }
      break;
    case 1: // Streifen
      c.beginPath();
      for (let i = -3; i <= 3; i++) { c.moveTo(-r * 1.2, i * r * 0.42 + r * 0.6); c.lineTo(r * 1.2, i * r * 0.42 - r * 0.6); }
      c.stroke();
      break;
    case 2: // Sterne
      for (const [x, y, s] of [[-0.45, 0.4, 0.22], [0.48, 0.35, 0.18], [0.6, -0.35, 0.13]]) {
        c.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2 ? 0.45 : 1) * s * r; c.lineTo(x * r + Math.cos(a) * rr, y * r + Math.sin(a) * rr); }
        c.closePath(); c.fill();
      }
      break;
    case 3: // Zickzack
      c.beginPath();
      for (const y of [0.15, 0.55]) { c.moveTo(-r, y * r); for (let i = 1; i <= 8; i++) c.lineTo(-r + i * r / 4, y * r + (i % 2 ? -0.18 : 0.18) * r); }
      c.stroke();
      break;
    case 4: // Ringe
      c.lineWidth = r * 0.11;
      for (const [x, y, s] of [[-0.5, 0.42, 0.18], [0.45, 0.45, 0.2], [0.62, -0.25, 0.12]]) { c.beginPath(); c.arc(x * r, y * r, s * r, 0, TAU); c.stroke(); }
      break;
    default: // Sommersprossen
      for (const sx of [-1, 1]) for (const [x, y] of [[0.42, 0.2], [0.55, 0.32], [0.35, 0.36], [0.5, 0.12]]) { c.beginPath(); c.arc(sx * x * r, y * r, r * 0.055, 0, TAU); c.fill(); }
  }
}

// Gesicht. (x, y) = Blob-Mitte, (fx, fy) = Blickrichtung.
// mood: normal | strain | panic | smug | dizzy | triumph | glow
export function drawFace(c, x, y, r, fx, fy, mood, t) {
  const cx = x + fx * r * 0.28, cy = y + fy * r * 0.22 - r * 0.08;
  const gap = r * 0.36;
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const side of [-1, 1]) {
    const ex = cx + side * gap, ey = cy - r * 0.08;
    switch (mood) {
      case 'triumph':
        c.strokeStyle = INK; c.lineWidth = r * 0.12;
        c.beginPath(); c.arc(ex, ey + r * 0.06, r * 0.16, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
        break;
      case 'dizzy':
        c.strokeStyle = INK; c.lineWidth = r * 0.07;
        c.beginPath();
        for (let i = 0; i < 18; i++) { const a = i * 0.7 + t * 8 * side, rr = i / 18 * r * 0.22; c.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr); }
        c.stroke();
        break;
      case 'glow':
        c.fillStyle = '#FFE066'; c.beginPath(); c.ellipse(ex, ey, r * 0.2, r * 0.25, 0, 0, TAU); c.fill();
        c.fillStyle = INK; c.beginPath(); c.arc(ex + fx * r * 0.07, ey + fy * r * 0.07, r * 0.08, 0, TAU); c.fill();
        break;
      default: {
        const er = mood === 'panic' ? r * 0.3 : mood === 'strain' ? r * 0.2 : r * 0.24;
        c.fillStyle = '#fff';
        c.beginPath(); c.ellipse(ex, ey, er, er * (mood === 'strain' ? 0.75 : 1.08), 0, 0, TAU); c.fill();
        c.strokeStyle = INK; c.lineWidth = r * 0.07; c.stroke();
        const pr = mood === 'panic' ? r * 0.07 : r * 0.12;
        const look = mood === 'panic' ? Math.sin(t * 25 + side) * r * 0.06 : 0;
        c.fillStyle = INK;
        c.beginPath(); c.arc(ex + fx * r * 0.08 + look, ey + fy * r * 0.08, pr, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + fx * r * 0.08 - pr * 0.35, ey + fy * r * 0.08 - pr * 0.35, pr * 0.35, 0, TAU); c.fill();
        if (mood === 'smug') { // halb geschlossene Lider
          c.fillStyle = 'rgba(42,27,61,0.9)';
          c.beginPath(); c.ellipse(ex, ey, er * 1.05, er * 1.12, 0, Math.PI, TAU); c.fill();
        }
        if (mood === 'strain') {
          const outer = side;
          c.strokeStyle = INK; c.lineWidth = r * 0.1;
          c.beginPath(); c.moveTo(ex + outer * er * 1.1, ey - er * 1.5); c.lineTo(ex - outer * er * 0.7, ey - er * 0.9); c.stroke();
        }
      }
    }
  }
  if (mood === 'glow') return;
  // Mund
  const mx = cx, my = cy + r * 0.32;
  c.strokeStyle = INK; c.lineWidth = r * 0.08; c.fillStyle = '#7A2E3A';
  switch (mood) {
    case 'panic': c.beginPath(); c.ellipse(mx, my + r * 0.04, r * 0.13, r * 0.18, 0, 0, TAU); c.fill(); c.stroke(); break;
    case 'strain': c.beginPath(); c.moveTo(mx - r * 0.2, my); c.lineTo(mx + r * 0.2, my); c.stroke(); c.beginPath(); c.moveTo(mx - r * 0.07, my - r * 0.05); c.lineTo(mx - r * 0.07, my + r * 0.05); c.moveTo(mx + r * 0.07, my - r * 0.05); c.lineTo(mx + r * 0.07, my + r * 0.05); c.lineWidth = r * 0.04; c.stroke(); break;
    case 'triumph': c.beginPath(); c.moveTo(mx - r * 0.24, my - r * 0.04); c.quadraticCurveTo(mx, my + r * 0.4, mx + r * 0.24, my - r * 0.04); c.closePath(); c.fill(); c.stroke(); break;
    case 'smug': c.beginPath(); c.moveTo(mx - r * 0.18, my); c.quadraticCurveTo(mx + r * 0.05, my + r * 0.14, mx + r * 0.22, my - r * 0.08); c.stroke(); break;
    case 'dizzy': c.beginPath(); c.moveTo(mx - r * 0.2, my); for (let i = 1; i <= 4; i++) c.quadraticCurveTo(mx - r * 0.2 + (i - 0.5) * r * 0.1, my + (i % 2 ? r * 0.08 : -r * 0.08), mx - r * 0.2 + i * r * 0.1, my); c.stroke(); break;
    default: c.beginPath(); c.arc(mx, my - r * 0.06, r * 0.13, 0.25 * Math.PI, 0.75 * Math.PI); c.stroke();
  }
}

// Körper: Glibber mit Glanz, Muster und Tintenkontur. Zeichnet um (0, 0).
export function drawBody(c, r, color, ci, low) {
  const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
  g.addColorStop(0, shade(color, 0.45)); g.addColorStop(0.35, color); g.addColorStop(1, shade(color, -0.3));
  c.beginPath(); c.arc(0, 0, r, 0, TAU);
  c.fillStyle = g; c.fill();
  if (!low) { c.save(); c.clip(); drawPattern(c, ci, r, color); c.restore(); }
  // Pfad neu anlegen: das Muster hat den aktuellen Pfad überschrieben
  c.beginPath(); c.arc(0, 0, r, 0, TAU);
  c.lineWidth = Math.max(2.5, r * 0.12); c.strokeStyle = INK; c.stroke();
  // Glanzlicht
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.beginPath(); c.ellipse(-r * 0.38, -r * 0.45, r * 0.22, r * 0.12, -0.6, 0, TAU); c.fill();
}

// Namensschild in Spielerfarbe
export function drawNameTag(c, x, y, name, color, font = 13) {
  c.font = `${font}px "Lilita One", Nunito, sans-serif`;
  const w = c.measureText(name).width + 14, h = font + 8;
  const left = x - w / 2, top = y - h;
  c.beginPath();
  c.moveTo(left + h / 2, top); c.lineTo(left + w - h / 2, top); c.arc(left + w - h / 2, top + h / 2, h / 2, -Math.PI / 2, Math.PI / 2);
  c.lineTo(left + h / 2, top + h); c.arc(left + h / 2, top + h / 2, h / 2, Math.PI / 2, -Math.PI / 2); c.closePath();
  c.fillStyle = color; c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
  c.fillStyle = luminance(color) > 0.6 ? INK : '#fff';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(name, x, top + h / 2 + 1);
}
