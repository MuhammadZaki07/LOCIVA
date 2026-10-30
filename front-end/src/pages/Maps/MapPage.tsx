// MapPage
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  Map as MapContainer,
  MapTileLayer,
  MapZoomControl,
  MapMarkerClusterGroup,
  MapMarker,
  MapPopup,
  MapCircle,
} from "@/components/ui/shadcn-ui/map";
import {
  distanceMeters,
  fetchPlacesInBounds as fetchLocalPlacesInBounds,
  type Place,
} from "@/lib/LocalOsm";
import { fetchPlacesInBounds as fetchExternalPlacesInBounds } from "@/lib/Osm";
import { useToast } from "@/components/ui/Toast";
import api from "@/context/apiClient";

// Batas wilayah kepulauan Indonesia: Barat Daya (Samudra Hindia / selatan Rote) s/d Timur Laut (Laut Natuna Utara / Papua timur)
export const INDONESIA_BOUNDS: [[number, number], [number, number]] = [
  [-13.5, 92.0],
  [8.5, 144.0],
];

import { BusinessCatalogPanel } from "@/components/maps/BusinessCatalogPanel";
import { CandidateMarker } from "@/components/maps/CandidateMarker";
import { AnalysisPanel } from "@/components/maps/AnalysisPanel";
import { SavedCandidatesPanel } from "@/components/maps/SavedCandidatesPanel";
import { CompareCandidatesPanel } from "@/components/maps/CompareCandidatesPanel";
import { MapLegend } from "@/components/maps/MapLegend";
import { CandidateTabs } from "@/components/maps/CandidateTabs";
import type { CandidateId } from "@/components/maps/CandidateTabs";
import { UserLocationMarker } from "@/components/maps/UserLocationMarker";
import { PoiMarker } from "@/components/maps/PoiMarker";
import {
  InternalBusinessMarker,
  type LocivaBusiness,
} from "@/components/maps/InternalBusinessMarker";
import {
  DataSourceControl,
  type FilterCategory,
} from "@/components/maps/DataSourceControl";
import { VendorRoutePanel, type TrackingLocationUpdate } from "@/components/maps/VendorRoutePanel";
import { RouteLayer } from "@/components/maps/RouteLayer";
import { MapPillNav, type MapToolId } from "@/components/maps/MapPillNav";
import { MapTour, TOUR_STORAGE_KEY } from "@/components/maps/MapTour";
import { SearchModal } from "@/components/maps/SearchModal";
import {
  ReportMarker,
  type MapCivicReport,
} from "@/components/maps/ReportMarker";
import { CivicReportsMapPanel } from "@/components/maps/CivicReportsMapPanel";
import { CreateReportModal } from "@/components/maps/CreateReportModal";
import type { AiAreaRouteResponse } from "@/lib/aiRoutePlanner";
import {
  BpsLayer,
  BpsLegend,
  BpsLayerStatus,
} from "@/components/maps/BpsLayer";
import type { BpsLegendEntry } from "@/components/maps/BpsLayer";

import type { BusinessType } from "@/lib/umkmCatalog";
import type { AnalysisResult } from "@/lib/analysisEngine";
import type { RouteWaypoint, RouteCalculationResult } from "@/lib/routing";
import { useLocationAnalysis } from "@/hooks/useLocationAnalysis";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import L from "leaflet";
import { useMapEvents } from "react-leaflet";
import {
  AlertCircle,
  Compass,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Footprints,
  MapIcon,
  Navigation,
  PenLine,
  Satellite,
  Scale,
  Target,
  Users,
  X,
  HelpCircle,
} from "lucide-react";

// ─── Map Ready Gate: delays children until Leaflet fires whenReady ─────────────
// This prevents "Cannot destructure property 'zoom' of 't0'" crashes that occur
// when MapZoomControl calls map.getZoom() synchronously before Leaflet initializes.
const MapReadyGate: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const map = useMapEvents({});
  const [isReady, setIsReady] = useState(() => {
    try {
      return (map as any)._loaded === true;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if ((map as any)._loaded) {
      setIsReady(true);
      return;
    }
    const onReady = () => setIsReady(true);
    map.whenReady(onReady);
    return () => {
      map.off("load", onReady);
    };
  }, [map]);

  return isReady ? <>{children}</> : null;
};

