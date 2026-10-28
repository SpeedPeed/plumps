// Zeichnet einen (interpolierten) Snapshot auf das Canvas. Stil: docs/STYLE.md
// Alles hier ist eigene Vektorgrafik – keine Emojis.
import { unpackShapes } from './geometry.js';
import { COLORS } from './sim.js';
import { TEAMS } from './modes/team.js';
import { TRAILS, DANCES } from './cosmetics.js';
import { INK, drawIcon, drawHat, EMOTE_IDS } from './art/icons.js';
import { THEMES, DEFAULT_WATER, materialFor, hash } from './art/themes.js';
import { drawBody, drawFace, drawNameTag, hexA } from './art/blob.js';

const VIEW_R = 400;      // so viel Welt muss sichtbar sein
const DEPTH = 26;        // Höhe der Insel-Seitenwand
const TAU = Math.PI * 2;
const FONT = '"Lilita One", Nunito, sans-serif';

export class View {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.fx = [];                       // Partikel, Ringe, Texte
    this.shake = 0;
    this.cam = { x: 0, y: 0, z: 1 };    // Kamera: zoomt im letzten Duell heran
    this.trails = new Map();            // Bewegungsspuren bei hohem Tempo
    this.jiggle = new Map();            // Nachschwabbeln pro Blob (Feder)
    this.low = false;                   // Sparmodus bei schwacher Bildrate
    this.perf = { acc: 0, n: 0, slow: 0, fast: 0 };
    this.fish = Array.from({ length: 6 }, (_, i) => ({ r: 380 + hash(i) * 160, a: hash(i + 9) * TAU, s: (0.04 + hash(i + 3) * 0.05) * (i % 2 ? 1 : -1), size: 10 + hash(i + 5) * 10 }));
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.low ? 1 : 2);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.cv.width = this.w * dpr; this.cv.height = this.h * dpr;
    this.cv.style.width = this.w + 'px'; this.cv.style.height = this.h + 'px';
    this.dpr = dpr;
    this.scale = Math.min(this.w, this.h) / (VIEW_R * 2);
  }

  // Bildrate beobachten und bei Bedarf in den Sparmodus schalten (und zurück)
  trackPerf(dt) {
    const p = this.perf;
    p.acc += dt; p.n++;
    if (p.acc < 1) return;
    const fps = p.n / p.acc;
    p.acc = 0; p.n = 0;
    this.fps = Math.round(fps);
    if (fps < 45) { p.slow++; p.fast = 0; } else if (fps > 58) { p.fast++; p.slow = 0; }
    if (!this.low && p.slow >= 2) { this.low = true; this.resize(); }
    else if (this.low && p.fast >= 8) { this.low = false; this.resize(); }
  }

  // Blobs in der Nähe eines Aufpralls schwabbeln nach
  kick(x, y, strength, radius = 60) {
    for (const j of this.jiggle.values()) {
      if (j.px == null) continue;
      if (Math.hypot(j.px - x, j.py - y) < radius) j.v += strength * 6;
    }
  }

  addEvent(e, snap) {
    const low = this.low;
    const col = (id) => snap?.p.find(p => p.id === id)?.c || '#fff';
    const P = (o) => { if (!low || Math.random() < 0.5) this.fx.push(o); };
    const burst = (x, y, n, sp, color, r, life, extra = {}) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = sp * (0.4 + Math.random() * 0.8); P({ type: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, r, ...extra }); } };
    switch (e.k) {
      case 'plumps':
        for (let i = 0; i < 3; i++) this.fx.push({ type: 'ring', x: e.x, y: e.y + DEPTH * 0.6, r: 10, vr: 90 + i * 40, life: 1.1, max: 1.1, color: '#EAF7FF', w: 5, flat: 0.55 });
        for (let i = 0; i < 18; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, sp = 120 + Math.random() * 220; P({ type: 'dot', x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.8, max: 0.8, color: i % 3 ? '#CFEFFF' : '#FFFFFF', r: 5, grav: 600 }); }
        this.shake = Math.max(this.shake, 6);
        break;
      case 'impact': {
        const col = { kokos: '#B07A45', lava: '#FF7A2A', mole: '#6B4A2A', crate: '#C98A4B' }[e.kind] || '#fff';
        this.fx.push({ type: 'ring', x: e.x, y: e.y, r: 10, vr: 300, life: 0.35, max: 0.35, color: col, w: 10 });
        burst(e.x, e.y, 14, 200, col, 6, 0.6, { grav: 300 });
        burst(e.x, e.y, 6, 90, '#D9CFC0', 10, 0.8, { type: 'cloud' });
        this.shake = Math.max(this.shake, 9);
        this.kick(e.x, e.y, 0.5, 120);
        break;
      }
      case 'splash':
        for (let i = 0; i < 2; i++) this.fx.push({ type: 'ring', x: e.x, y: e.y + DEPTH * 0.6, r: 10, vr: 90 + i * 40, life: 1, max: 1, color: '#EAF7FF', w: 5, flat: 0.55 });
        break;
      case 'sink': case 'rise':
        burst(e.x, e.y, 16, 160, '#EAF7FF', 6, 0.7, { grav: 300 });
        this.shake = Math.max(this.shake, e.k === 'sink' ? 8 : 3);
        break;
      case 'points': {
        const p = snap?.p.find(q => q.id === e.id);
        if (p) this.fx.push({ type: 'text', x: p.x, y: p.y - p.r - 16, vx: 0, vy: -60, life: 1, max: 1, text: e.n > 0 ? `+${e.n}` : `${e.n}`, color: e.n > 0 ? '#5ED6A0' : '#FF6B6B', size: 24 });
        break;
      }
      case 'boom':
        this.fx.push({ type: 'ring', x: e.x, y: e.y, r: 10, vr: 380, life: 0.35, max: 0.35, color: '#FFB347', w: 12 });
        this.fx.push({ type: 'flash', x: e.x, y: e.y, r: 90, life: 0.18, max: 0.18, color: '#FFF3C4' });
        burst(e.x, e.y, 22, 260, '#FF7A2A', 7, 0.6);
        burst(e.x, e.y, 10, 160, '#5A5470', 9, 0.9, { type: 'cloud' });
        this.shake = Math.max(this.shake, 14);
        this.kick(e.x, e.y, 0.6, 140);
        break;
      case 'pups':
        this.fx.push({ type: 'ring', x: e.x, y: e.y, r: 10, vr: e.r * 2.6, life: 0.4, max: 0.4, color: '#B5D86B', w: 10 });
        burst(e.x, e.y, 10, 90, '#B5D86B', 14, 0.9, { type: 'cloud' });
        break;
      case 'boing':
        this.fx.push({ type: 'star', x: e.x, y: e.y, life: 0.25, max: 0.25, r: 14 + (e.p || 0) * 20 });
        this.shake = Math.max(this.shake, 2 + (e.p || 0) * 6);
        this.kick(e.x, e.y, 0.25 + (e.p || 0) * 0.4);
        break;
      case 'dash':
        burst(e.x, e.y, 6 + (e.c || 0) * 8, 60, col(e.id), 6, 0.45, { type: 'drop' });
        break;
      case 'bumper':
        this.fx.push({ type: 'ring', x: e.x, y: e.y, r: 26, vr: 120, life: 0.2, max: 0.2, color: '#fff', w: 6 });
        this.kick(e.x, e.y, 0.4, 70);
        break;
      case 'coin':
        this.fx.push({ type: 'text', x: e.x, y: e.y, vx: 0, vy: -60, life: 0.8, max: 0.8, text: '+1', color: '#FFC93C', size: 20 });
        burst(e.x, e.y, 6, 90, '#FFF3A0', 3, 0.4);
        break;
      case 'coinloss': {
        const p = snap?.p.find(q => q.id === e.id);
        if (p) this.fx.push({ type: 'text', x: p.x, y: p.y - 30, vx: 0, vy: -40, life: 1.2, max: 1.2, text: `−${e.n}`, color: '#FF6B6B', size: 22, icon: 'muenze' });
        break;
      }
      case 'punch':
        this.fx.push({ type: 'star', x: e.x, y: e.y, life: 0.35, max: 0.35, r: 40 });
        this.fx.push({ type: 'text', x: e.x, y: e.y - 20, vx: 0, vy: -80, life: 0.7, max: 0.7, text: 'POW!', color: '#FF6B6B', size: 26 });
        this.shake = Math.max(this.shake, 12);
        this.kick(e.x, e.y, 0.7);
        break;
      case 'slip':
        this.fx.push({ type: 'text', x: e.x, y: e.y - 25, vx: 0, vy: -50, life: 0.9, max: 0.9, text: 'HUII!', color: '#fff', size: 20 });
        break;
      case 'item': {
        const p = snap?.p.find(q => q.id === e.id);
        if (p) { this.fx.push({ type: 'ring', x: p.x, y: p.y, r: 20, vr: 160, life: 0.35, max: 0.35, color: '#fff', w: 6 }); burst(p.x, p.y, 10, 140, '#FFF3A0', 3, 0.5); }
        break;
      }
      case 'respawn': {
        const p = snap?.p.find(q => q.id === e.id);
        if (p) this.fx.push({ type: 'ring', x: p.x, y: p.y, r: 60, vr: -150, life: 0.35, max: 0.35, color: p.c, w: 6 });
        break;
      }
      case 'tag': {
        const p = snap?.p.find(q => q.id === e.id);
        if (p) burst(p.x, p.y, 12, 120, '#7BE03C', 5, 0.6, { type: 'drop' });
        break;
      }
      case 'counter':
        this.fx.push({ type: 'ring', x: e.x, y: e.y, r: 14, vr: 520, life: 0.35, max: 0.35, color: '#ffffff', w: 12 });
        this.fx.push({ type: 'flash', x: e.x, y: e.y, r: 70, life: 0.15, max: 0.15, color: '#CFF4FF' });
        this.fx.push({ type: 'star', x: e.x, y: e.y, life: 0.4, max: 0.4, r: 46 });
        this.fx.push({ type: 'text', x: e.x, y: e.y - 40, vx: 0, vy: -70, life: 1.1, max: 1.1, text: 'KONTER!', color: '#7FE3FF', size: 32, icon: 'schild' });
        this.shake = Math.max(this.shake, 14);
        this.kick(e.x, e.y, 0.8);
        break;
      case 'break':
        for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, sp = 120 + Math.random() * 220; P({ type: 'shard', x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: a, life: 0.6, max: 0.6, color: '#C9D3DF', r: 7 }); }
        this.fx.push({ type: 'text', x: e.x, y: e.y - 40, vx: 0, vy: -70, life: 1.1, max: 1.1, text: 'DURCHBRUCH!', color: '#FF9F43', size: 30 });
        this.shake = Math.max(this.shake, 16);
        this.kick(e.x, e.y, 0.9);
        break;
      case 'hit':
        this.fx.push({ type: 'ring', x: e.x, y: e.y, r: 10, vr: 300 + e.p * 300, life: 0.25, max: 0.25, color: '#FFF3C4', w: 8 });
        this.fx.push({ type: 'star', x: e.x, y: e.y, life: 0.3, max: 0.3, r: 22 + e.p * 26 });
        this.shake = Math.max(this.shake, 6 + e.p * 10);
        this.kick(e.x, e.y, 0.4 + e.p * 0.5);
        break;
      case 'wobble':
        this.fx.push({ type: 'text', x: e.x, y: e.y - 48, vx: 0, vy: -30, life: 0.6, max: 0.6, text: '!!', color: '#FFC93C', size: 26 });
        break;
      case 'save':
        this.fx.push({ type: 'text', x: e.x, y: e.y - 40, vx: 0, vy: -50, life: 1, max: 1, text: 'Gerettet!', color: '#5ED6A0', size: 22 });
        burst(e.x, e.y, 8, 80, '#F2D48B', 4, 0.4);
        break;
      case 'brace': {
        const p = snap?.p.find(q => q.id === e.id);
        if (p) for (let i = 0; i < 8; i++) { const a = Math.random() * TAU; P({ type: 'dot', x: p.x + Math.cos(a) * p.r, y: p.y + Math.sin(a) * p.r * 0.6 + p.r * 0.5, vx: Math.cos(a) * 60, vy: Math.sin(a) * 30, life: 0.35, max: 0.35, color: '#D8C38A', r: 4 }); }
        break;
      }
      case 'ko': {
        const p = snap?.p.find(q => q.id === e.victim);
        if (p) {
          for (let i = 0; i < 22; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, sp = 160 + Math.random() * 260; P({ type: 'dot', x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.9, max: 0.9, color: i % 3 ? '#CFEFFF' : '#FFFFFF', r: 5, grav: 520 }); }
          this.fx.push({ type: 'text', x: p.x, y: p.y - 30, vx: 0, vy: -60, life: 1.2, max: 1.2, text: 'PLUMPS!', color: '#ffffff', size: 32 });
        }
        this.shake = Math.max(this.shake, 10);
        break;
      }
      default:
    }
    const cap = low ? 120 : 400;
    if (this.fx.length > cap) this.fx.splice(0, this.fx.length - cap);
  }

  draw(s, myId, dt, now) {
    this.trackPerf(dt);
    this.phase = s && s.ph;
    const { ctx, w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.shake *= Math.pow(0.002, dt);
    const shake = this.shake * (this.shakeScale ?? 1);
    const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
    const theme = (s && THEMES[s.mp]) || THEMES.rund;

    this.drawWater(theme.water || DEFAULT_WATER, now);

    const S = this.scale;
    this.updateCamera(s, dt);
    const cam = this.cam;
    ctx.save();
    ctx.translate(w / 2 + sx, h / 2 + sy + Math.min(30, h * 0.03));
    ctx.scale(S * cam.z, S * cam.z);
    ctx.translate(-cam.x, -cam.y);

    if (!this.low) this.drawSeaLife(now);
    if (!s) { ctx.restore(); return; }

    const shapes = unpackShapes(s.ar);
    const holes = s.ho || [];
    this.drawIsland(s, shapes, holes, theme, now);
    this.drawWorldObjects(s, now);
    this.drawMapMechanic(s, shapes, now);
    this.drawHazardsGround(s, shapes, now);

    // Blobs
    const players = s.p.filter(p => p.st !== 'ghost').sort((a, b) => a.y - b.y);
    this.updateJiggle(s, dt);
    if (!this.low) this.drawTrails(s, dt);
    this.emitTrails(s, dt);
    for (const p of players) this.drawBlobShadow(p);
    for (const p of players) this.drawBlob(p, s, myId, now);

    this.drawHazardsAir(s, now);
    for (const f of this.fx) this.drawFx(f);

    // Stromausfall
    const me = s.p.find(p => p.id === myId);
    if (s.c === 'dunkel' && s.ph === 'play' && me && me.st === 'alive') {
      ctx.save();
      ctx.fillStyle = 'rgba(8,6,20,0.96)';
      ctx.beginPath();
      ctx.rect(-5000, -5000, 10000, 10000);
      ctx.arc(me.x, me.y, s.co === myId ? 210 : 105, 0, TAU, true);  // wer gewählt hat, hat eine Taschenlampe
      ctx.fill();
      ctx.restore();
      for (const p of players) if (p.st === 'alive' && p.id !== myId) drawFace(ctx, p.x, p.y, p.r, p.fx || 0, p.fy || 1, 'glow', now);
    }

    for (const p of s.p) if (p.st === 'ghost') this.drawGhost(p, myId, now);

    if (this.debug) this.drawDebug(s, shapes, holes);
    ctx.restore();

    for (const f of this.fx) {
      f.life -= dt;
      if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.94; f.vy *= 0.94; if (f.grav) f.vy += f.grav * dt; }
      if (f.vr) f.r += f.vr * dt;
    }
    this.fx = this.fx.filter(f => f.life > 0);
  }

  // ---------- Wasser ----------

  drawWater(colors, now) {
    const { ctx, w, h } = this;
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, colors[0]); g.addColorStop(1, colors[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // sanfte Wellenlinien, die langsam wandern
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 3;
    const step = 46;
    ctx.beginPath();
    for (let y = -step + (now * 10) % step; y < h + step; y += step) {
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 40) ctx.quadraticCurveTo(x + 10, y + Math.sin(now * 1.2 + x * 0.02 + y) * 6, x + 20, y);
    }
    ctx.stroke();
    if (this.low) return;
    // Glitzern auf dem Wasser
    for (let i = 0; i < 26; i++) {
      const a = Math.sin(now * 1.6 + i * 7.3);
      if (a < 0.6) continue;
      const x = hash(i * 3.1) * w, y = hash(i * 7.7) * h;
      ctx.fillStyle = `rgba(255,255,255,${(a - 0.6) * 1.6})`;
      ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x, y - 1.5); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 1.5); ctx.fill();
    }
  }

  // Fische als Schatten unter Wasser, ab und zu zieht eine Haiflosse vorbei
  drawSeaLife(now) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(10,30,60,0.28)';
    for (const f of this.fish) {
      const a = f.a + now * f.s;
      const x = Math.cos(a) * f.r, y = Math.sin(a) * f.r * 0.8;
      const dir = a + (f.s > 0 ? Math.PI / 2 : -Math.PI / 2);
      ctx.save(); ctx.translate(x, y); ctx.rotate(dir);
      ctx.beginPath(); ctx.ellipse(0, 0, f.size, f.size * 0.45, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-f.size * 0.8, 0); ctx.lineTo(-f.size * 1.5, -f.size * 0.45 + Math.sin(now * 8 + f.r) * 2); ctx.lineTo(-f.size * 1.5, f.size * 0.45); ctx.fill();
      ctx.restore();
    }
    // Haiflosse: alle ~25 s eine halbe Runde
    const t = (now % 25) / 25;
    if (t < 0.5) {
      const a = t * 2 * Math.PI * 1.2 - 0.5, r = 470;
      const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.75;
      ctx.save(); ctx.translate(x, y);
      ctx.strokeStyle = 'rgba(234,247,255,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-26, 4); ctx.quadraticCurveTo(-8, 10, 14, 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12, 4); ctx.quadraticCurveTo(-4, -24, 12, -26); ctx.quadraticCurveTo(4, -10, 8, 4); ctx.closePath();
      ctx.fillStyle = '#4A5568'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      ctx.restore();
    }
  }

  // ---------- Insel ----------

  shapePath(sh, inf = 0, dy = 0) {
    const c = this.ctx;
    if (sh.k === 'c') { const r = Math.max(0, sh.r + inf); c.moveTo(sh.x + r, sh.y + dy); c.arc(sh.x, sh.y + dy, r, 0, TAU); return; }
    const hw = Math.max(0, sh.w / 2 + inf), hh = Math.max(0, sh.h / 2 + inf);
    const cs = Math.cos(sh.a), sn = Math.sin(sh.a);
    const pts = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [sh.x + x * cs - y * sn, sh.y + x * sn + y * cs + dy]);
    c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 4; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath();
  }

  // Seitenwand: Hülle aus der Form oben und der um DEPTH nach unten verschobenen Form
  sidePath(sh) {
    const c = this.ctx;
    if (sh.k === 'c') {
      c.moveTo(sh.x + sh.r, sh.y + DEPTH);
      c.arc(sh.x, sh.y + DEPTH, sh.r, 0, Math.PI);
      c.lineTo(sh.x - sh.r, sh.y);
      c.arc(sh.x, sh.y, sh.r, Math.PI, TAU);
      c.closePath();
      return;
    }
    const hw = sh.w / 2, hh = sh.h / 2, cs = Math.cos(sh.a), sn = Math.sin(sh.a);
    const base = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [sh.x + x * cs - y * sn, sh.y + x * sn + y * cs]);
    const hull = convexHull([...base, ...base.map(([x, y]) => [x, y + DEPTH])]);
    c.moveTo(hull[0][0], hull[0][1]); for (let i = 1; i < hull.length; i++) c.lineTo(hull[i][0], hull[i][1]); c.closePath();
  }

  drawIsland(s, shapes, holes, theme, now) {
    const { ctx } = this;
    const visible = shapes.map((sh, i) => ({ sh, i, mat: materialFor(s.mp, i, s.c), over: !!theme.over?.[i] }))
      .filter(o => (o.sh.k === 'c' ? o.sh.r : Math.min(o.sh.w, o.sh.h)) > 2);
    if (!visible.length) return;
    const all = (fn) => { ctx.beginPath(); for (const o of visible) fn(o.sh); };

    // Gischt am Fuß der Insel
    ctx.fillStyle = 'rgba(234,247,255,0.32)';
    all(sh => this.shapePath(sh, 12 + Math.sin(now * 2) * 3, DEPTH)); ctx.fill();
    ctx.fillStyle = 'rgba(234,247,255,0.5)';
    all(sh => this.shapePath(sh, 5 + Math.sin(now * 2 + 1) * 2, DEPTH)); ctx.fill();

    // Seitenwand mit Kontur
    ctx.lineJoin = 'round';
    ctx.lineWidth = 7; ctx.strokeStyle = INK;
    all(sh => this.sidePath(sh)); ctx.stroke();
    for (const o of visible) {
      const sh = o.sh, ext = sh.k === 'c' ? sh.r : Math.max(sh.w, sh.h) / 2;
      const g = ctx.createLinearGradient(0, sh.y - ext, 0, sh.y + ext + DEPTH);
      g.addColorStop(0, o.mat.side); g.addColorStop(1, o.mat.sideDark);
      ctx.fillStyle = g;
      ctx.beginPath(); this.sidePath(sh); ctx.fill();
    }

    // Oberfläche: erst Kontur, dann Rand, dann Fläche – Überlappungen bleiben ohne Naht
    const layer = (list) => {
      ctx.lineWidth = 7; ctx.strokeStyle = INK;
      ctx.beginPath(); for (const o of list) this.shapePath(o.sh); ctx.stroke();
      for (const o of list) {
        ctx.beginPath(); this.shapePath(o.sh);
        ctx.fillStyle = o.mat.rimStripes ? this.stripes() : o.mat.rim; ctx.fill();
      }
      // ein gemeinsamer Verlauf pro Material, damit zusammengesetzte Inseln ohne Naht bleiben
      const grads = new Map();
      for (const o of list) {
        let g = grads.get(o.mat);
        if (!g) {
          g = ctx.createRadialGradient(-60, -100, 20, 0, 0, 360);
          g.addColorStop(0, o.mat.top); g.addColorStop(1, o.mat.top2);
          grads.set(o.mat, g);
        }
        ctx.fillStyle = g;
        ctx.beginPath(); this.shapePath(o.sh, -6); ctx.fill();
      }
      if (!this.low && !s.gr) for (const o of list) this.drawDeco(o, holes, now);
    };
    layer(visible.filter(o => !o.over));
    const over = visible.filter(o => o.over);
    if (over.length) layer(over);

    // Farbkampf-Flächen (auf die Insel beschnitten)
    if (s.gr) {
      ctx.save();
      all(sh => this.shapePath(sh, -6)); ctx.clip();
      const n = 28, cell = 24, off = n * cell / 2;
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < s.gr.length; i++) {
        const v = parseInt(s.gr[i], 36);
        if (!v) continue;
        ctx.fillStyle = COLORS[v - 1];
        ctx.fillRect((i % n) * cell - off, Math.floor(i / n) * cell - off, cell + 0.5, cell + 0.5);
      }
      ctx.restore();
    }

    // Löcher: Kontur, Rand, Tiefe und Wasser bzw. Lava
    for (const [hx, hy, hr] of holes) {
      const lava = theme.hole === 'lava' && s.c !== 'eis';
      const mat = visible[0].mat;
      const water = theme.water || DEFAULT_WATER;
      ctx.beginPath(); ctx.arc(hx, hy, hr + 3, 0, TAU); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = mat.rim; ctx.fill();
      ctx.save();
      ctx.beginPath(); ctx.arc(hx, hy, hr - 4, 0, TAU); ctx.clip();
      ctx.fillStyle = mat.sideDark; ctx.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
      const g = ctx.createRadialGradient(hx, hy + 10, 5, hx, hy + 10, hr);
      if (lava) { g.addColorStop(0, '#FFE066'); g.addColorStop(0.5, '#FF7A2A'); g.addColorStop(1, '#C2361E'); }
      else { g.addColorStop(0, water[0]); g.addColorStop(1, water[1]); }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(hx, hy + DEPTH * 0.7, hr, 0, TAU); ctx.fill();
      if (lava) for (let i = 0; i < 5; i++) { const t = (now * 0.6 + hash(i)) % 1, a = hash(i + 4) * TAU, r = hash(i + 8) * hr * 0.7; ctx.fillStyle = `rgba(255,240,150,${1 - t})`; ctx.beginPath(); ctx.arc(hx + Math.cos(a) * r, hy + DEPTH * 0.7 + Math.sin(a) * r * 0.6, 3 + t * 6, 0, TAU); ctx.fill(); }
      ctx.restore();
    }

    if (s.ph === 'play' && s.sk) {
      ctx.strokeStyle = `rgba(255,107,107,${0.55 + Math.sin(now * 8) * 0.3})`;
      ctx.setLineDash([14, 10]); ctx.lineWidth = 5;
      all(sh => this.shapePath(sh)); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  drawDeco(o, holes, now) {
    const { ctx } = this;
    const { sh, i: si, mat } = o;
    ctx.save();
    ctx.beginPath(); this.shapePath(sh, -6); ctx.clip();
    ctx.translate(sh.x, sh.y); ctx.rotate(sh.a);
    if (mat.lines) mat.lines(ctx, sh);
    const area = sh.k === 'c' ? Math.PI * sh.r * sh.r : sh.w * sh.h;
    const N = Math.min(60, Math.floor(area / (mat.density || 5000)));
    const cs = Math.cos(sh.a), sn = Math.sin(sh.a);
    for (let i = 0; i < N; i++) {
      const h1 = hash(si * 97 + i * 13.1), h2 = hash(si * 31 + i * 7.7 + 3), h3 = hash(si * 7 + i * 3.3 + 11);
      let lx, ly;
      if (sh.k === 'c') { const rr = Math.sqrt(h1) * (sh.r - 14), a = h2 * TAU; lx = Math.cos(a) * rr; ly = Math.sin(a) * rr; }
      else { lx = (h1 - 0.5) * (sh.w - 28); ly = (h2 - 0.5) * (sh.h - 28); }
      const wx = sh.x + lx * cs - ly * sn, wy = sh.y + lx * sn + ly * cs;
      if (holes.some(([hx, hy, hr]) => Math.hypot(wx - hx, wy - hy) < hr + 14)) continue;
      mat.deco(ctx, lx, ly, h3, now);
    }
    ctx.restore();
  }

  // Warnstreifen für den Blech-Rand
  stripes() {
    if (this._stripes) return this._stripes;
    const c = document.createElement('canvas');
    c.width = c.height = 24;
    const x = c.getContext('2d');
    x.fillStyle = '#FFC93C'; x.fillRect(0, 0, 24, 24);
    x.fillStyle = INK;
    x.beginPath(); x.moveTo(0, 12); x.lineTo(12, 0); x.lineTo(24, 0); x.lineTo(0, 24); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(12, 24); x.lineTo(24, 12); x.lineTo(24, 24); x.closePath(); x.fill();
    this._stripes = this.ctx.createPattern(c, 'repeat');
    return this._stripes;
  }

  // ---------- Objekte auf der Insel ----------

  drawWorldObjects(s, now) {
    const { ctx } = this;
    // Hügel-Zone
    if (s.zn) {
      const [zx, zy, zr, owner] = s.zn;
      const oc = owner && owner !== 'contested' ? s.p.find(p => p.id === owner)?.c : null;
      const pulse = 1 + Math.sin(now * 5) * 0.04;
      ctx.fillStyle = oc ? hexA(oc, 0.35) : owner === 'contested' ? 'rgba(255,107,107,0.28)' : 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(zx, zy, zr * pulse, 0, TAU); ctx.fill();
      ctx.strokeStyle = oc || (owner === 'contested' ? '#FF6B6B' : '#fff');
      ctx.lineWidth = 6; ctx.setLineDash([18, 12]); ctx.lineDashOffset = -now * 40;
      ctx.beginPath(); ctx.arc(zx, zy, zr * pulse, 0, TAU); ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
      drawIcon(ctx, 'huegel', zx, zy - 6, 46, 0.85);
    }

    // Münzen (drehen sich)
    for (const [x, y] of s.cn || []) {
      const wv = Math.abs(Math.cos(now * 4 + x * 0.1));
      ctx.fillStyle = 'rgba(42,27,61,0.25)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 10, 10, 4, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(x, y - 4 + Math.sin(now * 3 + x) * 2); ctx.scale(Math.max(0.15, wv), 1);
      drawIcon(ctx, 'muenze', 0, 0, 26);
      ctx.restore();
    }

    // Bananenschalen
    for (const [x, y] of s.bn || []) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(hash(x * 0.1 + y) * TAU);
      drawIcon(ctx, 'banana', 0, 0, 28);
      ctx.restore();
    }

    // Power-ups in Seifenblasen
    for (const [x, y, type, fading] of s.it || []) {
      if (fading && Math.sin(now * 20) > 0) continue;
      const by = y - 6 + Math.sin(now * 3 + x) * 4;
      ctx.fillStyle = 'rgba(42,27,61,0.22)'; ctx.beginPath(); ctx.ellipse(x + 3, y + 14, 14, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, by, 21, 0, TAU); ctx.fill(); ctx.stroke();
      drawIcon(ctx, type, x, by, 30);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.ellipse(x - 9, by - 11, 5, 3, -0.6, 0, TAU); ctx.fill();
    }

    // Bumper als kleine Säulen
    for (const [x, y, r] of s.bu) {
      ctx.fillStyle = '#B83D7A'; ctx.lineWidth = 4; ctx.strokeStyle = INK;
      ctx.beginPath(); ctx.ellipse(x, y + 10, r, r * 0.55, 0, 0, Math.PI); ctx.lineTo(x - r, y); ctx.ellipse(x, y, r, r * 0.55, 0, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.62); drawIcon(ctx, 'flipper', 0, 0, r * 2.15); ctx.restore();
    }

    // Bomben mit Warnkreis
    for (const [x, y, k] of s.bm) {
      const blink = Math.sin(now * (10 + (1 - k) * 30)) > 0;
      ctx.fillStyle = blink ? 'rgba(255,107,107,0.35)' : 'rgba(255,107,107,0.15)';
      ctx.beginPath(); ctx.arc(x, y, 95, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,107,107,0.9)'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.arc(x, y, 95, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 95 * k, 0, TAU); ctx.stroke();
      drawIcon(ctx, 'bomb', x, y - 6, 34 + (1 - k) * 10 + (blink ? 2 : 0));
    }
  }

  // ---------- Insel-Mechaniken ----------

  // Dauerhafte Anzeigen: Drehpfeile (Drehkreuz, Karussell), Rutsch-Pfeile (Wippe), Kisten
  drawMapMechanic(s, shapes, now) {
    const { ctx } = this;
    const mx = s.mx;
    if (mx && mx.sp) {
      // 6 Pfeile im Kreis um die Insel: blinken bei Warnung, leuchten im Turbo
      const warnBlink = mx.sp === 1 && Math.sin(now * 14) < 0;
      if (!warnBlink) {
        const R = 365, n = 6, rot = now * (mx.sp === 2 ? 2.2 : 0.6) * mx.dir;
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const a0 = rot + i / n * TAU, a1 = a0 + 0.55 * mx.dir;
          const col = mx.sp === 2 ? '#FF7A2A' : '#FFC93C';
          ctx.beginPath(); ctx.arc(0, 0, R, Math.min(a0, a1), Math.max(a0, a1)); ctx.lineWidth = 15; ctx.strokeStyle = INK; ctx.stroke();
          ctx.lineWidth = 8; ctx.strokeStyle = col; ctx.stroke();
          const hx = Math.cos(a1) * R, hy = Math.sin(a1) * R, tx = -Math.sin(a1) * mx.dir, ty = Math.cos(a1) * mx.dir;
          ctx.beginPath(); ctx.moveTo(hx + tx * 22, hy + ty * 22); ctx.lineTo(hx - ty * 16, hy + tx * 16); ctx.lineTo(hx + ty * 16, hy - tx * 16); ctx.closePath();
          ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
        }
        ctx.restore();
      }
    }
    if (mx && mx.sl != null && shapes[0]) {
      // Wippe: Pfeile auf dem Floß zeigen, wohin alle rutschen
      const sh = shapes[0], k = Math.abs(mx.sl);
      if (k > 0.15) {
        ctx.save();
        ctx.translate(sh.x, sh.y); ctx.rotate(sh.a);
        ctx.globalAlpha = Math.min(0.85, k);
        const dir = Math.sign(mx.sl), off = (now * 120 * dir) % 80;
        ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        for (let x = -240; x <= 240; x += 80) {
          const cx = x + off;
          if (Math.abs(cx) > 250) continue;
          for (const y of [-60, 60]) { ctx.beginPath(); ctx.moveTo(cx - dir * 14, y - 22); ctx.lineTo(cx + dir * 14, y); ctx.lineTo(cx - dir * 14, y + 22); ctx.stroke(); }
        }
        ctx.restore();
      }
    }
    // Kisten
    for (const [x, y, r, a] of s.kx || []) {
      ctx.fillStyle = 'rgba(42,27,61,0.25)'; ctx.beginPath(); ctx.ellipse(x + 4, y + r * 0.7, r * 1.05, r * 0.4, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = '#8A5A2E'; ctx.fillRect(-r, -r + 10, r * 2, r * 2); // Seitenwand
      ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.strokeRect(-r, -r + 10, r * 2, r * 2);
      ctx.restore();
      ctx.save(); ctx.translate(x, y - 4); ctx.rotate(a);
      drawIcon(ctx, 'kiste', 0, 0, r * 2.1);
      ctx.restore();
    }
  }

  // Warnungen am Boden: wachsender Schatten, bebende Erde, leuchtende Inselteile
  drawHazardsGround(s, shapes, now) {
    const { ctx } = this;
    for (const [kind, x, y, r, p, i] of s.hz || []) {
      const blink = Math.sin(now * (8 + p * 24)) > 0;
      if (kind === 'sink') {
        const sh = shapes[i];
        if (!sh) continue;
        ctx.save();
        ctx.beginPath(); this.shapePath(sh, -6); ctx.clip();
        ctx.fillStyle = `rgba(30,80,140,${0.1 + p * 0.35})`;
        ctx.fillRect(sh.x - 400, sh.y - 400, 800, 800);
        // Blasen steigen auf
        for (let b = 0; b < 10; b++) {
          const t = (now * 0.9 + hash(b * 3.3)) % 1, bx = sh.x + (hash(b * 5.1) - 0.5) * (sh.k === 'c' ? sh.r * 1.6 : sh.w * 0.9), by = sh.y + (hash(b * 7.9) - 0.5) * (sh.k === 'c' ? sh.r * 1.6 : sh.h * 0.9);
          ctx.strokeStyle = `rgba(234,247,255,${(1 - t) * (0.4 + p * 0.6)})`; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(bx, by - t * 20, 4 + t * 6, 0, TAU); ctx.stroke();
        }
        ctx.restore();
        ctx.beginPath(); this.shapePath(sh);
        ctx.setLineDash([16, 10]); ctx.lineDashOffset = -now * 60;
        ctx.lineWidth = 7; ctx.strokeStyle = blink ? '#FF6B6B' : '#FFF6E5'; ctx.stroke();
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
        continue;
      }
      if (kind === 'mole') {
        // Die Erde bebt: Hügel wächst, Krümel springen
        const jx = Math.sin(now * 40) * 2 * p;
        ctx.fillStyle = `rgba(90,60,30,${0.25 + p * 0.5})`;
        ctx.beginPath(); ctx.ellipse(x + jx, y, r * (0.5 + p * 0.5), r * (0.35 + p * 0.35), 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = blink ? '#FF6B6B' : 'rgba(255,246,229,0.8)'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        for (let b = 0; b < 5; b++) { const t = (now * 2.5 + hash(b)) % 1, a = hash(b + 3) * TAU; ctx.fillStyle = '#6B4A2A'; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.5 * t, y + Math.sin(a) * r * 0.3 * t - Math.sin(t * Math.PI) * 18, 4, 0, TAU); ctx.fill(); }
        continue;
      }
      // Etwas fällt vom Himmel: Schatten wächst, roter Kreis zeigt die Wirkung
      ctx.fillStyle = `rgba(42,27,61,${0.12 + p * 0.3})`;
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.35 * (0.4 + p), r * 0.2 * (0.4 + p), 0, 0, TAU); ctx.fill();
      ctx.fillStyle = blink ? 'rgba(255,107,107,0.22)' : 'rgba(255,107,107,0.1)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,107,107,0.9)'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r * (1 - p), 0, TAU); ctx.stroke();
    }
  }

  // Was vom Himmel fällt, wird über den Blobs gezeichnet
  drawHazardsAir(s, now) {
    const { ctx } = this;
    for (const [kind, x, y, r, p] of s.hz || []) {
      if (kind === 'kokos' || kind === 'crate') {
        if (p < 0.55) continue;
        const k = (p - 0.55) / 0.45, h = (1 - k) * 420;
        ctx.save(); ctx.translate(x, y - h); ctx.rotate(now * 6);
        drawIcon(ctx, kind === 'kokos' ? 'kokos' : 'kiste', 0, 0, kind === 'kokos' ? 40 : 64);
        ctx.restore();
      } else if (kind === 'lava') {
        // Flugbahn aus dem Krater
        if (p < 0.35) continue;
        const k = (p - 0.35) / 0.65, bx = x * k, by = y * k - Math.sin(k * Math.PI) * 260;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.atan2(y, x) + Math.PI / 2 * (k * 2 - 1) * 0.3);
        drawIcon(ctx, 'lava', 0, 0, 44);
        ctx.restore();
        if (!this.low && Math.random() < 0.5) this.fx.push({ type: 'dot', x: bx, y: by, vx: 0, vy: 30, life: 0.4, max: 0.4, color: '#FFB347', r: 5 });
      }
    }
  }

  // ---------- Blobs ----------

  updateJiggle(s, dt) {
    for (const p of s.p) {
      let j = this.jiggle.get(p.id);
      if (!j) { j = { x: 0, v: 0 }; this.jiggle.set(p.id, j); }
      j.px = p.x; j.py = p.y;
      // gedämpfte Feder
      j.v += (-140 * j.x - 7 * j.v) * dt;
      j.x += j.v * dt;
      j.x = Math.max(-0.3, Math.min(0.3, j.x));
    }
  }

  drawBlobShadow(p) {
    const { ctx } = this;
    const k = p.st === 'falling' ? Math.max(0, 1 - p.f * 2) : 1;
    if (k <= 0) return;
    ctx.fillStyle = `rgba(42,27,61,${0.25 * k})`;
    ctx.beginPath(); ctx.ellipse(p.x + 4, p.y + p.r * 0.75, p.r * (p.br ? 1.2 : 0.95), p.r * 0.38, 0, 0, TAU); ctx.fill();
  }

  moodOf(p, s) {
    if (p.st === 'falling' || p.wb) return 'panic';
    if (p.dz || p.sl) return 'dizzy';
    if (p.ch >= 0 || p.br) return 'strain';
    if ((s.ph === 'roundEnd' && (s.rw === p.id || (s.rws || []).includes(p.id))) || (s.ph === 'matchEnd' && s.ch === p.id)) return 'triumph';
    if (s.cr.includes(p.id)) return 'smug';
    return 'normal';
  }

  // Siegestanz: Rundensieger und Inselkönig tanzen (Kosmetik aus js/cosmetics.js)
  drawBlob(p, s, myId, now) {
    const dancing = p.st === 'alive' && ((s.ph === 'roundEnd' && ((s.rws || []).includes(p.id) || s.rw === p.id)) || (s.ph === 'matchEnd' && s.ch === p.id));
    if (!dancing) { this.drawBlobInner(p, s, myId, now); return; }
    const { ctx } = this;
    const id = DANCES[p.dn]?.id || 'huepf';
    let dx = 0, dy = 0, rot = 0, sx = 1, sy = 1;
    if (id === 'huepf') { const h = Math.abs(Math.sin(now * 7)); dy = -h * 18; sy = 0.9 + h * 0.15; sx = 2 - sy; }
    else if (id === 'dreh') rot = now * 7;
    else if (id === 'wackel') { rot = Math.sin(now * 10) * 0.35; dx = Math.sin(now * 5) * 8; }
    else if (id === 'flip') { const u = (now % 1.2) / 0.55; if (u < 1) { rot = u * TAU; dy = -Math.sin(u * Math.PI) * 40; } }
    else if (id === 'puls') { sx = sy = 1 + Math.abs(Math.sin(now * 5)) * 0.25; }
    ctx.save();
    ctx.translate(p.x + dx, p.y + dy); ctx.rotate(rot); ctx.scale(sx, sy); ctx.translate(-p.x, -p.y);
    this.drawBlobInner(p, s, myId, now);
    ctx.restore();
  }

  // Spuren: schnelle Blobs ziehen Funken, Blasen, Herzchen … hinter sich her
  emitTrails(s, dt) {
    this.trailAcc ||= new Map();
    for (const p of s.p) {
      if (!p.tr || p.st !== 'alive' || p.iv) continue;
      const sp = Math.hypot(p.vx, p.vy);
      if (sp < 170 && !p.dt) continue;
      const acc = (this.trailAcc.get(p.id) || 0) + dt * (this.low ? 10 : 24) * Math.min(2, sp / 300);
      let n = Math.floor(acc);
      this.trailAcc.set(p.id, acc - n);
      const kind = TRAILS[p.tr]?.id;
      while (n-- > 0) {
        const a = Math.random() * TAU, bx = p.x - p.vx / sp * p.r * 0.8 + Math.cos(a) * p.r * 0.4, by = p.y - p.vy / sp * p.r * 0.8 + Math.sin(a) * p.r * 0.4;
        const life = 0.5 + Math.random() * 0.4;
        this.fx.push({ type: 'trail', kind, x: bx, y: by, vx: (Math.random() - 0.5) * 40, vy: kind === 'blasen' ? -40 : (Math.random() - 0.5) * 40, life, max: life, r: 4 + Math.random() * 4, rot: Math.random() * TAU, hue: (performance.now() / 4) % 360 });
      }
    }
  }

  drawBlobInner(p, s, myId, now) {
    const { ctx } = this;
    const me = p.id === myId;
    let scale = 1, alpha = 1, sink = 0;
    if (p.st === 'falling') { scale = Math.max(0.05, 1 - p.f * 0.8); alpha = Math.max(0, 1 - p.f); sink = p.f * DEPTH * 1.4; }
    // Tarnkappe: für andere ein Flimmern mit gestricheltem Umriss (auch auf dem Handy noch
    // zu verfolgen, nur ohne Namen), beim Dash kurz voll sichtbar; für dich halb durchsichtig
    const cloaked = p.iv && p.st === 'alive' && !p.dt;
    if (cloaked) alpha = me ? 0.6 : 0.16 + Math.max(0, Math.sin(now * 13 + p.x)) * 0.1;
    const hidden = cloaked && !me;
    const sp = Math.hypot(p.vx, p.vy);
    const stretch = Math.min(0.28, sp / 2000);
    const ang = Math.atan2(p.vy, p.vx);
    const j = this.jiggle.get(p.id) || { x: 0 };
    const breathe = Math.sin(now * 3 + p.ci) * 0.025;
    const charging = p.ch >= 0 && p.st === 'alive';
    const squeeze = charging ? 1 - 0.18 * p.ch : 1;
    const jitter = charging && p.ch >= 1 ? Math.sin(now * 60) * 1.5 : 0;
    const r = p.r * scale * squeeze;
    const x = p.x + jitter, y = p.y + sink;
    const mood = this.moodOf(p, s);
    const slimy = s.ig === p.id && p.st === 'alive';

    const team = s.te && s.te[p.id] != null ? TEAMS[s.te[p.id]] : null;
    const boss = s.bo === p.id;
    if (p.st === 'alive') {
      if (team) {
        // Team-Ring am Boden
        ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r * 0.55, p.r * 1.12, p.r * 0.5, 0, 0, TAU);
        ctx.lineWidth = 10; ctx.strokeStyle = INK; ctx.stroke();
        ctx.lineWidth = 6; ctx.strokeStyle = team.color; ctx.stroke();
      }
      if (boss) {
        const R = p.r * (1.35 + Math.sin(now * 5) * 0.06);
        const g = ctx.createRadialGradient(p.x, p.y, p.r * 0.8, p.x, p.y, R);
        g.addColorStop(0, 'rgba(160,60,200,0.5)'); g.addColorStop(1, 'rgba(160,60,200,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.fill();
      }
      if (cloaked) {
        ctx.save();
        ctx.setLineDash([8, 9]); ctx.lineDashOffset = -now * 40;
        ctx.lineWidth = 3; ctx.strokeStyle = me ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 3, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    // Ladering und Glühen: zeigt allen, dass gleich ein starker Dash kommt
    if (charging && !hidden) {
      const R = r * (1.6 + p.ch * 0.6);
      const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, R);
      g.addColorStop(0, hexA(p.c, 0.5 * p.ch)); g.addColorStop(1, hexA(p.c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.arc(x, y, p.r + 11, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.05, p.ch)); ctx.stroke();
      ctx.strokeStyle = p.ch >= 1 ? '#FFFFFF' : p.c; ctx.lineWidth = 4; ctx.stroke();
    }
    if (p.dt && p.dk > 0.4 && !hidden) {
      const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.8);
      g.addColorStop(0, hexA(p.c, 0.45)); g.addColorStop(1, hexA(p.c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, TAU); ctx.fill();
    }
    if (p.wb && !hidden) this.drawArms(p, r, now);

    ctx.translate(x, y);
    if (p.sl) ctx.rotate(now * 14);
    if (p.br) ctx.scale(1.18 - j.x * 0.5, 0.84 + j.x * 0.5); // breit und flach: festgekrallt
    else {
      ctx.rotate(ang);
      ctx.scale(1 + stretch + breathe + j.x, 1 - stretch * 0.7 - breathe - j.x);
      ctx.rotate(-ang);
    }
    if (!hidden) drawBody(ctx, r, p.c, p.ci, this.low);
    else { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = 'rgba(225,242,255,0.9)'; ctx.fill(); }  // gläserner Blob
    if (slimy && !hidden) {
      ctx.fillStyle = 'rgba(123,224,60,0.75)';
      ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.98, Math.PI, 0);
      for (let i = 0; i <= 5; i++) ctx.lineTo(r * 0.98 - i * r * 0.39, r * 0.05 + (i % 2 ? r * 0.38 + Math.sin(now * 6 + i) * 4 : 0));
      ctx.closePath(); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    }
    if (p.br && !hidden) {
      // Stemmen: steinerne Kontur, im perfekten Moment hell
      ctx.strokeStyle = p.br === 2 ? '#FFFFFF' : '#8FA3B8';
      ctx.lineWidth = p.br === 2 ? 7 : 5;
      ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, TAU); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      for (const k of [-0.6, -0.2, 0.2, 0.6]) { ctx.beginPath(); ctx.moveTo(k * r, r * 0.85); ctx.lineTo(k * r * 1.3, r * 1.2); ctx.stroke(); }
    }
    if (p.pw.includes('anchor') && !hidden) { ctx.strokeStyle = '#596E85'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, TAU); ctx.stroke(); }
    if (p.pw.includes('glove') && !hidden) { ctx.strokeStyle = 'rgba(232,72,60,0.85)'; ctx.lineWidth = 4; ctx.setLineDash([6, 6]); ctx.lineDashOffset = now * 30; ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();

    if (hidden) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    drawFace(ctx, x, y, r, p.fx || 0, p.fy || 1, mood, now);
    if (p.wb) this.drawSweat(x, y, r, now);
    if (p.dz && p.st === 'alive') this.drawStars(x, y, r, now);
    // Gestrichelter Ring unter dem eigenen Blob, damit man sich sofort findet
    if (me && p.st === 'alive') { ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.5; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.ellipse(x, y + r * 0.75, r * 1.25, r * 0.5, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }

    if (p.st === 'alive') {
      let top = y - r;
      if (boss) for (const sd of [-1, 1]) {
        // Boss-Hörner
        ctx.beginPath(); ctx.moveTo(x + sd * r * 0.3, top + r * 0.3); ctx.quadraticCurveTo(x + sd * r * 0.75, top - r * 0.1, x + sd * r * 0.85, top - r * 0.55);
        ctx.quadraticCurveTo(x + sd * r * 0.55, top + r * 0.05, x + sd * r * 0.62, top + r * 0.42); ctx.closePath();
        ctx.fillStyle = '#FFF6E5'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
      }
      if (p.h) { drawHat(ctx, p.h, x, top + r * 0.12, r * 1.25); top -= r * 0.9; }
      if (s.cr.includes(p.id)) { drawIcon(ctx, 'krone', x, top - 6, 26); top -= 20; }
      if (slimy) { drawIcon(ctx, 'glibber', x, top - 10, 22); top -= 22; }
      if (s.po === p.id) {
        const jig = Math.sin(now * (8 + 30 / Math.max(1, s.pt))) * 3;
        drawIcon(ctx, 'kartoffel', x + jig, top - 14, 34);
        ctx.font = `16px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.strokeText(Math.ceil(s.pt), x + 22, top - 26);
        ctx.fillStyle = s.pt < 3 ? '#FF6B6B' : '#fff'; ctx.fillText(Math.ceil(s.pt), x + 22, top - 26);
        top -= 30;
      }
      drawNameTag(ctx, x, top - 4, boss ? `BOSS ${p.n}` : p.n, team ? team.color : boss ? '#7A3FA0' : p.c);
      top -= 24;
      if (s.mo === 'leben' && p.lv > 0) for (let i = 0; i < p.lv; i++) drawIcon(ctx, 'herz', x + (i - (p.lv - 1) / 2) * 13, y + r + 12, 13);
      // aktive Power-ups kreisen um den Blob
      const pws = p.pw ? p.pw.split(',').filter(k => k && k !== 'invis') : [];
      pws.forEach((k, i) => {
        const a = now * 2.5 + i * (TAU / pws.length);
        drawIcon(ctx, k, x + Math.cos(a) * (r + 16), y + Math.sin(a) * (r + 16), 18);
      });
      if (p.em >= 0) this.drawBubble(x, top - 4, EMOTE_IDS[p.em]);
    }
    ctx.restore();
  }

  // Rudernde Ärmchen beim Wackeln an der Kante
  drawArms(p, r, now) {
    const { ctx } = this;
    ctx.save();
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const a = now * 22 * side;
      const bx = p.x + side * r * 0.9, by = p.y - r * 0.1;
      const ex = bx + side * r * 0.6 + Math.cos(a) * r * 0.35, ey = by - r * 0.35 + Math.sin(a) * r * 0.45;
      ctx.strokeStyle = INK; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + side * r * 0.5, by - r * 0.6, ex, ey); ctx.stroke();
      ctx.strokeStyle = p.c; ctx.lineWidth = 4.5; ctx.stroke();
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(ex, ey, 5, 0, TAU); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    }
    ctx.restore();
  }

  drawSweat(x, y, r, now) {
    const { ctx } = this;
    const k = (now * 2.5) % 1;
    const sx = x + r * 0.78, sy = y - r * 0.7 + k * 10;
    ctx.fillStyle = '#9ED8F5'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, sy - 7); ctx.quadraticCurveTo(sx + 6, sy + 2, sx, sy + 5); ctx.quadraticCurveTo(sx - 6, sy + 2, sx, sy - 7); ctx.fill(); ctx.stroke();
  }

  // Benommen: Sternchen kreisen über dem Kopf
  drawStars(x, y, r, now) {
    const { ctx } = this;
    for (let i = 0; i < 3; i++) {
      const a = now * 5 + i * 2.09;
      const sx = x + Math.cos(a) * r * 0.85, sy = y - r * 1.1 + Math.sin(a) * r * 0.25;
      ctx.beginPath();
      for (let k = 0; k < 10; k++) { const aa = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 2.6 : 6.5; ctx.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr); }
      ctx.closePath(); ctx.fillStyle = '#FFC93C'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.stroke();
    }
  }

  // Bewegungsspuren bei hohem Tempo
  drawTrails(s, dt) {
    const { ctx } = this;
    const seen = new Set();
    for (const p of s.p) {
      if (p.st !== 'alive') continue;
      seen.add(p.id);
      let tr = this.trails.get(p.id);
      if (!tr) { tr = []; this.trails.set(p.id, tr); }
      if (Math.hypot(p.vx, p.vy) > 520 || p.dk > 0.4) tr.push({ x: p.x, y: p.y, r: p.r, life: 0.22 });
      for (const t of tr) t.life -= dt;
      while (tr.length && tr[0].life <= 0) tr.shift();
      if (p.iv) continue;
      for (const t of tr) {
        ctx.globalAlpha = Math.max(0, t.life / 0.22) * 0.35;
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(t.x, t.y, t.r * (0.6 + t.life * 1.5), 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const id of this.trails.keys()) if (!seen.has(id)) this.trails.delete(id);
  }

  drawBubble(x, y, iconId) {
    const { ctx } = this;
    ctx.fillStyle = '#FFF6E5'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y - 20, 22, 19, 0, 0, TAU);
    ctx.moveTo(x - 6, y - 3); ctx.lineTo(x, y + 7); ctx.lineTo(x + 6, y - 3);
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y - 20, 20.5, 17.5, 0, 0, TAU); ctx.fill();
    drawIcon(ctx, iconId, x, y - 20, 30);
  }

  drawGhost(p, myId, now) {
    const { ctx } = this;
    const r = 20;
    const bob = Math.sin(now * 3 + p.x) * 4;
    ctx.save();
    ctx.globalAlpha = p.id === myId ? 0.85 : 0.55;
    ctx.translate(p.x, p.y + bob);
    ctx.beginPath();
    ctx.arc(0, -4, r, Math.PI, 0);
    for (let i = 0; i <= 6; i++) ctx.lineTo(r - (i / 6) * r * 2, r * 0.9 + Math.sin(now * 8 + i * 1.5) * 3 + (i % 2 ? -5 : 0));
    ctx.closePath();
    ctx.fillStyle = '#F4F6FF'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = p.c; ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.ellipse(-7, -6, 3.5, 4.5, 0, 0, TAU); ctx.ellipse(7, -6, 3.5, 4.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 6, 3.5, 5, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    if (p.id === myId && p.dc <= 0 && this.phase === 'play') drawIcon(ctx, 'pups', 0, -38, 24 + Math.sin(now * 8) * 2);
    ctx.font = `12px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeText(p.n, 0, r + 16);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillText(p.n, 0, r + 16);
    ctx.restore();
    if (p.em >= 0) this.drawBubble(p.x, p.y - 28, EMOTE_IDS[p.em]);
  }

  // ---------- Effekte ----------

  drawFx(f) {
    const { ctx } = this;
    const k = Math.max(0, f.life / f.max);
    ctx.save();
    ctx.globalAlpha = k;
    switch (f.type) {
      case 'ring':
        ctx.strokeStyle = f.color; ctx.lineWidth = f.w * k + 1;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * (f.flat || 1), 0, 0, TAU); ctx.stroke();
        break;
      case 'flash':
        ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.2 - k * 0.2), 0, TAU); ctx.fill();
        break;
      case 'dot': case 'drop':
        ctx.fillStyle = f.color;
        ctx.beginPath();
        if (f.type === 'drop') { const r = f.r * (0.4 + k * 0.6); ctx.ellipse(f.x, f.y, r, r * 1.3, Math.atan2(f.vy, f.vx) + Math.PI / 2, 0, TAU); }
        else ctx.arc(f.x, f.y, f.r * k, 0, TAU);
        ctx.fill();
        break;
      case 'cloud':
        ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.6 - k), 0, TAU); ctx.fill();
        break;
      case 'shard':
        ctx.translate(f.x, f.y); ctx.rotate(f.rot + (1 - k) * 6);
        ctx.fillStyle = f.color; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-f.r, -f.r * 0.4); ctx.lineTo(f.r, 0); ctx.lineTo(-f.r * 0.3, f.r * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      case 'text': {
        const pop = 1 + Math.max(0, (k - 0.85) * 4);
        ctx.translate(f.x, f.y); ctx.scale(pop, pop);
        ctx.font = `${f.size || 20}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = INK;
        ctx.strokeText(f.text, 0, 0); ctx.fillStyle = f.color; ctx.fillText(f.text, 0, 0);
        if (f.icon) drawIcon(ctx, f.icon, ctx.measureText(f.text).width / 2 + 14, 0, (f.size || 20) * 1.1);
        break;
      }
      case 'trail': {
        ctx.translate(f.x, f.y); ctx.rotate(f.rot + (1 - k) * 3);
        const r = f.r * (0.5 + k * 0.5);
        ctx.lineWidth = 2; ctx.strokeStyle = INK;
        if (f.kind === 'funken') { ctx.fillStyle = '#FFE066'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.35 : r * 1.3, a = i * Math.PI / 4; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
        else if (f.kind === 'blasen') { ctx.strokeStyle = 'rgba(234,247,255,0.9)'; ctx.beginPath(); ctx.arc(0, 0, r * 1.2, 0, TAU); ctx.stroke(); }
        else if (f.kind === 'herzen') { ctx.fillStyle = '#FF5FA2'; ctx.beginPath(); ctx.moveTo(0, r); ctx.bezierCurveTo(-r * 1.6, -r * 0.2, -r * 0.7, -r * 1.3, 0, -r * 0.5); ctx.bezierCurveTo(r * 0.7, -r * 1.3, r * 1.6, -r * 0.2, 0, r); ctx.fill(); ctx.stroke(); }
        else if (f.kind === 'regenbogen') { ctx.fillStyle = `hsl(${f.hue},90%,62%)`; ctx.beginPath(); ctx.arc(0, 0, r * 1.2, 0, TAU); ctx.fill(); }
        else if (f.kind === 'sterne') { ctx.fillStyle = '#FFF6C9'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r * 1.2, a = i * Math.PI / 5; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
        else if (f.kind === 'konfetti') { ctx.fillStyle = ['#E8483C', '#4DB3EA', '#FFE066', '#5ED6A0', '#CC79A7'][Math.floor(f.hue / 7) % 5]; ctx.fillRect(-r, -r * 0.5, r * 2, r); }
        break;
      }
      case 'star':
        ctx.fillStyle = '#FFF3C4'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, rr = i % 2 ? f.r * 0.4 : f.r * (1.3 - k * 0.3); ctx.lineTo(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      default:
    }
    ctx.restore();
  }

  // ---------- Kamera & Debug ----------

  // im letzten Duell sanft auf die beiden zoomen, in der Wiederholung auf den Schubser, sonst ganze Insel
  updateCamera(s, dt) {
    let tx = 0, ty = 0, tz = 1;
    const duel = s && s.duel && s.ph === 'play' ? s.p.filter(p => s.duel.includes(p.id) && p.st !== 'ghost') : [];
    if (this.focus) {
      // Wiederholung: auf den Moment des Schubsers zoomen
      tz = 1.5; tx = this.focus.x * 0.8; ty = this.focus.y * 0.8;
    } else if (duel.length === 2) {
      const [a, b] = duel;
      const span = Math.max(Math.hypot(a.x - b.x, a.y - b.y) + 280, 360);
      tz = Math.max(1, Math.min(1.45, 800 * 0.8 / span));
      tx = (a.x + b.x) / 2 * 0.7; ty = (a.y + b.y) / 2 * 0.7;
    }
    const k = Math.min(1, dt * 2.5);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    this.cam.z += (tz - this.cam.z) * k;
  }

  // Hitboxen für die Debug-Ansicht (?debug)
  drawDebug(s, shapes, holes) {
    const { ctx } = this;
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,255,255,0.8)';
    for (const sh of shapes) { ctx.beginPath(); this.shapePath(sh); ctx.stroke(); }
    for (const [hx, hy, hr] of holes) { ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,0,0.8)';
    for (const [x, y] of s.it || []) { ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,80,0,0.8)';
    for (const [x, y] of s.bm || []) { ctx.beginPath(); ctx.arc(x, y, 95, 0, TAU); ctx.stroke(); }
    for (const p of s.p) {
      if (p.st === 'ghost') continue;
      ctx.strokeStyle = p.dt ? '#ff2020' : '#ff40ff';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 0.2, p.y + p.vy * 0.2); ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.fx * (p.r + 10), p.y + p.fy * (p.r + 10)); ctx.stroke();
    }
    ctx.restore();
  }
}

function convexHull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of p.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
