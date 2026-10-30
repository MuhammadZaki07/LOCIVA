import React from "react";
import {
  Sparkles, X, MapPin, Crosshair, Navigation, Loader2, AlertCircle,
  RefreshCw, Trophy, Bot, FileText, ArrowRight, FileWarning, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistance } from "@/lib/Osm";
import type {
  RecommendationItem,
  RecommendationResult,
} from "@/lib/recommendation";

interface RecommendationPanelProps {
  onClose: () => void;
  status: "idle" | "loading" | "done" | "error";
  progress: { done: number; total: number };
  data: RecommendationResult | null;
  error: string | null;
  point: { lat: number; lng: number } | null;
  isPicking: boolean;
  hasUserLocation: boolean;
  onPickOnMap: () => void;
  onCancelPick: () => void;
  onUseMapCenter: () => void;
  onUseMyLocation: () => void;
  onRetry: () => void;
  onReset: () => void;
  onFlyToPoint: () => void;
  onUseRecommendation: (item: RecommendationItem) => void;
}

const MiniBar: React.FC<{ label: string; value: number; inverted?: boolean }> = ({
  label, value, inverted = false,
}) => {
  const good = inverted ? value <= 33 : value >= 66;
  const mid = inverted ? value <= 66 : value >= 33;
  const color = good ? "bg-emerald-500" : mid ? "bg-amber-500" : "bg-rose-500";
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-muted">
        <span>{label}</span>
        <span className="font-bold tabular-nums text-ink">{value}</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  onClose, status, progress, data, error, point, isPicking, hasUserLocation,
  onPickOnMap, onCancelPick, onUseMapCenter, onUseMyLocation,
  onRetry, onReset, onFlyToPoint, onUseRecommendation,
}) => {
  const loading = status === "loading";
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="flex h-full w-full flex-col bg-surface text-left text-ink">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold">Rekomendasi Usaha</h3>
            <p className="text-xs text-muted">Usaha paling cocok untuk satu titik</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="cursor-pointer rounded-xl p-1.5 text-slate-500 hover:bg-slate-100"
        >
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {/* Point picker */}
        <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3.5">
          <p className="text-xs font-bold">1. Tentukan titik lokasi</p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={isPicking ? onCancelPick : onPickOnMap}
              disabled={loading}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11.5px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
                isPicking
                  ? "border-rose-300 bg-rose-50 text-rose-700"
                  : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10",
              )}
            >
              <Crosshair size={13} />
              {isPicking ? "Batal pilih" : "Klik di peta"}
            </button>
            <button
              type="button"
              onClick={onUseMapCenter}
              disabled={loading}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2 text-[11.5px] font-semibold text-ink hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MapPin size={13} />
              Tengah peta
            </button>
            <button
              type="button"
              onClick={onUseMyLocation}
              disabled={loading || !hasUserLocation}
              title={hasUserLocation ? undefined : "Aktifkan lokasi live dulu"}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2 text-[11.5px] font-semibold text-ink hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Navigation size={13} />
              Lokasi saya
            </button>
          </div>

          {isPicking && (
            <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
              Klik titik mana pun di peta untuk memulai analisis.
            </p>
          )}

          {point && (
            <button
              type="button"
              onClick={onFlyToPoint}
              className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-slate-600 hover:bg-slate-100"
            >
              <MapPin size={12} className="text-primary" />
              {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
            </button>
          )}
        </div>

        {/* Idle */}
        {status === "idle" && !isPicking && (
          <div className="space-y-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">
            <Sparkles size={26} className="mx-auto text-amber-500/70" />
            <p className="text-sm font-bold">Belum ada titik</p>
            <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted">
              Pilih satu titik. LOCIVA akan menilai semua jenis usaha di katalog, lalu menampilkan 3 yang paling cocok.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Loader2 size={15} className="animate-spin text-primary" />
              <span>
                Menilai jenis usaha… {progress.done}/{progress.total || "?"}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[11px] text-muted">
              Setiap jenis usaha dianalisis dengan radius standarnya. Mohon tunggu.
            </p>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-2 text-xs font-semibold text-rose-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onRetry}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
              >
                <RefreshCw size={13} /> Coba lagi
              </button>
              <button
                type="button"
                onClick={onReset}
                className="cursor-pointer rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {status === "done" && data && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold">2. Top {data.items.length} rekomendasi</p>
              <span className="text-[10.5px] text-muted">{data.evaluated} jenis usaha dinilai</span>
            </div>

            {data.items.map((item, idx) => (
              <div
                key={item.business.id}
                className={cn(
                  "space-y-3 rounded-2xl border bg-white p-3.5 shadow-xs",
                  idx === 0 ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                        idx === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {idx === 0 ? <Trophy size={14} /> : idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-bold">{item.business.name}</h4>
                      <p className="truncate text-[10.5px] text-muted">
                        {item.business.category} · radius {item.radius} m
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-xl font-bold leading-none tabular-nums text-primary">
                      {item.fitScore}
                    </div>
                    <div className="text-[9.5px] text-muted">fit score</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <MiniBar label="Peluang" value={item.opportunity} />
                  <MiniBar label="Persaingan" value={item.competition} inverted />
                  <MiniBar label="Akses" value={item.accessibility} />
                </div>

                <div className="rounded-xl bg-slate-50 p-2.5">
                  <p className="text-[12px] leading-relaxed text-slate-700">{item.reason}</p>
                  <span
                    className={cn(
                      "mt-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-bold",
                      item.reasonSource === "ai"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-slate-200 text-slate-600",
                    )}
                    title={
                      item.reasonSource === "ai"
                        ? "Peringkat dari algoritma; teks alasan ditulis AI."
                        : "Teks alasan dibuat dari template lokal."
                    }
                  >
                    {item.reasonSource === "ai" ? <Bot size={10} /> : <FileText size={10} />}
                    {item.reasonSource === "ai" ? "Alasan oleh AI" : "Alasan otomatis"}
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-muted">
                  {item.nearestCompetitor ? (
                    <p className="flex items-center gap-1.5">
                      <Building2 size={12} className="text-amber-600" />
                      Pesaing terdekat: {item.nearestCompetitor.name || "tanpa nama"} (
                      {formatDistance(item.nearestCompetitor.distance)})
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5">
                      <Building2 size={12} className="text-emerald-600" />
                      Tidak ada pesaing langsung terdeteksi.
                    </p>
                  )}
                  {item.reportCount > 0 && (
                    <p className="flex items-center gap-1.5 text-rose-700">
                      <FileWarning size={12} />
                      {item.reportCount} laporan infrastruktur aktif
                    </p>
                  )}
                  {item.dataConfidence < 40 && (
                    <p className="flex items-center gap-1.5 text-amber-700">
                      <AlertCircle size={12} />
                      Data di area ini minim ({item.dataConfidence}%), hasil kurang pasti.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onUseRecommendation(item)}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-xs font-bold text-ink transition-all hover:bg-primary hover:text-white"
                >
                  Analisis penuh sebagai Kandidat A
                  <ArrowRight size={13} />
                </button>
              </div>
            ))}

            <p className="px-1 text-[10.5px] leading-relaxed text-muted">
              Peringkat dihitung dari skor spasial (peluang 50%, persaingan 25%, aksesibilitas 25%, disesuaikan kepercayaan data). AI hanya menulis alasan, tidak menentukan peringkat. Skor adalah indeks komparatif, bukan jaminan omzet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationPanel;