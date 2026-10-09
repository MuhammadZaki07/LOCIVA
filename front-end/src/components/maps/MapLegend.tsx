import React, { useState } from 'react';
import { CATEGORIES } from '@/lib/Osm';
import { ChevronDown, ChevronUp, Layers, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapLegendProps {
  showMapsData?: boolean;
  showLocivaData?: boolean;
  mapsCount?: number;
  locivaCount?: number;
  activeCandidateCount?: number;
  basemapMode?: 'default' | 'satellite';
}

export const MapLegend: React.FC<MapLegendProps> = ({
  showMapsData = true,
  showLocivaData = true,
  mapsCount = 0,
  locivaCount = 0,
  activeCandidateCount = 0,
  basemapMode = 'default',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute bottom-6 right-6 z-[400] max-w-xs transition-all">
      <div className="clay rounded-2xl shadow-lg border border-white/80 overflow-hidden bg-surface/95 backdrop-blur-xs">
        {/* Toggle bar */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-primary" />
            <span className="font-bold text-ink text-xs">Legenda Peta</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="font-semibold text-primary">
              {showMapsData ? mapsCount : 0} POI
            </span>
            <span>·</span>
            <span className="font-semibold text-indigo-600">
              {showLocivaData ? locivaCount : 0} Usaha
            </span>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </div>
        </button>

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="p-3.5 pt-1 space-y-3 border-t border-slate-100 text-xs">
            {/* Active Layers Status */}
            <div>
              <h4 className="font-bold text-[11px] text-ink uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Status Lapisan Aktif</span>
                <span className="text-[10px] lowercase text-muted">
                  mode: {basemapMode === 'satellite' ? 'satelit' : 'standar'}
                </span>
              </h4>
              <div className="space-y-1">
                <div className="flex items-center justify-between p-1 rounded bg-slate-50/80">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "size-2.5 rounded-full",
                        showMapsData ? "bg-emerald-500" : "bg-slate-300"
                      )}
                    />
                    <span className="text-ink font-medium">Maps External POI</span>
                  </div>
                  <span className="font-bold text-muted">
                    {showMapsData ? `${mapsCount} titik` : "Nonaktif"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-1 rounded bg-slate-50/80">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "size-2.5 rounded-md",
                        showLocivaData ? "bg-primary" : "bg-slate-300"
                      )}
                    />
                    <span className="text-ink font-medium">LOCIVA Internal Data</span>
                  </div>
                  <span className="font-bold text-muted">
                    {showLocivaData ? `${locivaCount} bisnis` : "Nonaktif"}
                  </span>
                </div>
              </div>
            </div>

            {/* Candidate Markers */}
            <div>
              <h4 className="font-bold text-[11px] text-ink uppercase tracking-wider mb-1.5">
                Kandidat Lokasi ({activeCandidateCount} aktif)
              </h4>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full bg-primary inline-flex items-center justify-center text-[8px] font-bold text-white">
                    A
                  </span>
                  <span className="text-muted">Titik A</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full bg-[#2f9e6b] inline-flex items-center justify-center text-[8px] font-bold text-white">
                    B
                  </span>
                  <span className="text-muted">Titik B</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full bg-[#c4922a] inline-flex items-center justify-center text-[8px] font-bold text-white">
                    C
                  </span>
                  <span className="text-muted">Titik C</span>
                </div>
              </div>
            </div>

            {/* POI Categories */}
            <div>
              <h4 className="font-bold text-[11px] text-ink uppercase tracking-wider mb-1.5">
                Kategori POI (OpenStreetMap)
              </h4>
              <div className="grid grid-cols-2 gap-1.5">
                {CATEGORIES.slice(0, 8).map((cat) => (
                  <div key={cat.id} className="flex items-center space-x-1.5">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-muted truncate text-[11px]" title={cat.label}>
                      {cat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Provenance note */}
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-1.5 text-[10px] text-muted">
              <Info size={12} className="shrink-0 mt-0.5 text-primary" />
              <span>
                Data eksternal berasal dari OpenStreetMap/Overpass. Bisnis LOCIVA tersimpan di database terverifikasi.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
