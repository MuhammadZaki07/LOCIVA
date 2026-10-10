/**
 * Klien data OpenStreetMap untuk LOCIVA.
 * - Overpass API : POI di sekitar titik / viewport
 * - Photon       : autocomplete pencarian (dirancang untuk suggestion)
 * - Nominatim    : fallback geocoding saat Photon gagal
 *
 * Basemap (OpenFreeMap / OSM tiles) TIDAK menyediakan Places API.
 * Tempat eksternal hanya berasal dari Overpass/Photon, dan tidak
 * otomatis disimpan sebagai usaha internal LOCIVA.
 */

export type CategoryId =
  | "food"
  | "cafe"
  | "school"
  | "campus"
  | "retail"
  | "service"
  | "transit"
  | "market";

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  color: string;
}

export const CATEGORIES: readonly CategoryMeta[] = [
  { id: "food", label: "Restoran & warung", color: "#e4572e" },
  { id: "cafe", label: "Cafe", color: "#8c5a2b" },
  { id: "school", label: "Sekolah", color: "#2e86de" },
  { id: "campus", label: "Kampus", color: "#7c3aed" },
  { id: "retail", label: "Minimarket", color: "#0f9d58" },
  { id: "service", label: "Layanan", color: "#475569" },
  { id: "transit", label: "Transit", color: "#0ea5e9" },
  { id: "market", label: "Pasar", color: "#b45309" },
] as const;

export const CATEGORY_BY_ID: Record<CategoryId, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, CategoryMeta>;

export interface Place {
  id: string;
  osmType: "node" | "way" | "relation";
  name: string;
  category: CategoryId;
  lat: number;
  lng: number;
  address?: string;
  openingHours?: string;
  website?: string;
  source: "openstreetmap";
  fetchedAt: number;
}

export interface GeocodeResult {
  id: string;
  label: string;
  lat: number;
  lng: number;
  name?: string;
  city?: string;
  street?: string;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

interface NominatimItem {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface PhotonFeature {
  properties: {
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    locality?: string;
    district?: string;
    state?: string;
    country?: string;
  };
  geometry: { coordinates: [number, number] };
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
] as const;

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const PHOTON_URL = "https://photon.komoot.io/api";

function classify(tags: Record<string, string>): CategoryId | null {
  const amenity = tags.amenity;
  const shop = tags.shop;
  const publicTransport = tags.public_transport;
  const highway = tags.highway;
  const railway = tags.railway;
  const building = tags.building;

  if (amenity === "cafe" || shop === "coffee" || tags.cuisine === "coffee_shop") return "cafe";
  if (
    amenity === "restaurant" ||
    amenity === "fast_food" ||
    amenity === "food_court" ||
    amenity === "bar" ||
    amenity === "pub" ||
    amenity === "ice_cream" ||
    amenity === "canteen"
  ) {
    return "food";
  }
  if (
    amenity === "school" ||
    amenity === "kindergarten" ||
    building === "school" ||
    building === "kindergarten"
  ) {
    return "school";
  }
  if (
    amenity === "university" ||
    amenity === "college" ||
    building === "university" ||
    building === "college"
  ) {
    return "campus";
  }
  if (
    shop === "convenience" ||
    shop === "supermarket" ||
    shop === "grocery" ||
    shop === "bakery" ||
    shop === "kiosk" ||
    shop === "greengrocer" ||
    shop === "mall" ||
    shop === "department_store" ||
    shop === "general" ||
    shop === "meat" ||
    shop === "seafood" ||
    shop === "dairy"
  ) {
    return "retail";
  }
  if (amenity === "marketplace" || shop === "marketplace") return "market";
  if (
    amenity === "laundry" ||
    amenity === "barber" ||
    shop === "hairdresser" ||
    shop === "laundry" ||
    shop === "tailor" ||
    amenity === "bank" ||
    amenity === "pharmacy"
  ) {
    return "service";
  }
  if (
    amenity === "bus_station" ||
    amenity === "ferry_terminal" ||
    publicTransport === "station" ||
    publicTransport === "stop_position" ||
    publicTransport === "platform" ||
    highway === "bus_stop" ||
    railway === "station" ||
    railway === "halt" ||
    railway === "subway_entrance"
  ) {
    return "transit";
  }
  return null;
}

function buildAddress(tags: Record<string, string>): string | undefined {
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const parts = [street, tags["addr:suburb"] ?? tags["addr:village"], tags["addr:city"]].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

function aroundQuery(lat: number, lng: number, radius: number): string {
  const around = `(around:${Math.round(radius)},${lat},${lng})`;
  return `[out:json][timeout:25];
(
  nwr["amenity"~"^(restaurant|fast_food|food_court|cafe|bar|pub|ice_cream|canteen|school|kindergarten|university|college|marketplace|bus_station|laundry|bank|pharmacy)$"]${around};
  nwr["shop"~"^(convenience|supermarket|grocery|bakery|coffee|kiosk|greengrocer|hairdresser|laundry|mall|department_store|general|meat|seafood|dairy|tailor)$"]${around};
  nwr["highway"="bus_stop"]${around};
  nwr["public_transport"~"^(station|stop_position|platform)$"]${around};
  nwr["railway"~"^(station|halt|subway_entrance)$"]${around};
  nwr["building"~"^(university|college|school)$"]${around};
);
out center tags 400;`;
}

const placeCache = new Map<string, { at: number; data: Place[] }>();
const CACHE_MS = 5 * 60 * 1000;

async function postOverpass(body: URLSearchParams, signal?: AbortSignal): Promise<Place[]> {
  let lastError: unknown = new Error("Overpass API tidak dapat dihubungi dari semua cermin server.");

  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (signal?.aborted) {
      throw new DOMException("Permintaan dibatalkan", "AbortError");
    }

    // Set an individual timeout of 9 seconds per endpoint so slow/hanging mirrors don't block
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const onParentAbort = () => controller.abort();
    if (signal) {
      signal.addEventListener("abort", onParentAbort, { once: true });
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener("abort", onParentAbort);
      }

      if (!res.ok) {
        throw new Error(`Overpass ${endpoint} responded with HTTP ${res.status}`);
      }

      const json = (await res.json()) as OverpassResponse;
      if (!json || !Array.isArray(json.elements)) {
        return [];
      }

      return parseElements(json.elements);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener("abort", onParentAbort);
      }

      // If user aborted the parent signal, rethrow AbortError immediately
      if (signal?.aborted) {
        throw new DOMException("Permintaan dibatalkan", "AbortError");
      }

      lastError = err;
      // Continue to next mirror endpoint
    }
  }

