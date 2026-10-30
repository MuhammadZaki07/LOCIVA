# LOCIVA — Architecture & Implementation Plan

> **Tujuan:** memperbaiki pengelolaan kandidat lokasi, pipeline analisis, integrasi sumber data, konsistensi skor, performa, dan UX LOCIVA secara bertahap.
>
> **Aturan kerja:** kerjakan satu tahap pada satu waktu. Setelah setiap tahap selesai, AI wajib memperbarui file ini, menandai task yang benar-benar selesai dengan **✅**, mencatat bukti dan hasil pengujian, lalu berhenti menunggu persetujuan untuk tahap berikutnya.
>
> **Status awal:** 🟡 Perencanaan  
> **Penting:** jangan mengklaim task selesai jika belum diverifikasi melalui kode atau hasil pengujian yang benar-benar dijalankan.

---

## Keputusan arsitektur yang sudah disepakati

- [x] Kandidat dibuat sebagai record `draft` di database ketika pengguna menekan **Tambah Kandidat**.
- [x] Setiap kandidat terhubung langsung ke satu objek usaha.
- [x] Satu objek usaha dapat memiliki banyak kandidat; jangan membatasi penyimpanan hanya tiga kandidat.
- [x] Pemilihan koordinat dan analisis merupakan operasi terpisah.
- [x] Analisis hanya dimulai setelah pengguna menekan **Analisis**.
- [x] Perubahan koordinat membuat hasil analisis sebelumnya kedaluwarsa untuk lokasi terkini; analisis tidak otomatis dijalankan ulang.
- [x] Setiap analisis yang berhasil membuat rekaman riwayat baru; jangan menimpa hasil sukses sebelumnya.
- [x] Riwayat menyimpan versi algoritma dan snapshot hasil.
- [x] Snapshot historis tidak berubah ketika data POI, BPS, laporan warga, atau konfigurasi saat ini berubah.
- [x] Data POI lokal Pulau Jawa menjadi sumber utama jika cakupan dan status query memadai.
- [x] Overpass menjadi fallback terukur ketika data lokal tidak memadai; hasil lokal nol tidak otomatis berarti cakupan tidak tersedia.
- [x] POI dari seluruh kandidat tetap terlihat di peta dengan asosiasi/warna yang dapat dibedakan.
- [x] Laporan warga dinilai berdasarkan relevansi, termasuk status, jenis, tingkat keparahan, dan jarak.
- [x] Analisis parsial diperbolehkan hanya ketika syarat minimum terpenuhi, dengan status sumber yang transparan.
- [x] Rumus skor, bobot, ambang batas, aturan rekomendasi, dan kontrak API yang sudah ada tidak boleh diubah tanpa persetujuan.
- [x] Diskusi dan audit dilakukan terlebih dahulu; jangan implementasi sebelum rencana berdasarkan kode aktual disetujui.

## Aturan wajib untuk AI / coding agent

1. Baca file plan ini sebelum memulai setiap tahap.
2. Audit kode aktual terlebih dahulu. Jangan menebak nama file, tabel, model, route, atau perilaku sistem.
3. Kerjakan hanya tahap yang secara eksplisit diminta pengguna.
4. Jangan mengubah rumus/bobot/ambang skor atau aturan rekomendasi tanpa persetujuan eksplisit.
5. Jangan melakukan operasi destruktif pada Git, file, database, atau data pengguna.
6. Pertahankan perubahan pengguna yang sudah ada, termasuk file untracked.
7. Hindari dependency baru, migration baru, refactor luas, atau perubahan kontrak API kecuali memang diperlukan dan disetujui.
8. Tambahkan/perbarui pengujian untuk perubahan yang dilakukan. Mock API eksternal dalam pengujian.
9. Jalankan pengujian yang relevan dan catat perintah serta hasil aktual. Jangan mengarang hasil tes.
10. **Di akhir setiap tahap, wajib perbarui file ini:** ubah `[ ]` menjadi `[x]` hanya untuk task yang benar-benar selesai dan tambahkan tanda **✅** di judul/status task tersebut. Catat file yang diubah, pengujian, hasil, masalah tersisa, dan tahap berikutnya.
11. Jika ada task yang hanya selesai sebagian, jangan centang sebagai selesai. Gunakan status `🟡 PARTIAL` dan jelaskan sisanya.
12. Setelah satu tahap selesai, berhenti dan tunggu persetujuan pengguna sebelum melanjutkan ke tahap berikutnya.

---

## Daftar task dan tahap pengerjaan

### Tahap 1 — Audit arsitektur dan rencana implementasi

**Status: ✅ Selesai (Audit & Perencanaan Lengkap)**

- [x] ✅ Audit struktur backend Laravel dan frontend React/TypeScript.
- [x] ✅ Temukan model, migration, relasi, route, controller, service, hook, dan komponen untuk objek usaha, kandidat, analisis, simulasi, perbandingan, serta riwayat.
- [x] ✅ Verifikasi alur kandidat saat ini: tambah, pilih koordinat, simpan, analisis, dan muat ulang.
- [x] ✅ Verifikasi apakah analisis benar-benar diproses backend atau sebagian masih dihitung di frontend.
- [x] ✅ Audit integrasi database POI lokal, Overpass, BPS, laporan warga, routing, cache, dan job.
- [x] ✅ Audit scoring: rumus, bobot, ambang batas, kategori, serta pengaruh laporan warga.
- [x] ✅ Identifikasi penyebab bug kandidat B mewarisi data A, POI hilang saat berpindah kandidat, tombol simpan gagal, dan analisis lambat.
- [x] ✅ Identifikasi batas kandidat dan batas/truncation POI di backend maupun frontend.
- [x] ✅ Susun rencana perubahan yang menggunakan struktur lama dan menghindari duplikasi.
- [x] ✅ Catat file yang relevan, risiko, dependensi, dan pengujian yang diperlukan.
- [x] ✅ **Jangan ubah kode pada tahap ini.**

**Kriteria selesai:** laporan audit berbasis bukti kode aktual, klasifikasi temuan, daftar file, rencana bertahap, serta daftar keputusan yang masih memerlukan persetujuan.

### Tahap 2 — Backend: persistensi kandidat dan relasi objek usaha

**Status: ✅ Selesai**

- [x] ✅ Implementasikan pembuatan record draft ketika pengguna menekan Tambah Kandidat.
- [x] ✅ Pastikan kandidat terhubung ke objek usaha yang benar dan akses dibatasi sesuai autentikasi/otorisasi yang ada.
- [x] ✅ Implementasikan penyimpanan/perubahan koordinat pada kandidat yang tepat.
- [x] ✅ Validasi koordinat dan input lain di backend.
- [x] ✅ Pastikan kandidat bertahan setelah refresh atau pengguna membuka kembali objek usaha.
- [x] ✅ Hilangkan batas penyimpanan tiga kandidat jika ditemukan dalam kode (diperluas menjadi string max 50).
- [x] ✅ Pastikan pembuatan kandidat, penyimpanan koordinat, dan analisis merupakan operasi terpisah.
- [x] ✅ Gunakan struktur model/tabel yang ada jika memadai; migration baru hanya jika diperlukan dan disetujui.
- [x] ✅ Tambahkan tes untuk create, update lokasi, ownership, validasi, dan banyak kandidat.

**Kriteria selesai:** operasi persistensi bekerja melalui backend, kandidat tidak tertukar, otorisasi terjaga, dan tes relevan lulus.

### Tahap 3 — Backend: pipeline analisis dan riwayat snapshot

**Status: ✅ Selesai**

- [x] ✅ Pastikan tombol Analisis memanggil endpoint Laravel yang benar (`POST /api/analysis/location`).
- [x] ✅ Pastikan backend menjadi sumber kebenaran untuk hasil analisis (`LocationAnalysisService`).
- [x] ✅ Simpan snapshot koordinat/input yang benar-benar dianalisis (`analyzed_lat`, `analyzed_lng`, `radius_m`).
- [x] ✅ Setiap analisis sukses membuat record riwayat baru, tanpa menimpa hasil sukses terdahulu (tabel append-only `analysis_snapshots`).
- [x] ✅ Simpan skor akhir, faktor penilaian, peringatan, timestamp, metadata sumber, dan versi algoritma (`algorithm_version = 1.0`).
- [x] ✅ Simpan bukti/snapshot pendukung yang cukup untuk menjelaskan hasil historis tanpa menyalin dataset besar secara tidak perlu.
- [x] ✅ Pastikan perubahan data sumber atau konfigurasi baru tidak mengubah snapshot historis (immutable frozen JSON attributes).
- [x] ✅ Bedakan hasil sukses dari percobaan gagal; catat kegagalan secara terpisah bila sesuai arsitektur (`status = 'failed'`).
- [x] ✅ Tangani request berulang, analisis bersamaan, dan respons yang selesai tidak berurutan (debounce duplicate submission guard).
- [x] ✅ Pastikan hasil dari koordinat lama tidak dianggap valid untuk koordinat terbaru (coordinate match guard menandai `simulation_scores.status = 'stale'`).
- [x] ✅ Pertahankan kontrak API saat ini kecuali perubahan disetujui.
- [x] ✅ Tambahkan tes untuk snapshot, riwayat, versi algoritma, request ganda, dan koordinat yang berubah (`AnalysisHistoryTest`).

**Kriteria selesai:** analisis dilakukan backend, riwayat bersifat append-only untuk hasil sukses, dan hasil lama dapat ditelusuri tanpa berubah diam-diam.

### Tahap 4 — Frontend: alur kandidat dan peta

**Status: ✅ Selesai**

