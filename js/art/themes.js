// Inselthemen (docs/STYLE.md): Jede Insel besteht aus Materialien mit eigener
// Oberfläche, Rand, Seitenwand und Deko. Die Karte „Eisbahn“ macht alles zu Eis.
import { INK } from './icons.js';

const TAU = Math.PI * 2;
export const hash = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };

// ---------- Materialien ----------
// top/top2: Oberfläche (Mitte/Rand), rim: Kante oben, side/sideDark: Seitenwand,
// deco(ctx, x, y, h, scale): kleine Details an zufälligen (aber festen) Punkten,
// lines(ctx, sh): durchgehende Muster in Formkoordinaten (Bretter, Bleche …)

export const MATERIALS = {
  grass: {
    top: '#8BD86A', top2: '#5FB24A', rim: '#F2D48B', side: '#C9A46A', sideDark: '#7E5F3A',
    density: 5000,
    deco(c, x, y, h) {
      if (h < 0.12) { // Blümchen
        for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; c.beginPath(); c.arc(x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5, 2.6, 0, TAU); c.fillStyle = h < 0.06 ? '#FFFFFF' : '#FFC6E0'; c.fill(); }
        c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fillStyle = '#FFC93C'; c.fill();
        return;
      }
      c.strokeStyle = 'rgba(40,100,40,0.45)'; c.lineWidth = 2.6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x - 5, y + 4); c.lineTo(x - 2, y - 4); c.moveTo(x, y + 4); c.lineTo(x + 2, y - 6); c.moveTo(x + 4, y + 4); c.lineTo(x + 6, y - 3); c.stroke();
    },
  },
  sand: {
    top: '#F7DFA0', top2: '#E9C676', rim: '#FFF0C4', side: '#C99A5B', sideDark: '#8A6234',
    density: 6000,
    deco(c, x, y, h) {
      if (h < 0.25) { // Muschel
        c.save(); c.translate(x, y); c.rotate(h * 20);
        c.beginPath(); c.moveTo(0, 5); c.arc(0, 0, 6, Math.PI * 1.1, Math.PI * 1.9); c.closePath();
        c.fillStyle = '#FFB7A8'; c.fill(); c.strokeStyle = 'rgba(42,27,61,0.5)'; c.lineWidth = 1.5; c.stroke();
        c.restore();
      } else if (h < 0.35) { // kleiner Seestern
        c.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.5 : 6.5; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        c.closePath(); c.fillStyle = '#FF8C5A'; c.fill();
      } else {
        c.fillStyle = 'rgba(160,110,50,0.25)';
        c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.arc(x + 6, y + 3, 1.2, 0, TAU); c.fill();
      }
    },
  },
  wood: {
    top: '#D9A066', top2: '#B97F48', rim: '#E8B67A', side: '#8A5A2E', sideDark: '#5C3A1C',
    density: 9000,
    lines(c, sh) { planks(c, sh, 28, 'rgba(92,58,28,0.55)'); },
    deco(c, x, y, h) { if (h < 0.5) { c.fillStyle = 'rgba(70,45,20,0.6)'; c.beginPath(); c.arc(x, y, 2, 0, TAU); c.fill(); } },
  },
  raft: {
    top: '#C99A5B', top2: '#A87A42', rim: '#D9AE70', side: '#7A5230', sideDark: '#4E3218',
    density: 9000,
    lines(c, sh) { planks(c, sh, 34, 'rgba(78,50,24,0.6)', true); },
    deco(c, x, y, h) {
      if (h < 0.3) { c.strokeStyle = '#E8D3A0'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 4, 0, TAU); c.stroke(); }
    },
  },
  metal: {
    top: '#B9C4D0', top2: '#8C99A8', rim: '#FFC93C', side: '#5D6876', sideDark: '#3A4250',
    rimStripes: true, density: 7000,
    lines(c, sh) { plates(c, sh, 70, 'rgba(58,66,80,0.45)'); },
    deco(c, x, y) { c.fillStyle = 'rgba(58,66,80,0.55)'; c.beginPath(); c.arc(x, y, 2.4, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(x - 0.8, y - 0.8, 1, 0, TAU); c.fill(); },
  },
  rock: {
    top: '#6E5A5A', top2: '#4C3C40', rim: '#8A7270', side: '#3A2C30', sideDark: '#221820',
    density: 7000,
    deco(c, x, y, h, t) {
      // glühende Risse
      const glow = 0.5 + Math.sin(t * 2 + h * 30) * 0.3;
      c.strokeStyle = `rgba(255,120,40,${glow})`; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x - 2, y + 3); c.lineTo(x + 3, y - 3); c.lineTo(x + 9, y + 1); c.stroke();
    },
  },
  candy: {
    top: '#FFB3D9', top2: '#FF8CC6', rim: '#FFF6E5', side: '#C98A5A', sideDark: '#8A5A34',
    density: 2500,
    deco(c, x, y, h) {
      c.save(); c.translate(x, y); c.rotate(h * 40);
      c.fillStyle = ['#FFC93C', '#4DB3EA', '#5ED6A0', '#FFFFFF', '#E8603C'][Math.floor(h * 5)];
      c.beginPath(); c.moveTo(-4, -1.5); c.lineTo(4, -1.5); c.arc(4, 0, 1.5, -Math.PI / 2, Math.PI / 2); c.lineTo(-4, 1.5); c.arc(-4, 0, 1.5, Math.PI / 2, -Math.PI / 2); c.fill();
      c.restore();
    },
  },
  coral: {
    top: '#FF9E7A', top2: '#F27A5A', rim: '#FFD0B8', side: '#C25A44', sideDark: '#7E3426',
    density: 3500,
    deco(c, x, y, h) {
      c.fillStyle = 'rgba(255,230,210,0.75)'; c.beginPath(); c.arc(x, y, 3 + h * 2.5, 0, TAU); c.fill();
      c.fillStyle = 'rgba(194,90,68,0.5)'; c.beginPath(); c.arc(x, y, 1.4 + h, 0, TAU); c.fill();
    },
  },
  earth: {
    top: '#A8794A', top2: '#8A5E36', rim: '#7CCB5B', side: '#6B4626', sideDark: '#432A14',
    density: 9000,
    lines(c, sh) { planks(c, sh, 22, 'rgba(70,44,20,0.45)', false, true); },
    deco(c, x, y, h) {
      if (h < 0.35) { c.fillStyle = '#C99A5B'; c.beginPath(); c.ellipse(x, y, 6, 4.5, h * 9, 0, TAU); c.fill(); c.strokeStyle = 'rgba(42,27,61,0.4)'; c.lineWidth = 1.5; c.stroke(); }
      else if (h < 0.55) { c.strokeStyle = '#4E9E3F'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, y + 4); c.lineTo(x - 4, y - 4); c.moveTo(x, y + 4); c.lineTo(x + 4, y - 4); c.stroke(); }
    },
  },
  ice: {
    top: '#E9FBFF', top2: '#A9DDF2', rim: '#FFFFFF', side: '#6FB6D6', sideDark: '#3E7FA6',
    density: 6000,
    deco(c, x, y, h, t) {
      if (h < 0.4) { c.strokeStyle = 'rgba(110,170,210,0.55)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 9, y - 3); c.lineTo(x - 2, y + 1); c.lineTo(x + 3, y - 4); c.lineTo(x + 10, y + 2); c.stroke(); }
      else if (h < 0.5) { const a = 0.4 + Math.sin(t * 3 + h * 50) * 0.4; c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + 1.5, y); c.lineTo(x, y + 5); c.lineTo(x - 1.5, y); c.fill(); }
    },
  },
};

