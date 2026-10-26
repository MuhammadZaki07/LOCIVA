import React from "react";
import {
  MapPolyline,
  MapMarker,
  MapPopup,
} from "@/components/ui/shadcn-ui/map";
import type { RouteWaypoint, RouteCalculationResult } from "@/lib/routing";
import type { SavedRouteItem } from "./VendorRoutePanel";
import { MapPin, Navigation, Clock } from "lucide-react";
import RouteDirectionArrows from "./RouteDirectionArrows";

interface RouteLayerProps {
  activeWaypoints: RouteWaypoint[];
  currentCalculation: RouteCalculationResult | null;
  publicRoutes?: SavedRouteItem[];
  showPublicRoutes?: boolean;
}

const PUBLIC_ROUTE_COLORS = [
  "#2563EB", // Biru
  "#DC2626", // Merah
  "#9333EA", // Ungu
  "#D97706", // Oranye
  "#0891B2", // Cyan
  "#DB2777", // Pink
  "#4D7C0F", // Hijau
  "#4F46E5", // Indigo
];

const getPublicRouteColor = (routeId: string): string => {
  let hash = 0;

  for (let i = 0; i < routeId.length; i++) {
    hash = (hash * 31 + routeId.charCodeAt(i)) | 0;
  }

  return PUBLIC_ROUTE_COLORS[Math.abs(hash) % PUBLIC_ROUTE_COLORS.length];
};

