import React, { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Navigation,
  Plus,
  Trash2,
  ArrowUpDown,
  Save,
  Route,
  Sparkles,
  Share2,
  Clock,
  MapPin,
  RefreshCw,
  CheckCircle2,
  X,
} from "lucide-react";
import api from "@/context/apiClient";
import { RouteLocationSearch } from "./RouteLocationSearch";
import {
  calculateRoute,
  type RouteWaypoint,
  type RouteCalculationResult,
} from "@/lib/routing";
import { useToast } from "@/components/ui/Toast";

export interface SavedRouteItem {
  id: string;
  name: string;
  waypoints: RouteWaypoint[];
  route_coordinates?: [number, number][];
  start_location_name?: string;
  end_location_name?: string;
  distance?: number;
  estimated_duration?: number;
  status: string;
  is_shared: boolean;
  notes?: string;
  created_at?: string;
}
interface UserBusinessOption {
  id: number | string;
  name: string;
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
}

interface VendorRoutePanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeWaypoints: RouteWaypoint[];
  onWaypointsChange: (waypoints: RouteWaypoint[]) => void;
  onRouteCalculated: (result: RouteCalculationResult | null) => void;
  currentCalculation: RouteCalculationResult | null;
  mapCenter: [number, number];
  userLocation: { lat: number; lng: number } | null;
  onSelectStartPoint: () => void;
  onTrackingLocationChange?: (
    location: {
      lat: number;
      lng: number;
    } | null,
  ) => void;
  onSelectWaypoint: () => void;
}

