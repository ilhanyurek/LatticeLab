// i18n.js — TR/EN dil destegi
const DICT = {
  tr: {
    title: 'LatticeLab',
    subtitle: 'Malzeme Biliminin Temelleri — kristal düzlemleri, doğrultuları ve yapıları',
    cat_metal: 'Saf Metaller',
    cat_compound: 'Bileşikler',
    sec_structure: 'Kristal Yapı',
    sec_view: 'Görünüm',
    sec_plane: 'Düzlem (hkl)',
    sec_dir: 'Doğrultu [uvw]',
    sec_void: 'Boşluk / Koordinasyon',
    ballstick: 'Top–çubuk',
    spacefill: 'Dolu (temas)',
    atoms: 'Atomlar',
    axes: 'Eksenler',
    cell: 'Hücre',
    drawPlane: 'Düzlemi çiz',
    drawDir: 'Doğrultuyu çiz',
    clear: 'Temizle',
    calcDAY: 'DAY hesapla (Düzlemsel Atom Yoğunluğu)',
    calcLAY: 'LAY hesapla (Lineer Atom Yoğunluğu)',
    calcAPF: 'APF / ADF hesapla (Atomik Dolgu Faktörü)',
    resetView: 'Görünümü sıfırla',
    // bilgi satirlari
    i_name: 'Ad',
    i_system: 'Sistem',
    i_atoms_cell: 'Atom / hücre',
    i_coord: 'Koordinasyon sayısı',
    i_apf: 'APF (dolma oranı)',
    i_ar: 'a / r',
    i_ca: 'c / a',
    i_example: 'Örnek',
    i_formula: 'Formül',
    i_type: 'Yapı tipi',
    i_void: 'Boşluk',
    cubic: 'Kübik',
    hexagonal: 'Hekzagonal',
    // sonuc metinleri
    r_spacing: 'Atom aralığı',
    r_area: '2B hücre alanı',
    r_lay: 'LAY',
    r_day: 'DAY',
    r_lay_r: 'LAY (r cinsinden)',
    r_day_r: 'DAY (r cinsinden)',
    lay_def: 'LAY = 1 / (komşu atom aralığı)',
    day_def: 'DAY = 1 / (düzlemdeki ilkel 2B hücrenin alanı)',
    drawn_plane: 'Düzlem {x} çizildi.',
    drawn_dir: 'Doğrultu {x} çizildi.',
    dspacing: 'Düzlemler arası mesafe d = a/√(h²+k²+l²) = {a}·a = {r}·r',
    origin_shift: 'Negatif indis: orijin ({x},{y},{z}) köşesine kaydırıldı.',
    hcp3: '3-indis karşılığı: {x}',
    err_zero: 'İndisler hepsi sıfır olamaz.',
    err_no_dir: 'Önce bir doğrultu çizin.',
    err_no_plane: 'Önce bir düzlem çizin.',
    err_no_line: 'Bu doğrultu üzerinde atom dizisi bulunamadı.',
    err_no_plane_lat: 'Bu düzlem için atom örgüsü bulunamadı.',
    compound_density: 'Bileşiklerde LAY/DAY/APF iyon türlerine göre ayrı hesaplanır; bu sürümde gösterilmez.',
    // APF
    apf_formula: 'APF = n·(4/3·π·r³) / a³',
    apf_n: 'Atom / hücre (n)',
    apf_val: 'APF',
    apf_pct: 'Doluluk',
    // kristal yapi adlari, kisaltmalari, tipleri ve ornekleri
    // (crystals.js yalnizca fizik verisini tutar; gorunen metinler burada)
    abbr_BK: 'BK',
    abbr_HMK: 'HMK',
    abbr_YMK: 'YMK',
    abbr_HSP: 'HSP',
    name_BK: 'Basit Kübik (BK / SC)',
    name_HMK: 'Hacim Merkezli Kübik (HMK / BCC)',
    name_YMK: 'Yüzey Merkezli Kübik (YMK / FCC)',
    name_HSP: 'Hekzagonal Sıkı Paket (HSP / HCP)',
    name_NaCl: 'NaCl — Kaya Tuzu',
    name_CsCl: 'CsCl',
    name_ZnS: 'ZnS — Sfalerit',
    name_CaF2: 'CaF₂ — Florit',
    type_NaCl: 'YMK (FCC) + tüm oktahedral boşluklar',
    type_CsCl: 'Basit kübik + kübik boşluk (HMK değil!)',
    type_ZnS: 'YMK (FCC) + tetrahedral boşlukların yarısı',
    type_CaF2: 'YMK (FCC) Ca²⁺ + tüm tetrahedral boşluklarda F⁻',
    ex_BK: 'Po',
    ex_HMK: 'Fe(α), Cr, W',
    ex_YMK: 'Al, Cu, Au, Ni, Fe(γ)',
    ex_HSP: 'Mg, Zn, Ti, Co',
    ex_NaCl: 'NaCl, MgO, FeO, LiF',
    ex_CsCl: 'CsCl, CsBr, NH₄Cl',
    ex_ZnS: 'ZnS, GaAs, β-SiC, elmas(C)',
    ex_CaF2: 'CaF₂, UO₂, ZrO₂, ThO₂',
    // 3B baslatilamadiginda gosterilen uyari
    glfail_title: '3B görüntüleme başlatılamadı',
    glfail_body:
      'Cihazınızın tarayıcı/WebGL desteği yetersiz olabilir. Lütfen sistem "Android System WebView" ve Chrome uygulamasını güncelleyip tekrar deneyin.',
    // bosluk aciklamalari
    void_oct: 'Oktahedral boşluk: 6 atomla çevrilidir (yarıçap oranı r/R ≈ 0,414–0,732).',
    void_tet: 'Tetrahedral boşluk: 4 atomla çevrilidir (yarıçap oranı r/R ≈ 0,225–0,414).',
    void_cubic: 'Kübik boşluk: 8 atomla çevrilidir (yarıçap oranı r/R ≈ 0,732–1,0).',
    void_NaCl: 'Na⁺ iyonları, Cl⁻ ’nin oluşturduğu YMK kafesin TÜM oktahedral boşluklarında yer alır. Koordinasyon 6:6.',
    void_CsCl: 'Cs⁺ , basit kübik Cl⁻ kafesinin kübik (merkez) boşluğunda bulunur. Koordinasyon 8:8. Dikkat: iki farklı atom olduğu için HMK DEĞİLDİR.',
    void_ZnS: 'Zn²⁺ , S²⁻ ’nin YMK kafesindeki tetrahedral boşlukların YARISINI doldurur. Koordinasyon 4:4.',
    void_CaF2: 'F⁻ iyonları, Ca²⁺ YMK kafesindeki TÜM tetrahedral boşlukları doldurur. Koordinasyon 8:4.',
    // ayarlar
    settings: 'Ayarlar',
    language: 'Dil',
    contact: 'İletişim',
    contact_text: 'Soru, öneri ve hata bildirimi için:',
    about: 'Hakkında',
    about_text: 'Metalurji ve Malzeme Mühendisliği — Malzeme Biliminin Temelleri dersi için hazırlanmış eğitim aracı.',
    notes: 'Kısaltmalar & notlar',
    note_lay: 'LAY = Lineer Atom Yoğunluğu = doğrultu üzerindeki atom sayısı / uzunluk.',
    note_day: 'DAY = Düzlemsel Atom Yoğunluğu = düzlemdeki atom sayısı / alan.',
    note_apf: 'APF/ADF = Atomik Dolgu Faktörü = atomların hücre hacmini doldurma oranı.',
    note_neg: 'Negatif indis − ile gösterilir, örn. (−200). Değer girişinde − ve + tuşlarını kullanın.',
    close: 'Kapat',
  },
  en: {
    title: 'LatticeLab',
    subtitle: 'Fundamentals of Materials Science — crystal planes, directions and structures',
    cat_metal: 'Pure Metals',
    cat_compound: 'Compounds',
    sec_structure: 'Crystal Structure',
    sec_view: 'View',
    sec_plane: 'Plane (hkl)',
    sec_dir: 'Direction [uvw]',
    sec_void: 'Voids / Coordination',
    ballstick: 'Ball–stick',
    spacefill: 'Space-filling',
    atoms: 'Atoms',
    axes: 'Axes',
    cell: 'Cell',
    drawPlane: 'Draw plane',
    drawDir: 'Draw direction',
    clear: 'Clear',
    calcDAY: 'Compute PD (Planar Density)',
    calcLAY: 'Compute LD (Linear Density)',
    calcAPF: 'Compute APF (Atomic Packing Factor)',
    resetView: 'Reset view',
    i_name: 'Name',
    i_system: 'System',
    i_atoms_cell: 'Atoms / cell',
    i_coord: 'Coordination number',
    i_apf: 'APF (packing)',
    i_ar: 'a / r',
    i_ca: 'c / a',
    i_example: 'Example',
    i_formula: 'Formula',
    i_type: 'Structure type',
    i_void: 'Void',
    cubic: 'Cubic',
    hexagonal: 'Hexagonal',
    r_spacing: 'Atom spacing',
    r_area: '2D cell area',
    r_lay: 'LD',
    r_day: 'PD',
    r_lay_r: 'LD (in r)',
    r_day_r: 'PD (in r)',
    lay_def: 'LD = 1 / (nearest atom spacing)',
    day_def: 'PD = 1 / (area of primitive 2D cell in the plane)',
    drawn_plane: 'Plane {x} drawn.',
    drawn_dir: 'Direction {x} drawn.',
    dspacing: 'Interplanar spacing d = a/√(h²+k²+l²) = {a}·a = {r}·r',
    origin_shift: 'Negative index: origin shifted to corner ({x},{y},{z}).',
    hcp3: '3-index form: {x}',
    err_zero: 'Indices cannot all be zero.',
    err_no_dir: 'Draw a direction first.',
    err_no_plane: 'Draw a plane first.',
    err_no_line: 'No atom row found along this direction.',
    err_no_plane_lat: 'No atomic lattice found for this plane.',
    compound_density: 'For compounds LD/PD/APF depend on ion type and are not shown in this version.',
    apf_formula: 'APF = n·(4/3·π·r³) / a³',
    apf_n: 'Atoms / cell (n)',
    apf_val: 'APF',
    apf_pct: 'Filling',
    abbr_BK: 'SC',
    abbr_HMK: 'BCC',
    abbr_YMK: 'FCC',
    abbr_HSP: 'HCP',
    name_BK: 'Simple Cubic (SC)',
    name_HMK: 'Body-Centered Cubic (BCC)',
    name_YMK: 'Face-Centered Cubic (FCC)',
    name_HSP: 'Hexagonal Close-Packed (HCP)',
    name_NaCl: 'NaCl — Rock Salt',
    name_CsCl: 'CsCl',
    name_ZnS: 'ZnS — Sphalerite',
    name_CaF2: 'CaF₂ — Fluorite',
    type_NaCl: 'FCC + all octahedral voids',
    type_CsCl: 'Simple cubic + cubic void (not BCC!)',
    type_ZnS: 'FCC + half of the tetrahedral voids',
    type_CaF2: 'FCC Ca²⁺ + F⁻ in all tetrahedral voids',
    ex_BK: 'Po',
    ex_HMK: 'Fe(α), Cr, W',
    ex_YMK: 'Al, Cu, Au, Ni, Fe(γ)',
    ex_HSP: 'Mg, Zn, Ti, Co',
    ex_NaCl: 'NaCl, MgO, FeO, LiF',
    ex_CsCl: 'CsCl, CsBr, NH₄Cl',
    ex_ZnS: 'ZnS, GaAs, β-SiC, diamond(C)',
    ex_CaF2: 'CaF₂, UO₂, ZrO₂, ThO₂',
    glfail_title: 'Could not start 3D rendering',
    glfail_body:
      'Your device\'s browser/WebGL support may be insufficient. Please update the system "Android System WebView" and Chrome, then try again.',
    void_oct: 'Octahedral void: surrounded by 6 atoms (radius ratio r/R ≈ 0.414–0.732).',
    void_tet: 'Tetrahedral void: surrounded by 4 atoms (radius ratio r/R ≈ 0.225–0.414).',
    void_cubic: 'Cubic void: surrounded by 8 atoms (radius ratio r/R ≈ 0.732–1.0).',
    void_NaCl: 'Na⁺ ions occupy ALL octahedral voids of the FCC Cl⁻ lattice. Coordination 6:6.',
    void_CsCl: 'Cs⁺ sits in the cubic (central) void of a simple-cubic Cl⁻ lattice. Coordination 8:8. Note: this is NOT BCC (two different atoms).',
    void_ZnS: 'Zn²⁺ fills HALF of the tetrahedral voids of the FCC S²⁻ lattice. Coordination 4:4.',
    void_CaF2: 'F⁻ ions fill ALL tetrahedral voids of the FCC Ca²⁺ lattice. Coordination 8:4.',
    settings: 'Settings',
    language: 'Language',
    contact: 'Contact',
    contact_text: 'For questions, suggestions and bug reports:',
    about: 'About',
    about_text: 'Educational tool for the Fundamentals of Materials Science course (Metallurgical & Materials Engineering).',
    notes: 'Abbreviations & notes',
    note_lay: 'LD = Linear Density = atoms along a direction / length.',
    note_day: 'PD = Planar Density = atoms on a plane / area.',
    note_apf: 'APF = Atomic Packing Factor = fraction of cell volume filled by atoms.',
    note_neg: 'Negative indices shown with −, e.g. (−200). Use the − and + buttons to enter values.',
    close: 'Close',
  },
};

