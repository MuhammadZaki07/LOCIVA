import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Store,
  ArrowRight,
  MapPin,
  TrendingUp,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Compass,
  X,
  BarChart3,
  Activity,
  ShieldAlert,
  Footprints,
  Calendar,
} from "lucide-react";
import api from "@/context/apiClient";
import { useToast } from "@/components/ui/Toast";
import { LocationPickerModal } from "@/components/maps/LocationPickerModal";

interface BusinessTypeItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  default_radius_m: number;
  is_active: boolean;
}

interface UserBusiness {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  image?: string | null;
  latitude: number;
  longitude: number;
  address?: string;
  business_type?: BusinessTypeItem | null;
  business_type_id?: string;
  business_type_name?: string;
  created_at?: string;
}

interface SimulationSessionItem {
  id: string;
  name: string;
  description?: string;
  simulations?: {
    id: string;
    candidate_id?: string;
    target_market?: string;
    latitude: number;
    longitude: number;
    radius_m: number;
    business_type?: BusinessTypeItem | null;
    location?: {
      name?: string;
      address?: string;
    } | null;
    score?: {
      status?: string;
      target_market_score?: number;
      competition_score?: number;
      accessibility_score?: number;
      population_score?: number;
      pedestrian_score?: number;
      area_compatibility_score?: number;
      infrastructure_score?: number;
      total_score?: number;
    } | null;
    created_at?: string;
  }[];
  created_at?: string;
}

