import { Game, CARDS, MODES, MAPS, ITEMS, HATS, EMOTES, MAX_PLAYERS } from './sim.js';
import { Host, Client } from './net.js';
import { View } from './render.js';
import { initInput, readInput } from './input.js';
import { sfx, unlockAudio, toggleMute } from './audio.js';

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

// ---------- Menü ----------

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* egal */ } },
};
$('name').value = store.get('plumps-name') || '';
let myHat = +(store.get('plumps-hat') ?? 1) || 0;
if (!HATS[myHat] && myHat !== 0) myHat = 0;
const urlCode = new URLSearchParams(location.search).get('r');
if (urlCode) { $('code').value = urlCode.toUpperCase().slice(0, 4); $('btnJoin').classList.add('big'); }

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
    toast(`${esc(String(msg.name || 'Blob').slice(0, 14))} ist da!`);
  } else if (msg.t === 'in') {
    game.setInput(id, msg);
  } else if (msg.t === 'pick') {
    game.choose(id, msg.i | 0);
  } else if (msg.t === 'hat') {
    game.setHat(id, msg.h | 0);
  } else if (msg.t === 'emo') {
    game.emote(id, msg.i | 0);
  }
}

function addBot() {
  if (game.players.size >= MAX_PLAYERS) return;
  const used = new Set([...game.players.values()].map(p => p.name));
  const name = BOT_NAMES.find(n => !used.has(n)) || 'Bot';
  game.addPlayer('bot' + (++botCounter), name, true);
}

function setHat(h) {
  myHat = (h + HATS.length) % HATS.length;
  store.set('plumps-hat', myHat);
  $('hatShow').textContent = HATS[myHat] || '—';
  if (mode === 'client') net.send({ t: 'hat', h: myHat });
  else if (game) game.setHat(myId, myHat);
}
$('hatPrev').onclick = () => setHat(myHat - 1);
$('hatNext').onclick = () => setHat(myHat + 1);
$('hatShow').textContent = HATS[myHat] || '—';

function sendEmote(i) {
  if (!mode) return;
  if (mode === 'client') net.send({ t: 'emo', i });
  else game.emote(myId, i);
}
$('emotes').innerHTML = EMOTES.map((e, i) => `<button data-i="${i}">${e}${isTouch ? '' : `<small>${i + 1}</small>`}</button>`).join('');
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
$('btnMute').onclick = () => { $('btnMute').textContent = toggleMute() ? '🔇' : '🔊'; };

// ---------- Schleifen ----------

let simWorker = null;
let inputTimer = null;
let rafId = null;
let lastTick = 0;
let acc = 0;
let tickN = 0;

function startLoops() {
  $('menu').classList.add('hidden');
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
  cancelAnimationFrame(rafId);
  net = game = simWorker = null;
  mode = myId = current = lastGrid = null;
  snaps = []; localEvents = []; netEvents = [];
  setBusy(false);
  for (const id of ['lobby', 'hud', 'pick', 'end', 'touch']) $(id).classList.add('hidden');
  $('menu').classList.remove('hidden');
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
  if (s) { current = s; updateUI(s); }
  view.draw(current, myId, dt, now / 1000);
}

// ---------- Ereignisse → Sound/Effekte/Toasts ----------

function nameOf(s, id) { return esc(s.p.find(p => p.id === id)?.n || '???'); }

