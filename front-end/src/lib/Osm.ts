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
  | "market"
  | "tourism"
  | "office"
  | "barbershop"
  | "hairdresser"
  | "laundry";

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
  { id: "barbershop", label: "Barbershop & Grooming", color: "#0891b2" },
  { id: "hairdresser", label: "Hair Salon", color: "#db2777" },
  { id: "laundry", label: "Laundry & Dry Cleaning", color: "#0284c7" },
] as const;

export const CATEGORY_BY_ID: Record<CategoryId, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, CategoryMeta>;

export interface Place {
  id: string;
  osmType: "node" | "way" | "relation";
  name: string;
  category: CategoryId;
  rawCategory?: string;
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
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
  geometry?: Array<{ lat: number; lon: number }>;
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

// Resilient mirror list for Overpass API (with custom VITE_OVERPASS_URL support)
const OVERPASS_ENDPOINTS: readonly string[] = [
  ...(import.meta.env.VITE_OVERPASS_URL ? [import.meta.env.VITE_OVERPASS_URL as string] : []),
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

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
  const office = tags.office;
  const historic = tags.historic;

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

  // Barbershop & Grooming — specific category for competitor matching
  if (amenity === "barber" || shop === "barber") {
    return "barbershop";
  }

  // Hairdresser / Hair Salon — specific category for competitor matching
  if (shop === "hairdresser" || shop === "salon") {
    return "hairdresser";
  }

  // Laundry & Dry Cleaning — specific category for competitor matching
  if (amenity === "laundry" || shop === "laundry" || shop === "dry_cleaning") {
    return "laundry";
  }

  // Generic Services, Finance, Healthcare & Personal Care
  if (
    amenity === "bank" ||
    amenity === "atm" ||
    amenity === "pharmacy" ||
    amenity === "clinic" ||
    amenity === "hospital" ||
    amenity === "doctors" ||
    amenity === "dentist" ||
    amenity === "post_office" ||
    amenity === "police" ||
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

/**
 * Generate a human-readable fallback display name for unnamed POIs
 * using their amenity/shop type and address fragment.
 */
function generateFallbackName(tags: Record<string, string>): string {
  const typeLabel =
    tags.amenity?.replace(/_/g, " ") ??
    tags.shop?.replace(/_/g, " ") ??
    tags.tourism?.replace(/_/g, " ") ??
    tags.leisure?.replace(/_/g, " ") ??
    tags.office?.replace(/_/g, " ") ??
    tags.historic?.replace(/_/g, " ") ??
    tags.public_transport?.replace(/_/g, " ") ??
    tags.highway?.replace(/_/g, " ") ??
    tags.railway?.replace(/_/g, " ") ??
    "place";

  const capitalised = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);

  const locationHint =
    tags["addr:street"] ??
    tags["addr:suburb"] ??
    tags["addr:village"] ??
    tags["addr:city"] ??
    "";

  return locationHint ? `${capitalised} — ${locationHint}` : capitalised;
}

export function aroundQuery(lat: number, lng: number, radius: number): string {
  const around = `(around:${Math.round(radius)},${lat.toFixed(5)},${lng.toFixed(5)})`;
  return `[out:json][timeout:25];
(
  nwr["amenity"~"^(restaurant|fast_food|food_court|cafe|bar|pub|ice_cream|canteen|bistro|school|kindergarten|childcare|university|college|marketplace|bus_station|ferry_terminal|fuel|barber|laundry|bank|atm|pharmacy|clinic|hospital|post_office|place_of_worship|community_centre|townhall|library)$"]${around};
  nwr["shop"~"^(convenience|supermarket|grocery|bakery|coffee|tea|kiosk|greengrocer|barber|hairdresser|salon|laundry|dry_cleaning|mall|department_store|general|meat|seafood|dairy|tailor|clothes|fashion|shoes|electronics|mobile_phone|hardware|stationery|books|beauty|cosmetics|chemist|optician|car_repair|motorcycle_repair)$"]${around};
  nwr["highway"="bus_stop"]${around};
  nwr["public_transport"~"^(station|stop_position|platform)$"]${around};
  nwr["railway"~"^(station|halt|subway_entrance)$"]${around};
  nwr["building"~"^(university|college|school)$"]${around};
  nwr["tourism"~"^(hotel|guest_house|hostel|motel|attraction|museum|viewpoint|gallery|theme_park)$"]${around};
  nwr["leisure"~"^(fitness_centre|sports_centre|park)$"]${around};
  nwr["office"]${around};
);
out center tags 500;`;
}

// Bounding box query for viewport loading
export function bboxQuery(south: number, west: number, north: number, east: number): string {
  // Normalize, order, and clamp bounding box
  const minLat = Math.max(-90, Math.min(south, north));
  const maxLat = Math.min(90, Math.max(south, north));
  const minLon = Math.max(-180, Math.min(west, east));
  const maxLon = Math.min(180, Math.max(west, east));

  const bbox = `${minLat.toFixed(5)},${minLon.toFixed(5)},${maxLat.toFixed(5)},${maxLon.toFixed(5)}`;
  return `[out:json][timeout:25];
(
  nwr["amenity"~"^(restaurant|fast_food|food_court|cafe|bar|pub|ice_cream|canteen|bistro|school|kindergarten|childcare|university|college|marketplace|bus_station|ferry_terminal|fuel|barber|laundry|bank|atm|pharmacy|clinic|hospital|post_office|place_of_worship|community_centre|townhall|library)$"](${bbox});
  nwr["shop"~"^(convenience|supermarket|grocery|bakery|coffee|tea|kiosk|greengrocer|barber|hairdresser|salon|laundry|dry_cleaning|mall|department_store|general|meat|seafood|dairy|tailor|clothes|fashion|shoes|electronics|mobile_phone|hardware|stationery|books|beauty|cosmetics|chemist|optician|car_repair|motorcycle_repair)$"](${bbox});
  nwr["highway"="bus_stop"](${bbox});
  nwr["public_transport"~"^(station|stop_position|platform)$"](${bbox});
  nwr["railway"~"^(station|halt|subway_entrance)$"](${bbox});
  nwr["building"~"^(university|college|school)$"](${bbox});
  nwr["tourism"~"^(hotel|guest_house|hostel|motel|attraction|museum|viewpoint|gallery|theme_park)$"](${bbox});
  nwr["leisure"~"^(fitness_centre|sports_centre|park)$"](${bbox});
  nwr["office"](${bbox});
);
out center tags 500;`;
}

// Master spatial POI repository: stores all loaded POIs by their unique OSM ID
const globalPoiStore = new Map<string, Place>();

// Active cached bounding box regions with timestamp
interface CachedRegion {
  south: number;
  west: number;
  north: number;
  east: number;
  at: number;
}
const cachedRegions: CachedRegion[] = [];
const CACHE_MS = 5 * 60 * 1000; // 5-minute spatial cache TTL

// In-flight request deduplication map to avoid simultaneous duplicate queries
const inFlightRequests = new Map<string, Promise<Place[]>>();

function quantizeCoord(coord: number, step = 0.005): number {
  return Math.round(coord / step) * step;
}

/**
 * Filter all known places from the global store that fall strictly inside the requested bbox.
 */
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

/**
 * Check if the requested bounding box is completely covered by an unexpired cached region.
 */
function isRegionCovered(
  south: number,
  west: number,
  north: number,
  east: number,
): boolean {
  const now = Date.now();
  // Clean up expired regions
  for (let i = cachedRegions.length - 1; i >= 0; i--) {
    if (now - cachedRegions[i].at > CACHE_MS) {
      cachedRegions.splice(i, 1);
    }
  }

  return cachedRegions.some(
    (r) =>
      r.south <= south + 0.001 &&
      r.north >= north - 0.001 &&
      r.west <= west + 0.001 &&
      r.east >= east - 0.001,
  );
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
    // 18-second timeout per mirror (sufficient for Overpass query compilation)
    const timeoutId = setTimeout(() => controller.abort(), 18000);

    const onParentAbort = () => controller.abort();
    if (signal) {
      signal.addEventListener("abort", onParentAbort, { once: true });
    }

    const tStart = performance.now();

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

      const durationMs = performance.now() - tStart;
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener("abort", onParentAbort);
      }

      // Retry on transient rate limit or server busy
      if (res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504) {
        console.warn(`[LOCIVA Overpass] Mirror ${endpoint} returned HTTP ${res.status} after ${durationMs.toFixed(0)}ms. Failing over...`);
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

      const rawCount = json.elements.length;
      const parsed = parseElements(json.elements);
      if (import.meta.env.DEV) {
        console.info(
          `[LOCIVA Overpass] ${endpoint} returned HTTP 200 in ${durationMs.toFixed(0)}ms (${rawCount} raw elements -> ${parsed.length} normalized POIs)`,
        );
      }

      return parsed;
    } catch (err: unknown) {
      const durationMs = performance.now() - tStart;
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener("abort", onParentAbort);
      }

      if (signal?.aborted) {
        throw new DOMException("Request cancelled", "AbortError");
      }

      lastError = err;
      console.warn(
        `[LOCIVA Overpass] Mirror ${endpoint} failed after ${durationMs.toFixed(0)}ms:`,
        (err as Error)?.message || err,
      );
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
  const halfSpan = radius / 111320;
  return fetchPlacesInBounds(
    lat - halfSpan,
    lng - halfSpan,
    lat + halfSpan,
    lng + halfSpan,
    signal,
  );
}

/**
 * Fetch POIs within a geographic bounding box (viewport).
 * Uses a true bbox Overpass query with region caching and strict viewport boundary filtering.
 */
export async function fetchPlacesInBounds(
  south: number,
  west: number,
  north: number,
  east: number,
  signal?: AbortSignal,
): Promise<Place[]> {
  // Normalize, order, and clamp bounding box
  const minLat = Math.max(-90, Math.min(south, north));
  const maxLat = Math.min(90, Math.max(south, north));
  const minLng = Math.max(-180, Math.min(west, east));
  const maxLng = Math.min(180, Math.max(west, east));

  // Check if this viewport region is already covered by cached results
  if (isRegionCovered(minLat, minLng, maxLat, maxLng)) {
    const cachedPlaces = getPlacesInBoundsFromStore(minLat, minLng, maxLat, maxLng);
    if (import.meta.env.DEV) {
      console.info(
        `[LOCIVA Overpass] Spatial cache HIT for viewport [${minLat.toFixed(3)}, ${minLng.toFixed(3)} to ${maxLat.toFixed(3)}, ${maxLng.toFixed(3)}]. Serving ${cachedPlaces.length} POIs.`,
      );
    }
    return cachedPlaces;
  }

  // Quantize bbox edges to ~0.005° steps (~500m) to deduplicate simultaneous requests
  const qS = quantizeCoord(minLat);
  const qW = quantizeCoord(minLng);
  const qN = quantizeCoord(maxLat);
  const qE = quantizeCoord(maxLng);
  const cacheKey = `bbox:${qS.toFixed(3)},${qW.toFixed(3)},${qN.toFixed(3)},${qE.toFixed(3)}`;

  const pending = inFlightRequests.get(cacheKey);
  if (pending) return pending;

  const queryPromise = (async () => {
    try {
      const body = new URLSearchParams({ data: bboxQuery(minLat, minLng, maxLat, maxLng) });
      const places = await postOverpass(body, signal);

      // Store in global POI store
      for (const p of places) {
        globalPoiStore.set(p.id, p);
      }

      // Record cached region
      cachedRegions.push({
        south: minLat,
        west: minLng,
        north: maxLat,
        east: maxLng,
        at: Date.now(),
      });

      // Return only the POIs falling inside the requested viewport
      return getPlacesInBoundsFromStore(minLat, minLng, maxLat, maxLng);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;

      // Graceful fallback: return cached places strictly within THIS viewport
      const localCached = getPlacesInBoundsFromStore(minLat, minLng, maxLat, maxLng, true);
      if (localCached.length > 0) {
        if (import.meta.env.DEV) {
          console.info(
            `[LOCIVA Overpass] Upstream unavailable. Serving ${localCached.length} stale cached POIs within visible viewport.`,
          );
        }
        return localCached;
      }

      // Do NOT return unrelated places from distant viewports!
      throw err;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, queryPromise);
  return queryPromise;
}

function parseElements(elements: OverpassElement[]): Place[] {
  const out: Place[] = [];
  const seen = new Set<string>();
  const fetchedAt = Date.now();

  for (const el of elements) {
    const tags = el.tags;
    if (!tags) continue;

    // Resilient name resolution (supports brand, operator, name:en, name:id)
    // If still no name, generate a descriptive fallback — do NOT silently drop unnamed POIs.
    const name = resolveName(tags) ?? generateFallbackName(tags);

    const category = classify(tags);
    if (!category) continue;

    // Handle nodes (lat, lon), ways with center, ways/relations with bounds, or geometry centroids
    let lat: number | undefined = el.lat ?? el.center?.lat;
    let lng: number | undefined = el.lon ?? el.center?.lon;

    if (lat === undefined || lng === undefined) {
      if (el.bounds) {
        lat = (el.bounds.minlat + el.bounds.maxlat) / 2;
        lng = (el.bounds.minlon + el.bounds.maxlon) / 2;
      } else if (Array.isArray(el.geometry) && el.geometry.length > 0) {
        const sum = el.geometry.reduce(
          (acc, pt) => ({ lat: acc.lat + pt.lat, lon: acc.lon + pt.lon }),
          { lat: 0, lon: 0 },
        );
        lat = sum.lat / el.geometry.length;
        lng = sum.lon / el.geometry.length;
      }
    }

    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) continue;

    const id = `${el.type}/${el.id}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const rawCategory = tags.amenity
      ? `amenity:${tags.amenity}`
      : tags.shop
      ? `shop:${tags.shop}`
      : tags.office
      ? `office:${tags.office}`
      : tags.leisure
      ? `leisure:${tags.leisure}`
      : tags.tourism
      ? `tourism:${tags.tourism}`
      : tags.healthcare
      ? `healthcare:${tags.healthcare}`
      : tags.highway === "bus_stop"
      ? "highway:bus_stop"
      : undefined;

    out.push({
      id,
      osmType: el.type,
      name,
      category,
      rawCategory,
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
    barbershop: "barbershop",
    barber: "barbershop",
    hairdresser: "hairdresser",
    laundry: "laundry",
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