// Bretter/Furchen quer über eine Form (in Formkoordinaten)
function planks(c, sh, gap, col, gaps = false, curvy = false) {
  const w = sh.k === 'c' ? sh.r * 2 : sh.w, h = sh.k === 'c' ? sh.r * 2 : sh.h;
  c.strokeStyle = col; c.lineWidth = curvy ? 2 : 2.5;
  c.beginPath();
  for (let y = -h / 2 + gap; y < h / 2; y += gap) {
    if (curvy) { c.moveTo(-w / 2, y); for (let x = -w / 2; x <= w / 2; x += 20) c.quadraticCurveTo(x + 10, y + 4, x + 20, y); }
    else { c.moveTo(-w / 2, y); c.lineTo(w / 2, y); }
  }
  // versetzte Stöße zwischen den Brettern
  if (!curvy) {
    let row = 0;
    for (let y = -h / 2; y < h / 2; y += gap, row++) {
      for (let x = -w / 2 + ((row * 73) % 120); x < w / 2; x += 120 + (row % 3) * 20) { c.moveTo(x, y); c.lineTo(x, y + gap); }
    }
  }
  c.stroke();
  if (gaps) { c.fillStyle = 'rgba(30,60,90,0.25)'; for (let y = -h / 2 + gap; y < h / 2; y += gap) c.fillRect(-w / 2, y - 1, w, 2); }
}