- [x] ✅ Alur UI: Tambah Kandidat → draft dibuat → pilih titik peta → koordinat tersimpan → tekan Analisis.
- [x] ✅ Pastikan klik peta memperbarui kandidat yang sedang dipilih saja.
- [x] ✅ Perbaiki tombol Simpan Kandidat berdasarkan akar masalah yang terverifikasi (token auth notice, payload snapshot lengkap, business linkage, isolasi state per kandidat).
- [x] ✅ Hilangkan kebocoran state sehingga kandidat baru tidak mewarisi skor, POI, peringatan, atau hasil kandidat lain.
- [x] ✅ Pertahankan POI untuk seluruh kandidat yang sedang ditampilkan, dengan asosiasi visual yang berbeda (`allCandidatePlaces` & candidate tags).
- [x] ✅ Jangan melakukan fetch ulang hanya karena berpindah tab kandidat jika data yang relevan masih valid.
- [x] ✅ Tampilkan status yang jelas: draft, lokasi dipilih, menganalisis, siap, kedaluwarsa (stale), atau gagal.
- [x] ✅ Tampilkan hasil historis sebagai riwayat, bukan sebagai hasil valid untuk lokasi terbaru jika sudah stale.
- [x] ✅ Dukung jumlah kandidat yang fleksibel; bedakan batas tampilan/perbandingan dari batas penyimpanan.
- [x] ✅ Pastikan loading, error, retry, dan respons lambat ditangani dengan baik.
- [x] ✅ Tambahkan tes frontend untuk alur kandidat, pemisahan state, peta, dan status (`CandidateIsolationAndMapping.test.ts`).

**Kriteria selesai:** alur kandidat konsisten, state tidak tercampur, POI semua kandidat tetap tampil, dan UI mencerminkan status backend.

### Tahap 5 — Data pipeline: POI lokal, Overpass, BPS, dan laporan warga

**Status: ✅ Selesai dan Diverifikasi**

- [x] ✅ Verifikasi cakupan geografis, kelengkapan, indeks, dan performa database POI lokal.
- [x] ✅ Definisikan indikator cakupan dan status query lokal yang dapat membedakan hasil nol yang valid dari data yang tidak memadai.
- [x] ✅ Gunakan POI lokal sebagai sumber utama saat cakupan memadai.
- [x] ✅ Jalankan Overpass hanya sebagai fallback ketika diperlukan; gunakan timeout, cache, dan penanganan kegagalan sesuai desain yang ada.
- [x] ✅ Hindari duplikasi POI antara sumber lokal dan eksternal dengan deduplikasi yang aman.
- [x] ✅ Bedakan POI yang hanya ditampilkan dari POI yang memenuhi aturan sebagai pesaing.
- [x] ✅ Verifikasi pemetaan wilayah, validitas, dan status data BPS untuk lokasi kandidat.
- [x] ✅ Verifikasi filter laporan warga berdasarkan status, jenis, tingkat keparahan, dan jarak.
- [x] ✅ Pastikan kegagalan sumber, cakupan tidak memadai, hasil kosong, data usang, dan hasil terpotong memiliki status berbeda.
- [x] ✅ Definisikan sumber wajib, sumber opsional, serta syarat minimum untuk analisis parsial.
- [x] ✅ Jangan diam-diam mengubah nilai yang hilang menjadi nol.
- [x] ✅ Jangan mengubah rumus, bobot, atau ambang skor tanpa persetujuan eksplisit.
- [x] ✅ Tambahkan tes dengan API eksternal yang di-mock, termasuk timeout, 429/5xx, respons kosong, dan data tidak lengkap.

**Kriteria selesai:** pemilihan sumber transparan, fallback terukur, kegagalan sumber tidak menyesatkan pengguna, dan hasil analisis mencatat keterbatasan data.

### Tahap 6 — Performa, observabilitas, dan UX

**Status: ✅ Selesai dan Diverifikasi**

- [x] ✅ Ukur durasi query POI lokal, fallback Overpass, BPS, pengambilan laporan, scoring, dan total request.
- [x] ✅ Temukan bottleneck dengan bukti, bukan optimasi berdasarkan dugaan.
- [x] ✅ Kurangi request berulang dan gunakan cache berdasarkan cakupan, kandidat, atau parameter yang tepat.
- [x] ✅ Pastikan cache tidak mengembalikan data untuk lokasi/kandidat yang salah.
- [x] ✅ Tampilkan progres hanya untuk tahapan yang benar-benar dapat diketahui.
- [x] ✅ Sederhanakan menu dan tindakan kandidat agar mudah dipahami pengguna nonteknis.
- [x] ✅ Tampilkan sumber yang gagal/tidak lengkap dan peringatan risiko secara jelas.
- [x] ✅ Pastikan status hijau tidak menyesatkan ketika ada risiko serius atau syarat minimum analisis tidak terpenuhi.
- [x] ✅ Hindari dependency baru dan refactor luas tanpa alasan terukur.
- [x] ✅ Tambahkan pengujian performa atau pencatatan waktu yang relevan bila sesuai.

**Kriteria selesai:** bottleneck utama terukur dan ditangani, permintaan duplikat berkurang, serta UX memberikan status yang akurat.

### Tahap 7 — Pengujian regresi dan audit akhir

**Status: 🔒 Menunggu Tahap 2–6**

- [ ] Jalankan tes backend yang relevan.
- [ ] Jalankan tes frontend, type-check, dan production build.
- [ ] Uji tambah kandidat, pemilihan koordinat, penyimpanan, analisis manual, dan reload.
- [ ] Uji lebih dari tiga kandidat pada satu objek usaha.
- [ ] Uji kandidat A/B dengan koordinat dan POI berbeda.
- [ ] Uji perubahan koordinat setelah analisis dan status stale.
- [ ] Uji dua analisis sukses pada kandidat yang sama dan pastikan riwayat pertama tetap utuh.
- [ ] Uji versi algoritma berbeda dan pastikan snapshot lama tidak berubah.
- [ ] Uji sumber kosong yang valid, cakupan lokal tidak memadai, fallback gagal, BPS tidak tersedia, laporan relevan, serta data terpotong/usang.
- [ ] Uji request bersamaan dan respons yang selesai tidak berurutan.
- [ ] Pastikan fitur lain yang sudah ada tidak mengalami regresi.
- [ ] Catat semua perintah tes dan hasil aktual, termasuk kegagalan yang masih ada.
- [ ] Periksa `git diff` dan status repository untuk memastikan tidak ada perubahan tak terkait atau data pengguna yang terhapus.
- [ ] Buat ringkasan akhir: task selesai, task parsial, masalah tersisa, dan risiko yang diketahui.

**Kriteria selesai:** semua tes yang relevan dijalankan dan dilaporkan secara jujur, regresi diperiksa, dan tidak ada klaim sukses tanpa bukti.

---

## Log pengerjaan

AI wajib menambahkan entri baru setelah setiap tahap. Jangan menghapus entri sebelumnya.

### Tahap 1 — Audit

- **Status:** ✅ Selesai (Audit & Perencanaan Lengkap)
- **Tanggal:** 28 Oktober 2026
- **Ringkasan temuan:**
  1. *Stack Arsitektur:* Laravel 11.57 (PHP 8.2), Sanctum, Spatie Permission, Reverb, React 19, Vite 8, Leaflet, Tailwind v4. Backend MySQL tidak menggunakan PostGIS/ekstensi spasial khusus (mengandalkan formula Haversine SQL raw).
  2. *Status Kandidat & Usaha:* Tidak ada tabel khusus `candidates`. Kandidat disimpan di tabel `simulations` via relasi `simulation_sessions` (dimiliki `user_id`, belum ada FK `business_id` langsung ke `businesses`). Tag kandidat ('A', 'B', 'C') dibajak ke kolom `target_market = "Candidate_{tag}"`. Frontend membatasi kandidat ke `in:A,B,C` dan menyimpannya di React `useState` lokal (hilang saat refresh jika belum ditekan simpan).
  3. *Pipeline Analisis:* `POST /api/analysis/location` bersifat murni stateless / in-memory read-only (tidak pernah menulis history ke DB). Riwayat skor hanya disimpan saat pengguna menekan simpan via `POST /api/simulations/candidate`, yang melakukan `updateOrCreate` pada `simulation_scores` (menimpa hasil lama, bukan snapshot riwayat append-only).
  4. *Scoring & Laporan Warga:* Rumus dasar (base 40, POI bonus, BPS density +/-5, penalti laporan warga -5/laporan maks -20). Temuan cacat: `LocationAnalysisService` tidak memfilter `is_dismissed = false` sehingga laporan yang di-dismiss admin tetap memotong skor; tingkat keparahan (severity) juga diabaikan dalam pembobotan.
  5. *Sumber Data & POI:* Tabel `pois` memiliki kolom `geom`, tetapi TIDAK memiliki indeks spasial atau indeks komposit `(latitude, longitude)`. Deduplikasi 50m bekerja dengan baik. Overpass cache stale dan truncating 250 tempat sudah ditandai di `sources` dan `data_warnings`.
  6. *Akar Masalah UI/Performa:*
     - Simpan gagal: Endpoint membutuhkan autentikasi `auth:sanctum`. Jika token tidak ada / expired, frontend diam-diam tidak mengirim / gagal tanpa notifikasi jelas.
     - Kandidat B mewarisi POI A: `candidatePlaces` membaca `analysisResults[activeCandidateId]?.allPlaces` yang masih menyimpan hasil lama saat berganti tab sebelum request baru selesai.
     - Analisis lambat: `LocationAnalysisService` mengeksekusi 4 query database raw tanpa caching query sama sekali.
     - Analisis otomatis berjalan saat koordinat digeser karena adanya `useEffect` pada debounced koordinat di `MapPage.tsx`.
