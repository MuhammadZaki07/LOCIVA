/**
 * POI client for LOCIVA.
 *
 * - POIs        : served exclusively by the LOCIVA backend (GET /pois/bounds),
 *                 which reads from our own database (OpenStreetMap-derived data
 *                 imported from Geofabrik extracts + manually added POIs).
 * - Photon      : Autocomplete search (still external, see searchPlaces)
 * - Nominatim   : Geocoding / reverse geocoding (still external)
 *
 * No request for POIs ever leaves LOCIVA's own API.
 * These places are not automatically LOCIVA verified businesses.
 */

import api from "@/context/apiClient";

// ─── Categories ───────────────────────────────────────────────────────────────

export type CategoryId =
  | "food"
  | "cafe"
  | "school"
  | "campus"
  | "retail"
  | "service"
  | "transit"
  | "market"
  | "tourism"
  | "office";

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  color: string;
}

export const CATEGORIES: readonly CategoryMeta[] = [
  { id: "food", label: "Restaurants & Dining", color: "#e4572e" },
  { id: "cafe", label: "Cafes & Coffee", color: "#8c5a2b" },
  { id: "school", label: "Schools", color: "#2e86de" },
  { id: "campus", label: "Universities & Campuses", color: "#7c3aed" },
  { id: "retail", label: "Retail & Markets", color: "#0f9d58" },
  { id: "service", label: "Services & Healthcare", color: "#475569" },
  { id: "transit", label: "Transit & Stations", color: "#0ea5e9" },
  { id: "market", label: "Traditional Markets", color: "#b45309" },
  { id: "tourism", label: "Tourism & Attractions", color: "#06b6d4" },
  { id: "office", label: "Offices & Public Facilities", color: "#64748b" },
] as const;

export const CATEGORY_BY_ID: Record<CategoryId, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, CategoryMeta>;

// ─── Types ────────────────────────────────────────────────────────────────────

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
  isStale?: boolean;
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

