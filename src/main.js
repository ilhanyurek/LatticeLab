// main.js
import './style.css';
import { STRUCTURES, COMPOUNDS, ALL_STRUCTURES } from './crystals.js';
import { CrystalScene } from './scene.js';
import {
  cubicPlanePolygon,
  hexPlanePolygon,
  cubicDirection,
  hcpDirection,
  planeNormal,
} from './geometry.js';
import { computeLAY, computeDAY, gcd } from './density.js';
import { t, getLang, setLang } from './i18n.js';
import { Vector3 as THREE_V } from 'three';

const CONTACT_EMAIL = 'contact@ilhanyurek.com';
const IDX_MAX = 9; // indis girisi icin sinir

const app = document.getElementById('app');
// Sabit iskelet: canvas yeniden olusturulmaz (WebGL baglami korunur)
app.innerHTML = `
  <div id="viewport">
    <canvas id="gl"></canvas>
    <div class="tl">
      <button id="menuBtn" class="ovl-btn menu-btn">☰</button>
      <button id="gearBtn" class="ovl-btn">⚙</button>
    </div>
    <button id="resetBtn" class="ovl-btn reset-btn"></button>
    <div id="legend" class="legend"></div>
  </div>
  <div id="scrim" class="scrim"></div>
  <aside id="panel" class="panel"></aside>
  <div id="settings" class="modal hidden" role="dialog" aria-modal="true"></div>
`;

const $ = (id) => document.getElementById(id);

let scene;
try {
  scene = new CrystalScene($('gl'));
} catch (e) {
  $('viewport').innerHTML = `<div class="glfail">
       <h2>⚠️ ${t('glfail_title')}</h2>
       <p>${t('glfail_body')}</p>
       <p style="opacity:.6;font-size:12px">${(e && e.message) || e}</p>
     </div>`;
  throw e;
}

// --- durum -----------------------------------------------------------------
// Panel her dil/yapi degisiminde yeniden cizilir; secimler burada saklanir.
const state = {
  current: STRUCTURES.BK,
  mode: 'ball',
  vis: { atoms: true, axes: true, cell: true },
  hl: true, // duzlem/dogrultu uzerindeki atomlari vurgula
  idx: {
    cubic: { p: [1, 0, 0], d: [1, 1, 0] },
    hexagonal: { p: [1, 0, 0], d: [1, 0, 0] }, // h k l / u v w (i, t turetilir)
  },
  plane: null, // { hkl, members: [{ hkl, res }], family: bool }
  dir: null, // { uvw, members: [{ uvw, res }], family: bool }
};

// --- bicimlendirme ---------------------------------------------------------
// Ondalik ayirac dile gore: TR'de virgul.
const fmt = (x, d = 3) => {
  if (!Number.isFinite(x)) return '—';
  const s = x.toFixed(d);
  return getLang() === 'tr' ? s.replace('.', ',') : s;
};
const pct = (x) => (getLang() === 'tr' ? '%' + fmt(x * 100, 2) : fmt(x * 100, 2) + '%');

// Negatif indis ust cizgiyle yazilir: (1̄10). Iki basamakli indis varsa bosluk.
function idxHTML(arr, open, close) {
  const sep = arr.some((n) => Math.abs(n) > 9) ? ' ' : '';
  const body = arr
    .map((n) => (n < 0 ? `<span class="ob">${-n}</span>` : `${n}`))
    .join(sep);
  return `<span class="idx">${open}${body}${close}</span>`;
}
// 3B etiket icin ayni gosterim (scene.makeLabel parcalari)
function idxParts(arr, open, close) {
  const sep = arr.some((n) => Math.abs(n) > 9) ? ' ' : '';
  const parts = [{ t: open }];
  arr.forEach((n, i) => {
    parts.push({ t: String(Math.abs(n)), bar: n < 0 });
    if (sep && i < arr.length - 1) parts.push({ t: sep });
  });
  parts.push({ t: close });
  return parts;
}
const reduce3 = (a) => {
  const g = gcd(gcd(a[0], a[1]), a[2]) || 1;
  return a.map((x) => x / g);
};