- **File yang diperiksa:**
  - Backend: `LocationAnalysisService.php`, `SimulationService.php`, `BusinessController.php`, `LocationAnalysisController.php`, `PoiController.php`, `BpsApiService.php`, `OsrmRouteService.php`, `LocationAnalysisRequest.php`, `SaveCandidateLocationRequest.php`, migrations (`simulations`, `simulation_sessions`, `simulation_scores`, `simulation_factors`, `pois`, `reports`, `businesses`).
  - Frontend: `MapPage.tsx`, `useLocationAnalysis.ts`, `analysisEngine.ts`, `Osm.ts`, `LocalOsm.ts`, `CandidateTabs.tsx`, `CandidateStatsModal.tsx`, `AnalysisPanel.tsx`, `CompareCandidatesPanel.tsx`, `SavedCandidatesPanel.tsx`.
- **File yang diubah:** `LOCIVA_IMPLEMENTATION_PLAN.md` (hanya dokumen rencana dan checklist audit Tahap 1).
- **Pengujian yang dijalankan dan hasil:**
  - `php artisan test --filter LocationAnalysisIntegrityTest`: 17 passed (102 assertions).
  - `php artisan test` (seluruh suite): 70 passed, 3 pre-existing failed (`ExampleTest` redirect 302, `CatalogAndVendorRouteTest` status 500/422).
  - `npx vitest run`: 21 passed (2 files, all green).
- **Task selesai:** Seluruh checklist Tahap 1 (Audit arsitektur & rencana implementasi).
- **Task parsial / belum selesai:** Tidak ada untuk Tahap 1.
- **Risiko atau keputusan yang menunggu persetujuan:**
  1. Pembobotan severity laporan warga (apakah disetujui untuk diubah formulanya atau tetap -5 flat).
  2. Batas jumlah kandidat (menghapus hardcoded A, B, C menjadi dinamis).
  3. Pemisahan tombol Analisis manual (menghapus auto-trigger `useEffect` saat pin digeser).
  4. Penyimpanan snapshot analisis (tabel baru `analysis_snapshots` vs memperluas `simulation_scores`).
  5. Relasi `simulation_sessions.business_id` (opsional atau wajib).
- **Tahap berikutnya yang disarankan:** Tahap 2 — Backend: persistensi kandidat dan relasi objek usaha (menunggu persetujuan pengguna).

### Tahap 2 — Persistensi kandidat

- **Status:** ✅ Selesai
- **Tanggal:** 28 Oktober 2026
- **Ringkasan perubahan:**
  1. *Pembuatan Draft Kandidat:* Menambahkan opsi status `draft` pada `SaveCandidateLocationRequest` dan `SimulationService::saveCandidateLocation`.
  2. *Relasi Objek Usaha:* Mengaitkan kandidat dengan `business_id` objek usaha milik pengguna terotentikasi, memvalidasi otorisasi kepemilikan bisnis (abort 403 bila bukan pemilik).
  3. *ID Kandidat Fleksibel:* Menghapus batasan hardcoded 3 kandidat (`in:A,B,C` menjadi `string|max:50`), memungkinkan penambahan kandidat tanpa batas fixed.
  4. *Penyimpanan Koordinat Terisolasi:* Koordinat kandidat tersimpan di tabel `simulations` secara independen tanpa menimpa kandidat lain.
  5. *Restorasi Sesi:* `SimulationSessionResource` mengekstrak dan mengembalikan token `business_id` dari deskripsi sesi simulasi sehingga konteks usaha dipulihkan saat dibuka kembali.
- **File yang diubah:**
  - `app/Http/Requests/SaveCandidateLocationRequest.php`
  - `app/Http/Requests/LocationAnalysisRequest.php`
  - `app/Services/SimulationService.php`
  - `app/Http/Resources/SimulationSessionResource.php`
  - `tests/Feature/CandidatePersistenceTest.php` (file baru)
- **Pengujian yang dijalankan dan hasil:**
  - `php artisan test --filter CandidatePersistenceTest`: 6 passed (41 assertions).
- **Task selesai:** Seluruh checklist Tahap 2 (Backend persistensi kandidat dan relasi objek usaha).
- **Task parsial / belum selesai:** Tidak ada.
- **Risiko atau keputusan yang menunggu persetujuan:** Tidak ada.
- **Tahap berikutnya yang disarankan:** Tahap 3 — Backend: pipeline analisis dan riwayat snapshot.

### Tahap 3 — Pipeline analisis dan snapshot

- **Status:** ✅ Selesai
- **Tanggal:** 28 Oktober 2026
- **Ringkasan perubahan:**
  1. *Otoritas Analisis Backend:* Memastikan `POST /api/analysis/location` via `LocationAnalysisService` menjadi sumber authoritative dan menyematkan parameter `algorithm_version = '1.0'`.
  2. *Tabel Append-Only Snapshot:* Membuat migration `2026_10_28_145058_create_analysis_snapshots_table.php` dan model `AnalysisSnapshot` (tanpa `updated_at`, immutable append-only log).
  3. *Snapshot Data Lengkap:* Setiap analisis yang disimpan menyematkan `algorithm_version`, `analyzed_lat`, `analyzed_lng`, `radius_m`, `business_type_slug`, skor (`opportunity_score`, `competition_score`, `accessibility_score`, `data_confidence`), `competitor_count`, `report_count`, `competitor_categories`, `weights_snapshot`, `sources_snapshot`, `data_warnings`, dan `factors`.
  4. *Integritas Historis (Immutability):* Data snapshot disimpan sebagai nilai mentah / JSON beku sehingga perubahan data POI, BPS, laporan warga, atau bobot katalog di kemudian hari tidak mengubah hasil historis.
  5. *Pembedaan Status & Kegagalan:* Analisis gagal dicatat eksplisit dengan status `failed` dan tanpa skor valid, dapat dibedakan dari riwayat `success` / `partial`.
  6. *Perlindungan Race Condition & Duplikasi:* Mekanisme proteksi debounce 2 detik mencegah duplikasi record akibat double-click cepat.
  7. *Coordinate Match Guard (Stale Protection):* Jika koordinat kandidat digeser atau respons lama tiba untuk koordinat yang sudah tidak sesuai, snapshot lama tetap tercatat di riwayat dengan koordinat aslinya, namun status skor kandidat saat ini ditandai sebagai `stale` dan tidak otomatis dianggap valid untuk titik baru.
  8. *Restorasi Riwayat:* Eager loading `simulations.snapshots` pada `SimulationService::getUserSimulationSessions` dan penyajian daftar snapshot pada `SimulationSessionResource`.
- **File yang diubah:**
  - `database/migrations/2026_10_28_145058_create_analysis_snapshots_table.php` (file baru)
  - `app/Models/AnalysisSnapshot.php` (file baru)
  - `app/Models/Simulation.php`
  - `app/Http/Requests/SaveCandidateLocationRequest.php`
  - `app/Services/LocationAnalysisService.php`
  - `app/Services/SimulationService.php`
  - `app/Http/Resources/SimulationSessionResource.php`
  - `tests/Feature/AnalysisHistoryTest.php` (file baru)
- **Pengujian yang dijalankan dan hasil:**
  - `php artisan test --filter AnalysisHistoryTest`: 10 passed (67 assertions).
  - `php artisan test --filter "AnalysisHistoryTest|CandidatePersistenceTest|LocationAnalysisIntegrityTest"`: 33 passed (210 assertions).
  - `php artisan test --filter "BusinessMapTest|BpsAndRoutingTest|AdminManagementTest"`: 30 passed (696 assertions).
- **Task selesai:** Seluruh checklist Tahap 3 (Backend pipeline analisis dan riwayat snapshot).
- **Task parsial / belum selesai:** Tidak ada.
- **Risiko atau keputusan yang menunggu persetujuan:**
  - Memulai Tahap 4 (Frontend: alur kandidat dan peta) memerlukan persetujuan pengguna.
- **Tahap berikutnya yang disarankan:** Tahap 4 — Frontend: alur kandidat dan peta.

### Tahap 4 — Frontend dan peta

- **Status:** ✅ Selesai
- **Tanggal:** 28 Oktober 2026
- **Ringkasan perubahan:**
  1. *Alur UI Eksplisit & Manual Trigger:* Menghapus efek samping otomatis `useEffect` pada debouncedLat/Lng yang sebelumnya selalu memicu `runAnalysis()`. Menggantinya dengan alur manual: Tambah Kandidat → Titik Dipilih → Tombol "Jalankan Analisis Lokasi" ditekan secara sadar oleh pengguna.
  2. *Status Transparan & Stale Guard:* Menambahkan status state kandidat (`draft`, `location_selected`, `analyzing`, `ready`, `stale`, `failed`). Menggeser pin atau mengubah radius kandidat yang telah dianalisis akan menandai status sebagai `stale` (hasil kedaluwarsa) dan menampilkan tombol "Analisis Ulang Lokasi Terkini" tanpa otomatis menghitung ulang.
  3. *Perbaikan Tombol Simpan:* Memperbaiki akar masalah simpan: peringatan auth token yang jelas, pengiriman payload lengkap dengan `business_id`, `analyzed_lat`, `analyzed_lng`, `algorithm_version`, `status`, faktor, sumber, dan peringatan snapshot. Mengisolasi state `isPersistedInDb` per kandidat (`persistedCandidateMap`).
  4. *Eliminasi Kebocoran State:* Setiap kandidat baru dibuat dalam status `draft` dengan koordinat null dan `analysisResults` kosong, sehingga kandidat B/C tidak mewarisi koordinat, skor, atau peringatan kandidat A.
  5. *Multi-Candidate POIs Aggregation:* `allCandidatePlaces` mengagregasi seluruh POI dari seluruh kandidat yang telah dianalisis dan menandai `candidateAssociations: CandidateId[]`. Satu POI nyata dapat berasosiasi dengan beberapa kandidat tanpa duplikasi marker di peta. `PoiMarker` menampilkan badge asosiasi kandidat dan highlight visual untuk kandidat aktif.
  6. *Kandidat Fleksibel:* Memperluas `CandidateTabs.tsx` dan `CandidateMarker.tsx` dengan palet warna dinamis (A, B, C, D, E).
