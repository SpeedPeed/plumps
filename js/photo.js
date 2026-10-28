// Erinnerungsfoto der Siegerehrung: ein Bild (1080 × 1350) mit Podest, Hüten,
// Punkten, Auszeichnungen und Datum – zum Speichern oder Teilen.
import { INK, drawIcon, drawHat } from './art/icons.js';
import { drawBody, drawFace, drawNameTag, shade } from './art/blob.js';

const TAU = Math.PI * 2;
const W = 1080, H = 1350;
const FONT = '"Lilita One", Nunito, sans-serif';

function outlined(c, text, x, y, size, fill, stroke = 12) {
  c.font = `${size}px ${FONT}`;
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = stroke; c.strokeStyle = INK; c.strokeText(text, x, y);
  c.fillStyle = fill; c.fillText(text, x, y);
}

function blob(c, p, x, y, r, mood) {
  c.fillStyle = 'rgba(42,27,61,0.3)';
  c.beginPath(); c.ellipse(x + 6, y + r * 0.85, r * 0.95, r * 0.3, 0, 0, TAU); c.fill();
  c.save(); c.translate(x, y); drawBody(c, r, p.c, p.ci, false); c.restore();
  drawFace(c, x, y, r, 0, 0.5, mood, 0);
  let top = y - r;
  if (p.h) { drawHat(c, p.h, x, top + r * 0.12, r * 1.25); top -= r * 0.9; }
  return top;
}

export function makePhoto(s) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');

  // Meer mit Lichtstrahlen
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#4FB6E8'); g.addColorStop(1, '#13406E');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.save(); c.translate(W / 2, 560); c.fillStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 14; i++) { c.rotate(TAU / 14); c.beginPath(); c.moveTo(0, 0); c.lineTo(-90, -1100); c.lineTo(90, -1100); c.fill(); }
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 5;
  for (let y = 980; y < H; y += 60) { c.beginPath(); for (let x = 0; x <= W; x += 60) c.quadraticCurveTo(x + 15, y + 12, x + 30, y); c.stroke(); }

  // Titel
  outlined(c, 'PLUMPS!', W / 2, 110, 130, '#FFC93C', 16);
  const champ = s.p.find(p => p.id === s.ch);
  outlined(c, champ ? `${champ.n} ist Inselkönig!` : 'Siegerehrung', W / 2, 225, 58, '#FFFFFF', 10);
  const d = new Date();
  outlined(c, `${d.toLocaleDateString('de-DE')} · Ziel ${s.tg} Punkte · ${s.rd} ${s.rd === 1 ? 'Runde' : 'Runden'}`, W / 2, 290, 32, '#EAF7FF', 7);

  // Insel
  const ix = W / 2, iy = 850;
  c.fillStyle = '#7A5A3A'; c.beginPath(); c.ellipse(ix, iy + 40, 470, 170, 0, 0, TAU); c.fill();
  c.lineWidth = 8; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#F2D48B'; c.beginPath(); c.ellipse(ix, iy, 470, 170, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#7CCB5B'; c.beginPath(); c.ellipse(ix, iy - 6, 440, 150, 0, 0, TAU); c.fill();

  // Podest: 2 – 1 – 3
  const sorted = [...s.p].sort((a, b) => b.s - a.s);
  const spots = [[ix, 170, 100], [ix - 290, 120, 84], [ix + 290, 80, 76]];
  const colors = ['#FFC93C', '#D5DCE6', '#E09A5E'];
  sorted.slice(0, 3).forEach((p, i) => {
    const [x, h, r] = spots[i], base = iy + 10, w = 220;
    c.fillStyle = shade(colors[i], -0.25); c.fillRect(x - w / 2, base - h + 24, w, h);
    c.fillStyle = colors[i]; c.fillRect(x - w / 2, base - h, w, 24);
    c.lineWidth = 7; c.strokeStyle = INK; c.strokeRect(x - w / 2, base - h, w, h + 24);
    drawIcon(c, `medaille${i + 1}`, x - 40, base - h / 2 + 14, 70);
    outlined(c, String(p.s), x + 40, base - h / 2 + 18, 64, '#FFFFFF', 10);
    const top = blob(c, p, x, base - h - r * 0.9, r, i === 0 ? 'triumph' : 'normal');
    if (i === 0) drawIcon(c, 'krone', x, top - 22, 64);
    // Namen stehen vor dem Podest im Sand
    drawNameTag(c, x, base + 78, p.n, p.c, 32);
  });

  // Die anderen sitzen im Sand
  // Die anderen stehen in einer Reihe vorne am Strand, Name darunter
  const rest = sorted.slice(3);
  rest.forEach((p, i) => {
    const x = ix + (i - (rest.length - 1) / 2) * 230, y = iy + 150;
    blob(c, p, x, y, 38, 'normal');
    drawNameTag(c, x, y + 84, `${p.n} · ${p.s}`, p.c, 22);
  });

  // Auszeichnungen
  const aw = (s.aw || []).slice(0, rest.length ? 3 : 4);
  if (aw.length) {
    const top = rest.length ? 1130 : 1070, rowH = 52, bw = 900;
    c.fillStyle = '#FFF6E5'; c.lineWidth = 7; c.strokeStyle = INK;
    c.beginPath(); c.roundRect(W / 2 - bw / 2, top - 20, bw, aw.length * rowH + 30, 28); c.fill(); c.stroke();
    aw.forEach(([icon, title, name, val], i) => {
      const y = top + 14 + i * rowH;
      drawIcon(c, icon, W / 2 - bw / 2 + 50, y, 46);
      c.font = `32px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = INK;
      c.fillText(`${title}: ${name}`, W / 2 - bw / 2 + 90, y);
      c.font = '700 24px Nunito, sans-serif'; c.textAlign = 'right'; c.fillStyle = '#6B5A86';
      c.fillText(val, W / 2 + bw / 2 - 30, y + 2);
    });
  }
  outlined(c, 'speedpeed.github.io/plumps', W / 2, H - 26, 28, '#EAF7FF', 6);
  return cv;
}
