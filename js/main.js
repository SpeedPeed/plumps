import { Game, CARDS, MODES, MAPS, ITEMS, MAX_PLAYERS, HAT_COUNT } from './sim.js';
import { Host, Client } from './net.js';
import { View } from './render.js';
import { initInput, readInput } from './input.js';
import { sfx, unlockAudio, toggleMute, chargeStart, chargeStop, setVolumes, setMusic, babble } from './audio.js';
import { T } from './tuning.js';
import { initDebug, DEBUG } from './debug.js';
import { iconHTML, HAT_NAMES, EMOTE_IDS } from './art/icons.js';
import { avatarURL, avatarHTML } from './art/avatar.js';
import { drawMapIcon } from './art/themes.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const BOT_NAMES = ['Wackelpudding', 'Glibberbert', 'Dr. Plumps', 'Moppel', 'Quabbel', 'Schwabbel', 'Gelee-Gerd', 'Puddingpaul'];
const INTERP_DELAY = 70; // ms Puffer für flüssige Bewegung bei Clients

const view = new View($('cv'));
const isTouch = matchMedia('(pointer: coarse)').matches;

let mode = null;          // 'host' | 'client' | 'solo'
let game = null;          // nur Host/Solo
let net = null;           // Host oder Client
let myId = null;
let snaps = [];           // Client: [{at, s}]
let lastGrid = null;      // Client: Farbkampf-Raster kommt seltener
let current = null;       // zuletzt gezeichneter Snapshot
let localEvents = [];
let netEvents = [];
let botCounter = 0;
const pings = {};         // Ping in ms: pings.me (Client) bzw. pings[spielerId] (Host)

// ---------- Gespeicherte Einstellungen ----------

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* egal */ } },
};
$('name').value = store.get('plumps-name') || '';
let myHat = +(store.get('plumps-hat') ?? 1) || 0;
if (myHat < 0 || myHat >= HAT_COUNT) myHat = 0;
const settings = { music: 0.5, sfx: 0.8, shake: true, ...JSON.parse(store.get('plumps-settings') || '{}') };
setVolumes(settings.music, settings.sfx);
view.shakeScale = settings.shake ? 1 : 0;
const urlCode = new URLSearchParams(location.search).get('r');
if (urlCode) { $('code').value = urlCode.toUpperCase().slice(0, 4); $('btnJoin').classList.add('big'); }

// Symbole in die Knöpfe setzen (<i data-icon="…">)
function fillIcons(root = document) {
  for (const el of root.querySelectorAll('i[data-icon]')) el.innerHTML = iconHTML(el.dataset.icon);
}
fillIcons();

// Inselbilder für Anzeigen
const mapIcons = new Map();
function mapIconHTML(id) {
  if (!mapIcons.has(id)) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 96;
    drawMapIcon(cv.getContext('2d'), MAPS[id], 48, 48, 88);
    mapIcons.set(id, cv.toDataURL());
  }
  return `<img class="ic" src="${mapIcons.get(id)}" alt="">`;
}

function myName() {
  const n = $('name').value.trim() || BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  store.set('plumps-name', $('name').value.trim());
  return n;
}

function menuError(msg) {
  leave();
  $('menuErr').textContent = msg;
}

function setBusy(b) {
  for (const id of ['btnHost', 'btnJoin', 'btnSolo']) $(id).disabled = b;
}

function applyLobbySettings() {
  if (!game) return;
  game.target = +$('target').value;
  game.botLevel = +$('botLevel').value;
  game.modeMix = $('modeMix').value === '1';
}

$('btnHost').onclick = () => {
  unlockAudio();
  if (!window.Peer) return menuError('PeerJS konnte nicht geladen werden. Internet ok?');
  setBusy(true);
  $('menuErr').textContent = 'Erstelle Raum …';
  const name = myName();
  game = new Game();
  applyLobbySettings();
  mode = 'host';
  net = new Host({
    onReady: (code) => {
      myId = 'host';
      game.addPlayer(myId, name, false, myHat);
      $('roomCode').textContent = code;
      $('menuErr').textContent = '';
      history.replaceState(null, '', '?r=' + code);
      setBusy(false);
      startLoops();
    },
    onError: (msg) => menuError(msg),
    onData: hostReceive,
    onLeave: (id) => { game.removePlayer(id); },
  });
};

