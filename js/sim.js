// Spiel-Simulation. Läuft nur beim Host (autoritativ), kennt kein DOM.

export const COLORS = ['#ff5d73', '#3fb6ff', '#ffd23f', '#5ee27a', '#b57bff', '#ff9f43'];
export const MAX_PLAYERS = 6;

export const CARDS = {
  eis:       { name: 'Eisbahn',        emoji: '🧊', desc: 'Kaum Reibung. Bremsen ist was für Feiglinge.' },
  riesen:    { name: 'Riesenblobs',    emoji: '🐘', desc: 'Alle sind fett. Wirklich fett.' },
  mini:      { name: 'Mini-Blobs',     emoji: '🐭', desc: 'Winzig, flink und leicht wegzuschubsen.' },
  spiegel:   { name: 'Spiegelwelt',    emoji: '🪞', desc: 'Steuerung vertauscht – außer für den, der die Karte gezogen hat.' },
  flummi:    { name: 'Flummi',         emoji: '🏀', desc: 'Jeder Zusammenstoß katapultiert.' },
  turbo:     { name: 'Turbo-Dash',     emoji: '⚡', desc: 'Dash lädt fast sofort nach.' },
  bomben:    { name: 'Bombenhagel',    emoji: '💣', desc: 'Es regnet Bomben. Weg von den roten Kreisen!' },
  donut:     { name: 'Donut-Insel',    emoji: '🍩', desc: 'In der Mitte ist ein Loch.' },
  wind:      { name: 'Sturmflut',      emoji: '🌪️', desc: 'Ein drehender Sturm schiebt alle herum.' },
  magnet:    { name: 'Magnetfeld',     emoji: '🧲', desc: 'Alle Blobs ziehen sich gegenseitig an.' },
  kartoffel: { name: 'Heiße Kartoffel',emoji: '🥔', desc: 'Wer sie hält, wenn sie explodiert, fliegt raus. Weitergeben durch Rempeln!' },
  dunkel:    { name: 'Stromausfall',   emoji: '🌑', desc: 'Du siehst nur noch dich selbst. Und leuchtende Augen.' },
  schrumpf:  { name: 'Schrumpf-Insel', emoji: '🏝️', desc: 'Die Insel schrumpft sofort und schnell.' },
  flipper:   { name: 'Flipper',        emoji: '🕹️', desc: 'Bumper auf der Insel. Ding ding ding!' },
  tausch:    { name: 'Platztausch',    emoji: '🔀', desc: 'Alle paar Sekunden tauschen alle die Plätze.' },
  geister:   { name: 'Geisterstunde',  emoji: '👻', desc: 'Geister pupsen öfter und stärker.' },
};
export const CARD_IDS = Object.keys(CARDS);

const BASE_R = 300;      // Inselradius
const PR = 22;           // Blob-Radius
const ACC = 1100;
const FRIC = 3.2;
const DASH_V = 560;
const DASH_CD = 1.3;
const DASH_T = 0.22;
const GHOST_SPEED = 270;
const PUPS_CD = 4;
const PUPS_R = 125;

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

export class Game {
  constructor() {
    this.players = new Map();
    this.phase = 'lobby';
    this.timer = 0;
    this.target = 5;
    this.round = 0;
    this.card = null;
    this.cardOwner = null;
    this.events = [];
    this.message = '';
    this.resetArena();
  }

  resetArena() {
    this.R = BASE_R;
    this.hole = 0;
    this.t = 0;
    this.bombs = [];
    this.bombT = 1.5;
    this.bumpers = [];
    this.potato = null;
    this.swapT = 7;
    this.elimOrder = [];
    this.crowned = new Set();
    this.endDelay = 0;
  }

  freeColor() {
    const used = new Set([...this.players.values()].map(p => p.color));
    return COLORS.find(c => !used.has(c)) || pick(COLORS);
  }

