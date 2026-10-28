// Alle Chaos-Karten. Hooks (alle optional):
// Jede Karte hilft dem, der sie wählt (perkFor 'picker') oder bremst den Führenden
// (perkFor 'leader'); perk beschreibt das in einem Satz.
//   fits(modeId, mapDef)            – passt die Karte zu Modus und Insel?
//   playerMods(g, p, pm)            – Werte für einen Spieler
//   canPick(g, p)                   – darf der Spieler Power-ups aufheben?
//   afterLayout(g)                  – nach dem Aufstellen der Spieler
//   globalMods(g, gm)               – Werte für alle (Reibung, Größe, Zeitlupe, Schrumpfen …)
//   input(g, p, {mx, my})           – Steuerung verändern
//   force(g, p, alive)              – zusätzliche Kraft [ax, ay]
//   setup(g), step(g, dt, alive), onCollide(g, a, b, attacker), onFall(g, p), onRemove(g, id)
//   botAdjust(g, p, ctx)            – Bots auf die Karte einstellen
//   snapshot(g, s)
import eis from './eis.js';
import riesen from './riesen.js';
import spiegel from './spiegel.js';
import bomben from './bomben.js';
import donut from './donut.js';
import wind from './wind.js';
import magnet from './magnet.js';
import kartoffel from './kartoffel.js';
import dunkel from './dunkel.js';
import schrumpf from './schrumpf.js';
import flipper from './flipper.js';
import tausch from './tausch.js';
import geister from './geister.js';
import geschenk from './geschenk.js';
import bananen from './bananen.js';
import zeitlupe from './zeitlupe.js';

const ALL = [eis, riesen, spiegel, bomben, donut, wind, magnet, kartoffel, dunkel, schrumpf, flipper, tausch, geister, geschenk, bananen, zeitlupe];
export const CARDS = Object.fromEntries(ALL.map(c => [c.id, c]));
export const CARD_IDS = Object.keys(CARDS);
// Platzhalter für „keine Karte“ (erste Runde)
export const NO_CARD = { id: null };
