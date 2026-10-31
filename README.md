# LOCIVA — Location Intelligence & Civic Analytics

> **"Understand the Area Before You Decide"**
>
> Platform Intelijen Kawasan Terintegrasi untuk Simulasi Kelayakan Bisnis dan Pemantauan Infrastruktur Kewargaan berbasis Peta Interaktif.

---

## Gambaran Umum

**LOCIVA** (*Location Intelligence & Civic Analytics*) adalah platform berbasis web yang mengombinasikan peta interaktif, data spasial kawasan, analisis lokasi, simulasi bisnis, dan laporan masyarakat dalam satu ekosistem digital terpadu.

LOCIVA dikembangkan untuk **Web Development Competition UINIC 8.0** yang diselenggarakan oleh HMPS Informatika UIN Sunan Kalijaga Yogyakarta, dengan tema:

**"Engineering Interconnected Web Solutions to Empower Digital Ecosystems"**

Subtema SDGs: **Artificial Intelligence (AI) & Teknologi Digital**.

LOCIVA dirancang untuk menjawab dua pertanyaan mendasar di kawasan yang sama:

- **Bagi Masyarakat:** *"Apa yang sedang terjadi di kawasan ini?"*
- **Bagi Pelaku Usaha:** *"Apakah kawasan ini cocok untuk bisnis saya?"*

---

## Masalah & Solusi

### Permasalahan

1. **Keputusan Bisnis yang Spekulatif**

   Calon pelaku usaha sering memilih lokasi berdasarkan asumsi visual, seperti terlihat ramai atau dekat jalan besar. Padahal, lokasi yang ramai kendaraan belum tentu ramah bagi pejalan kaki atau cocok untuk model bisnis tertentu.

2. **Data Laporan Warga yang Terisolasi**

   Informasi mengenai infrastruktur rusak, seperti jalan berlubang, banjir, lampu jalan mati, dan trotoar rusak, sering kali hanya tersimpan dalam sistem pengaduan tanpa terhubung dengan analisis kawasan.

### Solusi LOCIVA

LOCIVA menghubungkan data spasial, laporan kewargaan, dan simulasi keputusan bisnis melalui satu peta interaktif dengan alur:

**Citizen Data → Area Intelligence → Business Simulation**

---

## Dua Sisi Utama & Fitur Unggulan

### 1. Business Intelligence — Pelaku Usaha

- **Interactive Business Simulator**

  Fitur drag and drop untuk menempatkan jenis usaha, seperti Food Cart, Cafe, Barber, Fashion Store, dan Retail, langsung pada titik peta yang diinginkan.

- **Location Potential Score**

  Algoritma penilaian potensi lokasi berbasis multi-faktor dengan kategori:

  - 🟢 Potential
  - 🟡 Consideration
  - 🔴 Less Potential

  Contoh pembobotan untuk Food Cart:

  | Indikator | Bobot |
  |---|---:|
  | Populasi | 25% |
  | Potensi Pejalan Kaki | 25% |
  | Aksesibilitas | 15% |
  | Target Pasar | 15% |
  | Kompetisi | 10% |
  | Kesesuaian Area | 10% |
  | **Total** | **100%** |

- **Transparent WHY? Explanation**

  Menampilkan rincian indikator yang menjelaskan alasan di balik skor potensi lokasi, misalnya Population: High, Accessibility: Medium, dan Competition: High.

- **Catchment Area / Radius Analysis**

  Menganalisis jangkauan geografis untuk memetakan populasi, fasilitas publik, perkantoran, sekolah, dan universitas di sekitar titik lokasi usaha.

- **Competitor Analysis Layer**

  Memetakan fasilitas dan bisnis pesaing sejenis dalam radius jangkauan sebagai proxy tingkat persaingan lokal.

- **What-If Simulation**

  Membandingkan beberapa opsi lokasi, seperti Location A vs Location B, atau variasi jenis usaha seperti Cafe vs Food Cart vs Barber.

