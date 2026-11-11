// geometry.js
// Miller duzlemlerinin ve dogrultularinin geometrisi.
// Genel yaklasim: duzlemi buyuk bir dortgen olarak olustur, hucreyi tanimlayan
// yari-uzaylara gore Sutherland-Hodgman ile kirp.

import * as THREE from 'three';
import { HCP_C_OVER_A } from './crystals.js';

const EPS = 1e-6;

// --- Kafes vektorleri (gercek uzay) ---------------------------------------
export function latticeVectors(structure) {
  if (structure.system === 'cubic') {
    return [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
    ];
  }
  // hekzagonal
  const c = HCP_C_OVER_A;
  return [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-0.5, Math.sqrt(3) / 2, 0),
    new THREE.Vector3(0, 0, c),
  ];
}

// Ters kafes vektorleri (b_i . a_j = delta_ij)
export function reciprocalVectors(a) {
  const [a1, a2, a3] = a;
  const V = a1.dot(new THREE.Vector3().crossVectors(a2, a3));
  const b1 = new THREE.Vector3().crossVectors(a2, a3).divideScalar(V);
  const b2 = new THREE.Vector3().crossVectors(a3, a1).divideScalar(V);
  const b3 = new THREE.Vector3().crossVectors(a1, a2).divideScalar(V);
  return [b1, b2, b3];
}

// --- Duzlem normali (hkl) --------------------------------------------------
// n = h*b1 + k*b2 + l*b3  (Cartesian)
export function planeNormal(structure, h, k, l) {
  const a = latticeVectors(structure);
  const [b1, b2, b3] = reciprocalVectors(a);
  return new THREE.Vector3()
    .addScaledVector(b1, h)
    .addScaledVector(b2, k)
    .addScaledVector(b3, l);
}

// --- Yari-uzaylar (n . x <= d => ic taraf) --------------------------------
export function cubeHalfspaces() {
  return [
    { n: new THREE.Vector3(1, 0, 0), d: 1 },
    { n: new THREE.Vector3(-1, 0, 0), d: 0 },
    { n: new THREE.Vector3(0, 1, 0), d: 1 },
    { n: new THREE.Vector3(0, -1, 0), d: 0 },
    { n: new THREE.Vector3(0, 0, 1), d: 1 },
    { n: new THREE.Vector3(0, 0, -1), d: 0 },
  ];
}

export function prismHalfspaces() {
  const hs = [];
  // 6 yan yuz: altigen koseleri arasindaki kenarlar
  const corners = [];
  for (let kk = 0; kk < 6; kk++) {
    const ang = (Math.PI / 3) * kk;
    corners.push(new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0));
  }
  for (let kk = 0; kk < 6; kk++) {
    const p0 = corners[kk];
    const p1 = corners[(kk + 1) % 6];
    const mid = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5);
    const n = mid.clone().normalize(); // disa dogru
    hs.push({ n, d: mid.dot(n) });
  }
  const c = HCP_C_OVER_A;
  hs.push({ n: new THREE.Vector3(0, 0, 1), d: c });
  hs.push({ n: new THREE.Vector3(0, 0, -1), d: 0 });
  return hs;
}

// --- Bir yari-uzaya gore poligon kirpma -----------------------------------
function clipPolygonByHalfspace(poly, hs) {
  if (poly.length === 0) return poly;
  const out = [];
  const dist = (p) => hs.n.dot(p) - hs.d; // <=0 ic taraf
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const nxt = poly[(i + 1) % poly.length];
    const dc = dist(cur);
    const dn = dist(nxt);
    if (dc <= EPS) out.push(cur);
    if ((dc < -EPS && dn > EPS) || (dc > EPS && dn < -EPS)) {
      const t = dc / (dc - dn);
      out.push(new THREE.Vector3().lerpVectors(cur, nxt, t));
    }
  }
  return out;
}

// Duzlemi (n.x = d) verilen yari-uzaylara gore kirpip poligon dondurur.
export function clipPlaneToCell(normal, d, halfspaces) {
  const n = normal.clone().normalize();
  const dN = d / normal.length();
  // Duzlem uzerinde bir nokta
  const center = n.clone().multiplyScalar(dN);
  // Duzlem icinde iki dik vektor
  let u = new THREE.Vector3(1, 0, 0);
  if (Math.abs(n.dot(u)) > 0.9) u = new THREE.Vector3(0, 1, 0);
  u = u.clone().sub(n.clone().multiplyScalar(n.dot(u))).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  const R = 6;
  let poly = [
    center.clone().addScaledVector(u, -R).addScaledVector(v, -R),
    center.clone().addScaledVector(u, R).addScaledVector(v, -R),
    center.clone().addScaledVector(u, R).addScaledVector(v, R),
    center.clone().addScaledVector(u, -R).addScaledVector(v, R),
  ];
  for (const hs of halfspaces) {
    poly = clipPolygonByHalfspace(poly, hs);
    if (poly.length === 0) break;
  }
  return poly;
}

