import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Map as MapContainer,
  MapTileLayer,
  MapZoomControl,
  MapMarkerClusterGroup,
} from "@/components/ui/shadcn-ui/map";
import { distanceMeters, fetchPlacesAround, type Place } from "@/lib/Osm";
import { useToast } from "@/components/ui/Toast";
import api from "@/context/apiClient";

import { BusinessCatalogPanel } from "@/components/maps/BusinessCatalogPanel";
import { CandidateMarker } from "@/components/maps/CandidateMarker";
import { AnalysisPanel } from "@/components/maps/AnalysisPanel";
import { SavedCandidatesPanel, type SavedCandidateItem } from "@/components/maps/SavedCandidatesPanel";
import { CompareCandidatesPanel } from "@/components/maps/CompareCandidatesPanel";
import { MapLegend } from "@/components/maps/MapLegend";
import { CandidateTabs } from "@/components/maps/CandidateTabs";
import type { CandidateId } from "@/components/maps/CandidateTabs";
import { UserLocationMarker } from "@/components/maps/UserLocationMarker";
import { PoiMarker } from "@/components/maps/PoiMarker";
import { InternalBusinessMarker, type LocivaBusiness } from "@/components/maps/InternalBusinessMarker";
import { DataSourceControl, type FilterCategory } from "@/components/maps/DataSourceControl";
import { VendorRoutePanel } from "@/components/maps/VendorRoutePanel";
import { RouteLayer } from "@/components/maps/RouteLayer";
import { MapPillNav, type MapToolId } from "@/components/maps/MapPillNav";
import { SearchModal } from "@/components/maps/SearchModal";

import type { BusinessType } from "@/lib/umkmCatalog";
import type { AnalysisResult } from "@/lib/analysisEngine";
import type { RouteWaypoint, RouteCalculationResult } from "@/lib/routing";
import { useLocationAnalysis } from "@/hooks/useLocationAnalysis";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import L from "leaflet";
import { useMapEvents } from "react-leaflet";
import {
  Map as MapIcon,
  Satellite,
  Navigation,
  Footprints,
  PenLine,
  CheckCircle2,
  Target,
  AlertCircle,
  Scale,
  X,
  BookOpen,
} from "lucide-react";

// ─── Map Ready Gate: delays children until Leaflet fires whenReady ─────────────
// This prevents "Cannot destructure property 'zoom' of 't0'" crashes that occur
// when MapZoomControl calls map.getZoom() synchronously before Leaflet initializes.
const MapReadyGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const map = useMapEvents({});
  const [isReady, setIsReady] = useState(() => {
    try { return (map as any)._loaded === true; } catch { return false; }
  });

  useEffect(() => {
    if ((map as any)._loaded) {
      setIsReady(true);
      return;
    }
    const onReady = () => setIsReady(true);
    map.whenReady(onReady);
    return () => { map.off("load", onReady); };
  }, [map]);

  return isReady ? <>{children}</> : null;
};

// ─── Map Event Handlers (Click & Viewport Pan/Zoom) ───────────────────────────
const MapEventHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
  onViewportChange: (centerLat: number, centerLng: number, radiusMeters: number, zoom: number, bounds: L.LatLngBounds) => void;
  mode: "candidate" | "waypoint" | "none";
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
        const radius = distanceMeters(center.lat, center.lng, corner.lat, corner.lng);
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
        const radius = distanceMeters(center.lat, center.lng, corner.lat, corner.lng);
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
      const cursor = mode === "candidate" ? "crosshair" : mode === "waypoint" ? "cell" : "";
      container.style.cursor = cursor;
      return () => { try { container.style.cursor = ""; } catch {} };
    } catch (err) {
      console.warn("[MapEventHandler] cursor effect: map not ready", err);
    }
  }, [map, mode]);

  return null;
};

