// Kleine Blob-Bilder für die Oberfläche (Lobby, Punktestand, Siegerehrung).
// Gleiche Zeichnung wie im Spiel: Körper mit Muster, Gesicht, Hut.
import { drawBody, drawFace } from './blob.js';
import { drawHat } from './icons.js';

const cache = new Map();

export function avatarURL(color, ci, hat = 0, mood = 'normal', px = 64) {
  const key = [color, ci, hat, mood, px].join('|');
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = cv.height = Math.round(px * dpr);
  const c = cv.getContext('2d');
  c.scale(dpr, dpr);
  const r = px * 0.3, x = px / 2, y = px * 0.62;
  c.fillStyle = 'rgba(42,27,61,0.25)';
  c.beginPath(); c.ellipse(x + 2, y + r * 0.8, r * 0.9, r * 0.3, 0, 0, Math.PI * 2); c.fill();
  c.save(); c.translate(x, y); drawBody(c, r, color, ci, false); c.restore();
  drawFace(c, x, y, r, 0.15, 0.6, mood, 0);
  if (hat) drawHat(c, hat, x, y - r + r * 0.12, r * 1.25);
  const url = cv.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

export function avatarHTML(p, mood = 'normal', cls = 'av') {
  return `<img class="${cls}" src="${avatarURL(p.c, p.ci, p.h || 0, mood)}" alt="" draggable="false">`;
}
