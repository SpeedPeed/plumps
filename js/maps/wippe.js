export default {
  id: 'wippe', name: 'Wippe', emoji: '⚖️', moving: true,
  angle: (t) => Math.sin(t * 0.7) * 0.8,
  shapes: [{ k: 'r', x: 0, y: 0, w: 600, h: 240 }],
};
