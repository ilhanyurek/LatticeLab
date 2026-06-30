// scene.js
// Three.js sahnesi: hucre, atomlar, eksenler, duzlem ve dogrultu cizimi.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HCP_C_OVER_A } from './crystals.js';

function makeLabel(text, color) {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 64;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = color;
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 32);
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  spr.scale.set(0.4, 0.2, 1);
  return spr;
}

export class CrystalScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
    this.camera.position.set(2.6, 2.0, 3.2);
    this.controls = new OrbitControls(this.camera, canvas);
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
    this._loop = this._loop.bind(this);
    this._loop();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth || this.canvas.parentElement.clientWidth;
    const h = this.canvas.clientHeight || this.canvas.parentElement.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
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
  }

  _center() {
    const s = this.structure;
    if (s.system === 'cubic') {
      this.root.rotation.set(0, 0, 0);
      this.root.position.set(-0.5, -0.5, -0.5);
    } else {
      // Modelde c ekseni +Z; sahnede "yukari" +Y oldugu icin prizmayi
      // X ekseni etrafinda -90° dondurup c'yi dikey yapariz (standart gorunum).
      this.root.rotation.set(-Math.PI / 2, 0, 0);
      this.root.position.set(0, -HCP_C_OVER_A / 2, 0);
    }
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
    const mat = new THREE.LineBasicMaterial({ color: 0xdfe6ee });
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
        r = space ? sp.r : sp.r * 0.62;
      } else {
        color = colors[a.kind] || 0x4f8cff;
        r = space ? s.touchRadius : 0.16;
      }
      const geo = new THREE.SphereGeometry(r, 28, 20);
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.45,
        metalness: 0.1,
        transparent: space,
        opacity: space ? 0.92 : 1,
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(a.pos[0], a.pos[1], a.pos[2]);
      this.groups.atoms.add(m);
    });
  }

  _arrow(from, to, color, label, labelColor) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const arrow = new THREE.ArrowHelper(dir.clone().normalize(), from, len, color, 0.12, 0.07);
    this.groups.axes.add(arrow);
    if (label) {
      const lab = makeLabel(label, labelColor || '#222');
      lab.position.copy(to).addScaledVector(dir.clone().normalize(), 0.12);
      this.groups.axes.add(lab);
    }
  }

  // Eksenler hucre dis hattindan FARKLI renkte
  _buildAxes() {
    this._clear(this.groups.axes);
    const s = this.structure;
    if (s.system === 'cubic') {
      const o = new THREE.Vector3(0, 0, 0);
      this._arrow(o, new THREE.Vector3(1.35, 0, 0), 0xe53935, 'x', '#e53935');
      this._arrow(o, new THREE.Vector3(0, 1.35, 0), 0x43a047, 'y', '#43a047');
      this._arrow(o, new THREE.Vector3(0, 0, 1.35), 0x1e88e5, 'z', '#1e88e5');
      const ol = makeLabel('0', '#555');
      ol.position.set(-0.12, -0.12, -0.12);
      this.groups.axes.add(ol);
    } else {
      const c = HCP_C_OVER_A;
      const o = new THREE.Vector3(0, 0, 0);
      // a1,a2,a3 basal eksenler (turuncu), c ekseni (camgobegi)
      const aCol = 0xff9800;
      for (let i = 0; i < 3; i++) {
        const ang = (Math.PI * 2 / 3) * i; // 120 derece
        const v = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0).multiplyScalar(1.35);
        this._arrow(o, v, aCol, 'a' + (i + 1), '#ef6c00');
      }
      this._arrow(o, new THREE.Vector3(0, 0, c + 0.35), 0x00bcd4, 'c', '#0097a7');
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
    });
    this.groups.plane.add(new THREE.Mesh(geo, mat));
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
      0x9c27b0,
      0.14,
      0.08
    );
    this.groups.direction.add(arrow);
    if (label) {
      const lab = makeLabel(label, '#7b1fa2');
      lab.position.copy(end).addScaledVector(dir.clone().normalize(), 0.14);
      this.groups.direction.add(lab);
    }
  }

  clearDirection() {
    this._clear(this.groups.direction);
  }

  resetView() {
    this.camera.position.set(2.6, 2.0, 3.2);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }
}