// Baslangic dili su sirayla belirlenir:
//   1) kullanicinin bu uygulamada daha once yaptigi secim
//   2) uygulama siteye gomuluyken sitenin dil tercihi (ilhanyurek.com ile ayni
//      kaynakta calistigi icin localStorage paylasilir)
//   3) sayfanin <html lang> degeri: web kopyasinda 'en', APK/Windows'ta 'tr'
//   4) 'tr'
function oku(anahtar) {
  try {
    const v = localStorage.getItem(anahtar);
    return v === 'tr' || v === 'en' ? v : null;
  } catch {
    return null; // file:// gibi depolamaya izin verilmeyen ortamlar
  }
}

function baslangicDili() {
  const belge = document.documentElement.lang;
  return (
    oku('miller_lang') ||
    oku('lang') ||
    (belge === 'tr' || belge === 'en' ? belge : null) ||
    'tr'
  );
}

let lang = baslangicDili();

export function getLang() {
  return lang;
}
export function setLang(l) {
  lang = l;
  try {
    localStorage.setItem('miller_lang', l);
  } catch {
    // depolama yoksa secim yalnizca bu oturum icin gecerli olur
  }
}
export function t(key, vars) {
  let s = (DICT[lang] && DICT[lang][key]) || DICT.tr[key] || key;
  if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
}