  addPlayer(id, name, bot = false) {
    if (this.players.size >= MAX_PLAYERS) return null;
    const p = {
      id, name: (name || 'Blob').slice(0, 14), bot, color: this.freeColor(),
      x: 0, y: 0, vx: 0, vy: 0, r: PR, fx: 0, fy: 1,
      state: 'ghost', fallT: 0, gx: 0, gy: 0,
      dashCd: 0, dashT: 0, dashSeen: 0, pupsCd: 0,
      score: 0, lastHitBy: null, lastHitT: -99,
      input: { mx: 0, my: 0, d: 0 }, botBrain: { wobble: rnd(0, 6), aggro: rnd(0.6, 1) },
    };
    this.players.set(id, p);
    // Wer mitten in einer Runde dazukommt, ist bis zur nächsten Runde Geist.
    if (this.phase === 'lobby') p.state = 'alive';
    return p;
  }

  removePlayer(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.players.delete(id);
    if (this.cardOwner === id) this.cardOwner = null;
    if (this.potato === id) this.potato = null;
    if (this.phase === 'cardPick' && this.picker === id) this.picker = null;
  }

  setInput(id, inp) {
    const p = this.players.get(id);
    if (!p || !inp) return;
    let mx = +inp.mx || 0, my = +inp.my || 0;
    const m = Math.hypot(mx, my);
    if (m > 1) { mx /= m; my /= m; }
    p.input = { mx, my, d: Math.max(p.input.d, +inp.d || 0) };
  }

  emit(e) { this.events.push(e); }
  drainEvents() { const e = this.events; this.events = []; return e; }

  // ---------- Ablauf ----------

  startMatch() {
    if (this.players.size < 2) return false;
    for (const p of this.players.values()) p.score = 0;
    this.round = 0;
    this.card = null;
    this.cardOwner = null;
    this.lastCard = null;
    this.beginCountdown();
    return true;
  }

  backToLobby() {
    this.phase = 'lobby';
    this.card = null;
    this.resetArena();
    this.message = '';
    this.layoutPlayers();
  }

  beginCountdown() {
    this.round++;
    this.resetArena();
    const scores = [...this.players.values()].map(p => p.score);
    const max = Math.max(0, ...scores);
    if (max > 0) for (const p of this.players.values()) if (p.score === max) this.crowned.add(p.id);
    const c = this.card;
    if (c === 'donut') this.hole = 85;
    if (c === 'flipper') {
      const a0 = rnd(0, Math.PI * 2);
      this.bumpers = [0, 1, 2].map(i => ({ x: Math.cos(a0 + i * 2.094) * 120, y: Math.sin(a0 + i * 2.094) * 120, r: 26 }));
    }
    this.layoutPlayers();
    this.phase = 'countdown';
    this.timer = 3;
    this.message = '';
    this.emit({ k: 'count', n: 3 });
  }

  layoutPlayers() {
    const list = [...this.players.values()];
    const a0 = rnd(0, Math.PI * 2);
    const ring = this.hole ? 190 : 170;
    list.forEach((p, i) => {
      const a = a0 + (i / list.length) * Math.PI * 2;
      p.x = Math.cos(a) * ring; p.y = Math.sin(a) * ring;
      p.vx = p.vy = 0;
      p.fx = -Math.cos(a); p.fy = -Math.sin(a);
      p.state = 'alive'; p.fallT = 0;
      p.dashCd = 0; p.dashT = 0; p.pupsCd = 0;
      p.lastHitBy = null; p.lastHitT = -99;
      p.dashSeen = p.input.d;
      p.r = this.card === 'riesen' ? PR * 1.7 : this.card === 'mini' ? PR * 0.6 : PR;
    });
  }

  choose(playerId, idx) {
    if (this.phase !== 'cardPick') return;
    if (this.picker && playerId !== this.picker) return;
    const id = this.options[idx];
    if (!id) return;
    this.card = id;
    this.lastCard = id;
    this.cardOwner = this.picker;
    this.emit({ k: 'card', card: id });
    this.phase = 'cardShow';
    this.timer = 2.2;
  }

  endRound() {
    const alive = [...this.players.values()].filter(p => p.state === 'alive');
    let text;
    if (alive.length === 1) {
      alive[0].score += 1;
      text = `${alive[0].name} gewinnt die Runde!`;
      this.emit({ k: 'win', id: alive[0].id });
    } else {
      text = 'Alle im Wasser – Unentschieden!';
      this.emit({ k: 'draw' });
    }
    this.message = text;
    this.roundWinner = alive.length === 1 ? alive[0].id : null;
    this.phase = 'roundEnd';
    this.timer = 3;
  }

