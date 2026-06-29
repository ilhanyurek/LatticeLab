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
  return { poly, shift: s, normal: n };
}

// HSP duzlemi: normal ters kafesten, n.x = 1, prizmaya kirp
export function hexPlanePolygon(structure, h, k, l) {
  const n = planeNormal(structure, h, k, l);
  let poly = clipPlaneToCell(n, 1, prismHalfspaces());
  if (poly.length === 0) {
    // prizma merkezinden gececek sekilde kaydir (gorsel amac)
    const c = HCP_C_OVER_A;
    const centroid = new THREE.Vector3(0, 0, c / 2);
    const d2 = n.dot(centroid);
    poly = clipPlaneToCell(n, d2, prismHalfspaces());
  }
  return { poly, normal: n };
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

// HSP 4-indis [uvtw] -> 3-indis [UVW] -> Cartesian
export function hcp4to3(u, v, t, w) {
  // t = -(u+v) olmali; tutarlilik icin yeniden hesaplanir
  const tt = -(u + v);
  const U = u - tt;
  const V = v - tt;
  const W = w;
  return { U, V, W };
}

export function hcpDirection(structure, u, v, t, w) {
  const { U, V, W } = hcp4to3(u, v, t, w);
  const a = latticeVectors(structure);
  const vec = new THREE.Vector3()
    .addScaledVector(a[0], U)
    .addScaledVector(a[1], V)
    .addScaledVector(a[2], W);
  const c = HCP_C_OVER_A;
  const start = new THREE.Vector3(0, 0, vec.z < 0 ? c : 0);
  const m = vec.length() || 1;
  const end = start.clone().addScaledVector(vec, 1 / m);
  return { start, end, vec, U, V, W };
}
