import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Droplets,
  Trash2,
  Lightbulb,
  Search,
  Camera,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  MapPin,
  ExternalLink,
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
import Spinner from "@/components/ui/Spinner";
import { getStorageUrl } from "@/context/userService";

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  reported: {
    label: "menunggu verifikasi",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
  },
  verification: {
    label: "sedang ditinjau",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  confirmed: {
    label: "dikonfirmasi warga/admin",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    dot: "bg-indigo-500",
  },
  handled: {
    label: "dalam penanganan",
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
  resolved: {
    label: "selesai ditangani",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "ditolak / tidak valid",
    bg: "bg-rose-50",
    text: "text-rose-700",
    dot: "bg-rose-500",
  },
};

const SEVERITY_CONFIG: Record<
  ReportSeverity,
  { label: string; bg: string; text: string }
> = {
  low: { label: "rendah", bg: "bg-emerald-50", text: "text-emerald-700" },
  medium: { label: "sedang", bg: "bg-amber-50", text: "text-amber-700" },
  high: { label: "tinggi", bg: "bg-rose-50", text: "text-rose-700" },
};

export default function AdminReports() {
  const { toast } = useToast();

  const [mode, setMode] = useState<"list" | "detail">("list");
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

  // Detail & Moderation Workbench
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  // Moderation action form state
  const [modStatus, setModStatus] = useState<ReportStatus>("confirmed");
  const [modNote, setModNote] = useState("");
  const [modSubmitting, setModSubmitting] = useState(false);
  const [modError, setModError] = useState<string | null>(null);

  // Photo upload
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: currentPage,
        per_page: perPage,
        status: statusFilter !== "all" ? statusFilter : undefined,
        severity: severityFilter !== "all" ? severityFilter : undefined,
        search: debouncedSearch.trim() || undefined,
      };

      const res = await getReports(params);
      setReports(res.data);
      setTotalItems(res.meta.total);
      setLastPage(res.meta.last_page);
    } catch (err: any) {
      console.warn("Gagal memuat daftar laporan:", err);
      setError("Gagal memuat antrean laporan dari server.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, severityFilter, currentPage]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleOpenDetail = async (item: ReportItem) => {
    setSelectedReport(item);
    setModStatus(item.status);
    setModNote("");
    setModError(null);
    setMode("detail");

    // Fetch fresh detail
    try {
      const detail = await getReport(item.id);
      setSelectedReport(detail);
      setModStatus(detail.status);
    } catch (err) {
      console.warn("Gagal memuat detail laporan lengkap:", err);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    setModSubmitting(true);
    setModError(null);
    try {
      const updated = await updateReportStatus(
        selectedReport.id,
        modStatus,
        modNote.trim() || undefined
      );

      toast({
        title: "Status laporan diperbarui",
        description: `Laporan diubah menjadi "${STATUS_CONFIG[modStatus]?.label || modStatus}".`,
        variant: "success",
      });

      setSelectedReport(updated);
      await fetchReports();
    } catch (err: any) {
      setModError(
        err.response?.data?.message || "Gagal memperbarui status laporan."
      );
    } finally {
      setModSubmitting(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedReport) return;

    setUploadingMedia(true);
    try {
      await uploadReportMedia(selectedReport.id, [file]);
      toast({
        title: "Foto bukti diunggah",
        description: "Lampiran berhasil ditambahkan ke riwayat laporan.",
        variant: "success",
      });
      const fresh = await getReport(selectedReport.id);
      setSelectedReport(fresh);
    } catch (err: any) {
      toast({
        title: "Gagal mengunggah foto",
        description: err.response?.data?.message || "Ukuran file terlalu besar atau format tidak didukung.",
        variant: "error",
      });
    } finally {
      setUploadingMedia(false);
    }
  };

  const getCategoryIcon = (slug?: string) => {
    switch (slug) {
      case "flood":
        return <Droplets size={14} className="text-white" />;
      case "waste":
        return <Trash2 size={14} className="text-white" />;
      case "light":
        return <Lightbulb size={14} className="text-white" />;
      default:
        return <AlertTriangle size={14} className="text-white" />;
    }
  };

  const getToneColor = (slug?: string) => {
    switch (slug) {
      case "flood":
        return "#0284c7";
      case "waste":
        return "#d97706";
      case "light":
        return "#ca8a04";
      default:
        return "#ef4444";
    }
  };

  // ── Render Detail & Moderation Workbench View ───────────────────────────────
  if (mode === "detail" && selectedReport) {
    const statusCfg = STATUS_CONFIG[selectedReport.status] || STATUS_CONFIG.reported;
    const severityCfg = SEVERITY_CONFIG[selectedReport.severity] || SEVERITY_CONFIG.medium;
    const catSlug = selectedReport.category?.slug || "road";

    return (
      <div className="space-y-6 text-left max-w-5xl mx-auto">
        {/* Back navigation */}
        <div className="flex items-center justify-between border-b border-[#f0f0f8] pb-4">
          <button
            type="button"
            onClick={() => setMode("list")}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted hover:text-ink cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>kembali ke antrean laporan</span>
          </button>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${statusCfg.bg} ${statusCfg.text}`}
            >
              {statusCfg.label}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${severityCfg.bg} ${severityCfg.text}`}
            >
              urgensi: {severityCfg.label}
            </span>
          </div>
        </div>

        {/* Workbench Layout: 2 Columns */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Report Evidence & Info (7 cols) */}
          <div className="space-y-6 lg:col-span-7">
            <div className="clay rounded-[20px] p-6 bg-white space-y-5">
              <div className="flex items-start gap-3.5">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] shadow-xs"
                  style={{ backgroundColor: getToneColor(catSlug) }}
                >
                  {getCategoryIcon(catSlug)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[18px] font-medium text-ink leading-snug">
                    {selectedReport.title}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
                    <MapPin size={12} className="text-primary" />
                    <span>
                      {selectedReport.area?.name || "Wilayah Terdata"} ·{" "}
                      {Number(selectedReport.latitude).toFixed(4)},{" "}
                      {Number(selectedReport.longitude).toFixed(4)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="rounded-[12px] bg-slate-50 p-4 border border-slate-100">
                <span className="text-[11px] font-semibold text-muted tracking-wider block mb-1">
                  deskripsi lapangan
                </span>
                <p className="text-[13px] text-ink leading-relaxed">
                  {selectedReport.description || "Tidak ada deskripsi tambahan dari pelapor."}
                </p>
              </div>

              {/* Photo Evidence */}
              <div>
                <span className="text-[11.5px] font-medium text-ink block mb-2">
                  foto bukti kondisi ({selectedReport.media?.length || 0} lampiran)
                </span>
                {selectedReport.media && selectedReport.media.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedReport.media.map((m) => {
                      const url = getStorageUrl(m.file_path);
                      if (!url) return null;
                      return (
                        <a
                          key={m.id}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative overflow-hidden rounded-[10px] border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center"
                        >
                          <img
                            src={url}
                            alt="Bukti lapangan"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <ExternalLink size={16} />
                          </div>
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[10px] border border-dashed border-slate-200 p-6 text-center text-[12px] text-muted">
                    belum ada lampiran foto untuk laporan ini
                  </div>
                )}
              </div>

              {/* Reporter & Metadata */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#f0f0f8] text-[12px]">
                <div>
                  <span className="text-[11px] text-muted font-medium block">pelapor</span>
                  <p className="mt-0.5 font-medium text-ink">{selectedReport.user?.name || "Anonim / Tamu"}</p>
                  <p className="text-[11px] text-muted">{selectedReport.user?.email || "—"}</p>
                </div>
                <div>
                  <span className="text-[11px] text-muted font-medium block">waktu dibuat</span>
                  <p className="mt-0.5 font-medium text-ink">
                    {selectedReport.created_at
                      ? new Date(selectedReport.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-medium">
                    {selectedReport.confirmations_count || 0} konfirmasi warga
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Moderation Actions & Audit Trail (5 cols) */}
          <div className="space-y-6 lg:col-span-5">
            {/* Moderation Form Card */}
            <div className="clay rounded-[20px] p-6 bg-white space-y-4">
              <div className="border-b border-[#f0f0f8] pb-3">
                <h3 className="font-display text-[15px] font-medium text-ink">
                  tindakan moderasi
                </h3>
                <p className="text-[11.5px] text-muted">
                  tentukan status verifikasi dan catatan pertimbangan admin
                </p>
              </div>

              {modError && (
                <div className="flex items-center gap-2 rounded-[10px] bg-rose-50 p-3 text-[12px] text-rose-700 border border-rose-100">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{modError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateStatus} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-ink">
                    perbarui status verifikasi
                  </label>
                  <select
                    value={modStatus}
                    onChange={(e) => setModStatus(e.target.value as ReportStatus)}
                    className="mt-1 w-full rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-2 text-[12.5px] font-medium text-ink outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="reported">menunggu verifikasi</option>
                    <option value="verification">sedang ditinjau</option>
                    <option value="confirmed">dikonfirmasi warga / admin</option>
                    <option value="handled">dalam penanganan</option>
                    <option value="resolved">selesai ditangani</option>
                    <option value="rejected">ditolak / tidak valid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-ink">
                    catatan moderasi (opsional)
                  </label>
                  <textarea
                    rows={3}
                    value={modNote}
                    onChange={(e) => setModNote(e.target.value)}
                    placeholder="Contoh: Kondisi fisik jalan telah dikonfirmasi oleh tim patroli lapangan..."
                    className="mt-1 w-full rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-2 text-[12.5px] text-ink outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-ink">
                    unggah foto verifikasi tambahan
                  </label>
                  <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#d5d5e5] bg-slate-50/50 p-3 text-[12px] text-muted hover:bg-slate-100">
                    <Camera size={15} />
                    <span>{uploadingMedia ? "mengunggah..." : "pilih foto penanganan lapangan"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingMedia}
                      onChange={handleUploadPhoto}
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={modSubmitting}
                  className="clay-primary w-full inline-flex items-center justify-center gap-1.5 rounded-[10px] py-2 text-[12.5px] font-medium text-white cursor-pointer disabled:opacity-50"
                >
                  {modSubmitting && <Spinner size="sm" />}
                  <span>{modSubmitting ? "memperbarui..." : "terapkan status moderasi"}</span>
                </button>
              </form>
            </div>

            {/* Moderation History Log */}
            <div className="clay rounded-[20px] p-6 bg-white space-y-3">
              <div className="border-b border-[#f0f0f8] pb-3">
                <h3 className="font-display text-[15px] font-medium text-ink">
                  riwayat verifikasi
                </h3>
                <p className="text-[11.5px] text-muted">catatan audit pengubahan status</p>
              </div>

              {selectedReport.verifications && selectedReport.verifications.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedReport.verifications.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-[10px] bg-slate-50 p-2.5 border border-slate-100 text-[11.5px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-ink">
                          {v.moderator?.name || "Administrator"}
                        </span>
                        <span className="text-muted text-[10.5px]">
                          {v.created_at
                            ? new Date(v.created_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                              })
                            : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-ink">{v.note || `Tindakan: ${v.action}`}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-muted py-2">belum ada catatan verifikasi sebelumnya.</p>
              )}
            </div>
          </div>
        </div>
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
            moderasi laporan civic
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            verifikasi laporan kondisi jalan, banjir, sampah, dan ketertiban sebelum memengaruhi analitik lokasi.
          </p>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-[11.5px] font-medium text-muted">
          total {totalItems} laporan terdata
        </span>
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
              placeholder="Cari judul atau keterangan..."
              className="w-full rounded-[10px] border border-[#e5e5f0] bg-white pl-8 pr-3 py-1.5 text-[12.5px] text-ink outline-none focus:border-primary"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-1.5 text-[12px] font-medium text-ink outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">semua status</option>
            <option value="reported">menunggu verifikasi</option>
            <option value="verification">sedang ditinjau</option>
            <option value="confirmed">dikonfirmasi</option>
            <option value="handled">dalam penanganan</option>
            <option value="resolved">selesai ditangani</option>
            <option value="rejected">ditolak</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-1.5 text-[12px] font-medium text-ink outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">semua urgensi</option>
            <option value="low">rendah</option>
            <option value="medium">sedang</option>
            <option value="high">tinggi</option>
          </select>
        </div>

        {(search || statusFilter !== "all" || severityFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setSeverityFilter("all");
              setCurrentPage(1);
            }}
            className="text-[12px] font-medium text-primary hover:underline cursor-pointer"
          >
            reset filter
          </button>
        )}
      </div>

      {/* Reports Table */}
      <div className="clay overflow-hidden rounded-[16px] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[#ececf6] bg-slate-50/60 text-[11px] font-semibold text-muted">
              <tr>
                <th className="px-5 py-3">laporan & kategori</th>
                <th className="px-5 py-3">lokasi titik</th>
                <th className="px-5 py-3">status</th>
                <th className="px-5 py-3">urgensi</th>
                <th className="px-5 py-3 text-right">tindakan</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f0f0f8]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted">
                    <Spinner size="md" className="mx-auto mb-2 text-primary" />
                    <p className="text-[12.5px]">memuat antrean laporan...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-rose-600">
                    <p className="text-[13px]">{error}</p>
                    <button
                      type="button"
                      onClick={() => void fetchReports()}
                      className="mt-2 text-[12px] font-medium text-primary underline cursor-pointer"
                    >
                      coba lagi
                    </button>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted">
                    <p className="text-[13px] font-medium text-ink">tidak ada laporan ditemukan</p>
                    <p className="mt-0.5 text-[11.5px]">coba sesuaikan kata kunci atau filter.</p>
                  </td>
                </tr>
              ) : (
                reports.map((item) => {
                  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.reported;
                  const severityCfg = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.medium;
                  const catSlug = item.category?.slug || "road";

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] shadow-xs"
                            style={{ backgroundColor: getToneColor(catSlug) }}
                          >
                            {getCategoryIcon(catSlug)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-display font-medium text-ink truncate max-w-sm">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-muted truncate">
                              {item.category?.name || "laporan civic"} ·{" "}
                              {item.created_at
                                ? new Date(item.created_at).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                  })
                                : "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-[12px] text-muted">
                        <div className="flex items-center gap-1">
                          <MapPin size={11} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-xs">{item.area?.name || "Wilayah Terdata"}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium border ${statusCfg.bg} ${statusCfg.text}`}
                        >
                          {statusCfg.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium border ${severityCfg.bg} ${severityCfg.text}`}
                        >
                          {severityCfg.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item)}
                          className="clay-press inline-flex items-center gap-1 rounded-[6px] border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11.5px] font-medium text-primary hover:bg-primary/10 cursor-pointer"
                        >
                          <ShieldCheck size={12} />
                          <span>tinjau & moderasi</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Standard Pagination Footer */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[#f0f0f8] px-5 py-3.5 text-[12px] text-muted">
            <div>
              menampilkan halaman <span className="font-semibold text-ink">{currentPage}</span> dari{" "}
              <span className="font-semibold text-ink">{lastPage}</span> (total {totalItems} laporan)
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
    </div>
  );
}