  afterRoundEnd() {
    const players = [...this.players.values()];
    const best = players.reduce((a, b) => (b.score > a.score ? b : a), players[0]);
    const leaders = players.filter(p => p.score === best.score);
    if (best && best.score >= this.target && leaders.length === 1) {
      this.phase = 'matchEnd';
      this.champion = best.id;
      this.message = `${best.name} ist Inselkönig!`;
      this.emit({ k: 'champion', id: best.id });
      return;
    }
    // Wer zuerst rausgeflogen ist, darf das Chaos für die nächste Runde wählen.
    const first = this.elimOrder.find(id => this.players.has(id));
    this.picker = first || null;
    const pool = CARD_IDS.filter(c => c !== this.lastCard);
    this.options = shuffle(pool).slice(0, 3);
    this.phase = 'cardPick';
    this.timer = 12;
    this.botPickT = rnd(1.5, 3);
  }

  eliminate(p, how) {
    if (p.state !== 'alive') return;
    p.state = 'falling';
    p.fallT = 0;
    this.elimOrder.push(p.id);
    this.emit({ k: how === 'boom' ? 'boom' : 'plumps', x: p.x, y: p.y, id: p.id });
    if (this.potato === p.id) this.potato = null;
    const hitter = this.players.get(p.lastHitBy);
    if (hitter && hitter !== p && this.t - p.lastHitT < 3 && this.crowned.has(p.id)) {
      hitter.score += 1;
      this.emit({ k: 'regicide', id: hitter.id, victim: p.id });
    }
  }

  // ---------- Physik ----------

