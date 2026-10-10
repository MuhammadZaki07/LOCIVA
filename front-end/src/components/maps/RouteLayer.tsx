import React from "react";
import { MapPolyline, MapMarker, MapPopup } from "@/components/ui/shadcn-ui/map";
import type { RouteWaypoint, RouteCalculationResult } from "@/lib/routing";
import type { SavedRouteItem } from "./VendorRoutePanel";
import { MapPin, Navigation, Clock } from "lucide-react";

interface RouteLayerProps {
  activeWaypoints: RouteWaypoint[];
  currentCalculation: RouteCalculationResult | null;
  publicRoutes?: SavedRouteItem[];
  showPublicRoutes?: boolean;
}

export const RouteLayer: React.FC<RouteLayerProps> = ({
  activeWaypoints,
  currentCalculation,
  publicRoutes = [],
  showPublicRoutes = true,
}) => {
  return (
    <>
      {/* 1. Active Calculated Route Polyline */}
      {currentCalculation && currentCalculation.coordinates.length > 1 && (
        <MapPolyline
          positions={currentCalculation.coordinates}
          pathOptions={{
            color: "#4f46e5",
            weight: 5,
            opacity: 0.88,
            lineJoin: "round",
            lineCap: "round",
          }}
        />
      )}

      {/* 2. Active Route Waypoint Markers */}
      {activeWaypoints.map((wp, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === activeWaypoints.length - 1;

        const iconNode = (
          <div
            style={{
              backgroundColor: isFirst ? "#10b981" : isLast ? "#6366f1" : "#1e293b",
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              border: "2px solid white",
              boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            {idx + 1}
          </div>
        );

        return (
          <MapMarker
            key={`wp-${idx}`}
            position={[wp.lat, wp.lng]}
            icon={iconNode}
            iconAnchor={[13, 13]}
            popupAnchor={[0, -14]}
          >
            <MapPopup>
              <div className="p-1 space-y-1 text-left max-w-xs">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1">
                  <span
                    className="size-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{
                      backgroundColor: isFirst ? "#10b981" : isLast ? "#6366f1" : "#1e293b",
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-bold text-ink text-xs">
                    {isFirst ? "Titik Awal Rute" : isLast ? "Titik Akhir / Tujuan" : "Titik Singgah"}
                  </span>
                </div>

                <p className="font-semibold text-xs text-ink">{wp.name || `Pemberhentian ${idx + 1}`}</p>
                <p className="text-[10px] text-muted flex items-center gap-1">
                  <MapPin size={10} />
                  {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                </p>

                {wp.stop_duration ? (
                  <p className="text-[11px] font-medium text-primary flex items-center gap-1">
                    <Clock size={11} />
                    Rencana Mangkal: {wp.stop_duration} menit
                  </p>
                ) : null}
              </div>
            </MapPopup>
          </MapMarker>
        );
      })}

      {/* 3. Public Shared Routes from Other Users */}
      {showPublicRoutes &&
        publicRoutes.map((route) => {
          if (!route.waypoints || route.waypoints.length < 2) return null;
          const polyCoords: [number, number][] = route.waypoints.map((w) => [w.lat, w.lng]);

          return (
            <React.Fragment key={`pub-route-${route.id}`}>
              <MapPolyline
                positions={polyCoords}
                pathOptions={{
                  color: "#059669",
                  weight: 3.5,
                  opacity: 0.7,
                  dashArray: "6, 6",
                }}
              />
              {/* Midpoint marker or start point marker */}
              {route.waypoints[0] && (
                <MapMarker
                  position={[route.waypoints[0].lat, route.waypoints[0].lng]}
                  icon={
                    <div className="p-1 rounded-md bg-emerald-700 text-white shadow-md border border-white text-[10px] flex items-center gap-1">
                      <Navigation size={10} />
                      <span className="truncate max-w-[80px]">{route.name}</span>
                    </div>
                  }
                  iconAnchor={[20, 10]}
                >
                  <MapPopup>
                    <div className="p-1 text-left space-y-1">
                      <span className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Rute Publik Pengguna Lain
                      </span>
                      <h4 className="font-bold text-xs text-ink">{route.name}</h4>
                      {route.notes && <p className="text-[11px] text-muted">{route.notes}</p>}
                      <p className="text-[10.5px] text-slate-500">
                        {route.waypoints.length} titik singgah · {route.distance || "Estimasi"} km
                      </p>
                    </div>
                  </MapPopup>
                </MapMarker>
              )}
            </React.Fragment>
          );
        })}
    </>
  );
};