$('btnJoin').onclick = () => {
  unlockAudio();
  const code = $('code').value.trim().toUpperCase();
  if (code.length !== 4) { $('menuErr').textContent = 'Der Raumcode hat 4 Buchstaben.'; return; }
  if (!window.Peer) return menuError('PeerJS konnte nicht geladen werden. Internet ok?');
  setBusy(true);
  $('menuErr').textContent = 'Verbinde …';
  const name = myName();
  mode = 'client';
  net = new Client(code, {
    onOpen: () => net.send({ t: 'join', name, hat: myHat }),
    onError: (msg) => menuError(msg),
    onData: (msg) => {
      if (msg.t === 'welcome') {
        myId = msg.id;
        $('roomCode').textContent = code;
        $('menuErr').textContent = '';
        setBusy(false);
        startLoops();
      } else if (msg.t === 'ping') {
        net.send({ t: 'pong', c: msg.c });
      } else if (msg.t === 'pong') {
        pings.me = Math.round(performance.now() - msg.c);
      } else if (msg.t === 'full') {
        menuError('Der Raum ist voll (max. 6).');
      } else if (msg.t === 's') {
        if (msg.gr) lastGrid = msg.gr;
        if (msg.mo !== 'farbe' || msg.ph === 'lobby') lastGrid = null;
        snaps.push({ at: performance.now(), s: msg });
        if (snaps.length > 30) snaps.shift();
        for (const e of msg.ev) handleEvent(e, msg);
      }
    },
  });
};

$('code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btnJoin').click(); });

$('btnSolo').onclick = () => {
  unlockAudio();
  game = new Game();
  applyLobbySettings();
  mode = 'solo';
  myId = 'me';
  game.addPlayer(myId, myName(), false, myHat);
  for (let i = 0; i < 3; i++) addBot();
  $('roomCode').textContent = 'SOLO';
  startLoops();
};

function hostReceive(id, msg) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.t === 'join') {
    if (game.players.has(id)) return;
    if (game.players.size >= MAX_PLAYERS) {
      // Bot rauswerfen, um Platz für Menschen zu machen
      const bot = [...game.players.values()].find(p => p.bot);
      if (bot) game.removePlayer(bot.id);
      else { net.send(id, { t: 'full' }); setTimeout(() => net.kick(id), 500); return; }
    }
    game.addPlayer(id, String(msg.name || 'Blob'), false, msg.hat | 0);
    net.send(id, { t: 'welcome', id });
    toast(`<b>${esc(String(msg.name || 'Blob').slice(0, 14))}</b> ist da!`);
  } else if (msg.t === 'in') {
    game.setInput(id, msg);
  } else if (msg.t === 'pick') {
    game.choose(id, msg.i | 0);
  } else if (msg.t === 'hat') {
    game.setHat(id, msg.h | 0);
  } else if (msg.t === 'emo') {
    game.emote(id, msg.i | 0);
  } else if (msg.t === 'ping') {
    net.send(id, { t: 'pong', c: msg.c });
  } else if (msg.t === 'pong') {
    pings[id] = Math.round(performance.now() - msg.c);
  }
}

function addBot() {
  if (game.players.size >= MAX_PLAYERS) return;
  const used = new Set([...game.players.values()].map(p => p.name));
  const name = BOT_NAMES.find(n => !used.has(n)) || 'Bot';
  game.addPlayer('bot' + (++botCounter), name, true);
}

function setHat(h) {
  myHat = (h + HAT_COUNT) % HAT_COUNT;
  store.set('plumps-hat', myHat);
  if (mode === 'client') net.send({ t: 'hat', h: myHat });
  else if (game) game.setHat(myId, myHat);
}
$('hatPrev').onclick = () => setHat(myHat - 1);
$('hatNext').onclick = () => setHat(myHat + 1);

