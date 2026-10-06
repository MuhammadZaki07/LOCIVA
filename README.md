# LOCIVA — Location Intelligence & Civic Analytics

> **"Understand the Area Before You Decide"**
>
> *Platform Intelijen Kawasan Terintegrasi untuk Simulasi Kelayakan Bisnis dan Pemantauan Infrastruktur Kewargaan berbasis Peta Interaktif.*

---

## Gambaran Umum

**LOCIVA** (*Location Intelligence & Civic Analytics*) adalah platform berbasis web yang mengombinasikan peta interaktif, data spasial kawasan, analisis lokasi, simulasi bisnis, dan laporan masyarakat dalam satu ekosistem digital terpadu. Dikembangkan untuk **Web Development Competition UINIC 8.0** (HMPS Informatika UIN Sunan Kalijaga Yogyakarta) dengan tema utama **"Engineering Interconnected Web Solutions to Empower Digital Ecosystems"** dan subtema SDGs **Artificial Intelligence (AI) & Teknologi Digital**.

LOCIVA dirancang untuk menjawab dua pertanyaan mendasar di kawasan yang sama:
- **Bagi Masyarakat:** *"Apa yang sedang terjadi di kawasan ini?"*
- **Bagi Pelaku Usaha:** *"Apakah kawasan ini cocok untuk bisnis saya?"*

---

## Masalah & Solusi

### Masalah
1. **Keputusan Bisnis yang Spekulatif:** Calon pelaku usaha sering memilih lokasi hanya berdasarkan asumsi visual (seperti "terlihat ramai" atau "dekat jalan besar"). Padahal, lokasi yang ramai kendaraan belum tentu ramah bagi pejalan kaki atau cocok untuk model bisnis tertentu.
2. **Data Laporan Warga yang Terisolasi:** Informasi mengenai infrastruktur rusak (jalan berlubang, banjir, lampu mati, trotoar rusak) sering kali tergenang di sistem pengaduan tanpa terhubung ke analisis ekonomi lokal.

### Solusi LOCIVA
LOCIVA menghubungkan data spasial, laporan kewargaan, dan simulasi keputusan bisnis di atas satu peta interaktif melalui alur kerja terintegrasi:
$$\text{Citizen Data} \longrightarrow \text{Area Intelligence} \longrightarrow \text{Business Simulation}$$

---

## Dua Sisi Utama & Fitur Unggulan

### 1. Business Intelligence (Pelaku Usaha)
* **Interactive Business Simulator:** Fitur *drag & drop* untuk menempatkan jenis usaha (seperti *Food Cart*, *Cafe*, *Barber*, *Fashion Store*, *Retail*) langsung pada titik peta yang diinginkan.
* **Location Potential Score:** Algoritma penilaian potensi berbasis multi-faktor (dikategorikan menjadi 🟢 *Potential*, 🟡 *Consideration*, dan 🔴 *Less Potential*). Contoh pembobotan untuk *Food Cart*:
  - Populasi (25%)
  - Potensi Pejalan Kaki (25%)
  - Aksesibilitas (15%)
  - Target Pasar (15%)
  - Kompetisi (10%)
  - Kesesuaian Area (10%)
* **Penjelasan "WHY?":** Rincian transparan yang menjelaskan alasan logis di balik angka skor potensi (misal: *Population: High, Accessibility: Medium, Competition: High*).
* **Catchment Area / Radius Analysis:** Analisis jangkauan geografis untuk memetakan populasi, fasilitas publik, kantor, sekolah, dan universitas di sekitar titik lokasi usaha.
* **Competitor Analysis Layer:** Pemetaan fasilitas dan bisnis pesaing sejenis dalam radius jangkauan sebagai *proxy* tingkat persaingan lokal.
* **What-If Simulation:** Fasilitas pengujian skenario ganda untuk membandingkan performa beberapa opsi lokasi (*Location A vs Location B*) atau beberapa variasi jenis usaha (*Cafe vs Food Cart vs Barber*).
* **AI Differentiation Engine:** Lapisan kecerdasan buatan (*AI enhancement layer*) yang memberikan saran strategi bisnis, *product mix*, penentuan target pasar, USP (*Unique Selling Proposition*), dan strategi promosi ketika pengguna memilih tetap membuka usaha di area bersaing tinggi.

### 2. Civic / Area Intelligence (Masyarakat)
* **LOCIVA Report:** Sistem pelaporan masalah infrastruktur kawasan berbasis *pin location*. Kategori laporan mencakup:
  -  Jalan Rusak
  -  Banjir
  -  Penumpukan Sampah
  -  Lampu Jalan Mati
  -  Rambu / Lampu Lalu Lintas
  -  Trotoar Rusak
  -  Pohon Mengganggu
  -  Drainase Bermasalah
* **Atribut Laporan Lengkap:** Setiap laporan menyertakan foto dokumentasi, koordinat presisi, *timestamp*, dan keterangan detail.
* **Community Verification:** Mekanisme konfirmasi warga untuk menguji validitas dan keberlanjutan masalah di lapangan.
* **Transparansi Status Laporan:** Penelusuran status laporan secara *real-time*: `Reported` $\rightarrow$ `Verification` $\rightarrow$ `Confirmed` $\rightarrow$ `Handled` $\rightarrow$ `Resolved`.

