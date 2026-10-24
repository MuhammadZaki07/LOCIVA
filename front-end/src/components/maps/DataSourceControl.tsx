// DataSourceControl
import React from "react";
import { cn } from "@/lib/utils";
import { Layers, Database, Globe, MapPin, RefreshCw, AlertCircle, X } from "lucide-react";

export type FilterCategory = "all" | "cafe" | "food" | "retail" | "school_campus" | "service" | "tourism" | "office";

interface DataSourceControlProps {
  // External OSM (Overpass)
  showMapsData: boolean;
  onToggleMapsData: (val: boolean) => void;
  mapsCount: number;
  mapsLoading: boolean;
  mapsError: string | null;
  onRetryMaps?: () => void;

  // Internal Map POIs (LocalOSM, LOCIVA backend)
  showLocalPoiData: boolean;
  onToggleLocalPoiData: (val: boolean) => void;
  localPoiCount: number;
  localPoiLoading: boolean;
  localPoiError: string | null;
  onRetryLocalPoi?: () => void;

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
  isStale?: boolean;
  isEmbedded?: boolean;
}

export const DataSourceControl: React.FC<DataSourceControlProps> = ({
  showMapsData,
  onToggleMapsData,
  mapsCount,
  mapsLoading,
  mapsError,
  onRetryMaps,

  showLocalPoiData,
  onToggleLocalPoiData,
  localPoiCount,
  localPoiLoading,
  localPoiError,
  onRetryLocalPoi,

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
  isStale = false,
  isEmbedded = false,
}) => {
  return (
    <div className={cn(
      isEmbedded
        ? "h-full w-full flex flex-col bg-surface text-left overflow-y-auto"
        : "absolute top-20 left-4 z-[400] max-w-lg text-left"
    )}>
      <div className={cn(
        "overflow-hidden transition-all duration-300 flex flex-col",
        isEmbedded ? "h-full bg-transparent" : "clay rounded-2xl shadow-lg border border-white/80"
      )}>
        {/* Header Bar */}
        <div
          className="w-full px-4 py-3 bg-white/70 flex items-center justify-between text-left shrink-0 border-b border-slate-100"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary-soft text-primary">
              <Layers size={16} />
            </div>
            <div>
              <p className="font-bold text-ink text-xs uppercase tracking-wider">
                Spatial Data Sources & POIs
              </p>
              <p className="text-[11px] text-muted">
                {showLocalPoiData ? `${localPoiCount} Internal` : "Internal Off"} ·{" "}
                {showMapsData ? `${mapsCount} External` : "External Off"} ·{" "}
                {showLocivaData ? `${locivaCount} LOCIVA` : "LOCIVA Off"}
                {isStale && " (Cached)"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleOpen}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {isOpen && (
          <div className="p-4 space-y-3 bg-white/50 backdrop-blur-xs border-t border-slate-100">
            {/* Layer 0: Internal Map POIs (LocalOSM) */}
            <div
              className={cn(
                "p-3 rounded-xl border transition-all",
                showLocalPoiData
                  ? "bg-white border-slate-200 clay-soft"
                  : "bg-slate-50/70 border-slate-100 opacity-70"
              )}
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLocalPoiData}
                    onChange={(e) => onToggleLocalPoiData(e.target.checked)}
                    className="size-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-600" />
                    <span className="font-bold text-xs text-ink">Internal Map POIs (LocalOSM)</span>
                  </div>
                </label>

                <div className="flex items-center gap-1.5">
                  {localPoiLoading ? (
                    <RefreshCw size={12} className="animate-spin text-muted" />
                  ) : localPoiError ? (
                    <button
                      type="button"
                      onClick={onRetryLocalPoi}
                      title={localPoiError}
                      className="text-red-500 hover:text-red-700 flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <AlertCircle size={12} />
                      <span className="text-[10px]">Retry</span>
                    </button>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      {localPoiCount} Places
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-1.5 text-[10.5px] text-muted pl-6 leading-relaxed">
                POIs served from the LOCIVA database (OpenStreetMap-derived imports and manually added POIs), loaded by viewport.
              </p>
            </div>

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
                    <span className="font-bold text-xs text-ink">External Map POIs (OSM)</span>
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
                      className="text-red-500 hover:text-red-700 flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <AlertCircle size={12} />
                      <span className="text-[10px]">Retry</span>
                    </button>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      {mapsCount} Places
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-1.5 text-[10.5px] text-muted pl-6 leading-relaxed">
                OpenStreetMap points of interest loaded dynamically by viewport. Coverage depends on global community contributions.
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
                    <span className="font-bold text-xs text-ink">LOCIVA Verified Businesses</span>
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
                      className="text-red-500 hover:text-red-700 flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <AlertCircle size={12} />
                      <span className="text-[10px]">Retry</span>
                    </button>
                  ) : (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">
                      {locivaCount} Businesses
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-1.5 text-[10.5px] text-muted pl-6 leading-relaxed">
                Registered local businesses recorded directly in the LOCIVA database platform.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] font-medium text-muted mb-2">Layer Category Filter:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "all", label: "All" },
                  { id: "cafe", label: "Cafes & Coffee" },
                  { id: "food", label: "Dining & Food" },
                  { id: "retail", label: "Retail & Stores" },
                  { id: "school_campus", label: "Schools & Campuses" },
                  { id: "service", label: "Services" },
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
                <span className="text-muted">OSM POI</span>
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
