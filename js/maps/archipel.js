const TAU = Math.PI * 2;
const ring = (n, dist, r) => Array.from({ length: n }, (_, i) => ({ k: 'c', x: Math.cos(i / n * TAU) * dist, y: Math.sin(i / n * TAU) * dist, r }));

export default {
  id: 'archipel', name: 'Archipel', emoji: '🏖️',
  shapes: [{ k: 'c', x: 0, y: 0, r: 150 }, ...ring(6, 205, 100)],
};