- **AI Differentiation Engine**

  Memberikan rekomendasi strategi bisnis, product mix, target pasar, Unique Selling Proposition (USP), dan strategi promosi ketika pengguna memilih tetap membuka usaha di area dengan tingkat persaingan tinggi.

### 2. Civic / Area Intelligence — Masyarakat

- **LOCIVA Report**

  Sistem pelaporan permasalahan infrastruktur kawasan berbasis pin location.

  Kategori laporan meliputi:

  - Jalan Rusak
  - Banjir
  - Penumpukan Sampah
  - Lampu Jalan Mati
  - Rambu / Lampu Lalu Lintas
  - Trotoar Rusak
  - Pohon Mengganggu
  - Drainase Bermasalah

- **Complete Report Attributes**

  Setiap laporan dilengkapi foto dokumentasi, koordinat lokasi, timestamp, dan keterangan detail.

- **Community Verification**

  Mekanisme konfirmasi warga untuk membantu memvalidasi keberadaan dan keberlanjutan masalah di lapangan.

- **Report Status Transparency**

  Pengguna dapat memantau perkembangan laporan melalui tahapan:

  `Reported → Verification → Confirmed → Handled → Resolved`

---

## Integrasi Citizen Data & Business Intelligence

Keunggulan utama LOCIVA terletak pada hubungan antara laporan masyarakat dan kalkulasi kelayakan bisnis.

Ketika masyarakat melaporkan gangguan infrastruktur, seperti banjir atau jalan rusak pada suatu koridor, data tersebut dapat digunakan untuk memperbarui kondisi Area Intelligence.

Dampaknya, faktor **Accessibility** pada Location Potential Score di sekitar lokasi tersebut dapat mengalami penyesuaian.

Contoh ilustrasi:

- Sebelum laporan: `82/100`
- Setelah mempertimbangkan gangguan infrastruktur: `71/100`

Sistem kemudian menjelaskan bahwa kendala infrastruktur berpotensi mengganggu aksesibilitas pelanggan dan rantai distribusi.

Dengan demikian, laporan masyarakat tidak hanya menjadi informasi pengaduan, tetapi juga menjadi salah satu sumber data pendukung dalam pengambilan keputusan bisnis.

---

## Arsitektur Sistem

LOCIVA dirancang menggunakan arsitektur modular yang menghubungkan Business Intelligence dan Civic Intelligence melalui satu ekosistem peta interaktif.

```text
                       LOCIVA
                          |
              +-----------+-----------+
              |                       |
      Business Intelligence    Civic Intelligence
              |                       |
              +-----------+-----------+
                          |
                    Interactive Map
                          |
                      Laravel API
                          |
                   Spatial Database
                          |
              +-----------+-----------+
              |           |           |
          Analytics   Simulation   Reports
              |           |           |
              +-----------+-----------+
                          |
                    AI Enhancement
```

### Stack Teknologi

| Komponen | Teknologi |
|---|---|
| Frontend | React, Vite, TypeScript |
| Styling | Tailwind CSS |
| Backend | Laravel 11 |
| API | RESTful API |
| Authentication | Laravel Sanctum |
| Database | Database relasional dengan dukungan data spasial |
| Map Interface | OpenStreetMap Integration |
| AI Engine | Groq API |
| Geographic Data | OpenStreetMap |
| Demographic Data | BPS API |
| Routing | OSRM / Routing API Integration |

---

## Sumber Data

LOCIVA mengutamakan transparansi asal-usul data (*data lineage*) agar informasi yang digunakan dalam analisis dapat ditelusuri.

1. **Geographic Data**

   OpenStreetMap untuk jaringan jalan, Point of Interest (POI), land use, dan fasilitas publik.

2. **Population / Area Data**

   Data demografi dari Badan Pusat Statistik (BPS) dan sumber Open Data pemerintah.

3. **Business Data**

   Database bisnis internal LOCIVA, POI komersial, dan kontribusi direktori usaha pengguna.

