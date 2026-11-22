// Composition indicative des ingrédients, en g pour 100 g.
// Clés : water (eau), sugars (sucres & polyols), cb (beurre de cacao),
// mf (matière grasse laitière), of (autres matières grasses),
// cs (solides de cacao dégraissés), os (autres solides secs), alc (alcool).
// Valeurs moyennes de fiches techniques : à ajuster selon tes produits.

export const COMPONENTS = [
  { key: 'water',  label: 'Eau',                 color: '#7fb3c8' },
  { key: 'sugars', label: 'Sucres',              color: '#e9c46a' },
  { key: 'cb',     label: 'Beurre de cacao',     color: '#a0673d' },
  { key: 'mf',     label: 'MG laitière',         color: '#f1dca7' },
  { key: 'of',     label: 'Autres MG',           color: '#c9a66b' },
  { key: 'cs',     label: 'Solides de cacao',    color: '#4a2a1a' },
  { key: 'os',     label: 'Autres solides',      color: '#b8a99a' },
  { key: 'alc',    label: 'Alcool',              color: '#c77d9b' },
];

const c = (o) => ({ water: 0, sugars: 0, cb: 0, mf: 0, of: 0, cs: 0, os: 0, alc: 0, ...o });

export const INGREDIENTS = [
  { id: 'noir70',   name: 'Chocolat noir 70 %',        group: 'Chocolats', comp: c({ sugars: 29, cb: 41, cs: 29, water: 1 }) },
  { id: 'noir64',   name: 'Chocolat noir 64 %',        group: 'Chocolats', comp: c({ sugars: 35, cb: 38, cs: 26, water: 1 }) },
  { id: 'lait35',   name: 'Chocolat au lait 35 %',     group: 'Chocolats', comp: c({ sugars: 44, cb: 26, mf: 7, cs: 8, os: 14, water: 1 }) },
  { id: 'blanc',    name: 'Chocolat blanc',            group: 'Chocolats', comp: c({ sugars: 45, cb: 30, mf: 6, os: 18, water: 1 }) },
  { id: 'pate',     name: 'Pâte de cacao 100 %',       group: 'Chocolats', comp: c({ cb: 54, cs: 45, water: 1 }) },
  { id: 'beurrecc', name: 'Beurre de cacao',           group: 'Chocolats', comp: c({ cb: 100 }) },

  { id: 'creme35',  name: 'Crème 35 %',                group: 'Laitiers',  comp: c({ water: 58.7, mf: 35, sugars: 3, os: 3.3 }) },
  { id: 'creme30',  name: 'Crème 30 %',                group: 'Laitiers',  comp: c({ water: 63.5, mf: 30, sugars: 3.2, os: 3.3 }) },
  { id: 'lait',     name: 'Lait entier',               group: 'Laitiers',  comp: c({ water: 87.5, mf: 3.6, sugars: 4.8, os: 4.1 }) },
  { id: 'beurre',   name: 'Beurre doux 82 %',          group: 'Laitiers',  comp: c({ water: 16, mf: 82, os: 2 }) },
  { id: 'lcs',      name: 'Lait concentré sucré',      group: 'Laitiers',  comp: c({ water: 27, sugars: 54, mf: 8, os: 11 }) },

  { id: 'sucre',    name: 'Sucre semoule',             group: 'Sucres',    comp: c({ sugars: 100 }) },
  { id: 'glucose',  name: 'Sirop de glucose DE 40',    group: 'Sucres',    comp: c({ water: 20, sugars: 80 }) },
  { id: 'inverti',  name: 'Sucre inverti',             group: 'Sucres',    comp: c({ water: 20, sugars: 80 }) },
  { id: 'dextrose', name: 'Dextrose',                  group: 'Sucres',    comp: c({ water: 8, sugars: 92 }) },
  { id: 'sorbitol', name: 'Sorbitol poudre',           group: 'Sucres',    comp: c({ sugars: 100 }) },
  { id: 'miel',     name: 'Miel',                      group: 'Sucres',    comp: c({ water: 18, sugars: 81, os: 1 }) },

  { id: 'framboise',name: 'Purée de framboise',        group: 'Fruits',    comp: c({ water: 87, sugars: 6, os: 7 }) },
  { id: 'passion',  name: 'Purée de passion',          group: 'Fruits',    comp: c({ water: 82, sugars: 11, os: 7 }) },
  { id: 'praline',  name: 'Praliné noisette 50 %',     group: 'Fruits secs', comp: c({ sugars: 50, of: 31, os: 18, water: 1 }) },
  { id: 'noisette', name: 'Pâte de noisette 100 %',    group: 'Fruits secs', comp: c({ sugars: 4, of: 61, os: 35 }) },

  { id: 'rhum',     name: 'Rhum 40 % vol.',            group: 'Divers',    comp: c({ water: 66, alc: 34 }) },
  { id: 'eau',      name: 'Eau',                       group: 'Divers',    comp: c({ water: 100 }) },
];

// Repères indicatifs (% de la masse totale). min/max = zone de confort.
// Inspirés des grilles d'équilibrage utilisées en pâtisserie/chocolaterie.
export const PROFILES = {
  bonbon: {
    label: 'Ganache à cadrer (bonbon)',
    hint: 'Ferme, longue conservation, se coupe net.',
    targets: { water: [14, 22], sugars: [24, 34], fat: [28, 38], solids: [10, 20] },
  },
  tarte: {
    label: 'Ganache tarte / entremets',
    hint: 'Souple et fondante, se tient à température ambiante.',
    targets: { water: [20, 30], sugars: [18, 28], fat: [28, 36], solids: [8, 16] },
  },
  montee: {
    label: 'Ganache montée',
    hint: 'Riche en crème, foisonnée après 12 h au froid.',
    targets: { water: [40, 55], sugars: [10, 20], fat: [26, 36], solids: [4, 12] },
  },
};

export const CRITERIA = [
  { key: 'water',  label: 'Eau',                  desc: 'Conditionne la texture et la conservation.' },
  { key: 'sugars', label: 'Sucres',               desc: 'Abaissent l’activité de l’eau, apportent le corps.' },
  { key: 'fat',    label: 'Matières grasses',     desc: 'Cacao + lait + autres : la tenue et le fondant.' },
  { key: 'solids', label: 'Solides secs',         desc: 'Cacao dégraissé et protéines : épaississent l’émulsion.' },
];

export const PRESETS = {
  classique: {
    name: 'Ganache noire classique',
    profile: 'bonbon',
    items: [['noir70', 300], ['creme35', 250], ['inverti', 40], ['beurre', 40]],
  },
  framboise: {
    name: 'Ganache framboise',
    profile: 'bonbon',
    items: [['noir64', 280], ['framboise', 180], ['glucose', 50], ['beurre', 30], ['sucre', 20]],
  },
  montee: {
    name: 'Montée chocolat au lait',
    profile: 'montee',
    items: [['lait35', 180], ['creme35', 500], ['glucose', 20], ['inverti', 20]],
  },
  praline: {
    name: 'Ganache praliné',
    profile: 'tarte',
    items: [['lait35', 200], ['praline', 150], ['creme35', 220], ['beurre', 25]],
  },
};
