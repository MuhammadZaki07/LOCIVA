import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Droplets,
  Trash2,
  Lightbulb,
  CheckCircle2,
  Clock,
  Search,
  Camera,
  ShieldCheck,
  History,
  Loader2,
  AlertCircle,
  RefreshCw,
  Upload,
} from "lucide-react";
import {
  getReports,
  getReport,
  updateReportStatus,
  uploadReportMedia,
  type ReportItem,
  type ReportStatus,
  type ReportSeverity,
} from "@/context/reportService";
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

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  reported: {
    label: "Menunggu Verifikasi",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  verification: {
    label: "Sedang Ditinjau",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  confirmed: {
    label: "Terverifikasi Warga/Admin",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    dot: "bg-indigo-500",
  },
  handled: {
    label: "Dalam Penanganan",
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
  resolved: {
    label: "Selesai Ditangani",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Ditolak / Tidak Valid",
    bg: "bg-rose-50",
    text: "text-rose-700",
    dot: "bg-rose-500",
  },
};

const SEVERITY_CONFIG: Record<ReportSeverity, { label: string; badge: string }> = {
  low: { label: "Rendah", badge: "bg-gray-100 text-gray-700" },
  medium: { label: "Sedang", badge: "bg-amber-100 text-amber-800" },
  high: { label: "Tinggi / Darurat", badge: "bg-rose-100 text-rose-800 font-bold" },
};

/**
 * Safely formats a coordinate value (may be string, number, null, or undefined)
 * to a fixed decimal string. Returns fallback if value is not a valid finite number.
 */
function formatCoord(
  value: number | string | null | undefined,
  decimals = 4,
  fallback = "—"
): string {
  if (value === null || value === undefined || value === "") return fallback;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (!isFinite(n)) return fallback;
  return n.toFixed(decimals);
}


export default function AdminReports() {
  const { toast } = useToast();

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const perPage = 10;

  const debouncedSearch = useDebounce(search, 300);

  // Detail & Moderation Modal
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Moderation action form state
  const [modStatus, setModStatus] = useState<ReportStatus>("confirmed");
  const [modNote, setModNote] = useState("");
  const [modSubmitting, setModSubmitting] = useState(false);
  const [modError, setModError] = useState<string | null>(null);

  // Photo upload in moderation
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        search: debouncedSearch.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        severity: severityFilter !== "all" ? severityFilter : undefined,
        page: currentPage,
        per_page: perPage,
      };

      const res = await getReports(params);
      setReports(res.data);
      setTotalItems(res.meta.total);
      setLastPage(res.meta.last_page);
    } catch (err: any) {
      console.error("Gagal mengambil laporan civic:", err);
      setError("Gagal memuat daftar laporan dari server.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, severityFilter, currentPage]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  // Open Detail / Moderate Modal
  const handleOpenDetail = async (item: ReportItem) => {
    setSelectedReport(item);
    setModStatus(item.status);
    setModNote("");
    setModError(null);
    setDetailModalOpen(true);

    try {
      setLoadingDetail(true);
      const full = await getReport(item.id);
      setSelectedReport(full);
      setModStatus(full.status);
    } catch (err) {
      console.warn("Gagal memuat detail lengkap:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Submit Status Change (Moderation Action)
  const handleModerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    try {
      setModSubmitting(true);
      setModError(null);

      const updated = await updateReportStatus(selectedReport.id, modStatus, modNote.trim() || undefined);

      toast({
        title: "Status Berhasil Diperbarui",
        description: `Laporan diubah menjadi "${STATUS_CONFIG[modStatus]?.label || modStatus}".`,
        variant: "success",
      });

      setSelectedReport(updated);
      setModNote("");

      // Update in local list
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      setModError(err.response?.data?.message || "Gagal mengubah status laporan.");
    } finally {
      setModSubmitting(false);
    }
  };

  // Upload Photo for Report
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedReport || !e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    try {
      setUploadingMedia(true);
      const newMedia = await uploadReportMedia(selectedReport.id, files);
      toast({
        title: "Foto Berhasil Diunggah",
        description: `${newMedia.length} foto bukti berhasil ditambahkan.`,
        variant: "success",
      });

      // Refresh full report detail
      const full = await getReport(selectedReport.id);
      setSelectedReport(full);
      setReports((prev) => prev.map((r) => (r.id === full.id ? full : r)));
    } catch (err: any) {
      toast({
        title: "Gagal Mengunggah Foto",
        description: err.response?.data?.message || "Terjadi kesalahan saat upload.",
        variant: "error",
      });
    } finally {
      setUploadingMedia(false);
      e.target.value = "";
    }
  };

  const getCategoryIcon = (slug?: string) => {
    switch (slug) {
      case "flood":
      case "banjir":
        return <Droplets size={14} className="text-blue-500" />;
      case "waste":
      case "sampah":
        return <Trash2 size={14} className="text-amber-500" />;
      case "light":
      case "penerangan":
        return <Lightbulb size={14} className="text-yellow-500" />;
      case "road":
      case "jalan-rusak":
      default:
        return <AlertTriangle size={14} className="text-rose-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Moderasi Civic Reports
          </h1>
          <p className="mt-1 text-sm text-muted">
            Tinjau laporan kondisi jalan, banjir, dan infrastruktur dari warga yang mempengaruhi kelayakan lokasi UMKM.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ClayButton
            variant="secondary"
            onClick={() => void fetchReports()}
            disabled={loading}
            className="flex items-center gap-2 text-xs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Segarkan</span>
          </ClayButton>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        <div className="clay flex flex-col justify-between rounded-2xl p-3.5">
          <span className="text-[11px] font-medium text-muted">Total Laporan</span>
          <p className="font-display text-xl font-bold text-ink mt-1">{totalItems}</p>
        </div>

        <div className="clay flex flex-col justify-between rounded-2xl p-3.5">
          <span className="text-[11px] font-medium text-amber-600">Menunggu Verifikasi</span>
          <p className="font-display text-xl font-bold text-amber-700 mt-1">
            {reports.filter((r) => r.status === "reported").length}
          </p>
        </div>

        <div className="clay flex flex-col justify-between rounded-2xl p-3.5">
          <span className="text-[11px] font-medium text-blue-600">Sedang Ditinjau</span>
          <p className="font-display text-xl font-bold text-blue-700 mt-1">
            {reports.filter((r) => r.status === "verification").length}
          </p>
        </div>

        <div className="clay flex flex-col justify-between rounded-2xl p-3.5">
          <span className="text-[11px] font-medium text-indigo-600">Terverifikasi</span>
          <p className="font-display text-xl font-bold text-indigo-700 mt-1">
            {reports.filter((r) => r.status === "confirmed").length}
          </p>
        </div>

        <div className="clay flex flex-col justify-between rounded-2xl p-3.5">
          <span className="text-[11px] font-medium text-purple-600">Dalam Penanganan</span>
          <p className="font-display text-xl font-bold text-purple-700 mt-1">
            {reports.filter((r) => r.status === "handled").length}
          </p>
        </div>

        <div className="clay flex flex-col justify-between rounded-2xl p-3.5">
          <span className="text-[11px] font-medium text-emerald-600">Selesai</span>
          <p className="font-display text-xl font-bold text-emerald-700 mt-1">
            {reports.filter((r) => r.status === "resolved").length}
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="clay flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul laporan atau deskripsi..."
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
            <option value="reported">Menunggu Verifikasi</option>
            <option value="verification">Sedang Ditinjau</option>
            <option value="confirmed">Terverifikasi</option>
            <option value="handled">Dalam Penanganan</option>
            <option value="resolved">Selesai Ditangani</option>
            <option value="rejected">Ditolak / Invalid</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-[#e2e2ec] bg-white/70 px-3 py-2 text-xs font-medium text-ink focus:border-primary focus:outline-none"
          >
            <option value="all">Semua Urgensi</option>
            <option value="high">Tinggi / Darurat</option>
            <option value="medium">Sedang</option>
            <option value="low">Rendah</option>
          </select>
        </div>
      </div>

      {/* Main Reports Table */}
      <div className="clay overflow-hidden rounded-2xl border border-[#ececf6]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-muted">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="mt-3 text-xs font-medium">Memuat data laporan warga...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <AlertCircle size={32} className="text-warning" />
            <p className="mt-3 text-sm font-medium text-ink">{error}</p>
            <ClayButton variant="secondary" onClick={() => void fetchReports()} className="mt-4 text-xs">
              Coba Lagi
            </ClayButton>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <CheckCircle2 size={40} className="text-muted/60" />
            <p className="mt-3 text-sm font-medium text-ink">Tidak ada laporan sesuai filter</p>
            <p className="mt-1 text-xs text-muted">
              Semua laporan warga telah dimoderasi atau sesuaikan kriteria pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#ececf6] bg-canvas/60 uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Kategori & Judul Laporan</th>
                  <th className="px-5 py-3.5 font-semibold">Tingkat Urgensi</th>
                  <th className="px-5 py-3.5 font-semibold">Status Moderasi</th>
                  <th className="px-5 py-3.5 font-semibold">Pelapor & Waktu</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Bukti Foto</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f8]">
                {reports.map((item) => {
                  const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.reported;
                  const severityConf = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.medium;
                  const mediaCount = item.media?.length || 0;

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-white/50">
                      <td className="px-5 py-3.5 max-w-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-canvas">
                            {getCategoryIcon(item.category?.slug)}
                          </div>
                          <div>
                            <p className="font-semibold text-ink line-clamp-1">{item.title}</p>
                            <p className="text-[11px] text-muted line-clamp-1">
                              {item.area?.name ||
                                (item.latitude != null && item.longitude != null
                                  ? `Titik: ${formatCoord(item.latitude, 3)}, ${formatCoord(item.longitude, 3)}`
                                  : "Koordinat tidak tersedia")}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-lg px-2 py-0.5 text-[10.5px] ${severityConf.badge}`}>
                          {severityConf.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusConf.bg} ${statusConf.text}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConf.dot}`} />
                          {statusConf.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <p className="font-medium text-ink">
                          {item.user?.name || "Warga Anonim"}
                        </p>
                        <p className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                          <Clock size={10} />
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </p>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {mediaCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-canvas px-2 py-1 text-[11px] font-semibold text-ink">
                            <Camera size={12} className="text-primary" />
                            <span>{mediaCount} Foto</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted italic">Tidak ada</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <ClayButton
                          variant="primary"
                          onClick={() => handleOpenDetail(item)}
                          className="text-xs px-3 py-1.5 shadow-2xs"
                        >
                          Tinjau & Moderasi
                        </ClayButton>
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
              Halaman <span className="font-semibold text-ink">{currentPage}</span> dari{" "}
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

      {/* MODAL: Detail Laporan, Foto Bukti, & Riwayat Moderasi */}
      <Modal open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <ModalContent size="xl">
          <ModalHeader>
            <div className="flex items-start justify-between">
              <div>
                <ModalTitle>{selectedReport?.title}</ModalTitle>
                <ModalDescription>
                  Dilaporkan oleh <strong>{selectedReport?.user?.name || "Warga"}</strong> pada{" "}
                  {selectedReport?.created_at
                    ? new Date(selectedReport.created_at).toLocaleString("id-ID")
                    : "-"}
                </ModalDescription>
              </div>
            </div>
          </ModalHeader>

          <ModalBody className="space-y-6">
            {loadingDetail && (
              <div className="flex items-center gap-2 text-xs text-primary font-medium">
                <Loader2 size={14} className="animate-spin" />
                <span>Memperbarui detail riwayat verifikasi...</span>
              </div>
            )}

            {/* Report Metadata Strip */}
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-canvas p-4 text-xs sm:grid-cols-4">
              <div>
                <span className="text-muted">Kategori:</span>
                <p className="font-semibold text-ink mt-0.5">
                  {selectedReport?.category?.name || "Kondisi Wilayah"}
                </p>
              </div>

              <div>
                <span className="text-muted">Tingkat Urgensi:</span>
                <p className="font-semibold text-ink mt-0.5 capitalize">
                  {selectedReport?.severity || "Sedang"}
                </p>
              </div>

              <div>
                <span className="text-muted">Titik Koordinat:</span>
                <p className="font-semibold text-ink mt-0.5">
                  {selectedReport?.latitude != null && selectedReport?.longitude != null
                    ? `${formatCoord(selectedReport.latitude, 6)}, ${formatCoord(selectedReport.longitude, 6)}`
                    : "Koordinat tidak tersedia"}
                </p>
              </div>

              <div>
                <span className="text-muted">Dukungan Konfirmasi:</span>
                <p className="font-semibold text-ink mt-0.5">
                  {selectedReport?.confirmations_count || 0} konfirmasi warga
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <span className="text-xs font-semibold text-ink">Deskripsi Situasi Lapangan:</span>
              <p className="mt-1.5 rounded-xl border border-[#ececf6] bg-white p-3.5 text-xs text-ink leading-relaxed">
                {selectedReport?.description || "Tidak ada deskripsi rinci dari pelapor."}
              </p>
            </div>

            {/* Foto Bukti Media (Task 3) */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Camera size={14} className="text-primary" />
                  <span>Foto Bukti Lapangan ({selectedReport?.media?.length || 0})</span>
                </span>

                <label className="clay-press inline-flex items-center gap-1.5 rounded-lg border border-[#e2e2ec] bg-white px-2.5 py-1 text-[11px] font-semibold text-ink cursor-pointer hover:border-primary hover:text-primary">
                  <Upload size={12} className={uploadingMedia ? "animate-spin" : ""} />
                  <span>{uploadingMedia ? "Mengunggah..." : "Tambah Foto"}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleMediaUpload}
                    disabled={uploadingMedia}
                    className="hidden"
                  />
                </label>
              </div>

              {selectedReport?.media && selectedReport.media.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {selectedReport.media.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedImagePreview(m.url || `/storage/${m.file_path}`)}
                      className="group relative aspect-video overflow-hidden rounded-xl border border-[#ececf6] bg-canvas cursor-pointer"
                    >
                      <img
                        src={m.url || `/storage/${m.file_path}`}
                        alt="Bukti Laporan"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-medium">
                        Klik untuk perbesar
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 rounded-xl border border-dashed border-[#dcdce8] p-4 text-center text-xs text-muted">
                  Belum ada foto bukti diunggah untuk laporan ini. Anda dapat menambahkan foto dokumentasi petugas.
                </div>
              )}
            </div>

            {/* Moderation Action Form (Task 2) */}
            <form onSubmit={handleModerateSubmit} className="rounded-2xl border border-primary/20 bg-primary-soft/30 p-4">
              <div className="flex items-center gap-2 font-semibold text-ink text-xs">
                <ShieldCheck size={16} className="text-primary" />
                <span>Tindakan Moderasi & Perubahan Status</span>
              </div>

              {modError && (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{modError}</span>
                </div>
              )}

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    Ubah Status Menjadi:
                  </label>
                  <select
                    value={modStatus}
                    onChange={(e) => setModStatus(e.target.value as ReportStatus)}
                    className="mt-1 w-full rounded-xl border border-[#e2e2ec] bg-white px-3 py-2 text-xs font-semibold text-ink focus:border-primary focus:outline-none"
                  >
                    <option value="verification">Sedang Ditinjau</option>
                    <option value="confirmed">Terverifikasi (Valid)</option>
                    <option value="handled">Dalam Penanganan Lapangan</option>
                    <option value="resolved">Selesai Ditangani</option>
                    <option value="rejected">Tolak / Laporan Palsu</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    Catatan Moderator / Instruksi Lapangan:
                  </label>
                  <input
                    type="text"
                    value={modNote}
                    onChange={(e) => setModNote(e.target.value)}
                    placeholder="Contoh: Tim Dishub telah meninjau lokasi / penertiban lapak selesai..."
                    className="mt-1 w-full rounded-xl border border-[#e2e2ec] bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <ClayButton
                  type="submit"
                  variant="primary"
                  disabled={modSubmitting}
                  className="text-xs px-4 py-2"
                >
                  {modSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin mr-1" />
                      Memproses...
                    </>
                  ) : (
                    "Simpan Tindakan Moderasi"
                  )}
                </ClayButton>
              </div>
            </form>

            {/* Riwayat Verifikasi (Verification History Timeline - Task 2) */}
            <div>
              <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <History size={14} className="text-primary" />
                <span>Riwayat Audit & Verifikasi ({selectedReport?.verifications?.length || 0})</span>
              </span>

              <div className="mt-2 space-y-2">
                {selectedReport?.verifications && selectedReport.verifications.length > 0 ? (
                  selectedReport.verifications.map((v) => {
                    const conf = STATUS_CONFIG[v.action as ReportStatus] || STATUS_CONFIG.reported;
                    return (
                      <div
                        key={v.id}
                        className="flex flex-col gap-1 rounded-xl border border-[#ececf6] bg-white p-3 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${conf.bg} ${conf.text}`}>
                              {conf.label}
                            </span>
                            <span className="font-medium text-ink">
                              oleh {v.moderator?.name || "Moderator Petugas"}
                            </span>
                          </div>

                          <span className="text-[10.5px] text-muted">
                            {v.created_at ? new Date(v.created_at).toLocaleString("id-ID") : "-"}
                          </span>
                        </div>

                        {v.note && (
                          <p className="mt-1 text-muted text-[11px] italic bg-canvas/60 p-2 rounded-lg">
                            &ldquo;{v.note}&rdquo;
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-xl bg-canvas p-3 text-xs text-muted italic">
                    Belum ada riwayat tindakan moderasi sebelumnya.
                  </p>
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

      {/* Lightbox Preview Modal for Image */}
      {selectedImagePreview && (
        <div
          onClick={() => setSelectedImagePreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 cursor-pointer"
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={selectedImagePreview}
              alt="Perbesar Foto Bukti"
              className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl"
            />
            <p className="mt-2 text-center text-xs text-white/80">Klik di mana saja untuk menutup</p>
          </div>
        </div>
      )}
    </div>
  );
}