export const VendorRoutePanel: React.FC<VendorRoutePanelProps> = ({
  isOpen,
  onClose,
  activeWaypoints,
  onWaypointsChange,
  onRouteCalculated,
  currentCalculation,
  mapCenter,
  userLocation,
  onSelectStartPoint,
  onTrackingLocationChange,
  onSelectWaypoint,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "planner" | "saved" | "recommendations"
  >("planner");
  const [routeName, setRouteName] = useState("Rute Keliling Harian");
  const [routeNotes, setRouteNotes] = useState("");
  const [routeStatus, setRouteStatus] = useState<"active" | "planned">(
    "active",
  );
  const [isShared, setIsShared] = useState(false);
  const [isRoundtrip, setIsRoundtrip] = useState(false);
  const [businesses, setBusinesses] = useState<UserBusinessOption[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);

  // Loading states
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<SavedRouteItem[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [showRouteSettings, setShowRouteSettings] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    Boolean(localStorage.getItem("token")),
  );

  const [trackingRouteId, setTrackingRouteId] = useState<string | null>(null);
  const trackingWatchId = useRef<number | null>(null);

  const stopTracking = useCallback(() => {
    if (trackingWatchId.current !== null) {
      navigator.geolocation.clearWatch(trackingWatchId.current);
      trackingWatchId.current = null;
    }

    setTrackingRouteId(null);
    onTrackingLocationChange?.(null);
  }, [onTrackingLocationChange]);

  const handleStartTracking = (route: SavedRouteItem) => {
    if (route.status !== "active") return;

    if (!navigator.geolocation) {
      toast({
        title: "GPS Tidak Didukung",
        description: "Browser ini tidak mendukung pelacakan lokasi.",
        variant: "error",
      });
      return;
    }

    if (trackingWatchId.current !== null) {
      stopTracking();
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        onTrackingLocationChange?.(location);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Izinkan akses lokasi pada browser untuk memulai tracking."
            : error.code === error.TIMEOUT
              ? "Waktu pengambilan lokasi habis. Coba lagi."
              : "Lokasi GPS tidak tersedia.";

        toast({
          title: "Tracking GPS Gagal",
          description: message,
          variant: "error",
        });

        stopTracking();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 15000,
      },
    );

    trackingWatchId.current = watchId;
    setTrackingRouteId(route.id);

    toast({
      title: "Tracking Dimulai",
      description: `GPS aktif untuk rute "${route.name}".`,
      variant: "success",
    });
  };

  useEffect(() => {
    return () => {
      if (trackingWatchId.current !== null) {
        navigator.geolocation?.clearWatch(trackingWatchId.current);
      }
    };
  }, []);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const [selectedStart, setSelectedStart] = useState<{
    lat: number;
    lng: number;
    name: string;
    displayName: string;
  } | null>(null);

  const [selectedEnd, setSelectedEnd] = useState<{
    lat: number;
    lng: number;
    name: string;
    displayName: string;
  } | null>(null);

  const [isRouteStarted, setIsRouteStarted] = useState(false);

  const handleSelectRouteStart = (
    lat: number,
    lng: number,
    name: string,
    displayName: string,
  ) => {
    const start = { lat, lng, name, displayName };
    setSelectedStart(start);
    setIsRouteStarted(false);

    const stops = activeWaypoints.slice(1);
    const end = selectedEnd;

    onWaypointsChange([
      { lat, lng, name, stop_duration: 0 },
      ...(end
        ? [
            ...stops.filter((wp) => wp.lat !== end.lat || wp.lng !== end.lng),
            {
              lat: end.lat,
              lng: end.lng,
              name: end.name,
              stop_duration: 0,
            },
          ]
        : stops),
    ]);

    onRouteCalculated(null);
  };

  const handleSelectRouteEnd = (
    lat: number,
    lng: number,
    name: string,
    displayName: string,
  ) => {
    const end = { lat, lng, name, displayName };
    setSelectedEnd(end);
    setIsRouteStarted(false);

    const start = selectedStart;
    if (!start && activeWaypoints.length === 0) {
      toast({
        title: "Select a Starting Point",
        description:
          "Choose a starting point before selecting the destination.",
        variant: "error",
      });
      return;
    }

    const startPoint = start
      ? {
          lat: start.lat,
          lng: start.lng,
          name: start.name,
          stop_duration: 0,
        }
      : activeWaypoints[0];

    const middleStops = activeWaypoints.slice(1, selectedEnd ? -1 : undefined);

    onWaypointsChange([
      startPoint,
      ...middleStops,
      { lat, lng, name, stop_duration: 0 },
    ]);

    onRouteCalculated(null);
  };

  // Initialize with start point from user location or center if empty
  // Initialize start point only when the user is logged in
  useEffect(() => {
    if (!isLoggedIn) {
      onWaypointsChange([]);
      onRouteCalculated(null);
    }
  }, [isLoggedIn, onWaypointsChange, onRouteCalculated]);

  const handleUseCurrentLocation = () => {
    if (!userLocation) {
      toast({
        title: "Lokasi Tidak Tersedia",
        description:
          "Lokasi Anda belum terdeteksi. Aktifkan izin lokasi atau pilih titik awal melalui peta.",
        variant: "error",
      });
      return;
    }

    const start = {
      lat: userLocation.lat,
      lng: userLocation.lng,
      name: "Lokasi Saya (Titik Awal)",
      stop_duration: 0,
    };

    const end = selectedEnd
      ? {
          lat: selectedEnd.lat,
          lng: selectedEnd.lng,
          name: selectedEnd.name,
          stop_duration: 0,
        }
      : null;

    onWaypointsChange([start, ...(end ? [end] : [])]);
    onRouteCalculated(null);
    setIsRouteStarted(false);
    setSelectedStart({
      lat: userLocation.lat,
      lng: userLocation.lng,
      name: start.name,
      displayName: start.name,
    });
  };

  // Fetch saved routes from API
  const fetchSavedRoutes = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoadingSaved(true);
    try {
      const res = await api.get("/vendor-routes");
      if (res.data?.success && res.data?.data?.data) {
        setSavedRoutes(res.data.data.data);
      } else if (res.data?.success && Array.isArray(res.data?.data)) {
        setSavedRoutes(res.data.data);
      }
    } catch (err) {
      console.warn("Gagal mengambil rute tersimpan:", err);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  const fetchBusinesses = useCallback(async () => {
    setLoadingBusinesses(true);

    try {
      const res = await api.get("/businesses/user");

      const data = res.data?.data;
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.Data)
          ? data.Data
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setBusinesses(items);
    } catch (error) {
      console.error("Gagal mengambil bisnis pengguna:", error);
      setBusinesses([]);
    } finally {
      setLoadingBusinesses(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Fetch recommendations from API
  const fetchRecommendations = useCallback(async () => {
    setLoadingRecs(true);
    try {
      const targetLat = activeWaypoints[0]?.lat || mapCenter[0];
      const targetLng = activeWaypoints[0]?.lng || mapCenter[1];
      const res = await api.get("/vendor-routes/recommendations", {
        params: { lat: targetLat, lng: targetLng, radius: 4000 },
      });
      if (res.data?.success && res.data?.data?.recommendations) {
        setRecommendations(res.data.data.recommendations);
      }
    } catch (err) {
      console.warn("Gagal mengambil rekomendasi jualan:", err);
    } finally {
      setLoadingRecs(false);
    }
  }, [activeWaypoints, mapCenter]);

  useEffect(() => {
    if (activeTab === "saved") {
      fetchSavedRoutes();
    } else if (activeTab === "recommendations") {
      fetchRecommendations();
    }
  }, [activeTab, fetchSavedRoutes, fetchRecommendations]);

  const [showAddStopNotice, setShowAddStopNotice] = useState(false);
  // Add waypoint
  const handleAddStop = () => {
    if (activeWaypoints.length === 0) {
      toast({
        title: "Tentukan Titik Awal",
        description: "Pilih titik awal terlebih dahulu.",
        variant: "error",
      });
      return;
    }

    if (activeWaypoints.length >= 8) {
      toast({
        title: "Batas Titik",
        description: "Maksimal 8 titik dalam satu rute.",
        variant: "error",
      });
      return;
    }

    setShowAddStopNotice(true);
    onSelectWaypoint();
  };

  // Remove waypoint
  const handleRemoveStop = (index: number) => {
    const updated = activeWaypoints.filter((_, i) => i !== index);

    onWaypointsChange(updated);
    onRouteCalculated(null);
  };

  // Move waypoint up/down
  const handleMoveStop = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= activeWaypoints.length) return;

    const copy = [...activeWaypoints];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    onWaypointsChange(copy);
    onRouteCalculated(null);
  };

  // Update waypoint name or duration
  const handleUpdateStop = (index: number, fields: Partial<RouteWaypoint>) => {
    const copy = [...activeWaypoints];
    copy[index] = { ...copy[index], ...fields };
    onWaypointsChange(copy);
  };

  // Calculate road route with OSRM
  const handleCalculateRoute = async () => {
    if (activeWaypoints.length < 2) {
      toast({
        title: "Titik Belum Cukup",
        description: "Tambahkan minimal 1 titik tujuan atau titik singgah.",
        variant: "error",
      });
      return;
    }

    setIsCalculating(true);
    try {
      const calculationPoints = isRoundtrip
        ? [...activeWaypoints, activeWaypoints[0]]
        : activeWaypoints;

      const result = await calculateRoute(calculationPoints);
      onRouteCalculated(result);

      toast({
        title: "Rute Berhasil Dihitung",
        description: `Jarak: ${result.distanceKm} km · Est. waktu: ${result.durationMinutes} menit`,
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Gagal Menghitung Rute",
        description:
          err.message || "Pastikan titik berada di jaringan jalan yang valid.",
        variant: "error",
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // Save route plan to Laravel backend
  const handleSaveRoute = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast({
        title: "Masuk Akun Dibutuhkan",
        description: "Silakan masuk untuk menyimpan rute ke database.",
        variant: "error",
      });
      return;
    }

    if (activeWaypoints.length < 2) {
      toast({
        title: "Perhatian",
        description: "Tambahkan titik tujuan sebelum menyimpan.",
        variant: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        business_id: selectedBusinessId || null,
        name: routeName.trim() || "Rute Usaha Keliling",
        start_location_name: activeWaypoints[0].name || "Titik Awal",
        end_location_name:
          activeWaypoints[activeWaypoints.length - 1].name || "Titik Akhir",
        waypoints: activeWaypoints,
        route_coordinates: currentCalculation?.coordinates ?? [],
        distance: currentCalculation?.distanceKm ?? 0,
        estimated_duration: currentCalculation?.durationMinutes ?? 0,
        status: routeStatus,
        is_shared: isShared,
        notes: routeNotes.trim() || null,
      };

      const res = await api.post("/vendor-routes", payload);
      if (res.data?.success) {
        toast({
          title: "Rute Tersimpan",
          description: "Rencana rute berhasil disimpan ke database LOCIVA.",
          variant: "success",
        });
        fetchSavedRoutes();
      }
    } catch (err: any) {
      toast({
        title: "Gagal Menyimpan Rute",
        description:
          err.response?.data?.message ||
          "Terjadi kesalahan saat menyimpan rute.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Add recommended spot to waypoints
  const handleAddRecommendationToRoute = (rec: any) => {
    if (activeWaypoints.length === 0) {
      toast({
        title: "Tentukan Titik Awal",
        description:
          "Pilih titik awal melalui peta atau lokasi Anda saat ini sebelum menambahkan rekomendasi.",
        variant: "error",
      });
      return;
    }
    if (activeWaypoints.length >= 8) {
      toast({
        title: "Batas Titik",
        description: "Maksimal 8 titik singgah dalam satu rute.",
        variant: "error",
      });
      return;
    }

    const updated = [
      ...activeWaypoints,
      {
        lat: rec.lat,
        lng: rec.lng,
        name: rec.name,
        stop_duration: 60,
      },
    ];

    onWaypointsChange(updated);
    toast({
      title: "Titik Rekomendasi Ditambahkan",
      description: `${rec.name} dimasukkan sebagai titik singgah rute.`,
      variant: "success",
    });
    setActiveTab("planner");
  };

  // Load a saved route
  const handleLoadSavedRoute = (route: SavedRouteItem) => {
    if (Array.isArray(route.waypoints) && route.waypoints.length > 0) {
      onWaypointsChange(route.waypoints);
      setRouteName(route.name);
      setIsShared(route.is_shared);
      setActiveTab("planner");
      toast({
        title: "Rute Dimuat",
        description: `Rute "${route.name}" dimuat ke peta.`,
        variant: "success",
      });
    }
  };

  const handleUpdateRouteStatus = async (
    routeId: string,
    status: "active" | "planned",
  ) => {
    const is_shared = status === "active";

    try {
      await api.patch(`/vendor-routes/${routeId}`, {
        status,
        is_shared,
      });

      setSavedRoutes((prev) =>
        prev.map((route) =>
          route.id === routeId ? { ...route, status, is_shared } : route,
        ),
      );

      toast({
        title: "Status Berhasil Diubah",
        description: `Status rute sekarang ${
          status === "active"
            ? "Aktif dan dibagikan"
            : "Tidak Aktif dan tidak dibagikan"
        }.`,
        variant: "success",
      });
    } catch (error: any) {
      toast({
        title: "Gagal Mengubah Status",
        description:
          error.response?.data?.message ?? "Status rute gagal diperbarui.",
        variant: "error",
      });
    }
  };

  // Delete saved route
  const handleDeleteRoute = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/vendor-routes/${id}`);
      setSavedRoutes((prev) => prev.filter((r) => r.id !== id));
      toast({
        title: "Rute Dihapus",
        description: "Rencana rute berhasil dihapus dari database.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Gagal Menghapus",
        description: "Tidak dapat menghapus rute.",
        variant: "error",
      });
    }
  };

  return (
    <div
      className={cn(
        "fixed md:static inset-y-0 left-0 z-[500] w-full h-full min-h-0 bg-surface border-r border-slate-200 flex flex-col overflow-hidden transition-transform duration-300 shadow-xl md:shadow-none",
        !isOpen && "-translate-x-full md:translate-x-0 md:hidden",
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white/70 backdrop-blur-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Route size={18} />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-ink">
                Rute Usaha Keliling
              </h2>
              <p className="text-[11px] text-muted">
                Perencana jalur jualan gerobak & usaha mobile
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-muted"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("planner")}
            className={cn(
              "py-1.5 rounded-lg transition-all text-center cursor-pointer",
              activeTab === "planner"
                ? "bg-white text-ink shadow-xs"
                : "text-muted hover:text-ink",
            )}
          >
            Perencana
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recommendations")}
            className={cn(
              "py-1.5 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1",
              activeTab === "recommendations"
                ? "bg-white text-ink shadow-xs"
                : "text-muted hover:text-ink",
            )}
          >
            <Sparkles size={11} className="text-amber-500" />
            Spot Jitu
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={cn(
              "py-1.5 rounded-lg transition-all text-center cursor-pointer",
              activeTab === "saved"
                ? "bg-white text-ink shadow-xs"
                : "text-muted hover:text-ink",
            )}
          >
            Rute Saya
          </button>
        </div>
      </div>

      {/* Main Tab Content */}

      {/* Main Tab Content */}
      {!isLoggedIn ? (
        <div className="flex-1 min-h-0 flex items-center justify-center p-6">
          <div className="w-full max-w-sm text-center space-y-4">
            <div className="mx-auto size-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Route size={28} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-ink">Login Diperlukan</h3>
              <p className="text-sm text-muted leading-relaxed">
                Silakan login terlebih dahulu untuk menggunakan perencana rute
                usaha keliling, melihat rekomendasi, dan menyimpan rute Anda.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/login";
              }}
              className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-deep transition-all shadow-sm"
            >
              Login Sekarang
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4">
          {/* TAB 1: PLANNER */}

          {activeTab === "planner" && (
            <div className="space-y-4">
              {/* ROUTE LOCATIONS */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-ink">
                    Route Locations
                  </h3>

                  {activeWaypoints.length >= 2 && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                      {activeWaypoints.length} titik
                    </span>
                  )}
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center pt-3">
                    <span className="size-3 rounded-full border-[3px] border-emerald-600 bg-white shrink-0" />
                    <span className="w-px flex-1 min-h-8 border-l-2 border-dotted border-slate-300" />
                    <span className="size-3 rounded-sm bg-indigo-600 shrink-0" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <RouteLocationSearch
                        label="Starting Point"
                        placeholder="Search starting location..."
                        onSelect={handleSelectRouteStart}
                      />

                      {activeWaypoints[0] && (
                        <p className="mt-1 text-[10px] text-emerald-700 truncate">
                          Titik awal: {activeWaypoints[0].name}
                        </p>
                      )}
                    </div>

                    <div>
                      <RouteLocationSearch
                        label="Destination"
                        placeholder="Search destination..."
                        onSelect={handleSelectRouteEnd}
                      />

                      {activeWaypoints.length >= 2 && (
                        <p className="mt-1 text-[10px] text-indigo-700 truncate">
                          Tujuan:{" "}
                          {activeWaypoints[activeWaypoints.length - 1].name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={!userLocation}
                    className="w-full py-2 rounded-xl bg-white border border-slate-200 text-ink font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Navigation size={13} />
                    Lokasi Saya
                  </button>

                  <button
                    type="button"
                    onClick={onSelectStartPoint}
                    className="w-full py-2 rounded-xl bg-white border border-slate-200 text-ink font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                  >
                    <MapPin size={13} />
                    Pilih di Peta
                  </button>
                </div>
              </div>

              {/* WAYPOINTS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">
                    Titik Singgah ({activeWaypoints.length} titik)
                  </span>

                  <button
                    type="button"
                    onClick={handleAddStop}
                    disabled={
                      activeWaypoints.length === 0 ||
                      activeWaypoints.length >= 8
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-soft text-primary text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus size={12} />
                    Tambah Titik
                  </button>
                </div>
                {showAddStopNotice && (
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50">
                    <div className="flex items-start gap-2">
                      <MapPin
                        size={16}
                        className="text-emerald-700 shrink-0 mt-0.5"
                      />

                      <div className="flex-1">
                        <p className="text-xs font-bold text-emerald-900">
                          Pilih Posisi di Peta
                        </p>
                        <p className="text-[11px] text-emerald-800 mt-1">
                          Klik lokasi yang ingin dijadikan titik singgah pada
                          peta.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAddStopNotice(false)}
                        className="text-emerald-700 hover:text-emerald-900"
                        aria-label="Tutup notifikasi"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {activeWaypoints.length === 0 ? (
                  <div className="p-4 bg-white rounded-xl border border-dashed border-slate-300 text-center">
                    <MapPin size={20} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-xs font-semibold text-ink">
                      Belum ada titik perjalanan
                    </p>
                    <p className="text-[11px] text-muted mt-1">
                      Cari titik awal dan tujuan di atas.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[28vh] overflow-y-auto overflow-x-hidden overscroll-contain space-y-2 pr-1">
                    {activeWaypoints.map((wp, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === activeWaypoints.length - 1;

                      return (
                        <div
                          key={`${wp.lat}-${wp.lng}-${idx}`}
                          className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-xs space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span
                                className={cn(
                                  "size-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                                  isFirst
                                    ? "bg-emerald-600"
                                    : isLast
                                      ? "bg-indigo-600"
                                      : "bg-slate-700",
                                )}
                              >
                                {idx + 1}
                              </span>

                              <input
                                type="text"
                                value={wp.name || ""}
                                onChange={(e) =>
                                  handleUpdateStop(idx, {
                                    name: e.target.value,
                                  })
                                }
                                className="w-full min-w-0 text-xs font-semibold text-ink bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none px-1"
                                placeholder={
                                  isFirst
                                    ? "Titik Awal"
                                    : isLast
                                      ? "Titik Tujuan"
                                      : `Titik Singgah ${idx + 1}`
                                }
                              />
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMoveStop(idx, "up")}
                                disabled={isFirst}
                                className="p-1 text-muted hover:text-ink disabled:opacity-30 cursor-pointer"
                                title="Pindah ke atas"
                              >
                                <ArrowUpDown size={12} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemoveStop(idx)}
                                className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                                title="Hapus titik"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-[11px] text-muted pt-1 border-t border-slate-100">
                            <span className="flex items-center gap-1 min-w-0">
                              <MapPin size={10} className="shrink-0" />
                              <span className="truncate">
                                {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                              </span>
                            </span>

                            <div className="flex items-center gap-1 shrink-0">
                              <Clock size={10} />
                              <span>Mangkal:</span>
                              <input
                                type="number"
                                value={wp.stop_duration || 0}
                                onChange={(e) =>
                                  handleUpdateStop(idx, {
                                    stop_duration: Math.max(
                                      0,
                                      Number(e.target.value),
                                    ),
                                  })
                                }
                                className="w-12 px-1 py-0.5 text-right bg-slate-100 rounded text-ink"
                                min="0"
                                step="15"
                              />
                              <span>menit</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ROUTE SETTINGS: COLLAPSIBLE */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRouteSettings((prev) => !prev)}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Route size={14} className="text-primary" />
                    <div>
                      <p className="text-xs font-bold text-ink">
                        Pengaturan Rute
                      </p>
                      <p className="text-[10px] text-muted mt-0.5">
                        Nama, bisnis, catatan, dan opsi rute
                      </p>
                    </div>
                  </div>

                  <span className="text-xs text-muted">
                    {showRouteSettings ? "Tutup" : "Buka"}
                  </span>
                </button>

                {showRouteSettings && (
                  <div className="p-3 border-t border-slate-100 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted mb-1">
                        Nama Rute:
                      </label>
                      <input
                        type="text"
                        value={routeName}
                        onChange={(e) => setRouteName(e.target.value)}
                        placeholder="Contoh: Rute Bakso Siang SCBD"
                        className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary border border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted mb-1">
                        Bisnis Terkait:
                      </label>
                      <select
                        value={selectedBusinessId}
                        onChange={(e) => setSelectedBusinessId(e.target.value)}
                        disabled={loadingBusinesses}
                        className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs border border-slate-200"
                      >
                        <option value="">
                          {loadingBusinesses
                            ? "Memuat bisnis..."
                            : "Pilih bisnis (opsional)"}
                        </option>

                        {businesses.map((business) => (
                          <option key={business.id} value={String(business.id)}>
                            {business.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted mb-1">
                        Catatan Rute:
                      </label>
                      <input
                        type="text"
                        value={routeNotes}
                        onChange={(e) => setRouteNotes(e.target.value)}
                        placeholder="Catatan untuk perjalanan"
                        className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary border border-slate-200"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-3 border border-slate-100 text-xs">
                      <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <span className="text-ink font-medium">
                          Kembali ke Titik Awal (Roundtrip)
                        </span>
                        <input
                          type="checkbox"
                          checked={isRoundtrip}
                          onChange={(e) => {
                            setIsRoundtrip(e.target.checked);
                            onRouteCalculated(null);
                            setIsRouteStarted(false);
                          }}
                          className="accent-primary"
                        />
                      </label>

                      <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <span className="text-ink font-medium flex items-center gap-1">
                          <Share2 size={12} className="text-primary" />
                          Bagikan Rute ke Peta Publik
                        </span>
                        <input
                          type="checkbox"
                          checked={isShared}
                          onChange={(e) => setIsShared(e.target.checked)}
                          className="accent-primary"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* CALCULATION SUMMARY */}
              {currentCalculation && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span>Hasil Perhitungan Rute:</span>
                    <CheckCircle2 size={14} className="text-emerald-600" />
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs text-emerald-900 pt-1">
                    <span>
                      Jarak: <b>{currentCalculation.distanceKm} km</b>
                    </span>
                    <span>
                      Waktu: <b>{currentCalculation.durationMinutes} menit</b>
                    </span>
                  </div>

                  {currentCalculation.summary && (
                    <p className="text-[10px] text-emerald-700 pt-0.5">
                      {currentCalculation.summary}
                    </p>
                  )}
                </div>
              )}

              {/* ACTION BUTTONS: KEEP ORIGINAL POSITION AND LAYOUT */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={
                    currentCalculation
                      ? () => {
                          setIsRouteStarted(true);
                          toast({
                            title: "Rute Siap Digunakan",
                            description:
                              "Ikuti jalur yang ditampilkan pada peta.",
                            variant: "success",
                          });
                        }
                      : handleCalculateRoute
                  }
                  disabled={
                    isCalculating ||
                    (!currentCalculation && activeWaypoints.length < 2)
                  }
                  className="min-w-0 py-2.5 px-2 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary-deep transition-all shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isCalculating ? (
                    <>
                      <RefreshCw size={14} className="animate-spin shrink-0" />
                      <span className="text-center">Menghitung Jalur...</span>
                    </>
                  ) : currentCalculation ? (
                    <>
                      <Navigation size={14} className="shrink-0" />
                      <span className="text-center">
                        {isRouteStarted ? "Rute Dimulai" : "Mulai Rute"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Navigation size={14} className="shrink-0" />
                      <span className="text-center">
                        Hitung Jalur Jalan Nyata
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSaveRoute}
                  disabled={isSaving || activeWaypoints.length < 2}
                  className="min-w-0 py-2.5 px-2 rounded-xl bg-white border border-slate-200 text-ink font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw
                        size={14}
                        className="animate-spin text-primary shrink-0"
                      />
                      <span className="text-center">Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} className="text-primary shrink-0" />
                      <span className="text-center">Simpan ke Database</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: RECOMMENDATIONS */}
          {activeTab === "recommendations" && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80">
                <h4 className="font-bold text-xs text-amber-900 flex items-center gap-1.5 mb-1">
                  <Sparkles size={13} className="text-amber-600" />
                  Rekomendasi Titik Mangkal Berpotensi
                </h4>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Dihitung dari kepadatan fasilitas umum pejalan kaki tinggi
                  (kampus, sekolah, pasar, sentral transit) di sekitar rute
                  Anda.
                </p>
              </div>

              {loadingRecs ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="size-5 text-primary animate-spin mx-auto" />
                  <p className="text-xs text-muted">
                    Menganalisis titik ramai di sekitar...
                  </p>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="text-center py-12 text-muted text-xs">
                  Tidak ada rekomendasi di radius ini. Coba geser pusat peta ke
                  kawasan kota.
                </div>
              ) : (
                recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-primary bg-primary-soft px-1.5 py-0.5 rounded">
                          {rec.category}
                        </span>
                        <h4 className="font-bold text-ink text-xs mt-1">
                          {rec.name}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                        Skor Ramai: {rec.footfall_score}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted leading-relaxed">
                      {rec.reason}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-[10.5px] text-muted">
                        ~{rec.distance_meters}m dari titik acuan
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddRecommendationToRoute(rec)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10.5px] hover:bg-emerald-700 transition-colors cursor-pointer"
                      >
                        + Jadikan Titik Singgah
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: SAVED ROUTES */}
          {activeTab === "saved" && (
            <div className="space-y-3">
              {loadingSaved ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="size-5 text-primary animate-spin mx-auto" />
                  <p className="text-xs text-muted">
                    Memuat rute tersimpan dari database...
                  </p>
                </div>
              ) : savedRoutes.length === 0 ? (
                <div className="text-center py-12 text-muted text-xs space-y-1">
                  <Route size={24} className="mx-auto text-slate-300 mb-1" />
                  <p className="font-semibold text-ink">
                    Belum ada rute tersimpan
                  </p>
                  <p>
                    Gunakan tab "Perencana" untuk membuat dan menyimpan rute
                    Anda.
                  </p>
                </div>
              ) : (
                savedRoutes.map((route) => (
                  <div
                    key={route.id}
                    onClick={() => handleLoadSavedRoute(route)}
                    className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-primary/50 transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          <h4 className="font-bold text-ink text-xs">
                            {route.name}
                          </h4>
                        </div>
                        <p className="text-[11px] text-muted mt-0.5">
                          {route.start_location_name || "Awal"} &rarr;{" "}
                          {route.end_location_name || "Akhir"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {route.is_shared && (
                          <span className="text-[10px] text-primary bg-primary-soft px-1.5 py-0.5 rounded font-semibold">
                            Publik
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteRoute(route.id, e)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-slate-100">
                      <span>{route.waypoints?.length || 0} titik singgah</span>
                      <span>
                        {route.distance
                          ? `${route.distance} km`
                          : "Estimasi jarak"}
                      </span>
                    </div>

                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="pt-2 border-t border-slate-100"
                    >
                      <label className="block text-xs font-semibold text-muted mb-2">
                        Status Rute:
                      </label>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(["active", "planned"] as const).map((status) => {
                          const isCurrent = route.status === status;

                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() =>
                                handleUpdateRouteStatus(route.id, status)
                              }
                              className={`clay-press rounded-[10px] px-2.5 py-1.5
          text-[10px] font-semibold transition-all cursor-pointer
          ${
            isCurrent
              ? "clay-primary text-white shadow-sm"
              : "bg-white text-muted border border-slate-200 hover:text-ink"
          }`}
                            >
                              {status === "active" ? "Active" : "Inactive"}
                            </button>
                          );
                        })}

                        {(route.status === "active" ||
                          trackingRouteId === route.id) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (trackingRouteId === route.id) {
                                stopTracking();

                                toast({
                                  title: "Tracking Dihentikan",
                                  description:
                                    "Pelacakan GPS telah dihentikan.",
                                  variant: "success",
                                });
                              } else {
                                handleStartTracking(route);
                              }
                            }}
                            className={`clay-press rounded-[10px] px-2.5 py-1.5
        text-[10px] font-semibold transition-all cursor-pointer
        ${
          trackingRouteId === route.id
            ? "bg-red-600 text-white shadow-sm"
            : "bg-emerald-600 text-white shadow-sm"
        }`}
                          >
                            {trackingRouteId === route.id
                              ? "Akhiri Tracking"
                              : "Mulai Tracking"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
