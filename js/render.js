// Zeichnet einen (interpolierten) Snapshot auf das Canvas.
import { unpackShapes } from './geometry.js';
import { COLORS, ITEMS, HATS, EMOTES } from './sim.js';

const VIEW_R = 400; // so viel Welt muss sichtbar sein

export class View {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.fx = [];      // Partikel / Ringe
    this.shake = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.cv.width = this.w * dpr; this.cv.height = this.h * dpr;
    this.cv.style.width = this.w + 'px'; this.cv.style.height = this.h + 'px';
    this.dpr = dpr;
    this.scale = Math.min(this.w, this.h) / (VIEW_R * 2);
  }

  addEvent(e, snap) {
    const col = (id) => snap?.p.find(p => p.id === id)?.c || '#fff';
    switch (e.k) {
      case 'plumps':
        for (let i = 0; i < 3; i++) this.fx.push({ type: 'ring', x: e.x, y: e.y, r: 10, vr: 90 + i * 40, life: 1.1, max: 1.1, color: '#e8f7ff', w: 4 });
        for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, s = 60 + Math.random() * 120; this.fx.push({ type: 'dot', x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.7, max: 0.7, color: '#bfe9ff', r: 4 }); }
        this.shake = Math.max(this.shake, 6);
        break;
      case 'boom':
        this.fx.push({ type: 'ring', x: e.x, y: e.y, r: 10, vr: 380, life: 0.35, max: 0.35, color: '#ffb347', w: 10 });
        for (let i = 0; i < 22; i++) { const a = Math.random() * 6.28, s = 100 + Math.random() * 250; this.fx.push({ type: 'dot', x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6, max: 0.6, color: i % 2 ? '#ff6b35' : '#ffd23f', r: 6 }); }
        this.shake = Math.max(this.shake, 14);
        break;
      case 'pups':
        this.fx.push({ type: 'ring', x: e.x, y: e.y, r: 10, vr: e.r * 2.6, life: 0.4, max: 0.4, color: '#a6e36a', w: 8 });
        for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28, s = 50 + Math.random() * 90; this.fx.push({ type: 'cloud', x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.9, max: 0.9, color: '#b5d86b', r: 14 }); }
        break;
      case 'boing':
        this.fx.push({ type: 'star', x: e.x, y: e.y, life: 0.25, max: 0.25, r: 14 + (e.p || 0) * 20 });
        this.shake = Math.max(this.shake, 2 + (e.p || 0) * 6);
        break;
      case 'dash':
        for (let i = 0; i < 6; i++) this.fx.push({ type: 'dot', x: e.x + (Math.random() - 0.5) * 20, y: e.y + (Math.random() - 0.5) * 20, vx: 0, vy: 0, life: 0.4, max: 0.4, color: col(e.id), r: 6 });
        break;
      case 'bumper':
        this.fx.push({ type: 'ring', x: e.x, y: e.y, r: 26, vr: 120, life: 0.2, max: 0.2, color: '#fff', w: 5 });
        break;
      case 'coin':
        this.fx.push({ type: 'text', x: e.x, y: e.y, vx: 0, vy: -60, life: 0.8, max: 0.8, text: '+1', color: '#ffd23f' });
        for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28; this.fx.push({ type: 'dot', x: e.x, y: e.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.4, max: 0.4, color: '#fff3a0', r: 3 }); }
        break;
      case 'coinloss': {
        const p = snap?.p.find(q => q.id === e.id);
        if (p) this.fx.push({ type: 'text', x: p.x, y: p.y - 30, vx: 0, vy: -40, life: 1.2, max: 1.2, text: `-${e.n} 🪙`, color: '#ff6b6b' });
        break;
      }
      case 'punch':
        this.fx.push({ type: 'star', x: e.x, y: e.y, life: 0.35, max: 0.35, r: 40 });
        this.fx.push({ type: 'text', x: e.x, y: e.y - 20, vx: 0, vy: -80, life: 0.7, max: 0.7, text: 'POW!', color: '#ff3b3b' });
        this.shake = Math.max(this.shake, 12);
        break;
      case 'slip':
        this.fx.push({ type: 'text', x: e.x, y: e.y - 25, vx: 0, vy: -50, life: 0.9, max: 0.9, text: 'HUII!', color: '#fff' });
        break;
      case 'item': {
        const p = snap?.p.find(q => q.id === e.id);
        if (p) this.fx.push({ type: 'ring', x: p.x, y: p.y, r: 20, vr: 160, life: 0.35, max: 0.35, color: '#fff', w: 6 });
        break;
      }
      case 'respawn': {
        const p = snap?.p.find(q => q.id === e.id);
        if (p) this.fx.push({ type: 'ring', x: p.x, y: p.y, r: 60, vr: -150, life: 0.35, max: 0.35, color: p.c, w: 6 });
        break;
      }
      case 'tag': {
        const p = snap?.p.find(q => q.id === e.id);
        if (p) for (let i = 0; i < 12; i++) { const a = Math.random() * 6.28, sp = 60 + Math.random() * 120; this.fx.push({ type: 'dot', x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.6, max: 0.6, color: '#7be03c', r: 5 }); }
        break;
      }
      default:
    }
  }

  draw(s, myId, dt, now) {
    this.phase = s && s.ph;
    const { ctx, w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.shake *= Math.pow(0.002, dt);
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;

    // Wasser
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    g.addColorStop(0, '#2a8fd0'); g.addColorStop(1, '#0f3e73');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const S = this.scale;
    ctx.save();
    ctx.translate(w / 2 + sx, h / 2 + sy + Math.min(30, h * 0.03));
    ctx.scale(S, S);

    // Wellen
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const r = ((now * 25 + i * 110) % 550) + 300;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    }

    if (!s) { ctx.restore(); return; }

    // Insel: Gischt, Sand, Gras – jeweils als Vereinigung aller Formen
    const shapes = unpackShapes(s.ar);
    const holes = s.ho || [];
    const ice = s.c === 'eis';
    const islandPath = (inf) => {
      ctx.beginPath();
      for (const sh of shapes) {
        if (sh.k === 'c') { if (sh.r + inf > 0) { ctx.moveTo(sh.x + sh.r + inf, sh.y); ctx.arc(sh.x, sh.y, sh.r + inf, 0, Math.PI * 2); } }
        else {
          ctx.save(); ctx.translate(sh.x, sh.y); ctx.rotate(sh.a);
          ctx.rect(-sh.w / 2 - inf, -sh.h / 2 - inf, sh.w + inf * 2, sh.h + inf * 2);
          ctx.restore();
        }
      }
    };
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    islandPath(14 + Math.sin(now * 2) * 3); ctx.fill();
    ctx.fillStyle = '#f3d98b';
    islandPath(8); ctx.fill();
    const ig = ctx.createRadialGradient(0, -100, 30, 0, 0, 340);
    ig.addColorStop(0, ice ? '#e9fbff' : '#8be06b'); ig.addColorStop(1, ice ? '#9ed8f0' : '#4fae47');
    ctx.fillStyle = ig;
    islandPath(0); ctx.fill();

    // Farbkampf-Flächen (auf die Insel beschnitten)
    if (s.gr) {
      ctx.save();
      islandPath(0); ctx.clip();
      const n = 28, cell = 24, off = n * cell / 2;
      ctx.globalAlpha = 0.62;
      for (let i = 0; i < s.gr.length; i++) {
        const v = parseInt(s.gr[i], 36);
        if (!v) continue;
        ctx.fillStyle = COLORS[v - 1];
        ctx.fillRect((i % n) * cell - off, Math.floor(i / n) * cell - off, cell + 0.5, cell + 0.5);
      }
      ctx.restore();
    }

    // Grasbüschel, die sich mit der Insel mitbewegen
    if (!ice && !s.gr) {
      ctx.strokeStyle = 'rgba(30,90,30,0.35)'; ctx.lineWidth = 3;
      ctx.beginPath();
      shapes.forEach((sh, si) => {
        const area = sh.k === 'c' ? Math.PI * sh.r * sh.r : sh.w * sh.h;
        const N = Math.min(40, Math.floor(area / 5000));
        for (let i = 0; i < N; i++) {
          const h1 = hash(si * 97 + i * 13.1), h2 = hash(si * 31 + i * 7.7 + 3);
          let lx, ly;
          if (sh.k === 'c') { const rr = Math.sqrt(h1) * (sh.r - 12), a = h2 * Math.PI * 2; lx = Math.cos(a) * rr; ly = Math.sin(a) * rr; }
          else { lx = (h1 - 0.5) * (sh.w - 24); ly = (h2 - 0.5) * (sh.h - 24); }
          const c = Math.cos(sh.a), sn = Math.sin(sh.a);
          const x = sh.x + lx * c - ly * sn, y = sh.y + lx * sn + ly * c;
          if (holes.some(([hx, hy, hr]) => Math.hypot(x - hx, y - hy) < hr + 12)) continue;
          ctx.moveTo(x - 5, y + 4); ctx.lineTo(x - 2, y - 4); ctx.moveTo(x, y + 4); ctx.lineTo(x + 2, y - 6); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + 6, y - 3);
        }
      });
      ctx.stroke();
    }
    if (s.ph === 'play' && s.sk) {
      ctx.strokeStyle = `rgba(255,60,60,${0.5 + Math.sin(now * 8) * 0.3})`;
      ctx.setLineDash([14, 10]); ctx.lineWidth = 4;
      islandPath(0); ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const [hx, hy, hr] of holes) {
      ctx.fillStyle = '#f3d98b';
      ctx.beginPath(); ctx.arc(hx, hy, hr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1d6fae';
      ctx.beginPath(); ctx.arc(hx, hy, hr - 8, 0, Math.PI * 2); ctx.fill();
    }

    // Hügel-Zone
    if (s.zn) {
      const [zx, zy, zr, owner] = s.zn;
      const oc = owner && owner !== 'contested' ? s.p.find(p => p.id === owner)?.c : null;
      const pulse = 1 + Math.sin(now * 5) * 0.04;
      ctx.fillStyle = oc ? hexA(oc, 0.35) : owner === 'contested' ? 'rgba(255,80,80,0.25)' : 'rgba(255,255,255,0.22)';
      ctx.beginPath(); ctx.arc(zx, zy, zr * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = oc || (owner === 'contested' ? '#ff5050' : '#fff');
      ctx.lineWidth = 5; ctx.setLineDash([18, 12]); ctx.lineDashOffset = -now * 40;
      ctx.beginPath(); ctx.arc(zx, zy, zr * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
      ctx.font = '34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000'; ctx.globalAlpha = 0.5; ctx.fillText('👑', zx, zy); ctx.globalAlpha = 1;
    }

    // Münzen
    for (const [x, y] of s.cn || []) {
      const wv = Math.abs(Math.cos(now * 4 + x * 0.1));
      ctx.fillStyle = '#c89100';
      ctx.beginPath(); ctx.ellipse(x, y + 2, 11 * wv + 1, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.ellipse(x, y, 11 * wv + 1, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.ellipse(x - 3 * wv, y - 3, 3 * wv, 4, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Bananenschalen
    ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
    for (const [x, y] of s.bn || []) ctx.fillText('🍌', x, y);

    // Power-ups in Seifenblasen
    for (const [x, y, type, fading] of s.it || []) {
      if (fading && Math.sin(now * 20) > 0) continue;
      const by = y + Math.sin(now * 3 + x) * 4;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, by, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = '22px sans-serif'; ctx.fillStyle = '#000';
      ctx.fillText(ITEMS[type]?.emoji || '?', x, by + 1);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(x - 8, by - 9, 3.5, 0, Math.PI * 2); ctx.fill();
    }

    // Bumper
    for (const [x, y, r] of s.bu) {
      ctx.fillStyle = '#ff4fa3';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, y, r - 7, 0, Math.PI * 2); ctx.stroke();
    }

    // Bomben-Warnungen
    for (const [x, y, k] of s.bm) {
      const blink = Math.sin(now * (10 + (1 - k) * 30)) > 0;
      ctx.fillStyle = blink ? 'rgba(255,40,40,0.35)' : 'rgba(255,40,40,0.15)';
      ctx.beginPath(); ctx.arc(x, y, 95, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,40,40,0.8)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 95 * k, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000'; ctx.fillText('💣', x, y);
    }

    // Blobs
    const players = s.p.filter(p => p.st !== 'ghost').sort((a, b) => a.y - b.y);
    for (const p of players) this.drawBlob(p, s, myId, now);

    // Partikel
    for (const f of this.fx) this.drawFx(f);

    // Stromausfall
    const me = s.p.find(p => p.id === myId);
    if (s.c === 'dunkel' && s.ph === 'play' && me && me.st === 'alive') {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,10,0.96)';
      ctx.beginPath();
      ctx.rect(-5000, -5000, 10000, 10000);
      ctx.arc(me.x, me.y, 105, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.restore();
      for (const p of players) if (p.st === 'alive' && p.id !== myId) this.drawEyes(p, true);
    }

    // Geister schweben über allem
    for (const p of s.p) if (p.st === 'ghost') this.drawGhost(p, myId, now);

    ctx.restore();

    // Partikel altern lassen
    for (const f of this.fx) {
      f.life -= dt;
      if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.94; f.vy *= 0.94; }
      if (f.vr) f.r += f.vr * dt;
    }
    this.fx = this.fx.filter(f => f.life > 0);
  }

  drawBlob(p, s, myId, now) {
    const { ctx } = this;
    const me = p.id === myId;
    let scale = 1, alpha = 1;
    if (p.st === 'falling') { scale = Math.max(0.05, 1 - p.f); alpha = Math.max(0, 1 - p.f * 0.8); }
    // Tarnkappe: für andere fast unsichtbar, für dich halb durchsichtig
    if (p.iv && p.st === 'alive') alpha = me ? 0.4 : 0.05 + Math.max(0, Math.sin(now * 13 + p.x)) * 0.05;
    const hidden = p.iv && !me;
    const sp = Math.hypot(p.vx, p.vy);
    const stretch = Math.min(0.28, sp / 2000);
    const ang = Math.atan2(p.vy, p.vx);
    const wob = Math.sin(now * 9 + p.x * 0.05) * 0.04;
    const r = p.r * scale;
    const slimy = s.ig === p.id && p.st === 'alive';

    ctx.save();
    ctx.globalAlpha = alpha;
    if (!hidden) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(p.x + 4, p.y + r * 0.7, r * 0.95, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.translate(p.x, p.y);
    if (p.sl) ctx.rotate(now * 14);
    ctx.rotate(ang);
    ctx.scale(1 + stretch + wob, 1 - stretch * 0.7 - wob);
    ctx.rotate(-ang);
    if (p.dt) { ctx.shadowColor = p.c; ctx.shadowBlur = 25; }
    if (p.pw.includes('glove')) { ctx.shadowColor = '#ff3b3b'; ctx.shadowBlur = 18; }
    const bg = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.25, p.c); bg.addColorStop(1, shade(p.c, -0.35));
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    if (slimy) {
      // grüner Glibber mit Tropfen
      ctx.fillStyle = 'rgba(120,230,60,0.6)';
      ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.95, Math.PI, 0);
      for (let i = 0; i <= 5; i++) ctx.lineTo(r * 0.95 - i * r * 0.38, r * 0.1 + (i % 2 ? r * 0.35 + Math.sin(now * 6 + i) * 4 : 0));
      ctx.fill();
    }
    if (p.pw.includes('anchor')) { ctx.strokeStyle = '#596e85'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
    if (me && p.st === 'alive') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();

    if (hidden) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    this.drawEyes({ ...p, r }, false, p.st === 'falling' || p.sl);

    if (p.st === 'alive') {
      let top = p.y - r;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (p.h) { ctx.font = `${Math.round(r * 1.15)}px sans-serif`; ctx.fillText(HATS[p.h] || '', p.x, top - r * 0.12); top -= r * 0.75; }
      if (slimy) { ctx.font = '22px sans-serif'; ctx.fillText('🧟', p.x, top - 12); top -= 26; }
      if (s.cr.includes(p.id)) { drawCrown(ctx, p.x, top - 2, 12); top -= 18; }
      if (s.po === p.id) {
        ctx.font = '30px sans-serif';
        const jig = Math.sin(now * (8 + 30 / Math.max(1, s.pt))) * 3;
        ctx.fillText('🥔', p.x + jig, top - 14);
        ctx.font = 'bold 13px system-ui'; ctx.fillStyle = s.pt < 3 ? '#ff3b3b' : '#fff';
        ctx.fillText(Math.ceil(s.pt), p.x + 20, top - 24);
        top -= 30;
      }
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(p.n, p.x, top - 4); ctx.fillStyle = '#fff'; ctx.fillText(p.n, p.x, top - 4);
      top -= 20;
      if (s.mo === 'leben' && p.lv > 0) {
        ctx.font = '11px sans-serif'; ctx.textBaseline = 'middle';
        ctx.fillText('❤️'.repeat(p.lv), p.x, p.y + r + 10);
      }
      // aktive Power-ups kreisen um den Blob
      const pws = p.pw ? p.pw.split(',').filter(k => k && k !== 'invis') : [];
      ctx.font = '15px sans-serif'; ctx.textBaseline = 'middle';
      pws.forEach((k, i) => {
        const a = now * 2.5 + i * (Math.PI * 2 / pws.length);
        ctx.fillText(ITEMS[k]?.emoji || '', p.x + Math.cos(a) * (r + 14), p.y + Math.sin(a) * (r + 14));
      });
      if (p.em >= 0) this.drawBubble(p.x, top - 6, EMOTES[p.em]);
    }
    ctx.restore();
  }

  drawBubble(x, y, emoji) {
    const { ctx } = this;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x, y - 18, 22, 18, 0, 0, Math.PI * 2);
    ctx.moveTo(x - 6, y - 2); ctx.lineTo(x, y + 8); ctx.lineTo(x + 6, y - 2);
    ctx.fill();
    ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y - 17);
  }

  drawEyes(p, glow, dizzy) {
    const { ctx } = this;
    const r = p.r;
    const fx = p.fx || 0, fy = p.fy || 1;
    const px = -fy, py = fx; // senkrecht zur Blickrichtung
    const ex = p.x + fx * r * 0.3, ey = p.y + fy * r * 0.3 - r * 0.1;
    for (const side of [-1, 1]) {
      const x = ex + px * side * r * 0.35, y = ey + py * side * r * 0.35;
      if (glow) { ctx.shadowColor = '#ffee55'; ctx.shadowBlur = 12; ctx.fillStyle = '#ffee55'; }
      else ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x, y, r * 0.24, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      if (dizzy) {
        ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
        const q = r * 0.13;
        ctx.beginPath(); ctx.moveTo(x - q, y - q); ctx.lineTo(x + q, y + q); ctx.moveTo(x + q, y - q); ctx.lineTo(x - q, y + q); ctx.stroke();
      } else {
        ctx.fillStyle = glow ? '#221' : '#1a1a2e';
        ctx.beginPath(); ctx.arc(x + fx * r * 0.09, y + fy * r * 0.09, r * 0.12, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  drawGhost(p, myId, now) {
    const { ctx } = this;
    const r = 20;
    const bob = Math.sin(now * 3 + p.x) * 4;
    ctx.save();
    ctx.globalAlpha = p.id === myId ? 0.8 : 0.5;
    ctx.translate(p.x, p.y + bob);
    ctx.fillStyle = '#f4f6ff';
    ctx.strokeStyle = p.c; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -4, r, Math.PI, 0);
    for (let i = 0; i <= 6; i++) {
      const x = r - (i / 6) * r * 2;
      const y = r * 0.9 + Math.sin(now * 8 + i * 1.5) * 3 + (i % 2 ? -5 : 0);
      ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-7, -6, 3.5, 0, Math.PI * 2); ctx.arc(7, -6, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 5, 3.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Pups-Bereitschaft
    if (p.id === myId && p.dc <= 0 && this.phase === 'play') {
      ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#a6e36a';
      ctx.fillText('PUPS bereit!', 0, -32);
    }
    ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(p.n, 0, r + 18);
    ctx.restore();
    if (p.em >= 0) this.drawBubble(p.x, p.y - 30, EMOTES[p.em]);
  }

  drawFx(f) {
    const { ctx } = this;
    const k = Math.max(0, f.life / f.max);
    ctx.save();
    ctx.globalAlpha = k;
    if (f.type === 'ring') {
      ctx.strokeStyle = f.color; ctx.lineWidth = f.w * k + 1;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke();
    } else if (f.type === 'dot' || f.type === 'cloud') {
      ctx.fillStyle = f.color;
      const r = f.type === 'cloud' ? f.r * (1.6 - k) : f.r * k;
      ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill();
    } else if (f.type === 'text') {
      ctx.font = 'bold 20px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    } else if (f.type === 'star') {
      ctx.fillStyle = '#fff8c4';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2, rr = i % 2 ? f.r * 0.4 : f.r * (1.3 - k * 0.3);
        ctx.lineTo(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr);
      }
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawCrown(ctx, x, y, s) {
  ctx.fillStyle = '#ffd700'; ctx.strokeStyle = '#a07800'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - s, y); ctx.lineTo(x - s, y - s); ctx.lineTo(x - s / 2, y - s / 2); ctx.lineTo(x, y - s * 1.3);
  ctx.lineTo(x + s / 2, y - s / 2); ctx.lineTo(x + s, y - s); ctx.lineTo(x + s, y); ctx.closePath();
  ctx.fill(); ctx.stroke();
}

function hash(n) { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + c * amt)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