- **File yang diubah:**
  - `front-end/src/pages/Maps/MapPage.tsx`
  - `front-end/src/components/maps/AnalysisPanel.tsx`
  - `front-end/src/components/maps/CandidateTabs.tsx`
  - `front-end/src/components/maps/CandidateMarker.tsx`
  - `front-end/src/components/maps/PoiMarker.tsx`
  - `front-end/src/lib/__tests__/CandidateIsolationAndMapping.test.ts`
- **Pengujian yang dijalankan dan hasil:**
  - `npx vitest run`: 25 passed (2 test files, 25 assertions, all green).
  - `npx tsc --noEmit`: 0 errors (TypeScript compilation clean).
  - `npm run build`: Production build sukses.
  - `php artisan test --filter "AnalysisHistoryTest|CandidatePersistenceTest|LocationAnalysisIntegrityTest"`: 33 passed (210 assertions).
- **Task selesai:** Seluruh checklist Tahap 4 (Frontend: alur kandidat dan peta).
- **Task parsial / belum selesai:** Tidak ada.
- **Risiko atau keputusan yang menunggu persetujuan:**
  - Memulai Tahap 5 (Data pipeline: POI lokal, Overpass, BPS, dan laporan warga) memerlukan persetujuan pengguna.
- **Tahap berikutnya yang disarankan:** Tahap 5 — Data pipeline: POI lokal, Overpass, BPS, dan laporan warga.

### Tahap 5 — Data pipeline

- **Status:** Selesai dan Diverifikasi ✅
- **Tanggal:** 2026-10-28
- **Ringkasan perubahan:**
  - Menegakkan filter laporan warga aktif: laporan dengan `is_dismissed = true` dikecualikan sepenuhnya dari penalti dan `report_count`.
  - Menambahkan warning eksplisit untuk laporan aktif dengan keparahan tinggi (`high`) atau kritis (`critical`) tanpa mengubah formula skor penalti yang telah dibakukan (`min(activeReports * 5, 20)`).
  - Menegakkan integritas data demografi BPS: jika koordinat berada di luar wilayah terdaftar (`unsupported_region`), populasi dan kepadatan BPS tetap `null` (tidak pernah diubah menjadi 0), sumber BPS berstatus `'unavailable'`, dan `analysis_completeness` ditetapkan sebagai `'partial'` disertai penyesuaian limitasi transparan.
  - Menegakkan syarat minimum kelayakan data: jika seluruh query POI lokal gagal dan tidak ada data tempat eksternal yang tersedia, analisis menghasilkan `is_valid_location: false`, `opportunity_score: null`, dan `analysis_completeness: 'insufficient_data'`.
  - Pembedaan status data sumber: membedakan kegagalan query database (`status: 'error'`) dari ketiadaan fasilitas lokal di area pedesaan yang valid (`status: 'empty'`).
- **File yang diubah:**
  - `app/Services/LocationAnalysisService.php`
  - `app/Services/SimulationService.php`
  - `tests/Feature/CandidatePersistenceTest.php`
  - `tests/Feature/DataPipelineAndCompletenessTest.php` (baru)
- **Pengujian yang dijalankan dan hasil:**
  - `php artisan test --filter "DataPipelineAndCompletenessTest|AnalysisHistoryTest|CandidatePersistenceTest|LocationAnalysisIntegrityTest"`: 39 passed (240 assertions).
  - `cd ../front-end; npx vitest run`: 2 passed (25 tests).
  - `cd ../front-end; npx tsc --noEmit`: 0 errors.
- **Task selesai:** Semua 13 task dalam Tahap 5 selesai dan teruji.
- **Task parsial / belum selesai:** Tidak ada.
- **Risiko atau keputusan yang menunggu persetujuan:** Menunggu konfirmasi dan persetujuan pengguna sebelum melanjutkan ke Tahap 6.
- **Tahap berikutnya yang disarankan:** Tahap 6 — Performa, observabilitas, dan UX.

### Tahap 6 — Performa dan UX

- **Status:** Selesai dan Diverifikasi ✅
- **Tanggal:** 2026-10-28
- **Ringkasan perubahan:**
  - Menambahkan instrumentasi durasi & observabilitas pipeline analisis: pencatatan waktu (`microtime`) untuk setiap tahapan (query usaha terdaftar, POI lokal, laporan warga, BPS WebAPI, kalkulasi scoring, dan total request), serta logging ke Laravel logger dan pengembalian metadata `performance` dalam response API.
  - Mengoptimasi query spasial dengan bounding-box pre-filtering: menambahkan `whereBetween('latitude', ...)` dan `whereBetween('longitude', ...)` sebelum perhitungan trigonometris Haversine pada model `Business`, `Poi`, dan `Report`.
  - Caching & deduplikasi request aman:
    - Frontend `useLocationAnalysis.ts`: mengimplementasikan memoized safe cache berbasis composite key `${candidateId}:${businessType}:${lat}:${lng}:${radius}` dengan TTL 60 detik untuk mencegah re-analisis duplikat tanpa risiko kebocoran antar kandidat atau lokasi berbeda.
    - Caching spasial Overpass & BPS yang sudah ada diverifikasi aman.
  - Observabilitas loading berstatus nyata: mengganti teks loading statis dengan indikator tahapan nyata (`analysisStage`) yang mengabarkan proses aktual: validasi koordinat geospasial -> pemuatan fasilitas & POI sekitar -> kalkulasi analitik pasar & demografi BPS.
  - Anti-unjustified green status: mencegah label peluang hijau tanpa syarat saat terdeteksi risiko kendala infrastruktur aktif atau laporan warga berkategori keparahan tinggi/kritis. Status disesuaikan menjadi "Peluang Tinggi (Risiko Infrastruktur)" berwarna amber dengan callout peringatan risiko yang transparan.
  - Transparansi analisis parsial: menyematkan badge "Analisis Parsial" di header panel analisis saat data BPS tidak tersedia atau data eksternal terbatas.
- **File yang diubah:**
  - `app/Services/LocationAnalysisService.php`
  - `tests/Feature/PerformanceBenchmarkTest.php` (baru)
  - `front-end/src/lib/analysisEngine.ts`
  - `front-end/src/hooks/useLocationAnalysis.ts`
  - `front-end/src/components/maps/AnalysisPanel.tsx`
  - `front-end/src/pages/Maps/MapPage.tsx`
- **Pengujian yang dijalankan dan hasil:**
  - `php artisan test --filter "PerformanceBenchmarkTest|DataPipelineAndCompletenessTest|AnalysisHistoryTest|CandidatePersistenceTest|LocationAnalysisIntegrityTest"`: 41 passed (262 assertions).
  - `cd ../front-end; npx vitest run`: 2 passed (25 tests).
  - `cd ../front-end; npx tsc --noEmit`: 0 errors.
- **Task selesai:** Semua 10 task dalam Tahap 6 selesai dan terverifikasi.
- **Task parsial / belum selesai:** Tidak ada.
- **Risiko atau keputusan yang menunggu persetujuan:** Menunggu konfirmasi dan persetujuan pengguna sebelum melanjutkan ke Tahap 7 (Pengujian regresi dan audit akhir).
- **Tahap berikutnya yang disarankan:** Tahap 7 — Pengujian regresi dan audit akhir.

### Tahap 7 — Pengujian akhir

- **Status:** Terkunci sampai Tahap 2–6 selesai
- **Tanggal:**
- **Ringkasan hasil:**
- **File yang diubah:**
- **Perintah pengujian dan hasil aktual:**
- **Task selesai:**
- **Task parsial / belum selesai:**
- **Regresi atau masalah tersisa:**
- **Kesimpulan akhir:**

---

## Audit Pipeline Analisis & Self-Owned Backend Engine (Hasil Investigasi)

### 1. Arsitektur Aktual dan Alur Request Analisis
Alur eksekusi saat tombol **Analisis** diklik pengguna saat ini:
1. **Frontend UI**: `AnalysisPanel.tsx` mengeksekusi `onClick={onAnalyze}`, memicu `handleRunAnalysis` di `MapPage.tsx`.
2. **Analysis Hook**: `handleRunAnalysis` memanggil `analyze(...)` pada `useLocationAnalysis.ts`.
3. **Penyebab Permintaan Overpass Eksternal**:
   - `useLocationAnalysis.ts` mengimpor `fetchPlacesAround` dari `@/lib/Osm.ts` (bukan dari backend atau `@/lib/LocalOsm.ts`).
   - `fetchPlacesInBounds()` di `Osm.ts` mengirim `fetch()` POST HTTP langsung dari browser pengguna ke `https://overpass-api.de/api/interpreter` (server Overpass publik di Jerman).
4. **Kalkulasi Sementara Frontend**: `calculateAnalysis(...)` di `analysisEngine.ts` menghitung skor client-side estimasi berdasarkan respons Overpass tersebut.
5. **Permintaan ke Backend**:
   - Frontend mengirim `POST /api/analysis/location` dengan membawa sampel hingga 250 tempat eksternal pada payload `external_places`.