// ─── Main MapPage Component ───────────────────────────────────────────────────
export function MapPage() {
  const [center, setCenter] = useState<[number, number]>([-7.9797, 112.6304]); // Default to Malang coordinates
  const mapRef = useRef<L.Map>(null);
  const { toast } = useToast();

  // ── Navigation / Panel tool state ──────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<MapToolId | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const isCatalogOpen = activeTool === "catalog";
  const isLayersOpen = activeTool === "layers";
  const isRoutePanelOpen = activeTool === "routes";
  const isAnalysisPanelOpen = activeTool === "analysis";

  const handleToolSelect = (id: MapToolId) => {
    if (id === "search") {
      setIsSearchOpen(true);
      return;
    }
    setActiveTool((prev) => (prev === id ? null : id));
  };

  // ── Basemap mode (Default OSM vs Satellite) ────────────────────────────────
  const [basemapMode, setBasemapMode] = useState<"default" | "satellite">("default");

  // ── User GPS Location ─────────────────────────────────────────────────────
  const [userLocation, setUserLocation] = useState<{
    lat: number; lng: number; accuracy?: number;
  } | null>(null);

  // ── UMKM Candidate Analysis ───────────────────────────────────────────────
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessType | null>(null);
  const [isPersistedInDb, setIsPersistedInDb] = useState(false);

  // ── Layer toggles & Category filter ───────────────────────────────────────
  const [showMapsData, setShowMapsData] = useState(true);
  const [showLocivaData, setShowLocivaData] = useState(true);
  const [layerCategory, setLayerCategory] = useState<FilterCategory>("all");
  const [showPublicRoutes, setShowPublicRoutes] = useState(true);

  // ── Viewport-based Places & Businesses State (Bagian 1 & 2) ────────────────
  const [viewportPlaces, setViewportPlaces] = useState<Place[]>([]);
  const [viewportPlacesLoading, setViewportPlacesLoading] = useState(false);
  const [viewportPlacesError, setViewportPlacesError] = useState<string | null>(null);
  const [isPlacesStale, setIsPlacesStale] = useState(false);

  const [locivaBusinesses, setLocivaBusinesses] = useState<LocivaBusiness[]>([]);
  const [locivaLoading, setLocivaLoading] = useState(false);
  const [locivaError, setLocivaError] = useState<string | null>(null);

  // ── Public vendor routes (shared by community vendors) ───────────────────
  const [publicRoutes, setPublicRoutes] = useState<any[]>([]);

  // ── Candidate points A, B, C ──────────────────────────────────────────────
  interface CandidateData {
    id: CandidateId;
    lat: number;
    lng: number;
    radius: number;
  }

  const [candidates, setCandidates] = useState<Record<CandidateId, CandidateData | null>>({
    A: null, B: null, C: null,
  });
  const [activeCandidateId, setActiveCandidateId] = useState<CandidateId>("A");
  const [analysisResults, setAnalysisResults] = useState<Record<CandidateId, AnalysisResult | null>>({
    A: null, B: null, C: null,
  });

  const { analyze, isAnalyzing, error: analysisError } = useLocationAnalysis();

  const activeCandidate = candidates[activeCandidateId];
  const debouncedLat    = useDebounce(activeCandidate?.lat, 600);
  const debouncedLng    = useDebounce(activeCandidate?.lng, 600);
  const debouncedRadius = useDebounce(activeCandidate?.radius, 600);

  // ── Mobile Vendor Routes ──────────────────────────────────────────────────
  const [activeWaypoints, setActiveWaypoints] = useState<RouteWaypoint[]>([]);
  const [routeCalculation, setRouteCalculation] = useState<RouteCalculationResult | null>(null);

  // ── Click mode: either placing candidate or placing waypoint ──────────────
  const clickMode = useMemo((): "candidate" | "waypoint" | "none" => {
    if (isRoutePanelOpen && activeTool === "routes") return "waypoint";
    if (selectedBusiness) return "candidate";
    return "none";
  }, [isRoutePanelOpen, activeTool, selectedBusiness]);

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
        description: "Opt-in GPS sharing was disabled. Location marker removed from map.",
      });
      return;
    }

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      toast({
        title: "Geolocation Unavailable",
        description: "Your device or browser does not support GPS location access.",
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
          description: "Your location is visible on the map. Click again anytime to disable sharing.",
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
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, [isLocationOptedIn, toast]);

  // ── Fetch LOCIVA internal businesses with bounding box / radius ───────────
  const fetchLocivaData = useCallback(async (
    lat?: number,
    lng?: number,
    radius?: number,
    bounds?: L.LatLngBounds
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
  }, []);

  // ── Viewport-based Places Loader (Bagian 1, 2, & 7) ────────────────────────
  const viewportAbortRef = useRef<AbortController | null>(null);
  const viewportDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadViewportData = useCallback(
    (centerLat: number, centerLng: number, radiusMeters: number, zoom: number, bounds: L.LatLngBounds) => {
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

        viewportAbortRef.current?.abort();
        viewportAbortRef.current = new AbortController();

        setViewportPlacesLoading(true);
        setViewportPlacesError(null);

        // Restrict Overpass radius between 800m and 3500m for responsiveness
        const safeRadius = Math.min(3500, Math.max(800, radiusMeters));

        try {
          const places = await fetchPlacesAround(
            centerLat,
            centerLng,
            safeRadius,
            viewportAbortRef.current.signal
          );
          setViewportPlaces(places);
          setIsPlacesStale(places.some((p) => p.isStale));
        } catch (err: any) {
          if (err?.name === "AbortError") return;
          console.warn("Failed to load viewport places:", err);
          setViewportPlacesError("Unable to reach OpenStreetMap Overpass servers");
          // If we already have places, preserve them and flag as stale (Bagian 7)
          if (viewportPlaces.length > 0) {
            setIsPlacesStale(true);
          }
        } finally {
          setViewportPlacesLoading(false);
        }
      }, 550);
    },
    [fetchLocivaData, viewportPlaces.length]
  );

  // Initial load around center
  useEffect(() => {
    fetchLocivaData(center[0], center[1], 8000);
    const controller = new AbortController();
    fetchPlacesAround(center[0], center[1], 2500, controller.signal)
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
    async (candidate: CandidateData, businessType: BusinessType, analysis?: AnalysisResult | null) => {
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
    [toast]
  );

  // ── Run analysis when candidate debounced position changes ────────────────
  useEffect(() => {
    if (selectedBusiness && debouncedLat && debouncedLng && debouncedRadius) {
      const runAnalysis = async () => {
        const res = await analyze(
          activeCandidateId, debouncedLat, debouncedLng, debouncedRadius, selectedBusiness
        );
        if (res) {
          setAnalysisResults((prev) => ({ ...prev, [activeCandidateId]: res }));
          fetchLocivaData(debouncedLat, debouncedLng, debouncedRadius * 1.5);
        }
      };
      runAnalysis();
    }
  }, [
    debouncedLat, debouncedLng, debouncedRadius, selectedBusiness,
    activeCandidateId, analyze, fetchLocivaData,
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
    setAnalysisResults({ A: null, B: null, C: null });
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
      if (clickMode === "candidate" && selectedBusiness) {
        const newCandidate: CandidateData = {
          id: activeCandidateId,
          lat, lng,
          radius: candidates[activeCandidateId]?.radius || selectedBusiness.defaultRadius,
        };
        setCandidates((prev) => ({ ...prev, [activeCandidateId]: newCandidate }));
        setIsPersistedInDb(false);
        if (activeTool !== "analysis") setActiveTool("analysis");
      } else if (clickMode === "waypoint") {
        setActiveWaypoints((prev) => {
          const newPoint: RouteWaypoint = {
            lat, lng,
            name: prev.length === 0 ? "Starting Point" : `Stop ${prev.length + 1}`,
            stop_duration: prev.length === 0 ? 0 : 30,
          };
          return [...prev, newPoint];
        });
        setRouteCalculation(null);
        toast({ title: "Waypoint Added", description: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      }
    },
    [clickMode, selectedBusiness, activeCandidateId, candidates, activeTool, toast]
  );

  const handleMarkerDragEnd = useCallback(
    (id: CandidateId, lat: number, lng: number) => {
      setCandidates((prev) => {
        const existing = prev[id];
        if (!existing) return prev;
        return { ...prev, [id]: { ...existing, lat, lng } };
      });
      setActiveCandidateId(id);
      setIsPersistedInDb(false);
    },
    []
  );

  const handleRadiusChange = useCallback(
    (radius: number) => {
      setCandidates((prev) => {
        const existing = prev[activeCandidateId];
        if (!existing) return prev;
        return { ...prev, [activeCandidateId]: { ...existing, radius } };
      });
    },
    [activeCandidateId]
  );

  const handleAddCandidate = () => {
    const nextAvailable = (["A", "B", "C"] as CandidateId[]).find((id) => candidates[id] === null);
    if (nextAvailable) {
      setActiveCandidateId(nextAvailable);
      toast({ title: `Candidate ${nextAvailable}`, description: "Click map to set candidate location." });
    }
  };

  const handleSaveCandidate = () => {
    const cand = candidates[activeCandidateId];
    if (!cand || !selectedBusiness) return;
    persistCandidateToDatabase(cand, selectedBusiness, analysisResults[activeCandidateId]);
  };

  // ── Unified Places List (Viewport places + Candidate places) ──────────────
  const currentResult = analysisResults[activeCandidateId];
  const candidatePlaces = useMemo(() => currentResult?.allPlaces || [], [currentResult]);

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
      return allExternalPlaces.filter((p) => p.category === "school" || p.category === "campus");
    }
    return allExternalPlaces.filter((p) => p.category === layerCategory);
  }, [allExternalPlaces, showMapsData, layerCategory]);

  const filteredLocivaBusinesses = useMemo(() => {
    if (!showLocivaData) return [];
    if (layerCategory === "all") return locivaBusinesses;
    return locivaBusinesses.filter((b) => {
      const slug = b.business_type?.slug || "";
      if (layerCategory === "cafe") return slug.includes("kopi") || slug.includes("cafe");
      if (layerCategory === "food") return slug.includes("makan") || slug.includes("bakso") || slug.includes("seblak") || slug.includes("food");
      if (layerCategory === "retail") return slug.includes("kelontong") || slug.includes("market") || slug.includes("mart");
      if (layerCategory === "service") return slug.includes("laundry") || slug.includes("barbershop") || slug.includes("service");
      return true;
    });
  }, [locivaBusinesses, showLocivaData, layerCategory]);

  // Deduplication check between internal and external places
  const { duplicateExternalIds, duplicateInternalIds } = useMemo(() => {
    const dupExt = new Set<string>();
    const dupInt = new Set<string>();
    filteredExternalPlaces.forEach((ext) => {
      filteredLocivaBusinesses.forEach((loc) => {
        if (distanceMeters(ext.lat, ext.lng, loc.latitude, loc.longitude) <= 65) {
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

  const activeCount = Object.values(candidates).filter((c) => c !== null).length;

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
              "left-20 top-6 bottom-6 w-[22rem]",
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
                mapsLoading={viewportPlacesLoading || isAnalyzing}
                mapsError={viewportPlacesError || analysisError}
                onRetryMaps={() => {
                  if (activeCandidate && selectedBusiness) {
                    analyze(activeCandidate.id, activeCandidate.lat, activeCandidate.lng, activeCandidate.radius, selectedBusiness);
                  }
                  const map = mapRef.current;
                  if (map) {
                    const c = map.getCenter();
                    const b = map.getBounds();
                    const r = distanceMeters(c.lat, c.lng, b.getNorthEast().lat, b.getNorthEast().lng);
                    loadViewportData(c.lat, c.lng, r, map.getZoom(), b);
                  }
                }}
                showLocivaData={showLocivaData}
                onToggleLocivaData={setShowLocivaData}
                locivaCount={filteredLocivaBusinesses.length}
                locivaLoading={locivaLoading}
                locivaError={locivaError}
                onRetryLociva={() => fetchLocivaData(center[0], center[1], 8000)}
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

            {activeTool === "analysis" && (
              selectedBusiness ? (
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
                      radius={candidates[activeCandidateId]?.radius || selectedBusiness.defaultRadius}
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
                        <h3 className="font-display font-bold text-base text-ink">Location Analysis</h3>
                        <p className="text-xs text-muted">Spatial feasibility scoring</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setActiveTool(null)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
                    <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <BookOpen size={26} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-ink mb-1">Choose a Business Type First</h4>
                      <p className="text-xs text-muted leading-relaxed max-w-xs">
                        Open the <strong>Catalog</strong> (first item in the nav), pick the type of business you want to open, then click a spot on the map to place Candidate A.
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
              )
            )}

            {activeTool === "compare" && (
              <CompareCandidatesPanel
                isOpen={true}
                onClose={() => setActiveTool(null)}
                results={analysisResults}
                activeCandidates={(["A", "B", "C"] as CandidateId[]).filter((id) => candidates[id] !== null)}
                onFlyToCandidate={(id) => {
                  const cand = candidates[id];
                  if (cand) {
                    mapRef.current?.flyTo([cand.lat, cand.lng], 16);
                    setActiveCandidateId(id);
                  }
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
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 pointer-events-none">
          {/* Basemap Switcher */}
          <div className="pointer-events-auto flex items-center bg-white/95 backdrop-blur-xs rounded-2xl border border-slate-200/80 shadow-md text-xs font-semibold overflow-hidden p-1">
            <button
              type="button"
              onClick={() => setBasemapMode("default")}
              className={cn(
                "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer",
                basemapMode === "default" ? "bg-primary text-white shadow-xs font-bold" : "text-muted hover:text-ink"
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
                basemapMode === "satellite" ? "bg-primary text-white shadow-xs font-bold" : "text-muted hover:text-ink"
              )}
              title="Satellite Imagery (Esri)"
            >
              <Satellite size={14} />
              <span className="hidden sm:inline">Satellite</span>
            </button>
          </div>

          {/* Privacy-Aware Opt-in GPS Location Button (Section 6) */}
          <button
            type="button"
            onClick={handleToggleOptInLocation}
            title={isLocationOptedIn ? "Stop sharing live location (Click to disable)" : "Share live location (Opt-in GPS)"}
            className={cn(
              "pointer-events-auto p-3 backdrop-blur-xs rounded-2xl shadow-md transition-all flex items-center justify-center cursor-pointer active:scale-95",
              isLocationOptedIn
                ? "bg-blue-600 text-white border border-blue-500 shadow-blue-200"
                : "bg-white/95 hover:bg-white text-primary border border-slate-200/80"
            )}
          >
            <Navigation size={18} className={cn(isLocating && "animate-spin")} />
          </button>

          {/* Shared Public Routes Toggle */}
          <button
            type="button"
            onClick={() => setShowPublicRoutes((v) => !v)}
            title={showPublicRoutes ? "Hide community public routes" : "Show community public routes"}
            className={cn(
              "pointer-events-auto p-3 bg-white/95 backdrop-blur-xs border border-slate-200/80 rounded-2xl shadow-md transition-all flex items-center justify-center cursor-pointer active:scale-95",
              showPublicRoutes ? "text-emerald-600 border-emerald-200 bg-emerald-50/50" : "text-muted hover:text-ink"
            )}
          >
            <Footprints size={18} />
          </button>
        </div>


        {/* ── Leaflet Map Viewport ─────────────────────────────────────────── */}
        <div className="flex-1 relative z-0">
          <MapContainer ref={mapRef} center={center} zoom={14} className="w-full h-full">
            {basemapMode === "satellite" ? (
              <MapTileLayer
                key="satellite"
                name="Satellite"
                rasterUrl="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                rasterAttribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
              />
            ) : (
              <MapTileLayer key="default" name="Default" />
            )}

            <MapReadyGate>
              <MapZoomControl position="bottom-24 right-4 md:bottom-8 md:right-4" />

              {/* Viewport panning/zooming and click event listener */}
              <MapEventHandler
                onMapClick={handleMapClick}
                onViewportChange={loadViewportData}
                mode={clickMode}
              />
            </MapReadyGate>

            {/* User GPS location marker */}
            {userLocation && (
              <UserLocationMarker lat={userLocation.lat} lng={userLocation.lng} accuracy={userLocation.accuracy} />
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

            {/* Route Layer */}
            <RouteLayer
              activeWaypoints={activeWaypoints}
              currentCalculation={routeCalculation}
              publicRoutes={showPublicRoutes ? publicRoutes : []}
              showPublicRoutes={showPublicRoutes}
            />

            {/* Clustered POIs and LOCIVA Businesses Group (Rendered without needing candidate) */}
            <MapMarkerClusterGroup spiderfyOnMaxZoom={true} showCoverageOnHover={false}>
              {showMapsData &&
                filteredExternalPlaces.map((place) => (
                  <PoiMarker
                    key={`poi-${place.id}`}
                    place={place}
                    distanceFromCandidate={
                      activeCandidate
                        ? distanceMeters(activeCandidate.lat, activeCandidate.lng, place.lat, place.lng)
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
                        ? distanceMeters(activeCandidate.lat, activeCandidate.lng, biz.latitude, biz.longitude)
                        : undefined
                    }
                    isDuplicateWithExternal={duplicateInternalIds.has(biz.id)}
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
        mapsCount={filteredExternalPlaces.length}
        locivaCount={filteredLocivaBusinesses.length}
        activeCandidateCount={activeCount}
        basemapMode={basemapMode}
        isStale={isPlacesStale}
      />
    </div>
  );
}

export default MapPage;