  step(dt) {
    if (this.phase === 'lobby') return;
    if (this.phase === 'countdown') {
      const before = Math.ceil(this.timer);
      this.timer -= dt;
      const now = Math.ceil(this.timer);
      if (now !== before && now > 0) this.emit({ k: 'count', n: now });
      if (this.timer <= 0) { this.phase = 'play'; this.emit({ k: 'go' }); }
      return;
    }
    if (this.phase === 'roundEnd') {
      this.ghostStep(dt);
      this.timer -= dt;
      if (this.timer <= 0) this.afterRoundEnd();
      return;
    }
    if (this.phase === 'cardPick') {
      this.timer -= dt;
      const pk = this.players.get(this.picker);
      if (!pk || pk.bot) { this.botPickT -= dt; if (this.botPickT <= 0) this.choose(this.picker, Math.floor(Math.random() * 3)); }
      if (this.phase === 'cardPick' && this.timer <= 0) this.choose(this.picker, Math.floor(Math.random() * 3));
      return;
    }
    if (this.phase === 'cardShow') {
      this.timer -= dt;
      if (this.timer <= 0) this.beginCountdown();
      return;
    }
    if (this.phase !== 'play') return;

    this.t += dt;
    const card = this.card;
    const all = [...this.players.values()];
    const alive = all.filter(p => p.state === 'alive');

    for (const p of all) if (p.bot) this.botThink(p, alive);

    const fric = card === 'eis' ? 0.45 : FRIC;
    const acc = card === 'mini' ? ACC * 1.25 : card === 'riesen' ? ACC * 0.85 : ACC;
    const dashCd = card === 'turbo' ? 0.35 : DASH_CD;
    const windA = this.t * 0.6;
    const wind = card === 'wind' ? { x: Math.cos(windA) * 330, y: Math.sin(windA) * 330 } : null;

    for (const p of alive) {
      let { mx, my } = p.input;
      if (card === 'spiegel' && p.id !== this.cardOwner) { mx = -mx; my = -my; }
      let ax = mx * acc, ay = my * acc;
      if (wind) { ax += wind.x; ay += wind.y; }
      if (card === 'magnet') {
        for (const q of alive) {
          if (q === p) continue;
          const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
          const f = Math.min(900, 90000 / d);
          ax += dx / d * f * 0.5; ay += dy / d * f * 0.5;
        }
      }
      p.vx += ax * dt; p.vy += ay * dt;
      const k = Math.exp(-fric * dt);
      p.vx *= k; p.vy *= k;
      if (Math.hypot(mx, my) > 0.2) { const m = Math.hypot(mx, my); p.fx = mx / m; p.fy = my / m; }

      p.dashCd = Math.max(0, p.dashCd - dt);
      p.dashT = Math.max(0, p.dashT - dt);
      if (p.input.d > p.dashSeen) {
        p.dashSeen = p.input.d;
        if (p.dashCd <= 0) {
          p.vx += p.fx * DASH_V; p.vy += p.fy * DASH_V;
          p.dashT = DASH_T; p.dashCd = dashCd;
          this.emit({ k: 'dash', id: p.id, x: p.x, y: p.y });
        }
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }

    this.collide(alive);
    this.bumperStep(alive);
    this.ghostStep(dt);
    if (card === 'bomben') this.bombStep(dt, alive);
    if (card === 'kartoffel') this.potatoStep(dt, alive);
    if (card === 'tausch') this.swapStep(dt, alive);

    // Insel schrumpft irgendwann, damit niemand ewig campt
    const shrinkStart = card === 'schrumpf' ? 2 : 20;
    const shrinkRate = card === 'schrumpf' ? 16 : 9;
    if (this.t > shrinkStart) this.R = Math.max(0, this.R - shrinkRate * dt);

    for (const p of alive) {
      const d = Math.hypot(p.x, p.y);
      if (d > this.R || (this.hole && d < this.hole)) this.eliminate(p, 'fall');
    }

    for (const p of all) {
      if (p.state === 'falling') {
        p.fallT += dt;
        p.x += p.vx * dt * 0.3; p.y += p.vy * dt * 0.3;
        if (p.fallT > 1) { p.state = 'ghost'; p.gx = p.x; p.gy = p.y; p.pupsCd = 1.5; p.dashSeen = p.input.d; }
      }
    }

    const stillAlive = all.filter(p => p.state === 'alive').length;
    if (stillAlive <= 1) {
      this.endDelay += dt;
      if (this.endDelay > 0.7) this.endRound();
    }
  }

  collide(alive) {
    const e = this.card === 'flummi' ? 2.3 : 0.9;
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i], b = alive[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy), min = a.r + b.r;
        if (d >= min || d === 0) continue;
        const nx = dx / d, ny = dy / d;
        const ma = a.r * a.r, mb = b.r * b.r;
        const overlap = min - d;
        a.x -= nx * overlap * mb / (ma + mb); a.y -= ny * overlap * mb / (ma + mb);
        b.x += nx * overlap * ma / (ma + mb); b.y += ny * overlap * ma / (ma + mb);
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          const jImp = -(1 + e) * rv / (1 / ma + 1 / mb);
          a.vx -= jImp / ma * nx; a.vy -= jImp / ma * ny;
          b.vx += jImp / mb * nx; b.vy += jImp / mb * ny;
        }
        // Dash-Treffer schubsen extra hart
        if (a.dashT > 0) { b.vx += nx * 300; b.vy += ny * 300; }
        if (b.dashT > 0) { a.vx -= nx * 300; a.vy -= ny * 300; }
        a.lastHitBy = b.id; a.lastHitT = this.t;
        b.lastHitBy = a.id; b.lastHitT = this.t;
        if (-rv > 80 || a.dashT > 0 || b.dashT > 0) this.emit({ k: 'boing', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, p: Math.min(1, -rv / 600) });
        if (this.card === 'kartoffel' && this.t > this.potatoImmune) {
          if (this.potato === a.id) this.passPotato(b.id);
          else if (this.potato === b.id) this.passPotato(a.id);
        }
      }
    }
  }

  bumperStep(alive) {
    for (const bu of this.bumpers) {
      for (const p of alive) {
        const dx = p.x - bu.x, dy = p.y - bu.y, d = Math.hypot(dx, dy) || 1;
        if (d < bu.r + p.r) {
          const nx = dx / d, ny = dy / d;
          p.x = bu.x + nx * (bu.r + p.r); p.y = bu.y + ny * (bu.r + p.r);
          const vn = p.vx * nx + p.vy * ny;
          p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny;
          p.vx += nx * 420; p.vy += ny * 420;
          this.emit({ k: 'bumper', x: bu.x, y: bu.y });
        }
      }
    }
  }

  ghostStep(dt) {
    const strong = this.card === 'geister';
    for (const p of this.players.values()) {
      if (p.state !== 'ghost') continue;
      const { mx, my } = p.input;
      p.gx += mx * GHOST_SPEED * dt; p.gy += my * GHOST_SPEED * dt;
      const d = Math.hypot(p.gx, p.gy);
      if (d > 380) { p.gx *= 380 / d; p.gy *= 380 / d; }
      p.pupsCd = Math.max(0, p.pupsCd - dt);
      if (p.input.d > p.dashSeen) {
        p.dashSeen = p.input.d;
        if (p.pupsCd <= 0 && this.phase === 'play') {
          p.pupsCd = strong ? 1.3 : PUPS_CD;
          const R = strong ? PUPS_R * 1.35 : PUPS_R;
          this.emit({ k: 'pups', x: p.gx, y: p.gy, r: R, id: p.id });
          for (const q of this.players.values()) {
            if (q.state !== 'alive') continue;
            const dx = q.x - p.gx, dy = q.y - p.gy, dd = Math.hypot(dx, dy) || 1;
            if (dd < R) {
              const f = 520 * (1 - dd / (R + 10));
              q.vx += dx / dd * f; q.vy += dy / dd * f;
              q.lastHitBy = p.id; q.lastHitT = this.t;
            }
          }
        }
      }
    }
  }

  bombStep(dt, alive) {
    this.bombT -= dt;
    if (this.bombT <= 0) {
      this.bombT = rnd(0.7, 1.4);
      // Bomben fallen bevorzugt in die Nähe von Spielern
      const target = alive.length && Math.random() < 0.6 ? pick(alive) : null;
      const a = rnd(0, Math.PI * 2), r = rnd(0, this.R);
      const x = target ? target.x + rnd(-60, 60) : Math.cos(a) * r;
      const y = target ? target.y + rnd(-60, 60) : Math.sin(a) * r;
      this.bombs.push({ x, y, t: 1.3, max: 1.3 });
    }
    for (const b of this.bombs) {
      b.t -= dt;
      if (b.t <= 0) {
        this.emit({ k: 'boom', x: b.x, y: b.y });
        this.blast(b.x, b.y, 95, 620);
      }
    }
    this.bombs = this.bombs.filter(b => b.t > 0);
  }

  blast(x, y, R, F, exclude) {
    for (const q of this.players.values()) {
      if (q.state !== 'alive' || q === exclude) continue;
      const dx = q.x - x, dy = q.y - y, d = Math.hypot(dx, dy) || 1;
      if (d < R + q.r) {
        const f = F * (1 - d / (R + q.r + 10));
        q.vx += dx / d * f; q.vy += dy / d * f;
      }
    }
  }

  passPotato(id) {
    this.potato = id;
    this.potatoImmune = this.t + 0.5;
    this.emit({ k: 'potato', id });
  }

  potatoStep(dt, alive) {
    if (!this.potato || !this.players.has(this.potato)) {
      if (alive.length >= 2) {
        this.passPotato(pick(alive).id);
        this.potatoT = rnd(9, 13);
      }
      return;
    }
    this.potatoT -= dt;
    if (this.potatoT <= 0) {
      const h = this.players.get(this.potato);
      this.potato = null;
      if (h && h.state === 'alive') {
        this.blast(h.x, h.y, 110, 500, h);
        this.eliminate(h, 'boom');
      }
    }
  }

  swapStep(dt, alive) {
    this.swapT -= dt;
    if (this.swapT > 0 || alive.length < 2) return;
    this.swapT = 6;
    const pos = alive.map(p => [p.x, p.y]);
    // Verschieben um eins garantiert, dass jeder woanders landet
    const shift = 1 + Math.floor(Math.random() * (alive.length - 1));
    alive.forEach((p, i) => { [p.x, p.y] = pos[(i + shift) % alive.length]; });
    this.emit({ k: 'swap' });
  }

  // ---------- Bots ----------

  botThink(p, alive) {
    const b = p.botBrain;
    b.wobble += 0.05;
    let mx = 0, my = 0, dash = false;
    if (p.state === 'alive') {
      const others = alive.filter(q => q !== p);
      const d0 = Math.hypot(p.x, p.y);
      let target = null, best = 1e9;
      for (const q of others) {
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < best) { best = d; target = q; }
      }
      if (target) {
        // Leicht hinter das Ziel zielen, damit es Richtung Rand geschubst wird
        const tx = target.x + target.x * 0.15, ty = target.y + target.y * 0.15;
        mx = tx - p.x; my = ty - p.y;
        if (best < 110 + p.r && Math.random() < 0.04 * b.aggro) dash = true;
      }
      mx += Math.cos(b.wobble) * 40; my += Math.sin(b.wobble * 1.3) * 40;
      const danger = this.R - d0;
      if (danger < 80) { mx -= p.x / d0 * (90 - danger) * 4; my -= p.y / d0 * (90 - danger) * 4; }
      if (this.hole && d0 - this.hole < 60) { mx += p.x / d0 * 300; my += p.y / d0 * 300; }
      for (const bo of this.bombs) {
        const dx = p.x - bo.x, dy = p.y - bo.y, d = Math.hypot(dx, dy) || 1;
        if (d < 130) { mx += dx / d * 400; my += dy / d * 400; }
      }
      if (this.potato === p.id && target) { mx = target.x - p.x; my = target.y - p.y; if (best < 120) dash = Math.random() < 0.1; }
      else if (this.potato && this.potato !== p.id) {
        const h = this.players.get(this.potato);
        if (h) { const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy) || 1; if (d < 160) { mx += dx / d * 500; my += dy / d * 500; } }
      }
    } else if (p.state === 'ghost') {
      const target = alive.reduce((a, q) => (!a || Math.hypot(q.x, q.y) > Math.hypot(a.x, a.y) ? q : a), null);
      if (target) {
        mx = target.x * 0.7 - p.gx; my = target.y * 0.7 - p.gy;
        if (Math.hypot(target.x - p.gx, target.y - p.gy) < 90 && Math.random() < 0.05) dash = true;
      }
    }
    const m = Math.hypot(mx, my);
    if (m > 1) { mx /= m; my /= m; }
    // Bots haben die Spiegelwelt durchschaut (meistens)
    if (this.card === 'spiegel' && p.id !== this.cardOwner && p.state === 'alive' && Math.sin(b.wobble * 0.7) > -0.6) { mx = -mx; my = -my; }
    p.input = { mx, my, d: p.input.d + (dash ? 1 : 0) };
  }

  // ---------- Snapshot fürs Netzwerk ----------

  snapshot(events) {
    const r1 = (v) => Math.round(v * 10) / 10;
    return {
      t: 's',
      ph: this.phase, tm: r1(this.timer), R: r1(this.R), h: this.hole, rd: this.round,
      c: this.card, co: this.cardOwner, tg: this.target, msg: this.message,
      pk: this.picker, op: this.phase === 'cardPick' || this.phase === 'cardShow' ? this.options : null,
      po: this.potato, pt: this.potato ? r1(this.potatoT) : 0,
      cr: [...this.crowned], ch: this.champion, rw: this.roundWinner,
      bm: this.bombs.map(b => [r1(b.x), r1(b.y), r1(b.t / b.max)]),
      bu: this.bumpers.map(b => [b.x, b.y, b.r]),
      p: [...this.players.values()].map(p => ({
        id: p.id, n: p.name, c: p.color, b: p.bot ? 1 : 0,
        x: r1(p.state === 'ghost' ? p.gx : p.x), y: r1(p.state === 'ghost' ? p.gy : p.y),
        vx: r1(p.vx), vy: r1(p.vy), fx: r1(p.fx), fy: r1(p.fy), r: p.r,
        st: p.state, f: r1(p.fallT), s: p.score,
        dc: p.state === 'ghost' ? r1(p.pupsCd / (this.card === 'geister' ? 1.3 : PUPS_CD)) : r1(p.dashCd / (this.card === 'turbo' ? 0.35 : DASH_CD)),
        dt: p.dashT > 0 ? 1 : 0,
      })),
      ev: events || [],
    };
  }
}
