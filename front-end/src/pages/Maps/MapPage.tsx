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
} from "@/components/ui/shadcn-ui/map";
import { distanceMeters, fetchPlacesInBounds, type Place } from "@/lib/Osm";
import { useToast } from "@/components/ui/Toast";
import api from "@/context/apiClient";

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
import { VendorRoutePanel } from "@/components/maps/VendorRoutePanel";
import { RouteLayer } from "@/components/maps/RouteLayer";
import { MapPillNav, type MapToolId } from "@/components/maps/MapPillNav";
import { SearchModal } from "@/components/maps/SearchModal";
import {
  ReportMarker,
  type MapCivicReport,
} from "@/components/maps/ReportMarker";
import { CivicReportsMapPanel } from "@/components/maps/CivicReportsMapPanel";
import { CreateReportModal } from "@/components/maps/CreateReportModal";
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
import { cn } from "@/lib/utils";
import L from "leaflet";
import { useMapEvents } from "react-leaflet";
import {
  AlertCircle,
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
  const map = useMapEvents({
    click(e) {
      if (mode !== "none") {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
    moveend() {
      try {
        const center = map.getCenter();
        const bounds = map.getBounds();
        const corner = bounds.getNorthEast();
        const radius = distanceMeters(
          center.lat,
          center.lng,
          corner.lat,
          corner.lng,
        );
        const zoom = map.getZoom();
        onViewportChange(center.lat, center.lng, radius, zoom, bounds);
      } catch (err) {
        console.warn("[MapEventHandler] moveend: map not ready yet", err);
      }
    },
    zoomend() {
      try {
        const center = map.getCenter();
        const bounds = map.getBounds();
        const corner = bounds.getNorthEast();
        const radius = distanceMeters(
          center.lat,
          center.lng,
          corner.lat,
          corner.lng,
        );
        const zoom = map.getZoom();
        onViewportChange(center.lat, center.lng, radius, zoom, bounds);
      } catch (err) {
        console.warn("[MapEventHandler] zoomend: map not ready yet", err);
      }
    },
  });

  useEffect(() => {
    try {
      const container = map.getContainer();
      if (!container) return;
      const cursor =
        mode === "candidate"
          ? "crosshair"
          : mode === "waypoint"
            ? "cell"
            : mode === "report"
              ? "crosshair"
              : "";
      container.style.cursor = cursor;
      return () => {
        try {
          container.style.cursor = "";
        } catch {}
      };
    } catch (err) {
      console.warn("[MapEventHandler] cursor effect: map not ready", err);
    }
  }, [map, mode]);

  return null;
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
    setActiveTool((prev) => (prev === id ? null : id));
  };

  // ── Basemap mode (Default OSM vs Satellite) ────────────────────────────────
  const [basemapMode, setBasemapMode] = useState<"default" | "satellite">(
    "default",
  );

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
  const [isPersistedInDb, setIsPersistedInDb] = useState(false);

  // ── Layer toggles & Category filter ───────────────────────────────────────
  const [showMapsData, setShowMapsData] = useState(true);
  const [showLocivaData, setShowLocivaData] = useState(true);
  const [layerCategory, setLayerCategory] = useState<FilterCategory>("all");
  const [showPublicRoutes, setShowPublicRoutes] = useState(true);

  // ── Viewport-based Places & Businesses State (Bagian 1 & 2) ────────────────
  const [viewportPlaces, setViewportPlaces] = useState<Place[]>([]);
  const [viewportPlacesLoading, setViewportPlacesLoading] = useState(false);
  const [viewportPlacesError, setViewportPlacesError] = useState<string | null>(
    null,
  );
  const [isPlacesStale, setIsPlacesStale] = useState(false);

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

  const { analyze, isCandidateAnalyzing, getCandidateError } =
    useLocationAnalysis();

  const activeCandidate = candidates[activeCandidateId];

  // Isolated debounced candidate state (500ms debounce per candidate position/radius change)
  const [debouncedCandidates, setDebouncedCandidates] = useState<
    Record<CandidateId, CandidateData | null>
  >({
    A: null,
    B: null,
    C: null,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCandidates(candidates);
    }, 500);
    return () => clearTimeout(timer);
  }, [candidates]);

  // Track parameters of the last completed analysis per candidate to avoid duplicate fetches
  const lastAnalyzedParamsRef = useRef<
    Record<
      CandidateId,
      {
        lat: number;
        lng: number;
        radius: number;
        businessTypeId: string;
      } | null
    >
  >({
    A: null,
    B: null,
    C: null,
  });

  // Track request sequence per candidate to ignore stale out-of-order responses
  const candidateReqSeqRef = useRef<Record<CandidateId, number>>({
    A: 0,
    B: 0,
    C: 0,
  });

  // ── Mobile Vendor Routes ──────────────────────────────────────────────────
  const [activeWaypoints, setActiveWaypoints] = useState<RouteWaypoint[]>([]);
  const [routeCalculation, setRouteCalculation] =
    useState<RouteCalculationResult | null>(null);

  // ── Click mode: either placing candidate, waypoint, or report location ──────
  const clickMode = useMemo(():
    | "candidate"
    | "waypoint"
    | "report"
    | "none" => {
    if (pickingReportLocation) return "report";
    if (isRoutePanelOpen && activeTool === "routes") return "waypoint";
    if (selectedBusiness) return "candidate";
    return "none";
  }, [pickingReportLocation, isRoutePanelOpen, activeTool, selectedBusiness]);

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

  // ── Viewport-based Places Loader (Bagian 1, 2, & 7) ────────────────────────
  const viewportAbortRef = useRef<AbortController | null>(null);
  const viewportDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const loadViewportData = useCallback(
    (
      centerLat: number,
      centerLng: number,
      radiusMeters: number,
      zoom: number,
      bounds: L.LatLngBounds,
    ) => {
      // Clear pending timer
      if (viewportDebounceTimer.current) {
        clearTimeout(viewportDebounceTimer.current);
      }

      // Debounce viewport query to prevent spamming while panning
      viewportDebounceTimer.current = setTimeout(async () => {
        // 1. Always load LOCIVA businesses for the visible area
        fetchLocivaData(centerLat, centerLng, radiusMeters, bounds);

        // 2. Fetch OSM POIs if zoom level is detailed enough (zoom >= 13)
        // Guard against querying massive global areas that overload Overpass
        if (zoom < 13) {
          // If zoomed out, skip Overpass call to prevent 429/timeout
          return;
        }

        // Cancel any in-flight request BEFORE creating a new AbortController.
        // This prevents stale responses from overwriting fresh viewport results
        // (race condition when user pans quickly).
        viewportAbortRef.current?.abort();
        viewportAbortRef.current = new AbortController();
        // Capture the signal for THIS specific request.
        // If another pan fires before this completes, the ref is replaced and
        // our local `currentSignal` will be aborted by the next call.
        const currentSignal = viewportAbortRef.current.signal;

        setViewportPlacesLoading(true);
        setViewportPlacesError(null);

        // Restrict query to a maximum bbox span to avoid overloading Overpass
        // on very low zoom levels. At zoom >= 13 the viewport is already bounded.
        const south = bounds.getSouth();
        const west = bounds.getWest();
        const north = bounds.getNorth();
        const east = bounds.getEast();

        try {
          const places = await fetchPlacesInBounds(
            south,
            west,
            north,
            east,
            currentSignal,
          );
          setViewportPlaces(places);
          setIsPlacesStale(places.some((p) => p.isStale));
        } catch (err: any) {
          if (err?.name === "AbortError") return;
          console.warn("Failed to load viewport places:", err);
          setViewportPlacesError(
            "Unable to reach OpenStreetMap Overpass servers",
          );
          // If we already have places, preserve them and flag as stale (Bagian 7)
          if (viewportPlaces.length > 0) {
            setIsPlacesStale(true);
          }
        } finally {
          setViewportPlacesLoading(false);
        }
      }, 550);
    },
    [fetchLocivaData, viewportPlaces.length],
  );

  // Initial load: use a ~4km bounding box around the default center
  useEffect(() => {
    fetchLocivaData(center[0], center[1], 8000);
    fetchReports();
    const controller = new AbortController();
    // ~0.018° lat/lng ≈ ~2km half-span per side
    const halfSpan = 0.018;
    fetchPlacesInBounds(
      center[0] - halfSpan,
      center[1] - halfSpan,
      center[0] + halfSpan,
      center[1] + halfSpan,
      controller.signal,
    )
      .then((places) => setViewportPlaces(places))
      .catch(() => {});
    return () => controller.abort();
  }, [fetchLocivaData, center]);

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
  const persistCandidateToDatabase = useCallback(
    async (
      candidate: CandidateData,
      businessType: BusinessType,
      analysis?: AnalysisResult | null,
    ) => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        await api.post("/simulations/candidate", {
          candidate_id: candidate.id,
          latitude: candidate.lat,
          longitude: candidate.lng,
          radius_m: candidate.radius,
          business_type_id: businessType.id,
          session_name: `Simulation ${businessType.name}`,
          location_name: `Candidate Point ${candidate.id}`,
          scores: analysis
            ? {
                opportunity_score: analysis.opportunityScore,
                competition_score: analysis.competitionScore,
                accessibility_score: analysis.accessibilityScore,
                data_confidence: analysis.dataConfidence,
              }
            : undefined,
        });
        setIsPersistedInDb(true);
        toast({
          title: "Candidate Saved",
          description: "Location point saved to database successfully.",
          variant: "success",
        });
      } catch (err) {
        toast({
          title: "Failed to Save",
          description: "Please check your network connection or sign in again.",
          variant: "error",
        });
      }
    },
    [toast],
  );

  // ── Run isolated analysis per candidate whenever its debounced parameters change ──
  useEffect(() => {
    if (!selectedBusiness) return;

    (["A", "B", "C"] as CandidateId[]).forEach((id) => {
      const cand = debouncedCandidates[id];
      if (!cand) {
        // Candidate has no coordinates on the map, do not analyze
        return;
      }

      const last = lastAnalyzedParamsRef.current[id];
      const isParamIdentical =
        last !== null &&
        last.lat === cand.lat &&
        last.lng === cand.lng &&
        last.radius === cand.radius &&
        last.businessTypeId === selectedBusiness.id;

      // Skip if already analyzed with identical parameters and valid result exists
      if (isParamIdentical && analysisResults[id] !== null) {
        return;
      }

      // Mark these parameters as current
      lastAnalyzedParamsRef.current[id] = {
        lat: cand.lat,
        lng: cand.lng,
        radius: cand.radius,
        businessTypeId: selectedBusiness.id,
      };

      const thisSeq = ++candidateReqSeqRef.current[id];

      analyze(id, cand.lat, cand.lng, cand.radius, selectedBusiness).then(
        (res) => {
          // Strict guard: ensure response matches this candidate and is the latest sequence
          if (
            res &&
            res.candidateId === id &&
            thisSeq === candidateReqSeqRef.current[id]
          ) {
            setAnalysisResults((prev) => ({ ...prev, [id]: res }));
            fetchLocivaData(cand.lat, cand.lng, cand.radius * 1.5);
          }
        },
      );
    });
  }, [
    debouncedCandidates,
    selectedBusiness,
    analyze,
    fetchLocivaData,
    analysisResults,
  ]);

  // ── Event Handlers ─────────────────────────────────────────────────────────
  const handleSearchSelect = (lat: number, lng: number, name: string) => {
    setCenter([lat, lng]);
    mapRef.current?.flyTo([lat, lng], 15);
    toast({ title: "Location Found", description: name });
  };

  const handleBusinessSelect = (business: BusinessType) => {
    setSelectedBusiness(business);
    setIsPersistedInDb(false);
    setCandidates({ A: null, B: null, C: null });
    setDebouncedCandidates({ A: null, B: null, C: null });
    setAnalysisResults({ A: null, B: null, C: null });
    lastAnalyzedParamsRef.current = { A: null, B: null, C: null };
    candidateReqSeqRef.current = { A: 0, B: 0, C: 0 };
    setActiveCandidateId("A");
    setActiveTool("analysis");
    if (window.innerWidth < 768) setActiveTool(null);
    toast({
      title: `${business.name} Selected`,
      description: "Click anywhere on the map to place Candidate Point A.",
    });
  };

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (pickingReportLocation) {
        setSelectedReportCoords({ lat, lng });
        // Keep picking mode active so user can reposition — modal opens via button
        // Immediately open the modal with updated coords so UX is seamless
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
        const newCandidate: CandidateData = {
          id: activeCandidateId,
          lat,
          lng,
          radius:
            candidates[activeCandidateId]?.radius ||
            selectedBusiness.defaultRadius,
        };
        setCandidates((prev) => ({
          ...prev,
          [activeCandidateId]: newCandidate,
        }));
        // Invalidate previous result for this candidate slot
        setAnalysisResults((prev) => ({ ...prev, [activeCandidateId]: null }));
        setIsPersistedInDb(false);
        if (activeTool !== "analysis") setActiveTool("analysis");
      } else if (clickMode === "waypoint") {
        setActiveWaypoints((prev) => {
          const newPoint: RouteWaypoint = {
            lat,
            lng,
            name:
              prev.length === 0 ? "Starting Point" : `Stop ${prev.length + 1}`,
            stop_duration: prev.length === 0 ? 0 : 30,
          };
          return [...prev, newPoint];
        });
        setRouteCalculation(null);
        toast({
          title: "Waypoint Added",
          description: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        });
      }
    },
    [
      pickingReportLocation,
      clickMode,
      selectedBusiness,
      activeCandidateId,
      candidates,
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
      // Invalidate existing result immediately on coordinate change
      setAnalysisResults((prev) => ({ ...prev, [id]: null }));
      setActiveCandidateId(id);
      setIsPersistedInDb(false);
    },
    [],
  );

  const handleRadiusChange = useCallback(
    (radius: number) => {
      setCandidates((prev) => {
        const existing = prev[activeCandidateId];
        if (!existing) return prev;
        return { ...prev, [activeCandidateId]: { ...existing, radius } };
      });
      // Invalidate existing result immediately on radius change
      setAnalysisResults((prev) => ({ ...prev, [activeCandidateId]: null }));
    },
    [activeCandidateId],
  );

  const handleAddCandidate = () => {
    const nextAvailable = (["A", "B", "C"] as CandidateId[]).find(
      (id) => candidates[id] === null,
    );
    if (nextAvailable) {
      setActiveCandidateId(nextAvailable);
      toast({
        title: `Candidate ${nextAvailable}`,
        description: "Click map to set candidate location.",
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

  // ── Unified Places List (Viewport places + Candidate places) ──────────────
  const currentResult = analysisResults[activeCandidateId];
  const candidatePlaces = useMemo(
    () => currentResult?.allPlaces || [],
    [currentResult],
  );

  // Merge viewport places and candidate analysis places without duplicates
  const allExternalPlaces: Place[] = useMemo(() => {
    const mapById = new Map<string, Place>();
    for (const p of viewportPlaces) {
      mapById.set(p.id, p);
    }
    for (const p of candidatePlaces) {
      mapById.set(p.id, p);
    }
    return Array.from(mapById.values());
  }, [viewportPlaces, candidatePlaces]);

  // Category filtering
  const filteredExternalPlaces = useMemo(() => {
    if (!showMapsData) return [];
    if (layerCategory === "all") return allExternalPlaces;
    if (layerCategory === "school_campus") {
      return allExternalPlaces.filter(
        (p) => p.category === "school" || p.category === "campus",
      );
    }
    return allExternalPlaces.filter((p) => p.category === layerCategory);
  }, [allExternalPlaces, showMapsData, layerCategory]);

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

  // Deduplication check between internal and external places
  const { duplicateExternalIds, duplicateInternalIds } = useMemo(() => {
    const dupExt = new Set<string>();
    const dupInt = new Set<string>();
    filteredExternalPlaces.forEach((ext) => {
      filteredLocivaBusinesses.forEach((loc) => {
        if (
          distanceMeters(ext.lat, ext.lng, loc.latitude, loc.longitude) <= 65
        ) {
          dupExt.add(ext.id);
          dupInt.add(loc.id);
        }
      });
    });
    return { duplicateExternalIds: dupExt, duplicateInternalIds: dupInt };
  }, [filteredExternalPlaces, filteredLocivaBusinesses]);

  const candidateTabsData = (["A", "B", "C"] as CandidateId[]).map((id) => ({
    id,
    exists: candidates[id] !== null || id === activeCandidateId,
  }));

  const activeCount = Object.values(candidates).filter(
    (c) => c !== null,
  ).length;

  return (
    <div className="flex h-screen w-full overflow-hidden relative bg-canvas">
      {/* ── Global Search Modal (Bagian 1) ─────────────────────────────────── */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={handleSearchSelect}
      />

      {/* ── Main Interactive Map Canvas ────────────────────────────────────── */}
      <div className="flex-1 relative flex flex-col min-w-0">
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
        {activeTool && activeTool !== "search" && (
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
                showMapsData={showMapsData}
                onToggleMapsData={setShowMapsData}
                mapsCount={filteredExternalPlaces.length}
                mapsLoading={
                  viewportPlacesLoading ||
                  isCandidateAnalyzing(activeCandidateId)
                }
                mapsError={
                  viewportPlacesError || getCandidateError(activeCandidateId)
                }
                onRetryMaps={() => {
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
                      isAnalyzing={isCandidateAnalyzing(activeCandidateId)}
                      error={getCandidateError(activeCandidateId)}
                      radius={
                        candidates[activeCandidateId]?.radius ||
                        selectedBusiness.defaultRadius
                      }
                      onRadiusChange={handleRadiusChange}
                      isOpen={true}
                      onClose={() => setActiveTool(null)}
                      candidateExists={candidates[activeCandidateId] !== null}
                      isPersistedInDb={isPersistedInDb}
                      onSaveCandidate={handleSaveCandidate}
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
                  setSelectedReportCoords(
                    userLocation
                      ? { lat: userLocation.lat, lng: userLocation.lng }
                      : { lat: center[0], lng: center[1] },
                  );
                  setCreateReportModalOpen(true);
                }}
              />
            )}

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
                userLocation={userLocation}
              />
            )}
          </div>
        )}

        {/* ── Top-right Floating Map Controls (Icons, Not Emoji - Bagian 3) ── */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col items-end gap-2 pointer-events-none">
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
          </div>

          {/* Map Controls — Right Side */}
          <div className="pointer-events-none absolute right-4 top-35 z-[1000] flex -translate-y-1/2 flex-col gap-2">
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
        <div className="flex-1 relative z-0">
          <MapContainer
            ref={mapRef}
            center={center}
            zoom={14}
            className="w-full h-full"
          >
            {basemapMode === "satellite" ? (
              <MapTileLayer
                key="satellite"
                name="Satellite"
                rasterUrl={
                  (import.meta.env.VITE_SATELLITE_TILE_URL as string) ||
                  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                }
                rasterAttribution={
                  (import.meta.env.VITE_SATELLITE_ATTRIBUTION as string) ||
                  "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                }
                maxZoom={19}
              />
            ) : (
              <MapTileLayer
                key="default"
                name="Default"
                rasterUrl={
                  (import.meta.env.VITE_STANDARD_TILE_URL as string) ||
                  "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                }
                rasterAttribution={
                  (import.meta.env.VITE_STANDARD_ATTRIBUTION as string) ||
                  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }
                maxZoom={19}
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
            {userLocation && (
              <UserLocationMarker
                lat={userLocation.lat}
                lng={userLocation.lng}
                accuracy={userLocation.accuracy}
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

            <RouteLayer
              activeWaypoints={activeWaypoints}
              currentCalculation={routeCalculation}
              publicRoutes={showPublicRoutes ? publicRoutes : []}
              showPublicRoutes={showPublicRoutes}
            />

            <MapMarkerClusterGroup
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
            >
              {showMapsData &&
                filteredExternalPlaces.map((place) => (
                  <PoiMarker
                    key={`poi-${place.id}`}
                    place={place}
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

          {/* Prompt: Candidate placement mode */}
          {clickMode === "candidate" && activeCount === 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] bg-slate-900/90 text-white px-6 py-3 rounded-full font-semibold text-xs animate-bounce shadow-xl pointer-events-none border border-white/20 flex items-center gap-2">
              <Target size={16} className="text-primary" />
              <span>Click anywhere on the map to place Candidate Point A</span>
            </div>
          )}

          {/* Prompt: Waypoint placement mode */}
          {clickMode === "waypoint" && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[400] bg-emerald-800/95 text-white px-5 py-2.5 rounded-full font-medium text-xs shadow-lg pointer-events-none flex items-center gap-2 border border-white/20">
              <PenLine size={14} />
              <span>Click on the map to add route stop waypoints</span>
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

          {/* Stale Cache Notice Banner (Bagian 7) */}
          {isPlacesStale && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[380] bg-amber-500/90 text-white px-4 py-1.5 rounded-full text-[11px] font-medium shadow-md flex items-center gap-1.5 border border-amber-300/60">
              <AlertCircle size={13} />
              <span>Network limited: displaying cached spatial places</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Dynamic Map Legend ─────────────────────────────────────────────── */}
      <MapLegend
        showMapsData={showMapsData}
        showLocivaData={showLocivaData}
        showReportsData={showReportsLayer}
        mapsCount={filteredExternalPlaces.length}
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
