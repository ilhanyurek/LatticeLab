// main.js
import './style.css';
import { STRUCTURES, HCP_C_OVER_A } from './crystals.js';
import { CrystalScene } from './scene.js';
import {
  cubicPlanePolygon,
  hexPlanePolygon,
  cubicDirection,
  hcpDirection,
  planeNormal,
} from './geometry.js';
import { computeLAY, computeDAY } from './density.js';

const app = document.getElementById('app');
app.innerHTML = `
  <div id="viewport"><canvas id="gl"></canvas>
    <button id="menuBtn" class="menu-btn" aria-label="menu">☰</button>
    <button id="resetBtn" class="reset-btn">⟳ Görünümü sıfırla</button>
    <div id="legend" class="legend"></div>
  </div>
  <aside id="panel" class="panel">
    <h1>Miller İndisleri 3B</h1>
    <p class="sub">Malzeme Biliminin Temelleri — kristal düzlemleri ve doğrultuları</p>

    <section>
      <h2>Kristal Yapı</h2>
      <div id="structBtns" class="btnrow"></div>
      <div id="structInfo" class="info"></div>
    </section>

    <section>
      <h2>Görünüm</h2>
      <div class="btnrow">
        <button data-mode="ball" class="seg active">Top–çubuk</button>
        <button data-mode="space" class="seg">Dolu (temas)</button>
      </div>
      <div class="toggles">
        <label><input type="checkbox" id="tAtoms" checked> Atomlar</label>
        <label><input type="checkbox" id="tAxes" checked> Eksenler</label>
        <label><input type="checkbox" id="tCell" checked> Hücre</label>
      </div>
    </section>

    <section>
      <h2>Düzlem (hkl)</h2>
      <div id="planeInputs" class="indices"></div>
      <div class="btnrow">
        <button id="drawPlane" class="primary">Düzlemi çiz</button>
        <button id="clearPlane">Temizle</button>
      </div>
      <div id="planeOut" class="out"></div>
      <button id="calcDAY" class="calc">DAY hesapla (Düzlemsel Atom Yoğunluğu)</button>
      <div id="dayOut" class="out"></div>
    </section>

    <section>
      <h2>Doğrultu [uvw]</h2>
      <div id="dirInputs" class="indices"></div>
      <div class="btnrow">
        <button id="drawDir" class="primary">Doğrultuyu çiz</button>
        <button id="clearDir">Temizle</button>
      </div>
      <div id="dirOut" class="out"></div>
      <button id="calcLAY" class="calc">LAY hesapla (Lineer Atom Yoğunluğu)</button>
      <div id="layOut" class="out"></div>
    </section>

    <section class="foot">
      <details>
        <summary>Kısaltmalar & notlar</summary>
        <p>LAY = Lineer Atom Yoğunluğu = doğrultu üzerindeki atom sayısı / uzunluk.</p>
        <p>DAY = Düzlemsel Atom Yoğunluğu = düzlemdeki atom sayısı / alan.</p>
        <p>Negatif indis çubuk yerine eksi (−) ile gösterilir, örn. (−200).</p>
        <p>Kübikler için x–y–z, HSP için a1–a2–a3–c eksenleri hücre dış hattından farklı renktedir.</p>
      </details>
    </section>
  </aside>
`;

const scene = new CrystalScene(document.getElementById('gl'));
let current = STRUCTURES.BK;
let lastPlane = null; // {h,k,l,(i)}
let lastDir = null; // {u,v,w,(t)}

// --- yardimcilar -----------------------------------------------------------
function overbar(n) {
  return n < 0 ? '−' + Math.abs(n) : '' + n;
}
function planeStr(arr) {
  return '(' + arr.map(overbar).join(' ') + ')';
}
function dirStr(arr) {
  return '[' + arr.map(overbar).join(' ') + ']';
}
function fmt(x) {
  return Number.isFinite(x) ? x.toFixed(3) : '—';
}