  throw lastError;
}

/** Ambil POI bernama dalam radius (meter) dari sebuah titik. */
export async function fetchPlacesAround(
  lat: number,
  lng: number,
  radius: number,
  signal?: AbortSignal,
): Promise<Place[]> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${Math.round(radius)}`;
  const hit = placeCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const body = new URLSearchParams({ data: aroundQuery(lat, lng, radius) });
  const data = await postOverpass(body, signal);
  placeCache.set(key, { at: Date.now(), data });
  return data;
}

function parseElements(elements: OverpassElement[]): Place[] {
  const out: Place[] = [];
  const seen = new Set<string>();
  const fetchedAt = Date.now();
  for (const el of elements) {
    const tags = el.tags;
    if (!tags?.name) continue;
    const category = classify(tags);
    if (!category) continue;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat === undefined || lng === undefined) continue;
    const id = `${el.type}/${el.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      osmType: el.type,
      name: tags.name,
      category,
      lat,
      lng,
      address: buildAddress(tags),
      openingHours: tags.opening_hours,
      website: tags.website ?? tags["contact:website"],
      source: "openstreetmap",
      fetchedAt,
    });
  }
  return out;
}

/** Cari alamat/tempat via Photon (autocomplete). */
export async function searchPlaces(
  query: string,
  bias?: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    q,
    lang: "id",
    limit: "8",
  });
  if (bias) {
    params.set("lat", String(bias.lat));
    params.set("lon", String(bias.lng));
  }

  const res = await fetch(`${PHOTON_URL}?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const json = (await res.json()) as { features?: PhotonFeature[] };
  const features = json.features ?? [];

  return features
    .map((feature) => {
      const [lng, lat] = feature.geometry?.coordinates ?? [];
      if (typeof lat !== "number" || typeof lng !== "number") return null;
      const p = feature.properties;
      const parts = [
        p.name,
        [p.housenumber, p.street].filter(Boolean).join(" "),
        p.district,
        p.city || p.locality,
        p.state,
      ].filter((part) => part && String(part).trim().length > 0);
      const label = [...new Set(parts)].join(", ") || "Tempat tanpa nama";
      return {
        id: String(p.osm_id ?? `${lat},${lng}`),
        label,
        lat,
        lng,
        name: p.name,
        city: p.city || p.locality,
        street: p.street,
      } satisfies GeocodeResult;
    })
    .filter((item): item is GeocodeResult => item !== null);
}

/** Fallback Nominatim. Panggil hanya saat Photon gagal atau saat Enter tanpa suggestion. */
export async function geocode(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const params = new URLSearchParams({
    format: "jsonv2",
    q,
    countrycodes: "id",
    limit: "6",
    "accept-language": "id",
  });
  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const items = (await res.json()) as NominatimItem[];
  return items.map((i) => ({
    id: String(i.place_id),
    label: i.display_name,
    lat: Number(i.lat),
    lng: Number(i.lon),
  }));
}

export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function mapCompetitorCategory(category: string): CategoryId | null {
  const table: Record<string, CategoryId> = {
    food: "food",
    restaurant: "food",
    fast_food: "food",
    food_court: "food",
    cafe: "cafe",
    coffee: "cafe",
    school: "school",
    university: "campus",
    college: "campus",
    campus: "campus",
    retail: "retail",
    convenience: "retail",
    supermarket: "retail",
    grocery: "retail",
    service: "service",
    laundry: "service",
    barbershop: "service",
    hairdresser: "service",
    transit: "transit",
    bus_station: "transit",
    market: "market",
    marketplace: "market",
  };
  return table[category] ?? null;
}