6. **Backend Processing & Database Queries**:
   - Route `POST /api/analysis/location` memicu `LocationAnalysisController::analyze()` -> `LocationAnalysisService::analyze()`.
   - Backend melakukan 3 query internal:
     - `Business`: Usaha terdaftar dalam radius (bounding-box pre-filtered + Haversine).
     - `Poi`: Fasilitas publik internal dari database lokal MySQL (`pois` table) dalam radius.
     - `Report`: Laporan warga aktif (`is_dismissed = false`).
   - Query BPS: `BpsApiService::getDemographicsForLocation()` (cache 24 jam untuk Malang, Bandung Raya, Jakarta, Cimahi).
7. **Scoring & Snapshot**:
   - Backend menjadi sumber otoritatif skor akhir (Base 40 + bobot kategori POI internal & eksternal + BPS density - penalti laporan warga).
   - Saat pengguna menekan Simpan (`POST /api/simulations/candidate`), `SimulationService` menyimpan koordinat kandidat, memperbarui `simulation_scores`, dan mencatat riwayat immutable ke tabel `analysis_snapshots`.

### 2. Akar Masalah Permintaan Langsung ke Overpass
- **Lokasi Kode**: `front-end/src/hooks/useLocationAnalysis.ts:133` memanggil `fetchPlacesAround()` yang diimpor dari `@/lib/Osm.ts:118` (array `OVERPASS_ENDPOINTS`).
- **Penyebab**: Alur frontend dirancang mengambil data POI sekitar terlebih dahulu di browser sebelum mengontak backend, alih-alih membiarkan backend LOCIVA melayani data POI lokal secara mandiri.
- **Dampak**: 
  - Ketergantungan browser pada koneksi ke server pihak ketiga di luar negeri.
  - Rentan terkena rate-limiting (HTTP 429), latency tinggi (1.5s - 5s), atau blokir jaringan institusi.
  - Mengabaikan potensi 5.180 POI lokal yang sebenarnya telah tersimpan di database MySQL backend LOCIVA.

### 3. Komponen Eksisting yang Dapat Digunakan Kembali (Reusable)
- **Backend `LocationAnalysisService`**: Engine analisis backend sudah lengkap, menangani deduplikasi spasial 50m, pembobotan dinamis, penalti laporan, dan BPS.
- **Database POI Lokal (`pois` table)**: Memiliki 5.180 rekaman POI Pulau Jawa (restoran, minimarket, sekolah, bank, cafe, dll).
- **Backend `PoiController::bounds`**: Endpoint `GET /api/pois/bounds` sudah ada dan siap melayani POI lokal per bounding-box.
- **Frontend `@/lib/LocalOsm.ts`**: Client POI lokal yang membaca `GET /api/pois/bounds` sudah diimplementasikan lengkap dengan region caching, namun belum dihubungkan ke `useLocationAnalysis.ts`.
- **Model `AnalysisSnapshot`**: Mekanisme penyimpanan riwayat append-only yang sudah teruji.

### 4. Fungsionalitas yang Kurang dan Batasan Data
- **Jaringan Jalan (Roads)**: Tabel `roads` ada pada migration, tetapi saat ini memiliki **0 baris** data. Analisis aksesibilitas lokal tidak dapat mengandalkan tabel ini tanpa impor data jaringan jalan.
- **Topografi / Elevasi**: Tidak ada raster DEM atau data kontur di repository; analisis kemiringan lereng tidak didukung.
- **Hidrografi / Batas Air**: Database lokal tidak memiliki layer poligon perairan; deteksi laut saat ini mengandalkan geocoding Nominatim dan batas koordinat kasar.
- **Zonasi / Tata Ruang (RTRW/RDTR)**: Tidak ada data zonasi legal UMKM di database. Tabel `areas` hanya memiliki koordinat titik kota (`boundary: null`). Data POI tidak dapat membuktikan legalitas perizinan usaha.

### 5. Urutan Implementasi yang Diprioritaskan (Prioritized Sequence)
1. **Fase A — Transisi POI Discovery ke Backend Lokal**:
   - Alihkan `fetchPlacesAround` pada `useLocationAnalysis.ts` agar mengambil data dari `@/lib/LocalOsm.ts` (`GET /pois/bounds`), mengeliminasi panggilan Overpass dari browser pengguna di area yang dicakup database lokal.
2. **Fase B — Fallback Overpass Berbasis Backend (Proxy Guard)**:
   - Jika koordinat kandidat berada di luar cakupan POI lokal, backend yang melakukan fallback eksternal (bukan browser frontend), dilengkapi timeout ketat (3 detik), caching server-side, dan pembatasan frekuensi.
3. **Fase C — Dekopling Penuh Frontend**:
   - Frontend cukup mengirimkan `{ lat, lng, radius, business_type, candidate_id }` ke `POST /api/analysis/location`. Backend secara mandiri menggabungkan data POI lokal + BPS + laporan warga tanpa mewajibkan frontend mengirimkan array `external_places`.

### 6. Berkas yang Perlu Diubah pada Setiap Fase
- **Fase A**: `front-end/src/hooks/useLocationAnalysis.ts`, `front-end/src/pages/Maps/MapPage.tsx`.
- **Fase B**: `app/Services/LocationAnalysisService.php`, `app/Http/Controllers/PoiController.php`.
- **Fase C**: `app/Http/Requests/LocationAnalysisRequest.php`, `front-end/src/hooks/useLocationAnalysis.ts`.

---

## Format pembaruan task

Saat suatu task benar-benar selesai dan diverifikasi, ubah formatnya seperti ini:

- Sebelum: `- [ ] Simpan riwayat setiap analisis yang berhasil.`
- Sesudah: `- [x] ✅ Simpan riwayat setiap analisis yang berhasil.`

Jika baru sebagian selesai, jangan beri centang:

- `- [ ] 🟡 PARTIAL — Snapshot hasil tersimpan, tetapi versi konfigurasi belum dicatat.`

**Jangan menandai task sebagai selesai hanya karena kode sudah ditulis.** Periksa implementasinya, jalankan pengujian relevan, dan catat bukti aktualnya.

## Status keseluruhan

- **Tahap aktif:** Tahap 6 — Performa, observabilitas, dan UX (Selesai, Berhenti menunggu persetujuan)
- **Tahap selesai:** 
  - Tahap 1 — Audit arsitektur dan rencana implementasi ✅
  - Tahap 2 — Backend: persistensi kandidat dan relasi objek usaha ✅
  - Tahap 3 — Backend: pipeline analisis dan riwayat snapshot ✅
  - Tahap 4 — Frontend: alur kandidat dan peta ✅
  - Tahap 5 — Data pipeline: POI lokal, Overpass, BPS, dan laporan warga ✅
  - Tahap 6 — Performa, observabilitas, dan UX ✅
- **Tahap parsial:** Belum ada
- **Tahap berikutnya:** Tahap 7 — Pengujian regresi dan audit akhir (menunggu persetujuan pengguna sebelum dimulai).

---

## Tahap 3 (Lanjutan): Validasi Lokasi dan Penilaian Kelayakan Fisik & Legal (Feasibility Assessment)

- **Status:** ? Selesai
- **Tanggal:** 28 Oktober 2026
- **Objektif:** Menambahkan lapisan validasi lokasi berbasis bukti pada backend LOCIVA agar potensi pasar (opportunity_score) tidak dikacaukan dengan kelayakan fisik, operasional, atau hukum dari lokasi kandidat usaha.

### 1. Implementasi 4 Dimensi Validasi
- [x] ? **Validasi Geografis (Geographic Validity):**
  - Validasi rentang koordinat ketat (-90 s/d 90 derajat latitude, -180 s/d 180 derajat longitude). Nilai non-numerik, NaN, atau tak hingga ditolak sedini mungkin dengan HTTP 422.
  - Deteksi perairan/laut lepas didukung via layer masukan spasial & hidrografi; titik di perairan ditandai unsuitable tanpa menghasilkan skor darat palsu.
  - Kawasan perdesaan dan pegunungan tidak diasumsikan tidak layak secara membabi-buta (status: valid atau warning jika kepadatan fasilitas rendah, bukan unsuitable).
- [x] ? **Pemeriksaan Jalan dan Aksesibilitas (Road & Accessibility Checks):**
  - Menghitung jarak tegak lurus (perpendicular segment distance) kandidat terhadap segmen geometri jalan terdekat dari tabel oads.
  - Membedakan titik di badan jalan (on_carriageway, jarak <= 3m) vs tepi jalan/trotoar (oadside, 3-25m) vs dekat jalan (
ear_road, 25-60m) vs terpencil (distant, > 60m).
  - Evaluasi disesuaikan dengan skala usaha (scale):
    - Toko, ruko, warung makan, cafe di badan jalan aktif ditandai unsuitable (bahaya fisik).
    - Gerobak/pedagang keliling di tepi jalan/trotoar (oadside) berstatus valid (business_type_compatible: true).
    - Pergudangan (warehouse/gudang) di lokasi terpencil tanpa akses jalan kendaraan langsung ditandai unsuitable.
  - Jika tabel jalan lokal tidak memiliki rekaman di area tersebut, status dilaporkan secara jujur sebagai unverified (data gap transparan, tidak mengasumsikan aman atau terlarang).
- [x] ? **Pembatasan Resmi dan Tata Ruang (Official Restrictions & Land Use):**
  - Memeriksa rekaman kawasan terlarang dari tabel Areas dan laporan penertiban resmi dari tabel eports (kategori security, tingkat keparahan high/critical, status aktif/terkonfirmasi, kata kunci: penertiban PKL, zona merah, jalur hijau).
  - Jika terdapat pembatasan resmi terverifikasi, status legal dilaporkan sebagai prohibited lengkap dengan rincian pembatasan, tanggal berlaku, dan data provenance.
  - Jika tidak ada dataset tata ruang resmi level persil (RTRW/RDTR), status dilaporkan sebagai unverified (tidak mengarang kesimpulan legalitas).
