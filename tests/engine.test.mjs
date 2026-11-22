import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INGREDIENTS, PRESETS } from '../js/data.js';
import { compose, diagnose, balance, projectSimplex, scaleTo, encode, decode, totalMass } from '../js/engine.js';

const preset = (k) => PRESETS[k].items.map(([id, grams]) => ({ id, grams }));

test('chaque ingrédient totalise ~100 g pour 100 g', () => {
  for (const ing of INGREDIENTS) {
    const sum = Object.values(ing.comp).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 100) < 0.5, `${ing.name} = ${sum}`);
  }
});

test('la composition conserve la masse', () => {
  const { total, grams } = compose(preset('classique'));
  const sum = Object.values(grams).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - total) < 0.5);
});

test('projection sur le simplexe : positive et de somme exacte', () => {
  const p = projectSimplex([5, -2, 10, 0.3], 8);
  assert.ok(p.every((x) => x >= 0));
  assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 8) < 1e-9);
});

test('équilibrage : score amélioré, masse constante, verrous respectés', () => {
  // Recette volontairement déséquilibrée : beaucoup trop de crème pour un bonbon
  const items = [{ id: 'noir70', grams: 200 }, { id: 'creme35', grams: 400 }, { id: 'inverti', grams: 10 }];
  const before = diagnose(items, 'bonbon');
  const out = balance(items, 'bonbon', { locked: new Set(['noir70']) });
  const after = diagnose(out, 'bonbon');
  assert.ok(after.score > before.score, `${before.score} -> ${after.score}`);
  assert.equal(totalMass(out), totalMass(items));
  assert.equal(out.find((i) => i.id === 'noir70').grams, 200);
  assert.ok(out.every((i) => i.grams >= 0));
});

test('mise à l\'échelle', () => {
  const out = scaleTo(preset('classique'), 1000);
  assert.ok(Math.abs(totalMass(out) - 1000) <= 2);
});

test('partage URL aller-retour', () => {
  const state = { profile: 'tarte', items: preset('praline') };
  assert.deepEqual(decode(encode(state)), state);
  assert.equal(decode('n_importe|quoi'), null);
});
