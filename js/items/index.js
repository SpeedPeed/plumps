// Alle Power-ups. Ein Power-up hat:
//   apply(g, p, alive)  – passiert beim Aufsammeln
//   effects             – laufende Effekte (Schlüssel in p.pw = Restzeit), je mit
//                         mods(g, p, pm) und/oder step(g, p, dt)
import glove from './glove.js';
import anchor from './anchor.js';
import big from './big.js';
import speed from './speed.js';
import banana from './banana.js';
import bomb from './bomb.js';
import swap from './swap.js';
import invis from './invis.js';

const ALL = [glove, anchor, big, speed, banana, bomb, swap, invis];
export const ITEMS = Object.fromEntries(ALL.map(i => [i.id, i]));
export const ITEM_IDS = Object.keys(ITEMS);
export const EFFECTS = Object.assign({}, ...ALL.map(i => i.effects || {}));