// --- Kubik duzlem: orijin kaydirmali (negatif indisler icin) --------------
// n.x = 1 (kaydirilmamis). s_i = 1 eger index_i < 0. d = 1 + n.s
export function cubicPlanePolygon(h, k, l) {
  const n = new THREE.Vector3(h, k, l);
  const s = new THREE.Vector3(h < 0 ? 1 : 0, k < 0 ? 1 : 0, l < 0 ? 1 : 0);
  const d = 1 + n.dot(s);
  const poly = clipPlaneToCell(n, d, cubeHalfspaces());
  return { poly, shift: s, normal: n, m: d };
}

// Poligon alani (gecersiz/dejenere kirpmayi elemek icin)
function polyArea(poly) {
  if (poly.length < 3) return 0;
  const acc = new THREE.Vector3();
  for (let i = 1; i < poly.length - 1; i++) {
    const e1 = new THREE.Vector3().subVectors(poly[i], poly[0]);
    const e2 = new THREE.Vector3().subVectors(poly[i + 1], poly[0]);
    acc.add(e1.cross(e2));
  }
  return acc.length() / 2;
}

// Prizmadaki kafes noktalari (kesirli: a1, a2, c). Orijin kaydirma adaylari.
function prismLatticePoints() {
  const ring = [[0, 0], [1, 0], [1, 1], [0, 1], [-1, 0], [-1, -1], [0, -1]];
  const pts = [];
  for (const z of [0, 1]) for (const [i, j] of ring) pts.push([i, j, z]);
  return pts;
}

// HSP duzlemi: normal ters kafesten, n·x = 1 (a1, a2, c kesisimleri 1/h, 1/k, 1/l).
// Kubikteki gibi negatif indiste duzlem hucre disinda kalirsa orijin, prizmanin
// bir kafes noktasina kaydirilir: n·x = 1 + n·s (s kafes noktasi).
export function hexPlanePolygon(structure, h, k, l) {
  const n = planeNormal(structure, h, k, l);
  const L = latticeVectors(structure);
  const hs = prismHalfspaces();
  let best = null;
  for (const f of prismLatticePoints()) {
    const m = 1 + h * f[0] + k * f[1] + l * f[2];
    const poly = clipPlaneToCell(n, m, hs);
    if (polyArea(poly) > 1e-4) {
      const shift = new THREE.Vector3()
        .addScaledVector(L[0], f[0])
        .addScaledVector(L[1], f[1])
        .addScaledVector(L[2], f[2]);
      best = { poly, normal: n, m, shift, shifted: f.some((x) => x !== 0) };
      break;
    }
  }
  return best || { poly: [], normal: n, m: 1, shift: new THREE.Vector3(), shifted: false };
}

// --- Dogrultu vektoru ------------------------------------------------------
// Kubik [uvw]: koseden baslayip (u,v,w)/max ile biten ok
export function cubicDirection(u, v, w) {
  const s = new THREE.Vector3(u < 0 ? 1 : 0, v < 0 ? 1 : 0, w < 0 ? 1 : 0);
  const vec = new THREE.Vector3(u, v, w);
  const m = Math.max(Math.abs(u), Math.abs(v), Math.abs(w)) || 1;
  const start = s.clone();
  const end = s.clone().addScaledVector(vec, 1 / m);
  return { start, end, vec };
}

// HSP 4-indis [uvtw] -> 3-indis [UVW]:  U = u − t, V = v − t, W = w
// (a3 = −(a1 + a2) oldugundan u·a1 + v·a2 + t·a3 + w·c = U·a1 + V·a2 + W·c)
export function hcp4to3(u, v, t, w) {
  const tt = -(u + v); // t her zaman −(u+v)
  return { U: u - tt, V: v - tt, W: w };
}

// Ok, baslangic noktasindan prizmanin disina cikmayacak kadar uzatilir.
export function hcpDirection(structure, u, v, t, w) {
  const { U, V, W } = hcp4to3(u, v, t, w);
  const a = latticeVectors(structure);
  const vec = new THREE.Vector3()
    .addScaledVector(a[0], U)
    .addScaledVector(a[1], V)
    .addScaledVector(a[2], W);
  const c = HCP_C_OVER_A;
  const start = new THREE.Vector3(0, 0, vec.z < -EPS ? c : 0);
  let tMax = Infinity;
  for (const hs of prismHalfspaces()) {
    const nv = hs.n.dot(vec);
    if (nv > EPS) tMax = Math.min(tMax, (hs.d - hs.n.dot(start)) / nv);
  }
  const end = start.clone().addScaledVector(vec, tMax);
  return { start, end, vec, U, V, W };
}
