// crystals.js
// Kristal yapi tanimlari, atom konumlari ve fiziksel buyuklukler.
// Tum konumlar goruntuleme icin birim hucre olceginde verilir.
// Kubikler: kenar a = 1 birim kup. HSP: altigen prizma.

const SQRT3 = Math.sqrt(3);
const SQRT2 = Math.sqrt(2);

// Kosedeki bir atomun tekrarini saglamak icin yardimci: 0 olan eksenlerde 0 ve 1 uretir.
function expandCorners() {
  const pts = [];
  for (let x = 0; x <= 1; x++)
    for (let y = 0; y <= 1; y++)
      for (let z = 0; z <= 1; z++) pts.push([x, y, z]);
  return pts;
}

// --- KUBIK YAPILAR ---------------------------------------------------------

function cubicAtoms(type) {
  const atoms = expandCorners().map((p) => ({ pos: p, kind: 'corner' }));
  if (type === 'BCC') {
    atoms.push({ pos: [0.5, 0.5, 0.5], kind: 'center' });
  }
  if (type === 'FCC') {
    const faces = [
      [0.5, 0.5, 0], [0.5, 0.5, 1],
      [0.5, 0, 0.5], [0.5, 1, 0.5],
      [0, 0.5, 0.5], [1, 0.5, 0.5],
    ];
    faces.forEach((p) => atoms.push({ pos: p, kind: 'face' }));
  }
  return atoms;
}

// --- HSP (HCP) -------------------------------------------------------------
// Altigen prizma: a = kose-merkez mesafesi = 1 birim. c = 1.633.
// 12 kose + 2 taban/tavan merkez + 3 ic atom.

const HCP_CA = 1.633; // ideal c/a

function hcpAtoms() {
  const atoms = [];
  const corners = [];
  for (let k = 0; k < 6; k++) {
    const ang = (Math.PI / 3) * k; // 60 derece adimlar
    corners.push([Math.cos(ang), Math.sin(ang)]);
  }
  // Alt ve ust altigen koseleri
  for (let zi = 0; zi <= 1; zi++) {
    const z = zi * HCP_CA;
    corners.forEach((c) => atoms.push({ pos: [c[0], c[1], z], kind: 'corner' }));
    atoms.push({ pos: [0, 0, z], kind: 'face' }); // taban/tavan merkezi
  }
  // 3 ic atom: alternatif ucgenlerin agirlik merkezi, z = c/2
  for (let k = 0; k < 6; k += 2) {
    const c0 = corners[k];
    const c1 = corners[(k + 1) % 6];
    const cx = (c0[0] + c1[0] + 0) / 3;
    const cy = (c0[1] + c1[1] + 0) / 3;
    atoms.push({ pos: [cx, cy, HCP_CA / 2], kind: 'inner' });
  }
  return atoms;
}

// --- YAPI KATALOGU ---------------------------------------------------------

export const STRUCTURES = {
  BK: {
    id: 'BK',
    label: 'Basit Kübik (BK / SC)',
    system: 'cubic',
    atoms: cubicAtoms('SC'),
    a: 1,
    // Gercek buyuklukler (r cinsinden):  a = 2r
    aOverR: 2,
    cOverA: null,
    atomsPerCell: 1,
    coordination: 6,
    apf: Math.PI / 6, // 0.5236
    touchRadius: 0.5, // a birimi cinsinden temas yaricapi (a=2r -> r=0.5a)
    example: 'Po',
  },
  HMK: {
    id: 'HMK',
    label: 'Hacim Merkezli Kübik (HMK / BCC)',
    system: 'cubic',
    atoms: cubicAtoms('BCC'),
    a: 1,
    aOverR: 4 / SQRT3,
    cOverA: null,
    atomsPerCell: 2,
    coordination: 8,
    apf: (SQRT3 * Math.PI) / 8, // 0.6802
    touchRadius: SQRT3 / 4, // 0.4330
    example: 'Fe(α), Cr, W',
  },
  YMK: {
    id: 'YMK',
    label: 'Yüzey Merkezli Kübik (YMK / FCC)',
    system: 'cubic',
    atoms: cubicAtoms('FCC'),
    a: 1,
    aOverR: 2 * SQRT2,
    cOverA: null,
    atomsPerCell: 4,
    coordination: 12,
    apf: (SQRT2 * Math.PI) / 6, // 0.7405
    touchRadius: SQRT2 / 4, // 0.3536
    example: 'Al, Cu, Au, Ni, Fe(γ)',
  },
  HSP: {
    id: 'HSP',
    label: 'Hekzagonal Sıkı Paket (HSP / HCP)',
    system: 'hexagonal',
    atoms: hcpAtoms(),
    a: 1,
    aOverR: 2,
    cOverA: HCP_CA,
    atomsPerCell: 6,
    coordination: 12,
    apf: Math.PI / (3 * SQRT2), // 0.7405
    touchRadius: 0.5,
    example: 'Mg, Zn, Ti, Co',
  },
};

