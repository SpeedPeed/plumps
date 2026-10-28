// Alle Inseln. Jede Insel liegt in einer eigenen Datei; spätere Insel-Mechaniken
// (Phase 4) hängen sich dort über die Hooks setup(g) und step(g, dt) ein.
import rund from './rund.js';
import quadrat from './quadrat.js';
import kreuz from './kreuz.js';
import bruecke from './bruecke.js';
import archipel from './archipel.js';
import ring from './ring.js';
import karussell from './karussell.js';
import stern from './stern.js';
import knolle from './knolle.js';
import wippe from './wippe.js';

export const MAPS = Object.fromEntries([rund, quadrat, kreuz, bruecke, archipel, ring, karussell, stern, knolle, wippe].map(m => [m.id, m]));
export const MAP_IDS = Object.keys(MAPS);
