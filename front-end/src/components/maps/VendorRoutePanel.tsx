import React, { useState, useEffect, useCallback } from "react";
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
  AlertCircle,
} from "lucide-react";
import api from "@/context/apiClient";
import { calculateRoute, type RouteWaypoint, type RouteCalculationResult } from "@/lib/routing";
import { useToast } from "@/components/ui/Toast";

export interface SavedRouteItem {
  id: string;
  name: string;
  waypoints: RouteWaypoint[];
  start_location_name?: string;
  end_location_name?: string;
  distance?: number;
  estimated_duration?: number;
  status: string;
  is_shared: boolean;
  notes?: string;
  created_at?: string;
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
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"planner" | "saved" | "recommendations">("planner");
  const [routeName, setRouteName] = useState("Rute Keliling Harian");
  const [routeNotes, setRouteNotes] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [isRoundtrip, setIsRoundtrip] = useState(false);

  // Loading states
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<SavedRouteItem[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Initialize with start point from user location or center if empty
  useEffect(() => {
    if (activeWaypoints.length === 0) {
      const initialLat = userLocation ? userLocation.lat : mapCenter[0];
      const initialLng = userLocation ? userLocation.lng : mapCenter[1];
      onWaypointsChange([
        {
          lat: initialLat,
          lng: initialLng,
          name: userLocation ? "Lokasi Saya (Titik Awal)" : "Titik Awal Rute",
          stop_duration: 0,
        },
      ]);
    }
  }, [userLocation, mapCenter, activeWaypoints.length, onWaypointsChange]);

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

  // Add waypoint
  const handleAddStop = () => {
    if (activeWaypoints.length >= 8) {
      toast({
        title: "Batas Titik",
        description: "Maksimal 8 titik singgah dalam satu rute.",
        variant: "error",
      });
      return;
    }

    const last = activeWaypoints[activeWaypoints.length - 1];
    // Slightly offset the new point for visibility
    const newLat = last ? last.lat + 0.003 : mapCenter[0];
    const newLng = last ? last.lng + 0.003 : mapCenter[1];

    const updated = [
      ...activeWaypoints,
      {
        lat: newLat,
        lng: newLng,
        name: `Pemberhentian ${activeWaypoints.length + 1}`,
        stop_duration: 45,
      },
    ];

    onWaypointsChange(updated);
  };

  // Remove waypoint
  const handleRemoveStop = (index: number) => {
    if (activeWaypoints.length <= 1) {
      toast({
        title: "Perhatian",
        description: "Rute harus memiliki minimal satu titik awal.",
        variant: "error",
      });
      return;
    }

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
        description: err.message || "Pastikan titik berada di jaringan jalan yang valid.",
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
        name: routeName.trim() || "Rute Usaha Keliling",
        start_location_name: activeWaypoints[0].name || "Titik Awal",
        end_location_name: activeWaypoints[activeWaypoints.length - 1].name || "Titik Akhir",
        waypoints: activeWaypoints,
        distance: currentCalculation ? currentCalculation.distanceKm : 0,
        estimated_duration: currentCalculation ? currentCalculation.durationMinutes : 0,
        status: "planned",
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
        description: err.response?.data?.message || "Terjadi kesalahan saat menyimpan rute.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Add recommended spot to waypoints
  const handleAddRecommendationToRoute = (rec: any) => {
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
        "fixed md:static inset-y-0 left-0 z-[500] w-full md:w-96 bg-surface border-r border-slate-200 flex flex-col transition-transform duration-300 shadow-xl md:shadow-none",
        !isOpen && "-translate-x-full md:translate-x-0 md:hidden"
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
              <h2 className="text-lg font-display font-bold text-ink">Rute Usaha Keliling</h2>
              <p className="text-[11px] text-muted">Perencana jalur jualan gerobak & usaha mobile</p>
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
              activeTab === "planner" ? "bg-white text-ink shadow-xs" : "text-muted hover:text-ink"
            )}
          >
            Perencana
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recommendations")}
            className={cn(
              "py-1.5 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1",
              activeTab === "recommendations" ? "bg-white text-ink shadow-xs" : "text-muted hover:text-ink"
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
              activeTab === "saved" ? "bg-white text-ink shadow-xs" : "text-muted hover:text-ink"
            )}
          >
            Rute Saya
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: PLANNER */}
        {activeTab === "planner" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Nama Rute:</label>
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="Contoh: Rute Bakso Siang SCBD"
                className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary border border-slate-200"
              />
            </div>

            {/* Waypoints List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink">
                  Titik Singgah ({activeWaypoints.length} titik)
                </span>
                <button
                  type="button"
                  onClick={handleAddStop}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-soft text-primary text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                  Tambah Titik
                </button>
              </div>

              <div className="space-y-2">
                {activeWaypoints.map((wp, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === activeWaypoints.length - 1;

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "size-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                              isFirst ? "bg-emerald-600" : isLast ? "bg-indigo-600" : "bg-slate-700"
                            )}
                          >
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={wp.name || ""}
                            onChange={(e) => handleUpdateStop(idx, { name: e.target.value })}
                            className="text-xs font-semibold text-ink bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none px-1"
                          />
                        </div>

                        <div className="flex items-center gap-1">
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

                      <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                        </span>
                        <div className="flex items-center gap-1">
                          <Clock size={10} />
                          <span>Mangkal:</span>
                          <input
                            type="number"
                            value={wp.stop_duration || 0}
                            onChange={(e) =>
                              handleUpdateStop(idx, { stop_duration: Number(e.target.value) })
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
            </div>

            {/* Roundtrip & Share options */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-ink font-medium">Kembali ke Titik Awal (Roundtrip)</span>
                <input
                  type="checkbox"
                  checked={isRoundtrip}
                  onChange={(e) => setIsRoundtrip(e.target.checked)}
                  className="rounded text-primary focus:ring-primary accent-primary"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-ink font-medium flex items-center gap-1">
                  <Share2 size={12} className="text-primary" />
                  Bagikan Rute ke Peta Publik
                </span>
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="rounded text-primary focus:ring-primary accent-primary"
                />
              </label>
            </div>

            {/* Calculation summary banner */}
            {currentCalculation && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                  <span>Hasil Perhitungan Rute:</span>
                  <CheckCircle2 size={14} className="text-emerald-600" />
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-900 pt-1">
                  <span>Total Jarak: <b>{currentCalculation.distanceKm} km</b></span>
                  <span>Est. Waktu Jalan: <b>{currentCalculation.durationMinutes} menit</b></span>
                </div>
                {currentCalculation.summary && (
                  <p className="text-[10px] text-emerald-700 pt-0.5">{currentCalculation.summary}</p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleCalculateRoute}
                disabled={isCalculating || activeWaypoints.length < 2}
                className="w-full py-2.5 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary-deep transition-all shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isCalculating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Menghitung Jalur Jalan (OSRM)...
                  </>
                ) : (
                  <>
                    <Navigation size={14} />
                    Hitung Jalur Jalan Nyata
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSaveRoute}
                disabled={isSaving || activeWaypoints.length < 2}
                className="w-full py-2.5 rounded-xl bg-white border border-slate-200 text-ink font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-primary" />
                    Menyimpan ke Database...
                  </>
                ) : (
                  <>
                    <Save size={14} className="text-primary" />
                    Simpan Rencana Rute ke Database
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
                Dihitung dari kepadatan fasilitas umum pejalan kaki tinggi (kampus, sekolah, pasar, sentral transit) di sekitar rute Anda.
              </p>
            </div>

            {loadingRecs ? (
              <div className="py-12 text-center space-y-2">
                <RefreshCw className="size-5 text-primary animate-spin mx-auto" />
                <p className="text-xs text-muted">Menganalisis titik ramai di sekitar...</p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-12 text-muted text-xs">
                Tidak ada rekomendasi di radius ini. Coba geser pusat peta ke kawasan kota.
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
                      <h4 className="font-bold text-ink text-xs mt-1">{rec.name}</h4>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                      Skor Ramai: {rec.footfall_score}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted leading-relaxed">{rec.reason}</p>

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
                <p className="text-xs text-muted">Memuat rute tersimpan dari database...</p>
              </div>
            ) : savedRoutes.length === 0 ? (
              <div className="text-center py-12 text-muted text-xs space-y-1">
                <Route size={24} className="mx-auto text-slate-300 mb-1" />
                <p className="font-semibold text-ink">Belum ada rute tersimpan</p>
                <p>Gunakan tab "Perencana" untuk membuat dan menyimpan rute Anda.</p>
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
                        <h4 className="font-bold text-ink text-xs">{route.name}</h4>
                      </div>
                      <p className="text-[11px] text-muted mt-0.5">
                        {route.start_location_name || "Awal"} &rarr; {route.end_location_name || "Akhir"}
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
                    <span>{route.distance ? `${route.distance} km` : "Estimasi jarak"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
