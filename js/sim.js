// Spiel-Kern: Spieler, Physik, Ablauf, Welt-Objekte und Snapshot.
// Läuft nur beim Host (autoritativ) und kennt kein DOM.
// Modi, Chaos-Karten, Power-ups und Inseln hängen sich über Hooks ein:
//   js/modes/*.js, js/cards/*.js, js/items/*.js, js/maps/*.js
import { T } from './tuning.js';
import { Rng, deriveSeed, randomSeed } from './rng.js';
import { poseShapes, onGround, shapeIndexAt, toLocal, fromLocal, packShapes } from './geometry.js';
import { MAPS, MAP_IDS } from './maps/index.js';
import { MODES, MODE_IDS, MODE_POOL } from './modes/index.js';
import { CARDS, CARD_IDS, NO_CARD } from './cards/index.js';
import { ITEMS, ITEM_IDS, EFFECTS } from './items/index.js';
import { botThink } from './bots.js';

export { MAPS, MAP_IDS, MODES, MODE_IDS, CARDS, CARD_IDS, ITEMS, ITEM_IDS };
export { BOT_LEVELS } from './tuning.js';

// Farbenblind-freundlich (Okabe-Ito), jede Farbe hat zusätzlich ein Muster (docs/STYLE.md)
export const COLORS = ['#E8603C', '#4DB3EA', '#F4D54A', '#17A37A', '#CC79A7', '#3A5FBF'];
export const MAX_PLAYERS = 6;
export const HAT_COUNT = 14;    // Hüte 0..13 (0 = ohne), gezeichnet in js/art/icons.js
export const EMOTE_COUNT = 5;

const TAU = Math.PI * 2;
// Auf diesen Inseln wird das Finale gespielt (nichts bewegt sich, alles gut lesbar)
const FINALE_MAPS = ['rund', 'quadrat', 'knolle', 'stern'];
const r1 = (v) => Math.round(v * 10) / 10;
const validHat = (h) => ((h | 0) >= 0 && (h | 0) < HAT_COUNT ? h | 0 : 0);
const newStats = () => ({ ko: 0, falls: 0, pups: 0, items: 0, dashes: 0, saves: 0, counters: 0, breaks: 0 });
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, k) => a + (b - a) * k;

export class Game {
  constructor({ seed } = {}) {
    this.seed = (seed ?? randomSeed()) >>> 0;
    this.matchRng = new Rng(this.seed);   // Modus-, Insel- und Kartenwahl
    this.rng = new Rng(deriveSeed(this.seed, 0)); // alles innerhalb einer Runde
    this.roundSeed = this.rng.seed;
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
    this.tick = 0;            // zählt jeden Simulationsschritt (für die Wiederholung)
    this.finale = false;
    this.free = false;        // freies Herumschwabbeln während der Kartenwahl
    this.fallRecs = [];       // letzte Stürze für die Wiederholung
    this.replay = null;
    this.resetArena();
  }

  // Aktive Module
  get M() { return MODES[this.mode]; }
  get C() { return (this.card && CARDS[this.card]) || NO_CARD; }
  get mapDef() { return MAPS[this.map]; }

  resetArena() {
    this.t = 0;
    this.k = 1;
    this.holes = [...(this.mapDef.holes || [])];
    this.shapeMul = {};   // Formen, die gerade versinken (Index -> Größe 0..1)
    this.hz = [];         // angekündigte Gefahren der Insel
    this.crates = [];     // schiebbare Kisten
    this.mapS = {};       // Zustand der Insel-Mechanik
    this.shapes = this.pose(0);
    this.prevShapes = this.shapes;
    this.bombs = [];
    this.bumpers = [];
    this.items = [];
    this.itemT = this.rng.range(T.ITEM_FIRST_MIN, T.ITEM_FIRST_MAX);
    this.bananas = [];
    this.ms = { id: this.mode };   // Zustand des Modus
    this.cs = { id: this.card };   // Zustand der Karte
    this.elimOrder = [];
    this.fallOrder = [];
    this.crowned = new Set();
    this.regicided = new Set();
    this.endDelay = 0;
    this.gm = this.globalMods();
  }

  // Lage aller Formen zur Zeit t (inklusive Schrumpfen und versinkender Teile)
  pose(t) {
    const md = this.mapDef;
    const shapes = poseShapes(md, md.warp ? md.warp(t) : t, this.k);
    for (const i in this.shapeMul) {
      const sh = shapes[i], m = this.shapeMul[i];
      if (!sh) continue;
      if (sh.k === 'c') sh.r *= m; else { sh.w *= m; sh.h *= m; }
    }
    return shapes;
  }

  // Gefahr ankündigen: { kind, x, y, r, warn, i?, fire(g) } – nach `warn` Sekunden passiert es
  warn(h) {
    h.t = h.max = h.warn;
    this.hz.push(h);
    this.emit({ k: 'hazard', kind: h.kind, x: Math.round(h.x), y: Math.round(h.y) });
  }

  hazardStep(dt) {
    for (const h of this.hz) {
      h.t -= dt;
      if (h.t <= 0) { h.done = true; h.fire?.(this, h); }
    }
    this.hz = this.hz.filter(h => !h.done);
  }

  // Werte, die für alle gelten; Karten dürfen sie verändern
  globalMods() {
    const gm = {
      fric: T.FRIC, restitution: T.RESTITUTION, dashCd: T.DASH_CD, accMul: 1, sizeMul: 1, dtScale: 1,
      pupsCd: T.PUPS_CD, pupsR: T.PUPS_R,
      itemEvery: [T.ITEM_EVERY_MIN, T.ITEM_EVERY_MAX], itemMax: T.ITEM_MAX + (this.players && this.players.size >= 5 ? 1 : 0),
      shrinkStart: this.M.shrinkStart ? this.M.shrinkStart() : Infinity, shrinkRate: T.SHRINK_RATE,
    };
    this.C.globalMods?.(this, gm);
    if (this.finale) gm.shrinkStart = Math.min(gm.shrinkStart, T.FINALE_SHRINK);
    return gm;
  }