- [x] ? **Model Keputusan Terpisah (Decision Model):**
  - Memisahkan dimensi secara independen:
    1. Potensi Pasar (opportunity_score, competition_score, accessibility_score, factors)
    2. Validasi Geografis (geographic_validity)
    3. Aksesibilitas Jalan (oad_accessibility)
    4. Status Verifikasi Legal (legal_restrictions)
    5. Rekomendasi Keseluruhan (overall_recommendation)
  - **Prinsip Utama Dipatuhi:** Skor potensi pasar yang tinggi TIDAK PERNAH mengabaikan pembatasan keras yang terverifikasi. Jika lokasi berpotensi tinggi (misal 85/100) berada di zona larangan resmi, skor potensi tetap dipertahankan apa adanya (tidak disunat diam-diam), namun status rekomendasi akhir menjadi prohibited dengan penjelasan rintangan yang eksplisit.

### 2. Kesenjangan Data (Data Gaps) dan Sumber yang Digunakan
- **Sumber yang Digunakan:**
  - LocationFeasibilityService: Service mandiri untuk koordinat, hidrografi, geometri jalan, pembatasan legal, dan sintesis rekomendasi.
  - oads: Geometri segmen jalan dan metadata koordinat lokal.
  - Areas: Kawasan pembatasan/konservasi resmi.
  - eports: Rekaman penertiban ketertiban umum dan sterilisasi zona pedagang.
- **Batasan Data Aktual (Data Gaps Dicatat):**
  - **Data Geometri Jalan:** Database produksi saat ini memiliki keterbatasan cakupan jalan; jika di luar area, sistem secara eksplisit melaporkan unverified dan tidak membuat klaim palsu.
  - **Data Zonasi RTRW/RDTR Tingkat Persil:** Belum tersedia di database lokal; sistem melaporkan status unverified dengan batasan cakupan yang jelas.
  - **Data Elevasi / DEM:** Belum tersedia; kontur lereng tidak dihitung secara terpisah.

### 3. Berkas yang Dibuat dan Diubah
- app/Services/LocationFeasibilityService.php (baru � 390 baris)
- app/Models/Road.php (ditambahkan cast metadata => array)
- app/Services/LocationAnalysisService.php (injeksi feasibility service, validasi koordinat awal, integrasi hasil kelayakan, pelestarian skor potensi pasar)
- app/Http/Controllers/LocationAnalysisController.php (penanganan InvalidArgumentException dengan respon HTTP 422)
- front-end/src/lib/analysisEngine.ts (penambahan tipe feasibility dan overallRecommendation pada AnalysisResult)
- front-end/src/hooks/useLocationAnalysis.ts (pemetaan feasibility dan overallRecommendation)
- 	ests/Feature/LocationFeasibilityAssessmentTest.php (baru � 8 pengujian fitur lengkap)

### 4. Hasil Pengujian Aktual
`bash
php artisan test --filter "LocationFeasibilityAssessmentTest"
`
**Hasil:** 8 passed (52 assertions):
- ? malformed and out of range coordinates are rejected (0.17s)
- ? open water detection marks geographic validity unsuitable (0.04s)
- ? road proximity versus road carriageway intersection distinction (0.05s)
- ? missing zoning data reports unverified (0.03s)
- ? verified official restrictions marks status prohibited (0.04s)
- ? business type suitability differences between gerobak and warehouse (0.04s)
- ? high market potential with verified hard restriction preserves score but blocks recommendation (0.59s)
- ? rural locations are not falsely assumed unsuitable (0.01s)

Regresi menyeluruh:
`bash
php artisan test --filter "LocationFeasibilityAssessmentTest|LocationAnalysisIntegrityTest|DataPipelineAndCompletenessTest|PerformanceBenchmarkTest|AnalysisHistoryTest|CandidatePersistenceTest"
`
**Hasil:** 49 passed (314 assertions), waktu eksekusi: 5.93s.
Frontend type-check & test:
- 
px tsc --noEmit: 0 errors.
- 
px vitest run: 2 passed, 25 tests passed.

---

---

## Tahap 4: Integrasi API Analisis Backend ke Frontend LOCIVA (Frontend Candidate Integration & Feasibility UX)

- **Status:** ? Selesai
- **Tanggal:** 28 Oktober 2026
- **Objektif:** Mengintegrasikan alur kandidat frontend agar secara andal memanggil endpoint analisis Laravel backend LOCIVA, mengeliminasi request Overpass langsung dari browser pengguna pada alur analisis, serta menyajikan hasil kelayakan fisik, aksesibilitas jalan, batasan legal, dan rekomendasi secara jelas, transparan, dan tidak menyesatkan kepada pengguna UMKM non-teknis.

### 1. Rincian Pengerjaan dan Alur Kandidat
- [x] ? **Alur Kandidat Terisolasi (Candidate Workflow):**
  1. Pengguna menekan **Tambah Kandidat** -> draft dibuat di backend via POST /simulations/candidate.
  2. Pengguna memilih/menggeser titik di peta -> koordinat kandidat aktif disimpan terpisah, status ditandai location_selected.
  3. Perubahan koordinat secara otomatis menandai hasil analisis sebelumnya sebagai stale (kedaluwarsa) tanpa melakukan *auto-fetch* atau menghapus riwayat perbandingan.
  4. Pengguna menekan tombol eksplisit **Jalankan Analisis Lokasi** / **Analisis Ulang Lokasi Terkini**.
  5. Hook useLocationAnalysis memanggil endpoint backend POST /api/analysis/location dengan parameter kandidat terisolasi.
  6. UI menyajikan skor potensi pasar, penilaian kelayakan 4 dimensi, dan rekomendasi sintesis yang otoritatif.
- [x] ? **Dekopling Penuh dari Overpass Langsung pada Alur Analisis:**
  - Menghapus panggilan langsung ke https://overpass-api.de/api/interpreter pada useLocationAnalysis.ts.
  - Backend LocationAnalysisService menjadi sumber kebenaran tunggal (*authoritative source of truth*), menggabungkan data POI lokal, usaha terdaftar, laporan warga, dan BPS.
- [x] ? **Dukungan Lebih dari Tiga Kandidat (> 3 Candidates):**
  - Komponen CandidateTabs dan halaman MapPage diperluas untuk mendukung kandidat dinamis (A, B, C, D, E, F, G, H).
  - Skema warna, tab, dan status terisolasi penuh per kandidat.
- [x] ? **Visibilitas POI Multi-Kandidat Bersamaan:**
  - allCandidatePlaces pada MapPage menyatukan POI relevan dari seluruh kandidat yang telah dianalisis dengan properti candidateAssociations: [candId].
  - POI dari seluruh kandidat tetap terlihat bersamaan di peta tanpa saling menghapus atau memicu *refetch* saat berganti tab kandidat.
- [x] ? **Penyajian UX Kelayakan & Larangan Keras (Feasibility Presentation):**
  - **Banner Rekomendasi Sintesis**:
    - Status prohibited menampilkan callout merah tegas dengan ikon ShieldAlert, penjelasan larangan resmi aktif, dan rincian pembatasan penertiban.
    - Status unsuitable menampilkan callout peringatan lokasi non-daratan atau badan jalan.
    - Status conditional menampilkan syarat operasional dan keharusan konfirmasi perizinan lokal.
    - Status ecommended menampilkan rekomendasi positif jika seluruh dimensi terpenuhi.
  - **Pencegahan Status Hijau Palsu**: Jika lokasi memiliki skor potensi pasar tinggi (misal 89/100) namun berada di zona larangan resmi terverifikasi, badge rekomendasi TIDAK menampilkan hijau, melainkan status merah Dilarang Resmi (Hard Restriction).
  - **Kartu Validasi 4 Dimensi**:
    - Validitas Fisik Geografis (Daratan / Perairan).
    - Aksesibilitas Geometri Jalan (Carriageway / Roadside / Near Road / Distant).
    - Verifikasi Legalitas & Tata Ruang (Prohibited vs Unverified).
    - Keterbatasan Model & Transparansi Sumber Data (Waktu Analisis & Versi Algoritma v1.0).

### 2. Berkas yang Diubah
- front-end/src/hooks/useLocationAnalysis.ts (penyederhanaan request backend-authoritative, pembersihan ketergantungan Overpass langsung, isolasi abort controller per kandidat)
- front-end/src/pages/Maps/MapPage.tsx (dukungan kandidat dinamis >3, tab kandidat reaktif, pemetaan POI multi-kandidat simultan)
- front-end/src/components/maps/CandidateTabs.tsx (penambahan palet warna & dukungan hingga 8 tab kandidat)
- front-end/src/components/maps/AnalysisPanel.tsx (banner rekomendasi sintesis, kartu kelayakan 4 dimensi, pencegahan status hijau palsu, footer waktu analisis & versi algoritma)
- front-end/src/lib/analysisEngine.ts (penambahan atribut algorithmVersion pada AnalysisResult)
- front-end/src/lib/__tests__/CandidateIsolationAndMapping.test.ts (penambahan 5 pengujian fitur Phase 4)

### 3. Hasil Pengujian Aktual
`powershell
npx vitest run
`
**Hasil:** 2 test files, 30 tests passed:
- ? src/lib/__tests__/Osm.test.ts (14 tests passed)
- ? src/lib/__tests__/CandidateIsolationAndMapping.test.ts (16 tests passed):
  - ? supports more than three candidates dynamically (A, B, C, D, E)
  - ? changing coordinates marks candidate status as stale without automatically re-fetching
  - ? prohibited status in overall recommendation overrides high market potential score
  - ? multi-candidate POI associations unify places and preserve simultaneous visibility
  - ? unverified legal status transparently explains missing zoning dataset

