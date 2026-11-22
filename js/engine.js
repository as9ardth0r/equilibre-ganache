// Moteur de calcul pur (sans DOM) : composition, diagnostic, équilibrage.
// Testé par tests/engine.test.mjs (node --test).

import { INGREDIENTS, PROFILES, COMPONENTS } from './data.js';

const BY_ID = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));
export const getIngredient = (id) => BY_ID[id];

/** Masse totale d'une recette [{id, grams}] */
export const totalMass = (items) => items.reduce((s, it) => s + Math.max(0, it.grams), 0);

/** Composition en grammes et en % pour chaque composant élémentaire. */
export function compose(items) {
  const grams = Object.fromEntries(COMPONENTS.map((c) => [c.key, 0]));
  for (const it of items) {
    const ing = BY_ID[it.id];
    if (!ing || it.grams <= 0) continue;
    for (const k in grams) grams[k] += (ing.comp[k] * it.grams) / 100;
  }
  const total = totalMass(items);
  const pct = Object.fromEntries(Object.entries(grams).map(([k, v]) => [k, total ? (100 * v) / total : 0]));
  return { total, grams, pct };
}

/** Regroupe les composants selon les critères d'équilibrage. */
export function aggregate(pct) {
  return {
    water: pct.water,
    sugars: pct.sugars,
    fat: pct.cb + pct.mf + pct.of,
    solids: pct.cs + pct.os,
  };
}

// Ligne de la matrice d'agrégation pour un ingrédient (fraction 0..1)
function aggRow(ing) {
  const a = aggregate(ing.comp);
  return [a.water / 100, a.sugars / 100, a.fat / 100, a.solids / 100];
}
const CRIT_KEYS = ['water', 'sugars', 'fat', 'solids'];

/** Diagnostic : écart à la zone cible pour chaque critère + score global 0–100. */
export function diagnose(items, profileKey) {
  const profile = PROFILES[profileKey];
  const { pct, total } = compose(items);
  const agg = aggregate(pct);
  const criteria = CRIT_KEYS.map((key) => {
    const [min, max] = profile.targets[key];
    const value = agg[key];
    const gap = value < min ? value - min : value > max ? value - max : 0;
    return { key, value, min, max, gap, ok: gap === 0 };
  });
  // Pénalité douce : 4 points de score par point d'écart, plafonnée.
  const penalty = criteria.reduce((s, c) => s + Math.min(25, Math.abs(c.gap) * 4), 0);
  const score = total ? Math.max(0, Math.round(100 - penalty)) : 0;

  // Indicateurs complémentaires de chocolatier
  const fat = agg.fat || 1e-9;
  const extras = {
    milkFatShare: (100 * pct.mf) / fat,              // part de MG laitière dans les MG
    sugarWater: pct.water ? pct.sugars / pct.water : 0, // pouvoir de « liaison » de l'eau
    waterFat: agg.fat ? pct.water / agg.fat : 0,        // rapport phase aqueuse / phase grasse
    alcohol: pct.alc,
  };
  return { total, pct, agg, criteria, score, extras };
}

/** Projection euclidienne sur { x ≥ 0, Σx = s } (Duchi et al. 2008). */
export function projectSimplex(v, s) {
  if (v.length === 0) return [];
  if (s <= 0) return v.map(() => 0);
  const u = [...v].sort((a, b) => b - a);
  let css = 0, rho = -1, theta = 0;
  for (let i = 0; i < u.length; i++) {
    css += u[i];
    const t = (css - s) / (i + 1);
    if (u[i] - t > 0) { rho = i; theta = t; }
  }
  return v.map((x) => Math.max(0, x - theta));
}

/**
 * Équilibrage automatique.
 * Ajuste les grammes des ingrédients non verrouillés pour ramener chaque
 * critère dans sa zone cible, à masse totale constante, en restant proche
 * de la recette de départ (régularisation). Descente de gradient projetée.
 */
export function balance(items, profileKey, { locked = new Set(), iterations = 4000, stickiness = 0.02 } = {}) {
  const profile = PROFILES[profileKey];
  const T = totalMass(items);
  if (!T) return items;

  const free = items.map((it, i) => (!locked.has(it.id) ? i : -1)).filter((i) => i >= 0);
  if (free.length === 0) return items;

  const rows = items.map((it) => aggRow(BY_ID[it.id]));
  const lockedMass = items.reduce((s, it, i) => (free.includes(i) ? s : s + it.grams), 0);
  const budget = T - lockedMass;
  const g0 = items.map((it) => it.grams);
  let g = [...g0];

  const mid = CRIT_KEYS.map((k) => (profile.targets[k][0] + profile.targets[k][1]) / 2);
  const lo = CRIT_KEYS.map((k) => profile.targets[k][0]);
  const hi = CRIT_KEYS.map((k) => profile.targets[k][1]);

  // Pas = 1 / constante de Lipschitz du gradient
  const scale = 100 / T;
  let frob = 0;
  for (const i of free) for (const a of rows[i]) frob += a * a;
  const L = 2 * scale * scale * frob * 1.05 + (2 * stickiness * scale * scale);
  const lr = 1 / L;

  for (let it = 0; it < iterations; it++) {
    // pourcentages courants par critère
    const p = [0, 0, 0, 0];
    for (let i = 0; i < g.length; i++) for (let k = 0; k < 4; k++) p[k] += rows[i][k] * g[i];
    for (let k = 0; k < 4; k++) p[k] *= scale;

    // résidu : écart hors zone + petite attraction vers le centre de la zone
    const r = p.map((v, k) => {
      const out = v < lo[k] ? v - lo[k] : v > hi[k] ? v - hi[k] : 0;
      return out + 0.08 * (v - mid[k]);
    });

    const grad = free.map((i) => {
      let d = 0;
      for (let k = 0; k < 4; k++) d += 2 * r[k] * scale * rows[i][k];
      d += 2 * stickiness * scale * scale * (g[i] - g0[i]);
      return d;
    });

    const proposal = free.map((i, j) => g[i] - lr * grad[j]);
    const projected = projectSimplex(proposal, budget);
    let moved = 0;
    free.forEach((i, j) => { moved += Math.abs(projected[j] - g[i]); g[i] = projected[j]; });
    if (moved < 1e-6) break;
  }

  // Arrondi au gramme en conservant la masse totale
  const rounded = g.map((x, i) => (free.includes(i) ? Math.round(x) : g0[i]));
  const drift = T - rounded.reduce((s, x) => s + x, 0);
  if (drift !== 0) {
    const biggest = free.reduce((a, b) => (rounded[a] >= rounded[b] ? a : b));
    rounded[biggest] += drift;
  }
  return items.map((it, i) => ({ ...it, grams: rounded[i] }));
}

/** Mise à l'échelle vers une masse cible. */
export function scaleTo(items, target) {
  const T = totalMass(items);
  if (!T) return items;
  return items.map((it) => ({ ...it, grams: Math.round((it.grams * target) / T) }));
}

/** Encodage compact pour partage par URL : profil|id:g,id:g */
export function encode(state) {
  return `${state.profile}|${state.items.map((it) => `${it.id}:${it.grams}`).join(',')}`;
}
export function decode(str) {
  try {
    const [profile, list] = decodeURIComponent(str).split('|');
    if (!PROFILES[profile] || !list) return null;
    const items = list.split(',').map((p) => {
      const [id, g] = p.split(':');
      return { id, grams: Number(g) };
    }).filter((it) => BY_ID[it.id] && Number.isFinite(it.grams) && it.grams >= 0);
    return items.length ? { profile, items } : null;
  } catch { return null; }
}
