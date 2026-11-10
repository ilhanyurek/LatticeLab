// density.js
// LAY (Lineer Atom Yogunlugu) ve DAY (Duzlemsel Atom Yogunlugu) hesabi.
//
// Yontem kesin (tam sayi) aritmetige dayanir; atom sayma "en yakin komsu"
// tahminine dayanmaz. Bu sayede HSP gibi bazli (Bravais olmayan) yapilarda da
// dogru sonuc verir:
//   LAY = (dogru uzerindeki atom sayisi / periyot) / (periyot uzunlugu)
//   DAY = (duzlemdeki atom sayisi / 2B ilkel hucre) / (2B ilkel hucre alani)

import * as THREE from 'three';
import { BASIS } from './crystals.js';
import { latticeVectors } from './geometry.js';

const EPS = 1e-6;

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
const gcd3 = (a, b, c) => gcd(gcd(a, b), c);
const isInt = (x) => Math.abs(x - Math.round(x)) < EPS;

function toCart(L, f) {
  return new THREE.Vector3()
    .addScaledVector(L[0], f[0])
    .addScaledVector(L[1], f[1])
    .addScaledVector(L[2], f[2]);
}

// --- LAY -------------------------------------------------------------------
// uvw: kafes vektorlerine gore tam sayi dogrultu (HSP icin 3-indis [UVW]).
export function computeLAY(structure, uvw) {
  const g = gcd3(uvw[0], uvw[1], uvw[2]);
  if (!g) return null;
  const T = uvw.map((x) => x / g); // dogru boyunca en kisa oteleme
  const L = latticeVectors(structure);
  const len = toCart(L, T).length(); // a birimi

  // Bir baz atomu b, orijinden gecen dogru uzerinde mi? b + M = t·T (M tam sayi)
  const ax = T.findIndex((x) => x !== 0);
  const ts = []; // periyot icindeki atom konumlari (0 <= t < 1)
  for (const b of BASIS[structure.id]) {
    const span = Math.abs(T[ax]) + 1;
    for (let m = -span; m <= span; m++) {
      const tt = (b[ax] + m) / T[ax];
      if (tt < -EPS || tt >= 1 - EPS) continue;
      if ([0, 1, 2].every((i) => isInt(tt * T[i] - b[i]))) {
        ts.push(Math.max(0, tt));
        break;
      }
    }
  }
  let count = ts.length;
  let period = len;
  // Atomlar esit aralikliysa en yakin komsu araligina indir (orn. YMK [110]: 2 atom / √2·a -> 1 atom / 0,707·a)
  ts.sort((x, y) => x - y);
  if (count > 1 && ts.every((x, i) => Math.abs(x - i / count) < 1e-6)) {
    period = len / count;
    count = 1;
  }
  const aR = structure.aOverR;
  return {
    n: count,
    len_a: period,
    len_R: period * aR,
    LAY_per_a: count / period,
    LAY_per_R: count / (period * aR),
    T,
  };
}

// --- DAY -------------------------------------------------------------------
// hkl: (HSP icin h k l; i bagimli). m: cizilen duzlem n·x = m (kesirli
// koordinatlarda h·x + k·y + l·z = m). Paralel duzlemler farkli atom
// iceriyorsa (orn. BK (200)) sonuc cizilen duzleme aittir.
export function computeDAY(structure, hkl, m = 0) {
  const [h, k, l] = hkl;
  const g = gcd3(h, k, l);
  if (!g) return null;
  const L = latticeVectors(structure);

  // Duzlem icindeki oteleme kafesi: h·i + k·j + l·q = 0 olan tam sayi vektorler
  const N = 7;
  const cand = [];
  for (let i = -N; i <= N; i++)
    for (let j = -N; j <= N; j++)
      for (let q = -N; q <= N; q++) {
        if ((i || j || q) && h * i + k * j + l * q === 0) cand.push(toCart(L, [i, j, q]));
      }
  cand.sort((x, y) => x.length() - y.length());
  // 2B'de en kisa vektor ve ona bagimsiz en kisa vektor ilkel hucreyi verir
  const v1 = cand[0];
  const v2 = cand.find((v) => new THREE.Vector3().crossVectors(v1, v).length() > EPS);
  if (!v1 || !v2) return null;
  const area = new THREE.Vector3().crossVectors(v1, v2).length();

  // Baz atomu b, n·x = m duzlemindeki bir atoma otelenebilir mi?
  // h·(b+M) = m  <=>  m − h·b ∈ g·Z
  let count = 0;
  for (const b of BASIS[structure.id]) {
    const r = (m - (h * b[0] + k * b[1] + l * b[2])) / g;
    if (isInt(r)) count++;
  }
  // Duzlemdeki atomlar tek basina bir 2B kafes olusturuyorsa (Bravais yapilar)
  // ilkel hucreye indir: n = 1. HSP'de bazi duzlemler kafes degildir, o zaman
  // oteleme hucresi ve icindeki n atom gosterilir.
  let n = count;
  let A = area;
  if (count > 1) {
    const S = [];
    const M = 3;
    for (const b of BASIS[structure.id])
      for (let i = -M; i <= M; i++)
        for (let j = -M; j <= M; j++)
          for (let q = -M; q <= M; q++) {
            const f = [b[0] + i, b[1] + j, b[2] + q];
            if (Math.abs(h * f[0] + k * f[1] + l * f[2] - m) < EPS) S.push(toCart(L, f));
          }
    if (S.length > 2) {
      // merkeze en yakin atomu referans al (komsulari uretilen bolgede kalsin)
      const p0 = S.reduce((x, y) => (y.length() < x.length() ? y : x));
      const d = S.filter((p) => p !== p0).map((p) => p.clone().sub(p0)).sort((x, y) => x.length() - y.length());
      const w1 = d[0];
      const w2 = d.find((v) => new THREE.Vector3().crossVectors(w1, v).length() > EPS);
      if (w2) {
        const Ap = new THREE.Vector3().crossVectors(w1, w2).length();
        if (Math.abs(count / area - 1 / Ap) < 1e-6) {
          n = 1;
          A = Ap;
        }
      }
    }
  }
  const aR = structure.aOverR;
  return {
    n,
    area_a2: A,
    area_R2: A * aR * aR,
    DAY_per_a2: n / A,
    DAY_per_R2: n / (A * aR * aR),
  };
}