// --- indis aileleri {hkl} / <uvw> -------------------------------------------
// Kubik (m3̄m): indislerin tum permutasyonlari x tum isaret degisimleri (48).
// Hekzagonal (6/mmm): (h,k,i) permutasyonlari x (h,k,i) birlikte ± x l ± (24).
// (hkl) ile (h̄k̄l̄) ayni duzlem takimidir, [uvw] ile [ūv̄w̄] zit yonlu ayni
// dogrultudur; cizimde her ciftten yalnizca biri gosterilir.
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
function familyCubic(v) {
  const out = [];
  const seen = new Set();
  const add = (x) => {
    const k = x.join(',');
    const kn = x.map((y) => -y || 0).join(',');
    if (seen.has(k) || seen.has(kn)) return;
    seen.add(k);
    out.push(x);
  };
  add(v.map((x) => x || 0));
  for (const p of PERMS)
    for (let sg = 0; sg < 8; sg++) {
      add(p.map((j, i) => (sg & (1 << i) ? -v[j] : v[j]) || 0));
    }
  return out;
}
// v4 = [h, k, i, l] -> esdegerler (4-indis)
function familyHex(v4) {
  const out = [];
  const seen = new Set();
  const add = (x) => {
    const k = x.join(',');
    const kn = x.map((y) => -y || 0).join(',');
    if (seen.has(k) || seen.has(kn)) return;
    seen.add(k);
    out.push(x);
  };
  add(v4.map((x) => x || 0));
  const hki = v4.slice(0, 3);
  for (const p of PERMS)
    for (const s1 of [1, -1])
      for (const s2 of [1, -1]) add([...p.map((j) => s1 * hki[j] || 0), s2 * v4[3] || 0]);
  return out;
}
// Aile uyelerine verilen renkler (ilki her zaman ana renk)
const PLANE_COLS = [0xffc107, 0xff7043, 0x26c6da, 0x9ccc65, 0xec407a, 0x7e57c2, 0x29b6f6, 0xd4e157];
const DIR_COLS = [0xd05ce3, 0x4dd0e1, 0xffb74d, 0x81c784, 0xf06292, 0x9575cd, 0x4fc3f7, 0xdce775];
const cssCol = (c) => '#' + c.toString(16).padStart(6, '0');

const isHex = () => state.current.system === 'hexagonal';
const isCompound = () => state.current.category === 'compound';

function stepper(label, id, value, ro = false) {
  if (ro) {
    return `<div class="stp ro"><span class="lbl">${label}</span>
      <div class="strow"><output id="${id}" title="${t('derived')}">${value}</output></div></div>`;
  }
  return `<div class="stp"><label class="lbl" for="${id}">${label}</label>
    <div class="strow">
      <button class="sbtn" data-t="${id}" data-d="-1" aria-label="${label} −1">−</button>
      <input type="text" inputmode="numeric" autocomplete="off" id="${id}" value="${value}">
      <button class="sbtn" data-t="${id}" data-d="1" aria-label="${label} +1">+</button>
    </div></div>`;
}