// Saf metallere kategori etiketi
Object.values(STRUCTURES).forEach((s) => (s.category = 'metal'));

// --- BILESIK YAPILAR -------------------------------------------------------
// Iki tur iyon: 'A' (genelde anyon/buyuk) ve 'B' (genelde katyon/kucuk).

function fccSites() {
  // koseler + yuz merkezleri
  const pts = [];
  for (let x = 0; x <= 1; x++)
    for (let y = 0; y <= 1; y++)
      for (let z = 0; z <= 1; z++) pts.push([x, y, z]);
  return pts.concat([
    [0.5, 0.5, 0], [0.5, 0.5, 1], [0.5, 0, 0.5],
    [0.5, 1, 0.5], [0, 0.5, 0.5], [1, 0.5, 0.5],
  ]);
}

function octahedralSites() {
  // kenar orta noktalari (12) + hacim merkezi (1)
  const e = [];
  for (let a = 0; a <= 1; a++)
    for (let b = 0; b <= 1; b++) {
      e.push([0.5, a, b]);
      e.push([a, 0.5, b]);
      e.push([a, b, 0.5]);
    }
  e.push([0.5, 0.5, 0.5]);
  return e;
}

function tetrahedralSites() {
  // 8 oktantin merkezi (1/4 ve 3/4 konumlari)
  const t = [];
  for (const x of [0.25, 0.75])
    for (const y of [0.25, 0.75]) for (const z of [0.25, 0.75]) t.push([x, y, z]);
  return t;
}
// Sfaleritte tetrahedral boslarin yarisi
const ZNS_TET = [
  [0.25, 0.25, 0.25], [0.75, 0.75, 0.25],
  [0.75, 0.25, 0.75], [0.25, 0.75, 0.75],
];

function mkAtoms(aPos, bPos) {
  return [
    ...aPos.map((p) => ({ pos: p, sp: 'A' })),
    ...bPos.map((p) => ({ pos: p, sp: 'B' })),
  ];
}

export const COMPOUNDS = {
  NaCl: {
    id: 'NaCl',
    label: 'NaCl — Kaya Tuzu',
    system: 'cubic',
    category: 'compound',
    a: 1,
    atoms: mkAtoms(fccSites(), octahedralSites()),
    species: {
      A: { label: 'Cl⁻', color: 0x66bb6a, r: 0.30 },
      B: { label: 'Na⁺', color: 0xe91e63, r: 0.16 },
    },
    formula: 'NaCl',
    coordination: '6 : 6',
    voidType: 'octahedral',
    structureType: 'YMK (FCC) + tüm oktahedral boşluklar',
    example: 'NaCl, MgO, FeO, LiF',
  },
  CsCl: {
    id: 'CsCl',
    label: 'CsCl',
    system: 'cubic',
    category: 'compound',
    a: 1,
    atoms: mkAtoms(
      [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]],
      [[0.5, 0.5, 0.5]]
    ),
    species: {
      A: { label: 'Cl⁻', color: 0x66bb6a, r: 0.30 },
      B: { label: 'Cs⁺', color: 0xe91e63, r: 0.22 },
    },
    formula: 'CsCl',
    coordination: '8 : 8',
    voidType: 'cubic',
    structureType: 'Basit kübik + kübik boşluk (HMK değil!)',
    example: 'CsCl, CsBr, NH₄Cl',
  },
  ZnS: {
    id: 'ZnS',
    label: 'ZnS — Sfalerit',
    system: 'cubic',
    category: 'compound',
    a: 1,
    atoms: mkAtoms(fccSites(), ZNS_TET),
    species: {
      A: { label: 'S²⁻', color: 0x66bb6a, r: 0.30 },
      B: { label: 'Zn²⁺', color: 0xe91e63, r: 0.16 },
    },
    formula: 'ZnS',
    coordination: '4 : 4',
    voidType: 'tetrahedral',
    structureType: 'YMK (FCC) + tetrahedral boşlukların yarısı',
    example: 'ZnS, GaAs, β-SiC, elmas(C)',
  },
  CaF2: {
    id: 'CaF2',
    label: 'CaF₂ — Florit',
    system: 'cubic',
    category: 'compound',
    a: 1,
    atoms: mkAtoms(fccSites(), tetrahedralSites()),
    species: {
      A: { label: 'Ca²⁺', color: 0x42a5f5, r: 0.24 },
      B: { label: 'F⁻', color: 0xffa726, r: 0.16 },
    },
    formula: 'CaF₂',
    coordination: '8 : 4',
    voidType: 'tetrahedral-all',
    structureType: 'YMK (FCC) Ca²⁺ + tüm tetrahedral boşluklarda F⁻',
    example: 'CaF₂, UO₂, ZrO₂, ThO₂',
  },
};

export const ALL_STRUCTURES = { ...STRUCTURES, ...COMPOUNDS };

export const HCP_C_OVER_A = HCP_CA;