/** Row shape returned by GET /pois/bounds */
interface DbPoi {
  id: string;
  external_id: string | null;
  name: string;
  category: string | null; // e.g. "amenity:restaurant" (OSM import) or free text (manual)
  address: string | null;
  latitude: number | string;
  longitude: number | string;
  opening_hours: string | null;
  website: string | null;
  source?: string | null;
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

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const PHOTON_URL = "https://photon.komoot.io/api";

// ─── Classification (OSM tag -> LOCIVA category) ──────────────────────────────

export function classify(tags: Record<string, string>): CategoryId | null {
  const amenity = tags.amenity;
  const shop = tags.shop;
  const publicTransport = tags.public_transport;
  const highway = tags.highway;
  const railway = tags.railway;
  const building = tags.building;
  const leisure = tags.leisure;
  const tourism = tags.tourism;
  const office = tags.office;
  const historic = tags.historic;
  const healthcare = tags.healthcare;

  // Cafes & Coffee
  if (
    amenity === "cafe" ||
    shop === "coffee" ||
    shop === "tea" ||
    tags.cuisine === "coffee_shop" ||
    tags.cuisine === "tea"
  ) {
    return "cafe";
  }

  // Food & Dining
  if (
    amenity === "restaurant" ||
    amenity === "fast_food" ||
    amenity === "food_court" ||
    amenity === "bar" ||
    amenity === "pub" ||
    amenity === "ice_cream" ||
    amenity === "canteen" ||
    amenity === "bistro" ||
    shop === "bakery" ||
    shop === "deli" ||
    shop === "pastry" ||
    shop === "confectionery"
  ) {
    return "food";
  }

  // Schools & Primary/Secondary Education
  if (
    amenity === "school" ||
    amenity === "kindergarten" ||
    amenity === "childcare" ||
    amenity === "music_school" ||
    amenity === "driving_school" ||
    building === "school" ||
    building === "kindergarten"
  ) {
    return "school";
  }

  // Universities, Colleges & Higher Education
  if (
    amenity === "university" ||
    amenity === "college" ||
    amenity === "research_institute" ||
    building === "university" ||
    building === "college"
  ) {
    return "campus";
  }

  // Traditional Markets & Bazaars
  if (amenity === "marketplace" || shop === "marketplace") {
    return "market";
  }

  // Retail & Stores
  if (
    shop === "convenience" ||
    shop === "supermarket" ||
    shop === "grocery" ||
    shop === "kiosk" ||
    shop === "greengrocer" ||
    shop === "mall" ||
    shop === "department_store" ||
    shop === "general" ||
    shop === "meat" ||
    shop === "seafood" ||
    shop === "dairy" ||
    shop === "clothes" ||
    shop === "fashion" ||
    shop === "shoes" ||
    shop === "electronics" ||
    shop === "mobile_phone" ||
    shop === "hardware" ||
    shop === "stationery" ||
    shop === "books" ||
    shop === "cosmetics" ||
    shop === "beauty" ||
    shop === "variety_store"
  ) {
    return "retail";
  }

  // Services, Finance, Healthcare & Personal Care
  if (
    amenity === "laundry" ||
    amenity === "barber" ||
    amenity === "bank" ||
    amenity === "atm" ||
    amenity === "pharmacy" ||
    amenity === "clinic" ||
    amenity === "hospital" ||
    amenity === "doctors" ||
    amenity === "dentist" ||
    amenity === "post_office" ||
    amenity === "police" ||
    shop === "hairdresser" ||
    shop === "laundry" ||
    shop === "dry_cleaning" ||
    shop === "tailor" ||
    shop === "chemist" ||
    shop === "optician" ||
    shop === "car_repair" ||
    shop === "motorcycle_repair" ||
    shop === "car_wash" ||
    shop === "copyshop" ||
    leisure === "fitness_centre" ||
    Boolean(healthcare) ||
    tourism === "hotel" ||
    tourism === "guest_house" ||
    tourism === "hostel" ||
    tourism === "motel"
  ) {
    return "service";
  }

  // Tourism, Attractions & Culture
  if (
    tourism === "attraction" ||
    tourism === "museum" ||
    tourism === "viewpoint" ||
    tourism === "gallery" ||
    tourism === "theme_park" ||
    tourism === "zoo" ||
    tourism === "aquarium" ||
    historic === "monument" ||
    historic === "memorial" ||
    historic === "castle"
  ) {
    return "tourism";
  }

  // Offices, Public Infrastructure & Community Facilities
  if (
    office ||
    amenity === "place_of_worship" ||
    amenity === "community_centre" ||
    amenity === "townhall" ||
    amenity === "library" ||
    amenity === "courthouse"
  ) {
    return "office";
  }

  // Transit, Stations & Commuter Infrastructure
  if (
    amenity === "bus_station" ||
    amenity === "ferry_terminal" ||
    amenity === "fuel" || // Gas stations are key traffic hubs in developing & urban markets
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

/**
 * Convert the DB `category` column into a LOCIVA CategoryId.
 *  - "amenity:restaurant"  (OSM import)  -> classified through OSM tag rules
 *  - "food" / "restaurant" (manual POIs) -> matched directly
 */
function categoryFromDb(raw: string | null): CategoryId | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  const idx = value.indexOf(":");
  if (idx > 0) {
    return classify({ [value.slice(0, idx)]: value.slice(idx + 1) });
  }

  if (value in CATEGORY_BY_ID) return value as CategoryId;
  return mapCompetitorCategory(value.toLowerCase());
}

function dbPoiToPlace(p: DbPoi, fetchedAt: number): Place | null {
  const category = categoryFromDb(p.category);
  if (!category) return null;

  const lat = Number(p.latitude);
  const lng = Number(p.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const typeMatch = p.external_id?.match(/^(node|way|relation)\//);

  return {
    id: p.external_id ?? p.id,
    osmType: (typeMatch?.[1] as Place["osmType"]) ?? "node",
    name: p.name,
    category,
    lat,
    lng,
    address: p.address ?? undefined,
    openingHours: p.opening_hours ?? undefined,
    website: p.website ?? undefined,
    source: "openstreetmap",
    fetchedAt,
  };
}

// ─── Spatial cache (client-side, in front of our own API) ────────────────────

/** Master store of every POI loaded so far, keyed by place id. */
const globalPoiStore = new Map<string, Place>();

interface CachedRegion {
  south: number;
  west: number;
  north: number;
  east: number;
  at: number;
}
const cachedRegions: CachedRegion[] = [];
const CACHE_MS = 5 * 60 * 1000; // 5-minute region cache TTL

/** Backend allows max 0.5° per side; stay safely below it. */
const MAX_SPAN_DEG = 0.45;
/** Rows requested per call (backend maximum is 1000). */
const REQUEST_LIMIT = 800;

interface InFlight {
  promise: Promise<Place[]>;
  signal?: AbortSignal;
}
const inFlightRequests = new Map<string, InFlight>();

function quantizeCoord(coord: number, step = 0.005): number {
  return Math.round(coord / step) * step;
}

function getPlacesInBoundsFromStore(
  south: number,
  west: number,
  north: number,
  east: number,
  markStale = false,
): Place[] {
  const result: Place[] = [];
  for (const p of globalPoiStore.values()) {
    if (p.lat >= south && p.lat <= north && p.lng >= west && p.lng <= east) {
      result.push(markStale ? { ...p, isStale: true } : p);
    }
  }
  return result;
}

function isRegionCovered(south: number, west: number, north: number, east: number): boolean {
  const now = Date.now();
  for (let i = cachedRegions.length - 1; i >= 0; i--) {
    if (now - cachedRegions[i].at > CACHE_MS) cachedRegions.splice(i, 1);
  }
  return cachedRegions.some(
    (r) =>
      r.south <= south + 0.001 &&
      r.north >= north - 0.001 &&
      r.west <= west + 0.001 &&
      r.east >= east - 0.001,
  );
}

// ─── Public POI API ───────────────────────────────────────────────────────────

/**
 * Fetch POIs within a radius (meters) around a point, from the LOCIVA backend.
 */
export async function fetchPlacesAround(
  lat: number,
  lng: number,
  radius: number,
  signal?: AbortSignal,
): Promise<Place[]> {
  const latSpan = radius / 111320;
  const lngSpan = radius / (111320 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));

  const places = await fetchPlacesInBounds(
    lat - latSpan,
    lng - lngSpan,
    lat + latSpan,
    lng + lngSpan,
    signal,
  );

  // The bbox is a square; trim to the actual circle.
  return places.filter((p) => distanceMeters(lat, lng, p.lat, p.lng) <= radius);
}

/**
 * Fetch POIs within a bounding box (viewport) from the LOCIVA backend.
 * Includes region caching, in-flight de-duplication and a stale-data fallback
 * when the backend is unreachable.
 */
export async function fetchPlacesInBounds(
  south: number,
  west: number,
  north: number,
  east: number,
  signal?: AbortSignal,
): Promise<Place[]> {
  // Normalize and order
  let minLat = Math.max(-90, Math.min(south, north));
  let maxLat = Math.min(90, Math.max(south, north));
  let minLng = Math.max(-180, Math.min(west, east));
  let maxLng = Math.min(180, Math.max(west, east));

  // Never ask the backend for an area it will reject: crop around the center.
  if (maxLat - minLat > MAX_SPAN_DEG) {
    const c = (minLat + maxLat) / 2;
    minLat = c - MAX_SPAN_DEG / 2;
    maxLat = c + MAX_SPAN_DEG / 2;
  }
  if (maxLng - minLng > MAX_SPAN_DEG) {
    const c = (minLng + maxLng) / 2;
    minLng = c - MAX_SPAN_DEG / 2;
    maxLng = c + MAX_SPAN_DEG / 2;
  }

  // 1. Served from the recent-region cache?
  if (isRegionCovered(minLat, minLng, maxLat, maxLng)) {
    return getPlacesInBoundsFromStore(minLat, minLng, maxLat, maxLng);
  }

  // 2. Same area already being fetched? (ignore requests that were aborted)
  const cacheKey = `bbox:${quantizeCoord(minLat).toFixed(3)},${quantizeCoord(minLng).toFixed(3)},${quantizeCoord(maxLat).toFixed(3)},${quantizeCoord(maxLng).toFixed(3)}`;
  const pending = inFlightRequests.get(cacheKey);
  if (pending && !pending.signal?.aborted) return pending.promise;

  // 3. Ask our own backend
  const promise = (async (): Promise<Place[]> => {
    try {
      const res = await api.get("/pois/bounds", {
        params: {
          south: minLat,
          west: minLng,
          north: maxLat,
          east: maxLng,
          limit: REQUEST_LIMIT,
        },
        signal,
      });

      const rows: DbPoi[] = Array.isArray(res.data?.data) ? res.data.data : [];
      const fetchedAt = Date.now();

      for (const row of rows) {
        const place = dbPoiToPlace(row, fetchedAt);
        if (place) globalPoiStore.set(place.id, place);
      }

      // If the backend hit the row limit the area is only partially loaded:
      // do NOT mark it as cached, so zooming in fetches the rest.
      if (rows.length < REQUEST_LIMIT) {
        cachedRegions.push({
          south: minLat,
          west: minLng,
          north: maxLat,
          east: maxLng,
          at: fetchedAt,
        });
      }

      return getPlacesInBoundsFromStore(minLat, minLng, maxLat, maxLng);
    } catch (err: any) {
      // MapPage relies on AbortError for cancelled requests
      if (signal?.aborted) throw new DOMException("Request cancelled", "AbortError");

      // 422 = area rejected by the backend: nothing to show
      if (err?.response?.status === 422) return [];

      // Backend unreachable / error: serve what we already have for this viewport
      const stale = getPlacesInBoundsFromStore(minLat, minLng, maxLat, maxLng, true);
      if (stale.length > 0) {
        if (import.meta.env.DEV) {
          console.info(`[LOCIVA POI] Backend unavailable. Serving ${stale.length} stale cached POIs.`);
        }
        return stale;
      }
      throw err;
    } finally {
      const current = inFlightRequests.get(cacheKey);
      if (current && current.promise === promise) inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, { promise, signal });
  return promise;
}

// ─── Search & geocoding (external, not POI data) ──────────────────────────────

/**
 * Global address/place search via Photon (autocomplete).
 */
export async function searchPlaces(
  query: string,
  bias?: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({ q, limit: "8" });
  if (bias) {
    params.set("lat", String(bias.lat));
    params.set("lon", String(bias.lng));
  }

  const res = await fetch(`${PHOTON_URL}?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const json = (await res.json()) as { features?: PhotonFeature[] };
  const features = json.features ?? [];

  return features
    .map((feature): GeocodeResult | null => {
      const [lng, lat] = feature.geometry?.coordinates ?? [];
      if (typeof lat !== "number" || typeof lng !== "number") return null;
      const p = feature.properties;
      const parts = [
        p.name,
        [p.housenumber, p.street].filter(Boolean).join(" "),
        p.district,
        p.city || p.locality,
        p.state,
        p.country,
      ].filter((part) => part && String(part).trim().length > 0);
      const label = [...new Set(parts)].join(", ") || "Unnamed Location";
      return {
        id: String(p.osm_id ?? `${lat},${lng}`),
        label,
        lat,
        lng,
        name: p.name,
        city: p.city || p.locality,
        street: p.street,
      };
    })
    .filter((item): item is GeocodeResult => item !== null);
}

/**
 * Fallback global Nominatim geocoding.
 */
export async function geocode(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const params = new URLSearchParams({ format: "jsonv2", q, limit: "6" });
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
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

// ─── Candidate validation ─────────────────────────────────────────────────────

export interface GeospatialValidationResult {
  isValid: boolean;
  isWaterOrOffshore: boolean;
  reason?: string;
  placeName?: string;
}

/**
 * Validate candidate coordinates using reverse geocoding.
 * Detects open sea, offshore waters, and uninhabited / unserviceable oceanic areas.
 */
export async function validateCandidateGeospatial(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<GeospatialValidationResult> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      zoom: "14",
      format: "jsonv2",
    });

    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
      signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return { isValid: true, isWaterOrOffshore: false };
    }

    const data = await res.json();

    if (data.error) {
      return {
        isValid: false,
        isWaterOrOffshore: true,
        reason: "Location is in open sea or offshore waters with no habitable terrestrial data.",
      };
    }

    const category = data.category || data.class;
    const type = data.type;
    const addresstype = data.addresstype;

    if (
      category === "water" ||
      (category === "natural" &&
        (type === "water" || type === "bay" || type === "sea" || type === "ocean")) ||
      addresstype === "sea" ||
      addresstype === "ocean" ||
      addresstype === "water"
    ) {
      return {
        isValid: false,
        isWaterOrOffshore: true,
        reason: "Candidate location is situated in the sea or open water.",
      };
    }

    const returnedLat = Number(data.lat);
    const returnedLng = Number(data.lon);
    if (!isNaN(returnedLat) && !isNaN(returnedLng)) {
      const snapDist = distanceMeters(lat, lng, returnedLat, returnedLng);
      const addr = data.address || {};
      const hasLocalAddress = Boolean(
        addr.road ||
          addr.suburb ||
          addr.neighbourhood ||
          addr.village ||
          addr.town ||
          addr.residential ||
          addr.city,
      );

      if (snapDist > 3500 && !hasLocalAddress) {
        return {
          isValid: false,
          isWaterOrOffshore: true,
          reason: "Candidate location snapped to a distant province with no nearby land settlements.",
        };
      }
    }

    return {
      isValid: true,
      isWaterOrOffshore: false,
      placeName: data.display_name || data.name,
    };
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;
    return { isValid: true, isWaterOrOffshore: false };
  }
}
