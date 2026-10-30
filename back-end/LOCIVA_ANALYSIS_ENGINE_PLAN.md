# LOCIVA — Rencana Implementasi Mesin Analisis Potensi Pasar

> Dokumen kerja utama untuk Antigravity. Baca seluruh dokumen ini sebelum mengubah kode. Dokumen ini menetapkan ruang lingkup, keputusan desain, urutan kerja, standar pembuktian, dan kriteria selesai. Jangan memperluas pekerjaan tanpa persetujuan pengguna.

## 1. Tujuan

Bangun dan uji mesin analisis potensi pasar LOCIVA di backend Laravel/PHP terlebih dahulu. Hasilnya harus dapat dijelaskan, konsisten, dapat diuji melalui terminal/Tinker, dan tidak bergantung pada UI.

Contoh: pengguna memilih koordinat dan jenis usaha, misalnya gerobak cilok. LOCIVA menganalisis bukti relevan di sekitar lokasi dan menjelaskan potensi, persaingan, aksesibilitas, serta kualitas data. Sistem tidak boleh menjanjikan keuntungan, omzet, atau menyebut hasil sebagai prediksi pasti.

## 2. Aturan kerja Antigravity — wajib

1. **Audit sebelum mengubah.** Periksa repository, versi Laravel/PHP, model, migrasi, service, controller, route, konfigurasi, dan integrasi sumber data yang benar-benar terkait.
2. Ringkas arsitektur dan alur saat ini. Catat file/fungsi dan bukti pendukung. Jangan mengarang file, skema, output, atau hasil pengujian.
3. Kerjakan bertahap. Setelah setiap tahap, laporkan temuan, perubahan, dan validasi.
4. Gunakan pola/komponen proyek yang sudah ada jika cocok. Hindari duplikasi service, konfigurasi, tabel, dan helper tanpa alasan terbukti.
5. Jika informasi tidak tersedia, tulis **belum diketahui** dan lakukan pemeriksaan terarah. Jangan menyajikan asumsi sebagai fakta.
6. Jangan membaca seluruh repository berulang kali. Cari simbol/file relevan dan baca konteks secukupnya. Batasi output terminal yang panjang.
7. Jangan mengklaim tes lulus jika perintah belum dijalankan dan hasilnya belum diperiksa. Bedakan berhasil, gagal, dilewati, dan belum diuji.
8. Jangan memasang dependency, mengubah skema database, menghapus data, menjalankan migrasi destruktif, atau mengubah deployment tanpa kebutuhan jelas dan persetujuan jika berisiko.
9. Jika token/waktu hampir habis, berhenti pada titik aman dan berikan handoff: status, file berubah, temuan terverifikasi, perintah terakhir, serta langkah selanjutnya.
10. Jangan melakukan refactor luas atau perubahan frontend yang tidak diperlukan.

## 3. Tahapan pengerjaan

### Tahap A — Audit dan desain
- Lacak alur analisis dari input kandidat hingga output skor.
- Identifikasi sumber data yang benar-benar terhubung, format data, perhitungan jarak, deduplikasi, penanganan kegagalan, cache, dan output API.
- Pisahkan masalah yang dibuktikan dari dugaan.
- Usulkan desain/formula awal berdasarkan data dan struktur nyata proyek sebelum implementasi.
- Jangan mengubah UI.

### Tahap B — Mesin analisis deterministik
- Pisahkan perhitungan inti dari controller, UI, dan pemanggilan API eksternal sejauh cocok dengan arsitektur.
- Perhitungan inti harus menerima data yang telah disiapkan dan menghasilkan output terstruktur yang bisa diuji tanpa memanggil API eksternal.
- Gunakan Laravel/PHP dan dependency yang sudah tersedia. Jangan menambah library matematika/AI/ML kecuali terbukti diperlukan.
- Pertahankan kompatibilitas dengan alur lama sejauh memungkinkan. Catat perubahan yang tidak kompatibel.

### Tahap C — Uji terminal/Tinker
- Buat skenario eksplisit dan dapat diulang.
- Uji data sintetis yang hasilnya diketahui, lalu data proyek yang tersedia.
- Bandingkan perhitungan dengan hitungan manual sederhana.
- Jangan menyatakan siap untuk UI sebelum hasil dan keterbatasannya dievaluasi.