  // Werte für einen Spieler: Modus und laufende Effekte (Power-ups, Ausrutschen) dürfen sie verändern
  playerMods(p) {
    const gm = this.gm;
    const pm = {
      acc: T.ACC * gm.accMul, fric: gm.fric, dashCd: gm.dashCd, dashMul: 1, punch: false,
      size: gm.sizeMul, mass: 1, takeDash: 1, takePups: 1, takeBlast: 1,
    };
    if (p.charging) pm.acc *= T.CHARGE_ACC;
    if (p.braceT > 0) {
      pm.acc *= T.BRACE_ACC; pm.fric *= T.BRACE_FRIC; pm.mass *= T.BRACE_MASS;
      pm.takeDash *= T.BRACE_TAKE; pm.takePups *= T.BRACE_TAKE_OTHER; pm.takeBlast *= T.BRACE_TAKE_OTHER;
    }
    if (p.edgeAge > 0) pm.fric *= T.EDGE_FRIC;
    this.M.playerMods?.(this, p, pm);
    this.C.playerMods?.(this, p, pm);
    for (const k in p.pw) if (p.pw[k] > 0) EFFECTS[k]?.mods?.(this, p, pm);
    if (p.dazeT > 0) pm.acc = 0;
    return pm;
  }

  // Für Karten: Wer hat sie gewählt, wer führt (Krone zu Rundenbeginn)?
  isPicker(p) { return !!this.cardOwner && p.id === this.cardOwner; }
  isLeader(p) { return this.crowned.has(p.id); }

