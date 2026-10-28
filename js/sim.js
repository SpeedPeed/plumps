// Spiel-Simulation. Läuft nur beim Host (autoritativ), kennt kein DOM.
import { MAPS, MAP_IDS, poseShapes, onGround, shapeIndexAt, toLocal, fromLocal, packShapes } from './maps.js';

export const COLORS = ['#ff5d73', '#3fb6ff', '#ffd23f', '#5ee27a', '#b57bff', '#ff9f43'];
export const MAX_PLAYERS = 6;
export const HATS = ['', '🎩', '🧢', '👒', '🎓', '⛑️', '🪖', '🎀', '🌻', '🍒', '🐸', '🦄', '🍄', '🎃'];
export const EMOTES = ['😂', '😱', '😡', '💩', '👋'];

export const CARDS = {
  eis:       { name: 'Eisbahn',         emoji: '🧊', desc: 'Kaum Reibung. Bremsen ist was für Feiglinge.' },
  riesen:    { name: 'Riesenblobs',     emoji: '🐘', desc: 'Alle sind fett. Wirklich fett.' },
  mini:      { name: 'Mini-Blobs',      emoji: '🐭', desc: 'Winzig, flink und leicht wegzuschubsen.' },
  spiegel:   { name: 'Spiegelwelt',     emoji: '🪞', desc: 'Steuerung vertauscht – außer für den, der die Karte gezogen hat.' },
  flummi:    { name: 'Flummi',          emoji: '🏀', desc: 'Jeder Zusammenstoß katapultiert.' },
  turbo:     { name: 'Turbo-Dash',      emoji: '⚡', desc: 'Dash lädt fast sofort nach.' },
  bomben:    { name: 'Bombenhagel',     emoji: '💣', desc: 'Es regnet Bomben. Weg von den roten Kreisen!' },
  donut:     { name: 'Donut',           emoji: '🍩', desc: 'In die Mitte wird ein Loch gestanzt.' },
  wind:      { name: 'Sturmflut',       emoji: '🌪️', desc: 'Ein drehender Sturm schiebt alle herum.' },
  magnet:    { name: 'Magnetfeld',      emoji: '🧲', desc: 'Alle Blobs ziehen sich gegenseitig an.' },
  kartoffel: { name: 'Heiße Kartoffel', emoji: '🥔', desc: 'Wer sie hält, wenn sie explodiert, fliegt raus. Weitergeben durch Rempeln!' },
  dunkel:    { name: 'Stromausfall',    emoji: '🌑', desc: 'Du siehst nur noch dich selbst. Und leuchtende Augen.' },
  schrumpf:  { name: 'Schrumpf-Insel',  emoji: '🫠', desc: 'Die Insel schrumpft sofort und schnell.' },
  flipper:   { name: 'Flipper',         emoji: '🕹️', desc: 'Bumper auf der Insel. Ding ding ding!' },
  tausch:    { name: 'Platztausch',     emoji: '🔀', desc: 'Alle paar Sekunden tauschen alle die Plätze.' },
  geister:   { name: 'Geisterstunde',   emoji: '👻', desc: 'Geister pupsen öfter und stärker.' },
  geschenk:  { name: 'Bescherung',      emoji: '🎁', desc: 'Power-ups regnen im Sekundentakt.' },
  bananen:   { name: 'Bananenrepublik', emoji: '🍌', desc: 'Überall liegen Bananenschalen.' },
  zeitlupe:  { name: 'Zeitlupe',        emoji: '🐌', desc: 'Alles läuft in Zeitlupe. Dramatisch.' },
  wackel:    { name: 'Wackelpudding',   emoji: '🍮', desc: 'Alle schwabbeln unkontrolliert durch die Gegend.' },
};
export const CARD_IDS = Object.keys(CARDS);

export const MODES = {
  klassik: { name: 'Letzter Blob',   emoji: '🏝️', desc: 'Wer als Letzter auf der Insel steht, gewinnt die Runde.' },
  leben:   { name: 'Drei Leben',     emoji: '❤️', desc: 'Jeder hat 3 Leben. Wer am Ende noch welche hat, gewinnt.', respawn: true },
  huegel:  { name: 'Hügelkönig',     emoji: '⛰️', desc: 'Steh ALLEIN im leuchtenden Kreis, bis dein Balken voll ist.', respawn: true, time: 60 },
  muenzen: { name: 'Münzrausch',     emoji: '🪙', desc: 'Sammle Münzen! Wer ins Wasser fällt, verliert die Hälfte.', respawn: true, time: 40 },
  farbe:   { name: 'Farbkampf',      emoji: '🎨', desc: 'Färb die Insel in deiner Farbe. Wer am meisten Fläche hat, gewinnt.', respawn: true, time: 35, still: true },
  fangen:  { name: 'Glibber-Fangen', emoji: '🧟', desc: 'Wer den Glibber hat, gibt ihn durch Rempeln weiter. Wer ihn am kürzesten hatte, gewinnt.', respawn: true, time: 45 },
};
export const MODE_IDS = Object.keys(MODES);

export const ITEMS = {
  glove:  { emoji: '🥊', name: 'Boxhandschuh', desc: 'Deine Dashes hauen 8 s lang extrem rein!' },
  anchor: { emoji: '⚓', name: 'Anker',        desc: '6 s lang bist du kaum wegzuschubsen.' },
  big:    { emoji: '🍄', name: 'Riesenpilz',   desc: 'Du bist 7 s lang riesig!' },
  speed:  { emoji: '👟', name: 'Turboschuhe',  desc: '7 s lang schneller und mehr Dashes.' },
  banana: { emoji: '🍌', name: 'Bananen',      desc: 'Du lässt Bananenschalen fallen.' },
  bomb:   { emoji: '💣', name: 'Bombe',        desc: 'Du hast eine Bombe fallen lassen. LAUF!' },
  swap:   { emoji: '🔄', name: 'Tauschticket', desc: 'Platztausch mit einem zufälligen Gegner!' },
  invis:  { emoji: '🫥', name: 'Tarnkappe',    desc: '5 s lang unsichtbar.' },
};
export const ITEM_IDS = Object.keys(ITEMS);