// --- yapi butonlari --------------------------------------------------------
const structBtns = document.getElementById('structBtns');
Object.values(STRUCTURES).forEach((s) => {
  const b = document.createElement('button');
  b.className = 'seg';
  b.textContent = s.id;
  b.title = s.label;
  b.onclick = () => selectStructure(s);
  structBtns.appendChild(b);
});

function renderStructInfo() {
  const s = current;
  const rows = [
    ['Ad', s.label],
    ['Sistem', s.system === 'cubic' ? 'Kübik' : 'Hekzagonal'],
    ['Atom / hücre', s.atomsPerCell],
    ['Koordinasyon sayısı', s.coordination],
    ['APF (dolma oranı)', s.apf.toFixed(4)],
    ['a / r', s.aOverR.toFixed(4) + '·r'],
  ];
  if (s.cOverA) rows.push(['c / a', s.cOverA.toFixed(3)]);
  rows.push(['Örnek', s.example]);
  document.getElementById('structInfo').innerHTML = rows
    .map((r) => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`)
    .join('');
}

function buildIndexInputs() {
  const hex = current.system === 'hexagonal';
  const planeWrap = document.getElementById('planeInputs');
  const dirWrap = document.getElementById('dirInputs');
  const mk = (labels, prefix) =>
    labels
      .map(
        (lb, i) =>
          `<label class="idx${lb.ro ? ' ro' : ''}">${lb.t}
             <input type="number" id="${prefix}${lb.k}" value="${lb.v}" ${lb.ro ? 'readonly' : ''}>
           </label>`
      )
      .join('');
  if (hex) {
    planeWrap.innerHTML = mk(
      [
        { t: 'h', k: 'h', v: 1 },
        { t: 'k', k: 'k', v: 0 },
        { t: 'i', k: 'i', v: -1, ro: true },
        { t: 'l', k: 'l', v: 0 },
      ],
      'p_'
    );
    dirWrap.innerHTML = mk(
      [
        { t: 'u', k: 'u', v: 1 },
        { t: 'v', k: 'v', v: 0 },
        { t: 't', k: 't', v: -1, ro: true },
        { t: 'w', k: 'w', v: 0 },
      ],
      'd_'
    );
    // i = -(h+k), t = -(u+v) otomatik
    const syncP = () => {
      const h = +document.getElementById('p_h').value || 0;
      const k = +document.getElementById('p_k').value || 0;
      document.getElementById('p_i').value = -(h + k);
    };
    const syncD = () => {
      const u = +document.getElementById('d_u').value || 0;
      const v = +document.getElementById('d_v').value || 0;
      document.getElementById('d_t').value = -(u + v);
    };
    document.getElementById('p_h').oninput = syncP;
    document.getElementById('p_k').oninput = syncP;
    document.getElementById('d_u').oninput = syncD;
    document.getElementById('d_v').oninput = syncD;
  } else {
    planeWrap.innerHTML = mk(
      [
        { t: 'h', k: 'h', v: 1 },
        { t: 'k', k: 'k', v: 0 },
        { t: 'l', k: 'l', v: 0 },
      ],
      'p_'
    );
    dirWrap.innerHTML = mk(
      [
        { t: 'u', k: 'u', v: 1 },
        { t: 'v', k: 'v', v: 1 },
        { t: 'w', k: 'w', v: 0 },
      ],
      'd_'
    );
  }
}

function selectStructure(s) {
  current = s;
  [...structBtns.children].forEach((b) => b.classList.toggle('active', b.textContent === s.id));
  scene.setStructure(s);
  renderStructInfo();
  buildIndexInputs();
  scene.clearPlane();
  scene.clearDirection();
  document.getElementById('planeOut').innerHTML = '';
  document.getElementById('dirOut').innerHTML = '';
  document.getElementById('dayOut').innerHTML = '';
  document.getElementById('layOut').innerHTML = '';
  lastPlane = null;
  lastDir = null;
  updateLegend();
}

function updateLegend() {
  const hex = current.system === 'hexagonal';
  const items = hex
    ? [
        ['#ff9800', 'a1·a2·a3 eksenleri'],
        ['#00bcd4', 'c ekseni'],
        ['#dfe6ee', 'hücre dış hattı'],
        ['#ffc107', 'düzlem'],
        ['#9c27b0', 'doğrultu'],
      ]
    : [
        ['#e53935', 'x'],
        ['#43a047', 'y'],
        ['#1e88e5', 'z'],
        ['#dfe6ee', 'hücre dış hattı'],
        ['#ffc107', 'düzlem'],
        ['#9c27b0', 'doğrultu'],
      ];
  document.getElementById('legend').innerHTML = items
    .map((i) => `<span><i style="background:${i[0]}"></i>${i[1]}</span>`)
    .join('');
}

// --- duzlem ----------------------------------------------------------------
function readPlane() {
  const hex = current.system === 'hexagonal';
  const h = +document.getElementById('p_h').value || 0;
  const k = +document.getElementById('p_k').value || 0;
  const l = +document.getElementById('p_l').value || 0;
  if (hex) {
    const i = -(h + k);
    return { h, k, l, i };
  }
  return { h, k, l };
}

document.getElementById('drawPlane').onclick = () => {
  const p = readPlane();
  if (p.h === 0 && p.k === 0 && p.l === 0) {
    document.getElementById('planeOut').innerHTML = '<i>İndisler hepsi sıfır olamaz.</i>';
    return;
  }
  let res;
  if (current.system === 'hexagonal') res = hexPlanePolygon(current, p.h, p.k, p.l);
  else res = cubicPlanePolygon(p.h, p.k, p.l);
  scene.setPlane(res.poly);
  lastPlane = p;
  const label = current.system === 'hexagonal' ? planeStr([p.h, p.k, p.i, p.l]) : planeStr([p.h, p.k, p.l]);
  let txt = `Düzlem <b>${label}</b> çizildi.`;
  if (current.system === 'cubic') {
    const dhkl = current.aOverR / Math.sqrt(p.h * p.h + p.k * p.k + p.l * p.l);
    txt += `<br>Düzlemler arası mesafe d = a/√(h²+k²+l²) = <b>${(
      1 / Math.sqrt(p.h * p.h + p.k * p.k + p.l * p.l)
    ).toFixed(3)}·a</b> = ${dhkl.toFixed(3)}·r`;
    if (res.shift && (res.shift.x || res.shift.y || res.shift.z)) {
      txt += `<br><i>Negatif indis: orijin (${res.shift.x},${res.shift.y},${res.shift.z}) köşesine kaydırıldı.</i>`;
    }
  }
  document.getElementById('planeOut').innerHTML = txt;
};
document.getElementById('clearPlane').onclick = () => {
  scene.clearPlane();
  document.getElementById('planeOut').innerHTML = '';
  document.getElementById('dayOut').innerHTML = '';
};

// --- dogrultu --------------------------------------------------------------
function readDir() {
  const hex = current.system === 'hexagonal';
  const u = +document.getElementById('d_u').value || 0;
  const v = +document.getElementById('d_v').value || 0;
  const w = +document.getElementById('d_w').value || 0;
  if (hex) {
    const t = -(u + v);
    return { u, v, w, t };
  }
  return { u, v, w };
}

document.getElementById('drawDir').onclick = () => {
  const d = readDir();
  if (d.u === 0 && d.v === 0 && d.w === 0) {
    document.getElementById('dirOut').innerHTML = '<i>İndisler hepsi sıfır olamaz.</i>';
    return;
  }
  let r;
  if (current.system === 'hexagonal') r = hcpDirection(current, d.u, d.v, d.t, d.w);
  else r = cubicDirection(d.u, d.v, d.w);
  const label = current.system === 'hexagonal' ? dirStr([d.u, d.v, d.t, d.w]) : dirStr([d.u, d.v, d.w]);
  scene.setDirection(r.start, r.end, label);
  lastDir = d;
  let txt = `Doğrultu <b>${label}</b> çizildi.`;
  if (current.system === 'hexagonal') txt += `<br>3-indis karşılığı: ${dirStr([r.U, r.V, r.W])}`;
  document.getElementById('dirOut').innerHTML = txt;
};
document.getElementById('clearDir').onclick = () => {
  scene.clearDirection();
  document.getElementById('dirOut').innerHTML = '';
  document.getElementById('layOut').innerHTML = '';
};

// --- LAY / DAY -------------------------------------------------------------
document.getElementById('calcLAY').onclick = () => {
  if (!lastDir) {
    document.getElementById('layOut').innerHTML = '<i>Önce bir doğrultu çizin.</i>';
    return;
  }
  let vec;
  if (current.system === 'hexagonal') vec = hcpDirection(current, lastDir.u, lastDir.v, lastDir.t, lastDir.w).vec;
  else vec = cubicDirection(lastDir.u, lastDir.v, lastDir.w).vec;
  const r = computeLAY(current, vec);
  if (!r) {
    document.getElementById('layOut').innerHTML =
      '<i>Bu doğrultu üzerinde atom dizisi bulunamadı (atomlardan geçmiyor).</i>';
    return;
  }
  document.getElementById('layOut').innerHTML = `
    <div class="result">
      <div><span>Atom aralığı</span><b>${fmt(r.spacing_a)}·a = ${fmt(r.spacing_R)}·r</b></div>
      <div><span>LAY</span><b>${fmt(r.LAY_per_a)} atom/a</b></div>
      <div><span>LAY (r cinsinden)</span><b>${fmt(r.LAY_per_R)} atom/r</b></div>
      <small>LAY = 1 / (komşu atom aralığı)</small>
    </div>`;
};

document.getElementById('calcDAY').onclick = () => {
  if (!lastPlane) {
    document.getElementById('dayOut').innerHTML = '<i>Önce bir düzlem çizin.</i>';
    return;
  }
  const n = planeNormal(current, lastPlane.h, lastPlane.k, lastPlane.l);
  const r = computeDAY(current, n);
  if (!r) {
    document.getElementById('dayOut').innerHTML = '<i>Bu düzlem için atom örgüsü bulunamadı.</i>';
    return;
  }
  document.getElementById('dayOut').innerHTML = `
    <div class="result">
      <div><span>2B hücre alanı</span><b>${fmt(r.area_a2)}·a² = ${fmt(r.area_R2)}·r²</b></div>
      <div><span>DAY</span><b>${fmt(r.DAY_per_a2)} atom/a²</b></div>
      <div><span>DAY (r cinsinden)</span><b>${fmt(r.DAY_per_R2)} atom/r²</b></div>
      <small>DAY = 1 / (düzlemdeki ilkel 2B hücrenin alanı)</small>
    </div>`;
};

// --- gorunum kontrolleri ---------------------------------------------------
document.querySelectorAll('[data-mode]').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('[data-mode]').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    scene.setAtomMode(b.dataset.mode);
  };
});
document.getElementById('tAtoms').onchange = (e) => (scene.groups.atoms.visible = e.target.checked);
document.getElementById('tAxes').onchange = (e) => (scene.groups.axes.visible = e.target.checked);
document.getElementById('tCell').onchange = (e) => (scene.groups.cell.visible = e.target.checked);
document.getElementById('resetBtn').onclick = () => scene.resetView();
document.getElementById('menuBtn').onclick = () =>
  document.getElementById('panel').classList.toggle('open');

// --- baslat ----------------------------------------------------------------
selectStructure(STRUCTURES.BK);
setTimeout(() => scene.resize(), 50);
