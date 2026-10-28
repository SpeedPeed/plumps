export default {
  id: 'spiegel', name: 'Spiegelwelt', desc: 'Die Steuerung ist vertauscht.',
  perk: 'Wer wählt, steuert ganz normal.', perkFor: 'picker',
  input: (g, p, inp) => (p.id === g.cardOwner ? inp : { mx: -inp.mx, my: -inp.my }),
  // Bots fallen (meistens) nicht auf die Spiegelwelt rein
  botAdjust(g, p, ctx) {
    if (p.id !== g.cardOwner && p.state === 'alive' && g.rng.next() < ctx.level.care) ctx.invert = true;
  },
};