// Bot-Schwierigkeit: Reaktionszeit, Zielfehler, Dash-Lust, Vorsicht am Rand, Tempo, Aussetzer
export const BOT_LEVELS = [
  { name: 'Leicht', react: 0.45, aimErr: 90, dash: 0.12, range: 70,  care: 0.8,  speed: 0.72, derp: 0.12, pups: 0.08 },
  { name: 'Mittel', react: 0.28, aimErr: 45, dash: 0.25, range: 95,  care: 0.92, speed: 0.86, derp: 0.05, pups: 0.18 },
  { name: 'Schwer', react: 0.14, aimErr: 15, dash: 0.45, range: 120, care: 0.99, speed: 1,    derp: 0.01, pups: 0.35 },
];

const PR = 22;
const ACC = 1100;
const FRIC = 3.2;
const DASH_V = 560;
const DASH_CD = 1.3;
const DASH_T = 0.22;
const GHOST_SPEED = 270;
const PUPS_CD = 4;
const PUPS_R = 125;
const CELL = 24;
const GRID_N = 28;  // Farbkampf-Raster: 28×28 Zellen à 24 Einheiten
const TAU = Math.PI * 2;

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
const r1 = (v) => Math.round(v * 10) / 10;

function cardFits(card, mode, map) {
  if (card === 'schrumpf') return mode === 'klassik' || mode === 'leben';
  if (card === 'geister') return mode === 'klassik' || mode === 'leben';
  if (card === 'kartoffel') return mode !== 'fangen';
  if (card === 'tausch') return mode !== 'farbe';
  if (card === 'eis' || card === 'wind' || card === 'wackel') return !MAPS[map].moving;
  if (card === 'donut') return !MAPS[map].holes && map !== 'archipel' && map !== 'karussell';
  return true;
}

export class Game {
  constructor() {
    this.players = new Map();
    this.phase = 'lobby';
    this.timer = 0;
    this.target = 5;
    this.botLevel = 0;
    this.modeMix = true;
    this.round = 0;
    this.mode = 'klassik';
    this.map = 'rund';
    this.card = null;
    this.cardOwner = null;
    this.events = [];
    this.message = '';
    this.gridDirty = true;
    this.resetArena();
  }

  resetArena() {
    this.t = 0;
    this.k = 1;
    const m = MAPS[this.map];
    this.holes = [...(m.holes || [])];
    if (this.card === 'donut') this.holes.push({ x: 0, y: 0, r: 85 });
    this.shapes = poseShapes(m, 0, 1);
    this.prevShapes = this.shapes;
    this.bombs = [];
    this.bombT = 1.5;
    this.bumpers = [];
    this.potato = null;
    this.swapT = 7;
    this.items = [];
    this.itemT = rnd(3, 5);
    this.bananas = [];
    this.coins = [];
    this.coinT = 0;
    this.zone = null;
    this.tagger = null;
    this.grid = null;
    this.elimOrder = [];
    this.fallOrder = [];
    this.crowned = new Set();
    this.regicided = new Set();
    this.endDelay = 0;
  }

  freeColor() {
    const used = new Set([...this.players.values()].map(p => p.ci));
    const i = COLORS.findIndex((_, i) => !used.has(i));
    return i < 0 ? 0 : i;
  }

  addPlayer(id, name, bot = false, hat = 0) {
    if (this.players.size >= MAX_PLAYERS) return null;
    const ci = this.freeColor();
    const p = {
      id, name: (name || 'Blob').slice(0, 14), bot, ci, color: COLORS[ci],
      hat: HATS[hat | 0] !== undefined ? hat | 0 : 0,
      x: 0, y: 0, vx: 0, vy: 0, r: PR, fx: 0, fy: 1,
      state: 'ghost', fallT: 0, gx: 0, gy: 0,
      dashCd: 0, dashT: 0, dashSeen: 0, pupsCd: 0,
      score: 0, lastHitBy: null, lastHitT: -99,
      lives: 0, m: 0, pw: {}, emo: null, emoT: 0,
      stats: { ko: 0, falls: 0, pups: 0, items: 0, dashes: 0 },
      input: { mx: 0, my: 0, d: 0 },
      botBrain: { cd: 0, wobble: rnd(0, 6), mx: 0, my: 0, goal: null, goalT: 0 },
    };
    if (bot) p.hat = 1 + Math.floor(Math.random() * (HATS.length - 1));
    this.players.set(id, p);
    // Wer mitten in einer Runde dazukommt, ist bis zur nächsten Runde Geist.
    if (this.phase === 'lobby') this.layoutPlayers();
    else { const s = this.safeSpot(); p.gx = s.x; p.gy = s.y; }
    return p;
  }

