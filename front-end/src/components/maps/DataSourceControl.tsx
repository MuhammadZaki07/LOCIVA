import React from "react";
import { cn } from "@/lib/utils";
import { Layers, Database, Globe, RefreshCw, AlertCircle, Check } from "lucide-react";

export type FilterCategory = "all" | "cafe" | "food" | "retail" | "school_campus" | "service";

interface DataSourceControlProps {
  showMapsData: boolean;
  onToggleMapsData: (val: boolean) => void;
  mapsCount: number;
  mapsLoading: boolean;
  mapsError: string | null;
  onRetryMaps?: () => void;

  showLocivaData: boolean;
  onToggleLocivaData: (val: boolean) => void;
  locivaCount: number;
  locivaLoading: boolean;
  locivaError: string | null;
  onRetryLociva?: () => void;

  selectedCategory: FilterCategory;
  onSelectCategory: (cat: FilterCategory) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const DataSourceControl: React.FC<DataSourceControlProps> = ({
  showMapsData,
  onToggleMapsData,
  mapsCount,
  mapsLoading,
  mapsError,
  onRetryMaps,

  showLocivaData,
  onToggleLocivaData,
  locivaCount,
  locivaLoading,
  locivaError,
  onRetryLociva,

  selectedCategory,
  onSelectCategory,
  isOpen,
  onToggleOpen,
}) => {
  return (
    <div className="absolute top-20 left-4 z-[400] max-w-sm">
      <div className="clay rounded-2xl shadow-lg border border-white/80 overflow-hidden transition-all duration-300">
        {/* Header Bar */}
        <button
          type="button"
          onClick={onToggleOpen}
          className="w-full px-4 py-3 bg-white/70 flex items-center justify-between text-left hover:bg-white/90 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary-soft text-primary">
              <Layers size={16} />
            </div>
            <div>
              <p className="font-bold text-ink text-xs uppercase tracking-wider">
                Sumber Data Spasial
              </p>
              <p className="text-[11px] text-muted">
                {showMapsData ? `${mapsCount} Maps` : "Maps mati"} ·{" "}
                {showLocivaData ? `${locivaCount} LOCIVA` : "LOCIVA mati"}
              </p>
            </div>
          </div>
          <span className="text-xs text-primary font-semibold">
            {isOpen ? "Tutup" : "Kelola"}
          </span>
        </button>

        {isOpen && (
          <div className="p-4 space-y-3 bg-white/50 backdrop-blur-xs border-t border-slate-100">
            {/* Layer 1: External Maps Data */}
            <div
              className={cn(
                "p-3 rounded-xl border transition-all",
                showMapsData
                  ? "bg-white border-slate-200 clay-soft"
                  : "bg-slate-50/70 border-slate-100 opacity-70"
              )}
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showMapsData}
                    onChange={(e) => onToggleMapsData(e.target.checked)}
                    className="size-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <Globe size={14} className="text-emerald-600" />
                    <span className="font-bold text-xs text-ink">Maps Data (Eksternal)</span>
                  </div>
                </label>

                <div className="flex items-center gap-1.5">
                  {mapsLoading ? (
                    <RefreshCw size={12} className="animate-spin text-muted" />
                  ) : mapsError ? (
                    <button
                      type="button"
                      onClick={onRetryMaps}
                      title={mapsError}
                      className="text-red-500 hover:text-red-700 flex items-center gap-1 text-[11px]"
                    >
                      <AlertCircle size={12} />
                      <span className="text-[10px]">Retry</span>
                    </button>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      {mapsCount} POI
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-1.5 text-[10.5px] text-muted pl-6">
                Data tempat umum, cafe, restoran dari OpenStreetMap & Overpass API.
              </p>
            </div>

            {/* Layer 2: LOCIVA Internal Data */}
            <div
              className={cn(
                "p-3 rounded-xl border transition-all",
                showLocivaData
                  ? "bg-white border-primary/30 clay-soft"
                  : "bg-slate-50/70 border-slate-100 opacity-70"
              )}
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLocivaData}
                    onChange={(e) => onToggleLocivaData(e.target.checked)}
                    className="size-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <Database size={14} className="text-primary" />
                    <span className="font-bold text-xs text-ink">LOCIVA Data (Internal)</span>
                  </div>
                </label>

                <div className="flex items-center gap-1.5">
                  {locivaLoading ? (
                    <RefreshCw size={12} className="animate-spin text-muted" />
                  ) : locivaError ? (
                    <button
                      type="button"
                      onClick={onRetryLociva}
                      title={locivaError}
                      className="text-red-500 hover:text-red-700 flex items-center gap-1 text-[11px]"
                    >
                      <AlertCircle size={12} />
                      <span className="text-[10px]">Retry</span>
                    </button>
                  ) : (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">
                      {locivaCount} Usaha
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-1.5 text-[10.5px] text-muted pl-6">
                Usaha terverifikasi yang didaftarkan langsung di database LOCIVA.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] font-medium text-muted mb-2">Filter Kategori Lapisan:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "all", label: "Semua" },
                  { id: "cafe", label: "Cafe & Kopi" },
                  { id: "food", label: "Restoran / Makan" },
                  { id: "retail", label: "Minimarket / Toko" },
                  { id: "school_campus", label: "Pendidikan" },
                ].map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => onSelectCategory(cat.id as FilterCategory)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer",
                        isActive
                          ? "bg-primary text-white shadow-xs"
                          : "bg-white text-muted border border-slate-200 hover:text-ink hover:border-slate-300"
                      )}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend strip */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10.5px]">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-500 inline-block shadow-xs" />
                <span className="text-muted">Maps External POI</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-md bg-primary inline-block shadow-xs" />
                <span className="text-muted">LOCIVA Business</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
