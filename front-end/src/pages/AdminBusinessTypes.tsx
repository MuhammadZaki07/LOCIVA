import { useState, useEffect, useCallback } from "react";
import {
  Store,
  Search,
  Plus,
  Pencil,
  Trash2,
  Sliders,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Layers,
  Info,
  RefreshCw,
} from "lucide-react";
import {
  getBusinessTypes,
  createBusinessType,
  updateBusinessType,
  deleteBusinessType,
  syncBusinessTypeWeights,
  type BusinessTypeItem,
} from "@/context/businessTypeService";
import { useToast } from "@/components/ui/Toast";
import { ClayButton } from "@/components/ui/ClayButton";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";

const AVAILABLE_FACTORS = [
  { key: "campus", label: "Kampus / Universitas", desc: "Mahasiswa & civitas akademika" },
  { key: "school", label: "Sekolah (SD/SMP/SMA)", desc: "Pelajar & pengantar/penjemput" },
  { key: "office", label: "Perkantoran / Bisnis", desc: "Karyawan & pekerja formal" },
  { key: "transit", label: "Stasiun / Terminal / Halte", desc: "Komuter & pengguna transportasi" },
  { key: "market", label: "Pasar Tradisional / Modern", desc: "Ibu rumah tangga & pedagang" },
  { key: "retail", label: "Pusat Belanja / Minimarket", desc: "Pengunjung ritel harian" },
  { key: "food", label: "Sentra Kuliner / Kafe", desc: "Pecinta makanan & kuliner" },
  { key: "service", label: "Penyedia Jasa", desc: "Kebutuhan jasa lokal" },
];