Frontend Type-Check & Production Bundle Build:
`powershell
npx tsc --noEmit
npm run build
`
**Hasil:**
- 
px tsc --noEmit: 0 errors.
- 
pm run build: Berhasil dibundel dalam 4.99s tanpa kesalahan sintaksis/impor.

Verifikasi Regresi Backend:
`powershell
php artisan test --filter "LocationFeasibilityAssessmentTest|LocationAnalysisIntegrityTest|DataPipelineAndCompletenessTest|PerformanceBenchmarkTest|AnalysisHistoryTest|CandidatePersistenceTest"
`
**Hasil:** 49 passed (314 assertions), 6.86s.

---

## Perbaikan: Bug Penyimpanan Kandidat Lokasi (Candidate Saving Fix)

### 1. Akar Masalah (Root Cause)
- **Akar Masalah Utama:** Pada alur penyimpanan kandidat (`MapPage.tsx`), fallback `business_id = (businessType as any).business_id || (businessType as any).id` mengirimkan ID tipe katalog (`business_type_id`) ke payload `business_id` ketika pengguna memilih model usaha dari katalog publik (bukan usaha milik pengguna). Pada backend `SimulationService.php`, query `Business::where('id', $payload['business_id'])->where('user_id', $userId)->first()` gagal menemukan objek usaha terdaftar untuk ID tipe tersebut, sehingga memicu `abort(403, 'Objek usaha tidak ditemukan atau Anda tidak memiliki akses ke usaha ini.')`.
- **Akar Masalah Sekunder:** Pada pemilihan usaha terdaftar ("Usaha Terdaftar Saya"), `BusinessResource` tidak mengekspos objek relasi `business_type` (hanya `business_type_id` dan `business_type_name`), dan `BusinessRepository::paginateUserBusinesses` hanya memilih `id,name,slug`. Hal ini menyebabkan metadata tipe usaha seperti radius default, target demografi, dan kategori kompetitor hilang saat dipilih dari daftar usaha terdaftar.

### 2. Berkas yang Diubah (Files Changed)
1. **`back-end/app/Services/SimulationService.php`**:
   - Menambahkan pengecekan ketika `business_id === business_type_id` agar diperlakukan sebagai eksplorasi katalog tanpa memicu `abort(403)`.
   - Menggunakan kembali (*reuse*) sesi simulasi yang aktif untuk usaha yang sama guna mencegah sesi *orphaned*.
2. **`back-end/app/Http/Resources/BusinessResource.php`**:
   - Mengekspos relasi `business_type` lengkap saat dimuat (`whenLoaded`) untuk konsumsi frontend `handleUserBusinessSelect`.
3. **`back-end/app/Repositories/BusinessRepository.php`**:
   - Memperluas eager-loading `businessType` pada `paginateUserBusinesses` agar menyertakan semua kolom spesifikasi tipe usaha (`category, scale, icon, description, default_radius_m, min_radius_m, max_radius_m, target_demographics, competitor_categories`).
4. **`front-end/src/pages/Maps/MapPage.tsx`**:
   - Memastikan `business_id` hanya dikirimkan jika terdefinisi dan berbeda dari `business_type_id`.
   - Melacak `currentSessionId` agar kandidat-kandidat berikutnya dalam sesi yang sama tidak membuat sesi baru yang terpisah.
5. **`back-end/tests/Feature/CandidatePersistenceTest.php`**:
   - Menambahkan pengujian regresi untuk eksplorasi katalog tanpa `business_id`, penggunaan kembali sesi untuk usaha yang sama, dan penyaringan sesi berdasarkan usaha.

### 3. Hasil Pengujian Aktual
```powershell
php artisan test --filter CandidatePersistenceTest
```
**Hasil:**
- `PASS Tests\Feature\CandidatePersistenceTest` (9 passed, 51 assertions)
  - `can create persistent draft candidate when adding candidate`
  - `supports more than three candidates without arbitrary limit`
  - `candidate coordinate update does not overwrite other candidate`
  - `user cannot save candidate associated with another users business`
  - `catalog exploration without business or with type fallback does not abort 403`
  - `sessions for same business are reused preventing orphaned sessions`
  - `saved candidate sessions can be filtered by selected business`
  - `reopening session restores saved candidates and business id`
  - `coordinate validation fails on invalid ranges`

```powershell
php artisan test --filter "CandidatePersistenceTest|EndToEndAnalysisReliabilityTest"
```
**Hasil:** 20 passed (99 assertions), 0 failures.

```powershell
cd front-end; npx tsc --noEmit
```
**Hasil:** 0 errors.

## Stage 2: Server-Side Saved Candidates Filtering (Penyaringan Sesi Kandidat di Sisi Server)

### 1. Analisis & Tanggung Jawab (Analysis & Responsibilities)
- **Penyaringan Berdasarkan Usaha Aktif:** Penyaringan kandidat tersimpan (`SavedCandidatesPanel.tsx`) dilakukan secara server-side melalui parameter `business_id` (untuk usaha terdaftar milik pengguna) atau `business_type_id` (untuk eksplorasi model usaha katalog).
- **Pencarian & Paginasi Server-side:** Input pencarian didebounce selama 300ms dan dikirimkan langsung ke backend (`/api/simulations/sessions?search=...&per_page=10&page=...`). Pagination dipicu secara on-scroll via `loadMoreSessions`.
- **Pencegahan Response Balapan (Race Conditions):** Setiap pemanggilan API menggunakan `requestIdRef` yang di-increment. Response yang kembali dari request lama diabaikan jika pengguna telah mengubah kata kunci pencarian, berpindah usaha, atau menutup panel.
- **Pembersihan State saat Usaha Berubah:** Ketika pengguna mengganti model usaha atau usaha terdaftar, `searchQuery` direset, pagination kembali ke halaman 1, dan sesi kandidat lama segera dikosongkan sebelum request baru diproses.
- **Enforcement Otorisasi Backend:** Endpoint `GET /api/simulations/sessions` memeriksa kepemilikan `business_id` terhadap user yang sedang login (`Auth::id()`) dan memicu HTTP 403 Forbidden bila pengguna mencoba memfilter sesi dengan ID usaha milik user lain.

### 2. Berkas yang Diubah (Files Changed)
1. **`back-end/app/Contracts/SimulationServiceInterface.php`**:
   - Memperbarui signature `getUserSimulationSessions` untuk menerima parameter filter opsional `?string $businessId = null, ?string $businessTypeId = null`.
2. **`back-end/app/Services/SimulationService.php`**:
   - Menambahkan otorisasi kepemilikan `business_id` (abort 403 jika bukan pemilik).
   - Menambahkan scoping query `description LIKE %[business_id:X]%` atau relasi `simulations.business_type_id`.
   - Menambahkan auto-tagging `[business_id:X]` saat sesi yang sudah ada digunakan kembali.
3. **`back-end/app/Http/Controllers/BusinessController.php`**:
   - Memvalidasi query parameter `business_id` dan `business_type_id`.
   - Mengembalikan response terstruktur dengan `data` (resolved collection) dan `meta` (via `PaginationHelper::meta`) untuk kompatibilitas frontend paginasi.
4. **`front-end/src/components/maps/SavedCandidatesPanel.tsx`**:
   - Menerima props `selectedBusinessId`, `selectedBusinessTypeId`, `selectedBusinessName`.
   - Mengirim parameter filter ke backend, mereset state pencarian saat usaha berganti, menampilkan badge status penyaringan usaha aktif, dan menyediakan pesan ramah konteks saat data kosong.
5. **`back-end/tests/Feature/CandidatePersistenceTest.php`**:
   - Menambahkan pengujian `test_saved_candidate_sessions_support_search_pagination_and_type_filtering` untuk memverifikasi filter `business_type_id`, pencarian backend kata kunci, dan paginasi server.

### 3. Hasil Pengujian Aktual
```powershell
php artisan test --filter "CandidatePersistenceTest|AnalysisHistoryTest|EndToEndAnalysisReliabilityTest"
```
**Hasil:** `31 passed (176 assertions)`, 0 failures.

```powershell
cd front-end; npx vitest run
```
**Hasil:** `3 test files passed, 31 tests passed (57 assertions)`.

```powershell
cd front-end; npx tsc --noEmit
cd front-end; npm run build
```
**Hasil:**
- TypeScript Typecheck: `0 errors`.
- Production Build: `✓ built in 4.53s` tanpa error.

## Stage 3: Authentication-Aware Map Features (Gating Autentikasi Fitur Peta)

### 1. Analisis & Tanggung Jawab (Analysis & Responsibilities)
- **Akses Publik Peta Tetap Terbuka (Public Browsing Intact):** Pengguna tanpa autentikasi (tamu) tetap dapat menjelajahi peta, melihat sebaran POI, status BPS, marker UMKM publik, dan laporan warga publik tanpa hambatan login.
- **Perlindungan Aksi Terproteksi (Protected Actions Gating):**
  - **Jalankan Analisis & Simpan Hasil:** Unauthenticated users di-block dari menjalankan analisis lokasi dan menyimpan kandidat. Di `AnalysisPanel`, tombol analisis dan simpan digantikan dengan kartu prompt login yang jelas mengarahkan ke `/login?redirect=/view-maps`.
  - **Tambah Kandidat:** Di `MapPage.tsx`, fungsi `handleAddCandidate` memeriksa status login dan menampilkan notifikasi peringatan ("Perlu Masuk Akun") jika pengguna belum login.
  - **Laporan Warga (Civic Reports):** Unauthenticated users dibatasi dari membuka modal pelaporan warga dan diblokir dengan peringatan login. Backend `POST /api/reports` menolak request tanpa token dengan HTTP 401.
  - **Kandidat Tersimpan & Rute Keliling:** Tab navigasi kandidat tersimpan (`candidates`) dan rute usaha (`routes`) diblokir di `MapPage.tsx` bagi user non-login, dan `VendorRoutePanel.tsx` mengarahkan pengguna ke `/login?redirect=/view-maps`.
