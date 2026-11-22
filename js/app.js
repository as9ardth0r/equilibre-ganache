import { INGREDIENTS, PROFILES, PRESETS, COMPONENTS, CRITERIA } from './data.js';
import { getIngredient, diagnose, balance, scaleTo, totalMass, encode, decode } from './engine.js';

const $ = (sel) => document.querySelector(sel);
const fmt = (n, d = 1) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const COLOR = Object.fromEntries(COMPONENTS.map((c) => [c.key, c.color]));

// ---------- État ----------
const fromPreset = (key) => ({
  profile: PRESETS[key].profile,
  items: PRESETS[key].items.map(([id, grams]) => ({ id, grams })),
  locked: new Set(),
});
let state = (() => {
  const shared = decode(location.hash.slice(1));
  return shared ? { ...shared, locked: new Set() } : fromPreset('classique');
})();

// ---------- Rendu de la recette ----------
function dominantColor(ing) {
  const [k] = Object.entries(ing.comp).sort((a, b) => b[1] - a[1])[0];
  return COLOR[k];
}

function renderControls() {
  $('#profile').innerHTML = Object.entries(PROFILES)
    .map(([k, p]) => `<option value="${k}">${p.label}</option>`).join('');
  $('#presets').innerHTML = '<span class="label" style="align-self:center">Exemples</span>' +
    Object.entries(PRESETS).map(([k, p]) => `<button class="chip" data-preset="${k}" type="button">${p.name}</button>`).join('');

  const groups = [...new Set(INGREDIENTS.map((i) => i.group))];
  $('#add-select').innerHTML = groups.map((g) =>
    `<optgroup label="${g}">${INGREDIENTS.filter((i) => i.group === g)
      .map((i) => `<option value="${i.id}">${i.name}</option>`).join('')}</optgroup>`).join('');
}

function renderIngredients() {
  $('#profile').value = state.profile;
  $('#profile-hint').textContent = PROFILES[state.profile].hint;
  $('#ingredients').innerHTML = state.items.map((it, idx) => {
    const ing = getIngredient(it.id);
    const locked = state.locked.has(it.id);
    const max = Math.max(500, Math.ceil((it.grams * 2) / 50) * 50);
    return `<li class="ing${locked ? ' locked' : ''}" data-idx="${idx}">
      <span class="swatch" style="background:${dominantColor(ing)}"></span>
      <span class="name">${ing.name}<small>${ing.group}</small></span>
      <span class="grams"><input type="number" min="0" step="1" value="${it.grams}" aria-label="Grammes de ${ing.name}" data-role="grams"> g</span>
      <button class="icon-btn" data-role="lock" aria-pressed="${locked}" title="${locked ? 'Déverrouiller' : 'Verrouiller'}" type="button">${locked ? '🔒' : '🔓'}</button>
      <button class="icon-btn" data-role="remove" title="Retirer" aria-label="Retirer ${ing.name}" type="button">✕</button>
      <input type="range" min="0" max="${max}" step="1" value="${it.grams}" data-role="slider" aria-label="Curseur ${ing.name}">
      <span class="delta" data-role="delta"></span>
    </li>`;
  }).join('');
}

// ---------- Rendu de l'analyse ----------
const ADVICE = {
  water:  { high: 'Trop d’eau : réduis la crème ou la purée, ou augmente le chocolat.', low: 'Manque d’eau : la ganache risque d’être cassante, ajoute un peu de crème.' },
  sugars: { high: 'Trop sucrée : prends un chocolat plus corsé ou réduis les sirops.', low: 'Sucres bas : remplace un peu de crème par du sucre inverti ou du glucose (meilleure conservation).' },
  fat:    { high: 'Trop grasse : risque de suintement ou de grain, réduis le beurre.', low: 'Pas assez de gras : ajoute du chocolat ou un peu de beurre de cacao.' },
  solids: { high: 'Trop de solides : texture pâteuse, allège en chocolat ou en praliné.', low: 'Solides bas : ajoute du chocolat pour donner du corps.' },
};