// --- panel -----------------------------------------------------------------
function renderPanel() {
  const hex = isHex();
  const comp = isCompound();
  const cat = state.current.category;
  const I = state.idx[state.current.system];
  const metalBtns = Object.values(STRUCTURES)
    .map((s) => `<button class="seg sbtn-st" data-st="${s.id}" title="${t('name_' + s.id)}">${t('abbr_' + s.id)}</button>`)
    .join('');
  const compBtns = Object.values(COMPOUNDS)
    .map((s) => `<button class="seg sbtn-st" data-st="${s.id}" title="${t('name_' + s.id)}">${s.formula}</button>`)
    .join('');

  const [ph, pk, pl] = I.p;
  const [du, dv, dw] = I.d;
  const planeInputs = hex
    ? stepper('h', 'p_h', ph) + stepper('k', 'p_k', pk) + stepper('i', 'p_i', -(ph + pk), true) + stepper('l', 'p_l', pl)
    : stepper('h', 'p_h', ph) + stepper('k', 'p_k', pk) + stepper('l', 'p_l', pl);
  const dirInputs = hex
    ? stepper('u', 'd_u', du) + stepper('v', 'd_v', dv) + stepper('t', 'd_t', -(du + dv), true) + stepper('w', 'd_w', dw)
    : stepper('u', 'd_u', du) + stepper('v', 'd_v', dv) + stepper('w', 'd_w', dw);

  let html = `
    <div class="phead">
      <div><h1>${t('title')}</h1><p class="sub">${t('subtitle')}</p></div>
      <button id="closePanel" class="close-panel" aria-label="${t('close')}">✕</button>
    </div>
    <section>
      <div class="catrow">
        <button class="seg cat ${cat === 'metal' ? 'active' : ''}" data-cat="metal">${t('cat_metal')}</button>
        <button class="seg cat ${cat === 'compound' ? 'active' : ''}" data-cat="compound">${t('cat_compound')}</button>
      </div>
      <h2>${t('sec_structure')}</h2>
      <div class="btnrow">${cat === 'metal' ? metalBtns : compBtns}</div>
      <div id="structInfo" class="info"></div>
    </section>

    <section>
      <h2>${t('sec_view')}</h2>
      <div class="btnrow">
        <button data-mode="ball" class="seg ${state.mode === 'ball' ? 'active' : ''}">${t('ballstick')}</button>
        <button data-mode="space" class="seg ${state.mode === 'space' ? 'active' : ''}">${t('spacefill')}</button>
      </div>
      <div class="toggles">
        <label><input type="checkbox" data-vis="atoms" ${state.vis.atoms ? 'checked' : ''}> ${t('atoms')}</label>
        <label><input type="checkbox" data-vis="axes" ${state.vis.axes ? 'checked' : ''}> ${t('axes')}</label>
        <label><input type="checkbox" data-vis="cell" ${state.vis.cell ? 'checked' : ''}> ${t('cell')}</label>
        <label><input type="checkbox" id="tHl" ${state.hl ? 'checked' : ''}> ${t('highlight')}</label>
      </div>
    </section>`;

  if (comp) {
    html += `
    <section>
      <h2>${t('sec_void')}</h2>
      <div id="voidInfo" class="voidbox"></div>
    </section>`;
  } else {
    html += `
    <section>
      <h2>${t('sec_apf')}</h2>
      <button id="calcAPF" class="calc">${t('calcAPF')}</button>
      <div id="apfOut" class="out"></div>
    </section>`;
  }

  html += `
    <section>
      <h2>${hex ? t('sec_plane_hex') : t('sec_plane')}</h2>
      <div class="indices${hex ? ' hex' : ''}" data-enter="drawPlane">${planeInputs}</div>
      <div class="btnrow">
        <button id="drawPlane" class="primary">${t('drawPlane')}</button>
        <button id="famPlane" title="${t('fam_plane_tip')}">${hex ? '{hkil}' : '{hkl}'}</button>
        <button id="clearPlane">${t('clear')}</button>
      </div>
      <div id="planeOut" class="out"></div>
      ${comp ? '' : `<button id="calcDAY" class="calc">${t('calcDAY')}</button><div id="dayOut" class="out"></div>`}
    </section>

    <section>
      <h2>${hex ? t('sec_dir_hex') : t('sec_dir')}</h2>
      <div class="indices${hex ? ' hex' : ''}" data-enter="drawDir">${dirInputs}</div>
      <div class="btnrow">
        <button id="drawDir" class="primary">${t('drawDir')}</button>
        <button id="famDir" title="${t('fam_dir_tip')}">${hex ? '&lt;uvtw&gt;' : '&lt;uvw&gt;'}</button>
        <button id="clearDir">${t('clear')}</button>
      </div>
      <div id="dirOut" class="out"></div>
      ${comp ? '' : `<button id="calcLAY" class="calc">${t('calcLAY')}</button><div id="layOut" class="out"></div>`}
    </section>

    <section class="foot">
      <details>
        <summary>${t('notes')}</summary>
        <p>${t('note_lay')}</p>
        <p>${t('note_day')}</p>
        <p>${t('note_apf')}</p>
        <p>${t('note_neg')}</p>
        <p>${t('note_view')}</p>
      </details>
    </section>`;

  $('panel').innerHTML = html;
  $('resetBtn').textContent = '⟳ ' + t('resetView');
  $('resetBtn').title = t('resetView');
  $('menuBtn').setAttribute('aria-label', t('menu'));
  $('gearBtn').setAttribute('aria-label', t('settings'));
  $('gearBtn').title = t('settings');
  bindPanel();
  renderStructInfo();
  if (comp) renderVoidInfo();
  updateLegend();
  // Cizili duzlem/dogrultu varsa aciklamalari yeniden yaz (dil degisimi)
  if (state.plane) showPlane();
  if (state.dir) showDir();
}

