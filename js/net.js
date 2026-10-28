// Peer-to-Peer über WebRTC (PeerJS). Der Browser des Hosts ist der Server –
// es gibt keinen eigenen Server, also kostet das Spiel nichts.

const PREFIX = 'plumps-v1-';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

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
    this.peer = new window.Peer(PREFIX + this.code);
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
    this.peer = new window.Peer();
    this.peer.on('error', (err) => this.h.onError(errorText(err)));
    this.peer.on('open', () => {
      this.conn = this.peer.connect(PREFIX + code.toUpperCase(), { reliable: true, serialization: 'json' });
      const timeout = setTimeout(() => { if (!this.conn.open) this.h.onError('Keine Antwort vom Raum. Ist der Host noch da?'); }, 12000);
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
