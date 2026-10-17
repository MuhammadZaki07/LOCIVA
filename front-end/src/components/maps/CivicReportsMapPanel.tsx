import React, { useState } from "react";
import {
  AlertTriangle,
  Droplets,
  Trash2,
  Lightbulb,
  ShieldAlert,
  Plus,
  MapPin,
  X,
  Eye,
  EyeOff,
  Crosshair,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapCivicReport } from "./ReportMarker";

interface CivicReportsMapPanelProps {
  isOpen: boolean;
  onClose: () => void;
  reports: MapCivicReport[];
  loading: boolean;
  onFlyToReport: (lat: number, lng: number) => void;
  onOpenCreateModal: () => void;
  showReportsLayer: boolean;
  onToggleReportsLayer: (val: boolean) => void;
}

export const CivicReportsMapPanel: React.FC<CivicReportsMapPanelProps> = ({
  isOpen,
  onClose,
  reports,
  loading,
  onFlyToReport,
  onOpenCreateModal,
  showReportsLayer,
  onToggleReportsLayer,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  if (!isOpen) return null;

  const filteredReports = reports.filter((r) => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const catSlug = r.category?.slug || "road";
    const matchesCat = categoryFilter === "all" || catSlug === categoryFilter;
    return matchesStatus && matchesCat;
  });

  const getCategoryIcon = (slug?: string) => {
    switch (slug) {
      case "flood":
        return <Droplets size={13} className="text-white" />;
      case "waste":
        return <Trash2 size={13} className="text-white" />;
      case "light":
        return <Lightbulb size={13} className="text-white" />;
      case "security":
        return <ShieldAlert size={13} className="text-white" />;
      default:
        return <AlertTriangle size={13} className="text-white" />;
    }
  };

  const getCategoryColor = (slug?: string) => {
    switch (slug) {
      case "flood":
        return "#0284c7";
      case "waste":
        return "#d97706";
      case "light":
        return "#ca8a04";
      case "security":
        return "#8b5cf6";
      default:
        return "#ef4444";
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-left overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 className="font-display font-medium text-[15px] text-ink">
              Laporan kondisi warga
            </h3>
            <p className="text-[11.5px] text-muted">
              {reports.length} titik kondisi lapangan terpantau
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Layer Visibility & Add Action Bar */}
      <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onToggleReportsLayer(!showReportsLayer)}
          className={cn(
            "clay-press inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[11.5px] font-medium transition-colors cursor-pointer",
            showReportsLayer
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-white text-muted border border-slate-200 hover:text-ink"
          )}
        >
          {showReportsLayer ? <Eye size={13} /> : <EyeOff size={13} />}
          <span>{showReportsLayer ? "layer aktif di peta" : "layer disembunyikan"}</span>
        </button>

        <button
          type="button"
          onClick={onOpenCreateModal}
          className="clay-primary inline-flex items-center gap-1 rounded-[10px] px-3 py-1.5 text-[11.5px] font-medium text-white shadow-xs cursor-pointer"
        >
          <Plus size={13} />
          <span>tambah laporan</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-3 border-b border-slate-100 flex items-center gap-2 shrink-0 bg-white">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex-1 rounded-[8px] border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-ink outline-none focus:border-primary cursor-pointer"
        >
          <option value="all">Semua status</option>
          <option value="reported">Menunggu verifikasi</option>
          <option value="verification">Sedang ditinjau</option>
          <option value="confirmed">Dikonfirmasi warga</option>
          <option value="resolved">Selesai ditangani</option>
          <option value="rejected">Ditolak</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="flex-1 rounded-[8px] border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-ink outline-none focus:border-primary cursor-pointer"
        >
          <option value="all">Semua kategori</option>
          <option value="road">Jalan rusak</option>
          <option value="flood">Banjir & genangan</option>
          <option value="waste">Tumpukan sampah</option>
          <option value="light">Penerangan mati</option>
          <option value="security">Keamanan & zonasi</option>
        </select>
      </div>

      {/* Report List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="py-12 text-center text-muted">
            <AlertTriangle size={24} className="mx-auto mb-2 animate-bounce text-rose-500" />
            <p className="text-[12.5px]">Memuat laporan dari server...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-slate-200 p-8 text-center text-muted">
            <AlertTriangle size={20} className="mx-auto mb-1.5 text-slate-300" />
            <p className="text-[13px] font-medium text-ink">Tidak ada laporan</p>
            <p className="mt-0.5 text-[11px]">
              Ganti filter di atas atau klik tombol tambah laporan.
            </p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const catSlug = report.category?.slug || "road";
            const color = getCategoryColor(catSlug);

            return (
              <div
                key={report.id}
                className="clay-soft group rounded-[12px] p-3 transition-all hover:border-primary/40 hover:bg-slate-50/50"
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] shadow-xs"
                    style={{ backgroundColor: color }}
                  >
                    {getCategoryIcon(catSlug)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="truncate font-display text-[13px] font-medium text-ink">
                        {report.title}
                      </h4>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.2 text-[9.5px] font-medium border",
                          report.status === "confirmed" || report.status === "resolved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : report.status === "rejected"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}
                      >
                        {report.status}
                      </span>
                    </div>

                    {report.description && (
                      <p className="mt-1 line-clamp-2 text-[11.5px] text-muted leading-relaxed">
                        {report.description}
                      </p>
                    )}

                    <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-muted">
                      <span className="flex items-center gap-1">
                        <MapPin size={10} className="text-slate-400" />
                        <span>
                          {report.latitude.toFixed(3)}, {report.longitude.toFixed(3)}
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => onFlyToReport(report.latitude, report.longitude)}
                        className="clay-press inline-flex items-center gap-1 rounded-[6px] bg-white px-2 py-0.5 text-[10.5px] font-medium text-primary hover:text-ink cursor-pointer border border-slate-200"
                      >
                        <Crosshair size={10} />
                        <span>lihat di peta</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CivicReportsMapPanel;