function plates(c, sh, size, col) {
  const w = sh.k === 'c' ? sh.r * 2 : sh.w, h = sh.k === 'c' ? sh.r * 2 : sh.h;
  c.strokeStyle = col; c.lineWidth = 2;
  c.beginPath();
  for (let x = -w / 2 + size; x < w / 2; x += size) { c.moveTo(x, -h / 2); c.lineTo(x, h / 2); }
  for (let y = -h / 2 + size; y < h / 2; y += size) { c.moveTo(-w / 2, y); c.lineTo(w / 2, y); }
  c.stroke();
}

// ---------- Themen pro Insel ----------
// mat: Grundmaterial, over: Material pro Form-Index (wird oben drüber gezeichnet),
// hole: Aussehen von Löchern, water: Farbe des Meeres (Mitte, Rand)

export const THEMES = {
  rund:      { name: 'Tropen', mat: 'grass' },
  quadrat:   { name: 'Kistenstapel', mat: 'wood' },
  kreuz:     { name: 'Schrottplatz', mat: 'metal', water: ['#2B7FA8', '#123A5E'] },
  bruecke:   { name: 'Tropen', mat: 'grass', over: { 2: 'wood' } },
  archipel:  { name: 'Sandbank', mat: 'sand', water: ['#3FB2D8', '#14527E'] },
  ring:      { name: 'Vulkan', mat: 'rock', hole: 'lava', water: ['#245F86', '#0F2A48'] },
  karussell: { name: 'Süßigkeiten', mat: 'candy', water: ['#4AA7D8', '#1E4F86'] },
  stern:     { name: 'Korallenriff', mat: 'coral', water: ['#30A7C9', '#0F4672'] },
  knolle:    { name: 'Acker', mat: 'earth' },
  wippe:     { name: 'Holzfloß', mat: 'raft' },
};
export const DEFAULT_WATER = ['#2C8FC9', '#13406E'];

export function materialFor(mapId, shapeIndex, card) {
  if (card === 'eis') return MATERIALS.ice;
  const th = THEMES[mapId] || THEMES.rund;
  return MATERIALS[th.over?.[shapeIndex] || th.mat];
}

// Kleines Bild einer Insel (Draufsicht) für Karten und Anzeigen
export function drawMapIcon(c, map, x, y, s) {
  const th = THEMES[map.id] || THEMES.rund;
  c.save();
  c.translate(x, y);
  c.scale(s / 720, s / 720);
  c.lineJoin = 'round';
  const path = (inf) => {
    c.beginPath();
    for (const sh of map.shapes) {
      let sx = sh.x || 0, sy = sh.y || 0;
      if (sh.orbit) { sx = Math.cos(sh.orbit.ph) * sh.orbit.r; sy = Math.sin(sh.orbit.ph) * sh.orbit.r; }
      if (sh.k === 'c') { c.moveTo(sx + sh.r + inf, sy); c.arc(sx, sy, sh.r + inf, 0, TAU); }
      else { c.save(); c.translate(sx, sy); c.rotate(sh.a || 0); c.rect(-sh.w / 2 - inf, -sh.h / 2 - inf, sh.w + inf * 2, sh.h + inf * 2); c.restore(); }
    }
  };
  const mat = MATERIALS[th.mat];
  path(26); c.fillStyle = INK; c.fill();
  path(0); c.fillStyle = mat.top; c.fill();
  for (const h of map.holes || []) { c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.fillStyle = th.hole === 'lava' ? '#FF7A2A' : '#2C8FC9'; c.fill(); c.lineWidth = 26; c.strokeStyle = INK; c.stroke(); }
  c.restore();
}
