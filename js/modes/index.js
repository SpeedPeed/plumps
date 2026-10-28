// Alle Spielmodi. Hooks (alle optional):
//   setup(g), afterLayout(g)            – Rundenbeginn (vor/nach dem Aufstellen der Spieler)
//   step(g, dt, alive)                  – jeden Tick während der Runde
//   onFall(g, p), onCollide(g, a, b, attacker), onRemove(g, id), onEnd(g)
//   canRespawn(g, p)                    – true = kommt nach dem Sturz zurück, sonst Geist
//   checkEnd(g, all, dt)                – { winner } beendet die Runde (dt ist hier echte Zeit)
//   contenders(g, all)                  – wer noch im Rennen ist; bei zweien beginnt das Duell
//   time()                              – Zeitlimit; danach gewinnt die höchste score(g, p)
//   shrinkStart()                       – ab wann die Insel schrumpft
//   playerMods(g, p, pm), carryables(g), snapshot(g, s, withGrid)
//   botGoal(g, p, ctx)                  – Ziel für Bots (ctx.goal / ctx.flee / ctx.attack)
//   hudMetric(snapPlayer, snap)         – kleine Anzeige im Punktestand (läuft beim Client)
import klassik from './klassik.js';
import leben from './leben.js';
import huegel from './huegel.js';
import muenzen from './muenzen.js';
import farbe from './farbe.js';
import fangen from './fangen.js';

export const MODES = Object.fromEntries([klassik, leben, huegel, muenzen, farbe, fangen].map(m => [m.id, m]));
export const MODE_IDS = Object.keys(MODES);
// Auswahl-Topf für „Alle Modi im Wechsel“: weight = wie oft ein Modus im Topf liegt
export const MODE_POOL = MODE_IDS.flatMap(id => Array(MODES[id].weight || 1).fill(id));