export const RouteLayer: React.FC<RouteLayerProps> = ({
  activeWaypoints,
  currentCalculation,
  publicRoutes = [],
  showPublicRoutes = true,
}) => {
  const [focusedPublicRouteId, setFocusedPublicRouteId] = React.useState<
    string | null
  >(null);
  const eligiblePublicRoutes = publicRoutes.filter(
    (route) => route.status?.trim().toLowerCase() === "active",
  );

  const visiblePublicRoutes = focusedPublicRouteId
    ? eligiblePublicRoutes.filter((route) => route.id === focusedPublicRouteId)
    : eligiblePublicRoutes;

  const startPointCounts = new Map<string, number>();

  const publicRoutesWithMarkerOffset = visiblePublicRoutes.map((route) => {
    const start = route.waypoints?.[0];

    if (!start) {
      return { route, markerOffset: 0 };
    }

    const key = `${start.lat.toFixed(6)},${start.lng.toFixed(6)}`;
    const markerOffset = startPointCounts.get(key) ?? 0;

    startPointCounts.set(key, markerOffset + 1);

    return { route, markerOffset };
  });
  return (
    <>
      {/* Active Calculated Route with White Outline */}
      {currentCalculation && currentCalculation.coordinates.length > 1 && (
        <>
          {/* White outline */}
          <MapPolyline
            positions={currentCalculation.coordinates}
            pathOptions={{
              color: "#ffffff",
              weight: 12,
              opacity: 1,
              lineCap: "round",
              lineJoin: "round",
              interactive: false,
            }}
          />

          {/* Main route */}
          <MapPolyline
            positions={currentCalculation.coordinates}
            pathOptions={{
              color: "#4338ca",
              weight: 5,
              opacity: 1,
              lineCap: "round",
              lineJoin: "round",
            }}
          />

          <RouteDirectionArrows
            positions={currentCalculation.coordinates}
            color="#4338ca"
            spacing={100}
          />
        </>
      )}

      {/* 2. Active Route Waypoint Markers */}
      {activeWaypoints.map((wp, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === activeWaypoints.length - 1;

        const iconNode = (
          <div
            style={{
              backgroundColor: isFirst
                ? "#059669"
                : isLast
                  ? "#4f46e5"
                  : "#1e293b",
              width: isFirst || isLast ? "30px" : "24px",
              height: isFirst || isLast ? "30px" : "24px",
              borderRadius: "50%",
              border: "2.5px solid white",
              boxShadow: "0 3px 10px rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 700,
              fontSize: isFirst || isLast ? "12px" : "10px",
              cursor: "pointer",
            }}
            title={
              isFirst
                ? "Titik Awal (Origin)"
                : isLast
                  ? "Titik Tujuan (Destination)"
                  : `Titik Singgah ${idx + 1}`
            }
          >
            {isFirst ? "A" : isLast ? "B" : idx + 1}
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
            <MapPopup className="lociva-popup-wrapper">
              <div className="p-3 space-y-1.5 text-left max-w-xs">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                  <span
                    className="size-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{
                      backgroundColor: isFirst
                        ? "#10b981"
                        : isLast
                          ? "#6366f1"
                          : "#1e293b",
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-bold text-ink text-xs">
                    {isFirst
                      ? "Route Origin"
                      : isLast
                        ? "Route Destination"
                        : "Waypoint Stop"}
                  </span>
                </div>

                <p className="font-semibold text-xs text-ink">
                  {wp.name || `Stop ${idx + 1}`}
                </p>
                <p className="text-[10px] text-muted flex items-center gap-1">
                  <MapPin size={10} />
                  {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                </p>

                {wp.stop_duration ? (
                  <p className="text-[11px] font-medium text-primary flex items-center gap-1">
                    <Clock size={11} />
                    Planned Stop: {wp.stop_duration} mins
                  </p>
                ) : null}
              </div>
            </MapPopup>
          </MapMarker>
        );
      })}

      {/* 3. Public Shared Routes from Other Users */}
      {showPublicRoutes &&
        publicRoutesWithMarkerOffset.map(({ route, markerOffset }) => {
          if (!route.waypoints || route.waypoints.length < 2) {
            return null;
          }

          const roadCoordinates = route.route_coordinates;

          // Lewati rute lama yang belum memiliki geometri jalan.
          if (!Array.isArray(roadCoordinates) || roadCoordinates.length < 2) {
            return null;
          }

          const polyCoords: [number, number][] = roadCoordinates;
          const routeColor = getPublicRouteColor(route.id);

          return (
            <React.Fragment key={`pub-route-${route.id}`}>
              {/* White outline */}
              <MapPolyline
                positions={polyCoords}
                pathOptions={{
                  color: "#ffffff",
                  weight: 10,
                  opacity: 1,
                  lineCap: "round",
                  lineJoin: "round",
                  interactive: false,
                }}
              />

              {/* Main route */}
              <MapPolyline
                positions={polyCoords}
                pathOptions={{
                  color: routeColor,
                  weight: 5,
                  opacity: 1,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
              <RouteDirectionArrows
                positions={polyCoords}
                color={routeColor}
                spacing={100}
              />

              {route.waypoints[0] && (
                <MapMarker
                  position={[route.waypoints[0].lat, route.waypoints[0].lng]}
                  icon={
                    <div
                      className="p-1 rounded-md text-white shadow-md border border-white text-[10px] flex items-center gap-1"
                      style={{
                        backgroundColor: routeColor,
                        transform: `translateX(${markerOffset * 0}px)`,
                      }}
                    >
                      <Navigation size={10} />
                      <span className="truncate max-w-[80px]">
                        {route.name}
                      </span>
                    </div>
                  }
                  iconAnchor={[20 - markerOffset * 24, 10]}
                >
                  <MapPopup className="lociva-popup-wrapper">
                    <div className="p-3 text-left space-y-1.5">
                      <span
                        className="text-[9px] uppercase font-bold text-white px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: routeColor }}
                      >
                        Public Shared Route
                      </span>

                      <h4 className="font-bold text-xs text-ink">
                        {route.name}
                      </h4>

                      {route.notes && (
                        <p className="text-[11px] text-muted">{route.notes}</p>
                      )}

                      <p className="text-[10.5px] text-slate-500">
                        {route.waypoints.length} titik ·{" "}
                        {route.distance ?? "Estimasi"} km
                      </p>
                      <div className="pt-2 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();

                            setFocusedPublicRouteId((currentId) =>
                              currentId === route.id ? null : route.id,
                            );
                          }}
                          className="w-full rounded-md px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                          style={{
                            backgroundColor: getPublicRouteColor(route.id),
                          }}
                        >
                          {focusedPublicRouteId === route.id
                            ? "Tampilkan Semua Rute"
                            : "Fokus Rute"}
                        </button>
                      </div>
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
