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
import { computeLAY, computeDAY } from './density.js';
import { t, getLang, setLang } from './i18n.js';

const CONTACT_EMAIL = 'contact@ilhanyurek.com';

const app = document.getElementById('app');
// Sabit iskelet: canvas yeniden olusturulmaz (WebGL baglami korunur)
app.innerHTML = `
  <div id="viewport">
    <canvas id="gl"></canvas>
    <button id="menuBtn" class="menu-btn" aria-label="menu">☰</button>
    <button id="gearBtn" class="gear-btn" aria-label="settings">⚙</button>
    <button id="resetBtn" class="reset-btn"></button>
    <div id="legend" class="legend"></div>
  </div>
  <aside id="panel" class="panel"></aside>
  <div id="settings" class="modal hidden"></div>
`;

let scene;
try {
  scene = new CrystalScene(document.getElementById('gl'));
} catch (e) {
  document.getElementById('viewport').innerHTML =
    `<div class="glfail">
       <h2>⚠️ ${t('glfail_title')}</h2>
       <p>${t('glfail_body')}</p>
       <p style="opacity:.6;font-size:12px">${(e && e.message) || e}</p>
     </div>`;
  throw e;
}
let current = STRUCTURES.BK;
let category = 'metal';
let lastPlane = null;
let lastDir = null;

// --- yardimcilar -----------------------------------------------------------
const ov = (n) => (n < 0 ? '−' + Math.abs(n) : '' + n);
const planeStr = (arr) => '(' + arr.map(ov).join(' ') + ')';
const dirStr = (arr) => '[' + arr.map(ov).join(' ') + ']';
const fmt = (x) => (Number.isFinite(x) ? x.toFixed(3) : '—');
const $ = (id) => document.getElementById(id);

function stepper(label, id, value, ro = false) {
  if (ro) {
    return `<div class="stp ro"><span class="lbl">${label}</span>
      <div class="strow"><input type="text" id="${id}" value="${value}" readonly></div></div>`;
  }
  return `<div class="stp"><span class="lbl">${label}</span>
    <div class="strow">
      <button class="sbtn" data-t="${id}" data-d="-1">−</button>
      <input type="number" inputmode="numeric" pattern="-?[0-9]*" id="${id}" value="${value}">
      <button class="sbtn" data-t="${id}" data-d="1">+</button>
    </div></div>`;
}

// --- panel render ----------------------------------------------------------
function renderPanel() {
  const hex = current.system === 'hexagonal';
  const isCompound = current.category === 'compound';
  const metalBtns = Object.values(STRUCTURES)
    .map((s) => `<button class="seg sbtn-st" data-st="${s.id}" title="${t('name_' + s.id)}">${t('abbr_' + s.id)}</button>`)
    .join('');
  const compBtns = Object.values(COMPOUNDS)
    .map((s) => `<button class="seg sbtn-st" data-st="${s.id}" title="${t('name_' + s.id)}">${s.formula}</button>`)
    .join('');

  const planeInputs = hex
    ? stepper('h', 'p_h', 1) + stepper('k', 'p_k', 0) + stepper('i', 'p_i', -1, true) + stepper('l', 'p_l', 0)
    : stepper('h', 'p_h', 1) + stepper('k', 'p_k', 0) + stepper('l', 'p_l', 0);
  const dirInputs = hex
    ? stepper('u', 'd_u', 1) + stepper('v', 'd_v', 0) + stepper('t', 'd_t', -1, true) + stepper('w', 'd_w', 0)
    : stepper('u', 'd_u', 1) + stepper('v', 'd_v', 1) + stepper('w', 'd_w', 0);

  let sections = `
    <section>
      <div class="catrow">
        <button class="seg cat ${category === 'metal' ? 'active' : ''}" data-cat="metal">${t('cat_metal')}</button>
        <button class="seg cat ${category === 'compound' ? 'active' : ''}" data-cat="compound">${t('cat_compound')}</button>
      </div>
      <h2>${t('sec_structure')}</h2>
      <div id="structBtns" class="btnrow">${category === 'metal' ? metalBtns : compBtns}</div>
      <div id="structInfo" class="info"></div>
    </section>

    <section>
      <h2>${t('sec_view')}</h2>
      <div class="btnrow">
        <button data-mode="ball" class="seg active">${t('ballstick')}</button>
        <button data-mode="space" class="seg">${t('spacefill')}</button>
      </div>
      <div class="toggles">
        <label><input type="checkbox" id="tAtoms" checked> ${t('atoms')}</label>
        <label><input type="checkbox" id="tAxes" checked> ${t('axes')}</label>
        <label><input type="checkbox" id="tCell" checked> ${t('cell')}</label>
      </div>
    </section>`;

  if (isCompound) {
    sections += `
    <section>
      <h2>${t('sec_void')}</h2>
      <div id="voidInfo" class="voidbox"></div>
    </section>`;
  } else {
    sections += `
    <section>
      <button id="calcAPF" class="calc">${t('calcAPF')}</button>
      <div id="apfOut" class="out"></div>
    </section>`;
  }

  sections += `
    <section>
      <h2>${t('sec_plane')}</h2>
      <div id="planeInputs" class="indices${hex ? ' hex' : ''}">${planeInputs}</div>
      <div class="btnrow">
        <button id="drawPlane" class="primary">${t('drawPlane')}</button>
        <button id="clearPlane">${t('clear')}</button>
      </div>
      <div id="planeOut" class="out"></div>
      ${isCompound ? '' : `<button id="calcDAY" class="calc">${t('calcDAY')}</button><div id="dayOut" class="out"></div>`}
    </section>

    <section>
      <h2>${t('sec_dir')}</h2>
      <div id="dirInputs" class="indices${hex ? ' hex' : ''}">${dirInputs}</div>
      <div class="btnrow">
        <button id="drawDir" class="primary">${t('drawDir')}</button>
        <button id="clearDir">${t('clear')}</button>
      </div>
      <div id="dirOut" class="out"></div>
      ${isCompound ? '' : `<button id="calcLAY" class="calc">${t('calcLAY')}</button><div id="layOut" class="out"></div>`}
    </section>

    <section>
      <h2>${t('contact')}</h2>
      <p class="dim" style="margin:0 0 8px;font-size:13px">${t('contact_text')}</p>
      <a class="contact-link" href="mailto:${CONTACT_EMAIL}">✉ ${CONTACT_EMAIL}</a>
    </section>

    <section class="foot">
      <details>
        <summary>${t('notes')}</summary>
        <p>${t('note_lay')}</p>
        <p>${t('note_day')}</p>
        <p>${t('note_apf')}</p>
        <p>${t('note_neg')}</p>
      </details>
    </section>`;

  $('panel').innerHTML = `
    <h1>${t('title')}</h1>
    <p class="sub">${t('subtitle')}</p>
    ${sections}`;

  $('resetBtn').textContent = '⟳ ' + t('resetView');
  bindPanel();
  renderStructInfo();
  if (isCompound) renderVoidInfo();
  updateLegend();
}

