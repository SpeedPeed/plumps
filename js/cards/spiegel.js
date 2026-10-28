export default {
  id: 'spiegel', name: 'Spiegelwelt', emoji: '🪞', desc: 'Steuerung vertauscht – außer für den, der die Karte gezogen hat.',
  input: (g, p, inp) => (p.id === g.cardOwner ? inp : { mx: -inp.mx, my: -inp.my }),
  // Bots fallen (meistens) nicht auf die Spiegelwelt rein
  botAdjust(g, p, ctx) {
    if (p.id !== g.cardOwner && p.state === 'alive' && g.rng.next() < ctx.level.care) ctx.invert = true;
  },
};