function sendEmote(i) {
  if (!mode) return;
  if (mode === 'client') net.send({ t: 'emo', i });
  else game.emote(myId, i);
}
$('emotes').innerHTML = EMOTE_IDS.map((id, i) => `<button data-i="${i}" title="Emote ${i + 1}">${iconHTML(id)}${isTouch ? '' : `<small>${i + 1}</small>`}</button>`).join('');
$('emotes').addEventListener('pointerdown', (e) => {
  const b = e.target.closest('button');
  if (b) { e.preventDefault(); sendEmote(+b.dataset.i); }
});
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.repeat) return;
  const m = /^Digit([1-5])$/.exec(e.code);
  if (m) sendEmote(+m[1] - 1);
});

$('btnBotAdd').onclick = () => game && addBot();
$('btnBotDel').onclick = () => {
  if (!game) return;
  const bots = [...game.players.values()].filter(p => p.bot);
  if (bots.length) game.removePlayer(bots[bots.length - 1].id);
};
for (const id of ['target', 'botLevel', 'modeMix']) $(id).onchange = applyLobbySettings;
$('btnStart').onclick = () => {
  if (!game) return;
  applyLobbySettings();
  if (!game.startMatch()) toast('Mindestens 2 Spieler – lad Freunde ein oder nimm Bots dazu!');
};
$('btnAgain').onclick = () => game && game.startMatch();
$('btnToLobby').onclick = () => game && game.backToLobby();
$('btnLeave').onclick = () => { leave(); };
$('btnCopy').onclick = async () => {
  const link = location.origin + location.pathname + '?r=' + $('roomCode').textContent;
  try {
    if (navigator.share && isTouch) await navigator.share({ title: 'PLUMPS!', text: 'Komm auf meine Insel!', url: link });
    else { await navigator.clipboard.writeText(link); toast('Link kopiert!'); }
  } catch { prompt('Link zum Teilen:', link); }
};
$('btnExit').onclick = () => { if (confirm('Spiel wirklich verlassen?')) leave(); };
$('btnMute').onclick = () => { $('btnMute').innerHTML = iconHTML(toggleMute() ? 'tonAus' : 'tonAn'); };

// Einstellungen: Lautstärke von Musik und Effekten, Bildschirmwackeln
function syncSettingsUI() {
  for (const [id, key] of [['volMusic', 'music'], ['volSfx', 'sfx']]) {
    $(id).value = Math.round(settings[key] * 100);
    $(id).nextElementSibling.textContent = Math.round(settings[key] * 100);
  }
  $('optShake').checked = settings.shake;
}
function saveSettings() {
  settings.music = $('volMusic').value / 100;
  settings.sfx = $('volSfx').value / 100;
  settings.shake = $('optShake').checked;
  setVolumes(settings.music, settings.sfx);
  view.shakeScale = settings.shake ? 1 : 0;
  store.set('plumps-settings', JSON.stringify(settings));
  syncSettingsUI();
}
for (const id of ['volMusic', 'volSfx', 'optShake']) $(id).oninput = saveSettings;
$('volSfx').onchange = () => { unlockAudio(); sfx.boing(0.6); };
for (const b of document.querySelectorAll('.settingsBtn')) b.onclick = () => { unlockAudio(); syncSettingsUI(); $('settings').classList.add('on'); };
$('btnSettingsClose').onclick = () => $('settings').classList.remove('on');

// ---------- Schleifen ----------

let simWorker = null;
let inputTimer = null;
let pingTimer = null;
let rafId = null;
let lastTick = 0;
let acc = 0;
let tickN = 0;

function startLoops() {
  screen('menu', false);
  if (mode !== 'solo') {
    // Jede Seite misst einmal pro Sekunde die Antwortzeit
    pingTimer = setInterval(() => {
      const msg = { t: 'ping', c: performance.now() };
      if (mode === 'client') net.send(msg); else net.broadcast(msg);
    }, 1000);
  }
  if (mode === 'client') {
    inputTimer = setInterval(() => net.send({ t: 'in', ...readInput() }), 33);
  } else {
    // Timer im Worker läuft auch weiter, wenn der Tab im Hintergrund ist
    const src = 'setInterval(() => postMessage(0), 16);';
    simWorker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    lastTick = performance.now();
    simWorker.onmessage = hostTick;
  }
  let last = performance.now();
  const frame = (now) => {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    render(now, dt);
  };
  rafId = requestAnimationFrame(frame);
}

