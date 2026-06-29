# Miller İndisleri 3B

**Metalurji ve Malzeme Mühendisliği — Malzeme Biliminin Temelleri** dersi için
kristal **düzlemlerini (hkl)** ve **doğrultularını [uvw]** 3 boyutlu gösteren
etkileşimli eğitim uygulaması. Telefon, tablet ve bilgisayarda (tarayıcıda ve
Android APK olarak) çalışır.

## Özellikler

- **Kristal yapılar:** BK (Basit Kübik / SC), HMK (Hacim Merkezli Kübik / BCC),
  YMK (Yüzey Merkezli Kübik / FCC), HSP (Hekzagonal Sıkı Paket / HCP).
- **Eksenler:** Kübikler için x–y–z, HSP için a1–a2–a3–c. Eksenler, hücre dış
  hattından **farklı renkte** çizilir (kübik eksenler kırmızı/yeşil/mavi,
  HSP a-eksenleri turuncu, c ekseni camgöbeği).
- **Düzlemler (hkl):** Negatif ve sıfır indisler dahil — örn. `(100)`, `(-200)`,
  `(111)`. Negatif indislerde **orijin otomatik kaydırılır** ki düzlem hücre
  içinde görünsün. Düzlemler arası mesafe (d) de gösterilir.
- **Doğrultular [uvw]:** Kübik 3-indis ve HSP 4-indis `[uvtw]` (otomatik
  `t = -(u+v)` ve 3-indis karşılığı).
- **LAY (Lineer Atom Yoğunluğu):** Seçilen doğrultu üzerindeki komşu atom
  aralığından `LAY = 1 / aralık` hesaplanır (a ve r cinsinden).
- **DAY (Düzlemsel Atom Yoğunluğu):** Seçilen düzlemdeki ilkel 2B hücre
  alanından `DAY = 1 / alan` hesaplanır (a ve r cinsinden).
- **Görünüm:** Top-çubuk / dolu (temas eden atomlar) modu, atom/eksen/hücre
  aç-kapa, dokunmatik döndürme-yakınlaştırma (mobil uyumlu).
- **Yapı bilgisi:** Atom/hücre, koordinasyon sayısı, APF, a/r, c/a, örnek metaller.

## Geliştirme

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ üretir
```

Teknoloji: [Three.js](https://threejs.org) + [Vite](https://vitejs.dev).
Hesaplama doğrulaması: FCC `[110]` LAY = 0.5/r, FCC `(111)` DAY = 0.289/r²
(Callister değerleriyle uyumlu).

## Android APK

Uygulama [Capacitor](https://capacitorjs.com) ile Android'e paketlenir.

```bash
npm run build
npx cap sync android
cd android
./gradlew :app:assembleDebug
# Çıktı: android/app/build/outputs/apk/debug/app-debug.apk
```

Her push'ta **GitHub Actions** (`.github/workflows/android.yml`) APK'yı otomatik
derler ve artifact olarak yükler.

> PC için `.exe` (Electron/Tauri) paketlemesi sonraki aşamada eklenecek.

## Kurulum (telefon)

`Miller-3B-vX.Y.apk` dosyasını telefona aktar → Ayarlar'da "bilinmeyen
kaynaklardan kuruluma izin ver" → APK'ya dokunup kur.
