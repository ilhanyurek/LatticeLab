// density.js
// LAY (Lineer Atom Yogunlugu) ve DAY (Duzlemsel Atom Yogunlugu) hesabi.
// Genel sayisal yontem: yapinin atom merkezlerinden olusan kafesi uretip
// dogru/duzlem uzerindeki atom araliklarini olcer.

import * as THREE from 'three';
import { HCP_C_OVER_A } from './crystals.js';

const EPS = 1e-4;

// Yapiya gore kafes vektorleri + baz (atom merkezleri, kesir konum)
function latticeBasis(structure) {
  if (structure.system === 'cubic') {
    const L = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
    ];
    let basis;
    if (structure.id === 'BK') basis = [[0, 0, 0]];
    else if (structure.id === 'HMK') basis = [[0, 0, 0], [0.5, 0.5, 0.5]];
    else basis = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]];
    return { L, basis };
  }
  const c = HCP_C_OVER_A;
  const L = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-0.5, Math.sqrt(3) / 2, 0),
    new THREE.Vector3(0, 0, c),
  ];
  // baz: (0,0,0) ve (2/3,1/3,1/2)
  const basis = [
    [0, 0, 0],
    [2 / 3, 1 / 3, 0.5],
  ];
  return { L, basis };
}

function generateAtoms(structure, N) {
  const { L, basis } = latticeBasis(structure);
  const pts = [];
  for (let i = -N; i <= N; i++)
    for (let j = -N; j <= N; j++)
      for (let kk = -N; kk <= N; kk++)
        for (const b of basis) {
          const fx = i + b[0];
          const fy = j + b[1];
          const fz = kk + b[2];
          pts.push(
            new THREE.Vector3()
              .addScaledVector(L[0], fx)
              .addScaledVector(L[1], fy)
              .addScaledVector(L[2], fz)
          );
        }
  return pts;
}

// --- LAY: dogrultu uzerindeki en yakin atom araligi -----------------------
export function computeLAY(structure, dirVec) {
  if (dirVec.length() < EPS) return null;
  const u = dirVec.clone().normalize();
  const atoms = generateAtoms(structure, 4);
  let s = Infinity;
  for (const p of atoms) {
    if (p.length() < EPS) continue; // orijin
    const cross = new THREE.Vector3().crossVectors(p, u).length();
    if (cross > EPS) continue; // dogru uzerinde degil
    const proj = p.dot(u);
    if (proj > EPS && proj < s) s = proj;
  }
  if (!isFinite(s)) return null;
  const aOverR = structure.aOverR;
  return {
    spacing_a: s, // a birimi cinsinden
    spacing_R: s * aOverR, // R cinsinden
    LAY_per_a: 1 / s, // atom / a
    LAY_per_R: 1 / (s * aOverR), // atom / R
  };
}

// --- DAY: duzlem icindeki 2B ilkel hucre alani ----------------------------
export function computeDAY(structure, normalVec) {
  if (normalVec.length() < EPS) return null;
  const n = normalVec.clone().normalize();
  const atoms = generateAtoms(structure, 4);
  const inPlane = [];
  for (const p of atoms) {
    if (Math.abs(p.dot(n)) < EPS) inPlane.push(p);
  }
  // orijinden cikan en kisa iki bagimsiz vektor
  const vecs = inPlane.filter((p) => p.length() > EPS).sort((x, y) => x.length() - y.length());
  let v1 = null;
  let v2 = null;
  for (const v of vecs) {
    if (!v1) {
      v1 = v;
      continue;
    }
    const cross = new THREE.Vector3().crossVectors(v1, v).length();
    if (cross > EPS) {
      v2 = v;
      break;
    }
  }
  if (!v1 || !v2) return null;
  const area = new THREE.Vector3().crossVectors(v1, v2).length();
  const aOverR = structure.aOverR;
  return {
    area_a2: area,
    area_R2: area * aOverR * aOverR,
    DAY_per_a2: 1 / area,
    DAY_per_R2: 1 / (area * aOverR * aOverR),
  };
}
