import { Game, CARDS, MODES, MAPS, ITEMS, MAX_PLAYERS, HAT_COUNT, COLORS, BOT_LEVELS } from './sim.js';
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
let snapLog = [];          // die letzten ~12 s an Snapshots (für die Wiederholung)
let replay = null;        // läuft gerade eine Wiederholung?
let kicked = false;

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
    onLeave: (id) => { if (game.phase === 'lobby') game.removePlayer(id); else game.botify(id); },
  });
};

// Tab zu: dem Host Bescheid sagen, damit sofort ein Bot übernimmt
addEventListener('pagehide', () => { if (mode === 'client' && net) net.send({ t: 'bye' }); });

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
    onError: (msg) => menuError(kicked ? 'Der Host hat dich aus dem Raum geworfen.' : msg),
    onData: (msg) => {
      if (msg.t === 'kicked') { kicked = true; return; }
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
        remember(msg);
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
  } else if (msg.t === 'ready') {
    game.setReady(id, msg.v);
  } else if (msg.t === 'color') {
    game.setColor(id, msg.ci | 0);
  } else if (msg.t === 'bye') {
    net.drop(id);
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

// Lobby: bereit melden, Farbe wählen, (als Host) Spieler rauswerfen
let myReady = false;
$('btnReady').onclick = () => {
  myReady = !myReady;
  if (mode === 'client') net.send({ t: 'ready', v: myReady });
};
$('colorRow').innerHTML = COLORS.map((c, i) => `<button data-ci="${i}" title="Farbe ${i + 1}"><img src="${avatarURL(c, i, 0)}" alt=""></button>`).join('');
$('colorRow').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b || b.classList.contains('taken')) return;
  const ci = +b.dataset.ci;
  if (mode === 'client') net.send({ t: 'color', ci });
  else if (game) game.setColor(myId, ci);
};
$('lobbyList').onclick = (e) => {
  const b = e.target.closest('.kick');
  if (!b || !game || mode === 'client') return;
  const id = b.dataset.id, p = game.players.get(id);
  if (!p) return;
  if (!p.bot && net) { net.send(id, { t: 'kicked' }); setTimeout(() => net.kick(id), 150); }
  game.removePlayer(id);
};

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
    if (++tickN % 2 === 0) {
      // Das Farbkampf-Raster ist groß – nur jedes dritte Paket schickt es mit
      const withGrid = game.gridDirty && tickN % 6 === 0;
      if (withGrid && mode === 'host') game.gridDirty = false;
      const snap = game.snapshot(netEvents, withGrid);
      if (mode === 'host') net.broadcast(snap);
      remember(snap);
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
  snaps = []; localEvents = []; netEvents = []; snapLog = []; replay = null; kicked = false;
  document.body.classList.remove('replaying');
  setBusy(false);
  for (const id of ['lobby', 'end']) screen(id, false);
  for (const id of ['hud', 'touch', 'pick']) $(id).classList.add('hidden');
  document.body.classList.remove('picking');
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

// ---------- Wiederholung des Rauswurfs ----------

function remember(snap) {
  snapLog.push(snap);
  const oldest = snap.tk - 12 * 60;
  while (snapLog.length && snapLog[0].tk < oldest) snapLog.shift();
}

function startReplay(info) {
  const frames = snapLog.filter(h => h.tk >= info.from && h.tk <= info.to);
  if (frames.length < 4) return;
  replay = { frames, info, start: performance.now(), seen: 0 };
  document.body.classList.add('replaying');
  sfx.replay();
  const s = frames[frames.length - 1];
  koText(info.a ? KO_TEXTS[koN++ % KO_TEXTS.length](nameOf(s, info.a), nameOf(s, info.v)) : `<b>${nameOf(s, info.v)}</b> plumpst ganz allein!`);
}

// Liefert das Bild der Wiederholung zum aktuellen Zeitpunkt (oder null, wenn sie vorbei ist)
function replayFrame() {
  const { frames, info, start } = replay;
  const tk = info.from + (performance.now() - start) / 1000 * info.speed * 60;
  if (tk > info.to) { replay = null; view.focus = null; document.body.classList.remove('replaying'); return null; }
  let i = 0;
  while (i < frames.length - 2 && frames[i + 1].tk <= tk) i++;
  const a = frames[i], b = frames[i + 1] || a;
  // Effekte der abgespielten Bilder noch einmal zeigen (ohne Ton, bis auf den Plumps)
  for (; replay.seen <= i; replay.seen++) {
    for (const e of frames[replay.seen].ev || []) {
      if (['plumps', 'boom', 'hit', 'counter', 'break', 'boing', 'dash', 'punch'].includes(e.k)) view.addEvent(e, frames[replay.seen]);
      if (e.k === 'plumps' && e.id === info.v) sfx.plumps();
    }
  }
  const k = b.tk > a.tk ? Math.max(0, Math.min(1, (tk - a.tk) / (b.tk - a.tk))) : 0;
  const prev = new Map(a.p.map(p => [p.id, p]));
  view.focus = { x: info.x, y: info.y };
  return {
    ...b,
    ph: 'play', tl: null,
    p: b.p.map(p => { const q = prev.get(p.id); return q && q.st === p.st ? { ...p, x: lerp(q.x, p.x, k), y: lerp(q.y, p.y, k), f: lerp(q.f, p.f, k) } : p; }),
  };
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
  // Gäste sehen den Snapshot leicht verzögert – die Wiederholung startet evtl. noch in 'play'
  if (replay && current?.ph !== 'roundEnd' && current?.ph !== 'play') { replay = null; view.focus = null; document.body.classList.remove('replaying'); }
  const shown = replay ? replayFrame() || current : current;
  view.draw(shown, myId, dt, now / 1000);
  debug.frame(dt, current);
}

// Musik passt sich der Lage an: Kartenwahl, Spiel (schneller beim Schrumpfen und im Duell), Sieg
function updateMusic(s) {
  if (s.ph === 'lobby') setMusic('menu');
  else if (s.ph === 'matchEnd') setMusic('win');
  else if (s.fi) setMusic('final', s.duel || s.sk ? 3 : 2);
  else if (s.ph === 'pick') setMusic('pick');
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
    case 'card': sfx.card(); if (e.by) toast(`${iconHTML(e.card)} <b>${nameOf(s, e.by)}</b> wählt ${CARDS[e.card].name}`); break;
    case 'replay': startReplay(e); break;
    case 'finale':
      sfx.matchball();
      koText('<b>FINALE!</b>');
      break;
    case 'botified': toast(`${iconHTML('bot')} <b>${nameOf(s, e.id)}</b> ist weg – ein Bot übernimmt`); break;
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
  show('touch', !inLobby && isTouch && s.ph !== 'matchEnd');
  show('pick', s.ph === 'pick');
  document.body.classList.toggle('picking', s.ph === 'pick');
  screen('end', s.ph === 'matchEnd');
  show('emotes', !inLobby && s.ph !== 'matchEnd');

  if (inLobby) {
    show('hostCtl', amHost);
    show('waitHost', !amHost);
    show('shareRow', mode === 'host');
    show('btnReady', !amHost);
    show('lobbySettings', !amHost);
    const list = s.p.map(p => {
      const host = p.id === 'host' || (mode === 'solo' && p.id === myId);
      const status = p.b ? iconHTML('bot') : host ? '<span class="tagready">Host</span>' : p.rd ? '<span class="tagready">bereit</span>' : '<span class="tagwait">wartet</span>';
      const kick = amHost && !host ? `<button class="btn kick" data-id="${esc(p.id)}" title="Rauswerfen">✕</button>` : '';
      return `<li>${avatarHTML(p)}<span>${esc(p.n)}</span><span class="tags">${p.id === myId ? '<span class="you">DU</span>' : ''}${status}${kick}</span></li>`;
    }).join('');
    const free = MAX_PLAYERS - s.p.length;
    setHTML('lobbyList', list + (free > 0 ? `<li class="free">… noch ${free} ${free === 1 ? 'Platz' : 'Plätze'} frei</li>` : ''));
    if (me) {
      const src = avatarURL(me.c, me.ci, me.h, 'normal', 96);
      if ($('hatShow').getAttribute('src') !== src) $('hatShow').src = src;
      $('hatName').textContent = HAT_NAMES[me.h] || '';
      for (const b of $('colorRow').children) {
        const ci = +b.dataset.ci;
        b.classList.toggle('mine', me.ci === ci);
        b.classList.toggle('taken', me.ci !== ci && s.p.some(p => p.ci === ci));
      }
      $('btnReady').classList.toggle('on', !!me.rd);
      $('btnReady').textContent = me.rd ? 'Bereit ✓' : 'Bereit!';
      myReady = !!me.rd;
    }
    // Alle sehen die Einstellungen des Hosts
    const set = s.set || {};
    setHTML('lobbySettings', `Punkte zum Sieg: <b>${set.tg}</b> · Bots: <b>${BOT_LEVELS[set.bl]?.name || ''}</b> · Modi: <b>${set.mm ? 'alle im Wechsel' : 'nur „Letzter Blob“'}</b>`);
    const humans = s.p.filter(p => !p.b && p.id !== 'host');
    const ready = humans.filter(p => p.rd).length;
    $('btnStart').disabled = s.p.length < 2;
    $('btnStart').textContent = s.p.length < 2 ? 'Warte auf Mitspieler …' : ready < humans.length ? `Los geht's! (${ready}/${humans.length} bereit)` : "Los geht's!";
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
  if (s.ph === 'countdown') {
    const what = s.fi ? `${iconHTML('krone')} FINALE · ${mp.name}` : `${iconHTML(s.mo)} ${md.name} · ${mp.name}`;
    banner = `${Math.ceil(s.tm)}<small>${what}</small>${card ? `<small class="cardline">${iconHTML(s.c)} ${card.name}</small>` : ''}`;
  }
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
  if (s.ph === 'pick') hint = 'Schwabbel schon mal herum – gleich geht\'s los!';
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

  // Zwischen den Runden: Kartenwahl bzw. Finale-Ansage, dazu der Zwischenstand
  if (s.ph === 'pick') {
    const iPick = s.pk === myId && !!s.op;
    $('pick').classList.toggle('finale', !s.op);
    if (!s.op) {
      const mb = s.p.filter(p => p.s >= s.tg - 1);
      const names = mb.map(p => `<b>${esc(p.n)}</b>`).join(' und ');
      setHTML('pickTitle', 'FINALE!');
      setHTML('pickSub', `${names} ${mb.length > 1 ? 'haben' : 'hat'} Matchball. Wer davon diese Runde gewinnt, ist Inselkönig!`);
    } else {
      setHTML('pickTitle', iPick ? 'Du liegst hinten – wähl das Chaos!' : `${s.pk ? nameOf(s, s.pk) : 'Der Zufall'} wählt das Chaos …`);
      setHTML('pickSub', `Nächste Runde: ${iconHTML(s.mo)} ${md.name} auf ${mapIconHTML(s.mp)} ${mp.name}`);
    }
    const key = (s.op || []).join() + iPick;
    if (cache.pickKey !== key) {
      cache.pickKey = key;
      $('pickCards').innerHTML = '';
      (s.op || []).forEach((id, i) => {
        const c = CARDS[id];
        const el = document.createElement('div');
        el.className = 'card' + (iPick ? ' mine' : '');
        el.innerHTML = `${iconHTML(id, 'corner tl')}${iconHTML(id, 'corner br')}<div class="art">${iconHTML(id)}</div><div class="txt"><b>${c.name}</b><span>${c.desc}</span></div>`;
        if (iPick) el.onclick = () => { if (mode === 'client') net.send({ t: 'pick', i }); else game.choose(myId, i); };
        $('pickCards').appendChild(el);
      });
    }
    const total = s.op ? T.CARD_PICK : T.FINALE_INTRO;
    $('pickBar').firstElementChild.style.width = `${Math.max(0, Math.min(1, s.tm / total)) * 100}%`;
    setHTML('standings', sorted.map(p => `<li class="${p.id === s.rw ? 'won' : ''} ${p.s >= s.tg - 1 ? 'mb' : ''}">${avatarHTML(p, p.id === s.rw ? 'triumph' : 'normal')}${p.s}</li>`).join(''));
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
  if (demo.phase === 'pick' && demo.options) demo.choose(demo.picker, Math.floor(Math.random() * 3));
  for (const e of demo.drainEvents()) view.addEvent(e, null);
  if (demo.round > 12) newDemo();
  view.draw(demo.snapshot([]), null, dt, now / 1000);
  setMusic('menu');
})(0);

// Nur für Tests: ?debug in der URL macht das Spielobjekt erreichbar
if (DEBUG) window.__game = () => game;
