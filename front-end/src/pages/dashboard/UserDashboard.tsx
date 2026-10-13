
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
    target_market: string;
    latitude: number;
    longitude: number;
    radius_m: number;
    business_type?: BusinessTypeItem | null;
    score?: {
      target_market_score?: number;
      competition_score?: number;
      accessibility_score?: number;
      total_score?: number;
    } | null;
  }[];
  created_at?: string;
}

export default function UserDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"simulations" | "businesses">(
    "simulations"
  );
  const [sessions, setSessions] = useState<SimulationSessionItem[]>([]);
  const [businesses, setBusinesses] = useState<UserBusiness[]>([]);
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // State pagination usaha
  const [businessPage, setBusinessPage] = useState(1);
  const [businessLastPage, setBusinessLastPage] = useState(1);
  const [businessTotal, setBusinessTotal] = useState(0);

  // State modal usaha
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] =
    useState<UserBusiness | null>(null);

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
          console.error("Format response simulasi tidak sesuai:", data);
        }
      } else {
        console.error(
          "Gagal memuat sesi simulasi:",
          sessionsResult.reason?.response?.data ||
            sessionsResult.reason
        );
      }

      // 2. Data usaha pengguna
      if (businessesResult.status === "fulfilled") {
        const response = businessesResult.value.data;
        const businessList = response?.data?.Data;
        const meta = response?.data?.meta;

        if (Array.isArray(businessList)) {
          setBusinesses(businessList);
          setBusinessTotal(
            Number(meta?.total ?? businessList.length)
          );
          setBusinessLastPage(
            Number(meta?.last_page ?? 1)
          );

          // Debug sementara jika metadata pagination bermasalah
          console.log("Response bisnis:", response);
          console.log("Metadata pagination:", meta);
        } else {
          setBusinesses([]);
          setBusinessTotal(0);
          setBusinessLastPage(1);

          console.error(
            "Format response bisnis tidak sesuai:",
            response
          );
        }
      } else {
        setBusinesses([]);
        setBusinessTotal(0);
        setBusinessLastPage(1);

        console.error(
          "Gagal memuat data bisnis:",
          businessesResult.reason?.response?.data ||
            businessesResult.reason
        );
      }

      // 3. Jenis usaha dari API /business-types
      if (typesResult.status === "fulfilled") {
        const data = typesResult.value.data;

        const types: BusinessTypeItem[] = Array.isArray(
          data?.data?.Data
        )
          ? data.data.Data
          : [];

        setBusinessTypes(types);

        setFormData((prev) => ({
          ...prev,
          business_type_id:
            prev.business_type_id &&
            types.some(
              (type) => type.id === prev.business_type_id
            )
              ? prev.business_type_id
              : types[0]?.id || "",
        }));
      } else {
        console.error(
          "Gagal memuat jenis usaha:",
          typesResult.reason?.response?.data ||
            typesResult.reason
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

  // Membuat atau memperbarui usaha
  const handleSubmitBusiness = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.business_type_id
    ) {
      toast({
        title: "Validasi Gagal",
        description: "Nama dan jenis usaha wajib diisi.",
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
        title: "Validasi Gagal",
        description:
          "Silakan pilih lokasi bisnis di peta terlebih dahulu.",
        variant: "error",
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload = new FormData();

      payload.append("name", formData.name.trim());
      payload.append(
        "description",
        formData.description.trim()
      );
      payload.append(
        "business_type_id",
        formData.business_type_id
      );
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

        res = await api.post(
          `/businesses/${editingBusiness.id}`,
          payload
        );
      } else {
        res = await api.post("/businesses", payload);
      }

      if (res.data?.success) {
        toast({
          title: editingBusiness
            ? "Usaha Diperbarui"
            : "Usaha Terdaftar",
          description: editingBusiness
            ? "Data dan foto usaha berhasil diperbarui."
            : "Usaha baru berhasil didaftarkan.",
          variant: "success",
        });

        setIsModalOpen(false);
        setImageFile(null);
        setImagePreview(null);

        await loadDashboardData();
      }
    } catch (err: any) {
      toast({
        title: "Gagal Menyimpan",
        description:
          err.response?.data?.message ||
          "Terjadi kesalahan saat menyimpan data usaha.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Menghapus usaha
  const handleDeleteBusiness = async (
    id: string,
    name: string
  ) => {
    if (
      !window.confirm(
        `Hapus bisnis "${name}" dari sistem?`
      )
    ) {
      return;
    }

    try {
      const res = await api.delete(`/businesses/${id}`);

      if (res.data?.success) {
        toast({
          title: "Bisnis Dihapus",
          description: `Bisnis "${name}" berhasil dihapus.`,
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
        title: "Gagal Menghapus",
        description:
          err.response?.data?.message ||
          "Tidak dapat menghapus bisnis.",
        variant: "error",
      });
    }
  };

  // Menghapus sesi simulasi
  const handleDeleteSession = async (
    sessionId: string,
    sessionName: string
  ) => {
    if (
      !window.confirm(
        `Hapus sesi simulasi "${sessionName}"?`
      )
    ) {
      return;
    }

    try {
      const res = await api.delete(
        `/simulations/sessions/${sessionId}`
      );

      if (res.data?.success) {
        setSessions((prev) =>
          prev.filter((session) => session.id !== sessionId)
        );

        toast({
          title: "Sesi Dihapus",
          description: `Sesi "${sessionName}" berhasil dihapus.`,
          variant: "success",
        });
      }
    } catch (err: any) {
      toast({
        title: "Gagal Menghapus",
        description:
          err.response?.data?.message ||
          "Tidak dapat menghapus sesi simulasi.",
        variant: "error",
      });
    }
  };

  // Membuka lokasi simulasi pada peta
  const handleOpenSimulationOnMap = (sim: any) => {
    if (!sim) return;

    navigate(
      `/view-maps?lat=${sim.latitude}&lng=${sim.longitude}`
    );
  };

  // Menghitung skor tertinggi dari seluruh sesi
  const highestScore = sessions.reduce((max, session) => {
    const sessionMax = (session.simulations || []).reduce(
      (sMax, item) => {
        const score =
          item.score?.total_score ||
          item.score?.target_market_score ||
          0;

        return Math.max(sMax, score);
      },
      0
    );

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
              Selamat datang, {user?.name || "Pelaku Usaha"}
            </h1>

            <p className="mt-1 text-[14px] leading-relaxed text-muted">
              Kelola kandidat lokasi usaha, kelayakan spasial,
              dan data bisnis terverifikasi Anda.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/view-maps"
              className="clay-primary clay-press flex items-center gap-1.5 rounded-[12px] px-4 py-2 text-[13px] font-bold text-white shadow-sm no-underline"
            >
              <Compass size={15} />
              <span>Buka Peta Analisis</span>
            </Link>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="clay-soft clay-press flex items-center gap-1.5 rounded-[12px] px-4 py-2 text-[13px] font-bold text-ink transition-colors hover:text-primary"
            >
              <Plus size={15} />
              <span>Daftarkan Usaha</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="clay clay-lift rounded-[16px] p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[12px] font-medium">
              Sesi Simulasi Tersimpan
            </span>
            <Store size={16} className="text-primary" />
          </div>

          <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
            {sessions.length}
          </p>

          <p className="mt-2 text-[11.5px] text-muted">
            kandidat lokasi dievaluasi di database
          </p>
        </div>

        <div className="clay clay-lift rounded-[16px] p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[12px] font-medium">
              Usaha Saya Terdaftar
            </span>
            <CheckCircle2
              size={16}
              className="text-potential"
            />
          </div>

          <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
            {businessTotal}
          </p>

          <p className="mt-2 text-[11.5px] text-muted">
            total usaha tercatat di database LOCIVA
          </p>
        </div>

        <div className="clay clay-lift rounded-[16px] p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[12px] font-medium">
              Skor Potensi Tertinggi
            </span>
            <TrendingUp size={16} className="text-primary" />
          </div>

          <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
            {highestScore > 0 ? highestScore : 0}{" "}
            <span className="text-[16px] font-normal text-muted">
              / 100
            </span>
          </p>

          <p className="mt-2 text-[11.5px] text-muted">
            dari hasil kalkulasi spasial Anda
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
          Sesi Simulasi Lokasi ({sessions.length})
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
          Kelola Usaha Saya ({businessTotal})
        </button>
      </div>

      {/* TAB 1: SESI SIMULASI */}
      {activeTab === "simulations" && (
        <div className="clay rounded-[20px] p-6">
          <div className="flex items-center justify-between border-b border-[#ececf6] pb-4">
            <div>
              <h2 className="font-display text-[20px] font-medium text-ink">
                Model Lokasi Tersimpan
              </h2>

              <p className="text-[12.5px] text-muted">
                Hasil evaluasi kandidat titik usaha yang Anda
                simpan ke database.
              </p>
            </div>

            <Link
              to="/view-maps"
              className="flex items-center gap-1 text-[12.5px] font-bold text-primary no-underline hover:underline"
            >
              <span>+ Simulasi Titik Baru</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2 py-16 text-center">
              <RefreshCw className="mx-auto size-6 animate-spin text-primary" />
              <p className="text-xs text-muted">
                Memuat sesi simulasi dari database...
              </p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="space-y-3 py-16 text-center">
              <Store
                size={36}
                className="mx-auto text-slate-300"
              />

              <h3 className="text-sm font-bold text-ink">
                Belum Ada Sesi Simulasi Tersimpan
              </h3>

              <p className="mx-auto max-w-sm text-xs text-muted">
                Buka halaman peta untuk menganalisis dan menyimpan
                kandidat lokasi usaha Anda.
              </p>

              <Link
                to="/view-maps"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-deep"
              >
                <Compass size={14} />
                <span>Mulai Simulasi di Peta</span>
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
                          {firstSim?.business_type?.name ||
                            "Katalog UMKM"}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteSession(
                              session.id,
                              session.name
                            )
                          }
                          className="rounded p-1 text-slate-400 transition-colors hover:text-red-600"
                          title="Hapus sesi ini"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <h3 className="mt-2 text-[15px] font-bold text-ink">
                        {session.name}
                      </h3>

                      <p className="mt-1 flex items-center gap-1 text-[11.5px] text-muted">
                        <MapPin
                          size={11}
                          className="text-primary"
                        />
                        <span>
                          {firstSim
                            ? `${firstSim.latitude.toFixed(4)}, ${firstSim.longitude.toFixed(4)}`
                            : "Koordinat tidak tersedia"}
                        </span>
                      </p>

                      <div className="mt-3 flex items-baseline gap-1.5">
                        <span className="font-display text-[30px] font-bold text-ink">
                          {score}
                        </span>
                        <span className="text-[13px] text-muted">
                          / 100
                        </span>
                        <span className="ml-2 text-[11px] text-muted">
                          (radius {firstSim?.radius_m || 500}m)
                        </span>
                      </div>

                      {session.description && (
                        <p className="mt-2 text-[11.5px] leading-5 text-muted">
                          {session.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-[#f0f0f8] pt-3">
                      <span className="text-[11px] text-muted">
                        {session.simulations?.length || 1} titik
                        kandidat
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenSimulationOnMap(firstSim)
                        }
                        disabled={!firstSim}
                        className="inline-flex cursor-pointer items-center gap-1 text-[12px] font-bold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span>Buka di Peta</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USAHA PENGGUNA */}
      {activeTab === "businesses" && (
        <div className="clay rounded-[20px] p-6">
          <div className="flex items-center justify-between border-b border-[#ececf6] pb-4">
            <div>
              <h2 className="font-display text-[20px] font-medium text-ink">
                Daftar Usaha Terdaftar Anda
              </h2>

              <p className="text-[12.5px] text-muted">
                Usaha milik Anda yang ditampilkan pada lapisan
                data internal LOCIVA di peta.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-primary-deep"
            >
              <Plus size={13} />
              <span>Daftarkan Usaha</span>
            </button>
          </div>

          {loading ? (
            <div className="space-y-2 py-16 text-center">
              <RefreshCw className="mx-auto size-6 animate-spin text-primary" />
              <p className="text-xs text-muted">
                Memuat data usaha dari database...
              </p>
            </div>
          ) : businesses.length === 0 ? (
            <div className="space-y-3 py-16 text-center">
              <Store
                size={36}
                className="mx-auto text-slate-300"
              />

              <h3 className="text-sm font-bold text-ink">
                Belum Ada Usaha Terdaftar
              </h3>

              <p className="mx-auto max-w-sm text-xs text-muted">
                Daftarkan usaha Anda agar dapat dievaluasi dan
                terlihat pada peta internal LOCIVA.
              </p>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-deep"
              >
                <Plus size={14} />
                <span>Tambah Usaha Sekarang</span>
              </button>
            </div>
          ) : (
            <>
              {/* Grid kartu usaha */}
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
                            alt={`Foto ${biz.name}`}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                            <Store
                              size={38}
                              strokeWidth={1.5}
                            />
                            <span className="text-xs">
                              Foto belum tersedia
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4 pt-12">
                          <span className="inline-flex rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-primary">
                            {biz.business_type?.name ||
                              biz.business_type_name ||
                              "Usaha Terdaftar"}
                          </span>
                        </div>

                        <div className="absolute right-3 top-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(biz)}
                            className="rounded-full bg-white/95 p-2 text-slate-700 shadow transition hover:bg-primary hover:text-white"
                            title="Edit usaha"
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteBusiness(
                                biz.id,
                                biz.name
                              )
                            }
                            className="rounded-full bg-white/95 p-2 text-slate-700 shadow transition hover:bg-red-600 hover:text-white"
                            title="Hapus usaha"
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
                            "Belum ada deskripsi untuk usaha ini."}
                        </p>

                        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                          <div className="min-w-0 text-[11px] text-muted">
                            <span className="block">
                              Koordinat lokasi
                            </span>

                            <span className="mt-1 block truncate font-medium text-slate-600">
                              {Number(biz.latitude).toFixed(5)},{" "}
                              {Number(biz.longitude).toFixed(5)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/view-maps?lat=${biz.latitude}&lng=${biz.longitude}`
                              )
                            }
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white transition hover:bg-primary-deep"
                          >
                            <MapPin size={13} />
                            Lihat Peta
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination usaha */}
              {businessLastPage > 1 && (
                <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-muted">
                    Halaman {businessPage} dari{" "}
                    {businessLastPage}
                    {" · "}
                    {businessTotal} usaha
                  </span>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setBusinessPage((prev) =>
                          Math.max(1, prev - 1)
                        )
                      }
                      disabled={businessPage <= 1 || loading}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-ink transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setBusinessPage((prev) =>
                          Math.min(businessLastPage, prev + 1)
                        )
                      }
                      disabled={
                        businessPage >= businessLastPage ||
                        loading
                      }
                      className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <ArrowRight
                        size={13}
                        className="ml-1"
                      />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MODAL CREATE / EDIT USAHA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="clay max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-ink">
                {editingBusiness
                  ? "Edit Data Usaha"
                  : "Daftarkan Usaha Baru"}
              </h3>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg bg-slate-100 p-1 text-muted hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleSubmitBusiness}
              className="space-y-3 text-xs"
            >
              {/* Foto usaha */}
              <div>
                <label className="mb-2 block font-bold text-ink">
                  Foto Usaha
                </label>

                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  {imagePreview ? (
                    <div className="relative mb-3">
                      <img
                        src={imagePreview}
                        alt="Preview foto usaha"
                        className="h-48 w-full rounded-xl object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white hover:bg-red-600"
                        aria-label="Hapus foto"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-xl bg-white text-slate-400">
                      <Store size={32} />
                      <span className="text-xs">
                        Belum ada foto usaha
                      </span>
                    </div>
                  )}

                  <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-primary shadow-sm transition hover:bg-primary-soft">
                    <Plus size={16} />
                    {imagePreview
                      ? "Ganti Foto Usaha"
                      : "Pilih Foto Usaha"}

                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        // Validasi ukuran file maksimal 2 MB
                        if (file.size > 2 * 1024 * 1024) {
                          toast({
                            title: "Ukuran Foto Terlalu Besar",
                            description:
                              "Pilih foto dengan ukuran maksimal 2 MB.",
                            variant: "error",
                          });

                          e.target.value = "";
                          return;
                        }

                        if (
                          imagePreview?.startsWith("blob:")
                        ) {
                          URL.revokeObjectURL(imagePreview);
                        }

                        setImageFile(file);
                        setImagePreview(
                          URL.createObjectURL(file)
                        );
                      }}
                    />
                  </label>

                  <p className="mt-2 text-center text-[11px] text-muted">
                    JPG, PNG, atau WebP · Maksimal 2 MB
                  </p>
                </div>
              </div>

              {/* Nama usaha */}
              <div>
                <label className="mb-1 block font-bold text-ink">
                  Nama Usaha *
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
                  placeholder="Contoh: Kedai Kopi Sudirman"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Jenis usaha */}
              <div>
                <label className="mb-1 block font-bold text-ink">
                  Jenis Usaha / Katalog *
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
                      ? "Jenis usaha belum tersedia"
                      : "Pilih Jenis Usaha"}
                  </option>

                  {businessTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lokasi usaha */}
              <div>
                <label className="mb-1 block font-bold text-ink">
                  Lokasi Bisnis *
                </label>

                <button
                  type="button"
                  onClick={() => setIsMapPickerOpen(true)}
                  className="group flex w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-all hover:border-primary hover:bg-primary-soft/30 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <MapPin className="shrink-0 text-primary transition-transform group-hover:scale-110" size={14} />

                  {formData.latitude && formData.longitude ? (
                    <span className="font-medium text-ink">
                      {parseFloat(formData.latitude).toFixed(6)},{" "}
                      {parseFloat(formData.longitude).toFixed(6)}
                    </span>
                  ) : (
                    <span className="text-muted">
                      Klik untuk pilih lokasi di peta...
                    </span>
                  )}
                </button>

                {formData.latitude && formData.longitude && (
                  <p className="mt-1 flex items-center gap-1 text-[10.5px] text-primary">
                    <CheckCircle2 size={10} />
                    <span>
                      Lokasi telah dipilih melalui peta
                    </span>
                  </p>
                )}
              </div>

              {/* Alamat */}
              <div>
                <label className="mb-1 block font-bold text-ink">
                  Alamat Lengkap
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
                  placeholder="Jl. Jenderal Sudirman No. 45, Jakarta"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="mb-1 block font-bold text-ink">
                  Deskripsi Singkat
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
                  placeholder="Deskripsi keunggulan atau jam operasional..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Tombol aksi */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 font-bold text-muted hover:text-ink"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 py-2 font-bold text-white shadow-xs hover:bg-primary-deep disabled:opacity-60"
                >
                  {submitting && (
                    <RefreshCw
                      size={12}
                      className="animate-spin"
                    />
                  )}

                  <span>
                    {editingBusiness
                      ? "Simpan Perubahan"
                      : "Daftarkan Usaha"}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Modal pemilihan lokasi */}
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
              formData.latitude
                ? parseFloat(formData.latitude)
                : undefined
            }
            initialLng={
              formData.longitude
                ? parseFloat(formData.longitude)
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
