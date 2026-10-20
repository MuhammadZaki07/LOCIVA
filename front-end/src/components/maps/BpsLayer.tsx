import React, { useEffect, useState } from "react";
import { MapPolygon, MapPopup } from "@/components/ui/shadcn-ui/map";
import api from "@/context/apiClient";
import { Users, Info, X } from "lucide-react";

export interface BpsDistrictFeature {
  type: "Feature";
  properties: {
    name: string;
    city: string;
    bps_code: string;
    population: number;
    area_km2: number;
    density_per_km2: number;
    density_category: string;
    color: string;
    year: number;
    source: string;
  };
  geometry: {
    type: "Polygon";
    coordinates: [number, number][][]; // [lng, lat]
  };
}

interface BpsLayerProps {
  isVisible: boolean;
}

export const BpsLayer: React.FC<BpsLayerProps> = ({ isVisible }) => {
  const [features, setFeatures] = useState<BpsDistrictFeature[]>([]);

  useEffect(() => {
    if (!isVisible) return;

    let isMounted = true;
    api
      .get("/bps/map-layer")
      .then((res) => {
        if (isMounted && res.data?.features) {
          setFeatures(res.data.features);
        }
      })
      .catch((err) => {
        console.warn("Gagal memuat layer BPS:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [isVisible]);

  if (!isVisible || features.length === 0) return null;

  return (
    <>
      {features.map((feature, idx) => {
        const ring = feature.geometry.coordinates[0] || [];
        // Leaflet expects [lat, lng]
        const leafletPositions: [number, number][] = ring.map(([lng, lat]) => [lat, lng]);

        return (
          <MapPolygon
            key={`bps-district-${feature.properties.bps_code || idx}`}
            positions={leafletPositions}
            pathOptions={{
              color: "#4f46e5",
              weight: 1.5,
              opacity: 0.85,
              fillColor: feature.properties.color || "#6366f1",
              fillOpacity: 0.22,
            }}
          >
            <MapPopup className="lociva-popup-wrapper">
              <div className="p-3 text-left space-y-2 max-w-xs font-sans">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                    BPS Kepadatan Penduduk
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {feature.properties.bps_code}
                  </span>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-ink font-display">
                    Kecamatan {feature.properties.name}
                  </h4>
                  <p className="text-xs text-muted">{feature.properties.city}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-muted block">Kepadatan</span>
                    <span className="text-xs font-bold text-indigo-700 tabular-nums">
                      {feature.properties.density_per_km2.toLocaleString("id-ID")} jiwa/km²
                    </span>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-muted block">Total Penduduk</span>
                    <span className="text-xs font-bold text-ink tabular-nums">
                      {feature.properties.population.toLocaleString("id-ID")} jiwa
                    </span>
                  </div>
                </div>

                <div className="text-[10.5px] text-slate-500 pt-1 border-t border-slate-100 space-y-0.5">
                  <p className="flex justify-between">
                    <span>Luas Wilayah:</span>
                    <span className="font-medium text-slate-700">{feature.properties.area_km2} km²</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Kategori:</span>
                    <span className="font-semibold text-indigo-600">
                      {feature.properties.density_category}
                    </span>
                  </p>
                  <p className="text-[9.5px] text-slate-400 pt-1 leading-tight">
                    Sumber: {feature.properties.source} ({feature.properties.year})
                  </p>
                </div>
              </div>
            </MapPopup>
          </MapPolygon>
        );
      })}
    </>
  );
};

interface BpsLegendProps {
  isVisible: boolean;
  onClose: () => void;
}

export const BpsLegend: React.FC<BpsLegendProps> = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 md:bottom-8 md:left-4 z-[400] bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200/80 max-w-xs space-y-2.5 animate-in fade-in duration-200">
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

      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-xs shrink-0" style={{ backgroundColor: "#818cf8" }} />
          <span className="text-muted">&lt; 10.000 jiwa/km² (Sedang)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-xs shrink-0" style={{ backgroundColor: "#6366f1" }} />
          <span className="text-muted">10.000 - 15.000 jiwa/km² (Tinggi)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-xs shrink-0" style={{ backgroundColor: "#4f46e5" }} />
          <span className="text-muted">15.000 - 20.000 jiwa/km² (Sangat Tinggi)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-xs shrink-0" style={{ backgroundColor: "#312e81" }} />
          <span className="text-muted">&gt; 20.000 jiwa/km² (Padat Ekstrem)</span>
        </div>
      </div>

      <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
        <span>Agregat Kecamatan · 2024</span>
        <span className="flex items-center gap-0.5">
          <Info size={10} />
          BPS RI
        </span>
      </div>
    </div>
  );
};
