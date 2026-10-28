// Kosmetik und Stufen. Alles hier ist nur Aussehen – nichts davon verändert das Spiel.
// Hüte 0–13, Emotes 0–4, „keine Spur“ und der Hüpfer gibt es von Anfang an,
// der Rest wird mit Stufen freigeschaltet (js/profile.js).
import { HAT_IDS, HAT_NAMES, EMOTE_IDS } from './art/icons.js';

export const FREE_HATS = 14;
export const FREE_EMOTES = 5;

// Spuren: was ein schneller Blob hinter sich herzieht (js/render.js)
export const TRAILS = [
  { id: '', icon: 'keinespur', name: 'Keine Spur' },
  { id: 'funken', icon: 'funken', name: 'Funken' },
  { id: 'blasen', icon: 'blasen', name: 'Blubberblasen' },
  { id: 'herzen', icon: 'herzen', name: 'Herzchen' },
  { id: 'regenbogen', icon: 'regenbogen', name: 'Regenbogen' },
  { id: 'sterne', icon: 'sterne', name: 'Sternenstaub' },
  { id: 'konfetti', icon: 'konfetti', name: 'Konfetti' },
];

// Siegestänze: beim Rundensieg im Spiel und auf dem Podest
export const DANCES = [
  { id: 'huepf', name: 'Hüpfer' },
  { id: 'dreh', name: 'Pirouette' },
  { id: 'wackel', name: 'Wackeltanz' },
  { id: 'flip', name: 'Salto' },
  { id: 'puls', name: 'Aufpumpen' },
];

export const EMOTE_NAMES = ['Lachen', 'Schreck', 'Wut', 'Häufchen', 'Winken', 'Cool', 'Verliebt', 'Gähnen'];

// Freischaltungen nach Stufe
export const UNLOCKS = [
  { lv: 2, kind: 'hat', i: 14 },
  { lv: 3, kind: 'trail', i: 1 },
  { lv: 4, kind: 'emote', i: 5 },
  { lv: 5, kind: 'dance', i: 1 },
  { lv: 6, kind: 'hat', i: 15 },
  { lv: 7, kind: 'trail', i: 2 },
  { lv: 8, kind: 'emote', i: 6 },
  { lv: 9, kind: 'dance', i: 2 },
  { lv: 10, kind: 'hat', i: 16 },
  { lv: 11, kind: 'trail', i: 3 },
  { lv: 12, kind: 'emote', i: 7 },
  { lv: 13, kind: 'dance', i: 3 },
  { lv: 14, kind: 'hat', i: 17 },
  { lv: 15, kind: 'trail', i: 4 },
  { lv: 17, kind: 'dance', i: 4 },
  { lv: 18, kind: 'hat', i: 18 },
  { lv: 20, kind: 'trail', i: 5 },
  { lv: 22, kind: 'hat', i: 19 },
  { lv: 25, kind: 'trail', i: 6 },
];

export const KIND_NAMES = { hat: 'Hut', trail: 'Spur', emote: 'Emote', dance: 'Siegestanz' };

export function unlockName(u) {
  if (u.kind === 'hat') return HAT_NAMES[u.i];
  if (u.kind === 'trail') return TRAILS[u.i].name;
  if (u.kind === 'emote') return EMOTE_NAMES[u.i];
  return DANCES[u.i].name;
}
export function unlockIcon(u) {
  if (u.kind === 'hat') return HAT_IDS[u.i];
  if (u.kind === 'trail') return TRAILS[u.i].icon;
  if (u.kind === 'emote') return EMOTE_IDS[u.i];
  return 'party';
}

// Ab welcher Stufe gibt es das? (1 = von Anfang an)
export function levelFor(kind, i) {
  if (kind === 'hat' && i < FREE_HATS) return 1;
  if (kind === 'emote' && i < FREE_EMOTES) return 1;
  if ((kind === 'trail' || kind === 'dance') && i === 0) return 1;
  return UNLOCKS.find(u => u.kind === kind && u.i === i)?.lv ?? 99;
}

// Stufen: Für Stufe L braucht man insgesamt 40·(L−1)·L XP (Stufe 2: 80, 5: 800, 10: 3600)
export const xpForLevel = (L) => 40 * (L - 1) * L;
export function levelOf(xp) {
  let L = 1;
  while (xpForLevel(L + 1) <= xp) L++;
  return L;
}

// XP für ein Match aus den eigenen Werten
export const XP = {
  played: 30, round: 5, roundWin: 15, ko: 4, counter: 5, break: 4, save: 3, pups: 2, award: 15,
  place: [60, 35, 20],
};
export function matchXP({ rounds, stats, place, awards }) {
  const parts = [
    ['Mitgespielt', XP.played],
    ['Runden', rounds * XP.round],
    ['Rundensiege', (stats.wins || 0) * XP.roundWin],
    ['Rauswürfe', (stats.ko || 0) * XP.ko],
    ['Konter & Durchbrüche', (stats.counters || 0) * XP.counter + (stats.breaks || 0) * XP.break],
    ['Rettungen', (stats.saves || 0) * XP.save],
    ['Pups-Treffer', (stats.pups || 0) * XP.pups],
    ['Platzierung', XP.place[place] || 0],
    ['Auszeichnungen', awards * XP.award],
  ].filter(([, v]) => v > 0);
  return { total: parts.reduce((a, [, v]) => a + v, 0), parts };
}
