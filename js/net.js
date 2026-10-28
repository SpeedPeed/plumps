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
    this.tries = 0;
    this.open();
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
      });
      conn.on('data', (msg) => this.h.onData(conn.peer, msg));
      const gone = () => {
        if (!this.conns.has(conn.peer)) return;
        this.conns.delete(conn.peer);
        this.h.onLeave(conn.peer);
      };
      conn.on('close', gone);
      conn.on('error', gone);
    });
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