4. **Citizen Reports**

   Data laporan masyarakat berbasis crowdsourcing yang dilengkapi lokasi, foto, timestamp, dan status verifikasi.

5. **Routing Data**

   Data jaringan jalan dan perhitungan rute untuk mendukung analisis aksesibilitas serta rekomendasi perjalanan.

---

## Alur Demo Penggunaan

1. **Akses Interactive Map**

   Buka platform LOCIVA dan pilih kawasan yang ingin dianalisis, misalnya Kota Malang.

2. **Pilih dan Tempatkan Bisnis**

   Pilih jenis usaha seperti Food Cart pada modul Interactive Business Simulator, kemudian tempatkan pada titik lokasi yang diinginkan.

3. **Analisis Location Potential Score**

   Sistem menampilkan skor potensi lokasi beserta kategorinya.

   Contoh ilustrasi: `71/100 — Potential`.

4. **Eksplorasi WHY?**

   Klik tombol WHY? untuk melihat rincian indikator penilaian, seperti populasi, pejalan kaki, aksesibilitas, dan kompetisi.

5. **Periksa Kondisi Kawasan**

   Aktifkan layer kompetitor dan Citizen Report untuk melihat kondisi infrastruktur di sekitar lokasi.

6. **Gunakan AI Differentiation**

   Ketika kompetisi tinggi, pengguna dapat meminta rekomendasi konsep usaha dan strategi pemasaran dari AI Engine.

7. **Jalankan What-If Simulation**

   Geser lokasi usaha ke titik alternatif untuk membandingkan potensi beberapa lokasi.

---

## Relevansi dengan UINIC 8.0

| Aspek | Keterangan |
|---|---|
| Penyelenggara | HMPS Informatika UIN Sunan Kalijaga Yogyakarta |
| Kompetisi | Web Development Competition UINIC 8.0 |
| Tema | Engineering Interconnected Web Solutions to Empower Digital Ecosystems |
| Subtema | Artificial Intelligence (AI) & Teknologi Digital |
| Fokus | Integrasi data spasial, kecerdasan buatan, dan partisipasi masyarakat |

LOCIVA mendukung pengembangan ekosistem digital yang saling terhubung dengan mengintegrasikan data kewargaan dan intelijen bisnis dalam satu platform.

Melalui pendekatan ini, teknologi tidak hanya digunakan untuk menampilkan informasi, tetapi juga membantu masyarakat memahami kondisi kawasan dan membantu pelaku usaha mengambil keputusan berbasis data.

---

## Akun Demo

Platform demo LOCIVA dapat diakses melalui:

**Website:** https://lociva.freedev.app/

| Role | Email | Password |
|---|---|---|
| Admin | admin@gmail.com | password |
| User | user@gmail.com | password |

> **Catatan:** Akun di atas merupakan kredensial khusus demonstrasi. Jangan gunakan kredensial tersebut untuk lingkungan produksi.

---

## Menjalankan Project

Petunjuk instalasi dan konfigurasi lokal perlu disesuaikan dengan struktur repository dan file environment yang tersedia.

Secara umum, project terdiri dari frontend React/Vite dan backend Laravel.

### Backend

```bash
cd back-end

composer install

cp .env.example .env

php artisan key:generate

php artisan migrate

php artisan serve
```

# Laravel Queue Worker
`php artisan queue:work`

# Laravel Reverb WebSocket Server
`php artisan reverb:start`

### Frontend

```bash
cd front-end

npm install

npm run dev
```

Pastikan konfigurasi database, API URL, dan environment variables sudah disesuaikan sebelum menjalankan aplikasi.

---

## Lisensi & Hak Cipta

LOCIVA dipublikasikan sebagai bagian dari keikutsertaan dalam **Web Development Competition UINIC 8.0 (2026)**.

Seluruh hak cipta atas konsep, desain, dan kode sumber dimiliki oleh Tim Pengembang.

---

<p align="center">
  <strong>LOCIVA — Understand the Area Before You Decide.</strong>
  <br />
  Turning Connected Data into Better Decisions.
</p>