function renderStructInfo() {
  const s = current;
  let rows;
  if (s.category === 'compound') {
    rows = [
      [t('i_formula'), s.formula],
      [t('i_system'), t('cubic')],
      [t('i_coord'), s.coordination],
      [t('i_type'), t('type_' + s.id)],
      [t('i_example'), t('ex_' + s.id)],
    ];
  } else {
    rows = [
      [t('i_name'), t('name_' + s.id)],
      [t('i_system'), s.system === 'cubic' ? t('cubic') : t('hexagonal')],
      [t('i_atoms_cell'), s.atomsPerCell],
      [t('i_coord'), s.coordination],
      [t('i_apf'), s.apf.toFixed(4)],
      [t('i_ar'), s.aOverR.toFixed(4) + '·r'],
    ];
    if (s.cOverA) rows.push([t('i_ca'), s.cOverA.toFixed(3)]);
    rows.push([t('i_example'), t('ex_' + s.id)]);
  }
  $('structInfo').innerHTML = rows
    .map((r) => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`)
    .join('');
}

function renderVoidInfo() {
  const s = current;
  const general =
    s.voidType === 'octahedral'
      ? t('void_oct')
      : s.voidType === 'cubic'
      ? t('void_cubic')
      : t('void_tet');
  $('voidInfo').innerHTML = `<p>${t('void_' + s.id)}</p><p class="dim">${general}</p>`;
}

function updateLegend() {
  const s = current;
  let items;
  if (s.category === 'compound') {
    items = [
      ['#' + s.species.A.color.toString(16).padStart(6, '0'), s.species.A.label],
      ['#' + s.species.B.color.toString(16).padStart(6, '0'), s.species.B.label],
      ['#dfe6ee', t('cell')],
      ['#ffc107', t('sec_plane').replace(' (hkl)', '')],
      ['#9c27b0', t('sec_dir').replace(' [uvw]', '')],
    ];
  } else if (s.system === 'hexagonal') {
    items = [
      ['#ff9800', 'a1·a2·a3'],
      ['#00bcd4', 'c'],
      ['#dfe6ee', t('cell')],
      ['#ffc107', t('sec_plane').replace(' (hkl)', '')],
      ['#9c27b0', t('sec_dir').replace(' [uvw]', '')],
    ];
  } else {
    items = [
      ['#e53935', 'x'],
      ['#43a047', 'y'],
      ['#1e88e5', 'z'],
      ['#dfe6ee', t('cell')],
      ['#ffc107', t('sec_plane').replace(' (hkl)', '')],
      ['#9c27b0', t('sec_dir').replace(' [uvw]', '')],
    ];
  }
  $('legend').innerHTML = items.map((i) => `<span><i style="background:${i[0]}"></i>${i[1]}</span>`).join('');
}

// --- okuma -----------------------------------------------------------------
function readPlane() {
  const h = +$('p_h').value || 0;
  const k = +$('p_k').value || 0;
  const l = +$('p_l').value || 0;
  if (current.system === 'hexagonal') return { h, k, l, i: -(h + k) };
  return { h, k, l };
}
function readDir() {
  const u = +$('d_u').value || 0;
  const v = +$('d_v').value || 0;
  const w = +$('d_w').value || 0;
  if (current.system === 'hexagonal') return { u, v, w, t: -(u + v) };
  return { u, v, w };
}

// --- olay baglama ----------------------------------------------------------
function bindPanel() {
  // kategori
  document.querySelectorAll('[data-cat]').forEach((b) => {
    b.onclick = () => {
      category = b.dataset.cat;
      const first = category === 'metal' ? STRUCTURES.BK : COMPOUNDS.NaCl;
      selectStructure(first);
    };
  });
  // yapi
  document.querySelectorAll('.sbtn-st').forEach((b) => {
    b.onclick = () => selectStructure(ALL_STRUCTURES[b.dataset.st]);
  });
  [...document.querySelectorAll('.sbtn-st')].forEach((b) =>
    b.classList.toggle('active', b.dataset.st === current.id)
  );

  // stepper + / -
  document.querySelectorAll('.sbtn').forEach((b) => {
    b.onclick = () => {
      const inp = $(b.dataset.t);
      let val = (parseInt(inp.value, 10) || 0) + parseInt(b.dataset.d, 10);
      if (val > 6) val = 6;
      if (val < -6) val = -6;
      inp.value = val;
      inp.dispatchEvent(new Event('input'));
    };
  });
  // HCP turetilen indis senkronu
  if (current.system === 'hexagonal') {
    const syncP = () => ($('p_i').value = -((+$('p_h').value || 0) + (+$('p_k').value || 0)));
    const syncD = () => ($('d_t').value = -((+$('d_u').value || 0) + (+$('d_v').value || 0)));
    $('p_h').oninput = syncP;
    $('p_k').oninput = syncP;
    $('d_u').oninput = syncD;
    $('d_v').oninput = syncD;
  }

  // gorunum
  document.querySelectorAll('[data-mode]').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('[data-mode]').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      scene.setAtomMode(b.dataset.mode);
    };
  });
  $('tAtoms').onchange = (e) => (scene.groups.atoms.visible = e.target.checked);
  $('tAxes').onchange = (e) => (scene.groups.axes.visible = e.target.checked);
  $('tCell').onchange = (e) => (scene.groups.cell.visible = e.target.checked);

  // duzlem
  $('drawPlane').onclick = onDrawPlane;
  $('clearPlane').onclick = () => {
    scene.clearPlane();
    $('planeOut').innerHTML = '';
    if ($('dayOut')) $('dayOut').innerHTML = '';
  };
  // dogrultu
  $('drawDir').onclick = onDrawDir;
  $('clearDir').onclick = () => {
    scene.clearDirection();
    $('dirOut').innerHTML = '';
    if ($('layOut')) $('layOut').innerHTML = '';
  };
  if ($('calcLAY')) $('calcLAY').onclick = onCalcLAY;
  if ($('calcDAY')) $('calcDAY').onclick = onCalcDAY;
  if ($('calcAPF')) $('calcAPF').onclick = onCalcAPF;
}

function onDrawPlane() {
  const p = readPlane();
  if (!p.h && !p.k && !p.l) return ($('planeOut').innerHTML = `<i>${t('err_zero')}</i>`);
  const res = current.system === 'hexagonal' ? hexPlanePolygon(current, p.h, p.k, p.l) : cubicPlanePolygon(p.h, p.k, p.l);
  scene.setPlane(res.poly);
  lastPlane = p;
  const label = current.system === 'hexagonal' ? planeStr([p.h, p.k, p.i, p.l]) : planeStr([p.h, p.k, p.l]);
  let txt = t('drawn_plane', { x: `<b>${label}</b>` });
  if (current.system === 'cubic') {
    const s2 = p.h * p.h + p.k * p.k + p.l * p.l;
    const aR = current.aOverR || 2;
    txt += `<br>${t('dspacing', { a: (1 / Math.sqrt(s2)).toFixed(3), r: (aR / Math.sqrt(s2)).toFixed(3) })}`;
    if (res.shift && (res.shift.x || res.shift.y || res.shift.z)) {
      txt += `<br><i>${t('origin_shift', { x: res.shift.x, y: res.shift.y, z: res.shift.z })}</i>`;
    }
  }
  $('planeOut').innerHTML = txt;
}

function onDrawDir() {
  const d = readDir();
  if (!d.u && !d.v && !d.w) return ($('dirOut').innerHTML = `<i>${t('err_zero')}</i>`);
  const r = current.system === 'hexagonal' ? hcpDirection(current, d.u, d.v, d.t, d.w) : cubicDirection(d.u, d.v, d.w);
  const label = current.system === 'hexagonal' ? dirStr([d.u, d.v, d.t, d.w]) : dirStr([d.u, d.v, d.w]);
  scene.setDirection(r.start, r.end, label);
  lastDir = d;
  let txt = t('drawn_dir', { x: `<b>${label}</b>` });
  if (current.system === 'hexagonal') txt += `<br>${t('hcp3', { x: dirStr([r.U, r.V, r.W]) })}`;
  $('dirOut').innerHTML = txt;
}

function onCalcLAY() {
  if (!lastDir) return ($('layOut').innerHTML = `<i>${t('err_no_dir')}</i>`);
  const vec = current.system === 'hexagonal'
    ? hcpDirection(current, lastDir.u, lastDir.v, lastDir.t, lastDir.w).vec
    : cubicDirection(lastDir.u, lastDir.v, lastDir.w).vec;
  const r = computeLAY(current, vec);
  if (!r) return ($('layOut').innerHTML = `<i>${t('err_no_line')}</i>`);
  $('layOut').innerHTML = `<div class="result">
      <div><span>${t('r_spacing')}</span><b>${fmt(r.spacing_a)}·a = ${fmt(r.spacing_R)}·r</b></div>
      <div><span>${t('r_lay')}</span><b>${fmt(r.LAY_per_a)} /a</b></div>
      <div><span>${t('r_lay_r')}</span><b>${fmt(r.LAY_per_R)} /r</b></div>
      <small>${t('lay_def')}</small></div>`;
}

function onCalcDAY() {
  if (!lastPlane) return ($('dayOut').innerHTML = `<i>${t('err_no_plane')}</i>`);
  const n = planeNormal(current, lastPlane.h, lastPlane.k, lastPlane.l);
  const r = computeDAY(current, n);
  if (!r) return ($('dayOut').innerHTML = `<i>${t('err_no_plane_lat')}</i>`);
  $('dayOut').innerHTML = `<div class="result">
      <div><span>${t('r_area')}</span><b>${fmt(r.area_a2)}·a² = ${fmt(r.area_R2)}·r²</b></div>
      <div><span>${t('r_day')}</span><b>${fmt(r.DAY_per_a2)} /a²</b></div>
      <div><span>${t('r_day_r')}</span><b>${fmt(r.DAY_per_R2)} /r²</b></div>
      <small>${t('day_def')}</small></div>`;
}

function onCalcAPF() {
  const s = current;
  const pct = (s.apf * 100).toFixed(2);
  $('apfOut').innerHTML = `<div class="result">
      <div class="formula">${t('apf_formula')}</div>
      <div><span>${t('apf_n')}</span><b>${s.atomsPerCell}</b></div>
      <div><span>a / r</span><b>${s.aOverR.toFixed(4)}</b></div>
      <div><span>${t('apf_val')}</span><b>${s.apf.toFixed(4)}</b></div>
      <div><span>${t('apf_pct')}</span><b>% ${pct}</b></div></div>`;
}

// --- yapi secimi -----------------------------------------------------------
function selectStructure(s) {
  current = s;
  category = s.category;
  scene.setStructure(s);
  scene.clearPlane();
  scene.clearDirection();
  lastPlane = null;
  lastDir = null;
  renderPanel();
}

// --- ayarlar modal ---------------------------------------------------------
function renderSettings() {
  $('settings').innerHTML = `
    <div class="modal-card">
      <div class="modal-head"><h2>${t('settings')}</h2><button id="closeSet">✕</button></div>
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
        <a class="contact-link" href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
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
      renderPanel();
      renderSettings();
    };
  });
  $('closeSet').onclick = $('closeSet2').onclick = () => $('settings').classList.add('hidden');
}

$('gearBtn').onclick = () => {
  renderSettings();
  $('settings').classList.remove('hidden');
};
$('settings').onclick = (e) => {
  if (e.target.id === 'settings') $('settings').classList.add('hidden');
};
$('menuBtn').onclick = () => $('panel').classList.toggle('open');
$('resetBtn').onclick = () => scene.resetView();

// --- baslat ----------------------------------------------------------------
selectStructure(STRUCTURES.BK);
setTimeout(() => scene.resize(), 50);
