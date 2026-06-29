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

export const HCP_C_OVER_A = HCP_CA;
