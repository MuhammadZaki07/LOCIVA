/**
 * OpenStreetMap Client for LOCIVA.
 * - Overpass API : Viewport and candidate POI discovery across all regions
 * - Photon       : Autocomplete search (global)
 * - Nominatim    : Geocoding fallback
 *
 * External places are sourced from OpenStreetMap / Overpass.
 * They are not automatically persisted as LOCIVA verified businesses.
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
  { id: "food", label: "Restaurants & Dining", color: "#e4572e" },
  { id: "cafe", label: "Cafes & Coffee", color: "#8c5a2b" },
  { id: "school", label: "Schools", color: "#2e86de" },
  { id: "campus", label: "Universities & Campuses", color: "#7c3aed" },
  { id: "retail", label: "Retail & Markets", color: "#0f9d58" },
  { id: "service", label: "Services & Healthcare", color: "#475569" },
  { id: "transit", label: "Transit & Stations", color: "#0ea5e9" },
  { id: "market", label: "Traditional Markets", color: "#b45309" },
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

// Resilient mirror list for Overpass API
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
  const leisure = tags.leisure;
  const tourism = tags.tourism;

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
    tourism === "hotel" ||
    tourism === "guest_house" ||
    tourism === "hostel"
  ) {
    return "service";
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

function buildAddress(tags: Record<string, string>): string | undefined {
  if (tags["addr:full"]) return tags["addr:full"];
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const parts = [
    street,
    tags["addr:suburb"] ?? tags["addr:village"] ?? tags["addr:place"],
    tags["addr:city"] ?? tags["addr:province"],
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

function resolveName(tags: Record<string, string>): string | null {
  return (
    tags.name ||
    tags["name:en"] ||
    tags["name:id"] ||
    tags.brand ||
    tags.operator ||
    tags["addr:housename"] ||
    null
  );
}

function aroundQuery(lat: number, lng: number, radius: number): string {
  const around = `(around:${Math.round(radius)},${lat.toFixed(5)},${lng.toFixed(5)})`;
  return `[out:json][timeout:25];
(
  nwr["amenity"~"^(restaurant|fast_food|food_court|cafe|bar|pub|ice_cream|canteen|bistro|school|kindergarten|childcare|university|college|marketplace|bus_station|ferry_terminal|fuel|laundry|bank|atm|pharmacy|clinic|hospital|post_office)$"]${around};
  nwr["shop"~"^(convenience|supermarket|grocery|bakery|coffee|tea|kiosk|greengrocer|hairdresser|laundry|dry_cleaning|mall|department_store|general|meat|seafood|dairy|tailor|clothes|fashion|shoes|electronics|mobile_phone|hardware|stationery|books|beauty|cosmetics|chemist|optician|car_repair|motorcycle_repair)$"]${around};
  nwr["highway"="bus_stop"]${around};
  nwr["public_transport"~"^(station|stop_position|platform)$"]${around};
  nwr["railway"~"^(station|halt|subway_entrance)$"]${around};
  nwr["building"~"^(university|college|school)$"]${around};
  nwr["tourism"~"^(hotel|guest_house|hostel)$"]${around};
  nwr["leisure"~"^(fitness_centre|sports_centre)$"]${around};
);
out center tags 500;`;
}

// Bounding box query for viewport loading
export function bboxQuery(south: number, west: number, north: number, east: number): string {
  const bbox = `${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)}`;
  return `[out:json][timeout:25];
(
  nwr["amenity"~"^(restaurant|fast_food|food_court|cafe|bar|pub|ice_cream|canteen|bistro|school|kindergarten|childcare|university|college|marketplace|bus_station|ferry_terminal|fuel|laundry|bank|atm|pharmacy|clinic|hospital|post_office)$"](${bbox});
  nwr["shop"~"^(convenience|supermarket|grocery|bakery|coffee|tea|kiosk|greengrocer|hairdresser|laundry|dry_cleaning|mall|department_store|general|meat|seafood|dairy|tailor|clothes|fashion|shoes|electronics|mobile_phone|hardware|stationery|books|beauty|cosmetics|chemist|optician|car_repair|motorcycle_repair)$"](${bbox});
  nwr["highway"="bus_stop"](${bbox});
  nwr["public_transport"~"^(station|stop_position|platform)$"](${bbox});
  nwr["railway"~"^(station|halt|subway_entrance)$"](${bbox});
  nwr["building"~"^(university|college|school)$"](${bbox});
  nwr["tourism"~"^(hotel|guest_house|hostel)$"](${bbox});
  nwr["leisure"~"^(fitness_centre|sports_centre)$"](${bbox});
);
out center tags 500;`;
}

// Spatial cache with 5-minute TTL
const placeCache = new Map<string, { at: number; data: Place[] }>();
const CACHE_MS = 5 * 60 * 1000;

// In-flight request deduplication map to avoid simultaneous duplicate queries
const inFlightRequests = new Map<string, Promise<Place[]>>();

function quantizeCoord(coord: number, step = 0.005): number {
  return Math.round(coord / step) * step;
}

/**
 * Execute Overpass query with timeout, bounded retry, failover across mirrors,
 * and graceful fallback to stale cache when all mirrors are unavailable.
 */
