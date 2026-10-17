import { useState, useEffect, useCallback } from "react";
import {
  Store,
  Search,
  Plus,
  Pencil,
  Trash2,
  Sliders,
  Eye,
  AlertCircle,
  ArrowLeft,
  RotateCcw,
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
import Spinner from "@/components/ui/Spinner";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/Modal";

const AVAILABLE_FACTORS = [
  { key: "campus", label: "kampus / universitas", desc: "mahasiswa & civitas akademika" },
  { key: "school", label: "sekolah (SD/SMP/SMA)", desc: "pelajar & pengantar/penjemput" },
  { key: "office", label: "perkantoran / bisnis", desc: "karyawan & pekerja formal" },
  { key: "transit", label: "stasiun / terminal / halte", desc: "komuter & pengguna transportasi publik" },
  { key: "market", label: "pasar tradisional / modern", desc: "ibu rumah tangga & pedagang pasar" },
  { key: "retail", label: "pusat belanja / minimarket", desc: "pengunjung ritel harian" },
  { key: "food", label: "sentra kuliner / kafe", desc: "pecinta makanan & kuliner" },
  { key: "service", label: "penyedia jasa komersial", desc: "kebutuhan jasa harian lokal" },
];

type PageMode = "list" | "create" | "edit" | "weights" | "detail";

export default function AdminBusinessTypes() {
  const { toast } = useToast();

  const [mode, setMode] = useState<PageMode>("list");
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [scaleFilter, setScaleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const perPage = 10;

  const debouncedSearch = useDebounce(search, 300);

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

  // Deleting modal state
  const [deletingItem, setDeletingItem] = useState<BusinessTypeItem | null>(null);
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

      const res = await getBusinessTypes(params);
      setBusinessTypes(res.data);
      setTotalItems(res.meta.total);
      setLastPage(res.meta.last_page);
    } catch (err: any) {
      console.warn("Gagal memuat katalog usaha:", err);
      setError("Gagal memuat katalog jenis usaha dari server.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryFilter, scaleFilter, currentPage]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

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
    setMode("create");
  };

  const handleOpenEdit = (item: BusinessTypeItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      slug: item.slug,
      category: item.category,
      scale: item.scale || "gerobak",
      icon: item.icon || "store",
      description: item.description || "",
      default_radius_m: item.default_radius_m,
      min_radius_m: item.min_radius_m || 100,
      max_radius_m: item.max_radius_m || 1500,
      is_active: item.is_active,
    });
    setFormError(null);
    setMode("edit");
  };

  const handleOpenWeights = (item: BusinessTypeItem) => {
    setSelectedItem(item);
    const existing = item.weights || [];
    const mapped = AVAILABLE_FACTORS.map((f) => {
      const found = existing.find((w) => w.factor === f.key);
      return { factor: f.key, weight: found ? found.weight : 50 };
    });
    setWeightRows(mapped);
    setMode("weights");
  };

  const handleOpenDetail = (item: BusinessTypeItem) => {
    setSelectedItem(item);
    setMode("detail");
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError("Nama jenis usaha wajib diisi.");
      return;
    }

    setFormSubmitting(true);
    try {
      if (mode === "create") {
        await createBusinessType({
          ...formData,
          name: formData.name.trim(),
          slug: formData.slug.trim() || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        });
        toast({
          title: "Jenis usaha ditambahkan",
          description: `Katalog ${formData.name} berhasil dibuat.`,
          variant: "success",
        });
      } else if (mode === "edit" && selectedItem) {
        await updateBusinessType(selectedItem.id, {
          ...formData,
          name: formData.name.trim(),
        });
        toast({
          title: "Jenis usaha diperbarui",
          description: `Perubahan pada ${formData.name} berhasil disimpan.`,
          variant: "success",
        });
      }

      await fetchCatalog();
      setMode("list");
    } catch (err: any) {
      setFormError(
        err.response?.data?.message || "Gagal menyimpan data jenis usaha."
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setWeightsSubmitting(true);
    try {
      await syncBusinessTypeWeights(selectedItem.id, weightRows);
      toast({
        title: "Bobot spasial disimpan",
        description: `Konfigurasi faktor pembobotan untuk ${selectedItem.name} berhasil diperbarui.`,
        variant: "success",
      });
      await fetchCatalog();
      setMode("detail");
    } catch (err: any) {
      toast({
        title: "Gagal menyimpan bobot",
        description: err.response?.data?.message || "Terjadi kesalahan pada server.",
        variant: "error",
      });
    } finally {
      setWeightsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteBusinessType(deletingItem.id);
      toast({
        title: "Jenis usaha dihapus",
        description: `Data ${deletingItem.name} berhasil dihapus dari katalog.`,
        variant: "success",
      });
      setDeletingItem(null);
      if (mode !== "list") setMode("list");
      await fetchCatalog();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || "Gagal menghapus jenis usaha.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render Weights Form View ────────────────────────────────────────────────
  if (mode === "weights" && selectedItem) {
    return (
      <div className="space-y-6 text-left max-w-4xl mx-auto">
        <div className="flex items-center justify-between border-b border-[#f0f0f8] pb-4">
          <button
            type="button"
            onClick={() => setMode("list")}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted hover:text-ink cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>kembali ke katalog usaha</span>
          </button>

          <div>
            <h2 className="font-display text-[16px] font-medium text-ink">
              konfigurasi bobot faktor spasial: {selectedItem.name}
            </h2>
            <p className="text-[12px] text-muted">
              tentukan seberapa sensitif jenis usaha ini terhadap keberadaan titik generator sekitar (skala 0 - 100).
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveWeights} className="clay rounded-[20px] p-6 bg-white space-y-6">
          <div className="space-y-4">
            {AVAILABLE_FACTORS.map((f) => {
              const currentWeight =
                weightRows.find((w) => w.factor === f.key)?.weight ?? 50;

              return (
                <div
                  key={f.key}
                  className="rounded-[12px] bg-slate-50/70 p-4 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[13.5px] font-medium text-ink capitalize">
                      {f.label}
                    </p>
                    <p className="text-[11.5px] text-muted mt-0.5">{f.desc}</p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 sm:w-72">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={currentWeight}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setWeightRows((prev) =>
                          prev.map((w) => (w.factor === f.key ? { ...w, weight: val } : w))
                        );
                      }}
                      className="w-full accent-primary cursor-pointer"
                    />

                    <div className="flex items-center gap-1 shrink-0 w-16">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={currentWeight}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                          setWeightRows((prev) =>
                            prev.map((w) => (w.factor === f.key ? { ...w, weight: val } : w))
                          );
                        }}
                        className="w-12 rounded-[6px] border border-slate-200 bg-white px-1.5 py-1 text-center text-[12.5px] font-semibold text-ink"
                      />
                      <span className="text-[11px] text-muted">%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-[#f0f0f8] pt-4">
            <button
              type="button"
              onClick={() => {
                setWeightRows(AVAILABLE_FACTORS.map((f) => ({ factor: f.key, weight: 50 })));
              }}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted hover:text-ink cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>reset ke seimbang (50%)</span>
            </button>

            <div className="flex items-center gap-2">
              <ClayButton
                variant="secondary"
                type="button"
                disabled={weightsSubmitting}
                onClick={() => setMode("list")}
              >
                batal
              </ClayButton>

              <button
                type="submit"
                disabled={weightsSubmitting}
                className="clay-primary inline-flex items-center gap-1.5 rounded-[10px] px-5 py-2 text-[12.5px] font-medium text-white cursor-pointer disabled:opacity-50"
              >
                {weightsSubmitting && <Spinner size="sm" />}
                <span>{weightsSubmitting ? "menyimpan..." : "simpan pembobotan"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ── Render Detail View ──────────────────────────────────────────────────────
  if (mode === "detail" && selectedItem) {
    return (
      <div className="space-y-6 text-left max-w-4xl mx-auto">
        <div className="flex items-center justify-between border-b border-[#f0f0f8] pb-4">
          <button
            type="button"
            onClick={() => setMode("list")}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted hover:text-ink cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>kembali ke katalog usaha</span>
          </button>

          <div className="flex items-center gap-2">
            <ClayButton
              variant="secondary"
              onClick={() => handleOpenWeights(selectedItem)}
            >
              <Sliders size={14} />
              <span>atur bobot spasial</span>
            </ClayButton>

            <ClayButton
              variant="secondary"
              onClick={() => handleOpenEdit(selectedItem)}
            >
              <Pencil size={14} />
              <span>edit parameter</span>
            </ClayButton>
          </div>
        </div>

        <div className="clay rounded-[20px] p-6 bg-white space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-[20px] font-medium text-ink">
                  {selectedItem.name}
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium border ${
                    selectedItem.is_active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {selectedItem.is_active ? "aktif" : "non-aktif"}
                </span>
              </div>
              <p className="text-[13px] text-muted mt-1">{selectedItem.description || "Belum ada deskripsi."}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-4 border-t border-[#f0f0f8]">
            <div className="rounded-[12px] bg-slate-50 p-3.5 border border-slate-100">
              <span className="text-[11px] text-muted font-medium block">kategori</span>
              <p className="mt-1 font-display text-[14px] font-medium text-ink">{selectedItem.category}</p>
            </div>

            <div className="rounded-[12px] bg-slate-50 p-3.5 border border-slate-100">
              <span className="text-[11px] text-muted font-medium block">skala usaha</span>
              <p className="mt-1 font-display text-[14px] font-medium text-ink capitalize">{selectedItem.scale}</p>
            </div>

            <div className="rounded-[12px] bg-slate-50 p-3.5 border border-slate-100">
              <span className="text-[11px] text-muted font-medium block">default radius</span>
              <p className="mt-1 font-display text-[14px] font-medium text-ink">{selectedItem.default_radius_m} m</p>
            </div>

            <div className="rounded-[12px] bg-slate-50 p-3.5 border border-slate-100">
              <span className="text-[11px] text-muted font-medium block">rentang radius</span>
              <p className="mt-1 font-display text-[14px] font-medium text-ink">
                {selectedItem.min_radius_m} m - {selectedItem.max_radius_m} m
              </p>
            </div>
          </div>

          {/* Weights breakdown */}
          <div className="pt-4 border-t border-[#f0f0f8]">
            <h3 className="font-display text-[14px] font-medium text-ink mb-3">
              faktor pembobotan lokasi saat ini
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {AVAILABLE_FACTORS.map((f) => {
                const found = selectedItem.weights?.find((w) => w.factor === f.key);
                const val = found ? found.weight : 50;

                return (
                  <div
                    key={f.key}
                    className="flex items-center justify-between rounded-[10px] bg-slate-50 p-2.5 border border-slate-100 text-[12px]"
                  >
                    <span className="font-medium text-ink capitalize">{f.label}</span>
                    <span className="font-display font-semibold text-primary">{val}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render Create / Edit Form View ──────────────────────────────────────────
  if (mode === "create" || mode === "edit") {
    return (
      <div className="space-y-6 text-left max-w-3xl mx-auto">
        <div className="flex items-center justify-between border-b border-[#f0f0f8] pb-4">
          <button
            type="button"
            onClick={() => setMode("list")}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted hover:text-ink cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>kembali ke katalog usaha</span>
          </button>

          <h2 className="font-display text-[16px] font-medium text-ink">
            {mode === "create" ? "tambah jenis usaha baru" : "edit jenis usaha"}
          </h2>
        </div>

        {formError && (
          <div className="flex items-center gap-2 rounded-[12px] bg-rose-50 p-3.5 text-[12.5px] text-rose-700 border border-rose-100">
            <AlertCircle size={16} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSaveForm} className="clay rounded-[20px] p-6 bg-white space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[12.5px] font-medium text-ink">
                nama jenis usaha <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Kafe Kopi Susu"
                className="mt-1 w-full rounded-[10px] border border-[#e5e5f0] bg-white px-3.5 py-2 text-[13px] text-ink outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[12.5px] font-medium text-ink">
                kategori bidang usaha
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="mt-1 w-full rounded-[10px] border border-[#e5e5f0] bg-white px-3.5 py-2 text-[13px] text-ink outline-none focus:border-primary cursor-pointer"
              >
                <option value="Kuliner">Kuliner</option>
                <option value="Ritel & Toko">Ritel & Toko</option>
                <option value="Jasa & Servis">Jasa & Servis</option>
                <option value="Fashion & Pakaian">Fashion & Pakaian</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[12.5px] font-medium text-ink">
                skala operasional usaha
              </label>
              <select
                value={formData.scale}
                onChange={(e) => setFormData({ ...formData, scale: e.target.value })}
                className="mt-1 w-full rounded-[10px] border border-[#e5e5f0] bg-white px-3.5 py-2 text-[13px] text-ink outline-none focus:border-primary cursor-pointer"
              >
                <option value="gerobak">Gerobak / Keliling</option>
                <option value="kaki_lima">Kaki Lima / Tenda</option>
                <option value="kios">Kios / Lapak Pasar</option>
                <option value="ruko">Ruko / Kedai Tetap</option>
              </select>
            </div>

            <div>
              <label className="block text-[12.5px] font-medium text-ink">
                default radius jangkauan (meter)
              </label>
              <input
                type="number"
                min={50}
                max={5000}
                value={formData.default_radius_m}
                onChange={(e) =>
                  setFormData({ ...formData, default_radius_m: parseInt(e.target.value, 10) || 500 })
                }
                className="mt-1 w-full rounded-[10px] border border-[#e5e5f0] bg-white px-3.5 py-2 text-[13px] text-ink outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-ink">
              deskripsi profil usaha
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Jelaskan karakteristik konsumen sasaran, kebutuhan akses transportasi, atau preferensi zonasi..."
              className="mt-1 w-full rounded-[10px] border border-[#e5e5f0] bg-white px-3.5 py-2 text-[12.5px] text-ink outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active_check"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="size-4 rounded text-primary cursor-pointer"
            />
            <label htmlFor="is_active_check" className="text-[12.5px] font-medium text-ink cursor-pointer">
              aktif dan tersedia di kalkulator simulasi pengguna
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#f0f0f8]">
            <ClayButton
              variant="secondary"
              type="button"
              disabled={formSubmitting}
              onClick={() => setMode("list")}
            >
              batal
            </ClayButton>

            <button
              type="submit"
              disabled={formSubmitting}
              className="clay-primary inline-flex items-center gap-1.5 rounded-[10px] px-5 py-2 text-[12.5px] font-medium text-white cursor-pointer disabled:opacity-50"
            >
              {formSubmitting && <Spinner size="sm" />}
              <span>{formSubmitting ? "menyimpan..." : "simpan data jenis usaha"}</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Render List View ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f0f8] pb-4">
        <div>
          <h1 className="font-display text-[22px] font-medium tracking-tight text-ink sm:text-[24px]">
            katalog & bobot usaha
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            kelola jenis usaha, parameter radius jangkauan, dan bobot faktor spasial untuk skoring analitik.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="clay-primary inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[12.5px] font-medium text-white cursor-pointer shadow-xs"
        >
          <Plus size={14} />
          <span>tambah jenis usaha</span>
        </button>
      </div>

      {/* Toolbar: Proportional Search & Filters */}
      <div className="clay flex flex-wrap items-center justify-between gap-3 rounded-[16px] p-4 bg-white">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari jenis usaha..."
              className="w-full rounded-[10px] border border-[#e5e5f0] bg-white pl-8 pr-3 py-1.5 text-[12.5px] text-ink outline-none focus:border-primary"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-1.5 text-[12px] font-medium text-ink outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">semua kategori</option>
            <option value="Kuliner">Kuliner</option>
            <option value="Ritel & Toko">Ritel & Toko</option>
            <option value="Jasa & Servis">Jasa & Servis</option>
            <option value="Fashion & Pakaian">Fashion & Pakaian</option>
          </select>

          <select
            value={scaleFilter}
            onChange={(e) => {
              setScaleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-1.5 text-[12px] font-medium text-ink outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">semua skala</option>
            <option value="gerobak">gerobak</option>
            <option value="kaki_lima">kaki lima</option>
            <option value="kios">kios</option>
            <option value="ruko">ruko</option>
          </select>
        </div>

        {(search || categoryFilter !== "all" || scaleFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategoryFilter("all");
              setScaleFilter("all");
              setCurrentPage(1);
            }}
            className="text-[12px] font-medium text-primary hover:underline cursor-pointer"
          >
            reset filter
          </button>
        )}
      </div>

      {/* Catalog Table */}
      <div className="clay overflow-hidden rounded-[16px] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[#ececf6] bg-slate-50/60 text-[11px] font-semibold text-muted">
              <tr>
                <th className="px-5 py-3">jenis usaha</th>
                <th className="px-5 py-3">kategori & skala</th>
                <th className="px-5 py-3">radius standar</th>
                <th className="px-5 py-3">status</th>
                <th className="px-5 py-3 text-right">tindakan</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f0f0f8]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted">
                    <Spinner size="md" className="mx-auto mb-2 text-primary" />
                    <p className="text-[12.5px]">memuat katalog jenis usaha...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-rose-600">
                    <p className="text-[13px]">{error}</p>
                    <button
                      type="button"
                      onClick={() => void fetchCatalog()}
                      className="mt-2 text-[12px] font-medium text-primary underline cursor-pointer"
                    >
                      coba lagi
                    </button>
                  </td>
                </tr>
              ) : businessTypes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted">
                    <p className="text-[13px] font-medium text-ink">tidak ada jenis usaha ditemukan</p>
                    <p className="mt-0.5 text-[11.5px]">coba sesuaikan kata kunci atau filter.</p>
                  </td>
                </tr>
              ) : (
                businessTypes.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-primary-soft text-primary font-bold text-[12px]">
                          <Store size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-display font-medium text-ink truncate">{item.name}</p>
                          <p className="text-[11px] text-muted truncate">{item.slug}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="text-[12px]">
                        <span className="font-medium text-ink">{item.category}</span>
                        <span className="text-muted text-[11px] block capitalize">{item.scale}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-[12px] text-muted">
                      {item.default_radius_m} meter
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium border ${
                          item.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {item.is_active ? "aktif" : "non-aktif"}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenWeights(item)}
                          className="clay-press inline-flex items-center gap-1 rounded-[6px] border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11.5px] font-medium text-primary hover:bg-primary/10 cursor-pointer"
                          title="Atur bobot faktor spasial"
                        >
                          <Sliders size={12} />
                          <span>bobot</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item)}
                          className="clay-press inline-flex items-center gap-1 rounded-[6px] border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-muted hover:text-ink cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>detail</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="clay-press inline-flex items-center gap-1 rounded-[6px] border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-muted hover:text-ink cursor-pointer"
                        >
                          <Pencil size={12} />
                          <span>edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingItem(item)}
                          className="clay-press inline-flex items-center gap-1 rounded-[6px] border border-rose-200 bg-rose-50 px-2 py-1 text-[11.5px] font-medium text-rose-700 hover:bg-rose-100 cursor-pointer"
                          title="Hapus jenis usaha"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Standard Pagination Footer */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[#f0f0f8] px-5 py-3.5 text-[12px] text-muted">
            <div>
              menampilkan halaman <span className="font-semibold text-ink">{currentPage}</span> dari{" "}
              <span className="font-semibold text-ink">{lastPage}</span> (total {totalItems} data)
            </div>

            <div className="flex items-center gap-1.5">
              <ClayButton
                variant="secondary"
                disabled={loading || currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                sebelumnya
              </ClayButton>

              <ClayButton
                variant="secondary"
                disabled={loading || currentPage >= lastPage}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                selanjutnya
              </ClayButton>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (strictly for confirmation) */}
      <Modal
        open={deletingItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingItem(null);
            setDeleteError(null);
          }
        }}
      >
        <ModalContent size="sm" showClose>
          {deletingItem && (
            <>
              <ModalHeader>
                <ModalTitle>Konfirmasi Hapus Jenis Usaha</ModalTitle>
                <ModalDescription>
                  Apakah Anda yakin ingin menghapus <strong>{deletingItem.name}</strong> dari katalog? Tindakan ini akan memengaruhi simulasi yang sedang menggunakan jenis usaha ini.
                </ModalDescription>
              </ModalHeader>

              {deleteError && (
                <div className="p-3 text-[12px] text-rose-700 bg-rose-50 rounded-[10px] border border-rose-200">
                  {deleteError}
                </div>
              )}

              <ModalFooter className="border-t border-[#ececf6] pt-3 flex items-center justify-end gap-2">
                <ClayButton
                  variant="secondary"
                  disabled={isDeleting}
                  onClick={() => setDeletingItem(null)}
                >
                  batal
                </ClayButton>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="clay-press inline-flex items-center gap-1.5 rounded-[10px] bg-rose-600 px-4 py-2 text-[12.5px] font-medium text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting && <Spinner size="sm" />}
                  <span>{isDeleting ? "menghapus..." : "ya, hapus data"}</span>
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
