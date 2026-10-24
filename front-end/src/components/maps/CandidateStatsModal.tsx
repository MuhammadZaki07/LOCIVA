import React, { useEffect, useMemo } from 'react';
import type { AnalysisResult } from '@/lib/analysisEngine';
import type { BusinessType } from '@/lib/umkmCatalog';
import { CATEGORY_BY_ID, formatDistance } from '@/lib/Osm';
import {
  X,
  TrendingUp,
  ShieldAlert,
  Compass,
  MapPin,
  Building2,
  Users,
  Footprints,
  Info,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

export interface BpsRegionData {
  regionName?: string;
  bpsCode?: string;
  population?: number;
  densityPerKm2?: number;
  year?: string | number;
  source?: string;
  sourceUrl?: string;
}

interface CandidateStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AnalysisResult | null;
  business: BusinessType | null;
  bpsData?: BpsRegionData | null;
  isLoadingBps?: boolean;
}

export const CandidateStatsModal: React.FC<CandidateStatsModalProps> = ({
  isOpen,
  onClose,
  result,
  business,
  bpsData,
  isLoadingBps = false,
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Group POI by category
  const poiDistribution = useMemo(() => {
    if (!result?.allPlaces) return [];
    const counts: Record<string, number> = {};
    for (const place of result.allPlaces) {
      const cat = place.category || 'other';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([catId, count]) => {
        const meta = CATEGORY_BY_ID[catId as keyof typeof CATEGORY_BY_ID] || {
          id: catId,
          label: catId,
          color: '#6b7280',
        };
        return {
          catId,
          label: meta.label,
          color: meta.color,
          count,
          percentage: result.allPlaces.length > 0
            ? Math.round((count / result.allPlaces.length) * 100)
            : 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [result?.allPlaces]);

  // Catchment metrics
  const catchmentMetrics = useMemo(() => {
    if (!result) return null;
    const rMeters = result.radius;
    const areaSqKm = (Math.PI * Math.pow(rMeters / 1000, 2)).toFixed(2);
    // Walking time estimate based on average 4.5 km/h (1.25 m/s)
    const walkTimeMinutes = Math.round(rMeters / 75);
    return {
      radiusMeters: rMeters,
      areaSqKm,
      walkTimeMinutes,
    };
  }, [result]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="candidate-stats-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple-style Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
              {result?.candidateId || 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="candidate-stats-title"
                  className="text-lg font-semibold tracking-tight text-ink font-display"
                >
                  Statistik Lengkap Kandidat {result?.candidateId || 'A'}
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                  {business?.name || result?.businessTypeId || 'Usaha UMKM'}
                </span>
              </div>
              <p className="text-xs text-muted flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 font-mono">
                  <MapPin size={11} className="text-primary" />
                  {result ? `${result.lat.toFixed(5)}, ${result.lng.toFixed(5)}` : 'Lokasi belum dipilih'}
                </span>
                <span>·</span>
                <span>Radius jangkauan: {result?.radius || 500} m</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup statistik"
            className="p-1.5 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {!result ? (
            <div className="text-center py-16 space-y-3">
              <Compass size={40} className="mx-auto text-slate-300 animate-pulse" />
              <h3 className="text-sm font-semibold text-ink">Data Statistik Belum Tersedia</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Silakan pilih titik kandidat lokasi pada peta dan jalankan analisis terlebih dahulu untuk melihat statistik komprehensif.
              </p>
            </div>
          ) : result.isValidLocation === false ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <AlertTriangle size={16} className="text-amber-600" />
                <span>Titik Di Luar Area Layanan / Perairan</span>
              </div>
              <p className="text-xs leading-relaxed">
                {result.unsupportedReason ||
                  'Koordinat titik berada di laut lepas atau perairan. Statistik kelayakan komersial tidak dapat dihitung.'}
              </p>
            </div>
          ) : (
            <>
              {/* SECTION 1: Ringkasan Skor Utama */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    1. Ringkasan Skor Utama & Kelayakan
                  </h3>
                  <span className="text-[11px] text-muted">Skala 0 - 100</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Opportunity Score */}
                  <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
                    <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                      <TrendingUp size={13} className="text-emerald-600" />
                      Peluang Pasar
                    </span>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-2xl font-bold font-display tabular-nums text-ink">
                        {result.opportunityScore !== null ? result.opportunityScore : 'N/A'}
                      </span>
                      <span className="text-xs text-muted">/100</span>
                    </div>
                    <span className="mt-1 text-[11px] text-muted leading-tight">
                      Berdasarkan POI relevan & bobot segmen
                    </span>
                  </div>

                  {/* Competition Score */}
                  <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
                    <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                      <ShieldAlert size={13} className="text-amber-600" />
                      Tingkat Persaingan
                    </span>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-2xl font-bold font-display tabular-nums text-ink">
                        {result.competitionScore !== null ? result.competitionScore : 'N/A'}
                      </span>
                      <span className="text-xs text-muted">/100</span>
                    </div>
                    <span className="mt-1 text-[11px] text-muted leading-tight">
                      {result.competitorCount} kompetitor sejenis terdeteksi
                    </span>
                  </div>

                  {/* Accessibility Score */}
                  <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
                    <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                      <Footprints size={13} className="text-indigo-600" />
                      Aksesibilitas
                    </span>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-2xl font-bold font-display tabular-nums text-ink">
                        {result.accessibilityScore !== null ? result.accessibilityScore : 'N/A'}
                      </span>
                      <span className="text-xs text-muted">/100</span>
                    </div>
                    <span className="mt-1 text-[11px] text-muted leading-tight">
                      Jangkauan transit & fasilitas publik
                    </span>
                  </div>

                  {/* Data Confidence */}
                  <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between">
                    <span className="text-xs text-muted font-medium flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-sky-600" />
                      Kepercayaan Data
                    </span>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-2xl font-bold font-display tabular-nums text-ink">
                        {result.dataConfidence}
                      </span>
                      <span className="text-xs text-muted">%</span>
                    </div>
                    <span className="mt-1 text-[11px] text-muted leading-tight">
                      {result.allPlaces?.length || 0} sampel POI di radius
                    </span>
                  </div>
                </div>
              </section>

              {/* SECTION 2: Demografi & Agregat BPS */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <Users size={13} className="text-primary" />
                    2. Karakteristik Demografi & Data BPS
                  </h3>
                  <span className="text-[11px] text-muted">Data Resmi Agregat Wilayah</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3">
                  {isLoadingBps ? (
                    <div className="flex items-center gap-2 text-xs text-muted py-2">
                      <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span>Memuat data demografi wilayah dari layanan BPS...</span>
                    </div>
                  ) : bpsData ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-white rounded-lg border border-slate-100">
                        <span className="text-[11px] text-muted block">Wilayah Administratif</span>
                        <span className="text-sm font-semibold text-ink mt-0.5 block">
                          {bpsData.regionName || 'N/A'}
                        </span>
                        {bpsData.bpsCode && (
                          <span className="text-[10px] text-slate-400 font-mono">Kode: {bpsData.bpsCode}</span>
                        )}
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-slate-100">
                        <span className="text-[11px] text-muted block">Populasi Terdaftar (BPS)</span>
                        <span className="text-sm font-semibold text-ink mt-0.5 block tabular-nums">
                          {bpsData.population ? `${bpsData.population.toLocaleString('id-ID')} jiwa` : 'N/A'}
                        </span>
                        <span className="text-[10px] text-slate-400">Tahun: {bpsData.year || '2024'}</span>
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-slate-100">
                        <span className="text-[11px] text-muted block">Kepadatan Penduduk</span>
                        <span className="text-sm font-semibold text-ink mt-0.5 block tabular-nums">
                          {bpsData.densityPerKm2 ? `${bpsData.densityPerKm2.toLocaleString('id-ID')} jiwa/km²` : 'N/A'}
                        </span>
                        <span className="text-[10px] text-slate-400">Tingkat: Agregat Kota/Kecamatan</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted flex items-start gap-2 py-1">
                      <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-medium text-slate-600">
                          Data sensus BPS terintegrasi pada level agregat wilayah administratif.
                        </p>
                        <p className="text-[11px] leading-relaxed text-slate-500">
                          Kepadatan dan demografi bersumber dari Badan Pusat Statistik (BPS) pada tingkat Kota/Kabupaten atau Kecamatan, bukan titik koordinat mikro.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200/60">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      Tahun Referensi: {bpsData?.year || '2023/2024'}
                    </span>
                    <span className="flex items-center gap-1">
                      Sumber: Badan Pusat Statistik (BPS WebAPI / Portal Statistik Daerah)
                    </span>
                  </div>
                </div>
              </section>

              {/* SECTION 3: Kompetitor & Analisis Persaingan */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <Building2 size={13} className="text-amber-600" />
                    3. Kompetitor & Jarak Terdekat
                  </h3>
                  <span className="text-[11px] text-muted">
                    Total: {result.competitorCount} Usaha Sejenis
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3">
                  {result.nearestCompetitor ? (
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
                      <div>
                        <span className="text-[11px] text-muted block">Kompetitor Terdekat</span>
                        <span className="text-sm font-semibold text-ink">
                          {result.nearestCompetitor.name || 'Kompetitor Tanpa Nama (OSM/Internal)'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-muted block">Jarak</span>
                        <span className="text-sm font-bold text-amber-700 tabular-nums">
                          {formatDistance(result.nearestCompetitor.distance)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      <span>Tidak ditemukan kompetitor langsung di radius {result.radius} m. Potensi saturasi rendah.</span>
                    </div>
                  )}

                  <p className="text-[11px] text-muted leading-relaxed">
                    Kategori kompetitor ditentukan berdasarkan katalog UMKM LOCIVA ({business?.name || 'usaha ini'}).
                  </p>
                </div>
              </section>

              {/* SECTION 4: Distribusi POI & Generator Trafik */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <Layers size={13} className="text-indigo-600" />
                    4. Distribusi POI & Titik Keramaian ({result.allPlaces?.length || 0} Titik)
                  </h3>
                  <span className="text-[11px] text-muted">Berdasarkan Sampel Viewport & Radius</span>
                </div>

                {poiDistribution.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {poiDistribution.map((poi) => (
                      <div
                        key={poi.catId}
                        className="p-2.5 rounded-lg bg-white border border-slate-100 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="size-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: poi.color }}
                          />
                          <span className="text-xs text-ink truncate font-medium">
                            {poi.label}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-muted tabular-nums ml-2">
                          {poi.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 text-xs text-muted text-center">
                    Tidak ada POI teridentifikasi pada radius ini.
                  </div>
                )}
              </section>

              {/* SECTION 5: Catchment Area & Jangkauan Layanan */}
              {catchmentMetrics && (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <Footprints size={13} className="text-emerald-600" />
                    5. Catchment Area (Daerah Tangkapan Pasar)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                      <span className="text-[11px] text-muted block">Radius Analisis</span>
                      <span className="text-base font-bold text-ink mt-0.5 block tabular-nums">
                        {catchmentMetrics.radiusMeters} meter
                      </span>
                      <span className="text-[10px] text-muted">Jarak lurus euclidian buffer</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                      <span className="text-[11px] text-muted block">Luas Cakupan Layanan</span>
                      <span className="text-base font-bold text-ink mt-0.5 block tabular-nums">
                        {catchmentMetrics.areaSqKm} km²
                      </span>
                      <span className="text-[10px] text-muted">Area jangkauan potensial</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                      <span className="text-[11px] text-muted block">Estimasi Waktu Jalan Kaki</span>
                      <span className="text-base font-bold text-ink mt-0.5 block tabular-nums">
                        ± {catchmentMetrics.walkTimeMinutes} menit
                      </span>
                      <span className="text-[10px] text-muted">Kecepatan rata-rata 4.5 km/jam</span>
                    </div>
                  </div>
                </section>
              )}

              {/* SECTION 6: Faktor Pendukung & Detail Penilaian */}
              {result.factors && result.factors.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    6. Rincian Faktor Analisis
                  </h3>

                  <div className="space-y-2">
                    {result.factors.map((f) => (
                      <div
                        key={f.key}
                        className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-start justify-between gap-3"
                      >
                        <div>
                          <span className="text-xs font-semibold text-ink block">{f.label}</span>
                          <span className="text-[11px] text-muted mt-0.5 block">{f.note}</span>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            f.impact === 'positive'
                              ? 'bg-emerald-100 text-emerald-800'
                              : f.impact === 'negative'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {f.impact === 'positive' ? '+ Positif' : f.impact === 'negative' ? '- Negatif' : 'Netral'}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* SECTION 7: Sumber Data, Transparansi, & Keterbatasan */}
              <section className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Info size={13} className="text-primary" />
                  7. Sumber Data & Keterbatasan Analisis
                </h3>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                    <span>OpenStreetMap / Overpass API (Eksternal)</span>
                    <span className="font-semibold text-ink">{result.allPlaces?.length || 0} POI dimuat</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                    <span>Database Usaha Terdaftar LOCIVA</span>
                    <span className="font-semibold text-ink">
                      {result.registeredBusinessCount !== null && result.registeredBusinessCount !== undefined
                        ? `${result.registeredBusinessCount} Usaha`
                        : result.internalBusinessCount !== null && result.internalBusinessCount !== undefined
                        ? `${result.internalBusinessCount} Usaha`
                        : 'Belum dimuat'}
                    </span>
                  </div>
                  {result.internalPoiCount !== null && result.internalPoiCount !== undefined && (
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                      <span>POI Fasilitas Publik Internal</span>
                      <span className="font-semibold text-ink">{result.internalPoiCount} POI</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                    <span>Badan Pusat Statistik (BPS RI)</span>
                    <span className="font-semibold text-ink">Agregat Wilayah Administratif</span>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-slate-500 leading-relaxed space-y-1">
                  <p>
                    <strong className="text-slate-700">Keterbatasan Model:</strong> {result.limitations ||
                      'Skor adalah indeks komparatif spasial berdasarkan ketersediaan data, bukan jaminan omzet bisnis.'}
                  </p>
                  <p>
                    Kepadatan penduduk diukur pada level kecamatan/kota terdaftar dan tidak merepresentasikan jumlah orang per meter persegi secara real-time.
                  </p>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-muted">
          <span>Kandidat #{result?.candidateId || 'A'} · LOCIVA Spatial Intelligence</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-ink font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