function hostTick() {
  const now = performance.now();
  acc += Math.min(0.25, (now - lastTick) / 1000);
  lastTick = now;
  const DT = 1 / 60;
  while (acc >= DT) {
    acc -= DT;
    game.setInput(myId, readInput());
    game.step(DT);
    const ev = game.drainEvents();
    if (ev.length) { localEvents.push(...ev); netEvents.push(...ev); }
    if (++tickN % 2 === 0 && mode === 'host') {
      // Das Farbkampf-Raster ist groß – nur jedes dritte Paket schickt es mit
      const withGrid = game.gridDirty && tickN % 6 === 0;
      if (withGrid) game.gridDirty = false;
      net.broadcast(game.snapshot(netEvents, withGrid));
      netEvents = [];
    }
  }
}

function leave() {
  if (net) net.close();
  if (simWorker) simWorker.terminate();
  clearInterval(inputTimer);
  clearInterval(pingTimer);
  for (const k in pings) delete pings[k];
  cancelAnimationFrame(rafId);
  net = game = simWorker = null;
  mode = myId = current = lastGrid = null;
  snaps = []; localEvents = []; netEvents = [];
  setBusy(false);
  for (const id of ['lobby', 'pick', 'end']) screen(id, false);
  for (const id of ['hud', 'touch']) $(id).classList.add('hidden');
  screen('menu', true);
  $('menuErr').textContent = '';
  history.replaceState(null, '', location.pathname);
}

const lerp = (a, b, k) => a + (b - a) * k;

// Client: zwischen zwei Snapshots interpolieren
function interpolated() {
  const t = performance.now() - INTERP_DELAY;
  if (!snaps.length) return null;
  let i = snaps.length - 1;
  while (i > 0 && snaps[i - 1].at > t) i--;
  const b = snaps[i], a = snaps[i - 1];
  let out;
  if (!a || b.at <= t) out = { ...b.s };
  else {
    const k = Math.max(0, Math.min(1, (t - a.at) / (b.at - a.at)));
    const prev = new Map(a.s.p.map(p => [p.id, p]));
    const sameMap = a.s.mp === b.s.mp && a.s.ar.length === b.s.ar.length;
    out = {
      ...b.s,
      ar: sameMap ? b.s.ar.map((sh, j) => sh.map((v, n) => (n === 0 ? v : lerp(a.s.ar[j][n], v, k)))) : b.s.ar,
      p: b.s.p.map(p => {
        const q = prev.get(p.id);
        if (!q || q.st !== p.st) return p;
        return { ...p, x: lerp(q.x, p.x, k), y: lerp(q.y, p.y, k), f: lerp(q.f, p.f, k), r: lerp(q.r, p.r, k) };
      }),
    };
  }
  out.gr = out.mo === 'farbe' && out.ph !== 'lobby' ? lastGrid : null;
  return out;
}

function render(now, dt) {
  let s;
  if (mode === 'client') s = interpolated();
  else if (game) {
    s = game.snapshot([]);
    const evs = localEvents; localEvents = [];
    for (const e of evs) handleEvent(e, s);
  }
  if (s) { current = s; updateUI(s); updateMusic(s); watchEmotes(s); }
  view.draw(current, myId, dt, now / 1000);
  debug.frame(dt, current);
}

// Musik passt sich der Lage an: Kartenwahl, Spiel (schneller beim Schrumpfen und im Duell), Sieg
function updateMusic(s) {
  if (s.ph === 'lobby') setMusic('menu');
  else if (s.ph === 'cardPick' || s.ph === 'cardShow') setMusic('pick');
  else if (s.ph === 'matchEnd') setMusic('win');
  else setMusic('play', s.duel ? 3 : s.sk ? 2 : 1);
}

// Wer ein Emote schickt, brabbelt dazu
const lastEmote = new Map();
function watchEmotes(s) {
  for (const p of s.p) {
    const was = lastEmote.get(p.id) ?? -1;
    if (p.em >= 0 && was < 0) babble(p.ci, 'chat');
    lastEmote.set(p.id, p.em);
  }
}

// ---------- Ereignisse → Sound/Effekte/Toasts ----------

