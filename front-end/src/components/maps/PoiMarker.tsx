import React from "react";
import { MapMarker, MapPopup } from "@/components/ui/shadcn-ui/map";
import { CATEGORY_BY_ID, type Place } from "@/lib/Osm";
import { formatDistance } from "@/lib/Osm";
import { Coffee, Utensils, GraduationCap, School, ShoppingBag, MapPin } from "lucide-react";

interface PoiMarkerProps {
  place: Place;
  distanceFromCandidate?: number;
  isDuplicateWithInternal?: boolean;
}

export const PoiMarker: React.FC<PoiMarkerProps> = ({
  place,
  distanceFromCandidate,
  isDuplicateWithInternal = false,
}) => {
  const cat = CATEGORY_BY_ID[place.category] || {
    id: place.category,
    label: place.category,
    color: "#6b7280",
  };

  const getIcon = () => {
    switch (place.category) {
      case "cafe":
        return <Coffee size={12} className="text-white" />;
      case "food":
        return <Utensils size={12} className="text-white" />;
      case "campus":
        return <GraduationCap size={12} className="text-white" />;
      case "school":
        return <School size={12} className="text-white" />;
      case "retail":
        return <ShoppingBag size={12} className="text-white" />;
      default:
        return <MapPin size={12} className="text-white" />;
    }
  };

  const iconNode = (
    <div
      style={{
        backgroundColor: cat.color,
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        border: "2px solid white",
        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
      title={`${place.name} (${cat.label})`}
    >
      {getIcon()}
    </div>
  );

  return (
    <MapMarker
      position={[place.lat, place.lng]}
      icon={iconNode}
      iconAnchor={[12, 12]}
      popupAnchor={[0, -14]}
    >
      <MapPopup>
        <div className="p-1 space-y-1.5 max-w-xs text-left">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
            <span
              className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wider"
              style={{ backgroundColor: cat.color }}
            >
              {cat.label}
            </span>
            <span className="text-[10px] text-muted">Maps Data</span>
          </div>

          <h4 className="font-bold text-ink text-sm leading-tight">{place.name}</h4>

          {place.address && (
            <p className="text-xs text-muted flex items-start gap-1">
              <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400" />
              <span>{place.address}</span>
            </p>
          )}

          {distanceFromCandidate !== undefined && (
            <p className="text-xs font-medium text-primary">
              Jarak dari kandidat: {formatDistance(distanceFromCandidate)}
            </p>
          )}

          {isDuplicateWithInternal && (
            <div className="rounded bg-amber-50 p-1.5 text-[10.5px] text-amber-800 border border-amber-200">
              ⚡ Terdeteksi tercatat juga di database internal LOCIVA.
            </div>
          )}

          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Sumber: OpenStreetMap</span>
            <span>ID: {place.id}</span>
          </div>
        </div>
      </MapPopup>
    </MapMarker>
  );
};
