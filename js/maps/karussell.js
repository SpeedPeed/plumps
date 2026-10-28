const TAU = Math.PI * 2;

export default {
  id: 'karussell', name: 'Karussell', emoji: '🎠', moving: true,
  shapes: [
    { k: 'c', x: 0, y: 0, r: 170 },
    ...[0, 1, 2].map(i => ({ k: 'c', r: 100, orbit: { r: 220, s: 0.35, ph: i * TAU / 3 } })),
  ],
};
