// scene.js
// Three.js sahnesi: hucre, atomlar, eksenler, duzlem ve dogrultu cizimi.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HCP_C_OVER_A } from './crystals.js';

// Etiket metni: '-2' gibi negatif sayilar ust cizgiyle (2̄) cizilir.
// text: duz metin ya da [{t, bar}] parcalari.
function makeLabel(text, color, height = 0.2) {
  const parts = Array.isArray(text) ? text : [{ t: String(text), bar: false }];
  const fs = 44;
  const font = `bold ${fs}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  const meas = document.createElement('canvas').getContext('2d');
  meas.font = font;
  const widths = parts.map((p) => meas.measureText(p.t).width);
  const pad = 10;
  const W = Math.ceil(widths.reduce((x, y) => x + y, 0) + pad * 2);
  const H = 72;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  let x = pad;
  parts.forEach((p, i) => {
    // koyu kontur: her arka planda okunur
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(10,14,20,.85)';
    ctx.strokeText(p.t, x, H / 2 + 4);
    ctx.fillStyle = color;
    ctx.fillText(p.t, x, H / 2 + 4);
    if (p.bar) {
      ctx.fillRect(x + 2, 8, widths[i] - 4, 4);
    }
    x += widths[i];
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  spr.scale.set((height * W) / H, height, 1);
  spr.renderOrder = 10;
  return spr;
}

export class CrystalScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    // Ders kitabi duzeni: z (ve HSP'de c) yukari. OrbitControls 'up' vektorunu
    // olusturulurken okudugu icin once ayarlanir.
    this.camera.up.set(0, 0, 1);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 20;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(3, 5, 4);
    this.scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.35);
    dir2.position.set(-3, -2, -4);
    this.scene.add(dir2);

    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.groups = {
      cell: new THREE.Group(),
      atoms: new THREE.Group(),
      axes: new THREE.Group(),
      plane: new THREE.Group(),
      direction: new THREE.Group(),
    };
    Object.values(this.groups).forEach((g) => this.root.add(g));

    this.structure = null;
    this.atomMode = 'ball'; // 'ball' | 'space'
    this.groups.bonds = new THREE.Group();
    this.root.add(this.groups.bonds);
    this._loop = this._loop.bind(this);
    this._loop();
    window.addEventListener('resize', () => this.resize());
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth || this.canvas.parentElement.clientWidth;
    const h = this.canvas.clientHeight || this.canvas.parentElement.clientHeight;
    if (!w || !h) return;
    if (w === this._w && h === this._h) return;
    const first = !this._w;
    this._w = w;
    this._h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (first && this.structure) this.resetView();
  }

  _loop() {
    requestAnimationFrame(this._loop);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  _clear(group) {
    while (group.children.length) {
      const c = group.children.pop();
      c.geometry?.dispose?.();
      c.material?.map?.dispose?.();
      c.material?.dispose?.();
    }
  }

  // --- Yapi kurulumu -------------------------------------------------------
  setStructure(structure) {
    this.structure = structure;
    this._buildCell();
    this._buildAtoms();
    this._buildAxes();
    this._center();
    this.resetView();
  }

  // Model koordinatlari dogrudan kullanilir (z yukari); yalnizca ortalanir.
  _center() {
    const s = this.structure;
    this.root.rotation.set(0, 0, 0);
    if (s.system === 'cubic') this.root.position.set(-0.5, -0.5, -0.5);
    else this.root.position.set(0, 0, -HCP_C_OVER_A / 2);
  }

  _cubeCorners() {
    const c = [];
    for (let x = 0; x <= 1; x++)
      for (let y = 0; y <= 1; y++)
        for (let z = 0; z <= 1; z++) c.push(new THREE.Vector3(x, y, z));
    return c;
  }

  _buildCell() {
    this._clear(this.groups.cell);
    const mat = new THREE.LineBasicMaterial({ color: 0xdfe6ee, transparent: true, opacity: 0.85 });
    const s = this.structure;
    const segs = [];
    if (s.system === 'cubic') {
      const e = [
        [0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3],
        [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7],
      ];
      const c = this._cubeCorners();
      e.forEach(([i, j]) => segs.push(c[i], c[j]));
    } else {
      const c = HCP_C_OVER_A;
      const top = [];
      const bot = [];
      for (let k = 0; k < 6; k++) {
        const ang = (Math.PI / 3) * k;
        bot.push(new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0));
        top.push(new THREE.Vector3(Math.cos(ang), Math.sin(ang), c));
      }
      for (let k = 0; k < 6; k++) {
        segs.push(bot[k], bot[(k + 1) % 6]);
        segs.push(top[k], top[(k + 1) % 6]);
        segs.push(bot[k], top[k]);
      }
    }
    const geo = new THREE.BufferGeometry().setFromPoints(segs);
    this.groups.cell.add(new THREE.LineSegments(geo, mat));
  }

  _buildAtoms() {
    this._clear(this.groups.atoms);
    const s = this.structure;
    const colors = {
      corner: 0x4f8cff,
      center: 0xff7043,
      face: 0x66bb6a,
      inner: 0xab47bc,
    };
    const space = this.atomMode === 'space';
    s.atoms.forEach((a) => {
      let color;
      let r;
      if (a.sp && s.species) {
        // bilesik: iyon turune gore renk ve yaricap
        const sp = s.species[a.sp];
        color = sp.color;
        r = space ? sp.r : Math.max(0.07, sp.r * 0.45);
      } else {
        color = colors[a.kind] || 0x4f8cff;
        r = space ? s.touchRadius : 0.12;
      }
      const geo = new THREE.SphereGeometry(r, 28, 20);
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.45,
        metalness: 0.1,
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(a.pos[0], a.pos[1], a.pos[2]);
      this.groups.atoms.add(m);
    });
    this._buildBonds();
  }

  // Top-cubuk gorunumunde en yakin komsular arasina cubuk cizilir.
  // Bilesiklerde yalnizca katyon-anyon baglari.
  _buildBonds() {
    this._clear(this.groups.bonds);
    if (this.atomMode !== 'ball') return;
    const s = this.structure;
    const P = s.atoms.map((a) => ({ v: new THREE.Vector3(...a.pos), sp: a.sp }));
    const pairs = [];
    let dmin = Infinity;
    for (let i = 0; i < P.length; i++)
      for (let j = i + 1; j < P.length; j++) {
        if (s.species && P[i].sp === P[j].sp) continue;
        const d = P[i].v.distanceTo(P[j].v);
        pairs.push([i, j, d]);
        if (d < dmin) dmin = d;
      }
    const mat = new THREE.MeshStandardMaterial({ color: 0x8a97a8, roughness: 0.6 });
    const up = new THREE.Vector3(0, 1, 0);
    for (const [i, j, d] of pairs) {
      if (d > dmin * 1.02) continue;
      const geo = new THREE.CylinderGeometry(0.018, 0.018, d, 8, 1, true);
      const m = new THREE.Mesh(geo, mat);
      const dir = new THREE.Vector3().subVectors(P[j].v, P[i].v).normalize();
      m.quaternion.setFromUnitVectors(up, dir);
      m.position.addVectors(P[i].v, P[j].v).multiplyScalar(0.5);
      this.groups.bonds.add(m);
    }
  }

  _arrow(from, to, color, label, labelColor) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const arrow = new THREE.ArrowHelper(dir.clone().normalize(), from, len, color, 0.12, 0.07);
    this.groups.axes.add(arrow);
    if (label) {
      const lab = makeLabel(label, labelColor || '#e6edf3');
      lab.position.copy(to).addScaledVector(dir.clone().normalize(), 0.14);
      this.groups.axes.add(lab);
    }
  }

  // Eksenler hucre dis hattindan FARKLI renkte
  _buildAxes() {
    this._clear(this.groups.axes);
    const s = this.structure;
    if (s.system === 'cubic') {
      const o = new THREE.Vector3(0, 0, 0);
      this._arrow(o, new THREE.Vector3(1.35, 0, 0), 0xe53935, 'x', '#ff6b66');
      this._arrow(o, new THREE.Vector3(0, 1.35, 0), 0x43a047, 'y', '#66d26b');
      this._arrow(o, new THREE.Vector3(0, 0, 1.35), 0x1e88e5, 'z', '#5aaaf5');
      const ol = makeLabel('O', '#c9d4e0', 0.16);
      ol.position.set(-0.1, -0.1, -0.1);
      this.groups.axes.add(ol);
    } else {
      const c = HCP_C_OVER_A;
      const o = new THREE.Vector3(0, 0, 0);
      // a1,a2,a3 basal eksenler (turuncu), c ekseni (camgobegi)
      const aCol = 0xff9800;
      for (let i = 0; i < 3; i++) {
        const ang = (Math.PI * 2 / 3) * i; // 120 derece
        const v = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0).multiplyScalar(1.35);
        this._arrow(o, v, aCol, 'a' + (i + 1), '#ffb74d');
      }
      this._arrow(o, new THREE.Vector3(0, 0, c + 0.35), 0x00bcd4, 'c', '#4dd0e1');
    }
  }

  setAtomMode(mode) {
    this.atomMode = mode;
    if (this.structure) this._buildAtoms();
  }

  // --- Duzlem --------------------------------------------------------------
  setPlane(polygon) {
    this._clear(this.groups.plane);
    if (!polygon || polygon.length < 3) return;
    const centroid = new THREE.Vector3();
    polygon.forEach((p) => centroid.add(p));
    centroid.multiplyScalar(1 / polygon.length);
    const verts = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      verts.push(centroid.x, centroid.y, centroid.z, a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffc107,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
      roughness: 0.6,
      depthWrite: false, // atomlar duzlemin arkasinda da gorunsun
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 2;
    this.groups.plane.add(mesh);
    const outline = new THREE.BufferGeometry().setFromPoints([...polygon, polygon[0]]);
    this.groups.plane.add(
      new THREE.Line(outline, new THREE.LineBasicMaterial({ color: 0xff6f00, linewidth: 2 }))
    );
  }

  clearPlane() {
    this._clear(this.groups.plane);
  }

  // --- Dogrultu ------------------------------------------------------------
  setDirection(start, end, label) {
    this._clear(this.groups.direction);
    const dir = new THREE.Vector3().subVectors(end, start);
    const arrow = new THREE.ArrowHelper(
      dir.clone().normalize(),
      start,
      dir.length(),
      0xd05ce3,
      0.14,
      0.08
    );
    arrow.line.material.depthTest = false;
    arrow.cone.material.depthTest = false;
    arrow.renderOrder = 5;
    this.groups.direction.add(arrow);
    if (label) {
      const lab = makeLabel(label, '#e1a6ee');
      lab.position.copy(end).addScaledVector(dir.clone().normalize(), 0.14);
      this.groups.direction.add(lab);
    }
  }

  clearDirection() {
    this._clear(this.groups.direction);
  }

  // Kamerayi yapiyi (eksenler dahil) ekrana sigacak uzakliga getirir.
  // Gorus acisi: x izleyiciye dogru-sola, y saga, z yukari (ders kitabi).
  resetView() {
    const hex = this.structure && this.structure.system === 'hexagonal';
    const R = hex ? 1.75 : 1.3; // sinir kuresi yaricapi (eksen uclari dahil)
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (this.camera.aspect || 1));
    const dist = (R / Math.sin(Math.min(vfov, hfov) / 2)) * 1.05;
    const dir = new THREE.Vector3(3.6, 1.25, 1.7).normalize();
    this.camera.position.copy(dir.multiplyScalar(dist));
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }
}
