// Peer-to-Peer über WebRTC (PeerJS). Der Browser des Hosts ist der Server –
// es gibt keinen eigenen Server, also kostet das Spiel nichts.

const PREFIX = 'plumps-v1-';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

// ICE-Server: STUN findet die öffentliche Adresse, TURN leitet die Daten um, wenn eine
// direkte Verbindung nicht klappt (z. B. bei DS-Lite/CGNAT, Mobilfunk, Firmennetzen).
// Die freien öffentlichen TURN-Server sind ohne Gewähr – deshalb kann man in den
// Einstellungen zusätzlich einen eigenen TURN-Zugang eintragen (gespeichert nur im Browser).
const PUBLIC_ICE = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
  { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp', 'turns:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: ['turn:freestun.net:3478', 'turns:freestun.net:5349'], username: 'free', credential: 'free' },
  { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' },
];
const TURN_KEY = 'plumps-turn';
export function customTurn() {
  try { return JSON.parse(localStorage.getItem(TURN_KEY) || 'null'); } catch { return null; }
}
export function setCustomTurn(t) {
  try { if (t && t.url) localStorage.setItem(TURN_KEY, JSON.stringify(t)); else localStorage.removeItem(TURN_KEY); } catch { /* egal */ }
}
// Eigener Eintrag zuerst, damit er bevorzugt wird. Erlaubt mehrere Adressen, mit Komma getrennt.
export function iceServers() {
  const t = customTurn();
  const own = t && t.url ? [{ urls: t.url.split(/[\s,]+/).filter(Boolean), username: t.user || undefined, credential: t.pass || undefined }] : [];
  return [...own, ...PUBLIC_ICE];
}
const peerOptions = () => ({ config: { iceServers: iceServers() } });

// Verbindungstest: Welche Wege findet dieser Browser? host = nur lokal, srflx = über STUN
// (direkt über das Internet möglich), relay = über einen TURN-Server (klappt fast immer).
export async function testConnection(ms = 7000) {
  const pc = new RTCPeerConnection({ iceServers: iceServers() });
  pc.createDataChannel('test');
  const found = { host: false, srflx: false, relay: false, relays: new Set() };
  pc.onicecandidate = (e) => {
    const c = e.candidate;
    if (!c) return;
    const type = c.type || (/ typ (\w+)/.exec(c.candidate) || [])[1];
    if (type === 'host') found.host = true;
    if (type === 'srflx' || type === 'prflx') found.srflx = true;
    if (type === 'relay') { found.relay = true; if (c.url) found.relays.add(c.url.replace(/\?.*/, '')); }
  };
  await pc.setLocalDescription(await pc.createOffer());
  await new Promise(r => { setTimeout(r, ms); pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') setTimeout(r, 200); }; });
  pc.close();
  return found;
}

export const randomCode = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

function errorText(err) {
  const t = err && err.type;
  if (t === 'peer-unavailable') return 'Raum nicht gefunden. Code richtig?';
  if (t === 'network' || t === 'server-error' || t === 'socket-error') return 'Keine Verbindung zum Vermittlungsserver. Internet ok?';
  if (t === 'browser-incompatible') return 'Dein Browser kann leider kein WebRTC.';
  return 'Verbindungsfehler: ' + (t || err);
}

export class Host {
  constructor(handlers) {
    this.h = handlers;
    this.conns = new Map();
    this.seen = new Map();   // wann zuletzt etwas von wem kam
    this.tries = 0;
    this.open();
    // Wer den Tab einfach schließt, meldet sich oft nicht ab – nach 6 s Funkstille gilt er als gegangen
    this.watchdog = setInterval(() => {
      const now = performance.now();
      for (const id of this.conns.keys()) if (now - (this.seen.get(id) || now) > 6000) this.drop(id);
    }, 1000);
  }

  open() {
    this.code = randomCode();
    this.peer = new window.Peer(PREFIX + this.code, peerOptions());
    this.peer.on('open', () => this.h.onReady(this.code));
    this.peer.on('error', (err) => {
      if (err.type === 'unavailable-id' && this.tries++ < 5) { this.peer.destroy(); this.open(); return; }
      this.h.onError(errorText(err));
    });
    this.peer.on('disconnected', () => { if (!this.closed) this.peer.reconnect(); });
    this.peer.on('connection', (conn) => {
      conn.on('open', () => {
        this.conns.set(conn.peer, conn);
        this.seen.set(conn.peer, performance.now());
      });
      conn.on('data', (msg) => { this.seen.set(conn.peer, performance.now()); this.h.onData(conn.peer, msg); });
      conn.on('close', () => this.drop(conn.peer));
      conn.on('error', () => this.drop(conn.peer));
    });
  }

  // Verbindung gilt als beendet (nur einmal melden)
  drop(id) {
    const c = this.conns.get(id);
    if (!c) return;
    this.conns.delete(id);
    this.seen.delete(id);
    try { c.close(); } catch { /* schon zu */ }
    this.h.onLeave(id);
  }

  send(id, msg) {
    const c = this.conns.get(id);
    if (c && c.open) c.send(msg);
  }

  broadcast(msg) {
    for (const c of this.conns.values()) if (c.open) c.send(msg);
  }

  kick(id) {
    const c = this.conns.get(id);
    if (c) { this.conns.delete(id); c.close(); }
  }

  close() {
    this.closed = true;
    clearInterval(this.watchdog);
    this.peer.destroy();
  }
}

export class Client {
  constructor(code, handlers) {
    this.h = handlers;
    this.peer = new window.Peer(undefined, peerOptions());
    this.peer.on('error', (err) => this.h.onError(errorText(err)));
    this.peer.on('open', () => {
      this.conn = this.peer.connect(PREFIX + code.toUpperCase(), { reliable: true, serialization: 'json' });
      // Der Weg über einen TURN-Server braucht etwas länger – deshalb großzügig warten
      let ice = 'new';
      const fail = () => this.h.onError(ice === 'new'
        ? 'Keine Antwort vom Raum. Ist der Host noch da und der Code richtig?'
        : 'Raum gefunden, aber keine Verbindung möglich – eure Netze blockieren die direkte Verbindung. Tipp: Einstellungen → „Verbindung testen“.');
      const timeout = setTimeout(() => { if (!this.conn.open) fail(); }, 25000);
      this.conn.on('iceStateChanged', (st) => {
        ice = st;
        this.h.onStatus?.(st);
        if (st === 'failed' && !this.conn.open) { clearTimeout(timeout); fail(); }
      });
      this.conn.on('open', () => { clearTimeout(timeout); this.h.onOpen(); });
      this.conn.on('data', (msg) => this.h.onData(msg));
      this.conn.on('close', () => { if (!this.closed) this.h.onError('Verbindung zum Host verloren.'); });
    });
  }

  send(msg) {
    if (this.conn && this.conn.open) this.conn.send(msg);
  }

  close() {
    this.closed = true;
    this.peer.destroy();
  }
}