function handleEvent(e, s) {
  view.addEvent(e, s);
  const mine = e.id === myId;
  switch (e.k) {
    case 'boing': sfx.boing(e.p); break;
    case 'dash': sfx.dash(); break;
    case 'plumps': sfx.plumps(); if (mine) vibrate(120); break;
    case 'boom': sfx.boom(); vibrate(60); break;
    case 'pups': sfx.pups(); break;
    case 'bumper': sfx.bumper(); break;
    case 'swap': sfx.swap(); toast('🔀 Platztausch!'); break;
    case 'potato': sfx.potato(); if (mine) toast('🥔 Du hast die Kartoffel! Weitergeben!'); break;
    case 'count': sfx.count(); break;
    case 'go': sfx.go(); flashGo(); break;
    case 'card': sfx.card(); break;
    case 'win': sfx.win(); break;
    case 'draw': sfx.draw(); break;
    case 'regicide': sfx.regicide(); toast(`👑 Königsmord! ${nameOf(s, e.id)} +1`); break;
    case 'champion': sfx.champion(); break;
    case 'coin': if (mine) sfx.coin(); break;
    case 'coinloss': if (mine) toast(`💸 ${e.n} Münzen weg!`); break;
    case 'punch': sfx.punch(); vibrate(40); break;
    case 'slip': sfx.slip(); break;
    case 'item': if (mine) { sfx.item(); const it = ITEMS[e.type]; toast(`${it.emoji} <b>${it.name}</b> – ${it.desc}`); } break;
    case 'respawn': if (mine) sfx.respawn(); break;
    case 'tag': sfx.tag(); if (mine) toast('🧟 Du hast den Glibber! Rempel jemanden an!'); break;
    case 'zone': sfx.zone(); break;
    case 'matchball': sfx.matchball(); toast(`🔥 Matchball für ${nameOf(s, e.id)}!`); break;
    default:
  }
}

function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* egal */ } }

function toast(html) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = html;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 2700);
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

