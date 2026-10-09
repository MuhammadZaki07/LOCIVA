/**
 * Open Source Routing Machine (OSRM) Client untuk LOCIVA Mobile Vendor Routing.
 * Menghitung rute jalan nyata berdasarkan jaringan jalan OpenStreetMap.
 */

export interface RouteWaypoint {
  lat: number;
  lng: number;
  name?: string;
  stop_duration?: number; // menit
}

export interface RouteCalculationResult {
  coordinates: [number, number][]; // [lat, lng] array untuk Leaflet Polyline
  distanceKm: number;
  durationMinutes: number;
  summary?: string;
}

/**
 * Menghitung rute jalan raya antar waypoint menggunakan OSRM API.
 */
export async function calculateRoute(
  waypoints: RouteWaypoint[],
  signal?: AbortSignal
): Promise<RouteCalculationResult> {
  if (waypoints.length < 2) {
    throw new Error("Dibutuhkan minimal 2 titik untuk menghitung rute.");
  }

  // OSRM format: lng,lat;lng,lat...
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
    // GeoJSON coordinates are [lng, lat], Leaflet expects [lat, lng]
    const leafletCoords: [number, number][] = route.geometry.coordinates.map(
      (c: [number, number]) => [c[1], c[0]]
    );

    const distanceKm = Number((route.distance / 1000).toFixed(2));
    const durationMinutes = Math.round(route.duration / 60);

    return {
      coordinates: leafletCoords,
      distanceKm,
      durationMinutes,
      summary: route.legs ? `${route.legs.length} segmen jalan` : undefined,
    };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    if (err instanceof Error) throw err;
    throw new Error("Rute jalan tidak dapat dihitung. Server OSRM tidak tersedia.");
  }
}
