export default {
  id: 'kreuz', name: 'Drehkreuz', moving: true,
  angle: (t) => t * 0.25,
  shapes: [{ k: 'r', x: 0, y: 0, w: 600, h: 200 }, { k: 'r', x: 0, y: 0, w: 200, h: 600 }, { k: 'c', x: 0, y: 0, r: 160 }],
};