### Tahap D — Integrasi API
- Setelah mesin inti lolos uji dasar, integrasikan ke jalur backend/API yang benar-benar digunakan proyek.
- Uji validasi input, struktur respons, error, dan data parsial.
- Jangan mengubah frontend. Integrasi UI hanya setelah pengguna menyetujui hasil mesin dan API.

### Tahap E — Laporan dan keputusan
Laporkan bukti uji, kasus lulus/gagal, keterbatasan, dan rekomendasi apakah layak lanjut ke UI. Berhenti sebelum tahap yang membutuhkan keputusan pengguna.

## 4. Keputusan desain yang sudah disepakati

- Backend awal: **Laravel/PHP saja**. Python, machine learning, dan model prediktif tidak diperlukan kecuali audit membuktikan kebutuhan nyata.
- Gunakan algoritma matematika/spasial yang dapat dijelaskan, bukan skor buatan AI.
- Prioritas akurasi dan kecepatan sama pentingnya.
- Skor utama berarti **potensi pasar**, bukan jaminan kelayakan usaha, omzet, atau laba.
- Gabungkan radius geografis dengan jarak/waktu jaringan jalan jika data dan layanan benar-benar mendukungnya.
- Radius adaptif menurut kategori usaha, dengan batas eksplisit, konfigurasi yang jelas, dan uji. Jangan memperluas radius tanpa batas karena data sedikit.
- Jika sebagian sumber belum tersedia, tampilkan **analisis parsial yang layak** dan perbarui saat sumber tambahan berhasil. Status sumber gagal/tidak tersedia harus terlihat; kegagalan bukan nilai nol.
- Mesin harus diuji sebelum ditampilkan di UI.

Pisahkan setidaknya:
1. **Potensi pasar** — sinyal peluang/demand yang didukung bukti.
2. **Persaingan dan akses/hambatan** — tampilkan terpisah jika dasar penggabungan ke skor belum kuat.
3. **Kualitas data/bukti** — kelengkapan, kebaruan, cakupan, dan status sumber.

Kepadatan penduduk atau banyak POI tidak otomatis berarti pasar bagus. Banyak pesaing tidak otomatis buruk tanpa memperhitungkan kategori, jarak, dan relevansi. Setiap kesimpulan harus bisa ditelusuri ke data.

## 5. Sumber data dan perannya

Audit koneksi aktual sebelum mengandalkan sumber. Konfigurasi/service yang ada bukan bukti bahwa API berhasil digunakan.

| Sumber | Peran | Batasan |
|---|---|---|
| Data internal LOCIVA | Bisnis/UMKM, POI internal, laporan warga, dan data lokal yang benar-benar tersedia | Periksa status, koordinat, kategori, duplikasi, dan waktu data |
| OpenStreetMap/Overpass | POI dan fasilitas terpetakan | Dapat lambat, gagal, atau tidak lengkap; kegagalan bukan berarti nol POI |
| BPS | Konteks demografi pada wilayah dan periode yang tersedia | Cocokkan kode/wilayah, satuan, periode, dan tingkat geografis; jangan menyajikan data kecamatan sebagai angka persis tingkat jalan |
| OSRMRoute/routing | Estimasi rute/jarak/waktu jaringan sesuai kemampuan integrasi yang terbukti | Bukan sumber jumlah pasar/permintaan. Verifikasi endpoint, moda, batas permintaan, autentikasi, dan respons aktual |
| Sumber lain | Hanya jika sudah ada dan terbukti relevan | Dokumentasikan asal, arti, waktu, dan keterbatasannya |

Jangan menghitung objek yang sama berulang kali dari beberapa sumber; menyatukan data dengan cakupan/periode/kategori yang tidak sebanding; atau mengarang hasil API.

## 6. Algoritma kandidat — evaluasi dahulu

Formula di bawah adalah kandidat untuk dievaluasi, bukan kewajiban untuk memakai semuanya.

### Jarak geografis
- Gunakan Haversine atau implementasi jarak yang sudah ada dan terbukti benar.
- Validasi koordinat, urutan latitude/longitude, satuan, dan input kosong/tidak valid.
- Gunakan filter radius/geografis awal untuk memperkecil kandidat sebelum operasi mahal.

