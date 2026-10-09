import React from "react";
import { MapMarker, MapPopup } from "@/components/ui/shadcn-ui/map";
import { formatDistance } from "@/lib/Osm";
import { Store, MapPin, CheckCircle2 } from "lucide-react";

export interface LocivaBusiness {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  distance?: number;
  source: string;
  business_type?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  created_at?: string;
}

interface InternalBusinessMarkerProps {
  business: LocivaBusiness;
  distanceFromCandidate?: number;
  isDuplicateWithExternal?: boolean;
}

export const InternalBusinessMarker: React.FC<InternalBusinessMarkerProps> = ({
  business,
  distanceFromCandidate,
  isDuplicateWithExternal = false,
}) => {
  const iconNode = (
    <div
      style={{
        background: "linear-gradient(135deg, #6c6ce2 0%, #4747b8 100%)",
        width: "28px",
        height: "28px",
        borderRadius: "8px",
        border: "2px solid #ffffff",
        boxShadow: "0 3px 8px rgba(71,71,184,0.45), inset 0 1px 1px rgba(255,255,255,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
      title={`${business.name} (LOCIVA Business)`}
    >
      <Store size={14} className="text-white" />
    </div>
  );

  return (
    <MapMarker
      position={[business.latitude, business.longitude]}
      icon={iconNode}
      iconAnchor={[14, 14]}
      popupAnchor={[0, -16]}
    >
      <MapPopup>
        <div className="p-1 space-y-1.5 max-w-xs text-left">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
            <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              <CheckCircle2 size={10} />
              LOCIVA DATA
            </span>
            <span className="text-[10px] text-muted">
              {business.business_type?.name || "Usaha Terdaftar"}
            </span>
          </div>

          <h4 className="font-bold text-ink text-sm leading-tight">{business.name}</h4>

          {business.description && (
            <p className="text-xs text-slate-600 line-clamp-2">{business.description}</p>
          )}

          {business.address && (
            <p className="text-xs text-muted flex items-start gap-1">
              <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400" />
              <span>{business.address}</span>
            </p>
          )}

          {distanceFromCandidate !== undefined && (
            <p className="text-xs font-medium text-primary">
              Jarak dari kandidat: {formatDistance(distanceFromCandidate)}
            </p>
          )}

          {isDuplicateWithExternal && (
            <div className="rounded bg-sky-50 p-1.5 text-[10.5px] text-sky-800 border border-sky-200">
              ℹ️ Terdata juga di OpenStreetMap / External Maps.
            </div>
          )}

          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Basis Data: LOCIVA Internal</span>
            <span>ID: {business.id.slice(0, 8)}...</span>
          </div>
        </div>
      </MapPopup>
    </MapMarker>
  );
};