function renderStructInfo() {
  const s = state.current;
  let rows;
  if (s.category === 'compound') {
    const cat = s.species[s.cation];
    const an = s.species[s.anion];
    rows = [
      [t('i_formula'), s.formula],
      [t('i_type'), t('type_' + s.id)],
      [t('i_coord'), s.coordination],
      [t('i_radii'), `${cat.label} ${cat.pm} · ${an.label} ${an.pm} pm`],
      [t('i_ratio'), fmt(cat.pm / an.pm, 3)],
      [t('i_example'), t('ex_' + s.id)],
    ];
  } else {
    rows = [
      [t('i_name'), t('name_' + s.id)],
      [t('i_system'), s.system === 'cubic' ? t('cubic') : t('hexagonal')],
      [t('i_atoms_cell'), s.atomsPerCell],
      [t('i_coord'), s.coordination],
      [t('i_apf'), fmt(s.apf, 4)],
      [t('i_a'), `a = ${fmt(s.aOverR, 4)}·r`],
    ];
    if (s.cOverA) rows.push([t('i_ca'), fmt(s.cOverA, 3)]);
    rows.push([t('i_example'), t('ex_' + s.id)]);
  }
  $('structInfo').innerHTML = rows
    .map((r) => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`)
    .join('');
}

function renderVoidInfo() {
  const s = state.current;
  const general =
    s.voidType === 'octahedral' ? t('void_oct') : s.voidType === 'cubic' ? t('void_cubic') : t('void_tet');
  $('voidInfo').innerHTML = `<p>${t('void_' + s.id)}</p><p class="dim">${general}</p>`;
}

function updateLegend() {
  const s = state.current;
  const hexCol = (c) => '#' + c.toString(16).padStart(6, '0');
  let items;
  if (s.category === 'compound') {
    items = [
      [hexCol(s.species.A.color), s.species.A.label],
      [hexCol(s.species.B.color), s.species.B.label],
    ];
  } else if (s.system === 'hexagonal') {
    items = [
      ['#ff9800', 'a₁ a₂ a₃'],
      ['#00bcd4', 'c'],
    ];
  } else {
    items = [
      ['#e53935', 'x'],
      ['#43a047', 'y'],
      ['#1e88e5', 'z'],
    ];
  }
  items.push(['#dfe6ee', t('cell')], ['#ffc107', t('leg_plane')], ['#d05ce3', t('leg_dir')]);
  $('legend').innerHTML = items.map((i) => `<span><i style="background:${i[0]}"></i>${i[1]}</span>`).join('');
}

// --- okuma -----------------------------------------------------------------
function readInt(id) {
  const el = $(id);
  const raw = String(el.value).replace(/[−–]/g, '-').trim();
  let n = parseInt(raw, 10);
  if (!Number.isFinite(n)) n = 0;
  n = Math.max(-IDX_MAX, Math.min(IDX_MAX, n));
  if (String(n) !== el.value) el.value = n;
  return n;
}
function readPlane() {
  const p = [readInt('p_h'), readInt('p_k'), readInt('p_l')];
  state.idx[state.current.system].p = p;
  return p;
}
function readDir() {
  const d = [readInt('d_u'), readInt('d_v'), readInt('d_w')];
  state.idx[state.current.system].d = d;
  return d;
}

// --- olay baglama ----------------------------------------------------------
function bindPanel() {
  document.querySelectorAll('[data-cat]').forEach((b) => {
    b.onclick = () => {
      if (b.dataset.cat === state.current.category) return;
      selectStructure(b.dataset.cat === 'metal' ? STRUCTURES.BK : COMPOUNDS.NaCl);
    };
  });
  document.querySelectorAll('.sbtn-st').forEach((b) => {
    b.classList.toggle('active', b.dataset.st === state.current.id);
    b.onclick = () => {
      selectStructure(ALL_STRUCTURES[b.dataset.st]);
      closePanelMobile();
    };
  });

  // stepper + / −
  document.querySelectorAll('.sbtn').forEach((b) => {
    b.onclick = () => {
      const inp = $(b.dataset.t);
      let val = readInt(b.dataset.t) + parseInt(b.dataset.d, 10);
      val = Math.max(-IDX_MAX, Math.min(IDX_MAX, val));
      inp.value = val;
      inp.dispatchEvent(new Event('input'));
    };
  });
  // HSP: i = −(h+k), t = −(u+v)
  if (isHex()) {
    const num = (id) => parseInt(String($(id).value).replace(/[−–]/g, '-'), 10) || 0;
    const syncP = () => ($('p_i').value = -(num('p_h') + num('p_k')));
    const syncD = () => ($('d_t').value = -(num('d_u') + num('d_v')));
    ['p_h', 'p_k'].forEach((id) => $(id).addEventListener('input', syncP));
    ['d_u', 'd_v'].forEach((id) => $(id).addEventListener('input', syncD));
  }
  // Enter -> ciz
  document.querySelectorAll('[data-enter] input').forEach((inp) => {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $(inp.closest('[data-enter]').dataset.enter).click();
    });
    inp.addEventListener('focus', () => inp.select());
  });

  document.querySelectorAll('[data-mode]').forEach((b) => {
    b.onclick = () => {
      state.mode = b.dataset.mode;
      document.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('active', x === b));
      scene.setAtomMode(state.mode);
    };
  });
  document.querySelectorAll('[data-vis]').forEach((cb) => {
    cb.onchange = () => {
      state.vis[cb.dataset.vis] = cb.checked;
      applyVisibility();
    };
  });

  $('tHl').onchange = (e) => {
    state.hl = e.target.checked;
    updateHighlight();
    if (state.plane) showPlane();
    if (state.dir) showDir();
  };
  $('drawPlane').onclick = () => drawPlane();
  $('famPlane').onclick = () => drawPlane(true);
  $('clearPlane').onclick = () => {
    scene.clearPlane();
    state.plane = null;
    updateHighlight();
    $('planeOut').innerHTML = '';
    if ($('dayOut')) $('dayOut').innerHTML = '';
  };
  $('drawDir').onclick = () => drawDir();
  $('famDir').onclick = () => drawDir(true);
  $('clearDir').onclick = () => {
    scene.clearDirection();
    state.dir = null;
    updateHighlight();
    $('dirOut').innerHTML = '';
    if ($('layOut')) $('layOut').innerHTML = '';
  };
  if ($('calcLAY')) $('calcLAY').onclick = onCalcLAY;
  if ($('calcDAY')) $('calcDAY').onclick = onCalcDAY;
  if ($('calcAPF')) $('calcAPF').onclick = onCalcAPF;
  $('closePanel').onclick = closePanelMobile;
}

function applyVisibility() {
  scene.groups.atoms.visible = state.vis.atoms;
  scene.groups.bonds.visible = state.vis.atoms;
  scene.groups.axes.visible = state.vis.axes;
  scene.groups.cell.visible = state.vis.cell;
}

// --- vurgulama --------------------------------------------------------------
// Hucredeki atom merkezlerinden hangileri cizili duzlem(ler)de ya da
// dogrultu(lar) uzerinde? Koordinatlar model (Kartezyen, a = 1) uzayinda.
const ON_EPS = 1e-4;
function planeTests() {
  if (!state.plane) return [];
  return state.plane.members.map(({ hkl, res }) => {
    const n = planeNormal(state.current, ...hkl);
    return { n, m: res.m, len: n.length() };
  });
}
function dirTests() {
  if (!state.dir) return [];
  return state.dir.members.map(({ res }) => {
    const v = new THREE_V().subVectors(res.end, res.start);
    return { s: res.start, v, L2: v.lengthSq() };
  });
}
function onPlane(p, T) {
  return T.some(({ n, m, len }) => Math.abs(n.dot(p) - m) / len < ON_EPS);
}
function onDir(p, T) {
  return T.some(({ s, v, L2 }) => {
    const w = new THREE_V().subVectors(p, s);
    const tt = w.dot(v) / L2;
    if (tt < -ON_EPS || tt > 1 + ON_EPS) return false;
    return w.addScaledVector(v, -tt).length() < ON_EPS;
  });
}
function updateHighlight() {
  if (!state.hl || (!state.plane && !state.dir)) {
    scene.setHighlight(null);
    return;
  }
  const P = planeTests();
  const D = dirTests();
  scene.setHighlight((p) => ({ plane: onPlane(p, P), dir: onDir(p, D) }));
}

// --- duzlem ----------------------------------------------------------------
function drawPlane(family = false) {
  const hkl = readPlane();
  if (hkl.every((x) => x === 0)) {
    $('planeOut').innerHTML = `<i>${t('err_zero')}</i>`;
    return null;
  }
  const hex = isHex();
  let list;
  if (!family) list = [hkl];
  else if (hex) list = familyHex([hkl[0], hkl[1], -(hkl[0] + hkl[1]), hkl[2]]).map((v) => [v[0], v[1], v[3]]);
  else list = familyCubic(hkl);
  const members = list.map((x) => ({
    hkl: x,
    res: hex ? hexPlanePolygon(state.current, ...x) : cubicPlanePolygon(...x),
  }));
  scene.setPlanes(members.map((mb, i) => ({ poly: mb.res.poly, color: PLANE_COLS[i % PLANE_COLS.length] })));
  state.plane = { hkl, members, family };
  updateHighlight();
  if ($('dayOut')) $('dayOut').innerHTML = '';
  showPlane();
  return state.plane;
}

const planeIdx = (x) => (isHex() ? idxHTML([x[0], x[1], -(x[0] + x[1]), x[2]], '(', ')') : idxHTML(x, '(', ')'));

function showPlane() {
  const { hkl, members, family } = state.plane;
  const res = members[0].res;
  const [h, k, l] = hkl;
  const hex = isHex();
  let txt;
  if (family) {
    const fam = hex ? idxHTML([h, k, -(h + k), l], '{', '}') : idxHTML(hkl, '{', '}');
    txt = t('fam_plane', { x: fam, n: members.length });
    txt += `<div class="famlist">${members
      .map((mb, i) => `<span><i style="background:${cssCol(PLANE_COLS[i % PLANE_COLS.length])}"></i>${planeIdx(mb.hkl)}</span>`)
      .join('')}</div>`;
    txt += `<i>${t('fam_note_plane')}</i>`;
  } else {
    txt = t('drawn_plane', { x: planeIdx(hkl) });
    if (!res.poly.length) txt += `<br><i>${t('err_plane_out')}</i>`;
  }

  // d = 1/|n| (a birimi); n = h·b1 + k·b2 + l·b3
  const d = 1 / planeNormal(state.current, h, k, l).length();
  const formula = hex ? t('dspacing_hex') : t('dspacing_cubic');
  const inR = !isCompound() ? ` = ${fmt(d * state.current.aOverR)}·r` : '';
  txt += `<div class="kv"><span>${formula}</span><b>d = ${fmt(d)}·a${inR}</b></div>`;

  if (!family) {
    const sh = res.shift;
    if (!hex && (sh.x || sh.y || sh.z)) txt += `<i>${t('origin_shift', { x: sh.x, y: sh.y, z: sh.z })}</i>`;
    else if (hex && res.shifted) txt += `<i>${t('origin_shift_hex')}</i>`;
  }
  if (state.hl && scene.highlightCount) {
    txt += `<div class="hlnote plane">● ${t('hl_plane', { n: scene.highlightCount.plane })}</div>`;
  }
  $('planeOut').innerHTML = txt;
}

// --- dogrultu --------------------------------------------------------------
function dirRes(uvw) {
  const [u, v, w] = uvw;
  return isHex() ? hcpDirection(state.current, u, v, -(u + v), w) : cubicDirection(u, v, w);
}
const dirArr = (x) => (isHex() ? [x[0], x[1], -(x[0] + x[1]), x[2]] : x);

function drawDir(family = false) {
  const uvw = readDir();
  if (uvw.every((x) => x === 0)) {
    $('dirOut').innerHTML = `<i>${t('err_zero')}</i>`;
    return null;
  }
  const hex = isHex();
  let list;
  if (!family) list = [uvw];
  else if (hex) list = familyHex(dirArr(uvw)).map((v) => [v[0], v[1], v[3]]);
  else list = familyCubic(uvw);
  const members = list.map((x) => ({ uvw: x, res: dirRes(x) }));
  scene.setDirections(
    members.map((mb, i) => ({
      start: mb.res.start,
      end: mb.res.end,
      label: idxParts(dirArr(mb.uvw), '[', ']'),
      color: DIR_COLS[i % DIR_COLS.length],
      labelColor: i === 0 ? '#e1a6ee' : cssCol(DIR_COLS[i % DIR_COLS.length]),
    }))
  );
  state.dir = { uvw, members, family };
  updateHighlight();
  if ($('layOut')) $('layOut').innerHTML = '';
  showDir();
  return state.dir;
}

function showDir() {
  const { uvw, members, family } = state.dir;
  const res = members[0].res;
  const hex = isHex();
  let txt;
  if (family) {
    txt = t('fam_dir', { x: idxHTML(dirArr(uvw), '&lt;', '&gt;'), n: members.length, n2: members.length * 2 });
    txt += `<div class="famlist">${members
      .map((mb, i) => `<span><i style="background:${cssCol(DIR_COLS[i % DIR_COLS.length])}"></i>${idxHTML(dirArr(mb.uvw), '[', ']')}</span>`)
      .join('')}</div>`;
    txt += `<i>${t('fam_note_dir')}</i>`;
  } else {
    txt = t('drawn_dir', { x: idxHTML(dirArr(uvw), '[', ']') });
    if (hex) {
      const r3 = reduce3([res.U, res.V, res.W]);
      txt += `<div class="kv"><span>${t('hcp3_rule')}</span><b>${idxHTML(r3, '[', ']')}</b></div>`;
    }
    const s = res.start;
    if (!hex && (s.x || s.y || s.z)) txt += `<i>${t('origin_shift', { x: s.x, y: s.y, z: s.z })}</i>`;
  }
  if (state.hl && scene.highlightCount) {
    txt += `<div class="hlnote dir">● ${t('hl_dir', { n: scene.highlightCount.dir })}</div>`;
  }
  $('dirOut').innerHTML = txt;
}

// --- hesaplar --------------------------------------------------------------
function resultBox(formula, rows, note) {
  return `<div class="result">
    <div class="formula">${formula}</div>
    ${rows.map((r) => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}
    ${note ? `<small>${note}</small>` : ''}</div>`;
}

function onCalcLAY() {
  const d = drawDir(!!(state.dir && state.dir.family));
  if (!d) {
    $('layOut').innerHTML = '';
    return;
  }
  const s = state.current;
  const r0 = d.members[0].res;
  const uvw = isHex() ? [r0.U, r0.V, r0.W] : d.uvw;
  const r = computeLAY(s, uvw);
  if (!r) return ($('layOut').innerHTML = `<i>${t('err_no_line')}</i>`);
  $('layOut').innerHTML = resultBox(
    t('lay_formula'),
    [
      [t('r_n_line'), r.n],
      [t('r_len'), `${fmt(r.len_a)}·a = ${fmt(r.len_R)}·r`],
      [t('r_lay'), `${fmt(r.LAY_per_a)} /a`],
      [t('r_lay_r'), `<span class="hl">${fmt(r.LAY_per_R)} /r</span>`],
    ],
    d.family ? t('lay_def') + ' ' + t('fam_same_lay') : t('lay_def')
  );
}

function onCalcDAY() {
  const p = drawPlane(!!(state.plane && state.plane.family));
  if (!p) {
    $('dayOut').innerHTML = '';
    return;
  }
  const r = computeDAY(state.current, p.hkl, p.members[0].res.m);
  if (!r) return ($('dayOut').innerHTML = `<i>${t('err_no_plane_lat')}</i>`);
  const rows = [
    [t('r_n_plane'), r.n],
    [t('r_area'), `${fmt(r.area_a2)}·a² = ${fmt(r.area_R2)}·r²`],
    [t('r_day'), `${fmt(r.DAY_per_a2)} /a²`],
    [t('r_day_r'), `<span class="hl">${fmt(r.DAY_per_R2)} /r²</span>`],
  ];
  let note = r.n === 0 ? t('day_empty') : t('day_def');
  if (p.family && r.n) note += ' ' + t('fam_same_day');
  $('dayOut').innerHTML = resultBox(t('day_formula'), rows, note);
}

function onCalcAPF() {
  const s = state.current;
  const n = s.atomsPerCell;
  const k = s.aOverR; // a = k·r
  const vAtoms = n * (4 / 3) * Math.PI; // r³ cinsinden
  let vCell;
  let cellRow;
  if (s.system === 'hexagonal') {
    vCell = ((3 * Math.sqrt(3)) / 2) * k * k * (s.cOverA * k);
    cellRow = [t('apf_vcell_hex'), `${fmt(vCell)}·r³`];
  } else {
    vCell = k ** 3;
    cellRow = [`V<sub>${t('cell_sub')}</sub> = a³ = (${fmt(k, 3)}·r)³`, `${fmt(vCell)}·r³`];
  }
  $('apfOut').innerHTML = resultBox(
    t('apf_formula'),
    [
      [t('apf_n'), n],
      [t('i_a'), `a = ${fmt(k, 4)}·r`],
      [t('apf_vatoms', { n }), `${fmt(vAtoms)}·r³`],
      cellRow,
      [t('apf_val'), `<span class="hl">${fmt(vAtoms / vCell, 4)}</span> (${pct(vAtoms / vCell)})`],
    ],
    t('apf_def')
  );
}

// --- yapi secimi -----------------------------------------------------------
function selectStructure(s) {
  state.current = s;
  scene.setStructure(s);
  scene.setAtomMode(state.mode);
  scene.clearPlane();
  scene.clearDirection();
  state.plane = null;
  state.dir = null;
  scene.setHighlight(null);
  applyVisibility();
  renderPanel();
}

// --- mobil panel -----------------------------------------------------------
function openPanel() {
  $('panel').classList.add('open');
  $('scrim').classList.add('show');
}
function closePanelMobile() {
  $('panel').classList.remove('open');
  $('scrim').classList.remove('show');
}

// --- ayarlar ---------------------------------------------------------------
function renderSettings() {
  $('settings').innerHTML = `
    <div class="modal-card">
      <div class="modal-head"><h2>${t('settings')}</h2><button id="closeSet" aria-label="${t('close')}">✕</button></div>
      <div class="set-sec">
        <h3>${t('language')}</h3>
        <div class="btnrow">
          <button class="seg lang ${getLang() === 'tr' ? 'active' : ''}" data-lang="tr">Türkçe</button>
          <button class="seg lang ${getLang() === 'en' ? 'active' : ''}" data-lang="en">English</button>
        </div>
      </div>
      <div class="set-sec">
        <h3>${t('contact')}</h3>
        <p>${t('contact_text')}</p>
        <a class="contact-link" href="mailto:${CONTACT_EMAIL}">✉ ${CONTACT_EMAIL}</a>
      </div>
      <div class="set-sec">
        <h3>${t('about')}</h3>
        <p class="dim">${t('about_text')}</p>
      </div>
      <button id="closeSet2" class="primary wide">${t('close')}</button>
    </div>`;
  document.querySelectorAll('[data-lang]').forEach((b) => {
    b.onclick = () => {
      setLang(b.dataset.lang);
      applyDocLang();
      renderPanel();
      renderSettings();
    };
  });
  $('closeSet').onclick = $('closeSet2').onclick = closeSettings;
}
function closeSettings() {
  $('settings').classList.add('hidden');
}
function applyDocLang() {
  document.documentElement.lang = getLang();
  document.title = t('doc_title');
}

$('gearBtn').onclick = () => {
  renderSettings();
  $('settings').classList.remove('hidden');
  $('closeSet2').focus();
};
$('settings').onclick = (e) => {
  if (e.target.id === 'settings') closeSettings();
};
$('menuBtn').onclick = () => ($('panel').classList.contains('open') ? closePanelMobile() : openPanel());
$('scrim').onclick = closePanelMobile;
$('resetBtn').onclick = () => scene.resetView();
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  closeSettings();
  closePanelMobile();
});

// --- baslat ----------------------------------------------------------------
applyDocLang();
selectStructure(STRUCTURES.BK);
