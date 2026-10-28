// Zeichnet einen (interpolierten) Snapshot auf das Canvas.

const VIEW_R = 390; // so viel Welt muss sichtbar sein

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
    ctx.translate(w / 2 + sx, h / 2 + sy);
    ctx.scale(S, S);

    // Wellen
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const r = ((now * 25 + i * 110) % 550) + Math.max(0, s ? s.R : 300);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    }

    if (!s) { ctx.restore(); return; }

    // Insel
    const R = s.R;
    if (R > 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.arc(0, 0, R + 16 + Math.sin(now * 2) * 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f3d98b';
      ctx.beginPath(); ctx.arc(0, 0, R + 8, 0, Math.PI * 2); ctx.fill();
      const ig = ctx.createRadialGradient(0, -R * 0.3, R * 0.1, 0, 0, R);
      const ice = s.c === 'eis';
      ig.addColorStop(0, ice ? '#e9fbff' : '#8be06b'); ig.addColorStop(1, ice ? '#9ed8f0' : '#4fae47');
      ctx.fillStyle = ig;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
      // Grasbüschel als Deko (deterministisch)
      if (!ice) {
        ctx.strokeStyle = 'rgba(30,90,30,0.35)'; ctx.lineWidth = 3;
        for (let i = 0; i < 40; i++) {
          const a = i * 2.39996, r = Math.sqrt((i + 0.5) / 40) * 280;
          if (r > R - 12 || r < s.h + 12) continue;
          const x = Math.cos(a) * r, y = Math.sin(a) * r;
          ctx.beginPath(); ctx.moveTo(x - 5, y + 4); ctx.lineTo(x - 2, y - 4); ctx.moveTo(x, y + 4); ctx.lineTo(x + 2, y - 6); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + 6, y - 3); ctx.stroke();
        }
      }
      if (s.ph === 'play' && R < 299) {
        ctx.strokeStyle = `rgba(255,60,60,${0.5 + Math.sin(now * 8) * 0.3})`;
        ctx.setLineDash([14, 10]); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    if (s.h) {
      ctx.fillStyle = '#f3d98b';
      ctx.beginPath(); ctx.arc(0, 0, s.h, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1d6fae';
      ctx.beginPath(); ctx.arc(0, 0, s.h - 8, 0, Math.PI * 2); ctx.fill();
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
      ctx.fillText('💣', x, y - (1 - k) * 0);
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
    let scale = 1, alpha = 1;
    if (p.st === 'falling') { scale = Math.max(0.05, 1 - p.f); alpha = Math.max(0, 1 - p.f * 0.8); }
    const sp = Math.hypot(p.vx, p.vy);
    const stretch = Math.min(0.28, sp / 2000);
    const ang = Math.atan2(p.vy, p.vx);
    const wob = Math.sin(now * 9 + p.x * 0.05) * 0.04;
    const r = p.r * scale;

    ctx.save();
    ctx.globalAlpha = alpha;
    // Schatten
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(p.x + 4, p.y + r * 0.7, r * 0.95, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();

    ctx.translate(p.x, p.y);
    ctx.rotate(ang);
    ctx.scale(1 + stretch + wob, 1 - stretch * 0.7 - wob);
    ctx.rotate(-ang);
    if (p.dt) { ctx.shadowColor = p.c; ctx.shadowBlur = 25; }
    const bg = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.25, p.c); bg.addColorStop(1, shade(p.c, -0.35));
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    if (p.id === myId) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    this.drawEyes({ ...p, r }, false, p.st === 'falling');

    if (p.st === 'alive') {
      // Name
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      const ny = p.y - r - (s.cr.includes(p.id) ? 26 : 8) - (s.po === p.id ? 30 : 0);
      ctx.strokeText(p.n, p.x, ny); ctx.fillStyle = '#fff'; ctx.fillText(p.n, p.x, ny);
      if (s.cr.includes(p.id)) drawCrown(ctx, p.x, p.y - r - 4 - (s.po === p.id ? 30 : 0), 13);
      if (s.po === p.id) {
        ctx.font = '30px sans-serif'; ctx.textBaseline = 'middle';
        const jig = Math.sin(now * (8 + 30 / Math.max(1, s.pt))) * 3;
        ctx.fillText('🥔', p.x + jig, p.y - r - 16);
        ctx.font = 'bold 13px system-ui'; ctx.fillStyle = s.pt < 3 ? '#ff3b3b' : '#fff';
        ctx.fillText(Math.ceil(s.pt), p.x + 20, p.y - r - 26);
      }
    }
    ctx.restore();
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

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + c * amt)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