---

##  Integrasi Citizen Data & Business Intelligence

Keunggulan utama LOCIVA terletak pada dinamisnya hubungan antara laporan masyarakat dengan kalkulasi kelayakan bisnis. 

Ketika masyarakat melaporkan gangguan infrastruktur (misalnya marak laporan banjir atau jalan rusak di suatu koridor), data tersebut secara otomatis memutakhirkan kondisi *Area Intelligence*. Implikasinya, faktor **Accessibility** pada *Location Potential Score* di sekitar lokasi tersebut akan mengalami penyesuaian (misalnya skor lokasi turun dari `82/100` menjadi `71/100`). Sistem secara otomatis menerangkan bahwa kendala infrastruktur dapat mengganggu aksesibilitas pelanggan dan rantai distribusi.

---

## Arsitektur Sistem & Teknologi

LOCIVA dibangun dengan arsitektur web yang *scalable*, aman, dan interoperabel sesuai dengan kriteria rekayasa perangkat lunak UINIC 8.0:

```text
                 LOCIVA
                    │
          ┌─────────┴─────────┐
          │                   │
 Business Intelligence   Civic Intelligence
          │                   │
          └─────────┬─────────┘
                    │
              Interactive Map
                    │
              Laravel API
                    │
             PostgreSQL/PostGIS
                    │
        ┌───────────┼───────────┐
        │           │           │
   Analytics    Simulation    Reports
        │           │           │
        └───────────┼───────────┘
                    │
              AI Enhancement
```

### Stack Teknologi
- **Frontend & Map Interface:** HTML5, CSS3, JavaScript, Interactive Map Library (OpenStreetMap Integration).
- **Backend API:** Laravel Framework (RESTful API, modular architecture).
- **Database Spasial:** PostgreSQL dengan ekstensi PostGIS untuk query spasial dan analisis radius/buffer.
- **AI Layer:** External AI Engine Integration untuk pemrosesan insight strategi diferensiasi bisnis.

---

## Sumber Data

Seluruh data yang ditampilkan di dalam platform dapat dilacak asal-usulnya (*transparent data lineage*):
1. **Geographic Data:** OpenStreetMap (jaringan jalan, *Point of Interest*/POI, *land use*, fasilitas publik).
2. **Population / Area Data:** Data demografi BPS dan *Open Data* Pemerintah.
3. **Business Data:** Database POI komersial dan kontribusi direktori pengguna.
4. **Citizen Report:** Laporan berbasis *crowdsourcing* masyarakat (*location pin*, foto, *timestamp*, status verifikasi).

---

## Alur Demo Penggunaan

1. **Akses Map Interaktif:** Buka platform LOCIVA dan pilih area analisis (misal: Kota Malang).
2. **Pilih & Menempatkan Bisnis:** Pilih ikon bisnis *"Food Cart"* pada modul *Interactive Business Simulator* lalu *drag & drop* ke titik jalan tertentu.
3. **Analisis Potential Score:** Lihat kalkulasi *Location Potential Score* (misal: `71/100` — *Potential*).
4. **Eksplorasi "WHY?":** Klik tombol **WHY?** untuk membaca rincian indikator (Populasi: Tinggi, Pejalan Kaki: Tinggi, Aksesibilitas: Sedang, Kompetisi: Tinggi).
5. **Cek Layer Sekitar:** Aktifkan layer kompetitor sejenis dan layer *Citizen Report* untuk melihat laporan jalan rusak di radius jangkauan.
6. **Aktivasi AI Differentiation:** Dalam kondisi kompetisi tinggi, klik *"Tetap Berjualan di Sini"* untuk mendapatkan rekomendasi konsep dan strategi pemasaran dari AI Engine.
7. **Simulasi What-If:** Geser lokasi usaha ke titik alternatif lain untuk membandingkan skor potensi secara langsung.

---

## Relevansi Kompetisi UINIC 8.0

- **Penyelenggara:** HMPS Informatika UIN Sunan Kalijaga Yogyakarta
- **Tema Kegiatan:** *"Empowering a Sustainable Digital Ecosystem"*
- **Tema Lomba:** *"Engineering Interconnected Web Solutions to Empower Digital Ecosystems"*
- **Subtema SDGs:** Artificial Intelligence (AI) & Teknologi Digital
- **Prinsip Pengembangan:** Mengutamakan arsitektur data yang efisien, ketersediaan tinggi (*high availability*), keandalan sistem, serta dampak positif yang berkelanjutan bagi masyarakat dan pelaku usaha lokal.

---

## Lisensi & Hak Cipta

Dipublikasikan sebagai bagian dari keikutsertaan dalam **Web Development Competition UINIC 8.0 (2026)**. Seluruh hak cipta atas konsep, desain, dan kode sumber dimiliki oleh Tim Pengembang.