function verdictTitle(score) {
  if (score >= 95) return 'Parfaitement équilibrée';
  if (score >= 80) return 'Presque — quelques retouches';
  if (score >= 60) return 'À retravailler';
  return 'Déséquilibrée';
}

function renderAnalysis() {
  const d = diagnose(state.items, state.profile);
  $('#total').textContent = `${Math.round(d.total).toLocaleString('fr-FR')} g`;

  // Score
  $('#score').textContent = d.total ? d.score : '—';
  const ring = $('#ring-fg');
  ring.style.strokeDashoffset = 326.7 * (1 - d.score / 100);
  ring.style.stroke = d.score >= 80 ? 'var(--ok)' : d.score >= 60 ? 'var(--gold)' : 'var(--warn)';
  $('#verdict-title').textContent = d.total ? verdictTitle(d.score) : 'Ajoute des ingrédients';
  const tips = d.criteria.filter((c) => !c.ok).map((c) => ADVICE[c.key][c.gap > 0 ? 'high' : 'low']);
  if (state.profile !== 'montee' && d.extras.milkFatShare > 40) tips.push('Beaucoup de MG laitière par rapport au beurre de cacao : texture plus molle.');
  if (!tips.length && d.total) tips.push('Toutes les valeurs sont dans la zone de confort. Belle émulsion en vue.');
  $('#advice').innerHTML = tips.map((t) => `<li>${t}</li>`).join('');

  // Barre de composition
  const parts = COMPONENTS.filter((c) => d.pct[c.key] > 0.05);
  $('#stack').innerHTML = parts.map((c) =>
    `<div style="flex-grow:${d.pct[c.key]};background:${c.color}" title="${c.label} : ${fmt(d.pct[c.key])} %"></div>`).join('');
  $('#legend').innerHTML = parts.map((c) =>
    `<li><i style="background:${c.color}"></i>${c.label}<b>${fmt(d.pct[c.key])} %</b></li>`).join('');

  // Jauges : échelle 0 → max(60, valeur)
  const scaleMax = Math.max(60, ...d.criteria.map((c) => Math.ceil(c.value / 10) * 10));
  $('#gauges').innerHTML = d.criteria.map((c) => {
    const meta = CRITERIA.find((m) => m.key === c.key);
    const pos = (v) => `${Math.min(100, (100 * v) / scaleMax)}%`;
    return `<div class="gauge" title="${meta.desc}">
      <div class="gauge-head"><span>${meta.label} <small>${c.min}–${c.max} %</small></span>
        <b class="${c.ok ? 'good' : 'bad'}">${fmt(c.value)} %${c.ok ? '' : ` (${c.gap > 0 ? '+' : ''}${fmt(c.gap)})`}</b></div>
      <div class="track"><span class="band" style="left:${pos(c.min)};width:calc(${pos(c.max)} - ${pos(c.min)})"></span>
        <span class="mark" style="left:${pos(c.value)}"></span></div>
    </div>`;
  }).join('');

  const e = d.extras;
  $('#extras').innerHTML = `
    <div><dt>MG laitière / MG totale</dt><dd>${fmt(e.milkFatShare, 0)} %<small>tenue : plus c'est bas, plus c'est ferme</small></dd></div>
    <div><dt>Sucres / eau</dt><dd>${fmt(e.sugarWater, 2)}<small>au-delà de 1,2 : bonne conservation</small></dd></div>
    <div><dt>Eau / matières grasses</dt><dd>${fmt(e.waterFat, 2)}<small>équilibre de l'émulsion</small></dd></div>
    <div><dt>Alcool</dt><dd>${fmt(e.alcohol)} %<small>conservateur & arôme</small></dd></div>`;

  history.replaceState(null, '', `#${encode(state)}`);
}

const render = () => { renderIngredients(); renderAnalysis(); };

