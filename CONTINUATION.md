# LOCIVA — Task 3: Mobile Vendor Routes, Maps UX & Claymorphism — Report

## 1. Status Task 3

**Verifikasi:**
- `npx tsc --noEmit` → **Exit Code 0 (0 errors)**
- `npx vite build` → **Build sukses (exit code 0)**, peringatan chunk size dari Leaflet sudah ada sebelumnya
- `php artisan test tests/Feature/BusinessMapTest.php tests/Feature/CatalogAndVendorRouteTest.php` → **12 passed, 244 assertions**

---

## 2. Fitur yang Diimplementasikan

### A. Rute Pedagang Keliling

| Fitur | Status |
|---|---|
| Tambah, rename, hapus waypoint | ✅ `VendorRoutePanel` (sudah ada) |
| Pindah urutan waypoint (naik/turun) | ✅ `VendorRoutePanel` |
| Klik peta untuk tambah waypoint (mode waypoint) | ✅ `MapPage.tsx` — `clickMode === "waypoint"` |
| Hitung rute jalan nyata via OSRM | ✅ `routing.ts` → `router.project-osrm.org` |
| Roundtrip toggle | ✅ `VendorRoutePanel` |
| Simpan rute ke database | ✅ `POST /api/vendor-routes` |
| Muat rute tersimpan | ✅ Tab "Rute Saya" di `VendorRoutePanel` |
| Hapus rute | ✅ `DELETE /api/vendor-routes/{id}` |
| Tampil rute publik pengguna lain di peta | ✅ `RouteLayer` + `GET /api/vendor-routes/public` |
| Empty state jujur jika tidak ada rute publik | ✅ |
| Rekomendasi titik jualan dari POI LOCIVA DB | ✅ Tab "Spot Jitu" → `GET /api/vendor-routes/recommendations` |
| Alasan & sumber rekomendasi ditampilkan | ✅ Metodologi & disclaimer di panel |

**Routing provider:** OSRM Public (`router.project-osrm.org`) via OpenStreetMap jaringan jalan.

### B. Privasi & Keamanan Rute

| Aspek | Implementasi |
|---|---|
| Rute privat secara default | `is_shared = false` saat simpan |
| Berbagi harus tindakan eksplisit | Checkbox "Bagikan Rute ke Peta Publik" |
| Backend enforce ownership | `VendorRouteController::update/destroy` cek `user_id === Auth::id()` |
| Rute publik hanya tampil jika `is_shared = true` | `publicRoutes()` → `where('is_shared', true)` |
| Tidak ada tracking real-time | Tidak ada location broadcasting |
| Tidak ada pengguna/rute palsu | Empty state jujur jika tidak ada data |

### C. Finalisasi UI Maps

| Fitur | Status |
|---|---|
| `MapPillNav` vertical pill di sisi kiri | ✅ Terintegrasi di `MapPage.tsx` |
| Ikon: Katalog, Cari, Lapisan, Analisis, Rute | ✅ 5 tools dengan tooltip |
| Basemap switcher (Peta / Satelit) | ✅ Top-right controls |
| Tombol GPS (ke lokasi saya) | ✅ Single button, top-right |
| Toggle tampil rute publik | ✅ Tombol 🚶 di top-right |
| SearchModal (Nominatim) | ✅ `/components/maps/SearchModal.tsx` baru |
| Autocomplete dari Nominatim OSM | ✅ Debounce 450ms, abort controller |
| Camera flyTo saat hasil dipilih | ✅ |
| Loading, no-result, error states | ✅ |
| Panel `BusinessCatalogPanel` via Katalog tool | ✅ |
| Panel `VendorRoutePanel` via Rute tool | ✅ |
| Panel `DataSourceControl` via Lapisan tool | ✅ |
| Panel `AnalysisPanel` via Analisis tool | ✅ |
| Legenda dinamis | ✅ `MapLegend` sudah ada |
| Marker clustering + spiderfy | ✅ |

### D. Kandidat Lokasi — Explicit Save

- **Auto-save dihapus**: marker drag tidak lagi memanggil `persistCandidateToDatabase` otomatis
- **Tombol "Simpan Titik Kandidat ke Database"** ditambahkan di `AnalysisPanel`
- Setelah tersimpan, tombol berubah jadi status "Tersimpan ✅"

### E. Transparansi Data di AnalysisPanel

- Menampilkan jumlah POI dari OpenStreetMap
- Menampilkan jumlah bisnis dari LOCIVA Internal DB
- Disclaimer keterbatasan data

---

## 3. File yang Diubah / Dibuat

| File | Perubahan |
|---|---|
| `front-end/src/pages/Maps/MapPage.tsx` | **Tulis ulang lengkap** — integrasi semua komponen |
| `front-end/src/components/maps/AnalysisPanel.tsx` | Tambah explicit save button + data transparency |
| `front-end/src/components/maps/SearchModal.tsx` | **Baru** — Nominatim search modal |
| `front-end/src/lib/analysisEngine.ts` | Tambah `internalBusinessCount?` ke `AnalysisResult` |

---

## 4. Keterbatasan Teknis

- **OSRM Public**: Server `router.project-osrm.org` adalah demo server. Untuk produksi, disarankan host OSRM sendiri atau gunakan API berbayar (Mapbox Directions, ORS).
- **Nominatim**: Dibatasi 1 request/detik. Untuk produksi tinggi, pertimbangkan instance self-hosted atau Pelias.
- **Chunk size warning**: Leaflet + MapLibre menghasilkan bundle >500kb. Sudah ada sebelum Task 3. Solusi: code-split atau lazy-load map komponen.
- **Real-time traffic**: Tidak tersedia. Transparansi sudah diimplementasikan di tombol info traffic di Task 1.
- **internalBusinessCount di AnalysisResult**: Field opsional, belum diisi dari backend. `useLocationAnalysis` perlu di-extend untuk mengirimkan jumlah bisnis internal jika diperlukan.

---

## 5. Task Berikutnya (Jika Ada)

1. Self-hosted OSRM atau alternatif routing berbayar untuk produksi
2. Pengisian `internalBusinessCount` dari backend API analysis
3. Code splitting untuk mengurangi bundle size Leaflet
4. Edit rute tersimpan (saat ini hanya Create, Read, Delete)
5. Update status rute dari `planned` → `active` → `completed`