// ─── Map Event Handlers (Click & Viewport Pan/Zoom) ───────────────────────────
const MapEventHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
  onViewportChange: (
    centerLat: number,
    centerLng: number,
    radiusMeters: number,
    zoom: number,
    bounds: L.LatLngBounds,
  ) => void;
  mode: "candidate" | "waypoint" | "report" | "none";
}> = ({ onMapClick, onViewportChange, mode }) => {
  const emitViewport = useCallback(
    (m: L.Map) => {
      try {
        const c = m.getCenter();
        const b = m.getBounds();
        const ne = b.getNorthEast();
        onViewportChange(
          c.lat,
          c.lng,
          distanceMeters(c.lat, c.lng, ne.lat, ne.lng),
          m.getZoom(),
          b,
        );
      } catch (err) {
        console.warn("[MapEventHandler] map not ready yet", err);
      }
    },
    [onViewportChange],
  );

  const map = useMapEvents({
    click(e) {
      if (mode !== "none") onMapClick(e.latlng.lat, e.latlng.lng);
    },
    moveend() {
      emitViewport(map);
    },
  });

  useEffect(() => {
    emitViewport(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    try {
      const container = map.getContainer();
      if (!container) return;
      container.style.cursor =
        mode === "candidate" || mode === "report"
          ? "crosshair"
          : mode === "waypoint"
            ? "cell"
            : "";
      return () => {
        try {
          container.style.cursor = "";
        } catch {
          /* noop */
        }
      };
    } catch (err) {
      console.warn("[MapEventHandler] cursor effect: map not ready", err);
    }
  }, [map, mode]);

  return null;
};

// ─── Category filter helper (shared by Internal and External POI layers) ──────
const filterPlacesByCategory = (
  places: Place[],
  cat: FilterCategory,
): Place[] => {
  if (cat === "all") return places;
  if (cat === "school_campus") {
    return places.filter(
      (p) => p.category === "school" || p.category === "campus",
    );
  }
  return places.filter((p) => p.category === cat);
};

// ─── Main MapPage Component ───────────────────────────────────────────────────
export function MapPage() {
  const [center, setCenter] = useState<[number, number]>([-7.9797, 112.6304]); // Default to Malang coordinates
  const { toast } = useToast();
  const mapRef = useRef<L.Map>(null);
  const [searchParams] = useSearchParams();

  // ── Focus on specific object when navigated from Admin User Detail ──────────
  // Reads ?focusType=business|report|route &focusId=ID from URL.
  // Runs once after mount, waits for map to be ready before flying.
  useEffect(() => {
    const focusType = searchParams.get("focusType");
    const focusId = searchParams.get("focusId");

    if (!focusType || !focusId) return;

    // Wait for map to initialise — poll until mapRef is populated
    let attempts = 0;
    const maxAttempts = 40; // 4 seconds max (40 × 100ms)

    const tryFocus = async () => {
      attempts += 1;
      const map = mapRef.current;

      if (!map) {
        if (attempts < maxAttempts) {
          setTimeout(tryFocus, 100);
        }
        return;
      }

      try {
        if (focusType === "business") {
          const res = await api.get(`/businesses/${focusId}`);
          const biz = res.data?.data;
          if (biz?.latitude != null && biz?.longitude != null) {
            map.flyTo([Number(biz.latitude), Number(biz.longitude)], 17);
          }
        } else if (focusType === "report") {
          const res = await api.get(`/reports/${focusId}`);
          const report = res.data?.data;
          if (report?.latitude != null && report?.longitude != null) {
            map.flyTo([Number(report.latitude), Number(report.longitude)], 17);
          }
        } else if (focusType === "route") {
          // Try sessionStorage bridge first (set by AdminUsers before navigation)
          const stored = sessionStorage.getItem(
            `lociva_focus_route_${focusId}`,
          );
          if (stored) {
            try {
              const waypoints: Array<{ lat: number; lng: number }> =
                JSON.parse(stored);
              if (waypoints.length >= 2) {
                const bounds = L.latLngBounds(
                  waypoints.map((w) => [w.lat, w.lng] as [number, number]),
                );
                map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
                // Clean up after use
                sessionStorage.removeItem(`lociva_focus_route_${focusId}`);
              }
            } catch {
              // ignore parse errors
            }
            return;
          }

          // Fallback: try API (only works if owner or shared route)
          try {
            const res = await api.get(`/vendor-routes/${focusId}`);
            const route = res.data?.data;
            const waypoints: Array<{ lat: number; lng: number }> =
              route?.waypoints ?? [];
            if (waypoints.length >= 2) {
              const bounds = L.latLngBounds(
                waypoints.map((w) => [w.lat, w.lng] as [number, number]),
              );
              map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
            }
          } catch {
            // Route not accessible — silent fail
          }
        }
      } catch {
        // Network or not-found errors — silent fail, do not disturb the map
      }
    };

    // Delay slightly to allow Leaflet to finish initialisation
    const timer = setTimeout(tryFocus, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  // ── Navigation / Panel tool state ──────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<MapToolId | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const isRoutePanelOpen = activeTool === "routes";

  const handleToolSelect = (id: MapToolId) => {
    if (id === "search") {
      setIsSearchOpen(true);
      return;
    }
    // Auth-gate: require login for saved-candidates and routes panels
    if (!isLoggedIn && (id === "candidates" || id === "routes")) {
      toast({
        title: "Masuk Diperlukan",
        description: "Silakan masuk untuk mengakses fitur ini. Klik untuk menuju halaman masuk.",
        duration: 4000,
      });
      return;
    }
    setActiveTool((prev) => (prev === id ? null : id));
  };

  // ── Basemap mode (Default OSM vs Satellite) ────────────────────────────────
  const [basemapMode, setBasemapMode] = useState<"default" | "satellite">(
    "default",
  );

  const [isSelectingWaypoint, setIsSelectingWaypoint] = useState(false);

  // ── User GPS Location ─────────────────────────────────────────────────────
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
  } | null>(null);

  // ── UMKM Candidate Analysis ───────────────────────────────────────────────
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessType | null>(
    null,
  );
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isPersistedInDb, setIsPersistedInDb] = useState(false);

  // ── Layer toggles & Category filter ───────────────────────────────────────
  const [showLocalPoiData, setShowLocalPoiData] = useState(true);
  const [showMapsData, setShowMapsData] = useState(false); // External OSM (Overpass), opt-in
  const [showLocivaData, setShowLocivaData] = useState(true);
  const [layerCategory, setLayerCategory] = useState<FilterCategory>("all");
  const [showPublicRoutes, setShowPublicRoutes] = useState(true);

  // ── Viewport-based Places & Businesses State ──────────────────────────────
  // viewportPlaces = Internal (LocalOSM) layer
  const [viewportPlaces, setViewportPlaces] = useState<Place[]>([]);
  const [viewportPlacesLoading, setViewportPlacesLoading] = useState(false);
  const [viewportPlacesError, setViewportPlacesError] = useState<string | null>(
    null,
  );
  const [isPlacesStale, setIsPlacesStale] = useState(false);

  // External (OSM / Overpass) layer
  const [externalPlaces, setExternalPlaces] = useState<Place[]>([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);

  const [locivaBusinesses, setLocivaBusinesses] = useState<LocivaBusiness[]>(
    [],
  );
  const [locivaLoading, setLocivaLoading] = useState(false);
  const [locivaError, setLocivaError] = useState<string | null>(null);

  // ── Civic reports layer & creation flow ───────────────────────────────────
  const [reports, setReports] = useState<MapCivicReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [showReportsLayer, setShowReportsLayer] = useState(true);
  const [showBpsLayer, setShowBpsLayer] = useState(false);
  const [bpsLayerLevel, setBpsLayerLevel] = useState<"regency" | "district">(
    "regency",
  );
  const [bpsRegionName, setBpsRegionName] = useState<string>(
    "Provinsi Jawa Timur",
  );
  const [bpsLoading, setBpsLoading] = useState(false);
  const [bpsError, setBpsError] = useState<string | null>(null);
  const [bpsLegendEntries, setBpsLegendEntries] = useState<BpsLegendEntry[]>(
    [],
  );
  const [bpsLegendYear, setBpsLegendYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [trackingLocation, setTrackingLocation] = useState<TrackingLocationUpdate | null>(null);
  const [mapRotation, setMapRotation] = useState<number | null>(null);
  const [isHeadingLocked, setIsHeadingLocked] = useState<boolean>(true);

  // Sync map rotation with user heading when active
  // Using a ref to hold the target rotation and a separate low-frequency
  // state update so that heading changes don't block the GPS callback chain.
  const mapRotationTargetRef = useRef<number | null>(null);

  useEffect(() => {
    if (
      trackingLocation &&
      typeof trackingLocation.heading === "number" &&
      !isNaN(trackingLocation.heading) &&
      isHeadingLocked
    ) {
      // Shortest-path angle transition: normalize to avoid 359->1 full rotation
      const newHeading = ((trackingLocation.heading % 360) + 360) % 360;
      const prev = mapRotationTargetRef.current;
      if (prev !== null) {
        const delta = ((newHeading - prev + 540) % 360) - 180;
        const shortest = prev + delta;
        mapRotationTargetRef.current = shortest;
        setMapRotation(shortest);
      } else {
        mapRotationTargetRef.current = newHeading;
        setMapRotation(newHeading);
      }
    } else if (!trackingLocation) {
      mapRotationTargetRef.current = null;
      setMapRotation(null);
    }
  }, [trackingLocation, isHeadingLocked]);

  const activeUserLocation = trackingLocation || userLocation;
  const [createReportModalOpen, setCreateReportModalOpen] = useState(false);
  const [selectedReportCoords, setSelectedReportCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [pickingReportLocation, setPickingReportLocation] = useState(false);

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await api.get("/reports", { params: { per_page: 100 } });
      if (res.data?.success && res.data?.data) {
        const raw = Array.isArray(res.data.data.data)
          ? res.data.data.data
          : Array.isArray(res.data.data)
            ? res.data.data
            : [];
        const valid: MapCivicReport[] = raw
          .filter(
            (r: any) =>
              r.latitude != null &&
              r.longitude != null &&
              !isNaN(Number(r.latitude)) &&
              !isNaN(Number(r.longitude)),
          )
          .map((r: any) => ({
            id: String(r.id),
            title: r.title,
            description: r.description,
            latitude: Number(r.latitude),
            longitude: Number(r.longitude),
            status: r.status || "reported",
            severity: r.severity || "medium",
            category: r.category,
            area: r.area,
            user: r.user,
            confirmations_count:
              r.confirmations_count ?? r.confirmations?.length ?? 0,
            created_at: r.created_at || new Date().toISOString(),
            media: r.media || [],
          }));
        setReports(valid);
      }
    } catch (err) {
      console.warn("Gagal memuat laporan civic:", err);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  // ── Public vendor routes (shared by community vendors) ───────────────────
  const [publicRoutes, setPublicRoutes] = useState<any[]>([]);

  // ── Candidate points A, B, C ──────────────────────────────────────────────
  interface CandidateData {
    id: CandidateId;
    lat: number;
    lng: number;
    radius: number;
  }

  // Fokuskan peta pada lokasi pengguna saat tracking diperbarui.
  useEffect(() => {
    if (!trackingLocation || !mapRef.current) return;

    mapRef.current.setView(
      [trackingLocation.lat, trackingLocation.lng],
      Math.max(mapRef.current.getZoom(), 17),
      { animate: true },
    );
  }, [trackingLocation]);

  const [candidates, setCandidates] = useState<
    Record<CandidateId, CandidateData | null>
  >({
    A: null,
    B: null,
    C: null,
  });
  const [activeCandidateId, setActiveCandidateId] = useState<CandidateId>("A");
  const [analysisResults, setAnalysisResults] = useState<
    Record<CandidateId, AnalysisResult | null>
  >({
    A: null,
    B: null,
    C: null,
  });

  const { analyze, isAnalyzing, getCandidateStage, error: analysisError } = useLocationAnalysis();

  const [candidateStatuses, setCandidateStatuses] = useState<
    Record<string, 'draft' | 'location_selected' | 'analyzing' | 'ready' | 'stale' | 'failed'>
  >({
    A: 'draft',
    B: 'draft',
    C: 'draft',
  });
  const [persistedCandidateMap, setPersistedCandidateMap] = useState<
    Record<string, boolean>
  >({
    A: false,
    B: false,
    C: false,
  });

  const [isSelectingStartPoint, setIsSelectingStartPoint] = useState(false);
  const activeCandidate = candidates[activeCandidateId];
  const debouncedLat = useDebounce(activeCandidate?.lat, 600);
  const debouncedLng = useDebounce(activeCandidate?.lng, 600);
  const debouncedRadius = useDebounce(activeCandidate?.radius, 600);

  // ── Mobile Vendor Routes ──────────────────────────────────────────────────
  const [activeWaypoints, setActiveWaypoints] = useState<RouteWaypoint[]>([]);
  const [routeCalculation, setRouteCalculation] =
    useState<RouteCalculationResult | null>(null);
  const [isSelectingAnalysisArea, setIsSelectingAnalysisArea] = useState(false);
  const [spotJituAnalysisCenter, setSpotJituAnalysisCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [spotJituRadius, setSpotJituRadius] = useState<number>(2000);
  const [aiAreaResponse, setAiAreaResponse] = useState<AiAreaRouteResponse | null>(null);
  const [highlightedStopId, setHighlightedStopId] = useState<string | number | null>(null);

  const [isLoggedIn] = useState(() => Boolean(localStorage.getItem("token")));

  // ── Candidate location picking mode (temporary interaction mode) ─────────
  const [isPickingCandidateLocation, setIsPickingCandidateLocation] = useState(false);

  // ── Onboarding tour ─────────────────────────────────────────────────────
  const [tourRun, setTourRun] = useState(false);
  const tourAutoStartedRef = useRef(false);

  // Auto-launch on first visit when map and tour targets are mounted and ready.
  // Guarded by ref and localStorage version check so StrictMode, rerenders,
  // and route changes cannot duplicate or prematurely launch the tour.
  useEffect(() => {
    if (tourAutoStartedRef.current) return;
    try {
      if (localStorage.getItem(TOUR_STORAGE_KEY) === "1") return;
    } catch {
      /* localStorage unavailable or restricted */
    }

    let attempts = 0;
    const maxAttempts = 60; // 6 seconds max polling (60 x 100ms)
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const checkReadinessAndStart = () => {
      attempts += 1;

      // Ensure the Leaflet map instance is fully populated
      const isMapReady = Boolean(mapRef.current);

      // Verify essential tour targets are mounted in the DOM
      const hasCatalogBtn = Boolean(document.querySelector('[data-tour="catalog-btn"]'));
      const hasLayersBtn = Boolean(document.querySelector('[data-tour="layers-btn"]'));
      const hasMapCanvas = Boolean(document.querySelector('[data-tour="map-canvas"]'));
      const hasAnalysisBtn = Boolean(document.querySelector('[data-tour="analysis-btn"]'));
      const hasCandidateBtnIfAuth = !isLoggedIn || Boolean(document.querySelector('[data-tour="candidates-btn"]'));

      const isReady = isMapReady && hasCatalogBtn && hasLayersBtn && hasMapCanvas && hasAnalysisBtn && hasCandidateBtnIfAuth;

      if (isReady) {
        if (intervalId) clearInterval(intervalId);
        if (!tourAutoStartedRef.current) {
          try {
            if (localStorage.getItem(TOUR_STORAGE_KEY) === "1") return;
          } catch {
            /* noop */
          }
          tourAutoStartedRef.current = true;
          setTourRun(true);
        }
        return;
      }

      // Fallback: If timeout reached and catalog target is mounted, launch gracefully
      if (attempts >= maxAttempts) {
        if (intervalId) clearInterval(intervalId);
        if (!tourAutoStartedRef.current && hasCatalogBtn) {
          try {
            if (localStorage.getItem(TOUR_STORAGE_KEY) === "1") return;
          } catch {
            /* noop */
          }
          tourAutoStartedRef.current = true;
          setTourRun(true);
        }
      }
    };

    intervalId = setInterval(checkReadinessAndStart, 100);
    checkReadinessAndStart();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLoggedIn]);

  // Mark the tour as completed so it never auto-launches again on later visits.
  // Manual replay via the "Panduan" button does NOT clear this state.
  const handleTourFinish = useCallback(() => {
    setTourRun(false);
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
  }, []);

  // ── Click mode: either placing candidate, waypoint, or report location ──────
  const clickMode = useMemo(():
    | "candidate"
    | "waypoint"
    | "report"
    | "none" => {
    if (pickingReportLocation) return "report";

    if (
      isLoggedIn &&
      (isSelectingStartPoint || isSelectingWaypoint || isSelectingAnalysisArea)
    ) {
      return "waypoint";
    }

    if (selectedBusiness && isPickingCandidateLocation) return "candidate";

    return "none";
  }, [
    pickingReportLocation,
    isLoggedIn,
    isSelectingStartPoint,
    isSelectingWaypoint,
    isSelectingAnalysisArea,
    selectedBusiness,
    isPickingCandidateLocation,
  ]);

  // ── Privacy-Aware Opt-in User GPS Location (Section 6) ───────────────────
  // Location sharing is strictly opt-in and disabled by default. No silent tracking.
  const [isLocationOptedIn, setIsLocationOptedIn] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const handleToggleOptInLocation = useCallback(() => {
    if (isLocationOptedIn) {
      setUserLocation(null);
      setIsLocationOptedIn(false);
      toast({
        title: "Live Location Stopped",
        description:
          "Opt-in GPS sharing was disabled. Location marker removed from map.",
      });
      return;
    }

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      toast({
        title: "Geolocation Unavailable",
        description:
          "Your device or browser does not support GPS location access.",
        variant: "error",
      });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng, accuracy: pos.coords.accuracy });
        setIsLocationOptedIn(true);
        setIsLocating(false);
        setCenter([lat, lng]);
        mapRef.current?.flyTo([lat, lng], 15);
        toast({
          title: "Live Location Enabled (Opt-in)",
          description:
            "Your location is visible on the map. Click again anytime to disable sharing.",
          variant: "success",
        });
      },
      () => {
        setIsLocating(false);
        toast({
          title: "Permission Denied",
          description: "GPS permission was not granted by your browser.",
          variant: "error",
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  }, [isLocationOptedIn, toast]);

  // ── Fetch LOCIVA internal businesses with bounding box / radius ───────────
  const fetchLocivaData = useCallback(
    async (
      lat?: number,
      lng?: number,
      radius?: number,
      bounds?: L.LatLngBounds,
    ) => {
      setLocivaLoading(true);
      setLocivaError(null);
      try {
        const params: Record<string, any> = { limit: 120 };
        if (bounds) {
          params.min_lat = bounds.getSouth();
          params.min_lng = bounds.getWest();
          params.max_lat = bounds.getNorth();
          params.max_lng = bounds.getEast();
        } else if (lat !== undefined && lng !== undefined) {
          params.lat = lat;
          params.lng = lng;
          params.radius = radius || 5000;
        }

        const res = await api.get("/businesses/map", { params });
        if (res.data?.success && Array.isArray(res.data?.data)) {
          setLocivaBusinesses(res.data.data);
        } else {
          setLocivaBusinesses([]);
        }
      } catch (err: any) {
        console.warn("Failed to load LOCIVA internal businesses:", err);
        setLocivaError("Unable to load internal business data");
      } finally {
        setLocivaLoading(false);
      }
    },
    [],
  );

  // ── Viewport-based POI Loader (LOCIVA backend / own database) ──────────────
  const viewportAbortRef = useRef<AbortController | null>(null);
  const viewportDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const viewportCountRef = useRef(0);

  // ── External OSM (Overpass) loader ─────────────────────────────────────────
  const externalAbortRef = useRef<AbortController | null>(null);
  const showMapsDataRef = useRef(showMapsData);
  useEffect(() => {
    showMapsDataRef.current = showMapsData;
  }, [showMapsData]);

  const loadExternalPlaces = useCallback(
    async (zoom: number, bounds: L.LatLngBounds) => {
      if (zoom < 14) return; // keep Overpass queries small
      externalAbortRef.current?.abort();
      const controller = new AbortController();
      externalAbortRef.current = controller;
      setExternalLoading(true);
      setExternalError(null);
      try {
        const places = await fetchExternalPlacesInBounds(
          bounds.getSouth(),
          bounds.getWest(),
          bounds.getNorth(),
          bounds.getEast(),
          controller.signal,
        );
        setExternalPlaces(places);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.warn("Failed to load external OSM places:", err);
        setExternalError("Unable to load places from Overpass");
      } finally {
        if (!controller.signal.aborted) setExternalLoading(false);
      }
    },
    [],
  );

  // Load when the layer is switched on, cancel when switched off
  useEffect(() => {
    if (!showMapsData) {
      externalAbortRef.current?.abort();
      setExternalLoading(false);
      return;
    }
    const map = mapRef.current;
    if (map) loadExternalPlaces(map.getZoom(), map.getBounds());
  }, [showMapsData, loadExternalPlaces]);

  // Cancel pending work when leaving the page
  useEffect(() => {
    return () => {
      if (viewportDebounceTimer.current) {
        clearTimeout(viewportDebounceTimer.current);
      }
      viewportAbortRef.current?.abort();
      externalAbortRef.current?.abort();
    };
  }, []);

  const loadViewportData = useCallback(
    (
      centerLat: number,
      centerLng: number,
      radiusMeters: number,
      zoom: number,
      bounds: L.LatLngBounds,
    ) => {
      if (viewportDebounceTimer.current) {
        clearTimeout(viewportDebounceTimer.current);
      }

      // Debounce so panning doesn't hit the backend on every frame
      viewportDebounceTimer.current = setTimeout(async () => {
        // 1. LOCIVA businesses for the visible area
        fetchLocivaData(centerLat, centerLng, radiusMeters, bounds);
        if (showMapsDataRef.current) loadExternalPlaces(zoom, bounds);

        // 2. POIs from our own database. Below zoom 13 the viewport is wider
        //    than the backend accepts, so skip.
        if (zoom < 12) return;

        // Cancel the previous request before starting a new one so a slow
        // old response can't overwrite fresh results.
        viewportAbortRef.current?.abort();
        viewportAbortRef.current = new AbortController();
        const currentSignal = viewportAbortRef.current.signal;

        setViewportPlacesLoading(true);
        setViewportPlacesError(null);

        try {
          const places = await fetchLocalPlacesInBounds(
            bounds.getSouth(),
            bounds.getWest(),
            bounds.getNorth(),
            bounds.getEast(),
            currentSignal,
          );
          viewportCountRef.current = places.length;
          setViewportPlaces(places);
          setIsPlacesStale(places.some((p) => p.isStale));
        } catch (err: any) {
          if (err?.name === "AbortError") return;
          console.warn("Failed to load viewport places:", err);
          setViewportPlacesError(
            "Unable to load places from the LOCIVA server",
          );
          // Keep what is already on the map and flag it as stale
          if (viewportCountRef.current > 0) setIsPlacesStale(true);
        } finally {
          // Don't clear the spinner if a newer request has taken over
          if (!currentSignal.aborted) setViewportPlacesLoading(false);
        }
      }, 550);
    },
    [fetchLocivaData, loadExternalPlaces],
  );

  // Initial load: use a ~4km bounding box around the default center
  useEffect(() => {
    fetchLocivaData(center[0], center[1], 8000);
    fetchReports();
    const controller = new AbortController();
    const halfSpan = 0.018;
    fetchLocalPlacesInBounds(
      center[0] - halfSpan,
      center[1] - halfSpan,
      center[0] + halfSpan,
      center[1] + halfSpan,
      controller.signal,
    )
      .then((places) => {
        viewportCountRef.current = places.length;
        setViewportPlaces((prev) => (prev.length > 0 ? prev : places));
      })
      .catch((err) => {
        if (err?.name !== "AbortError") console.error("[POI initial]", err);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch public shared routes ────────────────────────────────────────────
  const fetchPublicRoutes = useCallback(async () => {
    try {
      const res = await api.get("/vendor-routes/public");
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setPublicRoutes(res.data.data);
      }
    } catch (err) {
      console.warn("Failed to load public shared routes:", err);
    }
  }, []);

  useEffect(() => {
    fetchPublicRoutes();
  }, [fetchPublicRoutes]);

  // ── Explicit candidate persistence (no auto-save on drag) ─────────────────
  // ── Explicit candidate persistence (with snapshot history & business linkage) ──
  const persistCandidateToDatabase = useCallback(
    async (
      candidate: CandidateData,
      businessType: BusinessType,
      analysis?: AnalysisResult | null,
    ) => {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Perlu Masuk Akun",
          description: "Silakan masuk (login) terlebih dahulu untuk menyimpan kandidat ke database.",
          variant: "warning",
        });
        return;
      }
      try {
        const businessId = (businessType as any).business_id && (businessType as any).business_id !== businessType.id
          ? (businessType as any).business_id
          : undefined;
        const payload: Record<string, any> = {
          candidate_id: candidate.id,
          latitude: candidate.lat,
          longitude: candidate.lng,
          radius_m: candidate.radius,
          business_type_id: businessType.id,
          ...(businessId ? { business_id: businessId } : {}),
          ...(currentSessionId ? { session_id: currentSessionId } : {}),
          session_name: `Simulation ${businessType.name}`,
          location_name: `Candidate Point ${candidate.id}`,
          status: analysis ? "calculated" : "draft",
        };

        if (analysis) {
          payload.scores = {
            opportunity_score: analysis.opportunityScore,
            competition_score: analysis.competitionScore,
            accessibility_score: analysis.accessibilityScore,
            data_confidence: analysis.dataConfidence,
          };
          payload.analyzed_lat = analysis.lat ?? candidate.lat;
          payload.analyzed_lng = analysis.lng ?? candidate.lng;
          payload.algorithm_version = "1.0";
          payload.competitor_count = analysis.competitorCount;
          payload.report_count = analysis.reportCount;
          payload.competitor_categories = (businessType as any).competitor_categories;
          payload.data_warnings = analysis.dataWarnings;
          payload.factors = analysis.factors;
          payload.sources = analysis.sources;
          payload.limitations = analysis.limitations;
        }

        const saveRes = await api.post("/simulations/candidate", payload);
        if (saveRes.data?.data?.session_id) {
          setCurrentSessionId(saveRes.data.data.session_id);
        }
        setIsPersistedInDb(true);
        setPersistedCandidateMap((prev) => ({
          ...prev,
          [candidate.id]: true,
        }));
        toast({
          title: `Kandidat ${candidate.id} Tersimpan`,
          description: "Data kandidat dan riwayat snapshot berhasil disimpan ke database.",
          variant: "success",
        });
      } catch (err: any) {
        const errMsg =
          err?.response?.data?.message ||
          "Gagal menyimpan ke database. Periksa koneksi jaringan Anda.";
        toast({
          title: "Gagal Menyimpan",
          description: errMsg,
          variant: "error",
        });
      }
    },
    [toast],
  );

  // ── Manual analysis trigger (explicit user action, no auto-trigger on drag) ──
  const handleRunAnalysis = useCallback(async () => {
    if (!isLoggedIn) {
      toast({
        title: "Perlu Masuk Akun",
        description: "Silakan masuk (login) terlebih dahulu untuk menjalankan analisis lokasi.",
        variant: "warning",
      });
      return;
    }
    const cand = candidates[activeCandidateId];
    if (!cand || !selectedBusiness) return;

    setCandidateStatuses((prev) => ({ ...prev, [activeCandidateId]: "analyzing" }));

    const res = await analyze(
      activeCandidateId,
      cand.lat,
      cand.lng,
      cand.radius,
      selectedBusiness,
    );

    if (res) {
      setAnalysisResults((prev) => ({ ...prev, [activeCandidateId]: res }));
      setCandidateStatuses((prev) => ({ ...prev, [activeCandidateId]: "ready" }));
      fetchLocivaData(cand.lat, cand.lng, cand.radius * 1.5);

      toast({
        title: `Analisis Kandidat ${activeCandidateId} Selesai`,
        description: `Skor potensi lokasi: ${res.opportunityScore ?? "N/A"}%`,
        variant: "success",
      });

    } else {
      setCandidateStatuses((prev) => ({ ...prev, [activeCandidateId]: "failed" }));
      toast({
        title: "Analisis Gagal",
        description: "Tidak dapat menyelesaikan analisis lokasi. Silakan coba lagi.",
        variant: "error",
      });
    }
  }, [
    activeCandidateId,
    candidates,
    selectedBusiness,
    analyze,
    fetchLocivaData,
    isLoggedIn,
    persistCandidateToDatabase,
    toast,
  ]);

  // ── Invalidate to stale when candidate position or radius changes ──────────
  useEffect(() => {
    if (activeCandidate && analysisResults[activeCandidateId]) {
      const lastRes = analysisResults[activeCandidateId];
      if (
        lastRes &&
        (Math.abs(lastRes.lat - activeCandidate.lat) > 0.0001 ||
          Math.abs(lastRes.lng - activeCandidate.lng) > 0.0001 ||
          lastRes.radius !== activeCandidate.radius)
      ) {
        setCandidateStatuses((prev) => ({
          ...prev,
          [activeCandidateId]: "stale",
        }));
        setPersistedCandidateMap((prev) => ({
          ...prev,
          [activeCandidateId]: false,
        }));
      }
    }
  }, [debouncedLat, debouncedLng, debouncedRadius, activeCandidateId, activeCandidate, analysisResults]);

  const handleSearchSelect = (lat: number, lng: number, name: string) => {
    setCenter([lat, lng]);
    mapRef.current?.flyTo([lat, lng], 15);
    toast({ title: "Location Found", description: name });
  };

  const handleBusinessSelect = (business: BusinessType) => {
    setSelectedBusiness(business);
    setCurrentSessionId(null);
    setIsPersistedInDb(false);
    setCandidates({ A: null, B: null, C: null });
    setAnalysisResults({ A: null, B: null, C: null });
    setCandidateStatuses({ A: 'draft', B: 'draft', C: 'draft' });
    setPersistedCandidateMap({ A: false, B: false, C: false });
    setActiveCandidateId("A");
    setActiveTool("analysis");
    if (window.innerWidth < 768) setActiveTool(null);
    setIsPickingCandidateLocation(true);
    toast({
      title: `${business.name} Selected`,
      description: "Click anywhere on the map to place Candidate Point A.",
    });
  };

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (pickingReportLocation) {
        setSelectedReportCoords({ lat, lng });
        setPickingReportLocation(false);
        setCreateReportModalOpen(true);
        toast({
          title: "Titik lokasi dipilih",
          description: `Koordinat ${lat.toFixed(4)}, ${lng.toFixed(4)} diterapkan ke form.`,
          variant: "success",
        });
        return;
      }

      if (clickMode === "candidate" && selectedBusiness) {
        const existing = candidates[activeCandidateId];
        const newCandidate: CandidateData = {
          id: activeCandidateId,
          lat,
          lng,
          radius:
            existing?.radius ||
            selectedBusiness.defaultRadius,
        };
        setCandidates((prev) => ({
          ...prev,
          [activeCandidateId]: newCandidate,
        }));
        setCandidateStatuses((prev) => ({
          ...prev,
          [activeCandidateId]: analysisResults[activeCandidateId] ? 'stale' : 'location_selected',
        }));
        setPersistedCandidateMap((prev) => ({
          ...prev,
          [activeCandidateId]: false,
        }));
        setIsPersistedInDb(false);
        setIsPickingCandidateLocation(false);
        if (activeTool !== "analysis") setActiveTool("analysis");
      } else if (clickMode === "waypoint") {
        if (isSelectingAnalysisArea) {
          setSpotJituAnalysisCenter({ lat, lng });
          setIsSelectingAnalysisArea(false);
          setActiveTool("routes");
          toast({
            title: "Pusat Area Spot Jitu Dipilih",
            description: `Koordinat ${lat.toFixed(4)}, ${lng.toFixed(4)} ditetapkan sebagai pusat analisis area.`,
            variant: "success",
          });
          return;
        }
        if (isSelectingStartPoint) {
          setActiveWaypoints([
            {
              lat,
              lng,
              name: "Titik Awal Rute",
              stop_duration: 0,
            },
          ]);

          setRouteCalculation(null);
          setIsSelectingStartPoint(false);
          setIsSelectingWaypoint(false);
          setActiveTool("routes");

          toast({
            title: "Titik Awal Dipilih",
            description: `Koordinat ${lat.toFixed(4)}, ${lng.toFixed(4)} berhasil ditetapkan sebagai titik awal.`,
            variant: "success",
          });

          return;
        }

        if (isSelectingWaypoint) {
          setActiveWaypoints((prev) => [
            ...prev,
            {
              lat,
              lng,
              name: `Pemberhentian ${prev.length}`,
              stop_duration: 30,
            },
          ]);

          setRouteCalculation(null);
          setIsSelectingWaypoint(false);
          setActiveTool("routes");

          toast({
            title: "Titik Singgah Ditambahkan",
            description: `Koordinat ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          });
        }
      }
    },
    [
      pickingReportLocation,
      clickMode,
      isSelectingStartPoint,
      isSelectingWaypoint,
      isSelectingAnalysisArea,
      selectedBusiness,
      activeCandidateId,
      candidates,
      analysisResults,
      activeTool,
      toast,
    ],
  );

  const handleMarkerDragEnd = useCallback(
    (id: CandidateId, lat: number, lng: number) => {
      setCandidates((prev) => {
        const existing = prev[id];
        if (!existing) return prev;
        return { ...prev, [id]: { ...existing, lat, lng } };
      });
      setActiveCandidateId(id);
      setCandidateStatuses((prev) => ({
        ...prev,
        [id]: analysisResults[id] ? 'stale' : 'location_selected',
      }));
      setPersistedCandidateMap((prev) => ({
        ...prev,
        [id]: false,
      }));
      setIsPersistedInDb(false);
    },
    [analysisResults],
  );

  const handleRadiusChange = useCallback(
    (radius: number) => {
      setCandidates((prev) => {
        const existing = prev[activeCandidateId];
        if (!existing) return prev;
        return { ...prev, [activeCandidateId]: { ...existing, radius } };
      });
      setCandidateStatuses((prev) => ({
        ...prev,
        [activeCandidateId]: analysisResults[activeCandidateId] ? 'stale' : 'location_selected',
      }));
      setPersistedCandidateMap((prev) => ({
        ...prev,
        [activeCandidateId]: false,
      }));
    },
    [activeCandidateId, analysisResults],
  );

  const handleAddCandidate = async () => {
    if (!isLoggedIn) {
      toast({
        title: "Perlu Masuk Akun",
        description: "Silakan masuk (login) terlebih dahulu untuk menambah kandidat lokasi.",
        variant: "warning",
      });
      return;
    }
    const candidateKeys: CandidateId[] = ["A", "B", "C", "D", "E"];
    const nextAvailable = candidateKeys.find(
      (id) => !candidates[id],
    );
    if (!nextAvailable) {
      toast({
        title: "Batas Tampilan Kandidat",
        description: "Maksimal 5 kandidat per sesi komparasi aktif di peta.",
        variant: "warning",
      });
      return;
    }

    setActiveCandidateId(nextAvailable);
    setCandidateStatuses((prev) => ({ ...prev, [nextAvailable]: 'draft' }));
    setAnalysisResults((prev) => ({ ...prev, [nextAvailable]: null }));
    setPersistedCandidateMap((prev) => ({ ...prev, [nextAvailable]: false }));
    setIsPickingCandidateLocation(true);

    // Create persistent draft in database via Laravel API
    if (isLoggedIn && selectedBusiness) {
      try {
        const businessId = (selectedBusiness as any).business_id && (selectedBusiness as any).business_id !== selectedBusiness.id
          ? (selectedBusiness as any).business_id
          : undefined;
        const draftRes = await api.post("/simulations/candidate", {
          candidate_id: nextAvailable,
          latitude: selectedBusiness.latitude || center[0] || -7.9800,
          longitude: selectedBusiness.longitude || center[1] || 112.6300,
          radius_m: selectedBusiness.defaultRadius || 500,
          business_type_id: selectedBusiness.id,
          ...(businessId ? { business_id: businessId } : {}),
          ...(currentSessionId ? { session_id: currentSessionId } : {}),
          status: 'draft',
          session_name: `Simulasi ${selectedBusiness.name}`,
          location_name: `Draft Kandidat ${nextAvailable}`,
        });
        if (draftRes.data?.data?.session_id) {
          setCurrentSessionId(draftRes.data.data.session_id);
        }

        toast({
          title: `Draft Kandidat ${nextAvailable} Dibuat`,
          description: "Draft tersimpan di backend. Klik peta untuk menentukan titik koordinat kandidat.",
          variant: "success",
        });
      } catch {
        toast({
          title: `Kandidat ${nextAvailable} Siap`,
          description: "Klik peta untuk menentukan titik koordinat kandidat.",
        });
      }
    } else {
      toast({
        title: `Kandidat ${nextAvailable} Siap`,
        description: "Klik peta untuk menentukan titik koordinat kandidat.",
      });
    }
  };

  const handleSaveCandidate = () => {
    const cand = candidates[activeCandidateId];
    if (!cand || !selectedBusiness) return;
    persistCandidateToDatabase(
      cand,
      selectedBusiness,
      analysisResults[activeCandidateId],
    );
  };

  // ── Unified Places List Across ALL Candidates (Multi-candidate POI relevance) ──
  const allCandidatePlaces = useMemo(() => {
    const placesMap = new Map<string, Place & { candidateAssociations: CandidateId[] }>();

    (Object.entries(analysisResults) as [CandidateId, AnalysisResult | null][]).forEach(
      ([candId, result]) => {
        if (!result?.allPlaces) return;
        result.allPlaces.forEach((place) => {
          const existing = placesMap.get(place.id);
          if (existing) {
            if (!existing.candidateAssociations.includes(candId)) {
              existing.candidateAssociations.push(candId);
            }
          } else {
            placesMap.set(place.id, {
              ...place,
              candidateAssociations: [candId],
            });
          }
        });
      },
    );

    return Array.from(placesMap.values());
  }, [analysisResults]);

  // Internal (LocalOSM) places: viewport + all candidate places, deduplicated by id
  const allLocalPlaces: (Place & { candidateAssociations?: CandidateId[] })[] = useMemo(() => {
    const mapById = new Map<string, Place & { candidateAssociations?: CandidateId[] }>();
    for (const p of viewportPlaces) mapById.set(p.id, p);
    for (const p of allCandidatePlaces) {
      const existing = mapById.get(p.id);
      if (existing) {
        mapById.set(p.id, {
          ...existing,
          candidateAssociations: p.candidateAssociations,
        });
      } else {
        mapById.set(p.id, p);
      }
    }
    return Array.from(mapById.values());
  }, [viewportPlaces, allCandidatePlaces]);

  const filteredLocalPlaces = useMemo(
    () =>
      showLocalPoiData
        ? filterPlacesByCategory(allLocalPlaces, layerCategory)
        : [],
    [allLocalPlaces, showLocalPoiData, layerCategory],
  );

  // External (Overpass) places; skip ones already shown by internal layer
  const filteredExternalPlaces = useMemo(() => {
    if (!showMapsData) return [];
    const localIds = showLocalPoiData
      ? new Set(allLocalPlaces.map((p) => p.id))
      : null;
    const list = localIds
      ? externalPlaces.filter((p) => !localIds.has(p.id))
      : externalPlaces;
    return filterPlacesByCategory(list, layerCategory);
  }, [
    externalPlaces,
    allLocalPlaces,
    showMapsData,
    showLocalPoiData,
    layerCategory,
  ]);

  const filteredLocivaBusinesses = useMemo(() => {
    if (!showLocivaData) return [];
    if (layerCategory === "all") return locivaBusinesses;
    return locivaBusinesses.filter((b) => {
      const slug = b.business_type?.slug || "";
      if (layerCategory === "cafe")
        return slug.includes("kopi") || slug.includes("cafe");
      if (layerCategory === "food")
        return (
          slug.includes("makan") ||
          slug.includes("bakso") ||
          slug.includes("seblak") ||
          slug.includes("food")
        );
      if (layerCategory === "retail")
        return (
          slug.includes("kelontong") ||
          slug.includes("market") ||
          slug.includes("mart")
        );
      if (layerCategory === "service")
        return (
          slug.includes("laundry") ||
          slug.includes("barbershop") ||
          slug.includes("service")
        );
      return true;
    });
  }, [locivaBusinesses, showLocivaData, layerCategory]);

  // Deduplication check between internal and external places.
  // Cheap degree-box pre-check (~90 m) skips almost all pairs before the
  // trigonometric distance is computed.
  const { duplicateExternalIds, duplicateInternalIds } = useMemo(() => {
    const dupExt = new Set<string>();
    const dupInt = new Set<string>();
    [...filteredLocalPlaces, ...filteredExternalPlaces].forEach((ext) => {
      filteredLocivaBusinesses.forEach((loc) => {
        if (
          Math.abs(ext.lat - loc.latitude) > 0.0008 ||
          Math.abs(ext.lng - loc.longitude) > 0.0008
        ) {
          return;
        }
        if (
          distanceMeters(ext.lat, ext.lng, loc.latitude, loc.longitude) <= 65
        ) {
          dupExt.add(ext.id);
          dupInt.add(loc.id);
        }
      });
    });
    return { duplicateExternalIds: dupExt, duplicateInternalIds: dupInt };
  }, [filteredLocalPlaces, filteredExternalPlaces, filteredLocivaBusinesses]);

  const candidateTabsData = (["A", "B", "C"] as CandidateId[]).map((id) => ({
    id,
    exists: candidates[id] !== null || id === activeCandidateId,
  }));

  const activeCount = Object.values(candidates).filter(
    (c) => c !== null,
  ).length;

  return (
    <div className="flex h-screen w-full overflow-hidden relative bg-canvas">
      {/* ── Global Search Modal ────────────────────────────────────────────── */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={handleSearchSelect}
      />

      {/* ── Main Interactive Map Canvas ────────────────────────────────────── */}
      <div data-tour="map-canvas" className="flex-1 relative flex flex-col min-w-0">
        {/* ── Vertical Nav Pill (Anchored on Left, vertically centered) ──────── */}
        <MapPillNav
          active={activeTool}
          onSelect={handleToolSelect}
          analysisEnabled={!!selectedBusiness}
          compareEnabled={activeCount > 0}
        />

        {/* ── Anchored Floating Tool Panel (Section 10 & 11) ─────────────────
            Uses fixed positioning so it always floats above the Leaflet map.
            left-20 = pill (left-3 ≈12px + ~52px pill width) + 12px gap ≈ 80px.
            Capped height to avoid viewport overflow; solid white background.
        ─────────────────────────────────────────────────────────────────────── */}
        {activeTool && activeTool !== "search" && activeTool !== "routes" && (
          <div
            className={cn(
              // Float fixed above everything — does NOT shift map layout
              "fixed z-[430]",
              // Desktop: anchored right of nav pill with gap, vertically safe margins
              "left-20 top-6 bottom-6 w-[28rem]",
              // Tablet / mobile: full-width overlay from left
              "max-md:left-0 max-md:right-0 max-md:bottom-0 max-md:top-0 max-md:w-full max-md:rounded-none",
              // Claymorphism card styling — solid background, no transparency
              "rounded-3xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col",
            )}
            style={{ maxHeight: "calc(100vh - 3rem)" }}
          >
            {activeTool === "catalog" && (
              <BusinessCatalogPanel
                isOpen={true}
                onClose={() => setActiveTool(null)}
                selectedTypeId={selectedBusiness?.id || null}
                onSelect={handleBusinessSelect}
                isEmbedded={true}
              />
            )}

            {activeTool === "layers" && (
              <DataSourceControl
                showLocalPoiData={showLocalPoiData}
                onToggleLocalPoiData={setShowLocalPoiData}
                localPoiCount={filteredLocalPlaces.length}
                localPoiLoading={viewportPlacesLoading || isAnalyzing}
                localPoiError={viewportPlacesError || analysisError}
                onRetryLocalPoi={() => {
                  if (activeCandidate && selectedBusiness) {
                    analyze(
                      activeCandidate.id,
                      activeCandidate.lat,
                      activeCandidate.lng,
                      activeCandidate.radius,
                      selectedBusiness,
                    );
                  }
                  const map = mapRef.current;
                  if (map) {
                    const c = map.getCenter();
                    const b = map.getBounds();
                    const r = distanceMeters(
                      c.lat,
                      c.lng,
                      b.getNorthEast().lat,
                      b.getNorthEast().lng,
                    );
                    loadViewportData(c.lat, c.lng, r, map.getZoom(), b);
                  }
                }}
                showMapsData={showMapsData}
                onToggleMapsData={setShowMapsData}
                mapsCount={filteredExternalPlaces.length}
                mapsLoading={externalLoading}
                mapsError={externalError}
                onRetryMaps={() => {
                  const map = mapRef.current;
                  if (map) loadExternalPlaces(map.getZoom(), map.getBounds());
                }}
                showLocivaData={showLocivaData}
                onToggleLocivaData={setShowLocivaData}
                locivaCount={filteredLocivaBusinesses.length}
                locivaLoading={locivaLoading}
                locivaError={locivaError}
                onRetryLociva={() =>
                  fetchLocivaData(center[0], center[1], 8000)
                }
                selectedCategory={layerCategory}
                onSelectCategory={setLayerCategory}
                isOpen={true}
                onToggleOpen={() => setActiveTool(null)}
                isStale={isPlacesStale}
                isEmbedded={true}
              />
            )}

            {activeTool === "candidates" && (
              <SavedCandidatesPanel
                isOpen={true}
                onClose={() => setActiveTool(null)}
                selectedBusinessId={(selectedBusiness as any)?.business_id || null}
                selectedBusinessTypeId={selectedBusiness?.id || null}
                selectedBusinessName={selectedBusiness?.name || null}
                onSelectCandidate={(saved) => {
                  setCandidates((prev) => ({
                    ...prev,
                    A: {
                      id: "A",
                      lat: saved.latitude,
                      lng: saved.longitude,
                      radius: saved.radius_m || 500,
                    },
                  }));
                  setActiveCandidateId("A");
                  setCenter([saved.latitude, saved.longitude]);
                  mapRef.current?.flyTo([saved.latitude, saved.longitude], 15);
                  setIsPersistedInDb(true);
                  setActiveTool("analysis");
                }}
              />
            )}

            {activeTool === "analysis" &&
              (selectedBusiness ? (
                <div className="h-full flex flex-col overflow-hidden text-left">
                  {/* Candidate tabs header */}
                  <div className="p-3.5 border-b border-slate-200 shrink-0 bg-white">
                    <CandidateTabs
                      candidates={candidateTabsData}
                      activeId={activeCandidateId}
                      onChange={(id) => {
                        setActiveCandidateId(id);
                      }}
                      onAdd={handleAddCandidate}
                    />
                    {activeCount > 1 && (
                      <button
                        type="button"
                        onClick={() => setActiveTool("compare")}
                        className="w-full py-1.5 mt-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Scale size={13} />
                        Compare Candidates Side-by-Side
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden relative">
                    <AnalysisPanel
                      business={selectedBusiness}
                      result={analysisResults[activeCandidateId]}
                      isAnalyzing={isAnalyzing}
                      error={analysisError}
                      radius={
                        candidates[activeCandidateId]?.radius ||
                        selectedBusiness.defaultRadius
                      }
                      onRadiusChange={handleRadiusChange}
                      isOpen={true}
                      onClose={() => setActiveTool(null)}
                      candidateExists={candidates[activeCandidateId] !== null}
                      isPersistedInDb={persistedCandidateMap[activeCandidateId] ?? false}
                      onSaveCandidate={handleSaveCandidate}
                      onAnalyze={handleRunAnalysis}
                      candidateStatus={candidateStatuses[activeCandidateId]}
                      isStale={candidateStatuses[activeCandidateId] === 'stale'}
                      candidateId={activeCandidateId}
                      analysisStage={getCandidateStage(activeCandidateId)}
                      isLoggedIn={isLoggedIn}
                      onStartPickLocation={() => setIsPickingCandidateLocation(true)}
                      isPickingLocation={isPickingCandidateLocation}
                    />
                  </div>
                </div>
              ) : (
                /* No business selected — prompt user to visit Catalog first */
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Target size={18} />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-base text-ink">
                          Location Analysis
                        </h3>
                        <p className="text-xs text-muted">
                          Spatial feasibility scoring
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTool(null)}
                      className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
                    <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <BookOpen size={26} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-ink mb-1">
                        Choose a Business Type First
                      </h4>
                      <p className="text-xs text-muted leading-relaxed max-w-xs">
                        Open the <strong>Catalog</strong> (first item in the
                        nav), pick the type of business you want to open, then
                        click a spot on the map to place Candidate A.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTool("catalog")}
                      className="clay-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen size={13} />
                      Open Business Catalog
                    </button>
                  </div>
                </div>
              ))}

            {activeTool === "compare" && (
              <CompareCandidatesPanel
                isOpen={true}
                onClose={() => setActiveTool(null)}
                results={analysisResults}
                activeCandidates={(["A", "B", "C"] as CandidateId[]).filter(
                  (id) => candidates[id] !== null,
                )}
                onFlyToCandidate={(id) => {
                  const cand = candidates[id];
                  if (cand) {
                    mapRef.current?.flyTo([cand.lat, cand.lng], 16);
                    setActiveCandidateId(id);
                  }
                }}
              />
            )}

            {activeTool === "reports" && (
              <CivicReportsMapPanel
                isOpen={true}
                onClose={() => setActiveTool(null)}
                reports={reports}
                loading={reportsLoading}
                showReportsLayer={showReportsLayer}
                onToggleReportsLayer={setShowReportsLayer}
                onFlyToReport={(lat, lng) => {
                  mapRef.current?.flyTo([lat, lng], 17);
                }}
                onOpenCreateModal={() => {
                  if (!isLoggedIn) {
                    toast({
                      title: "Perlu Masuk Akun",
                      description: "Silakan masuk (login) terlebih dahulu untuk membuat dan mengirim laporan warga.",
                      variant: "warning",
                    });
                    return;
                  }
                  setSelectedReportCoords(
                    activeUserLocation
                      ? { lat: activeUserLocation.lat, lng: activeUserLocation.lng }
                      : { lat: center[0], lng: center[1] },
                  );
                  setCreateReportModalOpen(true);
                }}
              />
            )}

          </div>
        )}

        {/* ── Vendor Route Panel: Desktop Left Floating Card vs Mobile Draggable Bottom Sheet ── */}
        {activeTool === "routes" && (
              <VendorRoutePanel
                isOpen={true}
                onClose={() => setActiveTool(null)}
                activeWaypoints={activeWaypoints}
                onWaypointsChange={(wps) => {
                  setActiveWaypoints(wps);
                  setRouteCalculation(null);
                }}
                onRouteCalculated={setRouteCalculation}
                currentCalculation={routeCalculation}
                mapCenter={center}
                userLocation={activeUserLocation}
                analysisAreaCenter={spotJituAnalysisCenter}
                onAnalysisAreaCenterChange={setSpotJituAnalysisCenter}
                spotJituRadius={spotJituRadius}
                onSpotJituRadiusChange={setSpotJituRadius}
                aiAreaResponse={aiAreaResponse}
                onAiAreaResponseChange={setAiAreaResponse}
                highlightedStopId={highlightedStopId}
                onHighlightStopId={setHighlightedStopId}
                onSelectAnalysisArea={() => {
                  setIsSelectingStartPoint(false);
                  setIsSelectingWaypoint(false);
                  setIsSelectingAnalysisArea(true);
                  setActiveTool(null);
                }}
                onTrackingLocationChange={setTrackingLocation}
                onSelectStartPoint={() => {
                  setIsSelectingWaypoint(false);
                  setIsSelectingAnalysisArea(false);
                  setIsSelectingStartPoint(true);
                  setActiveTool(null);
                }}
                onSelectWaypoint={() => {
                  setIsSelectingStartPoint(false);
                  setIsSelectingAnalysisArea(false);
                  setIsSelectingWaypoint(true);
                  setActiveTool(null);
                }}
              />
            )}

        {/* ── Top-right Floating Map Controls ───────────────────────────────── */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 pointer-events-none">
          {/* Basemap Switcher */}
          <div className="pointer-events-auto flex items-center bg-white/95 backdrop-blur-xs rounded-2xl border border-slate-200/80 shadow-md text-xs font-semibold overflow-hidden p-1">
            <button
              type="button"
              onClick={() => setBasemapMode("default")}
              className={cn(
                "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer",
                basemapMode === "default"
                  ? "bg-primary text-white shadow-xs font-bold"
                  : "text-muted hover:text-ink",
              )}
              title="Standard Street Map (OSM)"
            >
              <MapIcon size={14} />
              <span className="hidden sm:inline">Map</span>
            </button>
            <button
              type="button"
              onClick={() => setBasemapMode("satellite")}
              className={cn(
                "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer",
                basemapMode === "satellite"
                  ? "bg-primary text-white shadow-xs font-bold"
                  : "text-muted hover:text-ink",
              )}
              title="Satellite Imagery (Esri)"
            >
              <Satellite size={14} />
              <span className="hidden sm:inline">Satellite</span>
            </button>
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
            <button
              type="button"
              onClick={() => setTourRun(true)}
              className="px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-muted hover:text-primary hover:bg-primary-soft"
              title="Panduan Interaktif Peta (Onboarding Tour)"
            >
              <HelpCircle size={14} />
              <span className="hidden sm:inline">Panduan</span>
            </button>
          </div>

          {/* Map Controls — Right Side */}
          <div className="pointer-events-none absolute right-4 top-35 z-[1000] flex -translate-y-1/2 flex-col gap-2">
            {/* Compass / Heading Lock Button (visible during tracking or when rotated) */}
            {(trackingLocation || (mapRotation !== null && mapRotation !== 0)) && (
              <button
                type="button"
                onClick={() => {
                  if (mapRotation === 0 || mapRotation === null) {
                    setIsHeadingLocked(true);
                    if (trackingLocation?.heading != null) {
                      setMapRotation(trackingLocation.heading);
                    }
                  } else {
                    setMapRotation(0);
                    setIsHeadingLocked(false);
                  }
                }}
                title={
                  mapRotation && mapRotation !== 0
                    ? `Reset ke Utara (Rotasi: ${Math.round(mapRotation)}°)`
                    : "Kunci Arah Navigasi"
                }
                aria-label="Kompas Arah"
                className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-md cursor-pointer border shadow-sm backdrop-blur-md transition-all duration-200 active:scale-95 border-slate-200/80 bg-white/95 text-primary hover:bg-primary-soft"
              >
                <Compass
                  size={20}
                  className={cn(
                    "transition-transform duration-300",
                    isHeadingLocked && trackingLocation ? "text-blue-600" : "text-slate-600"
                  )}
                  style={{
                    transform: `rotate(-${mapRotation ?? 0}deg)`,
                  }}
                />
              </button>
            )}

            {/* GPS Location */}
            <button
              type="button"
              onClick={handleToggleOptInLocation}
              title={
                isLocationOptedIn
                  ? "Stop sharing live location"
                  : "Share live location"
              }
              aria-label={
                isLocationOptedIn
                  ? "Stop sharing live location"
                  : "Share live location"
              }
              className={cn(
                "pointer-events-auto flex h-10 w-10 items-center justify-center rounded-md cursor-pointer border shadow-sm backdrop-blur-md transition-all duration-200 active:scale-95",
                isLocationOptedIn
                  ? "border-blue-500 bg-blue-600 text-white shadow-blue-200/50"
                  : "border-slate-200/80 bg-white/95 text-primary hover:bg-primary-soft",
              )}
            >
              <Navigation
                size={18}
                className={cn(isLocating && "animate-spin")}
              />
            </button>

            {/* Public Routes */}
            <button
              type="button"
              onClick={() => setShowPublicRoutes((v) => !v)}
              title={
                showPublicRoutes
                  ? "Hide community public routes"
                  : "Show community public routes"
              }
              aria-label={
                showPublicRoutes
                  ? "Hide community public routes"
                  : "Show community public routes"
              }
              aria-pressed={showPublicRoutes}
              className={cn(
                "pointer-events-auto flex h-10 w-10 items-center justify-center rounded-md cursor-pointer border shadow-sm backdrop-blur-md transition-all duration-200 active:scale-95",
                showPublicRoutes
                  ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                  : "border-slate-200/80 bg-white/95 text-muted hover:bg-slate-50 hover:text-ink",
              )}
            >
              <Footprints size={18} />
            </button>

            {/* BPS Population Layer */}
            <button
              type="button"
              onClick={() => setShowBpsLayer((v) => !v)}
              title={
                showBpsLayer
                  ? "Sembunyikan layer kepadatan penduduk BPS"
                  : "Tampilkan layer kepadatan penduduk BPS"
              }
              aria-label={
                showBpsLayer
                  ? "Sembunyikan layer kepadatan penduduk BPS"
                  : "Tampilkan layer kepadatan penduduk BPS"
              }
              aria-pressed={showBpsLayer}
              className={cn(
                "pointer-events-auto flex h-10 w-10 items-center justify-center rounded-md cursor-pointer border shadow-sm backdrop-blur-md transition-all duration-200 active:scale-95",
                showBpsLayer
                  ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                  : "border-slate-200/80 bg-white/95 text-muted hover:bg-slate-50 hover:text-ink",
              )}
            >
              <Users size={18} />
            </button>

            {/* Create Civic Report */}
            <button
              type="button"
              onClick={() => {
                setSelectedReportCoords(null);
                setPickingReportLocation(true);
              }}
              title="Lapor kondisi: pilih lokasi pada peta"
              aria-label="Lapor kondisi"
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-md cursor-pointer border border-rose-500 bg-rose-600 text-white shadow-sm transition-all duration-200 hover:bg-rose-700 active:scale-95"
            >
              <AlertTriangle size={18} />
            </button>
          </div>
        </div>

        {/* ── Leaflet Map Viewport ─────────────────────────────────────────── */}
        <div className="flex-1 relative z-0 overflow-hidden">
          {/* ── Top Navigation HUD Banner (Google Maps style) ────────────────── */}
          {trackingLocation && (trackingLocation.targetWaypointName || trackingLocation.isFinished) && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto max-w-md w-[92%] sm:w-auto bg-slate-900/95 text-white backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
              <div
                className={cn(
                  "h-9 w-9 rounded-xl text-white flex items-center justify-center shrink-0 shadow-md",
                  trackingLocation.isFinished
                    ? "bg-emerald-600 shadow-emerald-500/30"
                    : "bg-blue-600/90 shadow-blue-500/20",
                )}
              >
                {trackingLocation.isFinished ? (
                  <CheckCircle2 size={20} className="text-white" />
                ) : (
                  <Navigation size={18} className="fill-white" />
                )}
              </div>
              <div className="flex-1 min-w-0 pr-1">
                {trackingLocation.isFinished ? (
                  <>
                    <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      Navigasi Selesai
                    </div>
                    <div className="text-sm font-bold text-white truncate">
                      Semua Titik Tujuan Berhasil Dikunjungi
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Menuju Waypoint</span>
                      {trackingLocation.currentWaypointIndex != null &&
                        trackingLocation.totalWaypoints != null && (
                          <span className="bg-slate-800 text-blue-400 px-1.5 py-0.2 rounded font-mono text-[10px]">
                            {trackingLocation.currentWaypointIndex + 1}/
                            {trackingLocation.totalWaypoints}
                          </span>
                        )}
                      {/* GPS Accuracy Badge */}
                      <span className="flex items-center gap-1 ml-auto text-[10px] text-slate-300">
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            (trackingLocation.accuracy ?? 30) <= 15
                              ? "bg-emerald-400"
                              : (trackingLocation.accuracy ?? 30) <= 35
                                ? "bg-amber-400"
                                : "bg-red-400",
                          )}
                        />
                        {(trackingLocation.accuracy ?? 30) <= 15
                          ? "GPS Baik"
                          : (trackingLocation.accuracy ?? 30) <= 35
                            ? "GPS Sedang"
                            : "GPS Lemah"}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white truncate">
                      {trackingLocation.targetWaypointName}
                    </div>
                  </>
                )}
              </div>
              {!trackingLocation.isFinished &&
                trackingLocation.targetDistanceMeters != null && (
                  <div className="text-right shrink-0 border-l border-slate-700/80 pl-3">
                    <div className="text-base font-extrabold text-blue-400">
                      {trackingLocation.targetDistanceMeters >= 1000
                        ? `${(trackingLocation.targetDistanceMeters / 1000).toFixed(1)} km`
                        : `${Math.round(trackingLocation.targetDistanceMeters)} m`}
                    </div>
                    <div className="text-[10px] text-slate-400">Jarak target</div>
                  </div>
                )}
            </div>
          )}

          <div
            className="w-full h-full transition-transform duration-500 ease-out"
            style={
              mapRotation != null && mapRotation !== 0
                ? {
                    transform: `rotate(-${mapRotation}deg) scale(1.42)`,
                    transformOrigin: "center center",
                  }
                : undefined
            }
          >
            <MapContainer
            ref={mapRef}
            center={center}
            zoom={14}
            minZoom={4}
            maxZoom={19}
            maxBounds={INDONESIA_BOUNDS}
            maxBoundsViscosity={1.0}
            className="w-full h-full"
          >
            {basemapMode === "satellite" ? (
              <MapTileLayer
                key="satellite"
                name="Satellite"
                bounds={INDONESIA_BOUNDS}
                noWrap={true}
                minZoom={4}
                maxZoom={19}
                rasterUrl={
                  (import.meta.env.VITE_SATELLITE_TILE_URL as string) ||
                  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                }
                rasterAttribution={
                  (import.meta.env.VITE_SATELLITE_ATTRIBUTION as string) ||
                  "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                }
              />
            ) : (
              <MapTileLayer
                key="default"
                name="Default"
                bounds={INDONESIA_BOUNDS}
                noWrap={true}
                minZoom={4}
                maxZoom={19}
                rasterUrl={
                  (import.meta.env.VITE_STANDARD_TILE_URL as string) ||
                  "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                }
                rasterAttribution={
                  (import.meta.env.VITE_STANDARD_ATTRIBUTION as string) ||
                  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }
              />
            )}

            <MapReadyGate>
              <MapZoomControl position="bottom-24 right-4 md:bottom-8 md:right-4" />

              {/* Viewport panning/zooming and click event listener */}
              <MapEventHandler
                onMapClick={handleMapClick}
                onViewportChange={loadViewportData}
                mode={clickMode}
              />

              {/* BPS Demographic Choropleth Layer — must be inside MapReadyGate for Leaflet context */}
              <BpsLayer
                isVisible={showBpsLayer}
                level={bpsLayerLevel}
                onLoadingChange={setBpsLoading}
                onErrorChange={setBpsError}
                onLegendReady={(entries, year, regionName) => {
                  setBpsLegendEntries(entries);
                  setBpsLegendYear(year);
                  if (regionName) setBpsRegionName(regionName);
                }}
              />

              {/* Temporary preview marker while picking report location */}
              {pickingReportLocation && selectedReportCoords && (
                <ReportMarker
                  key="report-preview"
                  report={{
                    id: "__preview__",
                    title: "Pilih posisi laporan...",
                    latitude: selectedReportCoords.lat,
                    longitude: selectedReportCoords.lng,
                    status: "reported",
                    severity: "medium",
                    confirmations_count: 0,
                    created_at: new Date().toISOString(),
                    media: [],
                  }}
                />
              )}
            </MapReadyGate>

            {/* User GPS location marker */}
            {activeUserLocation && (
              <UserLocationMarker
                lat={activeUserLocation.lat}
                lng={activeUserLocation.lng}
                accuracy={activeUserLocation.accuracy}
                heading={trackingLocation?.heading}
              />
            )}

            {/* Candidate analysis markers A, B, C */}
            {(["A", "B", "C"] as CandidateId[]).map((id) => {
              const cand = candidates[id];
              if (!cand) return null;
              return (
                <CandidateMarker
                  key={id}
                  id={id}
                  lat={cand.lat}
                  lng={cand.lng}
                  radius={cand.radius}
                  onDragEnd={handleMarkerDragEnd}
                  onClick={(clickedId) => {
                    setActiveCandidateId(clickedId);
                    setActiveTool("analysis");
                  }}
                />
              );
            })}

            {/* Spot Jitu analysis area circle & marker */}
            {activeTool === "routes" && spotJituAnalysisCenter && (
              <>
                <MapMarker
                  position={[
                    spotJituAnalysisCenter.lat,
                    spotJituAnalysisCenter.lng,
                  ]}
                  icon={
                    <div
                      style={{
                        backgroundColor: "#4f46e5",
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        border: "3px solid white",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "13px",
                      }}
                    >
                      ✨
                    </div>
                  }
                  iconAnchor={[14, 14]}
                >
                  <MapPopup className="lociva-popup-wrapper">
                    <div className="p-2 text-center space-y-0.5">
                      <p className="font-bold text-ink text-xs">
                        Pusat Area Spot Jitu
                      </p>
                      <p className="text-[10px] text-muted">
                        Radius:{" "}
                        {spotJituRadius >= 1000
                          ? `${spotJituRadius / 1000} km`
                          : `${spotJituRadius} m`}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {spotJituAnalysisCenter.lat.toFixed(5)},{" "}
                        {spotJituAnalysisCenter.lng.toFixed(5)}
                      </p>
                    </div>
                  </MapPopup>
                </MapMarker>
                <MapCircle
                  center={[
                    spotJituAnalysisCenter.lat,
                    spotJituAnalysisCenter.lng,
                  ]}
                  radius={spotJituRadius}
                  pathOptions={{
                    color: "#6366f1",
                    fillColor: "#818cf8",
                    fillOpacity: 0.12,
                    weight: 2,
                    dashArray: "6, 6",
                  }}
                />
              </>
            )}

            {/* Spot Jitu AI Route Preview Markers */}
            {activeTool === "routes" && aiAreaResponse && (
              <>
                {/* START POINT MARKER */}
                <MapMarker
                  position={[
                    aiAreaResponse.start_point.lat,
                    aiAreaResponse.start_point.lng,
                  ]}
                  icon={
                    <div
                      className={cn(
                        "size-7 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-[10px] shadow-lg border-2 border-white transition-all duration-200 cursor-pointer",
                        highlightedStopId === aiAreaResponse.start_point.id &&
                          "scale-125 ring-4 ring-emerald-400 animate-pulse",
                      )}
                    >
                      S
                    </div>
                  }
                  iconAnchor={[14, 14]}
                >
                  <MapPopup className="lociva-popup-wrapper">
                    <div className="p-2 space-y-1 max-w-[220px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                          Titik Awal (Start)
                        </span>
                      </div>
                      <p className="font-bold text-xs text-ink">
                        {aiAreaResponse.start_point.name}
                      </p>
                      <p className="text-[10px] text-muted leading-tight">
                        {aiAreaResponse.start_point.reason}
                      </p>
                    </div>
                  </MapPopup>
                </MapMarker>

                {/* INTERMEDIATE WAYPOINTS MARKERS */}
                {aiAreaResponse.recommended_waypoints.map((wp, idx) => (
                  <MapMarker
                    key={`ai-wp-${wp.id}-${idx}`}
                    position={[wp.lat, wp.lng]}
                    icon={
                      <div
                        className={cn(
                          "size-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shadow-md border-2 border-white transition-all duration-200 cursor-pointer",
                          highlightedStopId === wp.id &&
                            "scale-125 ring-4 ring-indigo-400 animate-pulse",
                        )}
                      >
                        {idx + 1}
                      </div>
                    }
                    iconAnchor={[12, 12]}
                  >
                    <MapPopup className="lociva-popup-wrapper">
                      <div className="p-2 space-y-1 max-w-[220px]">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                            Stop #{idx + 1}
                          </span>
                          <span className="text-[9px] text-muted">
                            ~{wp.stop_duration_minutes || 30} mnt
                          </span>
                        </div>
                        <p className="font-bold text-xs text-ink">{wp.name}</p>
                        <p className="text-[10px] text-muted leading-tight">
                          {wp.reason}
                        </p>
                      </div>
                    </MapPopup>
                  </MapMarker>
                ))}

                {/* END POINT MARKER */}
                <MapMarker
                  position={[
                    aiAreaResponse.end_point.lat,
                    aiAreaResponse.end_point.lng,
                  ]}
                  icon={
                    <div
                      className={cn(
                        "size-7 rounded-full bg-rose-600 text-white font-extrabold flex items-center justify-center text-[10px] shadow-lg border-2 border-white transition-all duration-200 cursor-pointer",
                        highlightedStopId === aiAreaResponse.end_point.id &&
                          "scale-125 ring-4 ring-rose-400 animate-pulse",
                      )}
                    >
                      E
                    </div>
                  }
                  iconAnchor={[14, 14]}
                >
                  <MapPopup className="lociva-popup-wrapper">
                    <div className="p-2 space-y-1 max-w-[220px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                          Titik Akhir (End)
                        </span>
                      </div>
                      <p className="font-bold text-xs text-ink">
                        {aiAreaResponse.end_point.name}
                      </p>
                      <p className="text-[10px] text-muted leading-tight">
                        {aiAreaResponse.end_point.reason}
                      </p>
                    </div>
                  </MapPopup>
                </MapMarker>
              </>
            )}

            <RouteLayer
              activeWaypoints={activeWaypoints}
              currentCalculation={routeCalculation}
              publicRoutes={showPublicRoutes ? publicRoutes : []}
              showPublicRoutes={showPublicRoutes}
              activeWaypointIndex={trackingLocation?.currentWaypointIndex}
              completedWaypointKeys={trackingLocation?.completedWaypointKeys}
            />

            <MapMarkerClusterGroup
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
            >
              {/* Internal Map POIs (LocalOSM) */}
              {filteredLocalPlaces.map((place) => (
                <PoiMarker
                  key={`poi-${place.id}`}
                  place={place}
                  candidateAssociations={(place as any).candidateAssociations}
                  activeCandidateId={activeCandidateId}
                  distanceFromCandidate={
                    activeCandidate
                      ? distanceMeters(
                          activeCandidate.lat,
                          activeCandidate.lng,
                          place.lat,
                          place.lng,
                        )
                      : undefined
                  }
                  isDuplicateWithInternal={duplicateExternalIds.has(place.id)}
                />
              ))}

              {/* External Map POIs (OSM / Overpass) */}
              {filteredExternalPlaces.map((place) => (
                <PoiMarker
                  key={`ext-poi-${place.id}`}
                  place={place}
                  candidateAssociations={(place as any).candidateAssociations}
                  activeCandidateId={activeCandidateId}
                  distanceFromCandidate={
                    activeCandidate
                      ? distanceMeters(
                          activeCandidate.lat,
                          activeCandidate.lng,
                          place.lat,
                          place.lng,
                        )
                      : undefined
                  }
                  isDuplicateWithInternal={duplicateExternalIds.has(place.id)}
                />
              ))}

              {showLocivaData &&
                filteredLocivaBusinesses.map((biz) => (
                  <InternalBusinessMarker
                    key={`lociva-${biz.id}`}
                    business={biz}
                    distanceFromCandidate={
                      activeCandidate
                        ? distanceMeters(
                            activeCandidate.lat,
                            activeCandidate.lng,
                            biz.latitude,
                            biz.longitude,
                          )
                        : undefined
                    }
                    isDuplicateWithExternal={duplicateInternalIds.has(biz.id)}
                  />
                ))}

              {/* Civic Reports Layer */}
              {showReportsLayer &&
                reports.map((report) => (
                  <ReportMarker
                    key={`civic-report-${report.id}`}
                    report={report}
                  />
                ))}
            </MapMarkerClusterGroup>
          </MapContainer>
          </div>

          {/* Prompt: Candidate placement mode */}
          {clickMode === "candidate" && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[450] bg-slate-900/95 text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-xl flex items-center gap-3 border border-white/20 pointer-events-auto">
              <Target size={15} className="text-primary shrink-0" />
              <span>Klik pada peta untuk menempatkan titik Kandidat {activeCandidateId}</span>
              <button
                type="button"
                onClick={() => setIsPickingCandidateLocation(false)}
                className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] hover:bg-white/30 cursor-pointer"
              >
                Batal
              </button>
            </div>
          )}

          {/* Prompt: Waypoint placement mode */}
          {isLoggedIn &&
            clickMode === "waypoint" &&
            (isSelectingStartPoint || isSelectingWaypoint || isSelectingAnalysisArea) && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[400] bg-emerald-800/95 text-white px-5 py-2.5 rounded-full font-medium text-xs shadow-lg pointer-events-none flex items-center gap-2 border border-white/20">
                <PenLine size={14} />
                <span>
                  {isSelectingAnalysisArea
                    ? "Klik peta untuk memilih pusat area Spot Jitu"
                    : isSelectingStartPoint
                    ? "Klik peta untuk menentukan titik awal"
                    : "Klik peta untuk menambahkan titik singgah"}
                </span>
              </div>
            )}

          {/* Active Business Badge (Top Center) */}
          {selectedBusiness && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
              <div className="clay-primary text-white px-4 py-2 rounded-full text-xs font-bold shadow-md flex items-center gap-2">
                <span>{selectedBusiness.name}</span>
                {isPersistedInDb && (
                  <span title="Saved in database">
                    <CheckCircle2 size={13} className="text-emerald-300" />
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Stale Cache Notice Banner */}
          {isPlacesStale && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[380] bg-amber-500/90 text-white px-4 py-1.5 rounded-full text-[11px] font-medium shadow-md flex items-center gap-1.5 border border-amber-300/60">
              <AlertCircle size={13} />
              <span>Server unreachable: showing previously loaded places</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Dynamic Map Legend ─────────────────────────────────────────────── */}
      <MapLegend
        showMapsData={showLocalPoiData || showMapsData}
        showLocivaData={showLocivaData}
        showReportsData={showReportsLayer}
        mapsCount={filteredLocalPlaces.length + filteredExternalPlaces.length}
        locivaCount={filteredLocivaBusinesses.length}
        reportsCount={reports.length}
        activeCandidateCount={activeCount}
        basemapMode={basemapMode}
        isStale={isPlacesStale}
      />

      {/* ── BPS Population Density Floating Legend & Status ──────────────── */}
      <BpsLegend
        isVisible={showBpsLayer}
        onClose={() => setShowBpsLayer(false)}
        entries={bpsLegendEntries}
        year={bpsLegendYear}
        regionName={bpsRegionName}
        level={bpsLayerLevel}
        onLevelChange={setBpsLayerLevel}
      />

      <BpsLayerStatus
        isVisible={showBpsLayer}
        loading={bpsLoading}
        error={bpsError}
      />

      {/* Picking report location banner on map */}
      {pickingReportLocation && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[450] bg-rose-600 text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-xl flex items-center gap-3 border border-rose-300 pointer-events-auto">
          <AlertTriangle size={14} className="shrink-0" />
          <span>Klik titik mana pun di peta untuk memilih lokasi laporan</span>
          <button
            type="button"
            onClick={() => {
              setPickingReportLocation(false);
              setSelectedReportCoords(null);
            }}
            className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] hover:bg-white/30 cursor-pointer"
          >
            Batal
          </button>
        </div>
      )}

      {/* Create report modal */}
      {/* ── Onboarding Tour ─────────────────────────────────────────────── */}
      <MapTour
        run={tourRun}
        onFinish={handleTourFinish}
        isLoggedIn={isLoggedIn}
        hasSelectedBusiness={!!selectedBusiness}
        hasCandidate={activeCount > 0}
      />

      <CreateReportModal
        isOpen={createReportModalOpen}
        onClose={() => {
          setCreateReportModalOpen(false);
          setSelectedReportCoords(null);
        }}
        selectedCoords={selectedReportCoords}
        onSelectCoordsOnMap={() => {
          // Close modal and enter picking mode; modal will re-open after user taps map
          setCreateReportModalOpen(false);
          setPickingReportLocation(true);
        }}
        onReportCreated={(newReport) => {
          setReports((prev) => [newReport, ...prev]);
          setShowReportsLayer(true);
          setSelectedReportCoords(null);
          mapRef.current?.flyTo([newReport.latitude, newReport.longitude], 17);
        }}
      />
    </div>
  );
}

export default MapPage;
