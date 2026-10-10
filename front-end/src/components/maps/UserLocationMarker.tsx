import React from "react";
import { MapMarker, MapPopup, MapCircle } from "@/components/ui/shadcn-ui/map";

interface UserLocationMarkerProps {
  lat: number;
  lng: number;
  accuracy?: number;
}

export const UserLocationMarker: React.FC<UserLocationMarkerProps> = ({
  lat,
  lng,
  accuracy = 30,
}) => {
  const iconNode = (
    <div className="relative flex items-center justify-center size-6">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-400 opacity-75" />
      <span className="relative inline-flex size-4 rounded-full border-2 border-white bg-blue-600 shadow-md" />
    </div>
  );

  return (
    <>
      <MapMarker
        position={[lat, lng]}
        icon={iconNode}
        iconAnchor={[12, 12]}
        popupAnchor={[0, -12]}
      >
        <MapPopup>
          <div className="p-1 text-center">
            <p className="font-bold text-ink text-sm">Lokasi Anda Saat Ini</p>
            <p className="text-[11px] text-muted">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
            <span className="mt-1 inline-block rounded bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
              Akurasi: ~{Math.round(accuracy)}m
            </span>
          </div>
        </MapPopup>
      </MapMarker>
      <MapCircle
        center={[lat, lng]}
        radius={Math.max(20, Math.min(accuracy, 100))}
        pathOptions={{
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.12,
          weight: 1,
        }}
      />
    </>
  );
};