function updateUI(s) {
  const amHost = mode !== 'client';
  const me = s.p.find(p => p.id === myId);
  const inLobby = s.ph === 'lobby';
  const inRound = ['countdown', 'play', 'roundEnd'].includes(s.ph);

  show('lobby', inLobby);
  show('hud', !inLobby);
  show('touch', !inLobby && isTouch && !['matchEnd', 'cardPick', 'cardShow'].includes(s.ph));
  show('pick', s.ph === 'cardPick' || s.ph === 'cardShow');
  show('end', s.ph === 'matchEnd');
  show('emotes', !inLobby && s.ph !== 'matchEnd');

  if (inLobby) {
    show('hostCtl', amHost);
    show('waitHost', !amHost);
    show('shareRow', mode === 'host');
    const list = s.p.map(p => `<li><span class="dot" style="background:${p.c}"></span><span class="hatm">${HATS[p.h] || ''}</span>${esc(p.n)}${p.b ? ' 🤖' : ''}${p.id === myId ? '<span class="you">DU</span>' : ''}</li>`).join('');
    const free = MAX_PLAYERS - s.p.length;
    setHTML('lobbyList', list + (free > 0 ? `<li style="opacity:.5">… noch ${free} Plätze frei</li>` : ''));
    $('btnStart').disabled = s.p.length < 2;
    $('btnStart').textContent = s.p.length < 2 ? 'Warte auf Mitspieler …' : "Los geht's!";
    $('btnBotAdd').disabled = s.p.length >= MAX_PLAYERS;
    return;
  }

  const md = MODES[s.mo];
  const mp = MAPS[s.mp];

  // Punktestand
  const sorted = [...s.p].sort((a, b) => b.s - a.s);
  setHTML('scores', `<li class="goal">Runde ${s.rd} · Ziel: ${s.tg} Punkte</li>` + sorted.map(p =>
    `<li class="${p.st !== 'alive' && s.ph === 'play' ? 'dead' : ''}"><span class="dot" style="background:${p.c}"></span>${s.cr.includes(p.id) ? '👑' : ''}${esc(p.n)}${p.st === 'ghost' && s.ph === 'play' ? ' 👻' : ''} <span class="pips">${'●'.repeat(Math.min(p.s, 12))}</span>${inRound ? `<span class="metric">${md.hudMetric?.(p, s) || ''}</span>` : ''}</li>`).join(''));

  // Modus, Insel, Karte, Restzeit
  const card = s.c && CARDS[s.c];
  show('cardBadge', inRound);
  if (inRound) {
    const extra = s.c === 'spiegel' && s.co ? ` (außer ${nameOf(s, s.co)})` : '';
    const time = s.tl != null && s.ph === 'play' ? ` · <span class="time">⏱ ${Math.ceil(s.tl)} s</span>` : '';
    setHTML('cardBadge', `<span class="mode">${md.emoji} ${md.name} · ${mp.emoji} ${mp.name}</span>${time}` +
      (card ? `<b>${card.emoji} ${card.name}</b><small>${card.desc}${extra}</small>` : ''));
  }

  // Banner
  let banner = '';
  if (s.ph === 'countdown') banner = `${Math.ceil(s.tm)}<small>${md.emoji} ${md.name}: ${md.desc}</small>`;
  else if (s.ph === 'play' && performance.now() < goUntil) banner = 'LOS!';
  else if (s.ph === 'roundEnd') banner = esc(s.msg) + (s.rw === myId ? '<small>Das warst DU! 🎉</small>' : '');
  if (setHTML('banner', banner)) { $('banner').classList.remove('pop'); void $('banner').offsetWidth; $('banner').classList.add('pop'); }

  // Hinweis
  let hint = '';
  if (s.ph === 'play' && me) {
    if (me.st === 'ghost') hint = `👻 Du bist ein Geist! ${isTouch ? 'PUPS-Knopf' : 'Leertaste'} = Pups-Welle. Schubs die Lebenden runter!`;
    else if (me.st === 'falling' && md.respawn && (s.mo !== 'leben' || me.lv > 0)) hint = 'Plumps! Gleich geht\'s weiter …';
    else if (performance.now() < modeHintUntil) hint = `${md.emoji} ${md.desc}`;
    else if (s.rd === 1 && !isTouch) hint = 'WASD/Pfeile bewegen · Leertaste = Dash · 1–5 = Emotes';
  }
  setHTML('hint', hint);

  // Touch-Knopf
  if (isTouch && me) {
    const btn = $('dashBtn');
    const ghost = me.st === 'ghost';
    btn.textContent = ghost ? 'PUPS' : 'DASH';
    btn.classList.toggle('pups', ghost);
    btn.style.setProperty('--cd', Math.max(0, Math.min(1, me.dc)));
  }

  // Kartenwahl
  if (s.ph === 'cardPick' || s.ph === 'cardShow') {
    const iPick = s.pk === myId && s.ph === 'cardPick';
    const pickerName = s.pk ? nameOf(s, s.pk) : 'Der Zufall';
    let title;
    if (s.ph === 'cardShow') title = `${CARDS[s.c].emoji} ${CARDS[s.c].name}!`;
    else if (iPick) title = 'Du liegst hinten – such dir das Chaos aus! 😈';
    else title = `${pickerName} wählt das Chaos …`;
    setHTML('pickTitle', title);
    setHTML('pickSub', `Nächste Runde: ${md.emoji} ${md.name} auf ${mp.emoji} ${mp.name}`);
    const key = s.ph + (s.op || []).join() + iPick + s.c;
    if (cache.pickKey !== key) {
      cache.pickKey = key;
      $('pickCards').innerHTML = '';
      (s.op || []).forEach((id, i) => {
        const c = CARDS[id];
        const el = document.createElement('div');
        el.className = 'card' + (iPick ? ' mine' : '') + (s.ph === 'cardShow' ? (id === s.c ? ' chosen' : ' faded') : '');
        el.innerHTML = `<span class="em">${c.emoji}</span><div><b>${c.name}</b><span>${c.desc}</span></div>`;
        if (iPick) el.onclick = () => { if (mode === 'client') net.send({ t: 'pick', i }); else game.choose(myId, i); };
        $('pickCards').appendChild(el);
      });
    }
    setHTML('pickTimer', s.ph === 'cardPick' ? `noch ${Math.ceil(s.tm)} s` : '');
  } else cache.pickKey = null;

  // Matchende
  if (s.ph === 'matchEnd') {
    setHTML('endTitle', `👑 ${nameOf(s, s.ch)} ist Inselkönig!`);
    const medals = ['🥇', '🥈', '🥉'];
    setHTML('podium', sorted.map((p, i) => `<li><span class="dot" style="background:${p.c}"></span>${medals[i] || ''} ${HATS[p.h] || ''} ${esc(p.n)}<span class="pts">${p.s}</span></li>`).join(''));
    setHTML('awards', (s.aw || []).map(([em, title, name, val]) => `<li>${em} <b>${title}:</b> ${esc(name)} <span style="margin-left:auto;opacity:.7">${val}</span></li>`).join(''));
    show('endHost', amHost);
    show('endWait', !amHost);
  }
}

initInput($('joy'), $('knob'), $('dashBtn'));

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
})(0);

// Nur für Tests: ?debug in der URL macht das Spielobjekt erreichbar
if (new URLSearchParams(location.search).has('debug')) window.__game = () => game;
