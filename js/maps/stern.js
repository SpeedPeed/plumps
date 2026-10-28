const TAU = Math.PI * 2;

export default {
  id: 'stern', name: 'Seestern',
  shapes: [
    { k: 'c', x: 0, y: 0, r: 150 },
    ...[0, 1, 2, 3, 4].map(i => {
      const a = i / 5 * TAU - Math.PI / 2;
      return { k: 'r', x: Math.cos(a) * 180, y: Math.sin(a) * 180, w: 250, h: 130, a };
    }),
  ],
};