  removePlayer(id) {
    if (!this.players.has(id)) return;
    this.players.delete(id);
    if (this.cardOwner === id) this.cardOwner = null;
    if (this.potato === id) this.potato = null;
    if (this.tagger === id) this.tagger = null;
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

  setHat(id, hat) {
    const p = this.players.get(id);
    if (p && HATS[hat | 0] !== undefined) p.hat = hat | 0;
  }

  emote(id, i) {
    const p = this.players.get(id);
    if (!p || !EMOTES[i | 0] || p.emoT > 0.6) return;
    p.emo = i | 0; p.emoT = 2.2;
  }

  emit(e) { this.events.push(e); }
  drainEvents() { const e = this.events; this.events = []; return e; }

  // ---------- Ablauf ----------

  startMatch() {
    if (this.players.size < 2) return false;
    for (const p of this.players.values()) { p.score = 0; p.stats = { ko: 0, falls: 0, pups: 0, items: 0, dashes: 0 }; }
    this.round = 0;
    this.card = null;
    this.cardOwner = null;
    this.lastCard = null;
    this.champion = null;
    this.mode = 'klassik';
    this.map = 'rund';
    this.beginCountdown();
    return true;
  }

  backToLobby() {
    this.phase = 'lobby';
    this.card = null;
    this.map = 'rund';
    this.mode = 'klassik';
    this.resetArena();
    this.message = '';
    this.layoutPlayers();
  }

  chooseNext() {
    if (!this.modeMix) { this.mode = 'klassik'; }
    else {
      // Klassik kommt etwas öfter, aber nie zweimal hintereinander derselbe Modus
      const pool = ['klassik', 'klassik', 'leben', 'huegel', 'muenzen', 'farbe', 'fangen'].filter(m => m !== this.mode);
      this.mode = pick(pool);
    }
    const maps = MAP_IDS.filter(m => m !== this.map && !(MODES[this.mode].still && MAPS[m].moving));
    this.map = pick(maps);
  }

  beginCountdown() {
    this.round++;
    this.resetArena();
    const scores = [...this.players.values()].map(p => p.score);
    const max = Math.max(0, ...scores);
    if (max > 0) for (const p of this.players.values()) if (p.score === max) this.crowned.add(p.id);
    if (this.card === 'flipper') {
      this.bumpers = [];
      for (let i = 0; i < 3; i++) { const s = this.safeSpot(60, this.bumpers); this.bumpers.push({ x: s.x, y: s.y, r: 26 }); }
    }
    if (this.card === 'bananen') for (let i = 0; i < 10; i++) { const s = this.safeSpot(20, this.bananas); this.bananas.push({ x: s.x, y: s.y, owner: null, t: 99 }); }
    for (const p of this.players.values()) {
      p.m = 0; p.pw = {}; p.fallsAtStart = p.stats.falls;
      p.lives = this.mode === 'leben' ? 3 : 0;
    }
    if (this.mode === 'farbe') { this.grid = new Uint8Array(GRID_N * GRID_N); this.gridDirty = true; }
    if (this.mode === 'huegel') this.moveZone();
    this.layoutPlayers();
    if (this.mode === 'fangen') { const all = [...this.players.values()]; if (all.length) this.tagger = pick(all).id; this.tagImmune = 0; }
    this.phase = 'countdown';
    this.timer = 3;
    this.message = '';
    this.emit({ k: 'count', n: 3 });
  }

  // Zufälliger Punkt auf der Insel, möglichst weit weg von `avoid`
  safeSpot(margin = 35, avoid = []) {
    let best = null, bestD = -1;
    for (let i = 0; i < 70; i++) {
      const a = rnd(0, TAU), r = Math.sqrt(Math.random()) * 330;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (!onGround(this.shapes, this.holes, x, y, margin * this.k)) continue;
      let d = 1e9;
      for (const q of avoid) d = Math.min(d, Math.hypot(q.x - x, q.y - y));
      if (d > bestD) { best = { x, y }; bestD = d; }
    }
    if (best) return best;
    const s = this.shapes[0];
    return { x: s.x, y: s.y };
  }

  sizeFor(p) {
    let r = this.card === 'riesen' ? PR * 1.7 : this.card === 'mini' ? PR * 0.6 : PR;
    if (p.pw.big > 0) r *= 1.6;
    return r;
  }

  layoutPlayers() {
    const placed = [];
    for (const p of this.players.values()) {
      const s = this.safeSpot(40, placed);
      placed.push(s);
      this.spawnAt(p, s);
    }
  }

  spawnAt(p, s) {
    p.x = s.x; p.y = s.y;
    p.vx = p.vy = 0;
    const d = Math.hypot(s.x, s.y) || 1;
    p.fx = -s.x / d; p.fy = -s.y / d;
    p.state = 'alive'; p.fallT = 0;
    p.dashCd = 0; p.dashT = 0; p.pupsCd = 0;
    p.lastHitBy = null; p.lastHitT = -99;
    p.dashSeen = p.input.d;
    p.r = this.sizeFor(p);
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
    this.timer = 2.5;
  }

  endRound(winner) {
    let text;
    if (winner) {
      winner.score += 1;
      text = `${winner.name} gewinnt die Runde!`;
      this.emit({ k: 'win', id: winner.id });
    } else {
      text = 'Unentschieden!';
      this.emit({ k: 'draw' });
    }
    this.message = text;
    this.roundWinner = winner ? winner.id : null;
    this.phase = 'roundEnd';
    this.timer = 3;
    if (this.mode === 'farbe') this.countCells();
  }

  afterRoundEnd() {
    const players = [...this.players.values()];
    if (!players.length) { this.backToLobby(); return; }
    const best = players.reduce((a, b) => (b.score > a.score ? b : a), players[0]);
    const leaders = players.filter(p => p.score === best.score);
    if (best.score >= this.target && leaders.length === 1) {
      this.phase = 'matchEnd';
      this.champion = best.id;
      this.message = `${best.name} ist Inselkönig!`;
      this.emit({ k: 'champion', id: best.id });
      return;
    }
    for (const p of players) if (p.score === this.target - 1) this.emit({ k: 'matchball', id: p.id });
    // Der Letzte im Gesamtstand darf das Chaos wählen (bei Gleichstand: wer zuerst rausflog)
    const low = Math.min(...players.map(p => p.score));
    const lows = players.filter(p => p.score === low);
    const firstOut = this.fallOrder.find(id => lows.some(p => p.id === id));
    this.picker = firstOut || pick(lows).id;
    this.chooseNext();
    const pool = CARD_IDS.filter(c => c !== this.lastCard && cardFits(c, this.mode, this.map));
    this.options = shuffle(pool).slice(0, 3);
    this.phase = 'cardPick';
    this.timer = 12;
    this.botPickT = rnd(1.5, 3);
  }

  fall(p, how) {
    if (p.state !== 'alive') return;
    p.state = 'falling';
    p.fallT = 0;
    p.stats.falls++;
    this.fallOrder.push(p.id);
    this.emit({ k: how === 'boom' ? 'boom' : 'plumps', x: p.x, y: p.y, id: p.id });
    if (this.potato === p.id) this.potato = null;
    if (this.mode === 'leben') p.lives--;
    if (this.mode === 'klassik' || (this.mode === 'leben' && p.lives <= 0)) this.elimOrder.push(p.id);
    if (this.mode === 'muenzen' && p.m > 0) {
      const lost = Math.ceil(p.m / 2);
      p.m -= lost;
      this.emit({ k: 'coinloss', id: p.id, n: lost });
    }
    const hitter = this.players.get(p.lastHitBy);
    if (hitter && hitter !== p && this.t - p.lastHitT < 3) {
      hitter.stats.ko++;
      if (this.crowned.has(p.id) && !this.regicided.has(p.id)) {
        this.regicided.add(p.id);
        hitter.score += 1;
        this.emit({ k: 'regicide', id: hitter.id, victim: p.id });
      }
    }
  }

  // ---------- Physik ----------

  step(dtReal) {
    if (this.phase === 'lobby') return;
    for (const p of this.players.values()) if (p.emoT > 0) p.emoT -= dtReal;
    if (this.phase === 'countdown') {
      const before = Math.ceil(this.timer);
      this.timer -= dtReal;
      const now = Math.ceil(this.timer);
      if (now !== before && now > 0) this.emit({ k: 'count', n: now });
      if (this.timer <= 0) { this.phase = 'play'; this.emit({ k: 'go' }); }
      return;
    }
    if (this.phase === 'roundEnd') {
      this.ghostStep(dtReal);
      this.timer -= dtReal;
      if (this.timer <= 0) this.afterRoundEnd();
      return;
    }
    if (this.phase === 'cardPick') {
      this.timer -= dtReal;
      const pk = this.players.get(this.picker);
      if (!pk || pk.bot) { this.botPickT -= dtReal; if (this.botPickT <= 0) this.choose(this.picker, Math.floor(Math.random() * 3)); }
      if (this.phase === 'cardPick' && this.timer <= 0) this.choose(this.picker, Math.floor(Math.random() * 3));
      return;
    }
    if (this.phase === 'cardShow') {
      this.timer -= dtReal;
      if (this.timer <= 0) this.beginCountdown();
      return;
    }
    if (this.phase !== 'play') return;

    const dt = this.card === 'zeitlupe' ? dtReal * 0.55 : dtReal;
    this.t += dt;
    const card = this.card;
    const mode = MODES[this.mode];
    const all = [...this.players.values()];
    const alive = all.filter(p => p.state === 'alive');

    // Insel bewegen / schrumpfen
    const shrinkStart = card === 'schrumpf' ? 2 : this.mode === 'klassik' ? 20 : this.mode === 'leben' ? 40 : Infinity;
    const shrinkRate = card === 'schrumpf' ? 0.055 : 0.03;
    if (this.t > shrinkStart) this.k = Math.max(0, this.k - shrinkRate * dt);
    const mapDef = MAPS[this.map];
    this.prevShapes = this.shapes;
    this.shapes = poseShapes(mapDef, this.t, this.k);
    if (mapDef.moving) {
      for (const p of alive) this.carry(p);
      for (const o of [...this.coins, ...this.items, ...this.bananas, ...this.bumpers]) this.carry(o);
      if (this.zone) this.carry(this.zone);
    }

    for (const p of all) if (p.bot) this.botThink(p, alive, dt);

    const dashCdBase = card === 'turbo' ? 0.35 : DASH_CD;
    const windA = this.t * 0.6;
    const wind = card === 'wind' ? { x: Math.cos(windA) * 330, y: Math.sin(windA) * 330 } : null;

    for (const p of alive) {
      for (const k of Object.keys(p.pw)) p.pw[k] = Math.max(0, p.pw[k] - dt);
      p.r += (this.sizeFor(p) - p.r) * Math.min(1, dt * 8);

      let { mx, my } = p.input;
      if (card === 'spiegel' && p.id !== this.cardOwner) { mx = -mx; my = -my; }
      if (card === 'wackel') { mx += Math.sin(this.t * 3 + p.ci * 2) * 0.6; my += Math.cos(this.t * 2.3 + p.ci) * 0.6; }
      let acc = card === 'mini' ? ACC * 1.25 : card === 'riesen' ? ACC * 0.85 : ACC;
      if (p.pw.speed > 0) acc *= 1.5;
      if (p.pw.anchor > 0) acc *= 0.8;
      if (this.mode === 'fangen' && this.tagger === p.id) acc *= 1.12;
      if (p.pw.slip > 0) acc *= 0.25;
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
      const fric = p.pw.slip > 0 ? 0.25 : card === 'eis' ? 0.45 : FRIC;
      const k = Math.exp(-fric * dt);
      p.vx *= k; p.vy *= k;
      if (Math.hypot(mx, my) > 0.2) { const m = Math.hypot(mx, my); p.fx = mx / m; p.fy = my / m; }

      p.dashCd = Math.max(0, p.dashCd - dt);
      p.dashT = Math.max(0, p.dashT - dt);
      if (p.input.d > p.dashSeen) {
        p.dashSeen = p.input.d;
        if (p.dashCd <= 0) {
          p.vx += p.fx * DASH_V; p.vy += p.fy * DASH_V;
          p.dashT = DASH_T; p.dashCd = p.pw.speed > 0 ? dashCdBase * 0.5 : dashCdBase;
          p.stats.dashes++;
          this.emit({ k: 'dash', id: p.id, x: p.x, y: p.y });
        }
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }

    this.collide(alive);
    this.bumperStep(alive);
    this.ghostStep(dt);
    this.itemStep(dt, alive);
    this.bananaStep(dt, alive);
    if (card === 'bomben') this.bombRain(dt, alive);
    this.bombStep(dt);
    if (card === 'kartoffel') this.potatoStep(dt, alive);
    if (card === 'tausch') this.swapStep(dt, alive);
    this.modeStep(dt, alive);

    for (const p of alive) {
      if (p.state === 'alive' && !onGround(this.shapes, this.holes, p.x, p.y)) this.fall(p, 'fall');
    }

    for (const p of all) {
      if (p.state !== 'falling') continue;
      p.fallT += dt;
      if (p.fallT < 1) { p.x += p.vx * dt * 0.3; p.y += p.vy * dt * 0.3; continue; }
      const canRespawn = mode.respawn && (this.mode !== 'leben' || p.lives > 0);
      if (canRespawn) {
        if (p.fallT > 1.7) {
          const others = all.filter(q => q !== p && q.state === 'alive');
          this.spawnAt(p, this.safeSpot(40, others));
          this.emit({ k: 'respawn', id: p.id });
        }
      } else {
        p.state = 'ghost'; p.gx = p.x; p.gy = p.y; p.pupsCd = 1.5; p.dashSeen = p.input.d;
      }
    }

    this.checkEnd(all, dt);
  }

  checkEnd(all, dt) {
    const mode = MODES[this.mode];
    if (this.mode === 'klassik' || this.mode === 'leben') {
      const inGame = all.filter(p => p.state === 'alive' || (this.mode === 'leben' && p.state === 'falling' && p.lives > 0));
      if (inGame.length <= 1) {
        this.endDelay += dt;
        if (this.endDelay > 0.7) {
          const w = inGame.length === 1 && inGame[0].state === 'alive' ? inGame[0] : null;
          this.endRound(w);
        }
      }
      return;
    }
    if (all.length < 2) { this.endRound(all[0] || null); return; }
    if (this.mode === 'huegel') {
      const w = all.find(p => p.m >= 1);
      if (w) { this.endRound(w); return; }
    }
    if (this.t >= mode.time) {
      if (this.mode === 'farbe') this.countCells();
      const score = (p) => (this.mode === 'fangen' ? -p.m : p.m);
      const best = Math.max(...all.map(score));
      let top = all.filter(p => score(p) === best);
      if (top.length > 1) { const f = Math.min(...top.map(p => p.stats.falls - (p.fallsAtStart || 0))); top = top.filter(p => p.stats.falls - (p.fallsAtStart || 0) === f); }
      if (top.length > 1 && this.mode === 'fangen') top = [pick(top)];
      this.endRound(top.length === 1 ? top[0] : null);
    }
  }

  carry(o) {
    const i = shapeIndexAt(this.prevShapes, o.x, o.y);
    if (i < 0) return;
    const [lx, ly] = toLocal(this.prevShapes[i], o.x, o.y);
    [o.x, o.y] = fromLocal(this.shapes[i], lx, ly);
  }

  massOf(p) { return p.r * p.r * (p.pw.anchor > 0 ? 5 : 1); }

  collide(alive) {
    const e = this.card === 'flummi' ? 2.3 : 0.9;
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i], b = alive[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy), min = a.r + b.r;
        if (d >= min || d === 0) continue;
        const nx = dx / d, ny = dy / d;
        const ma = this.massOf(a), mb = this.massOf(b);
        const overlap = min - d;
        a.x -= nx * overlap * mb / (ma + mb); a.y -= ny * overlap * mb / (ma + mb);
        b.x += nx * overlap * ma / (ma + mb); b.y += ny * overlap * ma / (ma + mb);
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          const jImp = -(1 + e) * rv / (1 / ma + 1 / mb);
          a.vx -= jImp / ma * nx; a.vy -= jImp / ma * ny;
          b.vx += jImp / mb * nx; b.vy += jImp / mb * ny;
        }
        // Dash-Treffer schubsen extra hart, mit Boxhandschuh noch viel härter
        const anchorB = b.pw.anchor > 0 ? 0.25 : 1, anchorA = a.pw.anchor > 0 ? 0.25 : 1;
        if (a.dashT > 0) { const f = (a.pw.glove > 0 ? 950 : 300) * anchorB; b.vx += nx * f; b.vy += ny * f; if (a.pw.glove > 0) this.emit({ k: 'punch', x: b.x, y: b.y }); }
        if (b.dashT > 0) { const f = (b.pw.glove > 0 ? 950 : 300) * anchorA; a.vx -= nx * f; a.vy -= ny * f; if (b.pw.glove > 0) this.emit({ k: 'punch', x: a.x, y: a.y }); }
        a.lastHitBy = b.id; a.lastHitT = this.t;
        b.lastHitBy = a.id; b.lastHitT = this.t;
        if (-rv > 80 || a.dashT > 0 || b.dashT > 0) this.emit({ k: 'boing', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, p: Math.min(1, -rv / 600) });
        if (this.card === 'kartoffel' && this.t > this.potatoImmune) {
          if (this.potato === a.id) this.passPotato(b.id);
          else if (this.potato === b.id) this.passPotato(a.id);
        }
        if (this.mode === 'fangen' && this.t > this.tagImmune) {
          if (this.tagger === a.id) this.passTag(b.id);
          else if (this.tagger === b.id) this.passTag(a.id);
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
              const f = 520 * (1 - dd / (R + 10)) * (q.pw.anchor > 0 ? 0.3 : 1);
              q.vx += dx / dd * f; q.vy += dy / dd * f;
              q.lastHitBy = p.id; q.lastHitT = this.t;
              p.stats.pups++;
            }
          }
        }
      }
    }
  }

  // ---------- Power-ups ----------

  itemStep(dt, alive) {
    this.itemT -= dt;
    const many = this.card === 'geschenk';
    const max = many ? 6 : this.players.size >= 5 ? 3 : 2;
    if (this.itemT <= 0) {
      this.itemT = many ? rnd(0.6, 1.2) : rnd(5, 8);
      if (this.items.length < max) {
        const s = this.safeSpot(30, [...alive, ...this.items]);
        this.items.push({ x: s.x, y: s.y, type: pick(ITEM_IDS), t: 12 });
      }
    }
    for (const it of this.items) {
      it.t -= dt;
      for (const p of alive) {
        if (it.t > 0 && Math.hypot(p.x - it.x, p.y - it.y) < p.r + 16) { this.applyItem(p, it.type, alive); it.t = 0; break; }
      }
    }
    this.items = this.items.filter(it => it.t > 0);
  }

  applyItem(p, type, alive) {
    p.stats.items++;
    this.emit({ k: 'item', id: p.id, type });
    switch (type) {
      case 'glove': p.pw.glove = 8; break;
      case 'anchor': p.pw.anchor = 6; break;
      case 'big': p.pw.big = 7; break;
      case 'speed': p.pw.speed = 7; break;
      case 'invis': p.pw.invis = 5; break;
      case 'banana': p.pw.banana = 2.4; p.bananaT = 0; break;
      case 'bomb': this.bombs.push({ x: p.x, y: p.y, t: 1.6, max: 1.6, owner: p.id }); break;
      case 'swap': {
        const others = alive.filter(q => q !== p && q.state === 'alive');
        if (others.length) {
          const q = pick(others);
          [p.x, q.x] = [q.x, p.x]; [p.y, q.y] = [q.y, p.y];
          this.emit({ k: 'swap' });
        }
        break;
      }
      default:
    }
  }

  bananaStep(dt, alive) {
    for (const p of alive) {
      if (!(p.pw.banana > 0)) continue;
      p.bananaT -= dt;
      if (p.bananaT <= 0 && this.bananas.length < 20) {
        p.bananaT = 0.6;
        this.bananas.push({ x: p.x - p.fx * (p.r + 14), y: p.y - p.fy * (p.r + 14), owner: p.id, t: 25, born: this.t });
      }
    }
    for (const b of this.bananas) {
      b.t -= dt;
      for (const p of alive) {
        if (b.t <= 0) break;
        if (b.owner === p.id && this.t - b.born < 1) continue;
        if (Math.hypot(p.x - b.x, p.y - b.y) < p.r + 10) {
          b.t = 0;
          p.pw.slip = 1.5;
          const sp = Math.max(250, Math.hypot(p.vx, p.vy) * 1.6);
          const a = Math.atan2(p.vy, p.vx) + rnd(-0.6, 0.6);
          p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
          if (b.owner) { p.lastHitBy = b.owner; p.lastHitT = this.t; }
          this.emit({ k: 'slip', id: p.id, x: p.x, y: p.y });
        }
      }
    }
    this.bananas = this.bananas.filter(b => b.t > 0);
  }

  bombRain(dt, alive) {
    this.bombT -= dt;
    if (this.bombT > 0) return;
    this.bombT = rnd(0.7, 1.4);
    // Bomben fallen bevorzugt in die Nähe von Spielern
    const target = alive.length && Math.random() < 0.6 ? pick(alive) : null;
    const s = target ? { x: target.x + rnd(-60, 60), y: target.y + rnd(-60, 60) } : this.safeSpot(0);
    this.bombs.push({ x: s.x, y: s.y, t: 1.3, max: 1.3 });
  }

  bombStep(dt) {
    for (const b of this.bombs) {
      b.t -= dt;
      if (b.t <= 0) {
        this.emit({ k: 'boom', x: b.x, y: b.y });
        this.blast(b.x, b.y, 95, 620, null, b.owner);
      }
    }
    this.bombs = this.bombs.filter(b => b.t > 0);
  }

  blast(x, y, R, F, exclude, owner) {
    for (const q of this.players.values()) {
      if (q.state !== 'alive' || q === exclude) continue;
      const dx = q.x - x, dy = q.y - y, d = Math.hypot(dx, dy) || 1;
      if (d < R + q.r) {
        const f = F * (1 - d / (R + q.r + 10)) * (q.pw.anchor > 0 ? 0.35 : 1);
        q.vx += dx / d * f; q.vy += dy / d * f;
        if (owner && owner !== q.id) { q.lastHitBy = owner; q.lastHitT = this.t; }
      }
    }
  }

  passPotato(id) {
    this.potato = id;
    this.potatoImmune = this.t + 0.5;
    this.emit({ k: 'potato', id });
  }

  potatoStep(dt, alive) {
    if (!this.potato || !this.players.has(this.potato) || this.players.get(this.potato).state !== 'alive') {
      this.potato = null;
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
      this.blast(h.x, h.y, 110, 500, h);
      this.fall(h, 'boom');
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

  // ---------- Modi ----------

  moveZone() {
    const s = this.safeSpot(70, this.zone ? [this.zone] : []);
    this.zone = { x: s.x, y: s.y, r: 70, t: 9 };
  }

  passTag(id) {
    this.tagger = id;
    this.tagImmune = this.t + 0.9;
    this.emit({ k: 'tag', id });
  }

  countCells() {
    if (!this.grid) return;
    const counts = new Map();
    for (const v of this.grid) if (v) counts.set(v - 1, (counts.get(v - 1) || 0) + 1);
    for (const p of this.players.values()) p.m = counts.get(p.ci) || 0;
  }

  modeStep(dt, alive) {
    if (this.mode === 'huegel') {
      const z = this.zone;
      z.t -= dt;
      if (z.t <= 0 || !onGround(this.shapes, this.holes, z.x, z.y, 20)) { this.moveZone(); this.emit({ k: 'zone' }); }
      const inside = alive.filter(p => Math.hypot(p.x - z.x, p.y - z.y) < z.r);
      z.owner = inside.length === 1 ? inside[0].id : inside.length > 1 ? 'contested' : null;
      if (inside.length === 1) inside[0].m = Math.min(1, inside[0].m + dt / 12);
    } else if (this.mode === 'muenzen') {
      this.coinT -= dt;
      if (this.coinT <= 0 && this.coins.length < 12) {
        this.coinT = 0.45;
        const s = this.safeSpot(25, this.coins);
        this.coins.push({ x: s.x, y: s.y });
      }
      this.coins = this.coins.filter((c) => {
        if (!onGround(this.shapes, this.holes, c.x, c.y)) return false;
        for (const p of alive) {
          if (Math.hypot(p.x - c.x, p.y - c.y) < p.r + 12) { p.m += 1; this.emit({ k: 'coin', id: p.id, x: c.x, y: c.y }); return false; }
        }
        return true;
      });
    } else if (this.mode === 'farbe') {
      const off = GRID_N * CELL / 2;
      for (const p of alive) {
        const r = p.r + 6;
        const x0 = Math.floor((p.x - r + off) / CELL), x1 = Math.floor((p.x + r + off) / CELL);
        const y0 = Math.floor((p.y - r + off) / CELL), y1 = Math.floor((p.y + r + off) / CELL);
        for (let gy = Math.max(0, y0); gy <= Math.min(GRID_N - 1, y1); gy++) {
          for (let gx = Math.max(0, x0); gx <= Math.min(GRID_N - 1, x1); gx++) {
            const cx = gx * CELL - off + CELL / 2, cy = gy * CELL - off + CELL / 2;
            if (Math.hypot(cx - p.x, cy - p.y) > r) continue;
            if (!onGround(this.shapes, this.holes, cx, cy)) continue;
            const i = gy * GRID_N + gx;
            if (this.grid[i] !== p.ci + 1) { this.grid[i] = p.ci + 1; this.gridDirty = true; }
          }
        }
      }
      this.countT = (this.countT || 0) - dt;
      if (this.countT <= 0) { this.countT = 0.3; this.countCells(); }
    } else if (this.mode === 'fangen') {
      if (!this.tagger || !this.players.has(this.tagger)) {
        if (alive.length) this.passTag(pick(alive).id);
      }
      const t = this.players.get(this.tagger);
      if (t) t.m += dt;
    }
  }

  // ---------- Bots ----------

  botThink(p, alive, dt) {
    const L = BOT_LEVELS[this.botLevel] || BOT_LEVELS[0];
    const b = p.botBrain;
    b.wobble += dt * 3;
    b.cd -= dt;
    if (b.cd > 0) return; // Reaktionszeit: alte Eingabe bleibt stehen
    b.cd = L.react * rnd(0.7, 1.3);
    let mx = 0, my = 0, dash = false;

    if (p.state === 'ghost') {
      const target = alive.length ? alive[Math.floor((b.wobble / 5) % alive.length)] : null;
      if (target) {
        mx = target.x - p.gx; my = target.y - p.gy;
        if (Math.hypot(mx, my) < 80 && Math.random() < L.pups) dash = true;
      }
    } else if (p.state === 'alive') {
      const others = alive.filter(q => q !== p);
      const nearest = (list) => list.reduce((a, q) => (!a || Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(a.x - p.x, a.y - p.y) ? q : a), null);
      let goal = null, flee = null, attack = true;
      const foe = nearest(others);

      if (this.mode === 'huegel' && this.zone) {
        const inZone = Math.hypot(p.x - this.zone.x, p.y - this.zone.y) < this.zone.r - 15;
        goal = inZone ? (foe && Math.hypot(foe.x - this.zone.x, foe.y - this.zone.y) < this.zone.r + 30 ? foe : null) : this.zone;
        attack = inZone;
      } else if (this.mode === 'muenzen') {
        goal = nearest(this.coins) || foe;
        attack = !this.coins.length;
      } else if (this.mode === 'farbe') {
        b.goalT -= L.react;
        if (!b.goal || b.goalT <= 0 || Math.hypot(b.goal.x - p.x, b.goal.y - p.y) < 30) { b.goal = this.safeSpot(50); b.goalT = rnd(1.5, 3); }
        goal = Math.random() < 0.25 ? foe : b.goal;
        attack = goal === foe;
      } else if (this.mode === 'fangen') {
        if (this.tagger === p.id) goal = foe;
        else { const t = this.players.get(this.tagger); if (t && t.state === 'alive') flee = t; else goal = foe; }
      } else {
        goal = foe;
      }
      if (this.potato === p.id) goal = foe;
      else if (this.potato) { const h = this.players.get(this.potato); if (h && Math.hypot(h.x - p.x, h.y - p.y) < 170) flee = h; }
      const item = nearest(this.items);
      if (item && Math.hypot(item.x - p.x, item.y - p.y) < 140 && Math.random() < 0.6) { goal = item; attack = false; }

      if (flee) {
        const dx = p.x - flee.x, dy = p.y - flee.y, d = Math.hypot(dx, dy) || 1;
        mx = dx / d + (-p.x) / 400; my = dy / d + (-p.y) / 400;
      } else if (goal) {
        const err = L.aimErr;
        mx = goal.x + rnd(-err, err) - p.x; my = goal.y + rnd(-err, err) - p.y;
        const d = Math.hypot(goal.x - p.x, goal.y - p.y);
        if (attack && goal === foe && d < L.range + p.r && Math.random() < L.dash) dash = true;
        if (this.potato === p.id && d < 120) dash = Math.random() < 0.3;
      }
      for (const bo of this.bombs) {
        const dx = p.x - bo.x, dy = p.y - bo.y, d = Math.hypot(dx, dy) || 1;
        if (d < 130) { mx += dx / d * 3; my += dy / d * 3; }
      }
      let m = Math.hypot(mx, my) || 1;
      mx /= m; my /= m;

      if (Math.random() < L.derp) { const a = rnd(0, TAU); mx = Math.cos(a); my = Math.sin(a); dash = false; }
      // Vorsicht am Rand: wohin trägt uns der Schwung, und ist da noch Boden?
      if (Math.random() < L.care) {
        const ahead = (dx, dy, s) => onGround(this.shapes, this.holes, p.x + dx * s, p.y + dy * s, 12);
        // Wer langsam reagiert, muss weiter vorausschauen
        const look = L.react + 0.3;
        const momentumBad = !onGround(this.shapes, this.holes, p.x + p.vx * look, p.y + p.vy * look, 12);
        const reach = 45 + Math.hypot(p.vx, p.vy) * L.react + 0.5 * ACC * L.speed * L.react * L.react;
        if (momentumBad || !ahead(mx, my, reach) || !ahead(mx, my, reach / 2)) {
          let best = null, bestScore = -1e9;
          for (let i = 0; i < 12; i++) {
            const a = i / 12 * TAU, dx = Math.cos(a), dy = Math.sin(a);
            if (!ahead(dx, dy, reach) || !ahead(dx, dy, 25)) continue;
            const sp = Math.hypot(p.vx, p.vy) || 1;
            const s = dx * mx + dy * my - (momentumBad ? 2.5 * (dx * p.vx + dy * p.vy) / sp : 0);
            if (s > bestScore) { bestScore = s; best = [dx, dy]; }
          }
          if (best) [mx, my] = best;
          dash = false;
        }
      }
      mx *= L.speed; my *= L.speed;
      // Bots fallen (meistens) nicht auf die Spiegelwelt rein
      if (this.card === 'spiegel' && p.id !== this.cardOwner && Math.random() < L.care) { mx = -mx; my = -my; }
    }
    const m = Math.hypot(mx, my);
    if (m > 1) { mx /= m; my /= m; }
    p.input = { mx, my, d: p.input.d + (dash ? 1 : 0) };
  }

  // ---------- Snapshot fürs Netzwerk ----------

  awards() {
    const list = [...this.players.values()];
    const out = [];
    const top = (key, emoji, title, unit) => {
      const best = list.reduce((a, p) => (!a || p.stats[key] > a.stats[key] ? p : a), null);
      if (best && best.stats[key] > 0) out.push([emoji, title, best.name, `${best.stats[key]} ${unit}`]);
    };
    top('ko', '🥊', 'Rausschubser', 'Rauswürfe');
    top('falls', '🌊', 'Wasserratte', 'mal geplumpst');
    top('pups', '💨', 'Pups-Meister', 'Pups-Treffer');
    top('items', '🎁', 'Sammler', 'Power-ups');
    top('dashes', '⚡', 'Dash-Junkie', 'Dashes');
    return out;
  }

  snapshot(events, withGrid = true) {
    const mode = MODES[this.mode];
    const s = {
      t: 's',
      ph: this.phase, tm: r1(this.timer), rd: this.round,
      mo: this.mode, mp: this.map, tl: mode.time ? Math.max(0, r1(mode.time - this.t)) : null,
      ar: packShapes(this.shapes), ho: this.holes.map(h => [h.x, h.y, h.r]), sk: this.k < 1 ? 1 : 0,
      c: this.card, co: this.cardOwner, tg: this.target, msg: this.message,
      pk: this.picker, op: this.phase === 'cardPick' || this.phase === 'cardShow' ? this.options : null,
      po: this.potato, pt: this.potato ? r1(this.potatoT) : 0, ig: this.mode === 'fangen' ? this.tagger : null,
      cr: [...this.crowned], ch: this.champion, rw: this.roundWinner,
      bm: this.bombs.map(b => [r1(b.x), r1(b.y), r1(b.t / b.max)]),
      bu: this.bumpers.map(b => [r1(b.x), r1(b.y), b.r]),
      it: this.items.map(i => [r1(i.x), r1(i.y), i.type, i.t < 3 ? 1 : 0]),
      bn: this.bananas.map(b => [r1(b.x), r1(b.y)]),
      cn: this.coins.map(c => [r1(c.x), r1(c.y)]),
      zn: this.zone ? [r1(this.zone.x), r1(this.zone.y), this.zone.r, this.zone.owner || null] : null,
      aw: this.phase === 'matchEnd' ? this.awards() : null,
      p: [...this.players.values()].map(p => ({
        id: p.id, n: p.name, c: p.color, ci: p.ci, b: p.bot ? 1 : 0, h: p.hat,
        x: r1(p.state === 'ghost' ? p.gx : p.x), y: r1(p.state === 'ghost' ? p.gy : p.y),
        vx: r1(p.vx), vy: r1(p.vy), fx: r1(p.fx), fy: r1(p.fy), r: r1(p.r),
        st: p.state, f: r1(p.fallT), s: p.score, lv: p.lives, m: r1(p.m),
        dc: p.state === 'ghost' ? r1(p.pupsCd / (this.card === 'geister' ? 1.3 : PUPS_CD)) : r1(Math.min(1, p.dashCd / (this.card === 'turbo' ? 0.35 : DASH_CD))),
        dt: p.dashT > 0 ? 1 : 0,
        pw: Object.keys(p.pw).filter(k => p.pw[k] > 0 && ITEMS[k]).join(','),
        iv: p.pw.invis > 0 ? 1 : 0, sl: p.pw.slip > 0 ? 1 : 0,
        em: p.emoT > 0 ? p.emo : -1,
      })),
      ev: events || [],
    };
    if (this.grid && withGrid) {
      s.gr = Array.from(this.grid, v => v.toString(36)).join('');
    }
    return s;
  }
}