// ---------- Interactions ----------
function setGrams(idx, grams, { syncInputs = true } = {}) {
  state.items[idx].grams = Math.max(0, Math.round(Number(grams) || 0));
  if (syncInputs) {
    const li = document.querySelector(`.ing[data-idx="${idx}"]`);
    li.querySelector('[data-role=grams]').value = state.items[idx].grams;
    const slider = li.querySelector('[data-role=slider]');
    if (state.items[idx].grams > Number(slider.max)) slider.max = state.items[idx].grams * 2;
    slider.value = state.items[idx].grams;
  }
  renderAnalysis();
}

$('#ingredients').addEventListener('input', (e) => {
  const li = e.target.closest('.ing'); if (!li) return;
  const idx = Number(li.dataset.idx);
  if (e.target.dataset.role === 'slider' || e.target.dataset.role === 'grams') setGrams(idx, e.target.value);
});

$('#ingredients').addEventListener('click', (e) => {
  const btn = e.target.closest('button'); if (!btn) return;
  const idx = Number(btn.closest('.ing').dataset.idx);
  const id = state.items[idx].id;
  if (btn.dataset.role === 'remove') { state.items.splice(idx, 1); state.locked.delete(id); }
  if (btn.dataset.role === 'lock') state.locked.has(id) ? state.locked.delete(id) : state.locked.add(id);
  render();
});

$('#add-btn').addEventListener('click', () => {
  const id = $('#add-select').value;
  const existing = state.items.find((it) => it.id === id);
  if (existing) { toast('Déjà dans la recette'); return; }
  state.items.push({ id, grams: 50 });
  render();
});

$('#profile').addEventListener('change', (e) => { state.profile = e.target.value; render(); });

$('#presets').addEventListener('click', (e) => {
  const k = e.target.dataset?.preset; if (!k) return;
  state = fromPreset(k); render();
});

$('#scale-btn').addEventListener('click', () => {
  const target = Number($('#scale-input').value);
  if (!(target > 0)) return toast('Indique une masse cible');
  state.items = scaleTo(state.items, target); render();
});

// Équilibrage animé : les grammes glissent vers la solution
$('#balance-btn').addEventListener('click', () => {
  if (!totalMass(state.items)) return toast('Ajoute d’abord des ingrédients');
  if (state.locked.size === state.items.length) return toast('Tout est verrouillé : rien à ajuster');
  const before = diagnose(state.items, state.profile).score;
  const from = state.items.map((it) => it.grams);
  const target = balance(state.items, state.profile, { locked: state.locked }).map((it) => it.grams);
  const t0 = performance.now(), dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 750;
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  const step = (now) => {
    const t = dur ? Math.min(1, (now - t0) / dur) : 1;
    state.items.forEach((it, i) => { it.grams = Math.round(from[i] + (target[i] - from[i]) * ease(t)); });
    state.items.forEach((_, i) => setGrams(i, state.items[i].grams));
    if (t < 1) return requestAnimationFrame(step);
    // Affiche les écarts
    document.querySelectorAll('.ing').forEach((li, i) => {
      const diff = target[i] - from[i];
      const el = li.querySelector('[data-role=delta]');
      if (diff) { el.textContent = `${diff > 0 ? '+' : '−'}${Math.abs(diff)} g`; el.className = `delta ${diff > 0 ? 'up' : 'down'}`; }
      setTimeout(() => { el.style.opacity = 0; }, 3500);
    });
    const after = diagnose(state.items, state.profile).score;
    toast(after > before ? `Score ${before} → ${after}` : 'Déjà au mieux avec ces ingrédients');
  };
  requestAnimationFrame(step);
});

$('#share-btn').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); toast('Lien copié : la recette est dedans'); }
  catch { toast('Copie impossible : utilise l’URL de la barre d’adresse'); }
});
$('#print-btn').addEventListener('click', () => window.print());

let toastTimer;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

renderControls();
render();
