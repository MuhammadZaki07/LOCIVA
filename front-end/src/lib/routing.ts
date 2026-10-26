/**
 * Geospatial Routing Client untuk LOCIVA Mobile Vendor Routing.
 * Menghitung rute jalan nyata berdasarkan jaringan jalan OpenStreetMap & OSRMRoute.
 */

import api from "@/context/apiClient";

export interface RouteWaypoint {
  lat: number;
  lng: number;
  name?: string;
  stop_duration?: number; // menit
}

export interface RouteStep {
  name: string;
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteCalculationResult {
  coordinates: [number, number][]; // [lat, lng] array untuk Leaflet Polyline
  distanceKm: number;
  durationMinutes: number;
  summary?: string;
  provider?: string;
  legs?: {
    distanceMeters: number;
    durationMinutes: number;
    summary?: string;
  }[];
}

/**
 * Menghitung rute jalan raya antar waypoint.
 * Mencoba backend OSRMRoute proxy terlebih dahulu (dengan cache dan kunci aman),
 * kemudian fallback ke public OSRM router.
 */
export async function calculateRoute(
  waypoints: RouteWaypoint[],
  signal?: AbortSignal,
): Promise<RouteCalculationResult> {
  if (waypoints.length < 2) {
    throw new Error("Dibutuhkan minimal 2 titik untuk menghitung rute.");
  }

  // Coordinates array for backend: [[lng, lat], [lng, lat], ...]
  const coordsForBackend = waypoints.map((wp) => [
    Number(wp.lng.toFixed(6)),
    Number(wp.lat.toFixed(6)),
  ]);

  // 1. Try backend API proxy with OSRMRoute / cache
  try {
    const res = await api.post(
      "/routing/calculate",
      {
        coordinates: coordsForBackend,
        profile: "driving",
      },
      { signal },
    );

    if (
      res.data?.success &&
      Array.isArray(res.data?.data?.coordinates) &&
      res.data.data.coordinates.length > waypoints.length
    ) {
      const data = res.data.data;
      const leafletCoords: [number, number][] = data.coordinates.map(
        (c: [number, number]) => [c[1], c[0]],
      );

      const legs = (data.legs || []).map((leg: any) => ({
        distanceMeters: leg.distance || 0,
        durationMinutes: Math.round((leg.duration || 0) / 60),
        summary: leg.summary || undefined,
      }));

      return {
        coordinates: leafletCoords,
        distanceKm: data.distance_km,
        durationMinutes: data.duration_minutes,
        provider: data.provider || "osrm",
        summary:
          legs.length > 0 ? `${legs.length} segmen perjalanan` : undefined,
        legs,
      };
    }
  } catch (backendErr: any) {
    if (
      backendErr?.name === "AbortError" ||
      backendErr?.name === "CanceledError"
    ) {
      throw backendErr;
    }
    // Fallback to direct client-side OSRM if backend is unreachable
  }

  // 2. Direct client-side OSRM fallback
  const coordsParam = waypoints
    .map((wp) => `${wp.lng.toFixed(6)},${wp.lat.toFixed(6)}`)
    .join(";");

  const url = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson&steps=false`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error(`Routing server status ${res.status}`);
    }

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("Rute tidak dapat ditemukan antar titik yang dipilih.");
    }

    const route = data.routes[0];
    const leafletCoords: [number, number][] = route.geometry.coordinates.map(
      (c: [number, number]) => [c[1], c[0]],
    );

    const distanceKm = Number((route.distance / 1000).toFixed(2));
    const durationMinutes = Math.round(route.duration / 60);

    return {
      coordinates: leafletCoords,
      distanceKm,
      durationMinutes,
      provider: "osrm_client_fallback",
      summary: route.legs ? `${route.legs.length} segmen jalan` : undefined,
    };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    if (err instanceof Error) throw err;
    throw new Error(
      "Rute jalan tidak dapat dihitung. Server routing tidak tersedia.",
    );
  }
}
