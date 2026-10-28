export default {
  id: 'swap', name: 'Tauschticket', emoji: '🔄', desc: 'Platztausch mit einem zufälligen Gegner!',
  apply(g, p, alive) {
    const others = alive.filter(q => q !== p && q.state === 'alive');
    if (!others.length) return;
    const q = g.rng.pick(others);
    [p.x, q.x] = [q.x, p.x];
    [p.y, q.y] = [q.y, p.y];
    g.emit({ k: 'swap' });
  },
};