async function postOverpass(body: URLSearchParams, signal?: AbortSignal): Promise<Place[]> {
  let lastError: unknown = new Error("Overpass API mirrors are currently unreachable. Retrying with cached data.");
  let attempt = 0;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (signal?.aborted) {
      throw new DOMException("Request cancelled", "AbortError");
    }

    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8500);

    const onParentAbort = () => controller.abort();
    if (signal) {
      signal.addEventListener("abort", onParentAbort, { once: true });
    }

    try {
      // Optional brief backoff for second and third mirrors
      if (attempt > 1) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt - 1)));
      }

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

      // Retry on transient rate limit or server busy
      if (res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504) {
        console.warn(`[LOCIVA Overpass] Mirror ${endpoint} returned ${res.status}. Failing over to next mirror...`);
        lastError = new Error(`Overpass status ${res.status}`);
        continue;
      }

      if (!res.ok) {
        lastError = new Error(`Overpass HTTP ${res.status}`);
        continue;
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

      if (signal?.aborted) {
        throw new DOMException("Request cancelled", "AbortError");
      }

      lastError = err;
      console.warn(`[LOCIVA Overpass] Request to ${endpoint} failed:`, (err as Error)?.message || err);
      // Continue to next mirror
    }
  }

  throw lastError;
}

/**
 * Fetch named POIs within a radius (meters) around a geographic point.
 * Incorporates spatial caching, in-flight deduplication, and stale data preservation.
 */
export async function fetchPlacesAround(
  lat: number,
  lng: number,
  radius: number,
  signal?: AbortSignal,
): Promise<Place[]> {
  // Quantize coordinates so minor map vibrations/pans reuse cache
  const qLat = quantizeCoord(lat).toFixed(3);
  const qLng = quantizeCoord(lng).toFixed(3);
  const qRad = Math.round(radius / 250) * 250;
  const cacheKey = `${qLat},${qLng},${qRad}`;

  const cached = placeCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.data;
  }

  // Deduplicate in-flight requests
  const pending = inFlightRequests.get(cacheKey);
  if (pending) {
    return pending;
  }

  const queryPromise = (async () => {
    try {
      const body = new URLSearchParams({ data: aroundQuery(lat, lng, radius) });
      const data = await postOverpass(body, signal);
      placeCache.set(cacheKey, { at: Date.now(), data });
      return data;
    } catch (err: unknown) {
      // If parent was aborted, rethrow
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }

      // If network/mirror failure occurred but we have an older cache entry, preserve it with isStale flag
      if (cached && cached.data.length > 0) {
        console.info("[LOCIVA Overpass] API unavailable. Serving stale cached places.");
        return cached.data.map((p) => ({ ...p, isStale: true }));
      }

      throw err;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, queryPromise);
  return queryPromise;
}

/**
 * Fetch POIs within a geographic bounding box (viewport).
 */
export async function fetchPlacesInBounds(
  south: number,
  west: number,
  north: number,
  east: number,
  signal?: AbortSignal,
): Promise<Place[]> {
  const centerLat = (south + north) / 2;
  const centerLng = (west + east) / 2;
  const radius = Math.min(
    3500,
    Math.max(800, distanceMeters(centerLat, centerLng, north, east))
  );

  return fetchPlacesAround(centerLat, centerLng, radius, signal);
}

function parseElements(elements: OverpassElement[]): Place[] {
  const out: Place[] = [];
  const seen = new Set<string>();
  const fetchedAt = Date.now();

  for (const el of elements) {
    const tags = el.tags;
    if (!tags) continue;

    // Resilient name resolution (supports brand, operator, name:en, name:id)
    const name = resolveName(tags);
    if (!name) continue;

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
      name,
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

/**
 * Global address/place search via Photon (autocomplete).
 * No longer restricted to Indonesia only.
 */
export async function searchPlaces(
  query: string,
  bias?: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    q,
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
      } satisfies GeocodeResult;
    })
    .filter((item): item is GeocodeResult => item !== null);
}

/**
 * Fallback global Nominatim geocoding.
 */
export async function geocode(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const params = new URLSearchParams({
    format: "jsonv2",
    q,
    limit: "6",
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

export interface GeospatialValidationResult {
  isValid: boolean;
  isWaterOrOffshore: boolean;
  reason?: string;
  placeName?: string;
}

/**
 * Validate candidate coordinates using real geospatial reverse geocoding.
 * Detects open sea, offshore waters, and uninhabited / unserviceable oceanic areas.
 * (Section 4 of Implementation Brief)
 */
export async function validateCandidateGeospatial(
  lat: number,
  lng: number,
  signal?: AbortSignal
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
      headers: {
        Accept: "application/json",
      },
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
      (category === "natural" && (type === "water" || type === "bay" || type === "sea" || type === "ocean")) ||
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
        addr.road || addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.residential || addr.city
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

