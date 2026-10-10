import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Map,
  MapTileLayer,
  MapZoomControl,
  MapLocateControl,
  MapMarkerClusterGroup,
} from "@/components/ui/shadcn-ui/map";
import { geocode, distanceMeters, type Place } from "@/lib/Osm";
import { useToast } from "@/components/ui/Toast";
import api from "@/context/apiClient";

import { BusinessCatalogPanel } from "@/components/maps/BusinessCatalogPanel";
import { CandidateMarker } from "@/components/maps/CandidateMarker";
import { AnalysisPanel } from "@/components/maps/AnalysisPanel";
import { ComparisonTable } from "@/components/maps/ComparisonTable";
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

// ─── Click Handler ────────────────────────────────────────────────────────────
const MapClickHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
  mode: "candidate" | "waypoint" | "none";
}> = ({ onMapClick, mode }) => {
  const map = useMapEvents({
    click(e) {
      if (mode !== "none") {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  useEffect(() => {
    const cursor = mode === "candidate" ? "crosshair" : mode === "waypoint" ? "cell" : "";
    map.getContainer().style.cursor = cursor;
    return () => { map.getContainer().style.cursor = ""; };
  }, [map, mode]);

  return null;
};

// ─── Component ────────────────────────────────────────────────────────────────
export function MapPage() {
  const [center, setCenter] = useState<[number, number]>([-7.9797, 112.6304]); // Malang default
  const mapRef = useRef<L.Map>(null);
  const { toast } = useToast();

  // ── Navigation / panel state ──────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<MapToolId | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Derived panel visibility from activeTool
  const isCatalogOpen   = activeTool === "catalog";
  const isLayersOpen    = activeTool === "layers";
  const isRoutePanelOpen = activeTool === "routes";
  const isAnalysisPanelOpen = activeTool === "analysis";

  const handleToolSelect = (id: MapToolId) => {
    if (id === "search") {
      setIsSearchOpen(true);
      return;
    }
    setActiveTool((prev) => (prev === id ? null : id));
  };

  // ── Basemap ───────────────────────────────────────────────────────────────
  const [basemapMode, setBasemapMode] = useState<"default" | "satellite">("default");

  // ── User GPS Location ─────────────────────────────────────────────────────
  const [userLocation, setUserLocation] = useState<{
    lat: number; lng: number; accuracy?: number;
  } | null>(null);

  // ── UMKM Candidate Analysis ───────────────────────────────────────────────
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessType | null>(null);
  const [isPersistedInDb, setIsPersistedInDb] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // ── Layer toggles ─────────────────────────────────────────────────────────
  const [showMapsData, setShowMapsData] = useState(true);
  const [showLocivaData, setShowLocivaData] = useState(true);
  const [layerCategory, setLayerCategory] = useState<FilterCategory>("all");
  const [showPublicRoutes, setShowPublicRoutes] = useState(true);

  // ── LOCIVA Internal Businesses ────────────────────────────────────────────
  const [locivaBusinesses, setLocivaBusinesses] = useState<LocivaBusiness[]>([]);
  const [locivaLoading, setLocivaLoading] = useState(false);
  const [locivaError, setLocivaError] = useState<string | null>(null);

  // ── Public vendor routes (shared by other users) ──────────────────────────
  const [publicRoutes, setPublicRoutes] = useState<any[]>([]);

  // ── Candidates ────────────────────────────────────────────────────────────
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

  // ── Click mode: either placing candidate or placing waypoint ─────────────
  const clickMode = useMemo((): "candidate" | "waypoint" | "none" => {
    if (isRoutePanelOpen && activeTool === "routes") return "waypoint";
    if (selectedBusiness) return "candidate";
    return "none";
  }, [isRoutePanelOpen, activeTool, selectedBusiness]);

  // ── Auto-geolocation on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng, accuracy: pos.coords.accuracy });
          setCenter([lat, lng]);
          mapRef.current?.flyTo([lat, lng], 15);
        },
        (err) => console.info("Geolocation info:", err.message),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    }
  }, []);

  // ── Fetch LOCIVA businesses ───────────────────────────────────────────────
  const fetchLocivaData = useCallback(async (lat?: number, lng?: number, radius?: number) => {
    setLocivaLoading(true);
    setLocivaError(null);
    try {
      const params: Record<string, any> = { limit: 100 };
      if (lat !== undefined && lng !== undefined) {
        params.lat = lat; params.lng = lng; params.radius = radius || 5000;
      }
      const res = await api.get("/businesses/map", { params });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setLocivaBusinesses(res.data.data);
      } else {
        setLocivaBusinesses([]);
      }
    } catch (err: any) {
      console.warn("Gagal memuat data internal LOCIVA:", err);
      setLocivaError("Gagal memuat data internal");
    } finally {
      setLocivaLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocivaData(center[0], center[1], 10000);
  }, [fetchLocivaData, center]);

  // ── Fetch public shared routes ────────────────────────────────────────────
  const fetchPublicRoutes = useCallback(async () => {
    try {
      const res = await api.get("/vendor-routes/public");
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setPublicRoutes(res.data.data);
      }
    } catch (err) {
      console.warn("Gagal memuat rute publik:", err);
    }
  }, []);

  useEffect(() => {
    fetchPublicRoutes();
  }, [fetchPublicRoutes]);

  // ── Persist candidate explicitly (no auto-save on drag) ──────────────────
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
          session_name: `Simulasi ${businessType.name}`,
          location_name: `Titik Kandidat ${candidate.id}`,
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
        toast({ title: "Kandidat Tersimpan", description: "Titik lokasi berhasil disimpan ke database.", variant: "success" });
      } catch (err) {
        toast({ title: "Gagal Menyimpan", description: "Periksa koneksi atau coba login ulang.", variant: "error" });
      }
    },
    [toast]
  );

  // ── Run analysis when debounced position changes (no DB persist here) ─────
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearchSelect = (lat: number, lng: number, name: string) => {
    setCenter([lat, lng]);
    mapRef.current?.flyTo([lat, lng], 15);
    toast({ title: "Lokasi ditemukan", description: name });
  };

  const handleCenterToUserLocation = () => {
    if (userLocation) {
      mapRef.current?.flyTo([userLocation.lat, userLocation.lng], 16);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng, accuracy: pos.coords.accuracy });
          mapRef.current?.flyTo([lat, lng], 16);
        },
        () => toast({ title: "GPS Tidak Tersedia", variant: "error" })
      );
    }
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
      title: `${business.name} dipilih`,
      description: "Klik pada peta untuk menempatkan titik kandidat",
    });
  };

  // Map click → place candidate OR add waypoint depending on mode
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
        setShowComparison(false);
      } else if (clickMode === "waypoint") {
        // Add waypoint at clicked position
        setActiveWaypoints((prev) => {
          const newPoint: RouteWaypoint = {
            lat, lng,
            name: prev.length === 0 ? "Titik Awal" : `Pemberhentian ${prev.length + 1}`,
            stop_duration: prev.length === 0 ? 0 : 30,
          };
          return [...prev, newPoint];
        });
        setRouteCalculation(null);
        toast({ title: "Titik ditambahkan", description: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
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
      // No auto-persist — user must click "Simpan Kandidat" explicitly
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
      toast({ title: `Kandidat ${nextAvailable}`, description: "Klik peta untuk menempatkan titik." });
    }
  };

  // ── Explicit candidate save ───────────────────────────────────────────────
  const handleSaveCandidate = () => {
    const cand = candidates[activeCandidateId];
    if (!cand || !selectedBusiness) return;
    persistCandidateToDatabase(cand, selectedBusiness, analysisResults[activeCandidateId]);
  };

  // ── Filtered layers ───────────────────────────────────────────────────────
  const currentResult = analysisResults[activeCandidateId];
  const externalPlaces: Place[] = useMemo(() => currentResult?.allPlaces || [], [currentResult]);

  const filteredExternalPlaces = useMemo(() => {
    if (!showMapsData) return [];
    if (layerCategory === "all") return externalPlaces;
    if (layerCategory === "school_campus")
      return externalPlaces.filter((p) => p.category === "school" || p.category === "campus");
    return externalPlaces.filter((p) => p.category === layerCategory);
  }, [externalPlaces, showMapsData, layerCategory]);

  const filteredLocivaBusinesses = useMemo(() => {
    if (!showLocivaData) return [];
    if (layerCategory === "all") return locivaBusinesses;
    return locivaBusinesses.filter((b) => {
      const slug = b.business_type?.slug || "";
      if (layerCategory === "cafe") return slug.includes("kopi") || slug.includes("cafe");
      if (layerCategory === "food") return slug.includes("makan") || slug.includes("bakso") || slug.includes("seblak");
      if (layerCategory === "retail") return slug.includes("kelontong") || slug.includes("market");
      if (layerCategory === "service") return slug.includes("laundry") || slug.includes("barbershop");
      return true;
    });
  }, [locivaBusinesses, showLocivaData, layerCategory]);

  const { duplicateExternalIds, duplicateInternalIds } = useMemo(() => {
    const dupExt = new Set<string>();
    const dupInt = new Set<string>();
    externalPlaces.forEach((ext) => {
      locivaBusinesses.forEach((loc) => {
        if (distanceMeters(ext.lat, ext.lng, loc.latitude, loc.longitude) <= 65) {
          dupExt.add(ext.id);
          dupInt.add(loc.id);
        }
      });
    });
    return { duplicateExternalIds: dupExt, duplicateInternalIds: dupInt };
  }, [externalPlaces, locivaBusinesses]);

  const candidateTabsData = (["A", "B", "C"] as CandidateId[]).map((id) => ({
    id,
    exists: candidates[id] !== null || id === activeCandidateId,
  }));

  const activeCount = Object.values(candidates).filter((c) => c !== null).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-full overflow-hidden relative bg-canvas">

      {/* ── Search Modal ─────────────────────────────────────────────────── */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={handleSearchSelect}
      />

      {/* ── Left Side: Business Catalog Panel (slides in) ────────────────── */}
      <div className={cn(
        "fixed md:static inset-y-0 left-0 z-[500] transition-all duration-300 flex-shrink-0",
        isCatalogOpen ? "w-full md:w-80 translate-x-0" : "w-0 -translate-x-full md:translate-x-0"
      )}>
        {isCatalogOpen && (
          <BusinessCatalogPanel
            isOpen={isCatalogOpen}
            onClose={() => setActiveTool(null)}
            selectedTypeId={selectedBusiness?.id || null}
            onSelect={handleBusinessSelect}
          />
        )}
      </div>

      {/* ── Left Side: Vendor Route Panel (slides in) ────────────────────── */}
      <div className={cn(
        "fixed md:static inset-y-0 left-0 z-[500] transition-all duration-300 flex-shrink-0",
        isRoutePanelOpen ? "w-full md:w-96 translate-x-0" : "w-0 -translate-x-full md:translate-x-0"
      )}>
        {isRoutePanelOpen && (
          <VendorRoutePanel
            isOpen={isRoutePanelOpen}
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

      {/* ── Map Area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 relative flex flex-col min-w-0">

        {/* ── Pill Navigation (left center) ────────────────────────────── */}
        <MapPillNav
          active={activeTool}
          onSelect={handleToolSelect}
          analysisEnabled={!!selectedBusiness}
        />

        {/* ── Top-right overlay controls ────────────────────────────────── */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 pointer-events-none">
          {/* Basemap switcher */}
          <div className="pointer-events-auto flex items-center bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm text-xs font-semibold overflow-hidden">
            <button
              type="button"
              onClick={() => setBasemapMode("default")}
              className={cn(
                "px-3 py-2 transition-all flex items-center gap-1.5 cursor-pointer",
                basemapMode === "default" ? "bg-primary text-white" : "text-muted hover:text-ink"
              )}
              title="Peta Standar (OSM)"
            >
              <span className="text-base leading-none">🗺</span>
              <span className="hidden sm:inline">Peta</span>
            </button>
            <button
              type="button"
              onClick={() => setBasemapMode("satellite")}
              className={cn(
                "px-3 py-2 transition-all flex items-center gap-1.5 cursor-pointer",
                basemapMode === "satellite" ? "bg-primary text-white" : "text-muted hover:text-ink"
              )}
              title="Citra Satelit (Esri)"
            >
              <span className="text-base leading-none">🛰</span>
              <span className="hidden sm:inline">Satelit</span>
            </button>
          </div>

          {/* GPS / Locate me */}
          <button
            type="button"
            onClick={handleCenterToUserLocation}
            title="Ke Lokasi Saya (GPS)"
            className="pointer-events-auto p-3 bg-white/90 backdrop-blur-sm hover:bg-white border border-slate-200 text-primary rounded-xl shadow-sm transition-colors flex items-center justify-center cursor-pointer"
          >
            <span className="text-lg leading-none">📍</span>
          </button>

          {/* Shared routes toggle */}
          <button
            type="button"
            onClick={() => setShowPublicRoutes((v) => !v)}
            title={showPublicRoutes ? "Sembunyikan rute publik" : "Tampilkan rute publik pengguna lain"}
            className={cn(
              "pointer-events-auto p-3 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm transition-colors flex items-center justify-center cursor-pointer text-lg leading-none",
              showPublicRoutes ? "text-emerald-600 border-emerald-200" : "text-muted hover:text-ink"
            )}
          >
            🚶
          </button>
        </div>

        {/* ── Layers / DataSource panel (triggered by "layers" tool) ───── */}
        {isLayersOpen && (
          <DataSourceControl
            showMapsData={showMapsData}
            onToggleMapsData={setShowMapsData}
            mapsCount={filteredExternalPlaces.length}
            mapsLoading={isAnalyzing}
            mapsError={analysisError}
            onRetryMaps={() => {
              if (activeCandidate && selectedBusiness)
                analyze(activeCandidate.id, activeCandidate.lat, activeCandidate.lng, activeCandidate.radius, selectedBusiness);
            }}
            showLocivaData={showLocivaData}
            onToggleLocivaData={setShowLocivaData}
            locivaCount={filteredLocivaBusinesses.length}
            locivaLoading={locivaLoading}
            locivaError={locivaError}
            onRetryLociva={() => fetchLocivaData(center[0], center[1], 5000)}
            selectedCategory={layerCategory}
            onSelectCategory={setLayerCategory}
            isOpen={isLayersOpen}
            onToggleOpen={() => setActiveTool(null)}
          />
        )}

        {/* ── Map Container ─────────────────────────────────────────────── */}
        <div className="flex-1 relative z-0">
          <Map ref={mapRef} center={center} zoom={14} className="w-full h-full">
            {/* Basemap tile */}
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

            <MapZoomControl position="bottom-24 right-4 md:bottom-8 md:right-4" />

            <MapClickHandler onMapClick={handleMapClick} mode={clickMode} />

            {/* User GPS marker */}
            {userLocation && (
              <UserLocationMarker lat={userLocation.lat} lng={userLocation.lng} accuracy={userLocation.accuracy} />
            )}

            {/* Candidate markers */}
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

            {/* Route Layer (active waypoints + polyline + public routes) */}
            <RouteLayer
              activeWaypoints={activeWaypoints}
              currentCalculation={routeCalculation}
              publicRoutes={showPublicRoutes ? publicRoutes : []}
              showPublicRoutes={showPublicRoutes}
            />

            {/* POI + Internal cluster group */}
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
          </Map>

          {/* Center hint: candidate placement */}
          {clickMode === "candidate" && activeCount === 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] bg-black/75 text-white px-6 py-3 rounded-full font-medium text-sm animate-bounce shadow-lg pointer-events-none border border-white/20">
              Klik peta untuk menempatkan Titik Kandidat A
            </div>
          )}

          {/* Center hint: waypoint placement */}
          {clickMode === "waypoint" && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[400] bg-emerald-700/90 text-white px-5 py-2 rounded-full font-medium text-xs shadow-lg pointer-events-none flex items-center gap-2">
              <span>🖊</span> Klik peta untuk menambah titik rute
            </div>
          )}

          {/* Active business badge (top center) */}
          {selectedBusiness && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
              <div className="clay-primary text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1.5">
                <span>{selectedBusiness.name}</span>
                {isPersistedInDb && <span title="Tersimpan">✅</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Side: Analysis Panel ────────────────────────────────────── */}
      {selectedBusiness && (
        <div className={cn(
          "fixed md:static inset-y-0 right-0 z-[450] flex flex-col transition-all duration-300",
          isAnalysisPanelOpen ? "w-full md:w-96 translate-x-0" : "translate-x-full md:translate-x-0 md:w-0 md:hidden"
        )}>
          <div className="h-full w-full bg-surface shadow-[-4px_0_20px_rgba(0,0,0,0.05)] border-l border-slate-200 flex flex-col">
            {/* Candidate tabs header */}
            <div className="p-4 border-b border-slate-200 shrink-0">
              <CandidateTabs
                candidates={candidateTabsData}
                activeId={activeCandidateId}
                onChange={(id) => {
                  setActiveCandidateId(id);
                  if (candidates[id]) setActiveTool("analysis");
                }}
                onAdd={handleAddCandidate}
              />
              {activeCount > 1 && (
                <button
                  onClick={() => setShowComparison(!showComparison)}
                  className="w-full py-2 mt-2 bg-slate-100 hover:bg-slate-200 text-ink rounded-lg font-bold text-sm transition-colors cursor-pointer"
                >
                  {showComparison ? "Sembunyikan Perbandingan" : "Bandingkan Kandidat"}
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
                isOpen={isAnalysisPanelOpen}
                onClose={() => setActiveTool(null)}
                candidateExists={candidates[activeCandidateId] !== null}
                isPersistedInDb={isPersistedInDb}
                onSaveCandidate={handleSaveCandidate}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Comparison Bottom Sheet ───────────────────────────────────────── */}
      {showComparison && activeCount > 1 && (
        <ComparisonTable
          results={analysisResults}
          activeCandidates={(["A", "B", "C"] as CandidateId[]).filter((id) => candidates[id] !== null)}
        />
      )}

      {/* ── Dynamic Map Legend ─────────────────────────────────────────────── */}
      <MapLegend
        showMapsData={showMapsData}
        showLocivaData={showLocivaData}
        mapsCount={filteredExternalPlaces.length}
        locivaCount={filteredLocivaBusinesses.length}
        activeCandidateCount={activeCount}
        basemapMode={basemapMode}
      />
    </div>
  );
}

export default MapPage;