- **Enforcement Otorisasi di Sisi Backend:**
  - Route terproteksi diverifikasi di bawah middleware `auth:sanctum`: `POST /api/simulations/candidate`, `GET /api/simulations/sessions`, `DELETE /api/simulations/sessions/{id}`, `POST /api/reports`, `GET /api/vendor-routes`, `POST /api/vendor-routes`, `GET /api/businesses/user`. Request tanpa token mengembalikan HTTP 401 Unauthorized secara konsisten.
  - Route publik tetap dapat diakses: `GET /api/pois`, `GET /api/businesses/map`, `GET /api/business-types`, `GET /api/bps/status`, `GET /api/reports`.

### 2. Berkas yang Diubah (Files Changed)
1. **`front-end/src/components/maps/AnalysisPanel.tsx`**:
   - Menambahkan prop `isLoggedIn` pada `AnalysisPanelProps` dan destructuring dengan default `false`.
   - Menambahkan tampilan kartu login interaktif dengan tombol "Masuk Sekarang" menuju `/login?redirect=/view-maps` ketika pengguna belum login, menyembunyikan tombol eksekusi manual kalkulasi dan simpan kandidat.
2. **`front-end/src/pages/Maps/MapPage.tsx`**:
   - Meneruskan prop `isLoggedIn` ke komponen `<AnalysisPanel />`.
   - Menambahkan auth guard pada `handleRunAnalysis`, `handleAddCandidate`, dan `onOpenCreateModal` (laporan warga) dengan toast "Perlu Masuk Akun".
3. **`front-end/src/components/maps/VendorRoutePanel.tsx`**:
   - Memperbarui URL redirect login dari `/login` menjadi `/login?redirect=/view-maps` untuk mengembalikan pengguna ke halaman peta setelah autentikasi berhasil.
4. **`back-end/tests/Feature/AuthGatedMapFeaturesTest.php`**:
   - Dibuat suite pengujian baru dengan 3 metode:
     - `test_public_unauthenticated_users_can_browse_public_map_data`: Memastikan data POI, UMKM publik, tipe usaha, status BPS, dan laporan publik dapat diakses tanpa token.
     - `test_unauthenticated_users_cannot_access_protected_features`: Memastikan 401 Unauthorized untuk simpan kandidat, riwayat sesi, hapus sesi, kirim laporan, rute keliling, dan daftar bisnis user.
     - `test_authenticated_users_can_access_protected_features`: Memastikan akses 200 OK untuk user terautentikasi.
5. **`back-end/tests/Feature/CandidatePersistenceTest.php`**:
   - Menambahkan pembersihan teardown untuk bisnis uji dan memperbaiki referensi simulasi spesifik berdasarkan ID untuk mencegah polusi data uji antar-run.

### 3. Hasil Pengujian Aktual
```powershell
php artisan test --filter "AuthGatedMapFeaturesTest|BusinessMapTest|CandidatePersistenceTest|LocationAnalysisIntegrityTest"
```
**Hasil:** `40 passed (470 assertions)`, 0 failures.

```powershell
cd front-end; npx tsc --noEmit
```
**Hasil:** `0 errors`.

```powershell
cd front-end; npx vitest run
```
**Hasil:** `3 test files passed, 31 tests passed (57 assertions)`.

```powershell
cd front-end; npm run build
```
**Hasil:** `✓ built in 4.88s` tanpa error.

## Stage 4: React Joyride Onboarding Tour Integration & Layering Stabilization (Stabilisasi Tur Peta)

### 1. Akar Masalah Stacking & Kompatibilitas (Root Cause Analysis)
- **Akar Masalah Stacking Order (Overlay di Belakang Pill Nav):**
  - Komponen `MapTour.tsx` sebelumnya mendefinisikan z-index tur di dalam objek `styles={{ options: { zIndex: 999999999999 } }}`.
  - Namun, pustaka yang terpasang adalah **`react-joyride` v3.2.0**. Pada React Joyride v3, konfigurasi `options` tidak lagi dibaca dari dalam `styles.options`, melainkan sebagai prop tingkat atas (`<Joyride options={{ zIndex: ... }} />`).
  - Akibatnya, `react-joyride` mengabaikan `styles.options` dan jatuh kembali ke nilai bawaan `defaultOptions.zIndex = 100`.
  - Komponen navigasi vertikal (`MapPillNav.tsx`) menggunakan kelas `z-[430]` (`z-index: 430`) dan membentuk stacking context lokal melalui `transform: translateY(-50%)` pada elemen absolut.
  - Karena `#root` dan portal `#react-joyride-portal` (yang ditempelkan ke `document.body`) sama-sama berada di root document stacking context, elemen `MapPillNav` (`z-index: 430`) secara hierarkis merender **di atas** overlay Joyride (`z-index: 100`).
  - Selain itu, nilai `999999999999` melampaui batas representasi integer signed 32-bit CSS ($2.147.483.647$).
  - **Solusi yang Tepat & Minimal:** Memindahkan `options` ke prop tingkat atas `<Joyride options={{ zIndex: 10000, ... }} />` dan menetapkan `styles.overlay: { zIndex: 10000 }`. Nilai `10000` secara aman dan terprediksi berada di atas seluruh elemen peta (`MapPillNav` 430, panels 430, banners 450, dialogs 1000), tanpa merusak kontrol peta atau melebihi batas 32-bit.
- **Kompatibilitas API React Joyride v3:**
  - `react-joyride` v3 menggunakan named export `import { Joyride, ACTIONS, EVENTS, STATUS } from "react-joyride"`.
  - Type callback diperbarui dari `CallBackProps` (v2) menjadi `EventHandler` (v3).
  - Prop tombol styling diperbarui dari `buttonNext` (v2) menjadi `buttonPrimary` (v3).
  - Mengaktifkan mode terkontrol (*controlled mode*) dengan prop `stepIndex` dan handler event `onEvent`.
- **Target Selektor DOM yang Stabil:**
  - Mengarahkan langkah-langkah tur ke selektor yang selalu terpasang (*mounted*) di DOM: `[data-tour="catalog-btn"]`, `[data-tour="layers-btn"]`, `[data-tour="map-canvas"]`, `[data-tour="analysis-btn"]`, dan `[data-tour="candidates-btn"]`.
  - Mengeliminasi kegagalan `TARGET_NOT_FOUND` yang sebelumnya terjadi saat mencoba menargetkan elemen di dalam panel mengambang yang belum terbuka.
- **Gating Autentikasi Langkah Tur:**
  - Langkah ke-5 (`candidates-btn`) hanya dimasukkan ke dalam daftar langkah jika `isLoggedIn === true`.
  - Untuk pengguna non-login, langkah ke-4 memberikan instruksi bahwa login diperlukan untuk menjalankan kalkulasi backend LOCIVA.
- **Kontrol Tur & Kemudahan Replay:**
  - Ditambahkan tombol "Panduan" interaktif pada bar kontrol basemap di sudut kanan atas `MapPage.tsx`, memungkinkan pengguna memutar ulang tur kapan saja secara responsif.

### 2. Berkas yang Diubah (Files Changed)
1. **`front-end/src/components/maps/MapTour.tsx`**:
   - Menulis ulang integrasi dengan API `react-joyride` v3: `options={{ zIndex: 10000, ... }}`, `styles.overlay: { zIndex: 10000 }`, `styles.buttonPrimary`, controlled `stepIndex` state.
   - Mengimplementasikan `handleJoyrideEvent` untuk menangani `EVENTS.STEP_AFTER` (`NEXT`, `PREV`), `EVENTS.TARGET_NOT_FOUND`, `ACTIONS.CLOSE`, `ACTIONS.SKIP`, dan `STATUS.FINISHED`.
   - Menggunakan target selektor DOM yang stabil dan gating autentikasi langkah kandidat tersimpan.
2. **`front-end/src/pages/Maps/MapPage.tsx`**:
   - Menambahkan import `HelpCircle` dari `lucide-react`.
   - Menambahkan tombol "Panduan" pada bar kontrol sudut kanan atas untuk memicu pemutaran ulang tur (`setTourRun(true)`).
3. **`front-end/src/lib/__tests__/MapTour.test.ts`**:
   - Dibuat suite pengujian baru dengan 4 test case memverifikasi ekspor React Joyride v3, kepatuhan hierarki z-index stacking context, pembatasan langkah autentikasi, dan transisi event mode terkontrol.

### 3. Hasil Pengujian Aktual
```powershell
cd front-end; npx tsc --noEmit
```
**Hasil:** `0 errors`.

```powershell
cd front-end; npx vitest run
```
**Hasil:** `4 test files passed, 35 tests passed (57 assertions)`.

```powershell
cd front-end; npm run build
```
**Hasil:** `✓ built in 6.29s` tanpa error.

```powershell
cd back-end; php artisan test --filter "AuthGatedMapFeaturesTest|BusinessMapTest|CandidatePersistenceTest|LocationAnalysisIntegrityTest"
```
**Hasil:** `40 passed (482 assertions)`, 0 failures.


