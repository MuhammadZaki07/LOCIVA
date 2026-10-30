import React, { useState } from 'react';
import type { AnalysisResult } from '@/lib/analysisEngine';
import type { BusinessType } from '@/lib/umkmCatalog';
import { ScoreGauge } from './ScoreGauge';
import { RadiusControl } from './RadiusControl';
import { CandidateStatsModal } from './CandidateStatsModal';
import { cn } from '@/lib/utils';
import { formatDistance, CATEGORY_BY_ID } from '@/lib/Osm';
import {
  AlertTriangle,
  Target,
  Activity,
  Save,
  CheckCircle2,
  Globe,
  Database,
  X,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  Building2,
  AlertCircle,
  Info,
  Clock,
  Layers,
  FileWarning,
  Play,
  RefreshCw,
  MapPin,
  Navigation,
  Scale,
  Lock,
  ArrowRight,
} from 'lucide-react';
import LogoPuzzleLoader from '../ui/Logopuzzleloader';

interface AnalysisPanelProps {
  business: BusinessType;
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
  radius: number;
  onRadiusChange: (r: number) => void;
  isOpen: boolean;
  onClose: () => void;
  candidateExists: boolean;
  isPersistedInDb: boolean;
  onSaveCandidate: () => void;
  onAnalyze?: () => void;
  candidateStatus?: 'draft' | 'location_selected' | 'analyzing' | 'ready' | 'stale' | 'failed';
  isStale?: boolean;
  candidateId?: string;
  analysisStage?: string;
  isLoggedIn?: boolean;
  onStartPickLocation?: () => void;
  isPickingLocation?: boolean;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  business,
  result,
  isAnalyzing,
  error,
  radius,
  onRadiusChange,
  isOpen,
  onClose,
  candidateExists,
  isPersistedInDb,
  onSaveCandidate,
  onAnalyze,
  candidateStatus = 'draft',
  isStale = false,
  candidateId = 'A',
  analysisStage,
  isLoggedIn = false,
  onStartPickLocation,
  isPickingLocation = false,
}) => {
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  // Derive score interpretation meaning based on existing scoring scale & severe civic risk transparency
  const hasSevereReports = Boolean(
    result?.dataWarnings?.some((w) => w.includes('keparahan tinggi/kritis') || w.includes('laporan infrastruktur aktif')) ||
    (result?.reportCount && result.reportCount > 0)
  );

  const getOpportunityMeaning = (score: number | null) => {
    if (score === null) return { tier: 'Belum Dianalisis', color: 'text-slate-500 bg-slate-100', note: 'Data spasial belum diproses.' };

    // Prevent unjustified green status when serious civic risks exist in candidate radius
    if (hasSevereReports) {
      if (score >= 80) {
        return {
          tier: 'Peluang Tinggi (Risiko Infrastruktur)',
          color: 'text-amber-800 bg-amber-50 border-amber-300',
          note: 'Tarikan pasar potensial kuat, namun terdeteksi laporan kendala infrastruktur aktif di sekitar lokasi yang perlu diantisipasi.',
        };
      }
      if (score >= 60) {
        return {
          tier: 'Peluang Baik (Risiko Infrastruktur)',
          color: 'text-amber-800 bg-amber-50 border-amber-300',
          note: 'Potensi pasar memadai namun dibayangi laporan masalah infrastruktur aktif dari warga setempat.',
        };
      }
    }

    if (score >= 80) {
      return {
        tier: 'Peluang Sangat Tinggi',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        note: 'Tarikan pelanggan kuat didukung generator trafik relevan & infrastruktur area prima.',
      };
    }
    if (score >= 60) {
      return {
        tier: 'Peluang Baik',
        color: 'text-teal-700 bg-teal-50 border-teal-200',
        note: 'Potensi pasar memadai dengan beberapa faktor demografi & trafik penyeimbang.',
      };
    }
    if (score >= 40) {
      return {
        tier: 'Peluang Moderat',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        note: 'Potensi pasar terbatas atau persaingan/infrastruktur setempat memerlukan perhatian.',
      };
    }
    return {
      tier: 'Peluang Terbatas',
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      note: 'Minim generator trafik pelanggan atau terdapat penalti dari laporan masalah aktif.',
    };
  };

  const oppMeaning = getOpportunityMeaning(result?.opportunityScore ?? null);

  // Group factors by impact
  const positiveFactors = (result?.factors || []).filter((f) => f.impact === 'positive');
  const negativeFactors = (result?.factors || []).filter((f) => f.impact === 'negative');
  const neutralFactors = (result?.factors || []).filter((f) => f.impact === 'neutral');

  // Find OSM source details
  const osmSource = result?.sources?.find((s) => s.id === 'openstreetmap');
  const bpsSource = result?.sources?.find((s) => s.id === 'bps_ri');
  const regSource = result?.sources?.find((s) => s.id === 'lociva_registered');
  const internalPoiSource = result?.sources?.find((s) => s.id === 'lociva_internal');

  const isStaleOsm = Boolean(
    result?.isStaleOsm ||
    osmSource?.status === 'stale' ||
    result?.allPlaces?.some((p) => p.isStale),
  );

  const isTruncated = Boolean(result?.isTruncated || osmSource?.truncated);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-[500] flex max-h-[85dvh] min-h-0 w-full flex-col overflow-hidden border-t border-slate-200 bg-surface transition-transform duration-300 md:static md:inset-auto md:right-0 md:h-full md:max-h-full md:min-h-0 md:w-full md:border-l md:border-t-0",
        !isOpen && "translate-y-full md:hidden md:translate-x-full"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-surface md:bg-transparent flex justify-between items-center sticky top-0 z-10 shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-display font-bold text-ink">
              Kandidat {candidateId || result?.candidateId || "A"}
            </h2>
            {candidateStatus === 'draft' && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Draft (Pilih Titik)
              </span>
            )}
            {candidateStatus === 'location_selected' && !result && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Siap Dianalisis
              </span>
            )}
            {candidateStatus === 'stale' && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                Kedaluwarsa
              </span>
            )}
            {candidateStatus === 'failed' && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Gagal
              </span>
            )}
            {result && result.isValidLocation !== false && candidateStatus !== 'stale' && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", oppMeaning.color)}>
                  {oppMeaning.tier}
                </span>
                {result.analysisCompleteness === 'partial' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <AlertTriangle size={11} className="text-amber-600" />
                    Parsial
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="text-sm text-muted">{business.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
          title="Tutup Panel Analisis"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {onStartPickLocation && (
          <button
            type="button"
            onClick={onStartPickLocation}
            className={cn(
              "w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer shadow-xs",
              isPickingLocation
                ? "bg-primary text-white border-primary animate-pulse"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            )}
          >
            <MapPin size={14} className={isPickingLocation ? "text-white" : "text-primary"} />
            <span>
              {isPickingLocation
                ? "Klik pada Peta untuk Memilih Titik..."
                : candidateExists
                ? "Ubah Titik Lokasi di Peta"
                : "Pilih Titik Lokasi di Peta"}
            </span>
          </button>
        )}

        <RadiusControl
          radius={radius}
          onChange={onRadiusChange}
          min={business.minRadius}
          max={business.maxRadius}
          disabled={isAnalyzing}
        />

        {/* Unauthenticated Login Gate */}
        {!isLoggedIn ? (
          <div className="p-4 bg-indigo-50/90 border border-indigo-200/90 rounded-2xl text-left space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-indigo-950">
              <Lock size={16} className="text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-xs">Login Diperlukan untuk Analisis</p>
                <p className="text-[11px] text-indigo-800/90 mt-0.5 leading-relaxed">
                  Silakan masuk atau daftar akun untuk menjalankan kalkulasi potensi lokasi, penilaian kelayakan, dan menyimpan kandidat.
                </p>
              </div>
            </div>
            <a
              href="/login?redirect=/view-maps"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Masuk Sekarang</span>
              <ArrowRight size={13} />
            </a>
          </div>
        ) : (
          <>
            {/* Primary Manual Analyze Button */}
            {candidateExists && onAnalyze && (
              <button
                type="button"
                data-tour="analysis-btn"
                onClick={onAnalyze}
                disabled={isAnalyzing || result?.isValidLocation === false}
                className={cn(
                  "w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer",
                  candidateStatus === 'stale'
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white",
                  (isAnalyzing || result?.isValidLocation === false) && "opacity-50 cursor-not-allowed",
                )}
              >
                <Play size={16} className="fill-current" />
                <span>
                  {candidateStatus === 'stale'
                    ? "Analisis Ulang Lokasi Terkini"
                    : result
                    ? "Analisis Ulang"
                    : "Jalankan Analisis Lokasi"}
                </span>
              </button>
            )}

            {/* Stale Warning Banner */}
            {candidateStatus === 'stale' && result && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <p className="font-bold">Koordinat atau radius telah diubah</p>
                  <p className="text-amber-800 text-[11px]">
                    Hasil di bawah mengacu pada riwayat posisi sebelumnya. Klik tombol <strong>Analisis Ulang Lokasi Terkini</strong> untuk memperbarui data analitik.
                  </p>
                </div>
              </div>
            )}

            {/* Explicit save button */}
            {candidateExists && (
              <button
                type="button"
                onClick={onSaveCandidate}
                disabled={
                  isPersistedInDb ||
                  isAnalyzing ||
                  result?.isValidLocation === false
                }
                className={cn(
                  "w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
                  result?.isValidLocation === false
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed opacity-60"
                    : isPersistedInDb
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                      : "bg-primary text-white hover:bg-primary/90 shadow-sm cursor-pointer",
                )}
              >
                {result?.isValidLocation === false ? (
                  <>
                    <AlertTriangle size={16} />
                    Lokasi Non-Daratan Tidak Dapat Disimpan
                  </>
                ) : isPersistedInDb ? (
                  <>
                    <CheckCircle2 size={16} />
                    Kandidat Tersimpan di Database
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Simpan Kandidat ke Database
                  </>
                )}
              </button>
            )}
          </>
        )}

        {/* Draft guidance */}
        {(!candidateExists || candidateStatus === 'draft') && (
          <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center space-y-2">
            <MapPin size={28} className="mx-auto text-primary/60" />
            <h4 className="font-bold text-sm text-ink">Titik Lokasi Belum Ditentukan</h4>
            <p className="text-xs text-muted max-w-xs mx-auto">
              Klik area di peta untuk menempatkan titik kandidat {candidateId || 'A'}, lalu tekan tombol Analisis.
            </p>
          </div>
        )}

        {/* Location selected guidance */}
        {candidateStatus === 'location_selected' && !result && !isAnalyzing && (
          <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-left space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
              <CheckCircle2 size={16} className="text-blue-600" />
              <span>Titik Lokasi Berhasil Ditetapkan</span>
            </div>
            <p className="text-xs text-blue-800 leading-relaxed">
              Koordinat telah ditetapkan. Tekan tombol <strong>"Jalankan Analisis Lokasi"</strong> di atas untuk memulai kalkulasi data spasial dan skor kelayakan.
            </p>
          </div>
        )}

        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <LogoPuzzleLoader size={50} />
            <div className="text-center space-y-1">
              <p className="text-ink font-semibold text-sm">
                {analysisStage || "Menganalisis kelayakan lokasi spasial..."}
              </p>
              <p className="text-xs text-muted">
                Memproses data spasial secara transparan tanpa estimasi palsu
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl flex flex-col gap-2 border border-red-200 text-left">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-semibold">{error}</p>
            </div>
            {onAnalyze && (
              <button
                type="button"
                onClick={onAnalyze}
                className="self-start mt-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer"
              >
                Coba Analisis Lagi
              </button>
            )}
          </div>
        ) : result && result.isValidLocation === false ? (
          <div className="p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl space-y-3 text-left">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <AlertTriangle className="shrink-0 text-amber-600" size={18} />
              <span>Titik Di Luar Daratan (Perairan / Laut Lepas)</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              {result.unsupportedReason ||
                "Koordinat kandidat berada di laut lepas atau perairan. Kelayakan komersial tidak dapat dihitung untuk wilayah non-daratan."}
            </p>
            <div className="p-2.5 rounded-xl bg-white/70 border border-amber-200/50 text-[11px] text-amber-800">
              <span className="font-semibold">Langkah tindakan:</span> Geser atau klik marker kandidat ke area daratan atau pemukiman aktif untuk memuat analisis kelayakan.
            </div>
          </div>
        ) : result ? (
          <>
            {/* 1. Candidate Summary Card (Factual, no invented metrics) */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Target size={13} className="text-primary" />
                  Ringkasan Hasil Analisis
                </span>
                <span className="text-[11px] text-muted">Radius {result.radius}m</span>
              </div>

              {/* Factual Interpretation */}
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-ink">Skor Peluang Pasar</span>
                  <span className="text-sm font-bold font-display text-primary">
                    {result.opportunityScore ?? "N/A"}/100
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {oppMeaning.note}
                </p>
              </div>

              {hasSevereReports && (
                <div className="p-2.5 bg-amber-50/90 border border-amber-300 rounded-xl text-left flex items-start gap-2 text-xs text-amber-900">
                  <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold">Peringatan Aksesibilitas:</span>
                    <p className="text-[11px] text-amber-800 leading-snug">
                      Terdeteksi laporan kendala infrastruktur aktif di sekitar titik ini. Perhatikan detail laporan di bawah sebelum menentukan lokasi final.
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-muted block font-medium">Kompetitor</span>
                  <span className="text-sm font-bold text-amber-600 block mt-0.5 tabular-nums">
                    {result.competitorCount}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-muted block font-medium">POI Relevan</span>
                  <span className="text-sm font-bold text-indigo-600 block mt-0.5 tabular-nums">
                    {result.relevantPOI.length}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-muted block font-medium">Laporan Risiko</span>
                  <span
                    className={cn(
                      "text-sm font-bold block mt-0.5 tabular-nums",
                      (result.reportCount ?? 0) > 0 ? "text-rose-600" : "text-emerald-600"
                    )}
                  >
                    {result.reportCount ?? 0}
                  </span>
                </div>
              </div>

              {/* Nearest Competitor Notice */}
              {result.nearestCompetitor ? (
                <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/50 text-amber-900">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Building2 size={13} className="shrink-0 text-amber-600" />
                    <span className="truncate">
                      Pesaing terdekat: <strong>{result.nearestCompetitor.name || "Kompetitor Tanpa Nama"}</strong>
                    </span>
                  </div>
                  <span className="font-bold shrink-0 ml-2 text-amber-800">
                    {formatDistance(result.nearestCompetitor.distance)}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs p-2 rounded-xl bg-emerald-50/60 border border-emerald-200/50 text-emerald-800">
                  <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                  <span>Tidak terdeteksi kompetitor langsung pada radius {result.radius}m.</span>
                </div>
              )}

              {/* Risk Factor Notice if active reports exist */}
              {result.reportCount && result.reportCount > 0 ? (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <FileWarning size={15} className="shrink-0 mt-0.5 text-rose-600" />
                  <div className="space-y-0.5">
                    <span className="font-bold">Perhatian: {result.reportCount} Laporan Masalah Aktif</span>
                    <p className="text-[11px] text-rose-700 leading-snug">
                      Terdapat laporan masalah/kerusakan infrastruktur dari warga yang memengaruhi aksesibilitas (penalti poin telah diterapkan).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 p-2 rounded-xl bg-emerald-50/40 border border-emerald-100">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  <span>0 laporan masalah infrastruktur aktif (kondisi area stabil).</span>
                </div>
              )}
            </div>

            {/* Data Warnings (if any) */}
            {result.dataWarnings.length > 0 && (
              <div className="p-3 bg-orange-50 text-orange-800 rounded-xl text-xs flex items-start space-x-2 border border-orange-200">
                <AlertTriangle className="shrink-0 mt-0.5 text-orange-600" size={16} />
                <div className="space-y-1">
                  <span className="font-bold block text-orange-900">Peringatan Data & Batasan:</span>
                  {result.dataWarnings.map((w, i) => (
                    <p key={i} className="text-[11px] leading-relaxed text-orange-800">{w}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Scores Guages */}
            <div className="space-y-4">
              <h3 className="font-bold text-ink text-base">Detail Skor Lokasi</h3>
              <ScoreGauge score={result.opportunityScore ?? 0} label="Peluang Pasar (Market Opportunity)" />
              <ScoreGauge score={result.competitionScore ?? 0} label="Tingkat Persaingan (Competition)" inverted />
              <ScoreGauge score={result.accessibilityScore ?? 0} label="Aksesibilitas (Accessibility)" />
              <ScoreGauge score={result.dataConfidence} label="Tingkat Kepercayaan Data" />

              <button
                type="button"
                onClick={() => setIsStatsModalOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-ink border border-slate-200 transition-all cursor-pointer shadow-2xs"
              >
                <BarChart3 size={15} className="text-primary" />
                <span>Lihat Statistik & Sumber Data Lengkap</span>
              </button>
            </div>

            {/* 2. Explain the Result: Factors Contributing Positively & Negatively */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-ink text-base">Faktor Penentu Skor</h3>
                <span className="text-[11px] text-muted">Berdasarkan data riil</span>
              </div>

              {/* Positive Factors */}
              {positiveFactors.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp size={12} />
                    Faktor Pendorong (+ Nilai Positif)
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {positiveFactors.map((f) => (
                      <div
                        key={f.key}
                        className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 flex items-start justify-between gap-3 text-left"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <Target size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-bold text-ink">{f.label}</div>
                            <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">{f.note}</div>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">
                          +{f.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Negative Factors */}
              {negativeFactors.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert size={12} />
                    Faktor Pengurang / Risiko (- Penalti)
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {negativeFactors.map((f) => (
                      <div
                        key={f.key}
                        className="p-3 rounded-xl border border-rose-100 bg-rose-50/50 flex items-start justify-between gap-3 text-left"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-bold text-ink">{f.label}</div>
                            <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">{f.note}</div>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md shrink-0">
                          -{f.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Neutral Factors */}
              {neutralFactors.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Activity size={12} />
                    Faktor Kontekstual (Netral)
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {neutralFactors.map((f) => (
                      <div
                        key={f.key}
                        className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-start justify-between gap-2 text-left"
                      >
                        <div>
                          <div className="text-xs font-medium text-ink">{f.label}</div>
                          <div className="text-[11px] text-muted mt-0.5">{f.note}</div>
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded shrink-0">
                          Netral
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Model Limitations Notice */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed space-y-1">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Info size={12} className="text-primary" />
                  Keterbatasan Model:
                </span>
                <p>
                  {result.limitations ||
                    "Skor adalah indeks komparatif spasial berdasarkan ketersediaan data, bukan jaminan omzet bisnis. Tidak mencakup volume lalu lintas real-time."}
                </p>
              </div>
            </div>

            {/* 3. Data Source Transparency */}
            <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5">
                  <Database size={13} className="text-primary" />
                  Transparansi Sumber Data
                </h4>
                <span className="text-[10.5px] text-muted">Integritas Provenansi</span>
              </div>

              <div className="space-y-2 text-xs divide-y divide-slate-100">
                {/* OpenStreetMap Source */}
                <div className="flex items-center justify-between pt-1.5 first:pt-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Globe size={13} className="text-sky-500 shrink-0" />
                    <span className="text-slate-700 font-medium truncate">OpenStreetMap (Overpass)</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="font-semibold text-ink">{result.allPlaces?.length ?? 0} POI</span>
                    {isStaleOsm ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Clock size={10} /> Cache Stale
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Live
                      </span>
                    )}
                    {isTruncated && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800" title="Dibatasi pada 250 tempat terdekat">
                        Terpotong (250)
                      </span>
                    )}
                  </div>
                </div>

                {/* Usaha Terdaftar LOCIVA */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Database size={13} className="text-indigo-500 shrink-0" />
                    <span className="text-slate-700 font-medium truncate">Usaha Terdaftar LOCIVA</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="font-semibold text-ink">
                      {result.registeredBusinessCount !== null && result.registeredBusinessCount !== undefined
                        ? `${result.registeredBusinessCount} Usaha`
                        : result.internalBusinessCount !== null && result.internalBusinessCount !== undefined
                        ? `${result.internalBusinessCount} Usaha`
                        : "0 Usaha"}
                    </span>
                    {(result.registeredBusinessCount ?? result.internalBusinessCount ?? 0) > 0 ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        Tersinkron
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        0 Tercatat
                      </span>
                    )}
                  </div>
                </div>

                {/* Internal POI LOCIVA */}
                {result.internalPoiCount !== null && result.internalPoiCount !== undefined && (
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Layers size={13} className="text-teal-600 shrink-0" />
                      <span className="text-slate-700 font-medium truncate">POI Fasilitas Internal</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="font-semibold text-ink">{result.internalPoiCount} POI</span>
                      {result.internalPoiCount > 0 ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                          Internal
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          0 Titik
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* BPS RI Demographics */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Building2 size={13} className="text-primary shrink-0" />
                    <span className="text-slate-700 font-medium truncate">BPS RI Demografi</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {result.bpsData?.status === 'unsupported_region' ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        Wilayah Belum Didukung
                      </span>
                    ) : result.bpsData?.densityPerKm2 ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {result.bpsData.regionName || "Didukung"}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                        Belum Tersedia
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Informative provenance footer */}
              <div className="text-[10.5px] text-slate-500 pt-1 border-t border-slate-100 leading-relaxed space-y-1">
                {isStaleOsm && (
                  <p className="text-amber-800 font-medium">
                    ⚠️ Data OSM berasal dari cache spasial lokal karena Overpass API tidak merespons langsung.
                  </p>
                )}
                {isTruncated && (
                  <p className="text-amber-800 font-medium">
                    ⚠️ Tempat eksternal melebihi batas (250 titik) dan dipotong ke radius terdekat.
                  </p>
                )}
                {result.bpsData?.status === 'unsupported_region' && (
                  <p className="text-slate-600">
                    ℹ️ Data BPS mikro wilayah ini belum terdaftar di sistem LOCIVA. Skor tidak menerapkan bobot kepadatan sensus.
                  </p>
                )}
              </div>
            </div>

            {/* Nearby Relevant Places */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-ink text-base">
                  Generator Trafik Terdekat ({result.relevantPOI.length})
                </h3>
                <span className="text-[11px] text-muted">Titik tarikan konsumen</span>
              </div>

              <div className="space-y-2">
                {result.relevantPOI.length > 0 ? (
                  result.relevantPOI.map((poi, idx) => {
                    const cat =
                      CATEGORY_BY_ID[
                        poi.category as keyof typeof CATEGORY_BY_ID
                      ];
                    return (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-sm p-2.5 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        <div className="flex items-center space-x-2 overflow-hidden min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat?.color || "#ccc" }}
                          />
                          <span className="truncate text-ink font-medium">
                            {poi.name || cat?.label || poi.category}
                          </span>
                          {poi.source === "lociva_registered" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 shrink-0">
                              Mitra
                            </span>
                          )}
                        </div>
                        <span className="text-muted font-medium whitespace-nowrap ml-2 text-xs tabular-nums">
                          {formatDistance(poi.distance)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted">
                    Tidak ada generator trafik target ditemukan dalam radius ini.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted text-sm space-y-2">
            <Target size={28} className="mx-auto text-slate-300" />
            <p className="font-medium text-slate-600">
              {candidateExists
                ? "Memuat data analisis spasial..."
                : "Klik di peta untuk menempatkan titik kandidat lokasi."}
            </p>
          </div>
        )}
      </div>

      {/* Full Statistics Dialog */}
      <CandidateStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        result={result}
        business={business}
        bpsData={result?.bpsData}
      />
    </div>
  );
};
