// Zufallsgenerator mit Startwert (mulberry32). Gleicher Startwert + gleiche
// Eingaben = gleiches Spiel. Die Simulation benutzt nur diesen, nie Math.random().

export class Rng {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.s = this.seed;
  }

  next() {
    let t = (this.s = (this.s + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(a, b) { return a + this.next() * (b - a); }
  int(n) { return Math.floor(this.next() * n); }
  pick(arr) { return arr[this.int(arr.length)]; }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// Leitet aus einem Match-Startwert einen eigenen Startwert pro Runde ab
export function deriveSeed(seed, n) {
  let h = (seed ^ Math.imul(n + 1, 0x9E3779B1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export const randomSeed = () => Math.floor(Math.random() * 4294967296) >>> 0;