function nameOf(s, id) { return esc(s.p.find(p => p.id === id)?.n || '???'); }
function ciOf(s, id) { return s.p.find(p => p.id === id)?.ci ?? 0; }

function handleEvent(e, s) {
  view.addEvent(e, s);
  const mine = e.id === myId;
  switch (e.k) {
    case 'boing': sfx.boing(e.p); break;
    case 'charge': chargeStart(e.id, T.DASH_CHARGE, ciOf(s, e.id)); break;
    case 'dash': chargeStop(e.id); sfx.dash(); if (e.c > 0.5) sfx.hit(e.c * 0.5); break;
    case 'brace': chargeStop(e.id); sfx.brace(); break;
    case 'counter':
      sfx.counter(); vibrate(60); babble(ciOf(s, e.by), 'oof');
      if (e.id === myId || e.by === myId) tip('counter', '<b>KONTER!</b> Wer genau im Moment des Aufpralls stemmt, wirft den Angreifer zurück.');
      break;
    case 'break':
      sfx.break(); vibrate(60); babble(ciOf(s, e.victim), 'oof');
      if (e.id === myId || e.victim === myId) tip('break', '<b>DURCHBRUCH!</b> Ein voll aufgeladener Dash bricht durchs Stemmen.');
      break;
    case 'hit': sfx.hit(e.p); break;
    case 'wobble':
      sfx.wobble(); babble(ciOf(s, e.id), 'panic');
      if (mine) { vibrate(30); tip('edge', '<b>Kante!</b> Steuer zurück oder dash Richtung Insel – du kannst dich noch retten!'); }
      break;
    case 'save': sfx.save(); babble(ciOf(s, e.id), 'yay'); if (mine) toast(`${iconHTML('rettungsring')} Gerettet!`); break;
    case 'ko': sfx.ko(); koBanner(s, e.id, e.victim); break;
    case 'duel': sfx.duel(); koText('<b>Das letzte Duell!</b>'); break;
    case 'plumps': chargeStop(e.id); sfx.plumps(); babble(ciOf(s, e.id), 'fall'); if (mine) vibrate(120); break;
    case 'boom': sfx.boom(); vibrate(60); break;
    case 'pups': sfx.pups(); break;
    case 'bumper': sfx.bumper(); break;
    case 'swap': sfx.swap(); toast(`${iconHTML('tausch')} Platztausch!`); break;
    case 'potato': sfx.potato(); if (mine) toast(`${iconHTML('kartoffel')} Du hast die Kartoffel! Weitergeben!`); break;
    case 'count': sfx.count(); break;
    case 'go':
      sfx.go(); flashGo();
      tip('controls', isTouch
        ? '<b>DASH</b> antippen = kurz · <b>halten</b> = aufladen · <b>STEMMEN</b> fängt Dashes ab'
        : '<b>Leertaste</b> antippen = Dash · <b>halten</b> = aufladen · <b>Shift</b> = Stemmen (fängt Dashes ab)');
      break;
    case 'card': sfx.card(); break;
    case 'win': sfx.win(); babble(ciOf(s, e.id), 'yay'); break;
    case 'draw': sfx.draw(); break;
    case 'regicide': sfx.regicide(); toast(`${iconHTML('krone')} Königsmord! <b>${nameOf(s, e.id)}</b> +1`); break;
    case 'champion': sfx.champion(); break;
    case 'coin': if (mine) sfx.coin(); break;
    case 'coinloss': if (mine) toast(`${iconHTML('muenze')} ${e.n} Münzen weg!`); break;
    case 'punch': sfx.punch(); vibrate(40); break;
    case 'slip': sfx.slip(); babble(ciOf(s, e.id), 'panic'); break;
    case 'item': if (mine) { sfx.item(); const it = ITEMS[e.type]; toast(`${iconHTML(e.type)} <b>${it.name}</b> – ${it.desc}`); } break;
    case 'respawn': if (mine) sfx.respawn(); break;
    case 'tag': sfx.tag(); if (mine) toast(`${iconHTML('glibber')} Du hast den Glibber! Rempel jemanden an!`); break;
    case 'zone': sfx.zone(); break;
    case 'matchball': sfx.matchball(); toast(`${iconHTML('ausrufe')} Matchball für <b>${nameOf(s, e.id)}</b>!`); break;
    default:
  }
}

