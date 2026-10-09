import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ClayButton } from "@/components/ui/ClayButton";
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
  AlertCircle,
  X,
} from "lucide-react";
import api from "@/context/apiClient";
import { useToast } from "@/components/ui/Toast";

interface BusinessTypeItem {
  id: string;
  name: string;
  slug: string;
  category: string;
}

interface UserBusiness {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  business_type?: BusinessTypeItem | null;
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

  // State
  const [activeTab, setActiveTab] = useState<"simulations" | "businesses">("simulations");
  const [sessions, setSessions] = useState<SimulationSessionItem[]>([]);
  const [businesses, setBusinesses] = useState<UserBusiness[]>([]);
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Business Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<UserBusiness | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    business_type_id: "",
    latitude: "-6.2088",
    longitude: "106.8456",
    address: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch all initial data
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsRes, bizRes, typesRes] = await Promise.all([
        api.get("/simulations/sessions"),
        api.get("/businesses"),
        api.get("/business-types", { params: { per_page: 50 } }),
      ]);

      if (sessionsRes.data?.success && Array.isArray(sessionsRes.data?.data)) {
        setSessions(sessionsRes.data.data);
      }

      if (bizRes.data?.success && Array.isArray(bizRes.data?.data)) {
        setBusinesses(bizRes.data.data);
      }

      if (typesRes.data?.success && typesRes.data?.data) {
        const types = Array.isArray(typesRes.data.data.data)
          ? typesRes.data.data.data
          : Array.isArray(typesRes.data.data)
          ? typesRes.data.data
          : [];
        setBusinessTypes(types);
        if (types.length > 0 && !formData.business_type_id) {
          setFormData((prev) => ({ ...prev, business_type_id: types[0].id }));
        }
      }
    } catch (err: any) {
      console.warn("Gagal memuat data dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingBusiness(null);
    setFormData({
      name: "",
      description: "",
      business_type_id: businessTypes[0]?.id || "",
      latitude: "-6.2088",
      longitude: "106.8456",
      address: "",
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (biz: UserBusiness) => {
    setEditingBusiness(biz);
    setFormData({
      name: biz.name,
      description: biz.description || "",
      business_type_id: biz.business_type?.id || businessTypes[0]?.id || "",
      latitude: String(biz.latitude),
      longitude: String(biz.longitude),
      address: biz.address || "",
    });
    setIsModalOpen(true);
  };

  // Submit Business Create / Update
  const handleSubmitBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.business_type_id) {
      toast({
        title: "Validasi Gagal",
        description: "Nama dan jenis usaha wajib diisi.",
        variant: "error",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        business_type_id: formData.business_type_id,
        latitude: parseFloat(formData.latitude) || -6.2088,
        longitude: parseFloat(formData.longitude) || 106.8456,
        address: formData.address.trim() || null,
      };

      if (editingBusiness) {
        // Update
        const res = await api.put(`/businesses/${editingBusiness.id}`, payload);
        if (res.data?.success) {
          toast({
            title: "Usaha Diperbarui",
            description: "Informasi bisnis berhasil diperbarui di database LOCIVA.",
            variant: "success",
          });
          setIsModalOpen(false);
          loadDashboardData();
        }
      } else {
        // Create
        const res = await api.post("/businesses", payload);
        if (res.data?.success) {
          toast({
            title: "Usaha Terdaftar",
            description: "Bisnis baru Anda berhasil didaftarkan ke sistem.",
            variant: "success",
          });
          setIsModalOpen(false);
          loadDashboardData();
        }
      }
    } catch (err: any) {
      toast({
        title: "Gagal Menyimpan",
        description: err.response?.data?.message || "Terjadi kesalahan saat menyimpan data bisnis.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Business
  const handleDeleteBusiness = async (id: string, name: string) => {
    if (!window.confirm(`Hapus bisnis "${name}" dari sistem?`)) return;

    try {
      const res = await api.delete(`/businesses/${id}`);
      if (res.data?.success) {
        setBusinesses((prev) => prev.filter((b) => b.id !== id));
        toast({
          title: "Bisnis Dihapus",
          description: `Bisnis "${name}" berhasil dihapus.`,
          variant: "success",
        });
      }
    } catch (err: any) {
      toast({
        title: "Gagal Menghapus",
        description: err.response?.data?.message || "Tidak dapat menghapus bisnis.",
        variant: "error",
      });
    }
  };

  // Delete Simulation Session
  const handleDeleteSession = async (sessionId: string, sessionName: string) => {
    if (!window.confirm(`Hapus sesi simulasi "${sessionName}"?`)) return;

    try {
      const res = await api.delete(`/simulations/sessions/${sessionId}`);
      if (res.data?.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        toast({
          title: "Sesi Dihapus",
          description: `Sesi "${sessionName}" berhasil dihapus.`,
          variant: "success",
        });
      }
    } catch (err: any) {
      toast({
        title: "Gagal Menghapus",
        description: err.response?.data?.message || "Tidak dapat menghapus sesi simulasi.",
        variant: "error",
      });
    }
  };

  // Resume simulation on maps
  const handleOpenSimulationOnMap = (sim: any) => {
    navigate(`/view-maps?lat=${sim.latitude}&lng=${sim.longitude}`);
  };

  // Calculate highest score from real sessions
  const highestScore = sessions.reduce((max, s) => {
    const sessionMax = (s.simulations || []).reduce((sMax, item) => {
      const score = item.score?.total_score || item.score?.target_market_score || 0;
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
              Selamat datang, {user?.name || "Pelaku Usaha"}
            </h1>
            <p className="mt-1 text-[14px] leading-relaxed text-muted">
              Kelola kandidat lokasi usaha, kelayakan spasial, dan data bisnis terverifikasi Anda.
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
              className="clay-soft clay-press flex items-center gap-1.5 rounded-[12px] px-4 py-2 text-[13px] font-bold text-ink hover:text-primary transition-colors cursor-pointer"
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
            <span className="text-[12px] font-medium">Sesi Simulasi Tersimpan</span>
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
            <span className="text-[12px] font-medium">Usaha Saya Terdaftar</span>
            <CheckCircle2 size={16} className="text-potential" />
          </div>
          <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
            {businesses.length}
          </p>
          <p className="mt-2 text-[11.5px] text-muted">
            tercatat di database internal LOCIVA
          </p>
        </div>

        <div className="clay clay-lift rounded-[16px] p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[12px] font-medium">Skor Potensi Tertinggi</span>
            <TrendingUp size={16} className="text-primary" />
          </div>
          <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
            {highestScore > 0 ? highestScore : 0}{" "}
            <span className="text-[16px] text-muted font-normal">/ 100</span>
          </p>
          <p className="mt-2 text-[11.5px] text-muted">
            dari hasil kalkulasi spasial Anda
          </p>
        </div>
      </div>

      {/* Tab Switcher: Sesi Simulasi vs Bisnis Saya */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("simulations")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "simulations"
              ? "bg-primary text-white shadow-xs"
              : "text-muted hover:text-ink hover:bg-slate-100"
          }`}
        >
          Sesi Simulasi Lokasi ({sessions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("businesses")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "businesses"
              ? "bg-primary text-white shadow-xs"
              : "text-muted hover:text-ink hover:bg-slate-100"
          }`}
        >
          Kelola Usaha Saya ({businesses.length})
        </button>
      </div>

      {/* TAB 1: SAVED SIMULATION SESSIONS */}
      {activeTab === "simulations" && (
        <div className="clay rounded-[20px] p-6">
          <div className="flex items-center justify-between border-b border-[#ececf6] pb-4">
            <div>
              <h2 className="font-display text-[20px] font-medium text-ink">
                Model Lokasi Tersimpan
              </h2>
              <p className="text-[12.5px] text-muted">
                Hasil evaluasi kandidat titik usaha yang Anda simpan ke database.
              </p>
            </div>
            <Link
              to="/view-maps"
              className="flex items-center gap-1 text-[12.5px] font-bold text-primary hover:underline no-underline"
            >
              <span>+ Simulasi Titik Baru</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="py-16 text-center space-y-2">
              <RefreshCw className="size-6 text-primary animate-spin mx-auto" />
              <p className="text-xs text-muted">Memuat sesi simulasi dari database...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Store size={36} className="mx-auto text-slate-300" />
              <h3 className="font-bold text-ink text-sm">Belum Ada Sesi Simulasi Tersimpan</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Buka halaman peta untuk menganalisis dan menyimpan kandidat lokasi usaha Anda.
              </p>
              <Link
                to="/view-maps"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary-deep"
              >
                <Compass size={14} />
                <span>Mulai Simulasi di Peta</span>
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {sessions.map((session) => {
                const firstSim = session.simulations?.[0];
                const score = firstSim?.score?.total_score || firstSim?.score?.target_market_score || 0;

                return (
                  <div
                    key={session.id}
                    className="clay-soft clay-lift flex flex-col justify-between rounded-[16px] p-5 space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-[6px] bg-canvas px-2 py-0.5 text-[11px] font-bold text-primary">
                          {firstSim?.business_type?.name || "Katalog UMKM"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSession(session.id, session.name)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
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
                          {firstSim?.latitude.toFixed(4)}, {firstSim?.longitude.toFixed(4)}
                        </span>
                      </p>

                      <div className="mt-3 flex items-baseline gap-1.5">
                        <span className="font-display text-[30px] font-bold text-ink">
                          {score}
                        </span>
                        <span className="text-[13px] text-muted">/ 100</span>
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

                    <div className="pt-3 border-t border-[#f0f0f8] flex items-center justify-between">
                      <span className="text-[11px] text-muted">
                        {session.simulations?.length || 1} titik kandidat
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenSimulationOnMap(firstSim)}
                        className="inline-flex items-center gap-1 text-[12px] font-bold text-primary hover:underline cursor-pointer"
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

      {/* TAB 2: USER BUSINESSES CRUD */}
      {activeTab === "businesses" && (
        <div className="clay rounded-[20px] p-6">
          <div className="flex items-center justify-between border-b border-[#ececf6] pb-4">
            <div>
              <h2 className="font-display text-[20px] font-medium text-ink">
                Daftar Usaha Terdaftar Anda
              </h2>
              <p className="text-[12.5px] text-muted">
                Usaha milik Anda yang ditampilkan pada lapisan data internal LOCIVA di peta.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-deep transition-all shadow-xs cursor-pointer"
            >
              <Plus size={13} />
              <span>+ Daftarkan Usaha</span>
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center space-y-2">
              <RefreshCw className="size-6 text-primary animate-spin mx-auto" />
              <p className="text-xs text-muted">Memuat data usaha dari database...</p>
            </div>
          ) : businesses.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Store size={36} className="mx-auto text-slate-300" />
              <h3 className="font-bold text-ink text-sm">Belum Ada Usaha Terdaftar</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Daftarkan usaha Anda agar dapat dievaluasi dan terlihat pada peta internal LOCIVA.
              </p>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary-deep"
              >
                <Plus size={14} />
                <span>Tambah Usaha Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {businesses.map((biz) => (
                <div
                  key={biz.id}
                  className="clay-soft clay-lift flex flex-col justify-between rounded-[16px] p-5 space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-[6px] bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">
                        {biz.business_type?.name || "Usaha Terdaftar"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(biz)}
                          className="p-1 text-slate-400 hover:text-primary rounded transition-colors"
                          title="Edit usaha"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBusiness(biz.id, biz.name)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="Hapus usaha"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <h3 className="mt-2 text-[15px] font-bold text-ink">{biz.name}</h3>

                    {biz.address && (
                      <p className="mt-1 flex items-start gap-1 text-[11.5px] text-muted">
                        <MapPin size={11} className="text-primary mt-0.5 shrink-0" />
                        <span>{biz.address}</span>
                      </p>
                    )}

                    {biz.description && (
                      <p className="mt-2 text-[11.5px] leading-5 text-slate-600 line-clamp-3">
                        {biz.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#f0f0f8] flex items-center justify-between text-[11px] text-muted">
                    <span>
                      {biz.latitude.toFixed(4)}, {biz.longitude.toFixed(4)}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/view-maps?lat=${biz.latitude}&lng=${biz.longitude}`)}
                      className="font-bold text-primary hover:underline cursor-pointer"
                    >
                      Lihat di Peta &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT BUSINESS MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="clay bg-surface w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-ink">
                {editingBusiness ? "Edit Data Usaha" : "Daftarkan Usaha Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-muted hover:text-ink rounded-lg bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitBusiness} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-ink mb-1">Nama Usaha *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Kedai Kopi Sudirman"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Jenis Usaha / Katalog *</label>
                <select
                  required
                  value={formData.business_type_id}
                  onChange={(e) => setFormData({ ...formData, business_type_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  {businessTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-ink mb-1">Latitude *</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-ink mb-1">Longitude *</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Alamat Lengkap</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Jl. Jenderal Sudirman No. 45, Jakarta"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi keunggulan atau jam operasional..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-muted font-bold hover:text-ink cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-deep shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  {submitting && <RefreshCw size={12} className="animate-spin" />}
                  <span>{editingBusiness ? "Simpan Perubahan" : "Daftarkan Usaha"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
