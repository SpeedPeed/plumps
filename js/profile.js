// Lokales Profil: XP, Stufe, Statistik und was man trägt. Liegt nur im Browser
// (localStorage), ohne Konto. Wer es manipuliert, schummelt sich nur Hüte.
import { levelOf, levelFor, matchXP, UNLOCKS, TRAILS, DANCES } from './cosmetics.js';

const KEY = 'plumps-profile';
const EMPTY = {
  v: 1, xp: 0,
  stats: { matches: 0, champion: 0, podium: 0, rounds: 0, roundWins: 0, ko: 0, counters: 0, breaks: 0, saves: 0, falls: 0, pups: 0 },
  trail: 0, dance: 0,
  lastMatch: null,
};

function load() {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (p && p.v === 1) return { ...EMPTY, ...p, stats: { ...EMPTY.stats, ...p.stats } };
  } catch { /* kaputt oder gesperrt: neu anfangen */ }
  return structuredClone(EMPTY);
}

export const profile = load();
export const save = () => { try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* egal */ } };

export const level = () => levelOf(profile.xp);
export const owns = (kind, i) => levelFor(kind, i) <= level();

// Getragenes nur, solange es freigeschaltet ist
export function equipped() {
  return {
    tr: owns('trail', profile.trail) && profile.trail < TRAILS.length ? profile.trail : 0,
    dc: owns('dance', profile.dance) && profile.dance < DANCES.length ? profile.dance : 0,
  };
}

// Ein Match verbuchen (nur einmal pro Match). Gibt XP-Aufschlüsselung, alte/neue Stufe
// und neu Freigeschaltetes zurück – oder null, wenn das Match schon gezählt wurde.
export function recordMatch(key, { rounds, stats, place, awards, champion }) {
  if (profile.lastMatch === key) return null;
  profile.lastMatch = key;
  const before = level();
  const xp = matchXP({ rounds, stats, place, awards });
  profile.xp += xp.total;
  const s = profile.stats;
  s.matches++;
  if (champion) s.champion++;
  if (place <= 2) s.podium++;
  s.rounds += rounds;
  s.roundWins += stats.wins || 0;
  for (const k of ['ko', 'counters', 'breaks', 'saves', 'falls', 'pups']) s[k] += stats[k] || 0;
  save();
  const after = level();
  const unlocked = UNLOCKS.filter(u => u.lv > before && u.lv <= after);
  return { xp, before, after, unlocked };
}
