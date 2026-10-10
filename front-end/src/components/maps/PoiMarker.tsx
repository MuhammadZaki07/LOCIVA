import React from "react";
import { MapMarker, MapPopup } from "@/components/ui/shadcn-ui/map";
import { CATEGORY_BY_ID, type Place } from "@/lib/Osm";
import { formatDistance } from "@/lib/Osm";
import {
  Coffee, Utensils, GraduationCap, School, ShoppingBag, MapPin,
  Bus, Landmark, Pill, Wrench, Dumbbell, Trees, Building2,
} from "lucide-react";

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
      case "cafe":         return <Coffee size={12} className="text-white" />;
      case "food":         return <Utensils size={12} className="text-white" />;
      case "campus":       return <GraduationCap size={12} className="text-white" />;
      case "school":       return <School size={12} className="text-white" />;
      case "retail":       return <ShoppingBag size={12} className="text-white" />;
      case "transit":      return <Bus size={12} className="text-white" />;
      case "government":   return <Landmark size={12} className="text-white" />;
      case "health":       return <Pill size={12} className="text-white" />;
      case "service":      return <Wrench size={12} className="text-white" />;
      case "sport":        return <Dumbbell size={12} className="text-white" />;
      case "park":         return <Trees size={12} className="text-white" />;
      case "commercial":   return <Building2 size={12} className="text-white" />;
      default:             return <MapPin size={12} className="text-white" />;
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
      <MapPopup className="lociva-popup-wrapper">
        <div className="p-3 space-y-2 text-left">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <span
              className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide"
              style={{ backgroundColor: cat.color }}
            >
              {cat.label}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">OSM Data</span>
          </div>

          {/* Name */}
          <h4 className="font-bold text-slate-900 text-sm leading-snug">{place.name}</h4>

          {/* Address */}
          {place.address && (
            <p className="text-xs text-slate-500 flex items-start gap-1">
              <MapPin size={11} className="shrink-0 mt-0.5 text-slate-400" />
              <span>{place.address}</span>
            </p>
          )}

          {/* Distance from candidate */}
          {distanceFromCandidate !== undefined && (
            <p className="text-xs font-semibold text-indigo-600">
              {formatDistance(distanceFromCandidate)} from candidate
            </p>
          )}

          {/* Duplicate notice */}
          {isDuplicateWithInternal && (
            <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10.5px] text-amber-800 border border-amber-200">
              <Landmark size={11} className="shrink-0 mt-0.5" />
              <span>Also found in LOCIVA internal database.</span>
            </div>
          )}

          {/* Footer */}
          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Source: OpenStreetMap</span>
            <span className="font-mono">{place.id}</span>
          </div>
        </div>
      </MapPopup>
    </MapMarker>
  );
};