export default function UserDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"simulations" | "businesses">(
    "simulations",
  );
  const [sessions, setSessions] = useState<SimulationSessionItem[]>([]);
  const [businesses, setBusinesses] = useState<UserBusiness[]>([]);
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidateDetail, setSelectedCandidateDetail] = useState<{
    session: SimulationSessionItem;
    simulation: NonNullable<SimulationSessionItem["simulations"]>[number];
  } | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // State pagination usaha
  const [businessPage, setBusinessPage] = useState(1);
  const [businessLastPage, setBusinessLastPage] = useState(1);
  const [businessTotal, setBusinessTotal] = useState(0);

  // State modal usaha
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<UserBusiness | null>(
    null,
  );

  const getPageNumbers = (
    currentPage: number,
    lastPage: number,
  ): (number | "...")[] => {
    if (lastPage <= 7) {
      return Array.from({ length: lastPage }, (_, i) => i + 1);
    }

    const pages: (number | "...")[] = [];

    pages.push(1);

    const start = Math.max(2, currentPage - 2);
    const end = Math.min(lastPage - 1, currentPage + 2);

    if (start > 2) {
      pages.push("...");
    }

    for (let page = start; page <= end; page++) {
      pages.push(page);
    }

    if (end < lastPage - 1) {
      pages.push("...");
    }

    pages.push(lastPage);

    return pages;
  };

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    business_type_id: "",
    latitude: "-6.2088",
    longitude: "106.8456",
    address: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  const getBusinessImageUrl = (image?: string | null) => {
    if (!image) return null;

    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }

    const baseUrl = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

    return `${baseUrl}/storage/${image.replace(/^\/+/, "")}`;
  };

  // Memuat sesi simulasi, usaha, dan jenis usaha
  const loadDashboardData = useCallback(async () => {
    setLoading(true);

    try {
      const results = await Promise.allSettled([
        api.get("/simulations/sessions"),
        api.get("/businesses/user", {
          params: {
            per_page: 6,
            page: businessPage,
          },
        }),
        api.get("/business-types"),
      ]);

      const [sessionsResult, businessesResult, typesResult] = results;

      // 1. Data sesi simulasi
      if (sessionsResult.status === "fulfilled") {
        const data = sessionsResult.value.data;

        if (data?.success && Array.isArray(data.data)) {
          setSessions(data.data);
        } else {
          console.error("Invalid simulation sessions response:", data);
        }
      } else {
        console.error(
          "Gagal memuat sesi simulasi:",
          sessionsResult.reason?.response?.data || sessionsResult.reason,
        );
      }

      // 2. Data usaha pengguna
      if (businessesResult.status === "fulfilled") {
        const response = businessesResult.value.data;
        const businessList = response?.data?.Data;
        const meta = response?.data?.meta;

        if (Array.isArray(businessList)) {
          setBusinesses(businessList);
          setBusinessTotal(Number(meta?.total ?? businessList.length));
          setBusinessLastPage(Number(meta?.last_page ?? 1));

          // Debug sementara jika metadata pagination bermasalah
          console.log("Response bisnis:", response);
          console.log("Metadata pagination:", meta);
        } else {
          setBusinesses([]);
          setBusinessTotal(0);
          setBusinessLastPage(1);

          console.error("Invalid business list response:", response);
        }
      } else {
        setBusinesses([]);
        setBusinessTotal(0);
        setBusinessLastPage(1);

        console.error(
          "Failed to get business list:",
          businessesResult.reason?.response?.data || businessesResult.reason,
        );
      }

      // 3. Jenis usaha dari API /business-types
      if (typesResult.status === "fulfilled") {
        const data = typesResult.value.data;

        const types: BusinessTypeItem[] = Array.isArray(data?.data?.Data)
          ? data.data.Data
          : [];

        setBusinessTypes(types);

        setFormData((prev) => ({
          ...prev,
          business_type_id:
            prev.business_type_id &&
            types.some((type) => type.id === prev.business_type_id)
              ? prev.business_type_id
              : types[0]?.id || "",
        }));
      } else {
        console.error(
          "Failed to get business types:",
          typesResult.reason?.response?.data || typesResult.reason,
        );
      }
    } finally {
      setLoading(false);
    }
  }, [businessPage]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Membuka modal untuk membuat usaha
  const handleOpenCreate = () => {
    setEditingBusiness(null);
    setImageFile(null);
    setImagePreview(null);

    setFormData({
      name: "",
      description: "",
      business_type_id: businessTypes[0]?.id || "",
      latitude: "",
      longitude: "",
      address: "",
    });

    setIsModalOpen(true);
  };

  // Membuka modal untuk mengedit usaha
  const handleOpenEdit = (biz: UserBusiness) => {
    setEditingBusiness(biz);
    setImageFile(null);
    setImagePreview(getBusinessImageUrl(biz.image));

    setFormData({
      name: biz.name,
      description: biz.description || "",
      business_type_id:
        biz.business_type_id ||
        biz.business_type?.id ||
        businessTypes[0]?.id ||
        "",
      latitude: String(biz.latitude),
      longitude: String(biz.longitude),
      address: biz.address || "",
    });

    setIsModalOpen(true);
  };
  const handleSelectCandidate = (
    session: SimulationSessionItem,
    simulation: NonNullable<SimulationSessionItem["simulations"]>[number],
  ) => {
    navigate("/candidate-statistics", {
      state: {
        session,
        simulation,
      },
    });
  };

  // Membuat atau memperbarui usaha
  const handleSubmitBusiness = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.business_type_id) {
      toast({
        title: "Validation Failed",
        description: "Name and business type are required.",
        variant: "error",
      });
      return;
    }

    if (
      !formData.latitude ||
      !formData.longitude ||
      !Number.isFinite(Number(formData.latitude)) ||
      !Number.isFinite(Number(formData.longitude))
    ) {
      toast({
        title: "Validation Failed",
        description: "Please select a business location on the map first.",
        variant: "error",
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload = new FormData();

      payload.append("name", formData.name.trim());
      payload.append("description", formData.description.trim());
      payload.append("business_type_id", formData.business_type_id);
      payload.append("latitude", formData.latitude);
      payload.append("longitude", formData.longitude);
      payload.append("address", formData.address.trim());

      if (imageFile) {
        payload.append("image", imageFile);
      }

      let res;

      if (editingBusiness) {
        // Method spoofing untuk request multipart Laravel
        payload.append("_method", "PUT");

        res = await api.post(`/businesses/${editingBusiness.id}`, payload);
      } else {
        res = await api.post("/businesses", payload);
      }

      if (res.data?.success) {
        toast({
          title: editingBusiness ? "Business Updated" : "Business Created",
          description: editingBusiness
            ? "Data and photo updated successfully."
            : "Business created successfully.",
          variant: "success",
        });

        setIsModalOpen(false);
        setImageFile(null);
        setImagePreview(null);

        await loadDashboardData();
      }
    } catch (err: any) {
      toast({
        title: "Failed to Save",
        description:
          err.response?.data?.message ||
          "An error occurred while saving the business.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Menghapus usaha
  const handleDeleteBusiness = async (id: string, name: string) => {
    if (!window.confirm(`Delete business "${name}" from the system?`)) {
      return;
    }

    try {
      const res = await api.delete(`/businesses/${id}`);

      if (res.data?.success) {
        toast({
          title: "Business Deleted",
          description: `Business "${name}" deleted successfully.`,
          variant: "success",
        });

        // Muat ulang data agar total dan pagination tetap akurat.
        // Jika halaman terakhir menjadi kosong, kembali ke halaman sebelumnya.
        if (businesses.length === 1 && businessPage > 1) {
          setBusinessPage((prev) => prev - 1);
        } else {
          await loadDashboardData();
        }
      }
    } catch (err: any) {
      toast({
        title: "Failed to Delete",
        description:
          err.response?.data?.message || "Failed to delete business.",
        variant: "error",
      });
    }
  };

  // Menghapus sesi simulasi
  const handleDeleteSession = async (
    sessionId: string,
    sessionName: string,
  ) => {
    if (!window.confirm(`Delete simulation session "${sessionName}"?`)) {
      return;
    }

    try {
      const res = await api.delete(`/simulations/sessions/${sessionId}`);

      if (res.data?.success) {
        setSessions((prev) =>
          prev.filter((session) => session.id !== sessionId),
        );

        toast({
          title: "Session Deleted",
          description: `Session "${sessionName}" deleted successfully.`,
          variant: "success",
        });
      }
    } catch (err: any) {
      toast({
        title: "Failed to Delete",
        description:
          err.response?.data?.message || "Failed to delete simulation session.",
        variant: "error",
      });
    }
  };

  // Membuka lokasi simulasi pada peta
  const handleOpenSimulationOnMap = (sim: any) => {
    if (!sim) return;

    navigate(`/view-maps?lat=${sim.latitude}&lng=${sim.longitude}`);
  };

  // Menghitung skor tertinggi dari seluruh sesi
  const highestScore = sessions.reduce((max, session) => {
    const sessionMax = (session.simulations || []).reduce((sMax, item) => {
      const score =
        item.score?.total_score || item.score?.target_market_score || 0;

      return Math.max(sMax, score);
    }, 0);

    return Math.max(max, sessionMax);
  }, 0);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="clay rounded-[22px] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="rounded-full bg-primary-soft px-3 py-1 text-[11.5px] font-medium text-primary">
              entrepreneur workspace
            </span>

            <h1 className="mt-2 font-display text-[26px] font-medium tracking-tight text-ink sm:text-[32px]">
              Welcome, {user?.name || "Entrepreneur"}
            </h1>

            <p className="mt-1 text-[14px] leading-relaxed text-muted">
              Manage your business location candidates, spatial feasibility, and
              verified business data.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/view-maps"
              className="clay-primary clay-press flex items-center gap-1.5 rounded-[12px] px-4 py-2 text-[13px] font-bold text-white shadow-sm no-underline"
            >
              <Compass size={15} />
              <span>Open Analysis Map</span>
            </Link>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="clay-soft clay-press flex items-center gap-1.5 rounded-[12px] px-4 py-2 text-[13px] font-bold text-ink transition-colors hover:text-primary"
            >
              <Plus size={15} />
              <span>Register Business</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="clay clay-lift rounded-[16px] p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[12px] font-medium">
              Saved Simulation Sessions
            </span>
            <Store size={16} className="text-primary" />
          </div>

          <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
            {sessions.length}
          </p>

          <p className="mt-2 text-[11.5px] text-muted">
            location candidates evaluated in the database
          </p>
        </div>

        <div className="clay clay-lift rounded-[16px] p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[12px] font-medium">
              My Registered Businesses
            </span>
            <CheckCircle2 size={16} className="text-potential" />
          </div>

          <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
            {businessTotal}
          </p>

          <p className="mt-2 text-[11.5px] text-muted">
            total businesses registered in the LOCIVA database
          </p>
        </div>

        <div className="clay clay-lift rounded-[16px] p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[12px] font-medium">
              Highest Potential Score
            </span>
            <TrendingUp size={16} className="text-primary" />
          </div>

          <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
            {highestScore > 0 ? highestScore : 0}{" "}
            <span className="text-[16px] font-normal text-muted">/ 100</span>
          </p>

          <p className="mt-2 text-[11.5px] text-muted">
            based on your spatial analysis results
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("simulations")}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "simulations"
              ? "bg-primary text-white shadow-xs"
              : "text-muted hover:bg-slate-100 hover:text-ink"
          }`}
        >
          Location Simulations ({sessions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("businesses")}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "businesses"
              ? "bg-primary text-white shadow-xs"
              : "text-muted hover:bg-slate-100 hover:text-ink"
          }`}
        >
          Manage My Businesses ({businessTotal})
        </button>
      </div>

      {/* TAB 1: SIMULATION SESSIONS */}
      {activeTab === "simulations" && (
        <div className="clay rounded-[20px] p-6">
          <div className="flex items-center justify-between border-b border-[#ececf6] pb-4">
            <div>
              <h2 className="font-display text-[20px] font-medium text-ink">
                Saved Location Models
              </h2>

              <p className="text-[12.5px] text-muted">
                Evaluation results for business location candidates saved to the
                database.
              </p>
            </div>

            <Link
              to="/view-maps"
              className="flex items-center gap-1 text-[12.5px] font-bold text-primary no-underline hover:underline"
            >
              <span>+ New Location Simulation</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2 py-16 text-center">
              <RefreshCw className="mx-auto size-6 animate-spin text-primary" />
              <p className="text-xs text-muted">
                Loading simulation sessions from the database...
              </p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="space-y-3 py-16 text-center">
              <Store size={36} className="mx-auto text-slate-300" />

              <h3 className="text-sm font-bold text-ink">
                No Saved Simulation Sessions
              </h3>

              <p className="mx-auto max-w-sm text-xs text-muted">
                Open the map page to analyze and save your business location
                candidates.
              </p>

              <Link
                to="/view-maps"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-deep"
              >
                <Compass size={14} />
                <span>Start a Map Simulation</span>
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {sessions.map((session) => {
                const firstSim = session.simulations?.[0];
                const score =
                  firstSim?.score?.total_score ||
                  firstSim?.score?.target_market_score ||
                  0;

                return (
                  <div
                    key={session.id}
                    className="clay-soft clay-lift flex flex-col justify-between space-y-4 rounded-[16px] p-5"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-[6px] bg-canvas px-2 py-0.5 text-[11px] font-bold text-primary">
                          {firstSim?.business_type?.name || "SME Catalog"}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteSession(session.id, session.name)
                          }
                          className="rounded p-1 text-slate-400 transition-colors hover:text-red-600 cursor-pointer"
                          title="Hapus sesi ini"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <h3 className="mt-2 text-[15px] font-bold text-ink">
                        {session.name}
                      </h3>

                      <p className="mt-1 flex items-center gap-1 text-[11.5px] text-muted">
                        <MapPin size={11} className="text-primary" />
                        <span>
                          {firstSim
                            ? `${parseFloat(String(firstSim.latitude)).toFixed(4)}, ${parseFloat(String(firstSim.longitude)).toFixed(4)}`
                            : "Coordinates unavailable"}
                        </span>
                      </p>

                      <div className="mt-3 flex items-baseline gap-1.5">
                        <span className="font-display text-[30px] font-bold text-ink tabular-nums">
                          {score}
                        </span>
                        <span className="text-[13px] text-muted">/ 100</span>
                        <span className="ml-2 text-[11px] text-muted">
                          (radius {firstSim?.radius_m || 500}m)
                        </span>
                      </div>

                      {/* Candidate points pills if multiple */}
                      {session.simulations &&
                        session.simulations.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {session.simulations.map((sim, sIdx) => {
                              const candLetter =
                                sim.candidate_id ||
                                (sim.target_market
                                  ? sim.target_market.replace("Candidate_", "")
                                  : String.fromCharCode(65 + sIdx));
                              const candScore =
                                sim.score?.total_score ||
                                sim.score?.target_market_score ||
                                0;
                              return (
                                <button
                                  key={sim.id}
                                  type="button"
                                  onClick={() =>
                                    handleSelectCandidate(session, sim)
                                  }
                                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                                  title={`Buka statistik kandidat ${candLetter}`}
                                >
                                  <span className="size-3.5 rounded-full bg-primary text-white text-[9px] flex items-center justify-center font-bold">
                                    {candLetter}
                                  </span>
                                  <span className="tabular-nums font-semibold">
                                    {candScore}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                      {session.description && (
                        <p className="mt-2 text-[11.5px] leading-5 text-muted">
                          {session.description}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (firstSim) {
                            handleSelectCandidate(session, firstSim);
                          }
                        }}
                        disabled={!firstSim}
                        className="w-full mt-3.5 py-2 px-3 rounded-xl text-xs font-semibold bg-primary-soft hover:bg-primary/20 text-primary flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <BarChart3 size={13} />
                        <span>Lihat Statistik Lengkap</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#f0f0f8] pt-3">
                      <span className="text-[11px] text-muted">
                        {session.simulations?.length || 1} titik kandidat
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenSimulationOnMap(firstSim)}
                        disabled={!firstSim}
                        className="inline-flex cursor-pointer items-center gap-1 text-[12px] font-bold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span>Buka di Maps</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Detail Statistik Kandidat pada Halaman */}
          {selectedCandidateDetail && (
            <div
              id="candidate-statistics"
              className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    {selectedCandidateDetail.simulation.candidate_id ||
                      selectedCandidateDetail.simulation.target_market?.replace(
                        "Candidate_",
                        "",
                      ) ||
                      "A"}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold text-ink">
                      Statistik Kandidat{" "}
                      {selectedCandidateDetail.simulation.candidate_id ||
                        selectedCandidateDetail.simulation.target_market?.replace(
                          "Candidate_",
                          "",
                        ) ||
                        "A"}
                    </h3>

                    <p className="mt-0.5 truncate text-xs text-muted">
                      Sesi: {selectedCandidateDetail.session.name}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCandidateDetail(null)}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-ink"
                >
                  <X size={14} className="mr-1 inline" />
                  Tutup
                </button>
              </div>

              <div className="space-y-6 p-5 sm:p-6">
                {/* Status dan Lokasi */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted">Status Analisis:</span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        selectedCandidateDetail.simulation.score
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {selectedCandidateDetail.simulation.score
                        ? "Analisis Selesai"
                        : "Belum Dianalisis"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
                    <MapPin size={13} className="text-primary" />

                    <span>
                      {Number(
                        selectedCandidateDetail.simulation.latitude,
                      ).toFixed(5)}
                      ,{" "}
                      {Number(
                        selectedCandidateDetail.simulation.longitude,
                      ).toFixed(5)}
                    </span>
                  </div>
                </div>

                {/* Skor Utama */}
                <section>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                    Ringkasan Skor Kelayakan Spasial
                  </h4>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      {
                        label: "Total Skor",
                        value:
                          selectedCandidateDetail.simulation.score?.total_score,
                        description: "Skala 0–100",
                        color: "text-ink",
                      },
                      {
                        label: "Peluang Pasar",
                        value:
                          selectedCandidateDetail.simulation.score
                            ?.target_market_score,
                        description: "Segmen sasaran",
                        color: "text-emerald-600",
                      },
                      {
                        label: "Persaingan",
                        value:
                          selectedCandidateDetail.simulation.score
                            ?.competition_score,
                        description: "Tingkat kompetisi",
                        color: "text-amber-600",
                      },
                      {
                        label: "Aksesibilitas",
                        value:
                          selectedCandidateDetail.simulation.score
                            ?.accessibility_score,
                        description: "Jaringan dan transit",
                        color: "text-indigo-600",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"
                      >
                        <span className="block text-[11px] text-muted">
                          {item.label}
                        </span>

                        <span
                          className={`mt-2 block font-display text-2xl font-bold tabular-nums ${item.color}`}
                        >
                          {item.value ?? "N/A"}
                        </span>

                        <span className="mt-1 block text-[10px] text-muted">
                          {item.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Indikator Pendukung */}
                <section>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                    Indikator Spasial Pendukung
                  </h4>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      {
                        label: "Populasi dan Demografi",
                        value:
                          selectedCandidateDetail.simulation.score
                            ?.population_score,
                        fallback: "Data tidak tersedia",
                      },
                      {
                        label: "Lalu Lintas Pejalan",
                        value:
                          selectedCandidateDetail.simulation.score
                            ?.pedestrian_score,
                        fallback: "Data tidak tersedia",
                      },
                      {
                        label: "Kesesuaian Zona",
                        value:
                          selectedCandidateDetail.simulation.score
                            ?.area_compatibility_score,
                        fallback: "Data tidak tersedia",
                      },
                      {
                        label: "Infrastruktur",
                        value:
                          selectedCandidateDetail.simulation.score
                            ?.infrastructure_score,
                        fallback: "Data tidak tersedia",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                      >
                        <span className="text-xs text-muted">{item.label}</span>

                        <span className="text-right text-xs font-bold tabular-nums text-ink">
                          {item.value ?? item.fallback}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Informasi Radius */}
                <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted">Radius Jangkauan Layanan</span>

                    <span className="font-semibold text-ink">
                      {selectedCandidateDetail.simulation.radius_m || 500} meter
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted">
                      Estimasi Luas Catchment Area
                    </span>

                    <span className="font-semibold text-ink">
                      {(
                        Math.PI *
                        Math.pow(
                          (selectedCandidateDetail.simulation.radius_m || 500) /
                            1000,
                          2,
                        )
                      ).toFixed(2)}{" "}
                      km²
                    </span>
                  </div>

                  <p className="border-t border-slate-200 pt-3 text-[11px] leading-relaxed text-muted">
                    Data statistik berasal dari hasil simulasi yang tersimpan di
                    database LOCIVA. Nilai yang tidak tersedia ditampilkan
                    sebagai data tidak tersedia.
                  </p>
                </section>

                {/* Actions */}
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenSimulationOnMap(
                        selectedCandidateDetail.simulation,
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-primary-deep"
                  >
                    <Compass size={14} />
                    Buka dan Analisis di Maps
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USER BUSINESSES */}
      {activeTab === "businesses" && (
        <div className="clay rounded-[20px] p-6">
          <div className="flex items-center justify-between border-b border-[#ececf6] pb-4">
            <div>
              <h2 className="font-display text-[20px] font-medium text-ink">
                My Registered Businesses
              </h2>

              <p className="text-[12.5px] text-muted">
                Your registered businesses displayed on LOCIVA's internal map
                data layer.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-primary-deep"
            >
              <Plus size={13} />
              <span>Register Business</span>
            </button>
          </div>

          {loading ? (
            <div className="space-y-2 py-16 text-center">
              <RefreshCw className="mx-auto size-6 animate-spin text-primary" />
              <p className="text-xs text-muted">
                Loading business data from the database...
              </p>
            </div>
          ) : businesses.length === 0 ? (
            <div className="space-y-3 py-16 text-center">
              <Store size={36} className="mx-auto text-slate-300" />

              <h3 className="text-sm font-bold text-ink">
                No Registered Businesses Yet
              </h3>

              <p className="mx-auto max-w-sm text-xs text-muted">
                Register your business so it can be evaluated and displayed on
                LOCIVA's internal map.
              </p>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-deep"
              >
                <Plus size={14} />
                <span>Add Your Business</span>
              </button>
            </div>
          ) : (
            <>
              {/* Business Cards */}
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {businesses.map((biz) => {
                  const imageUrl = getBusinessImageUrl(biz.image);

                  return (
                    <div
                      key={biz.id}
                      className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="relative h-48 overflow-hidden bg-slate-100">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={`${biz.name} photo`}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                            <Store size={38} strokeWidth={1.5} />
                            <span className="text-xs">No photo available</span>
                          </div>
                        )}

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4 pt-12">
                          <span className="inline-flex rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-primary">
                            {biz.business_type?.name ||
                              biz.business_type_name ||
                              "Registered Business"}
                          </span>
                        </div>

                        <div className="absolute right-3 top-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(biz)}
                            className="rounded-full bg-white/95 p-2 text-slate-700 shadow transition hover:bg-primary hover:text-white"
                            title="Edit business"
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteBusiness(biz.id, biz.name)
                            }
                            className="rounded-full bg-white/95 p-2 text-slate-700 shadow transition hover:bg-red-600 hover:text-white"
                            title="Delete business"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 p-5">
                        <div>
                          <h3 className="text-lg font-bold leading-snug text-ink">
                            {biz.name}
                          </h3>

                          {biz.address && (
                            <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-muted">
                              <MapPin
                                size={14}
                                className="mt-0.5 shrink-0 text-primary"
                              />
                              <span>{biz.address}</span>
                            </p>
                          )}
                        </div>

                        <p className="min-h-10 text-sm leading-relaxed text-slate-600">
                          {biz.description ||
                            "No description available for this business."}
                        </p>

                        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <div className="min-w-0 text-[11px] text-muted">
                            <span className="block">Location Coordinates</span>

                            <span className="mt-1 block truncate font-medium text-slate-600">
                              {Number.isFinite(Number(biz.latitude)) &&
                              Number.isFinite(Number(biz.longitude))
                                ? `${Number(biz.latitude).toFixed(5)}, ${Number(biz.longitude).toFixed(5)}`
                                : "-"}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/view-maps?lat=${biz.latitude}&lng=${biz.longitude}`,
                              )
                            }
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white transition hover:bg-primary-deep"
                          >
                            <MapPin size={13} />
                            View Map
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Business Pagination */}
              {businessLastPage > 1 && (
                <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-muted">
                    Page {businessPage} of {businessLastPage}
                    {" · "}
                    {businessTotal} businesses
                  </span>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setBusinessPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={businessPage <= 1 || loading}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-ink transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>

                    {getPageNumbers(businessPage, businessLastPage).map(
                      (page, index) =>
                        page === "..." ? (
                          <span
                            key={`ellipsis-${index}`}
                            className="px-1 text-slate-400"
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setBusinessPage(page)}
                            disabled={loading || businessPage === page}
                            className={`min-w-9 rounded-xl px-3 py-2 text-xs font-bold transition disabled:cursor-default ${
                              businessPage === page
                                ? "bg-primary text-white"
                                : "border border-slate-200 bg-white text-ink hover:bg-slate-100"
                            }`}
                          >
                            {page}
                          </button>
                        ),
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setBusinessPage((prev) =>
                          Math.min(businessLastPage, prev + 1),
                        )
                      }
                      disabled={businessPage >= businessLastPage || loading}
                      className="inline-flex items-center rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white transition hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ArrowRight size={13} className="ml-1" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* CREATE / EDIT BUSINESS MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="clay max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-ink">
                {editingBusiness
                  ? "Edit Business Details"
                  : "Register a New Business"}
              </h3>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg bg-slate-100 p-1 text-muted hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitBusiness} className="space-y-3 text-xs">
              {/* Business Photo */}
              <div>
                <label className="mb-2 block font-bold text-ink">
                  Business Photo
                </label>

                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  {imagePreview ? (
                    <div className="relative mb-3">
                      <img
                        src={imagePreview}
                        alt="Business photo preview"
                        className="h-48 w-full rounded-xl object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white hover:bg-red-600"
                        aria-label="Remove photo"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-xl bg-white text-slate-400">
                      <Store size={32} />
                      <span className="text-xs">
                        No business photo selected
                      </span>
                    </div>
                  )}

                  <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-primary shadow-sm transition hover:bg-primary-soft">
                    <Plus size={16} />
                    {imagePreview
                      ? "Change Business Photo"
                      : "Choose Business Photo"}

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        // Validate maximum file size: 2 MB
                        if (file.size > 2 * 1024 * 1024) {
                          toast({
                            title: "File Too Large",
                            description:
                              "Please choose an image smaller than 2 MB.",
                            variant: "error",
                          });

                          e.target.value = "";
                          return;
                        }

                        if (imagePreview?.startsWith("blob:")) {
                          URL.revokeObjectURL(imagePreview);
                        }

                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }}
                    />
                  </label>

                  <p className="mt-2 text-center text-[11px] text-muted">
                    JPG, PNG, or WebP · Maximum 2 MB
                  </p>
                </div>
              </div>

              {/* Business Name */}
              <div>
                <label className="mb-1 block font-bold text-ink">
                  Business Name *
                </label>

                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Example: Sudirman Coffee Shop"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Business Type */}
              <div>
                <label className="mb-1 block font-bold text-ink">
                  Business Type / Category *
                </label>

                <select
                  required
                  value={formData.business_type_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      business_type_id: e.target.value,
                    }))
                  }
                  disabled={businessTypes.length === 0}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                >
                  <option value="" disabled>
                    {businessTypes.length === 0
                      ? "No business types available"
                      : "Select Business Type"}
                  </option>

                  {businessTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Business Location */}
              <div>
                <label className="mb-1 block font-bold text-ink">
                  Business Location *
                </label>

                <button
                  type="button"
                  onClick={() => setIsMapPickerOpen(true)}
                  className="group flex w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-all hover:border-primary hover:bg-primary-soft/30 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <MapPin
                    className="shrink-0 text-primary transition-transform group-hover:scale-110"
                    size={14}
                  />

                  {Number.isFinite(parseFloat(formData.latitude)) &&
                  Number.isFinite(parseFloat(formData.longitude)) ? (
                    <span className="font-medium text-ink">
                      {parseFloat(formData.latitude).toFixed(6)},{" "}
                      {parseFloat(formData.longitude).toFixed(6)}
                    </span>
                  ) : (
                    <span className="text-muted">
                      Click to select a location on the map...
                    </span>
                  )}
                </button>

                {formData.latitude && formData.longitude && (
                  <p className="mt-1 flex items-center gap-1 text-[10.5px] text-primary">
                    <CheckCircle2 size={10} />
                    <span>Location selected on the map</span>
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="mb-1 block font-bold text-ink">
                  Full Address
                </label>

                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder="45 Sudirman Street, Jakarta"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block font-bold text-ink">
                  Short Description
                </label>

                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe your business highlights or operating hours..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 font-bold text-muted hover:text-ink"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-bold text-white shadow-xs hover:bg-primary-deep disabled:opacity-60"
                >
                  {submitting && (
                    <RefreshCw size={12} className="animate-spin" />
                  )}

                  <span>
                    {editingBusiness ? "Save Changes" : "Register Business"}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Location Picker Modal */}
          <LocationPickerModal
            isOpen={isMapPickerOpen}
            onClose={() => setIsMapPickerOpen(false)}
            onConfirm={(lat, lng) => {
              setFormData((prev) => ({
                ...prev,
                latitude: String(lat),
                longitude: String(lng),
              }));

              setIsMapPickerOpen(false);
            }}
            initialLat={
              formData.latitude ? parseFloat(formData.latitude) : undefined
            }
            initialLng={
              formData.longitude ? parseFloat(formData.longitude) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