  sizeFor(p) { return T.BLOB_R * this.playerMods(p).size; }

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
      hat: validHat(hat),
      botLevel: null, // null = Stärke aus der Lobby
      x: 0, y: 0, vx: 0, vy: 0, r: T.BLOB_R, fx: 0, fy: 1,
      state: 'ghost', fallT: 0, gx: 0, gy: 0,
      dashCd: 0, dashT: 0, dashSeen: 0, pupsCd: 0,
      score: 0, lastHitBy: null, lastHitT: -99,
      lives: 0, m: 0, pw: {}, emo: null, emoT: 0,
      stats: newStats(), ready: bot,
      input: { mx: 0, my: 0, d: 0, u: 0, b: 0, h: 0 },
      botBrain: { cd: 0, wobble: this.rng.range(0, 6), goal: null, goalT: 0, releaseAt: null, seenDash: {} },
    };
    this.resetCombat(p);
    if (bot) p.hat = 1 + this.rng.int(HAT_COUNT - 1);
    this.players.set(id, p);
    // Wer mitten im Match dazukommt, startet fair mit dem Punktestand des Letzten
    // und ist bis zur nächsten Runde Geist.
    if (this.phase === 'lobby') this.layoutPlayers();
    else {
      const others = [...this.players.values()].filter(q => q !== p);
      p.score = others.length ? Math.min(...others.map(q => q.score)) : 0;
      if (this.free) this.spawnAt(p, this.safeSpot(T.SPAWN_MARGIN));
      else { const s = this.safeSpot(); p.gx = s.x; p.gy = s.y; }
    }
    return p;
  }

  removePlayer(id) {
    if (!this.players.has(id)) return;
    this.players.delete(id);
    if (this.cardOwner === id) this.cardOwner = null;
    if (this.phase === 'pick' && this.picker === id) this.picker = null;
    this.M.onRemove?.(this, id);
    this.C.onRemove?.(this, id);
  }

  setInput(id, inp) {
    const p = this.players.get(id);
    if (!p || !inp) return;
    let mx = +inp.mx || 0, my = +inp.my || 0;
    const m = Math.hypot(mx, my);
    if (m > 1) { mx /= m; my /= m; }
    // d = Dash gedrückt, u = Dash losgelassen, b = Stemmen gedrückt (jeweils Zähler), h = Dash wird gehalten
    const old = p.input;
    p.input = { mx, my, d: Math.max(old.d, +inp.d || 0), u: Math.max(old.u, +inp.u || 0), b: Math.max(old.b, +inp.b || 0), h: inp.h ? 1 : 0 };
  }

  // Kampf-Zustand zurücksetzen (beim Erscheinen und Wiederkehren)
  resetCombat(p) {
    p.dashSeen = p.input.d; p.relSeen = p.input.u; p.braceSeen = p.input.b;
    p.pressAt = null; p.relAt = null;
    p.charging = false; p.chargeT = 0; p.chargeStart = 0; p.dashCharge = 0;
    p.braceT = 0; p.braceAge = 9; p.braceCd = 0;
    p.dazeT = 0; p.edgeAge = 0; p.wobbleAt = -9;
  }

  setReady(id, ready) {
    const p = this.players.get(id);
    if (p) p.ready = !!ready;
  }

  // Farbe selbst wählen, sofern sie noch frei ist (Farbe und Muster hängen zusammen)
  setColor(id, ci) {
    const p = this.players.get(id);
    ci |= 0;
    if (!p || ci < 0 || ci >= COLORS.length) return false;
    if ([...this.players.values()].some(q => q !== p && q.ci === ci)) return false;
    p.ci = ci; p.color = COLORS[ci];
    return true;
  }

  // Wer mitten im Match geht, wird von einem Bot ersetzt, damit keine Lücke entsteht
  botify(id) {
    const p = this.players.get(id);
    if (!p || p.bot) return;
    p.bot = true; p.ready = true; p.botLevel = null;
    p.input = { ...p.input, mx: 0, my: 0, h: 0 };
    this.emit({ k: 'botified', id });
  }

  setHat(id, hat) {
    const p = this.players.get(id);
    if (p) p.hat = validHat(hat);
  }

  emote(id, i) {
    const p = this.players.get(id);
    if (!p || (i | 0) < 0 || (i | 0) >= EMOTE_COUNT || p.emoT > 0.6) return;
    p.emo = i | 0; p.emoT = T.EMOTE_TIME;
  }

  emit(e) { this.events.push(e); }
  drainEvents() { const e = this.events; this.events = []; return e; }

  // ---------- Ablauf ----------

  startMatch() {
    if (this.players.size < 2) return false;
    for (const p of this.players.values()) { p.score = 0; p.stats = newStats(); }
    this.round = 0;
    this.card = null;
    this.cardOwner = null;
    this.lastCard = null;
    this.champion = null;
    this.finale = false;
    this.mode = 'klassik';
    this.map = 'rund';
    this.beginCountdown();
    return true;
  }

  backToLobby() {
    this.phase = 'lobby';
    this.card = null;
    this.finale = false;
    this.free = false;
    for (const p of this.players.values()) p.ready = p.bot;
    this.map = 'rund';
    this.mode = 'klassik';
    this.resetArena();
    this.message = '';
    this.layoutPlayers();
  }

  chooseNext() {
    const r = this.matchRng;
    if (!this.modeMix) this.mode = 'klassik';
    // Nie zweimal hintereinander derselbe Modus
    else this.mode = r.pick(MODE_POOL.filter(m => m !== this.mode));
    const maps = MAP_IDS.filter(m => m !== this.map && !(this.M.still && MAPS[m].moving));
    this.map = r.pick(maps);
  }

  beginCountdown() {
    this.round++;
    this.free = false;
    this.roundSeed = deriveSeed(this.seed, this.round);
    this.rng = new Rng(this.roundSeed);
    this.resetArena();
    this.fallRecs = [];
    this.replay = null;
    if (this.finale) { this.k = T.FINALE_SCALE; this.shapes = this.pose(0); this.prevShapes = this.shapes; }
    const max = Math.max(0, ...[...this.players.values()].map(p => p.score));
    if (max > 0) for (const p of this.players.values()) if (p.score === max) this.crowned.add(p.id);
    for (const p of this.players.values()) {
      p.m = 0; p.pw = {}; p.lives = 0; p.fallsAtStart = p.stats.falls;
    }
    this.startCount = this.players.size;
    this.duel = null; this.duelT = 0; this.hitstop = 0;
    this.C.setup?.(this);
    this.mapDef.setup?.(this);
    this.M.setup?.(this);
    this.layoutPlayers();
    this.M.afterLayout?.(this);
    this.C.afterLayout?.(this);
    this.phase = 'countdown';
    this.timer = T.COUNTDOWN;
    this.message = '';
    this.emit({ k: 'count', n: Math.ceil(T.COUNTDOWN) });
  }

  // Zufälliger Punkt auf der Insel, möglichst weit weg von `avoid`
  safeSpot(margin = 35, avoid = []) {
    let best = null, bestD = -1;
    for (let i = 0; i < 70; i++) {
      const a = this.rng.range(0, TAU), r = Math.sqrt(this.rng.next()) * 330;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (!onGround(this.shapes, this.holes, x, y, margin * this.k)) continue;
      if (this.hz.some(h => Math.hypot(h.x - x, h.y - y) < h.r + margin)) continue;
      let d = 1e9;
      for (const q of avoid) d = Math.min(d, Math.hypot(q.x - x, q.y - y));
      if (d > bestD) { best = { x, y }; bestD = d; }
    }
    if (best) return best;
    const s = this.shapes[0];
    return { x: s.x, y: s.y };
  }

  layoutPlayers() {
    const placed = [];
    for (const p of this.players.values()) {
      const s = this.safeSpot(T.SPAWN_MARGIN, placed);
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
    this.resetCombat(p);
    p.r = this.sizeFor(p);
  }

  choose(playerId, idx) {
    if (this.phase !== 'pick' || !this.options) return;
    if (this.picker && playerId !== this.picker) return;
    const id = this.options[idx];
    if (!id) return;
    this.card = id;
    this.lastCard = id;
    this.cardOwner = this.picker;
    this.emit({ k: 'card', card: id, by: this.picker });
    this.beginCountdown();
  }

  // Punkte vergeben: Wer Matchball hat, kann nur im Finale den letzten Punkt holen
  addPoint(p, finaleWin = false) {
    const cap = finaleWin ? this.target : this.target - 1;
    p.score = Math.max(p.score, Math.min(p.score + 1, cap));
  }

  endRound(winner) {
    if (winner) {
      this.addPoint(winner, this.finale && winner.score >= this.target - 1);
      this.message = `${winner.name} gewinnt die Runde!`;
      this.emit({ k: 'win', id: winner.id });
    } else {
      this.message = 'Unentschieden!';
      this.emit({ k: 'draw' });
    }
    this.roundWinner = winner ? winner.id : null;
    this.phase = 'roundEnd';
    this.timer = T.ROUND_END;
    this.M.onEnd?.(this);
    this.replay = this.pickReplay();
    if (this.replay) this.emit({ k: 'replay', ...this.replay });
  }

  // Welcher Sturz wird wiederholt? Bei „Letzter Blob“/„Drei Leben“ der entscheidende,
  // in Modi mit Zeitlimit der letzte Rauswurf (wenn er nicht zu lange her ist).
  pickReplay() {
    const recs = this.fallRecs;
    const rec = this.M.contenders ? recs[recs.length - 1] : [...recs].reverse().find(r => r.a);
    if (!rec || this.tick - rec.tk > T.REPLAY_KEEP * 60) return null;
    return {
      from: rec.tk - Math.round(T.REPLAY_BEFORE * 60), to: rec.tk + Math.round(T.REPLAY_AFTER * 60),
      a: rec.a, v: rec.v, x: Math.round(rec.x), y: Math.round(rec.y), speed: T.REPLAY_SPEED,
    };
  }

  afterRoundEnd() {
    const players = [...this.players.values()];
    if (!players.length) { this.backToLobby(); return; }
    const champ = players.find(p => p.score >= this.target);
    if (champ) {
      this.phase = 'matchEnd';
      this.champion = champ.id;
      this.message = `${champ.name} ist Inselkönig!`;
      this.emit({ k: 'champion', id: champ.id });
      return;
    }
    // Finale: Wer Matchball hat, muss eine Runde „Letzter Blob“ gewinnen.
    // Klappt das nicht, folgt erst wieder eine normale Runde.
    const wasFinale = this.finale;
    const matchball = players.filter(p => p.score >= this.target - 1);
    this.finale = !wasFinale && matchball.length > 0;
    if (this.finale) {
      this.mode = 'klassik';
      this.map = this.matchRng.pick(FINALE_MAPS.filter(m => m !== this.map));
      this.options = null;
      this.picker = null;
      this.prepareFree();
      this.phase = 'pick';
      this.timer = T.FINALE_INTRO;
      this.emit({ k: 'finale', ids: matchball.map(p => p.id) });
      return;
    }
    // Der Letzte im Gesamtstand darf das Chaos wählen (bei Gleichstand: wer zuerst rausflog)
    const low = Math.min(...players.map(p => p.score));
    const lows = players.filter(p => p.score === low);
    const firstOut = this.fallOrder.find(id => lows.some(p => p.id === id));
    this.picker = firstOut || this.matchRng.pick(lows).id;
    this.chooseNext();
    const pool = CARD_IDS.filter(c => c !== this.lastCard && (CARDS[c].fits?.(this.mode, MAPS[this.map]) ?? true));
    this.options = this.matchRng.shuffle(pool).slice(0, 3);
    this.prepareFree();
    this.phase = 'pick';
    this.timer = T.CARD_PICK;
    this.botPickT = this.matchRng.range(T.BOT_PICK_MIN, T.BOT_PICK_MAX);
  }

  // Während der Kartenwahl stehen alle schon auf der neuen Insel und dürfen frei
  // herumschwabbeln – ohne Wertung, ohne Karte, ohne Modus.
  prepareFree() {
    this.card = null;
    this.cardOwner = null;
    this.resetArena();
    this.free = true;
    this.layoutPlayers();
  }

  freeStep(dt) {
    this.gm = this.globalMods();
    this.t += dt;
    const all = [...this.players.values()];
    const alive = all.filter(p => p.state === 'alive');
    this.prevShapes = this.shapes;
    this.shapes = this.pose(this.t);
    if (this.mapDef.moving) for (const p of alive) this.carry(p);
    for (const p of all) if (p.bot) botThink(this, p, alive, dt);
    for (const p of alive) this.movePlayer(p, dt, alive);
    this.collide(alive);
    for (const p of alive) if (p.state === 'alive') this.edgeCheck(p, dt);
    for (const p of all) {
      if (p.state === 'ghost') { this.spawnAt(p, this.safeSpot(T.SPAWN_MARGIN, alive)); continue; }
      if (p.state !== 'falling') continue;
      p.fallT += dt;
      if (p.fallT < T.FREE_RESPAWN) { p.x += p.vx * dt * 0.3; p.y += p.vy * dt * 0.3; }
      else this.spawnAt(p, this.safeSpot(T.SPAWN_MARGIN, alive));
    }
  }

  fall(p, how) {
    if (p.state !== 'alive') return;
    p.state = 'falling';
    p.fallT = 0;
    if (this.free) { this.emit({ k: 'plumps', x: p.x, y: p.y, id: p.id }); return; }
    p.stats.falls++;
    this.fallOrder.push(p.id);
    this.emit({ k: how === 'boom' ? 'boom' : 'plumps', x: p.x, y: p.y, id: p.id });
    this.C.onFall?.(this, p);
    this.M.onFall?.(this, p);
    const hitter = this.players.get(p.lastHitBy);
    const credited = hitter && hitter !== p && this.t - p.lastHitT < T.KO_WINDOW;
    this.fallRecs.push({ tk: this.tick, x: p.x, y: p.y, v: p.id, a: credited ? hitter.id : null });
    if (this.fallRecs.length > 30) this.fallRecs.shift();
    if (credited) {
      hitter.stats.ko++;
      this.emit({ k: 'ko', id: hitter.id, victim: p.id });
      if (this.crowned.has(p.id) && !this.regicided.has(p.id)) {
        this.regicided.add(p.id);
        this.addPoint(hitter);
        this.emit({ k: 'regicide', id: hitter.id, victim: p.id });
      }
    }
  }

  // Treffer nur dem Angreifer gutschreiben – nie dem, der gerammt wird
  credit(victim, attackerId) {
    if (!attackerId || attackerId === victim.id) return;
    victim.lastHitBy = attackerId;
    victim.lastHitT = this.t;
  }

  // ---------- Physik ----------

  step(dtReal) {
    this.tick++;
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
    if (this.phase === 'pick') {
      this.freeStep(dtReal);
      this.timer -= dtReal;
      if (!this.options) { if (this.timer <= 0) this.beginCountdown(); return; } // Finale-Ansage
      const pk = this.players.get(this.picker);
      if (!pk || pk.bot) { this.botPickT -= dtReal; if (this.botPickT <= 0) this.choose(this.picker, this.matchRng.int(3)); }
      if (this.phase === 'pick' && this.timer <= 0) this.choose(this.picker, this.matchRng.int(3));
      return;
    }
    if (this.phase !== 'play') return;

    // Treffer-Stopp: Bei starken Treffern steht das Spiel für einen Wimpernschlag still
    if (this.hitstop > 0) { this.hitstop -= dtReal; return; }

    this.gm = this.globalMods();
    const gm = this.gm;
    // Zeitlupe nach dem entscheidenden Rauswurf und kurz zu Beginn des letzten Duells
    let slow = 1;
    if (this.endDelay > 0) slow = T.FINAL_SLOWMO;
    else if (this.duelT > 0) { slow = lerp(T.DUEL_SLOWMO, 1, 1 - this.duelT / T.DUEL_SLOWMO_TIME); this.duelT -= dtReal; }
    const dt = dtReal * gm.dtScale * slow;
    this.t += dt;
    const all = [...this.players.values()];
    const alive = all.filter(p => p.state === 'alive');

    // Insel bewegen / schrumpfen
    if (this.t > gm.shrinkStart) this.k = Math.max(0, this.k - gm.shrinkRate * dt);
    this.prevShapes = this.shapes;
    this.shapes = this.pose(this.t);
    if (this.mapDef.moving) {
      for (const p of alive) this.carry(p);
      for (const o of [...this.items, ...this.bananas, ...this.bumpers, ...this.crates, ...(this.M.carryables?.(this) || [])]) this.carry(o);
    }
    this.mapDef.step?.(this, dt, alive);
    this.hazardStep(dt);

    for (const p of all) if (p.bot) botThink(this, p, alive, dt);

    for (const p of alive) this.movePlayer(p, dt, alive);

    this.collide(alive);
    this.bumperStep(alive);
    this.ghostStep(dt);
    this.itemStep(dt, alive);
    for (const p of alive) for (const k in p.pw) if (p.pw[k] > 0) EFFECTS[k]?.step?.(this, p, dt);
    this.bananaStep(dt, alive);
    this.C.step?.(this, dt, alive);
    this.bombStep(dt);
    this.M.step?.(this, dt, alive);

    for (const p of alive) if (p.state === 'alive') this.edgeCheck(p, dt);

    for (const p of all) {
      if (p.state !== 'falling') continue;
      p.fallT += dt;
      if (p.fallT < T.FALL_TIME) { p.x += p.vx * dt * 0.3; p.y += p.vy * dt * 0.3; continue; }
      if (this.M.canRespawn?.(this, p)) {
        if (p.fallT > T.RESPAWN_AT) {
          const others = all.filter(q => q !== p && q.state === 'alive');
          this.spawnAt(p, this.safeSpot(T.SPAWN_MARGIN, others));
          this.emit({ k: 'respawn', id: p.id });
        }
      } else {
        p.state = 'ghost'; p.gx = p.x; p.gy = p.y; p.pupsCd = T.PUPS_FIRST_CD; p.dashSeen = p.input.d;
      }
    }

    // Letztes Duell: Kamera zoomt heran, kurz Zeitlupe
    const contenders = this.M.contenders?.(this, all);
    if (contenders && contenders.length === 2 && this.startCount >= 3 && !this.duel) {
      this.duel = contenders.map(p => p.id);
      this.duelT = T.DUEL_SLOWMO_TIME;
      this.emit({ k: 'duel', ids: this.duel });
    }

    this.checkEnd(all, dtReal);
  }

  // Kantenwackeln: Wer mit dem Mittelpunkt knapp über die Kante rutscht, hat noch
  // EDGE_TIME Sekunden, um sich zurückzuretten. Wer weit drüber ist, fällt sofort.
  edgeCheck(p, dt) {
    if (onGround(this.shapes, this.holes, p.x, p.y)) {
      if (p.edgeAge > 0.08) { if (!this.free) p.stats.saves++; this.emit({ k: 'save', id: p.id, x: p.x, y: p.y }); }
      p.edgeAge = 0;
      return;
    }
    const grace = T.EDGE_GRACE * p.r;
    if (grace <= 0 || T.EDGE_TIME <= 0 || !onGround(this.shapes, this.holes, p.x, p.y, -grace)) { this.fall(p, 'fall'); return; }
    if (p.edgeAge === 0 && this.t - p.wobbleAt > 0.6) { p.wobbleAt = this.t; this.emit({ k: 'wobble', id: p.id, x: p.x, y: p.y }); }
    p.edgeAge += dt;
    if (p.edgeAge >= T.EDGE_TIME) this.fall(p, 'fall');
  }

  movePlayer(p, dt, alive) {
    for (const k in p.pw) p.pw[k] = Math.max(0, p.pw[k] - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.dashT = Math.max(0, p.dashT - dt);
    p.braceT = Math.max(0, p.braceT - dt);
    p.braceAge += dt;
    p.braceCd = Math.max(0, p.braceCd - dt);
    p.dazeT = Math.max(0, p.dazeT - dt);
    this.readActions(p);

    const pm = this.playerMods(p);
    p.r += (T.BLOB_R * pm.size - p.r) * Math.min(1, dt * T.SIZE_LERP);

    let { mx, my } = p.input;
    if (this.C.input) ({ mx, my } = this.C.input(this, p, { mx, my }));
    let ax = mx * pm.acc, ay = my * pm.acc;
    if (this.C.force) { const [fx, fy] = this.C.force(this, p, alive); ax += fx; ay += fy; }
    p.vx += ax * dt; p.vy += ay * dt;
    const k = Math.exp(-pm.fric * dt);
    p.vx *= k; p.vy *= k;
    if (Math.hypot(mx, my) > 0.2 && p.dazeT <= 0) { const m = Math.hypot(mx, my); p.fx = mx / m; p.fy = my / m; }

    if (p.charging) {
      p.chargeT += dt;
      const released = p.relAt != null && p.relAt >= p.chargeStart;
      if (released || p.chargeT >= T.DASH_HOLD_MAX) this.fireDash(p, pm);
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
  }

  // Tasten auswerten: Stemmen sofort, Dash beginnt mit dem Aufladen (Antippen = sofort los)
  readActions(p) {
    const inp = p.input;
    if (inp.d > p.dashSeen) { p.dashSeen = inp.d; p.pressAt = this.t; }
    if (inp.u > p.relSeen) { p.relSeen = inp.u; p.relAt = this.t; }
    const canAct = p.dazeT <= 0;
    if (inp.b > p.braceSeen) {
      p.braceSeen = inp.b;
      if (canAct && p.braceCd <= 0) {
        p.braceT = T.BRACE_TIME; p.braceAge = 0; p.braceCd = T.BRACE_CD;
        p.charging = false; p.pressAt = null;
        this.emit({ k: 'brace', id: p.id });
      }
    }
    if (p.charging || p.pressAt == null) return;
    const released = p.relAt != null && p.relAt >= p.pressAt;
    // Ein Druck kurz vor Ende der Abklingzeit wird gemerkt, danach verfällt er
    if (released && this.t - p.relAt > T.DASH_BUFFER) { p.pressAt = null; return; }
    if (!canAct || p.dashCd > 0 || p.braceT > 0) return;
    p.charging = true; p.chargeT = 0; p.chargeStart = p.pressAt; p.pressAt = null;
    if (!released) this.emit({ k: 'charge', id: p.id });
  }

  chargeOf(p) { return clamp01((p.chargeT - T.TAP_TIME) / (T.DASH_CHARGE - T.TAP_TIME)); }

  fireDash(p, pm) {
    const c = this.chargeOf(p);
    p.charging = false;
    const v = lerp(T.DASH_V, T.DASH_V_MAX, c);
    p.vx += p.fx * v; p.vy += p.fy * v;
    p.dashT = lerp(T.DASH_T, T.DASH_T_MAX, c);
    p.dashCharge = c;
    p.dashCd = pm.dashCd * lerp(1, T.DASH_CD_CHARGED, c);
    if (!this.free) p.stats.dashes++;
    this.emit({ k: 'dash', id: p.id, x: p.x, y: p.y, c: r1(c) });
  }

  // Ein dashender Blob X trifft Y. Ergebnis je nach Stemmen: Konter, Durchbruch oder normaler Treffer.
  dashHit(X, Y, px, nx, ny, approach) {
    const c = X.dashCharge;
    const impact = Math.max(T.IMPACT_MIN, Math.min(T.IMPACT_MAX, T.IMPACT_BASE + approach / T.IMPACT_SCALE));
    const base = lerp(T.DASH_BONUS, T.DASH_BONUS_MAX, c) * impact * px.dashMul;
    const mx = (X.x + Y.x) / 2, my = (X.y + Y.y) / 2;
    if (Y.braceT > 0) {
      if (c >= T.BREAK_CHARGE) {
        // Durchbruch: voll geladener Dash bricht durchs Stemmen
        Y.braceT = 0; Y.dazeT = T.BREAK_DAZE; Y.charging = false;
        const f = base * T.BREAK_MUL * this.playerMods(Y).takeDash;
        Y.vx += nx * f; Y.vy += ny * f;
        if (!this.free) X.stats.breaks++;
        this.emit({ k: 'break', id: X.id, victim: Y.id, x: mx, y: my });
        this.hitstop = Math.max(this.hitstop, T.HITSTOP_MAX);
        return 'break';
      }
      if (Y.braceAge <= T.BRACE_PERFECT) {
        // Konter: perfekt getimtes Stemmen wirft den Angreifer zurück
        const f = T.COUNTER_F * (0.8 + 0.4 * c);
        X.vx = -nx * f; X.vy = -ny * f;
        X.dashT = 0; X.dazeT = T.COUNTER_DAZE; X.charging = false;
        Y.vx *= 0.2; Y.vy *= 0.2;
        Y.braceCd = Math.min(Y.braceCd, T.BRACE_CD_COUNTER);
        this.credit(X, Y.id);
        if (!this.free) Y.stats.counters++;
        this.emit({ k: 'counter', id: Y.id, by: X.id, x: mx, y: my });
        this.hitstop = Math.max(this.hitstop, T.HITSTOP_MAX);
        return 'counter';
      }
    }
    const f = base * this.playerMods(Y).takeDash;
    Y.vx += nx * f; Y.vy += ny * f;
    if (px.punch) this.emit({ k: 'punch', x: Y.x, y: Y.y });
    const strength = Math.max(c, px.punch ? 1 : 0);
    if (strength >= T.HITSTOP_FROM) {
      const k = (strength - T.HITSTOP_FROM) / (1 - T.HITSTOP_FROM || 1);
      this.hitstop = Math.max(this.hitstop, lerp(T.HITSTOP_MIN, T.HITSTOP_MAX, k));
      this.emit({ k: 'hit', x: mx, y: my, p: r1(strength) });
    }
    return 'hit';
  }

  checkEnd(all, dt) {
    const res = this.M.checkEnd?.(this, all, dt);
    if (res) { this.endRound(res.winner || null); return; }
    const time = this.M.time?.();
    if (!time) return;
    if (all.length < 2) { this.endRound(all[0] || null); return; }
    if (this.t < time) return;
    // Zeit abgelaufen: beste Wertung gewinnt, bei Gleichstand wer seltener gefallen ist
    this.M.beforeScore?.(this);
    const score = (p) => this.M.score(this, p);
    const best = Math.max(...all.map(score));
    let top = all.filter(p => score(p) === best);
    if (top.length > 1) {
      const fallsOf = (p) => p.stats.falls - (p.fallsAtStart || 0);
      const f = Math.min(...top.map(fallsOf));
      top = top.filter(p => fallsOf(p) === f);
    }
    if (top.length > 1 && this.M.tieRandom) top = [this.rng.pick(top)];
    this.endRound(top.length === 1 ? top[0] : null);
  }

  carry(o) {
    const i = shapeIndexAt(this.prevShapes, o.x, o.y);
    if (i < 0) return;
    const [lx, ly] = toLocal(this.prevShapes[i], o.x, o.y);
    [o.x, o.y] = fromLocal(this.shapes[i], lx, ly);
  }

  collide(alive) {
    const e = this.gm.restitution;
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const a = alive[i], b = alive[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy), min = a.r + b.r;
        if (d >= min || d === 0) continue;
        const nx = dx / d, ny = dy / d;
        const pa = this.playerMods(a), pb = this.playerMods(b);

        // Wer greift an? Wer dasht – oder wer deutlich schneller auf den anderen zufliegt.
        const va = a.vx * nx + a.vy * ny, vb = -(b.vx * nx + b.vy * ny);
        const aDash = a.dashT > 0, bDash = b.dashT > 0;
        let attacker = null;
        if (aDash && !bDash) attacker = a;
        else if (bDash && !aDash) attacker = b;
        else if (va - vb > T.HIT_SPEED_MARGIN) attacker = a;
        else if (vb - va > T.HIT_SPEED_MARGIN) attacker = b;

        const ma = a.r * a.r * pa.mass, mb = b.r * b.r * pb.mass;
        const overlap = min - d;
        a.x -= nx * overlap * mb / (ma + mb); a.y -= ny * overlap * mb / (ma + mb);
        b.x += nx * overlap * ma / (ma + mb); b.y += ny * overlap * ma / (ma + mb);
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          const jImp = -(1 + e) * rv / (1 / ma + 1 / mb);
          a.vx -= jImp / ma * nx; a.vy -= jImp / ma * ny;
          b.vx += jImp / mb * nx; b.vy += jImp / mb * ny;
        }
        // Dash-Treffer schubsen extra hart (oder werden gekontert)
        let countered = false;
        if (aDash) countered = this.dashHit(a, b, pa, nx, ny, va) === 'counter' || countered;
        if (bDash) countered = this.dashHit(b, a, pb, -nx, -ny, vb) === 'counter' || countered;
        if (attacker && !countered) this.credit(attacker === a ? b : a, attacker.id);
        if (-rv > T.BOING_SPEED || aDash || bDash) this.emit({ k: 'boing', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, p: Math.min(1, -rv / 600) });
        if (!this.free) {
          this.C.onCollide?.(this, a, b, attacker);
          this.M.onCollide?.(this, a, b, attacker);
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
          p.vx += nx * T.BUMPER_F; p.vy += ny * T.BUMPER_F;
          // Bumper sind neutral: kein neuer Treffer, ein vorheriger Angreifer bleibt gutgeschrieben
          this.emit({ k: 'bumper', x: bu.x, y: bu.y });
        }
      }
    }
  }

  ghostStep(dt) {
    const gm = this.gm;
    for (const p of this.players.values()) {
      if (p.state !== 'ghost') continue;
      const { mx, my } = p.input;
      p.gx += mx * T.GHOST_SPEED * dt; p.gy += my * T.GHOST_SPEED * dt;
      const d = Math.hypot(p.gx, p.gy);
      if (d > T.GHOST_RANGE) { p.gx *= T.GHOST_RANGE / d; p.gy *= T.GHOST_RANGE / d; }
      p.pupsCd = Math.max(0, p.pupsCd - dt);
      if (p.input.d <= p.dashSeen) continue;
      p.dashSeen = p.input.d;
      if (p.pupsCd > 0 || this.phase !== 'play') continue;
      p.pupsCd = gm.pupsCd;
      const R = gm.pupsR;
      this.emit({ k: 'pups', x: p.gx, y: p.gy, r: R, id: p.id });
      for (const q of this.players.values()) {
        if (q.state !== 'alive') continue;
        const dx = q.x - p.gx, dy = q.y - p.gy, dd = Math.hypot(dx, dy) || 1;
        if (dd >= R) continue;
        const f = T.PUPS_F * (1 - dd / (R + 10)) * this.playerMods(q).takePups;
        q.vx += dx / dd * f; q.vy += dy / dd * f;
        this.credit(q, p.id);
        p.stats.pups++;
      }
    }
  }

  // ---------- Welt-Objekte: Power-ups, Bananen, Bomben ----------

  itemStep(dt, alive) {
    const gm = this.gm;
    this.itemT -= dt;
    if (this.itemT <= 0) {
      this.itemT = this.rng.range(gm.itemEvery[0], gm.itemEvery[1]);
      if (this.items.length < gm.itemMax) {
        const s = this.safeSpot(30, [...alive, ...this.items]);
        this.items.push({ x: s.x, y: s.y, type: this.rng.pick(ITEM_IDS), t: T.ITEM_LIFE });
      }
    }
    for (const it of this.items) {
      it.t -= dt;
      for (const p of alive) {
        if (it.t > 0 && Math.hypot(p.x - it.x, p.y - it.y) < p.r + T.ITEM_PICK_R && this.C.canPick?.(this, p) !== false) {
          p.stats.items++;
          this.emit({ k: 'item', id: p.id, type: it.type });
          ITEMS[it.type].apply(this, p, alive);
          it.t = 0;
          break;
        }
      }
    }
    this.items = this.items.filter(it => it.t > 0);
  }

  bananaStep(dt, alive) {
    for (const b of this.bananas) {
      b.t -= dt;
      for (const p of alive) {
        if (b.t <= 0) break;
        if (b.owner === p.id && this.t - b.born < 1) continue;
        if (Math.hypot(p.x - b.x, p.y - b.y) < p.r + 10) {
          b.t = 0;
          p.pw.slip = T.SLIP_TIME;
          const sp = Math.max(T.SLIP_MIN_SPEED, Math.hypot(p.vx, p.vy) * 1.6);
          const a = Math.atan2(p.vy, p.vx) + this.rng.range(-0.6, 0.6);
          p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
          this.credit(p, b.owner); // auf die eigene Banane treten zählt für niemanden
          this.emit({ k: 'slip', id: p.id, x: p.x, y: p.y });
        }
      }
    }
    this.bananas = this.bananas.filter(b => b.t > 0);
  }

  dropBomb(x, y, fuse, owner = null) {
    this.bombs.push({ x, y, t: fuse, max: fuse, owner });
  }

  bombStep(dt) {
    for (const b of this.bombs) {
      b.t -= dt;
      if (b.t <= 0) {
        this.emit({ k: 'boom', x: b.x, y: b.y });
        this.blast(b.x, b.y, T.BOMB_R, T.BOMB_F, null, b.owner);
      }
    }
    this.bombs = this.bombs.filter(b => b.t > 0);
  }

  blast(x, y, R, F, exclude, owner) {
    for (const q of this.players.values()) {
      if (q.state !== 'alive' || q === exclude) continue;
      const dx = q.x - x, dy = q.y - y, d = Math.hypot(dx, dy) || 1;
      if (d < R + q.r) {
        const f = F * (1 - d / (R + q.r + 10)) * this.playerMods(q).takeBlast;
        q.vx += dx / d * f; q.vy += dy / d * f;
        this.credit(q, owner);
      }
    }
  }

  // ---------- Auswertung & Snapshot ----------

  awards() {
    const list = [...this.players.values()];
    const out = [];
    const top = (key, emoji, title, unit) => {
      const best = list.reduce((a, p) => (!a || p.stats[key] > a.stats[key] ? p : a), null);
      if (best && best.stats[key] > 0) out.push([emoji, title, best.name, `${best.stats[key]} ${unit}`]);
    };
    top('ko', 'glove', 'Rausschubser', 'Rauswürfe');
    top('falls', 'welle', 'Wasserratte', 'mal geplumpst');
    top('pups', 'pups', 'Pups-Meister', 'Pups-Treffer');
    top('items', 'geschenk', 'Sammler', 'Power-ups');
    top('dashes', 'blitz', 'Dash-Junkie', 'Dashes');
    return out;
  }

  snapshot(events, withGrid = true) {
    const time = this.M.time?.();
    const gm = this.gm;
    const s = {
      t: 's',
      ph: this.phase, tm: r1(this.timer), rd: this.round, sd: this.roundSeed,
      mo: this.mode, mp: this.map, tl: time ? Math.max(0, r1(time - this.t)) : null,
      ar: packShapes(this.shapes), ho: this.holes.map(h => [h.x, h.y, h.r]), sk: this.k < 1 ? 1 : 0,
      c: this.card, co: this.cardOwner, tg: this.target, msg: this.message,
      pk: this.picker, op: this.phase === 'pick' ? this.options : null,
      tk: this.tick, fi: this.finale ? 1 : 0, rp: this.phase === 'roundEnd' ? this.replay : null,
      set: { tg: this.target, bl: this.botLevel, mm: this.modeMix ? 1 : 0 },
      po: null, pt: 0, ig: null, zn: null, cn: [],
      cr: [...this.crowned], ch: this.champion, rw: this.roundWinner,
      bm: this.bombs.map(b => [r1(b.x), r1(b.y), r1(b.t / b.max)]),
      bu: this.bumpers.map(b => [r1(b.x), r1(b.y), b.r]),
      it: this.items.map(i => [r1(i.x), r1(i.y), i.type, i.t < 3 ? 1 : 0]),
      bn: this.bananas.map(b => [r1(b.x), r1(b.y)]),
      hz: this.hz.map(h => [h.kind, r1(h.x), r1(h.y), r1(h.r), Math.round((1 - h.t / h.max) * 100) / 100, h.i ?? -1]),
      kx: this.crates.map(c => [r1(c.x), r1(c.y), c.r, r1(c.a)]),
      mx: this.phase === 'play' || this.phase === 'roundEnd' ? this.mapDef.snapshot?.(this) || null : null,
      aw: this.phase === 'matchEnd' ? this.awards() : null,
      p: [...this.players.values()].map(p => ({
        id: p.id, n: p.name, c: p.color, ci: p.ci, b: p.bot ? 1 : 0, h: p.hat,
        x: r1(p.state === 'ghost' ? p.gx : p.x), y: r1(p.state === 'ghost' ? p.gy : p.y),
        vx: r1(p.vx), vy: r1(p.vy), fx: r1(p.fx), fy: r1(p.fy), r: r1(p.r),
        st: p.state, f: r1(p.fallT), s: p.score, lv: p.lives, m: r1(p.m),
        dc: p.state === 'ghost' ? r1(p.pupsCd / gm.pupsCd) : r1(Math.min(1, p.dashCd / gm.dashCd)),
        dt: p.dashT > 0 ? 1 : 0,
        pw: Object.keys(p.pw).filter(k => p.pw[k] > 0 && ITEMS[k]).join(','),
        iv: p.pw.invis > 0 ? 1 : 0, sl: p.pw.slip > 0 ? 1 : 0,
        em: p.emoT > 0 ? p.emo : -1,
        ch: p.charging ? Math.round(this.chargeOf(p) * 100) / 100 : -1,
        br: p.braceT > 0 ? (p.braceAge <= T.BRACE_PERFECT ? 2 : 1) : 0,
        bc: r1(p.braceCd / T.BRACE_CD),
        wb: p.edgeAge > 0 ? 1 : 0, dz: p.dazeT > 0 ? 1 : 0,
        dk: p.dashT > 0 ? r1(p.dashCharge) : 0,
        rd: p.ready ? 1 : 0,
      })),
      duel: this.duel || null, fin: this.endDelay > 0 ? 1 : 0,
      ev: events || [],
    };
    // Zwischen den Runden ist der nächste Modus schon gewählt, aber noch nicht aufgebaut
    if (this.phase !== 'pick') {
      if (this.cs.id === this.card) this.C.snapshot?.(this, s);
      if (this.ms.id === this.mode) this.M.snapshot?.(this, s, withGrid);
    }
    return s;
  }
}