### Distance decay
Fungsi seperti \(I(d)=e^{-\lambda d}\) bisa dievaluasi untuk mengurangi pengaruh objek yang lebih jauh. Jangan menetapkan \(\lambda\) secara sembarang. Jelaskan satuan, parameter, alasan pemilihan, dan pengaruhnya pada hasil. Tanpa dasar parameter, tandai sebagai hipotesis dan uji sensitivitasnya.

### Weighted scoring
Skema konseptual \(S=w_1X_1+w_2X_2+\cdots+w_nX_n\) hanya digunakan jika setiap variabel didefinisikan, skala dinormalisasi secara masuk akal, arah pengaruh jelas, bobot punya alasan terdokumentasi, dan data hilang tidak diam-diam dianggap nol. Hasil harus bisa dijelaskan dan diuji sensitivitasnya.

Jangan menetapkan bobot final hanya berdasarkan intuisi agar skor tampak meyakinkan. Tanpa data historis/outcome usaha untuk validasi, sebut skor sebagai **indikator heuristik awal**, bukan model prediksi yang terbukti akurat.

### Persaingan dan kategori
- Cocokkan kategori dan relevansi pesaing dengan jenis usaha.
- Pisahkan pesaing langsung dari POI yang hanya memberi konteks jika data memungkinkan.
- Jangan menyamakan seluruh POI dengan pesaing.
- Jika klasifikasi kategori tidak cukup akurat, nyatakan keterbatasannya.

### Jaringan jalan
- Pakai radius untuk menyaring objek awal; lakukan routing hanya untuk objek relevan dan jika hasilnya bernilai.
- Jangan routing ke setiap POI tanpa batas.
- Bedakan jarak garis lurus, jarak jaringan jalan, dan estimasi waktu tempuh.
- Jika routing gagal/tidak mendukung moda yang diperlukan, pertahankan analisis parsial dan tandai keterbatasan. Jangan menyebut jarak garis lurus sebagai jarak jalan.

## 7. Kinerja dan cache

- Audit strategi cache yang sudah ada sebelum menambah cache baru.
- Jika diperlukan, pisahkan cache data mentah sumber dari cache hasil analisis.
- Cache hasil harus mempertimbangkan koordinat/area, jenis usaha, profil radius, versi algoritma, dan konteks/versi data relevan. Jangan memakai label Kandidat A/B/C sebagai identitas cache.
- Kandidat berdekatan boleh menggunakan ulang data sumber yang masih valid jika cakupan spasial, tipe data, dan masa berlaku cocok.
- Gunakan timeout, concurrency limit, dan error handling yang wajar. Paralelkan pekerjaan independen hanya jika arsitektur memungkinkan.
- Jangan menambahkan queue/job atau mengubah skema hanya agar terlihat canggih; harus ada kebutuhan konkret.
- Hindari refetch yang tidak perlu, tetapi jangan menyajikan data kedaluwarsa sebagai data terkini tanpa label.

## 8. Kualitas data dan kegagalan parsial

Untuk setiap sumber, tampilkan status yang cukup untuk menjelaskan:
- berhasil, parsial, gagal, atau tidak dikonfigurasi;
- waktu data/pengambilan bila tersedia;
- cakupan geografis dan periode jika relevan;
- jumlah objek diterima/dideduplikasi jika dapat dihitung dengan andal;
- alasan keterbatasan/kegagalan.

Aturan:
- `0` berarti benar-benar tidak ada hasil dalam cakupan yang diperiksa; bukan request gagal.
- `null`/tidak tersedia berbeda dari nol.
- Data yang gagal validasi tidak boleh diam-diam dihitung.
- Jika data kunci kurang, jelaskan dampaknya pada kelengkapan/keyakinan. Jangan mengarang angka confidence tanpa definisi yang diuji.
- Analisis parsial boleh ditampilkan jika masih layak, dengan sumber tersedia dan tidak tersedia dijelaskan.

## 9. Pengujian minimum

Gunakan PHPUnit yang sudah tersedia atau Tinker/command sementara yang tidak merusak data. Jangan menambah framework test baru tanpa alasan. Jalankan skenario berikut:

1. Koordinat yang sama menghasilkan jarak nol (dengan toleransi numerik yang tepat).
2. Jika decay digunakan, objek identik yang lebih jauh tidak memberi pengaruh lebih besar dari objek dekat.
3. Pemilihan objek di dalam/luar radius sesuai batas terdokumentasi.
4. Koordinat, radius, dan kategori tidak valid ditolak/ditangani aman.
5. Tidak ada hasil berbeda dari request sumber yang gagal.
6. Satu sumber gagal dan sumber lain berhasil menghasilkan analisis parsial dengan status benar.
7. Duplikasi lintas sumber tidak membuat hitungan ganda jika deduplikasi memungkinkan.
8. Kategori berbeda memakai profil radius yang sesuai konfigurasi.
9. Hasil deterministik untuk input dan versi algoritma sama, kecuali data eksternal memang berubah.
10. Normalisasi/bobot/skor tidak menghasilkan NaN/Infinity atau keluar dari rentang terdokumentasi.
11. Uji edge case: tidak ada POI, hanya satu sumber, titik di batas radius, kode/wilayah BPS tidak cocok, routing timeout.
12. Bandingkan hasil dengan hitungan manual dan catat input/output aktual.

Gunakan data sintetis untuk memverifikasi matematika lalu data nyata yang tersedia untuk menguji integrasi. Jangan mengklaim validasi keberhasilan bisnis tanpa data outcome yang sesuai.

## 10. Batasan

- **Jangan mengubah frontend/UI** dalam pekerjaan ini.
- Jangan membuat API publik baru sebelum mesin inti dan kontraknya dipahami serta diuji.
- Jangan menghapus/mengganti data bisnis, laporan warga, atau data pengguna untuk memudahkan pengujian.
- Jangan menjalankan migrasi produksi atau perintah destruktif.
- Jangan mengganti provider/API berdasarkan dugaan. Buktikan masalah dan jelaskan opsi sebelum perubahan besar.
- Jangan menambahkan AI/ML atau formula yang tidak bisa dijelaskan hanya agar terlihat ilmiah.
- Jangan merombak arsitektur; fokus pada jalur analisis potensi pasar yang benar-benar ada.

## 11. Format laporan setiap tahap

### Tahap: [nama]
- **Status:** selesai / terhambat / belum mulai
- **Temuan terverifikasi:** poin dengan file/fungsi atau output pendukung
- **Perubahan:** file diubah dan alasan
- **Validasi:** perintah yang benar-benar dijalankan dan hasil aktual
- **Belum diketahui/risiko:** hal yang belum dapat dipastikan
- **Langkah berikutnya:** satu langkah terarah

Laporan akhir wajib memuat:
1. Alur analisis sebelum dan sesudah.
2. Formula yang benar-benar diterapkan, definisi variabel, satuan, rentang, bobot, dan alasan.
3. File yang berubah.
4. Perintah terminal/Tinker dan hasil aktual.
5. Kasus uji lulus/gagal/dilewati.
6. Contoh input-output yang bisa diulang.
7. Batasan data dan algoritma.
8. Keputusan yang perlu disetujui pengguna sebelum UI.

## 12. Kriteria selesai

Kode yang berhasil ditulis saja belum cukup. Minimal:
- alur input → data → perhitungan → output bisa dijelaskan;
- formula dan parameter terdokumentasi;
- logika inti bisa diuji tanpa bergantung penuh pada API eksternal;
- skenario dasar dan edge case relevan telah dijalankan;
- kegagalan sumber tidak dianggap nol;
- hasil menyertakan alasan dan keterbatasan data;
- tidak ada klaim sukses tanpa bukti;
- perubahan tetap dalam ruang lingkup.

**Keputusan akhir untuk UI milik pengguna.** Setelah pengujian, berhenti dan berikan laporan serta rekomendasi. Jangan mengubah UI sebelum pengguna menyetujui hasil mesin dan API.

---

## Instruksi pertama untuk Antigravity

Mulai dari **Tahap A saja**: audit alur analisis potensi pasar LOCIVA yang benar-benar ada dan laporkan temuan terverifikasi beserta referensi file/fungsi. Jangan langsung menulis ulang atau menerapkan formula sebelum audit dan rancangan singkat ditampilkan. Lanjutkan bertahap sesuai dokumen ini dengan perubahan sekecil mungkin dan validasi yang bisa dibuktikan.