function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* egal */ } }

function toast(html, cls = '', ms = 2700) {
  const el = document.createElement('div');
  el.className = 'toast ' + cls;
  el.innerHTML = html;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// Erklärungen erscheinen nur beim ersten Mal (gemerkt im Browser)
const seenTips = new Set((store.get('plumps-tips') || '').split(',').filter(Boolean));
function tip(key, html) {
  if (seenTips.has(key)) return;
  seenTips.add(key);
  store.set('plumps-tips', [...seenTips].join(','));
  toast(iconHTML('gluehbirne') + ' ' + html, 'tip', 6100);
}

// Große Einblendung: wer wen ins Wasser geschickt hat
const KO_TEXTS = [
  (a, b) => `<b>${a}</b> schickt <b>${b}</b> baden!`,
  (a, b) => `<b>${a}</b> versenkt <b>${b}</b>!`,
  (a, b) => `<b>${b}</b> geht baden – danke, <b>${a}</b>!`,
  (a, b) => `<b>${a}</b> schubst <b>${b}</b> ins Wasser!`,
];
let koN = 0;
function koText(html) {
  const el = $('ko');
  el.innerHTML = html;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function koBanner(s, hitter, victim) {
  // In Modi mit Wiederkehr fällt man ständig – dort nur, wenn man selbst beteiligt ist
  const big = s.mo === 'klassik' || s.mo === 'leben' || hitter === myId || victim === myId;
  if (!big) return;
  koText(KO_TEXTS[koN++ % KO_TEXTS.length](nameOf(s, hitter), nameOf(s, victim)));
}

let goUntil = 0;
let modeHintUntil = 0;
function flashGo() { goUntil = performance.now() + 700; modeHintUntil = performance.now() + 5000; }

// ---------- UI ----------

const cache = {};
function setHTML(id, html) {
  if (cache[id] === html) return false;
  cache[id] = html;
  $(id).innerHTML = html;
  return true;
}
function show(id, on) { $(id).classList.toggle('hidden', !on); }
// Bildschirme blenden weich ein und aus
function screen(id, on) { $(id).classList.toggle('on', on); }

function pips(n, target) {
  const max = Math.min(target, 10);
  return `<span class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}${n > max ? `+${n - max}` : ''}</span>`;
}

function updateUI(s) {
  const amHost = mode !== 'client';
  const me = s.p.find(p => p.id === myId);
  const inLobby = s.ph === 'lobby';
  const inRound = ['countdown', 'play', 'roundEnd'].includes(s.ph);

  screen('lobby', inLobby);
  show('hud', !inLobby);
  show('touch', !inLobby && isTouch && !['matchEnd', 'cardPick', 'cardShow'].includes(s.ph));
  screen('pick', s.ph === 'cardPick' || s.ph === 'cardShow');
  document.body.classList.toggle('picking', s.ph === 'cardPick' || s.ph === 'cardShow');
  screen('end', s.ph === 'matchEnd');
  show('emotes', !inLobby && s.ph !== 'matchEnd');

  if (inLobby) {
    show('hostCtl', amHost);
    show('waitHost', !amHost);
    show('shareRow', mode === 'host');
    const list = s.p.map(p => `<li>${avatarHTML(p)}<span>${esc(p.n)}</span>${p.id === myId ? '<span class="you">DU</span>' : p.b ? `<span class="tagbot">${iconHTML('bot')}</span>` : ''}</li>`).join('');
    const free = MAX_PLAYERS - s.p.length;
    setHTML('lobbyList', list + (free > 0 ? `<li class="free">… noch ${free} ${free === 1 ? 'Platz' : 'Plätze'} frei</li>` : ''));
    if (me) {
      const src = avatarURL(me.c, me.ci, me.h, 'normal', 96);
      if ($('hatShow').getAttribute('src') !== src) $('hatShow').src = src;
      $('hatName').textContent = HAT_NAMES[me.h] || '';
    }
    $('btnStart').disabled = s.p.length < 2;
    $('btnStart').textContent = s.p.length < 2 ? 'Warte auf Mitspieler …' : "Los geht's!";
    $('btnBotAdd').disabled = s.p.length >= MAX_PLAYERS;
    return;
  }

  const md = MODES[s.mo];
  const mp = MAPS[s.mp];

  // Punktestand mit Avataren
  const sorted = [...s.p].sort((a, b) => b.s - a.s);
  setHTML('scores', `<li class="goal">Runde ${s.rd} · Ziel: ${s.tg}</li>` + sorted.map(p => {
    const dead = p.st !== 'alive' && s.ph === 'play';
    const mood = s.cr.includes(p.id) ? 'smug' : dead ? 'dizzy' : 'normal';
    return `<li class="${dead ? 'dead' : ''}">${avatarHTML(p, mood)}<span class="nm">${esc(p.n)}</span>${pips(p.s, s.tg)}${inRound ? `<span class="metric">${md.hudMetric?.(p, s) || ''}</span>` : ''}</li>`;
  }).join(''));

  // Modus, Restzeit, Karte – knapp als Chips
  const card = s.c && CARDS[s.c];
  if (inRound) {
    const time = s.tl != null && s.ph === 'play' ? `<span class="chip time ${s.tl <= 5 ? 'urgent' : ''}">${Math.ceil(s.tl)}</span>` : '';
    setHTML('cardBadge', `<span class="chip">${iconHTML(s.mo)}${md.name}</span>${time}` + (card ? `<span class="chip">${iconHTML(s.c)}${card.name}</span>` : ''));
  } else setHTML('cardBadge', '');

  // Banner
  let banner = '';
  if (s.ph === 'countdown') banner = `${Math.ceil(s.tm)}<small>${iconHTML(s.mo)} ${md.name} · ${mp.name}</small>`;
  else if (s.ph === 'play' && performance.now() < goUntil) banner = 'LOS!';
  else if (s.ph === 'roundEnd') banner = esc(s.msg) + (s.rw === myId ? '<small>Das warst DU!</small>' : '');
  if (setHTML('banner', banner)) { $('banner').classList.remove('pop'); void $('banner').offsetWidth; $('banner').classList.add('pop'); }

  // Hinweis
  let hint = '';
  if (s.ph === 'play' && me) {
    if (me.st === 'ghost') hint = `${iconHTML('pups')} Du bist ein Geist! ${isTouch ? 'PUPS-Knopf' : 'Leertaste'} = Pups-Welle`;
    else if (me.st === 'falling' && md.respawn && (s.mo !== 'leben' || me.lv > 0)) hint = 'Plumps! Gleich geht\'s weiter …';
    else if (performance.now() < modeHintUntil) hint = `${iconHTML(s.mo)} ${md.desc}`;
    else if (card && s.c === 'spiegel' && s.co && performance.now() < modeHintUntil + 3000) hint = `${iconHTML('spiegel')} Steuerung vertauscht – außer für ${nameOf(s, s.co)}`;
    else if (s.rd === 1 && !isTouch) hint = 'WASD bewegen · Leertaste tippen/halten = Dash · Shift = Stemmen';
  }
  setHTML('hint', hint);

  // Touch-Knöpfe
  if (isTouch && me) {
    const btn = $('dashBtn');
    const ghost = me.st === 'ghost';
    btn.textContent = ghost ? 'PUPS' : 'DASH';
    btn.classList.toggle('pups', ghost);
    btn.classList.toggle('charging', me.ch >= 0);
    btn.style.setProperty('--cd', Math.max(0, Math.min(1, me.dc)));
    btn.style.setProperty('--charge', Math.max(0, me.ch));
    const bb = $('braceBtn');
    bb.classList.toggle('ghost', ghost || me.st !== 'alive');
    bb.style.setProperty('--cd', Math.max(0, Math.min(1, me.bc || 0)));
  }

  // Kartenwahl: echte Spielkarten
  if (s.ph === 'cardPick' || s.ph === 'cardShow') {
    const iPick = s.pk === myId && s.ph === 'cardPick';
    const pickerName = s.pk ? nameOf(s, s.pk) : 'Der Zufall';
    let title;
    if (s.ph === 'cardShow') title = `${CARDS[s.c].name}!`;
    else if (iPick) title = 'Du liegst hinten – wähl das Chaos!';
    else title = `${pickerName} wählt das Chaos …`;
    setHTML('pickTitle', title);
    setHTML('pickSub', `Nächste Runde: ${iconHTML(s.mo)} ${md.name} auf ${mapIconHTML(s.mp)} ${mp.name}`);
    const key = (s.op || []).join() + iPick;
    if (cache.pickKey !== key) {
      cache.pickKey = key;
      $('pickCards').innerHTML = '';
      (s.op || []).forEach((id, i) => {
        const c = CARDS[id];
        const el = document.createElement('div');
        el.className = 'card' + (iPick ? ' mine' : '');
        el.dataset.id = id;
        el.innerHTML = `${iconHTML(id, 'corner tl')}${iconHTML(id, 'corner br')}<div class="art">${iconHTML(id, 'big')}</div><div class="txt"><b>${c.name}</b><span>${c.desc}</span></div>`;
        if (iPick) el.onclick = () => { if (mode === 'client') net.send({ t: 'pick', i }); else game.choose(myId, i); };
        $('pickCards').appendChild(el);
      });
    }
    for (const el of $('pickCards').children) {
      el.classList.toggle('chosen', s.ph === 'cardShow' && el.dataset.id === s.c);
      el.classList.toggle('faded', s.ph === 'cardShow' && el.dataset.id !== s.c);
    }
    setHTML('pickTimer', s.ph === 'cardPick' ? `noch ${Math.ceil(s.tm)} s` : '');
  } else cache.pickKey = null;

  // Siegerehrung mit Podest
  if (s.ph === 'matchEnd') {
    setHTML('endTitle', `${nameOf(s, s.ch)} ist Inselkönig!`);
    const top = sorted.slice(0, 3);
    const order = [top[1], top[0], top[2]].filter(Boolean);
    const cls = (p) => (p === top[0] ? 'first' : p === top[1] ? 'second' : 'third');
    const medal = (p) => (p === top[0] ? 'medaille1' : p === top[1] ? 'medaille2' : 'medaille3');
    setHTML('podium', order.map(p => `<div class="pod ${cls(p)}">${avatarHTML(p, p === top[0] ? 'triumph' : 'normal')}<span class="nm">${esc(p.n)}</span><div class="block">${iconHTML(medal(p))}${p.s}</div></div>`).join(''));
    setHTML('rest', sorted.slice(3).map(p => `${esc(p.n)}: ${p.s}`).join(' · '));
    setHTML('awards', (s.aw || []).map(([icon, title, name, val]) => `<li>${iconHTML(icon)}<span><b>${title}:</b> ${esc(name)}</span><span class="val">${val}</span></li>`).join(''));
    show('endHost', amHost);
    show('endWait', !amHost);
  }
}

initInput($('joy'), $('knob'), $('dashBtn'), $('braceBtn'));
const debug = initDebug({ getGame: () => game, getRole: () => mode, getPings: () => pings, view });

// Im Menü spielen ein paar Bots im Hintergrund – jedes Mal ein anderer Modus
let demo = null;
function newDemo() {
  demo = new Game();
  for (let i = 0; i < 4; i++) demo.addPlayer('d' + i, BOT_NAMES[i + 2], true);
  demo.target = 99;
  demo.botLevel = 1;
  demo.startMatch();
}
let idleLast = 0;
(function idle(now) {
  requestAnimationFrame(idle);
  if (mode) { demo = null; return; }
  if (!demo) newDemo();
  const dt = Math.min(0.05, (now - idleLast) / 1000 || 0);
  idleLast = now;
  demo.step(dt);
  if (demo.phase === 'cardPick') demo.choose(demo.picker, Math.floor(Math.random() * 3));
  for (const e of demo.drainEvents()) view.addEvent(e, null);
  if (demo.round > 12) newDemo();
  view.draw(demo.snapshot([]), null, dt, now / 1000);
  setMusic('menu');
})(0);

// Nur für Tests: ?debug in der URL macht das Spielobjekt erreichbar
if (DEBUG) window.__game = () => game;
