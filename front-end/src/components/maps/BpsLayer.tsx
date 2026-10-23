import React, { useEffect, useState } from "react";
import { Polygon, Popup } from "react-leaflet";
import api from "@/context/apiClient";
import { Users, Info, X, Loader2, AlertCircle } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BpsDistrictFeature {
  type: "Feature";
  properties: {
    name: string;
    city: string;
    bps_code: string;
    population: number | null;
    area_km2: number | null;
    density_per_km2: number | null;
    density_category: string;
    color: string;
    year: number;
    source: string;
    type?: string;
    admin_level?: string;
  };
  geometry:
    | {
        type: "Polygon";
        coordinates: [number, number][][]; // [lng, lat]
      }
    | {
        type: "MultiPolygon";
        coordinates: [number, number][][][]; // [part][ring][point]
      };
}

/** One entry in the backend-provided legend */
export interface BpsLegendEntry {
  min: number | null;
  max: number | null;
  label: string;
  category: string;
  color: string;
}

export interface BpsLayerProps {
  isVisible: boolean;
  level?: "regency" | "district";
  onLoadingChange?: (loading: boolean) => void;
  onErrorChange?: (error: string | null) => void;
  /** Called with the legend entries once the API response is received */
  onLegendReady?: (entries: BpsLegendEntry[], year: number, regionName?: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Whether the feature's density data is missing (null/sentinel color) */
function isDataUnavailable(color: string): boolean {
  return color === "#cbd5e1";
}

/** Extract all outer rings from a Polygon or MultiPolygon geometry */
function getOuterRings(
  geometry: BpsDistrictFeature["geometry"],
): [number, number][][] {
  if (geometry.type === "Polygon") {
    return [geometry.coordinates[0]];
  }
  return (
    geometry as { type: "MultiPolygon"; coordinates: [number, number][][][] }
  ).coordinates.map((part) => part[0] as [number, number][]);
}

// ─────────────────────────────────────────────────────────────────────────────
// BpsLayer — renders choropleth polygons inside a react-leaflet MapContainer
// ─────────────────────────────────────────────────────────────────────────────

export const BpsLayer: React.FC<BpsLayerProps> = ({
  isVisible,
  level = "regency",
  onLoadingChange,
  onErrorChange,
  onLegendReady,
}) => {
  const [features, setFeatures] = useState<BpsDistrictFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLoading = (val: boolean) => {
    setLoading(val);
    onLoadingChange?.(val);
  };

  const updateError = (err: string | null) => {
    setError(err);
    onErrorChange?.(err);
  };

  useEffect(() => {
    if (!isVisible) return;

    let isMounted = true;
    updateLoading(true);
    updateError(null);

    const endpoint =
      level === "district"
        ? "/bps/map-layer?level=district&domain=3573"
        : "/bps/map-layer?level=regency&domain=3500";

    api
      .get(endpoint)
      .then((res) => {
        if (!isMounted) return;

        const data = res.data;
        if (data?.features && Array.isArray(data.features)) {
          setFeatures(data.features);

          // Pass legend entries up to parent
          if (data.metadata?.legend && onLegendReady) {
            onLegendReady(
              data.metadata.legend,
              data.metadata.year ?? new Date().getFullYear(),
              data.metadata.region_name ?? "Provinsi Jawa Timur",
            );
          }

          if (data.features.length === 0) {
            updateError(
              data?.message ||
                "Batas poligon administratif belum tersedia di sistem.",
            );
          }
        } else {
          updateError("Respons BPS tidak mengandung features yang valid.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("[BpsLayer] Gagal memuat layer BPS:", err);
        updateError("Gagal memuat data BPS dari server.");
      })
      .finally(() => {
        if (isMounted) updateLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isVisible, level]); // Re-fetch if level changes

  if (!isVisible || loading || features.length === 0) return null;

  return (
    <>
      {features.map((feature, featureIdx) => {
        const rings = getOuterRings(feature.geometry);
        const { properties: p } = feature;
        const noData = isDataUnavailable(p.color);

        const displayName =
          p.admin_level === "regency" ||
          p.name.startsWith("Kota ") ||
          p.name.startsWith("Kabupaten ")
            ? p.name
            : `Kecamatan ${p.name}`;

        return rings.map((ring, ringIdx) => {
          // Leaflet expects [lat, lng]; GeoJSON stores [lng, lat]
          const leafletPositions: [number, number][] = ring.map(
            ([lng, lat]: [number, number]) => [lat, lng],
          );

          if (leafletPositions.length < 3) return null;

          // Only attach popup to the first ring to avoid duplicate popups
          const showPopup = ringIdx === 0;

          return (
            <Polygon
              key={`bps-${p.bps_code || featureIdx}-ring-${ringIdx}`}
              positions={leafletPositions}
              pathOptions={{
                color: noData ? "#94a3b8" : "#312e81",
                weight: noData ? 1 : 1.5,
                opacity: 0.85,
                fillColor: p.color,
                fillOpacity: noData ? 0.2 : 0.55,
                dashArray: noData ? "4 4" : undefined,
              }}
            >
              {showPopup && (
                <Popup className="lociva-popup-wrapper">
                  <div className="p-3 text-left space-y-2 max-w-xs font-sans">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        BPS Kepadatan Penduduk
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {p.bps_code}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-ink font-display">
                        {displayName}
                      </h4>
                      <p className="text-xs text-muted">{p.city}</p>
                    </div>

                    {noData ? (
                      <p className="text-xs text-slate-500 italic">
                        Data kepadatan penduduk untuk wilayah ini belum tersedia.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <span className="text-[10px] text-muted block">Kepadatan</span>
                          <span className="text-xs font-bold text-indigo-700 tabular-nums">
                            {p.density_per_km2?.toLocaleString("id-ID")} jiwa/km²
                          </span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <span className="text-[10px] text-muted block">Total Penduduk</span>
                          <span className="text-xs font-bold text-ink tabular-nums">
                            {p.population?.toLocaleString("id-ID")} jiwa
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="text-[10.5px] text-slate-500 pt-1 border-t border-slate-100 space-y-0.5">
                      {p.area_km2 != null && (
                        <p className="flex justify-between">
                          <span>Luas Wilayah:</span>
                          <span className="font-medium text-slate-700">{p.area_km2} km²</span>
                        </p>
                      )}
                      <p className="flex justify-between">
                        <span>Kategori:</span>
                        <span
                          className="font-semibold"
                          style={{ color: noData ? "#64748b" : "#4338ca" }}
                        >
                          {p.density_category}
                        </span>
                      </p>
                      <p className="text-[9.5px] text-slate-400 pt-1 leading-tight">
                        Sumber: {p.source} ({p.year})
                      </p>
                    </div>
                  </div>
                </Popup>
              )}
            </Polygon>
          );
        });
      })}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BpsLayerStatus — overlay badge shown outside the map
// ─────────────────────────────────────────────────────────────────────────────

export const BpsLayerStatus: React.FC<{
  isVisible: boolean;
  loading: boolean;
  error: string | null;
}> = ({ isVisible, loading, error }) => {
  if (!isVisible) return null;
  if (loading) {
    return (
      <div className="fixed bottom-32 right-4 z-[500] bg-indigo-600 text-white px-3 py-1.5 rounded-full text-[11px] font-medium shadow-md flex items-center gap-1.5">
        <Loader2 size={11} className="animate-spin" />
        <span>Memuat layer BPS...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="fixed bottom-32 right-4 z-[500] bg-rose-600 text-white px-3 py-1.5 rounded-full text-[11px] font-medium shadow-md flex items-center gap-1.5">
        <AlertCircle size={11} />
        <span>{error}</span>
      </div>
    );
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// BpsLegend — dynamic legend card driven by API metadata
// ─────────────────────────────────────────────────────────────────────────────

interface BpsLegendProps {
  isVisible: boolean;
  onClose: () => void;
  /** Legend entries from the API; if omitted, falls back to hardcoded default */
  entries?: BpsLegendEntry[];
  year?: number;
  regionName?: string;
  level?: "regency" | "district";
  onLevelChange?: (level: "regency" | "district") => void;
}

/** Fallback entries for regency level (Jawa Timur) */
const DEFAULT_LEGEND_ENTRIES: BpsLegendEntry[] = [
  { min: null, max: 749,  label: "< 750 jiwa/km²",         category: "Sangat Rendah", color: "#e0e7ff" },
  { min: 750,  max: 1499, label: "750 – 1.499 jiwa/km²",   category: "Rendah",        color: "#a5b4fc" },
  { min: 1500, max: 3999, label: "1.500 – 3.999 jiwa/km²", category: "Sedang",        color: "#6366f1" },
  { min: 4000, max: 6999, label: "4.000 – 6.999 jiwa/km²", category: "Tinggi",        color: "#4338ca" },
  { min: 7000, max: null, label: "≥ 7.000 jiwa/km²",        category: "Sangat Tinggi", color: "#1e1b4b" },
];

export const BpsLegend: React.FC<BpsLegendProps> = ({
  isVisible,
  onClose,
  entries,
  year,
  regionName = "Provinsi Jawa Timur",
  level = "regency",
  onLevelChange,
}) => {
  if (!isVisible) return null;

  const legendEntries = entries && entries.length > 0 ? entries : DEFAULT_LEGEND_ENTRIES;
  const displayYear = year ?? new Date().getFullYear();

  return (
    <div className="fixed bottom-20 right-105 md:bottom-8 md:right-105 z-[400] bg-white/95 backdrop-blur-md p-3.5 rounded-md shadow-sm border border-slate-200/80 max-w-xs space-y-2.5 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
          <Users size={14} className="text-primary" />
          <span>Kepadatan Penduduk (BPS)</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-ink p-1 rounded-md transition-colors cursor-pointer"
          title="Tutup legenda"
        >
          <X size={13} />
        </button>
      </div>

      {/* Scope switcher if onLevelChange callback provided */}
      {onLevelChange && (
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md text-[10px] font-medium">
          <button
            type="button"
            onClick={() => onLevelChange("regency")}
            className={`flex-1 py-1 px-1.5 rounded transition-colors text-center cursor-pointer ${
              level === "regency"
                ? "bg-white text-indigo-700 shadow-xs font-semibold"
                : "text-slate-500 hover:text-ink"
            }`}
          >
            Jawa Timur (38 Kab/Kota)
          </button>
          <button
            type="button"
            onClick={() => onLevelChange("district")}
            className={`flex-1 py-1 px-1.5 rounded transition-colors text-center cursor-pointer ${
              level === "district"
                ? "bg-white text-indigo-700 shadow-xs font-semibold"
                : "text-slate-500 hover:text-ink"
            }`}
          >
            Kota Malang (5 Kec)
          </button>
        </div>
      )}

      <div className="space-y-1.5 text-[11px]">
        {legendEntries.map((entry) => (
          <div key={entry.category} className="flex items-center gap-2">
            <span
              className="size-3 rounded-[2px] shrink-0 border border-black/10"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted">
              {entry.label}{" "}
              <span className="text-slate-400">({entry.category})</span>
            </span>
          </div>
        ))}

        {/* "Data tidak tersedia" sentinel */}
        <div className="flex items-center gap-2 pt-0.5 border-t border-slate-100 mt-1">
          <span
            className="size-3 rounded-[2px] shrink-0 border border-dashed border-slate-400"
            style={{ backgroundColor: "#cbd5e1" }}
          />
          <span className="text-slate-400 italic text-[10.5px]">Data tidak tersedia</span>
        </div>
      </div>

      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
        <span>{regionName} · {displayYear}</span>
        <span className="flex items-center gap-0.5">
          <Info size={10} />
          BPS RI
        </span>
      </div>
    </div>
  );
};