export default function AdminBusinessTypes() {
  const { toast } = useToast();

  const [businessTypes, setBusinessTypes] = useState<BusinessTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [scaleFilter, setScaleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const perPage = 10;

  const debouncedSearch = useDebounce(search, 300);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [weightsModalOpen, setWeightsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Selected item state
  const [selectedItem, setSelectedItem] = useState<BusinessTypeItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    category: "Kuliner",
    scale: "gerobak",
    icon: "store",
    description: "",
    default_radius_m: 500,
    min_radius_m: 100,
    max_radius_m: 1500,
    is_active: true,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Weights Form state
  const [weightRows, setWeightRows] = useState<Array<{ factor: string; weight: number }>>([]);
  const [weightsSubmitting, setWeightsSubmitting] = useState(false);

  // Deleting state
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        search: debouncedSearch.trim() || undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        scale: scaleFilter !== "all" ? scaleFilter : undefined,
        page: currentPage,
        per_page: perPage,
      };

      if (statusFilter === "active") params.is_active = true;
      if (statusFilter === "inactive") params.is_active = false;

      const res = await getBusinessTypes(params);
      setBusinessTypes(res.data);
      setTotalItems(res.meta.total);
      setLastPage(res.meta.last_page);
    } catch (err: any) {
      console.error("Gagal mengambil tipe usaha:", err);
      setError("Gagal memuat katalog tipe usaha dari server.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryFilter, scaleFilter, statusFilter, currentPage]);

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  // Open Create
  const handleOpenCreate = () => {
    setFormData({
      name: "",
      slug: "",
      category: "Kuliner",
      scale: "gerobak",
      icon: "store",
      description: "",
      default_radius_m: 500,
      min_radius_m: 100,
      max_radius_m: 1500,
      is_active: true,
    });
    setFormError(null);
    setCreateModalOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Nama jenis usaha wajib diisi.");
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);
      await createBusinessType(formData);
      toast({
        title: "Berhasil Ditambahkan",
        description: `Jenis usaha "${formData.name}" berhasil dibuat.`,
        variant: "success",
      });
      setCreateModalOpen(false);
      void fetchCatalog();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Gagal membuat jenis usaha.";
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Edit
  const handleOpenEdit = (item: BusinessTypeItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      slug: item.slug,
      category: item.category || "Kuliner",
      scale: item.scale || "gerobak",
      icon: item.icon || "store",
      description: item.description || "",
      default_radius_m: item.default_radius_m || 500,
      min_radius_m: item.min_radius_m || 100,
      max_radius_m: item.max_radius_m || 1500,
      is_active: item.is_active,
    });
    setFormError(null);
    setEditModalOpen(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!formData.name.trim()) {
      setFormError("Nama jenis usaha wajib diisi.");
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);
      await updateBusinessType(selectedItem.id, formData);
      toast({
        title: "Perubahan Disimpan",
        description: `Katalog "${formData.name}" berhasil diperbarui.`,
        variant: "success",
      });
      setEditModalOpen(false);
      void fetchCatalog();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Gagal memperbarui jenis usaha.";
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Weights
  const handleOpenWeights = (item: BusinessTypeItem) => {
    setSelectedItem(item);
    const existing = item.weights || [];

    // Pre-populate with existing or standard factors
    const rows = AVAILABLE_FACTORS.map((f) => {
      const match = existing.find((w) => w.factor.toLowerCase() === f.key.toLowerCase());
      return {
        factor: f.key,
        weight: match ? Number(match.weight) : 0,
      };
    });

    setWeightRows(rows);
    setWeightsModalOpen(true);
  };

  // Update Weight Row
  const handleWeightChange = (factor: string, value: number) => {
    setWeightRows((prev) =>
      prev.map((row) => (row.factor === factor ? { ...row, weight: Math.max(0, Math.min(100, value)) } : row))
    );
  };

  // Submit Weights Sync
  const handleSaveWeights = async () => {
    if (!selectedItem) return;

    try {
      setWeightsSubmitting(true);
      const activeRows = weightRows.filter((r) => r.weight > 0);
      await syncBusinessTypeWeights(selectedItem.id, activeRows);
      toast({
        title: "Bobot Berhasil Disimpan",
        description: `Bobot penilaian untuk ${selectedItem.name} telah disinkronkan ke engine analisis GIS.`,
        variant: "success",
      });
      setWeightsModalOpen(false);
      void fetchCatalog();
    } catch (err: any) {
      toast({
        title: "Gagal Menyimpan Bobot",
        description: err.response?.data?.message || "Terjadi kesalahan server.",
        variant: "error",
      });
    } finally {
      setWeightsSubmitting(false);
    }
  };

  // Open Delete
  const handleOpenDelete = (item: BusinessTypeItem) => {
    setSelectedItem(item);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!selectedItem) return;

    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteBusinessType(selectedItem.id);
      toast({
        title: "Dihapus",
        description: `Jenis usaha ${selectedItem.name} berhasil dihapus.`,
        variant: "success",
      });
      setDeleteModalOpen(false);
      void fetchCatalog();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || "Gagal menghapus jenis usaha ini.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Detail
  const handleOpenDetail = (item: BusinessTypeItem) => {
    setSelectedItem(item);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Katalog & Bobot Usaha
          </h1>
          <p className="mt-1 text-sm text-muted">
            Kelola tipe UMKM, parameter radius jangkauan, dan bobot demografi untuk kalkulasi potensi lokasi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ClayButton
            variant="secondary"
            onClick={() => void fetchCatalog()}
            disabled={loading}
            className="flex items-center gap-2 text-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </ClayButton>

          <ClayButton
            variant="primary"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 text-xs shadow-md"
          >
            <Plus size={16} />
            <span>Tambah Jenis Usaha</span>
          </ClayButton>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="clay flex items-center gap-3.5 rounded-2xl p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Store size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Total Tipe Usaha</p>
            <p className="font-display text-xl font-bold text-ink">{totalItems}</p>
          </div>
        </div>

        <div className="clay flex items-center gap-3.5 rounded-2xl p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Status Aktif</p>
            <p className="font-display text-xl font-bold text-ink">
              {businessTypes.filter((b) => b.is_active).length}
            </p>
          </div>
        </div>

        <div className="clay flex items-center gap-3.5 rounded-2xl p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Sliders size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Terkonfigurasi Bobot</p>
            <p className="font-display text-xl font-bold text-ink">
              {businessTypes.filter((b) => b.weights && b.weights.length > 0).length}
            </p>
          </div>
        </div>

        <div className="clay flex items-center gap-3.5 rounded-2xl p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Layers size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Skala Dominan</p>
            <p className="font-display text-base font-bold text-ink">Gerobak & Warung</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="clay flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama atau deskripsi..."
            className="w-full rounded-xl border border-[#e2e2ec] bg-white/70 py-2.5 pl-10 pr-4 text-xs font-medium text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-[#e2e2ec] bg-white/70 px-3 py-2 text-xs font-medium text-ink focus:border-primary focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>

          {/* Scale Filter */}
          <select
            value={scaleFilter}
            onChange={(e) => {
              setScaleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-[#e2e2ec] bg-white/70 px-3 py-2 text-xs font-medium text-ink focus:border-primary focus:outline-none"
          >
            <option value="all">Semua Skala</option>
            <option value="gerobak">Gerobak Keliling</option>
            <option value="warung">Warung Tenda</option>
            <option value="kios">Kios / Lapak</option>
            <option value="toko">Toko Mandiri</option>
            <option value="ruko">Ruko Komersil</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-[#e2e2ec] bg-white/70 px-3 py-2 text-xs font-medium text-ink focus:border-primary focus:outline-none"
          >
            <option value="all">Semua Kategori</option>
            <option value="Kuliner">Kuliner (Makanan & Minuman)</option>
            <option value="Jasa">Jasa</option>
            <option value="Ritel">Ritel / Kelontong</option>
            <option value="Fashion">Fashion / Pakaian</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="clay overflow-hidden rounded-2xl border border-[#ececf6]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-muted">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="mt-3 text-xs font-medium">Memuat data tipe usaha...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <AlertCircle size={32} className="text-warning" />
            <p className="mt-3 text-sm font-medium text-ink">{error}</p>
            <ClayButton variant="secondary" onClick={() => void fetchCatalog()} className="mt-4 text-xs">
              Coba Lagi
            </ClayButton>
          </div>
        ) : businessTypes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <Store size={40} className="text-muted/60" />
            <p className="mt-3 text-sm font-medium text-ink">Tidak ada tipe usaha ditemukan</p>
            <p className="mt-1 text-xs text-muted">
              Coba sesuaikan kata kunci pencarian atau filter yang Anda gunakan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#ececf6] bg-canvas/60 uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Jenis Usaha</th>
                  <th className="px-5 py-3.5 font-semibold">Kategori</th>
                  <th className="px-5 py-3.5 font-semibold">Skala Usaha</th>
                  <th className="px-5 py-3.5 font-semibold">Radius Default</th>
                  <th className="px-5 py-3.5 font-semibold">Faktor Bobot</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f8]">
                {businessTypes.map((item) => {
                  const weightCount = item.weights?.length || 0;
                  return (
                    <tr key={item.id} className="transition-colors hover:bg-white/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary font-bold">
                            {item.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-ink">{item.name}</p>
                            <p className="text-[11px] text-muted">{item.slug}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-medium text-ink">
                        <span className="rounded-lg bg-canvas px-2.5 py-1 text-[11px] font-medium text-muted">
                          {item.category || "-"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center rounded-lg bg-primary-soft/60 px-2.5 py-0.5 text-[11px] font-semibold text-primary capitalize">
                          {item.scale || "standar"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-ink font-medium">
                        {item.default_radius_m} m
                        <span className="ml-1 text-[10px] text-muted">
                          ({item.min_radius_m || 50}m - {item.max_radius_m || 2000}m)
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleOpenWeights(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e2ec] bg-white px-2.5 py-1 text-[11px] font-semibold text-ink shadow-2xs hover:border-primary hover:text-primary"
                        >
                          <Sliders size={12} className="text-primary" />
                          <span>{weightCount > 0 ? `${weightCount} Bobot Aktif` : "Atur Bobot"}</span>
                        </button>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-medium ${
                            item.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.is_active ? "bg-emerald-500" : "bg-gray-400"
                            }`}
                          />
                          {item.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item)}
                            title="Detail"
                            className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-ink"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit"
                            className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-primary"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(item)}
                            title="Hapus"
                            className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-rose-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {lastPage > 1 && (
          <div className="flex items-center justify-between border-t border-[#ececf6] px-5 py-3.5 text-xs text-muted">
            <p>
              Menampilkan halaman <span className="font-semibold text-ink">{currentPage}</span> dari{" "}
              <span className="font-semibold text-ink">{lastPage}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-[#e2e2ec] px-3 py-1 font-medium text-ink disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={currentPage >= lastPage}
                onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                className="rounded-lg border border-[#e2e2ec] px-3 py-1 font-medium text-ink disabled:opacity-40"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Tambah Jenis Usaha */}
      <Modal open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <ModalContent size="lg">
          <ModalHeader>
            <ModalTitle>Tambah Jenis Usaha Baru</ModalTitle>
            <ModalDescription>
              Tambahkan tipe UMKM baru ke dalam katalog LOCIVA untuk mendukung pemetaan dan analisis lokasi.
            </ModalDescription>
          </ModalHeader>

          <form onSubmit={handleCreateSubmit}>
            <ModalBody className="space-y-4">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-ink">Nama Tipe Usaha *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Warmindo, Kedai Kopi"
                    className="mt-1.5 w-full rounded-xl border border-[#e2e2ec] bg-white px-3.5 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink">Slug / ID Ringkas (Opsional)</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="otomatis dari nama jika kosong"
                    className="mt-1.5 w-full rounded-xl border border-[#e2e2ec] bg-white px-3.5 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-ink">Kategori *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#e2e2ec] bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                  >
                    <option value="Kuliner">Kuliner</option>
                    <option value="Jasa">Jasa</option>
                    <option value="Ritel">Ritel</option>
                    <option value="Fashion">Fashion</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink">Skala Operasional</label>
                  <select
                    value={formData.scale}
                    onChange={(e) => setFormData({ ...formData, scale: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#e2e2ec] bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                  >
                    <option value="gerobak">Gerobak Keliling</option>
                    <option value="warung">Warung Tenda</option>
                    <option value="kios">Kios / Lapak</option>
                    <option value="toko">Toko</option>
                    <option value="ruko">Ruko</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink">Radius Analisis Standar (m)</label>
                  <input
                    type="number"
                    min={50}
                    max={5000}
                    value={formData.default_radius_m}
                    onChange={(e) =>
                      setFormData({ ...formData, default_radius_m: parseInt(e.target.value) || 500 })
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#e2e2ec] bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink">Deskripsi Karakteristik Usaha</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Keterangan target pelanggan, kebutuhan daya listrik, jam sibuk..."
                  className="mt-1.5 w-full rounded-xl border border-[#e2e2ec] bg-white px-3.5 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="create_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded text-primary focus:ring-primary"
                />
                <label htmlFor="create_is_active" className="text-xs font-medium text-ink cursor-pointer">
                  Aktifkan di publik dan engine rekomendasi
                </label>
              </div>
            </ModalBody>

            <ModalFooter>
              <ClayButton
                type="button"
                variant="secondary"
                onClick={() => setCreateModalOpen(false)}
                disabled={formSubmitting}
                className="text-xs"
              >
                Batal
              </ClayButton>
              <ClayButton type="submit" variant="primary" disabled={formSubmitting} className="text-xs">
                {formSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Tipe Usaha"
                )}
              </ClayButton>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* MODAL: Edit Jenis Usaha */}
      <Modal open={editModalOpen} onOpenChange={setEditModalOpen}>
        <ModalContent size="lg">
          <ModalHeader>
            <ModalTitle>Edit Jenis Usaha: {selectedItem?.name}</ModalTitle>
            <ModalDescription>Perbarui parameter skala atau radius jangkauan.</ModalDescription>
          </ModalHeader>

          <form onSubmit={handleEditSubmit}>
            <ModalBody className="space-y-4">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-ink">Nama Tipe Usaha *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#e2e2ec] bg-white px-3.5 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink">Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#e2e2ec] bg-white px-3.5 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-ink">Kategori *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#e2e2ec] bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                  >
                    <option value="Kuliner">Kuliner</option>
                    <option value="Jasa">Jasa</option>
                    <option value="Ritel">Ritel</option>
                    <option value="Fashion">Fashion</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink">Skala Usaha</label>
                  <select
                    value={formData.scale}
                    onChange={(e) => setFormData({ ...formData, scale: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[#e2e2ec] bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                  >
                    <option value="gerobak">Gerobak Keliling</option>
                    <option value="warung">Warung Tenda</option>
                    <option value="kios">Kios / Lapak</option>
                    <option value="toko">Toko</option>
                    <option value="ruko">Ruko</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink">Radius Standar (m)</label>
                  <input
                    type="number"
                    min={50}
                    max={5000}
                    value={formData.default_radius_m}
                    onChange={(e) =>
                      setFormData({ ...formData, default_radius_m: parseInt(e.target.value) || 500 })
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#e2e2ec] bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink">Deskripsi</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-[#e2e2ec] bg-white px-3.5 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded text-primary focus:ring-primary"
                />
                <label htmlFor="edit_is_active" className="text-xs font-medium text-ink cursor-pointer">
                  Aktifkan di katalog publik
                </label>
              </div>
            </ModalBody>

            <ModalFooter>
              <ClayButton
                type="button"
                variant="secondary"
                onClick={() => setEditModalOpen(false)}
                disabled={formSubmitting}
                className="text-xs"
              >
                Batal
              </ClayButton>
              <ClayButton type="submit" variant="primary" disabled={formSubmitting} className="text-xs">
                {formSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </ClayButton>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* MODAL: Konfigurasi Bobot Faktor GIS */}
      <Modal open={weightsModalOpen} onOpenChange={setWeightsModalOpen}>
        <ModalContent size="lg">
          <ModalHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Sliders size={18} />
              </div>
              <div>
                <ModalTitle>Konfigurasi Bobot Faktor Analisis</ModalTitle>
                <ModalDescription>
                  Pengaturan prioritas POI & demografi untuk <strong>{selectedItem?.name}</strong>.
                </ModalDescription>
              </div>
            </div>
          </ModalHeader>

          <ModalBody className="space-y-4">
            <div className="rounded-xl bg-canvas p-3 text-xs text-muted">
              <div className="flex items-center gap-1.5 font-semibold text-ink">
                <Info size={14} className="text-primary" />
                <span>Prinsip Penilaian GIS LOCIVA</span>
              </div>
              <p className="mt-1">
                Semakin tinggi bobot suatu faktor (0 - 100), semakin besar kontribusi poin yang diperoleh
                lokasi jika faktor tersebut berada dalam radius sasaran usaha.
              </p>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {AVAILABLE_FACTORS.map((f) => {
                const currentVal = weightRows.find((r) => r.factor === f.key)?.weight || 0;
                return (
                  <div
                    key={f.key}
                    className="flex flex-col gap-2 rounded-xl border border-[#ececf6] bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink text-xs">{f.label}</p>
                      <p className="text-[11px] text-muted">{f.desc}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={30}
                        step={1}
                        value={currentVal}
                        onChange={(e) => handleWeightChange(f.key, Number(e.target.value))}
                        className="w-28 accent-primary cursor-pointer"
                      />
                      <div className="w-12 text-right">
                        <span className="font-display font-bold text-primary text-sm">
                          +{currentVal}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ModalBody>

          <ModalFooter>
            <ClayButton
              type="button"
              variant="secondary"
              onClick={() => setWeightsModalOpen(false)}
              disabled={weightsSubmitting}
              className="text-xs"
            >
              Batal
            </ClayButton>
            <ClayButton
              type="button"
              variant="primary"
              onClick={handleSaveWeights}
              disabled={weightsSubmitting}
              className="text-xs"
            >
              {weightsSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1" />
                  Menyinkronkan...
                </>
              ) : (
                "Simpan & Sinkronkan Bobot"
              )}
            </ClayButton>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* MODAL: Konfirmasi Hapus */}
      <Modal open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <ModalContent size="md">
          <ModalHeader>
            <ModalTitle>Konfirmasi Hapus Jenis Usaha</ModalTitle>
            <ModalDescription>
              Apakah Anda yakin ingin menghapus <strong>{selectedItem?.name}</strong>? Tindakan ini tidak dapat
              dibatalkan jika data sudah dihapus permanen.
            </ModalDescription>
          </ModalHeader>

          <ModalBody>
            {deleteError && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle size={16} className="shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}
            <p className="text-xs text-muted">
              Sistem akan secara otomatis memeriksa apakah tipe usaha ini masih terkait dengan bisnis UMKM yang
              terdaftar di peta LOCIVA untuk menjaga integritas relasi database.
            </p>
          </ModalBody>

          <ModalFooter>
            <ClayButton
              type="button"
              variant="secondary"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
              className="text-xs"
            >
              Batal
            </ClayButton>
            <ClayButton
              type="button"
              variant="secondary"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="text-xs text-rose-600 font-bold hover:bg-rose-50"
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus"}
            </ClayButton>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* MODAL: Detail Tipe Usaha */}
      <Modal open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <ModalContent size="md">
          <ModalHeader>
            <ModalTitle>Detail Katalog: {selectedItem?.name}</ModalTitle>
            <ModalDescription>Spesifikasi teknis dan parameter rekomendasi lokasi.</ModalDescription>
          </ModalHeader>

          <ModalBody className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-canvas p-3">
              <div>
                <span className="text-muted">Slug:</span>
                <p className="font-semibold text-ink">{selectedItem?.slug}</p>
              </div>
              <div>
                <span className="text-muted">Kategori:</span>
                <p className="font-semibold text-ink">{selectedItem?.category}</p>
              </div>
              <div>
                <span className="text-muted">Skala:</span>
                <p className="font-semibold text-ink capitalize">{selectedItem?.scale || "standar"}</p>
              </div>
              <div>
                <span className="text-muted">Radius Default:</span>
                <p className="font-semibold text-ink">{selectedItem?.default_radius_m} meter</p>
              </div>
            </div>

            <div>
              <span className="text-muted font-medium">Deskripsi:</span>
              <p className="mt-1 rounded-xl border border-[#ececf6] p-3 text-ink leading-relaxed">
                {selectedItem?.description || "Belum ada deskripsi untuk tipe usaha ini."}
              </p>
            </div>

            <div>
              <span className="text-muted font-medium">Faktor Bobot Tersimpan:</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {selectedItem?.weights && selectedItem.weights.length > 0 ? (
                  selectedItem.weights.map((w, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary"
                    >
                      {w.factor}: +{w.weight}
                    </span>
                  ))
                ) : (
                  <span className="text-muted italic">Belum dikonfigurasi secara spesifik.</span>
                )}
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <ClayButton
              type="button"
              variant="secondary"
              onClick={() => setDetailModalOpen(false)}
              className="text-xs"
            >
              Tutup
            </ClayButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
