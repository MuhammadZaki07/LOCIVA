import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Droplets,
  Trash2,
  Lightbulb,
  CheckCircle2,
  MapPin,
  TrendingUp,
  Store,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Activity,
  Database,
  History,
} from "lucide-react";
import api from "@/context/apiClient";
import { useToast } from "@/components/ui/Toast";
import Spinner from "@/components/ui/Spinner";

export type ReportStatus = "reported" | "confirmed" | "resolved" | "rejected";

export interface CivicReportItem {
  id: string;
  title: string;
  category: string;
  location: string;
  status: ReportStatus;
  severity?: string;
  confirmationsCount: number;
  date: string;
  description?: string;
}

export interface AdminMetrics {
  total_reports: number;
  status_breakdown: Record<string, number>;
  severity_breakdown: Record<string, number>;
  total_confirmations: number;
  total_businesses: number;
  user_businesses: number;
  demo_businesses: number;
  total_users: number;
  total_business_types: number;
  total_simulations: number;
  avg_district_potential: number | null;
  telemetry_status: string;
}

interface QuickSyncLog {
  id: string;
  entity_type: string;
  status: string;
  records_processed: number;
  started_at: string;
}

interface QuickAuditLog {
  id: string;
  actor: { name: string };
  action: string;
  target_title: string;
  timestamp: string;
}

interface HealthSummary {
  status: "healthy" | "degraded" | "error";
  database_status: string;
  storage_writable: boolean;
}

interface DataQualitySummary {
  health_score: number;
  total_issues: number;
  scanned_entities: {
    businesses: number;
    reports: number;
  };
}

export default function AdminDashboard() {
  const { toast } = useToast();

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [reports, setReports] = useState<CivicReportItem[]>([]);
  const [syncLogs, setSyncLogs] = useState<QuickSyncLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<QuickAuditLog[]>([]);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [qualitySummary, setQualitySummary] = useState<DataQualitySummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, reportsRes, healthRes, qualityRes, syncRes, auditRes] =
        await Promise.allSettled([
          api.get("/admin/metrics"),
          api.get("/reports", { params: { per_page: 20 } }),
          api.get("/admin/system-health"),
          api.get("/admin/data-quality"),
          api.get("/admin/data-sync-logs"),
          api.get("/admin/audit-logs"),
        ]);

      // Metrics
      if (metricsRes.status === "fulfilled" && metricsRes.value.data?.success) {
        setMetrics(metricsRes.value.data.data);
      }

      // Reports queue
      if (reportsRes.status === "fulfilled" && reportsRes.value.data?.success) {
        const raw = Array.isArray(reportsRes.value.data.data?.data)
          ? reportsRes.value.data.data.data
          : Array.isArray(reportsRes.value.data.data)
          ? reportsRes.value.data.data
          : [];

        const mapped: CivicReportItem[] = raw.map((r: any) => ({
          id: String(r.id),
          title: r.title,
          category: r.category?.slug || r.category?.name || "road",
          location:
            r.area?.name ||
            (r.latitude != null && r.longitude != null
              ? `${Number(r.latitude).toFixed(3)}, ${Number(r.longitude).toFixed(3)}`
              : "wilayah terdata"),
          status: (r.status as ReportStatus) || "reported",
          severity: r.severity || "medium",
          confirmationsCount:
            r.confirmations_count ?? r.confirmations?.length ?? 0,
          date: r.created_at
            ? new Date(r.created_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "baru",
          description: r.description,
        }));
        setReports(mapped);
      }

      // System Health
      if (healthRes.status === "fulfilled" && healthRes.value.data?.success) {
        const h = healthRes.value.data.data;
        setHealthSummary({
          status: h.status || "healthy",
          database_status: h.components?.database?.status || "online",
          storage_writable: h.components?.storage?.writable ?? true,
        });
      }

      // Data Quality
      if (qualityRes.status === "fulfilled" && qualityRes.value.data?.success) {
        const q = qualityRes.value.data.data;
        setQualitySummary({
          health_score: q.health_score || 100,
          total_issues: q.total_issues || 0,
          scanned_entities: {
            businesses: q.scanned_entities?.businesses || 0,
            reports: q.scanned_entities?.reports || 0,
          },
        });
      }

      // Sync Logs
      if (syncRes.status === "fulfilled" && syncRes.value.data?.success) {
        const rawSync = Array.isArray(syncRes.value.data.data?.data)
          ? syncRes.value.data.data.data
          : Array.isArray(syncRes.value.data.data)
          ? syncRes.value.data.data
          : [];
        setSyncLogs(
          rawSync.slice(0, 3).map((s: any) => ({
            id: String(s.id),
            entity_type: s.entity_type,
            status: s.status,
            records_processed: s.records_processed,
            started_at: s.started_at,
          }))
        );
      }

      // Audit Logs
      if (auditRes.status === "fulfilled" && auditRes.value.data?.success) {
        const rawAudit = Array.isArray(auditRes.value.data.data?.data)
          ? auditRes.value.data.data.data
          : Array.isArray(auditRes.value.data.data)
          ? auditRes.value.data.data
          : [];
        setAuditLogs(
          rawAudit.slice(0, 4).map((a: any) => ({
            id: String(a.id),
            actor: { name: a.actor?.name || "sistem" },
            action: a.action,
            target_title: a.target_title || a.target_entity,
            timestamp: a.timestamp || a.created_at,
          }))
        );
      }
    } catch (err: any) {
      console.warn("Gagal memuat telemetri dashboard:", err);
      setError("Gagal memuat telemetri operasional dari server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const updateStatus = async (id: string, newStatus: ReportStatus) => {
    try {
      const res = await api.patch(`/reports/${id}/status`, { status: newStatus });
      if (res.data?.success) {
        setReports((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
        );
        toast({
          title: "Status diperbarui",
          description: `Status laporan diubah menjadi ${newStatus}.`,
          variant: "success",
        });
        fetchDashboardData();
      }
    } catch (err: any) {
      toast({
        title: "Gagal memperbarui status",
        description: err.response?.data?.message || "Tidak dapat memperbarui status.",
        variant: "error",
      });
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesCat = categoryFilter === "all" || r.category === categoryFilter;
    return matchesStatus && matchesCat;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "flood":
        return <Droplets size={13} className="text-white" />;
      case "waste":
        return <Trash2 size={13} className="text-white" />;
      case "light":
        return <Lightbulb size={13} className="text-white" />;
      default:
        return <AlertTriangle size={13} className="text-white" />;
    }
  };

  const getToneColor = (category: string) => {
    switch (category) {
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

  const reportStatuses: ReportStatus[] = [
    "reported",
    "confirmed",
    "resolved",
    "rejected",
  ];

  // Distribution calculation from real metrics
  const totalReportsCount = metrics?.total_reports ?? reports.length;
  const reportedCount = metrics?.status_breakdown?.reported ?? 0;
  const confirmedCount = metrics?.status_breakdown?.confirmed ?? 0;
  const resolvedCount = metrics?.status_breakdown?.resolved ?? 0;
  const rejectedCount = metrics?.status_breakdown?.rejected ?? 0;

  const lowSev = metrics?.severity_breakdown?.low ?? 0;
  const medSev = metrics?.severity_breakdown?.medium ?? 0;
  const highSev = metrics?.severity_breakdown?.high ?? 0;
  const totalSev = (lowSev + medSev + highSev) || 1;

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f0f8] pb-4">
        <div>
          <h1 className="font-display text-[22px] font-medium tracking-tight text-ink sm:text-[24px]">
            dashboard overview
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            telemetri operasional spasial, antrean verifikasi lapangan, dan kesehatan infrastruktur sistem.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            live production telemetry
          </span>

          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={loading}
            className="clay-press flex items-center gap-1.5 rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin text-primary" : ""} />
            <span>segarkan data</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-[12px] bg-rose-50 p-3.5 text-[12.5px] text-rose-700 border border-rose-100">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary KPI Hierarchy */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Civic Reports */}
        <div className="clay clay-lift rounded-[14px] p-4 bg-white">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11.5px] font-medium">total titik laporan civic</span>
            <AlertTriangle size={15} className="text-warning" />
          </div>
          <p className="mt-2 font-display text-[28px] font-medium leading-none text-ink">
            {totalReportsCount}
          </p>
          <p className="mt-2 text-[11px] text-muted">
            <span className="font-medium text-emerald-600">
              {confirmedCount} terverifikasi
            </span>{" "}
            · {reportedCount} baru masuk
          </p>
        </div>

        {/* Community Confirmations */}
        <div className="clay clay-lift rounded-[14px] p-4 bg-white">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11.5px] font-medium">konfirmasi warga sekitar</span>
            <CheckCircle2 size={15} className="text-emerald-500" />
          </div>
          <p className="mt-2 font-display text-[28px] font-medium leading-none text-ink">
            {metrics ? metrics.total_confirmations : reports.reduce((acc, r) => acc + r.confirmationsCount, 0)}
          </p>
          <p className="mt-2 text-[11px] text-muted">verifikasi kondisi faktual lapangan</p>
        </div>

        {/* Registered Commercial Points */}
        <div className="clay clay-lift rounded-[14px] p-4 bg-white">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11.5px] font-medium">titik usaha terdaftar</span>
            <Store size={15} className="text-primary" />
          </div>
          <p className="mt-2 font-display text-[28px] font-medium leading-none text-ink">
            {metrics ? metrics.total_businesses : 0}
          </p>
          <p className="mt-2 text-[11px] text-muted">
            {metrics ? `${metrics.user_businesses} UMKM pengguna · ${metrics.demo_businesses} data demo` : "titik komersial"}
          </p>
        </div>

        {/* Average Simulation Potential */}
        <div className="clay clay-lift rounded-[14px] p-4 bg-white">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11.5px] font-medium">rata-rata potensi koridor</span>
            <TrendingUp size={15} className="text-primary" />
          </div>
          <p className="mt-2 font-display text-[28px] font-medium leading-none text-ink">
            {metrics?.avg_district_potential != null ? `${metrics.avg_district_potential}` : "—"}
          </p>
          <p className="mt-2 text-[11px] text-muted">
            {metrics?.avg_district_potential != null ? "rata-rata skoring kalkulasi analitik" : "belum ada simulasi tersimpan"}
          </p>
        </div>
      </div>

      {/* Main 2-Column Balanced Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Visual Trends & Moderation Queue (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Status Breakdown & Severity Real Distribution Chart */}
          <div className="clay rounded-[16px] p-5 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0f0f8] pb-3">
              <div>
                <h2 className="font-display text-[15px] font-medium text-ink">
                  distribusi status & keparahan laporan
                </h2>
                <p className="text-[11.5px] text-muted">
                  proporsi kondisi faktual berdasarkan data database aktual
                </p>
              </div>
              <span className="text-[11px] font-medium text-muted">
                {totalReportsCount} data total
              </span>
            </div>

            {/* Proportional Stacked Bar Chart for Status */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-muted mb-1.5 font-medium">
                <span>distribusi status penanganan</span>
                <span>
                  {totalReportsCount > 0
                    ? `${Math.round(((confirmedCount + resolvedCount) / totalReportsCount) * 100)}% ditindaklanjuti`
                    : "0%"}
                </span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                {totalReportsCount > 0 ? (
                  <>
                    <div
                      style={{ width: `${(reportedCount / totalReportsCount) * 100}%` }}
                      className="bg-amber-400 transition-all"
                      title={`Baru: ${reportedCount}`}
                    />
                    <div
                      style={{ width: `${(confirmedCount / totalReportsCount) * 100}%` }}
                      className="bg-emerald-500 transition-all"
                      title={`Dikonfirmasi: ${confirmedCount}`}
                    />
                    <div
                      style={{ width: `${(resolvedCount / totalReportsCount) * 100}%` }}
                      className="bg-blue-500 transition-all"
                      title={`Selesai: ${resolvedCount}`}
                    />
                    <div
                      style={{ width: `${(rejectedCount / totalReportsCount) * 100}%` }}
                      className="bg-rose-400 transition-all"
                      title={`Ditolak: ${rejectedCount}`}
                    />
                  </>
                ) : (
                  <div className="w-full bg-slate-200" />
                )}
              </div>

              {/* Chart Legend */}
              <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>menunggu ({reportedCount})</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>terverifikasi ({confirmedCount})</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  <span>selesai ({resolvedCount})</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  <span>ditolak ({rejectedCount})</span>
                </span>
              </div>
            </div>

            {/* Severity Distribution */}
            <div className="border-t border-[#f0f0f8] pt-3">
              <span className="text-[11px] font-medium text-muted block mb-2">
                tingkat urgensi masalah lapangan
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-[10px] bg-slate-50 p-2 border border-slate-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-700 font-medium">rendah</span>
                    <span className="font-semibold text-ink">{lowSev}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      style={{ width: `${(lowSev / totalSev) * 100}%` }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                </div>

                <div className="rounded-[10px] bg-slate-50 p-2 border border-slate-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-amber-700 font-medium">sedang</span>
                    <span className="font-semibold text-ink">{medSev}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      style={{ width: `${(medSev / totalSev) * 100}%` }}
                      className="h-full bg-amber-500"
                    />
                  </div>
                </div>

                <div className="rounded-[10px] bg-slate-50 p-2 border border-slate-100">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-rose-700 font-medium">tinggi</span>
                    <span className="font-semibold text-ink">{highSev}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      style={{ width: `${(highSev / totalSev) * 100}%` }}
                      className="h-full bg-rose-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Moderation Queue Table */}
          <div className="clay rounded-[16px] p-5 bg-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f0f8] pb-3.5">
              <div>
                <h2 className="font-display text-[15px] font-medium text-ink">
                  antrean moderasi lapangan
                </h2>
                <p className="text-[11.5px] text-muted">
                  tinjau laporan kondisi fisik sebelum memengaruhi skor analitik
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-[8px] border border-[#e5e5f0] bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">semua status</option>
                  <option value="reported">baru masuk</option>
                  <option value="confirmed">dikonfirmasi</option>
                  <option value="resolved">selesai</option>
                  <option value="rejected">ditolak</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-[8px] border border-[#e5e5f0] bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">semua kategori</option>
                  <option value="road">jalan rusak</option>
                  <option value="flood">banjir</option>
                  <option value="waste">sampah</option>
                  <option value="light">lampu jalan</option>
                </select>

                <Link
                  to="/admin/reports"
                  className="clay-press inline-flex items-center gap-1 rounded-[8px] border border-[#e5e5f0] bg-white px-2.5 py-1 text-[11.5px] font-medium text-primary hover:text-ink no-underline"
                >
                  <span>semua</span>
                  <ArrowRight size={11} />
                </Link>
              </div>
            </div>

            <div className="mt-3.5 space-y-2.5">
              {loading ? (
                <div className="py-10 text-center text-muted">
                  <Spinner size="md" className="mx-auto mb-2 text-primary" />
                  <p className="text-[12px]">menghubungkan ke basis data laporan...</p>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-slate-200 py-10 text-center text-muted">
                  <AlertCircle size={20} className="mx-auto mb-1.5 text-slate-300" />
                  <p className="text-[13px] font-medium text-ink">tidak ada laporan dengan filter saat ini</p>
                  <p className="mt-0.5 text-[11px]">coba pilih status atau kategori lain.</p>
                </div>
              ) : (
                filteredReports.slice(0, 5).map((report) => (
                  <div
                    key={report.id}
                    className="clay-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[12px] p-3 transition-colors hover:bg-slate-50/60"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] shadow-xs"
                        style={{ backgroundColor: getToneColor(report.category) }}
                      >
                        {getCategoryIcon(report.category)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-display text-[13px] font-medium text-ink truncate max-w-xs">
                            {report.title}
                          </span>
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[9.5px] font-medium border ${
                              report.status === "confirmed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : report.status === "resolved"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : report.status === "rejected"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {report.status}
                          </span>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                          <MapPin size={10} className="text-primary shrink-0" />
                          <span className="truncate">{report.location}</span>
                          <span>·</span>
                          <span>{report.date}</span>
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1 border-t border-[#f0f0f8] pt-2 sm:border-t-0 sm:pt-0">
                      {reportStatuses.map((st) => {
                        const isCurrent = st === report.status;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => updateStatus(report.id, st)}
                            className={`clay-press rounded-[6px] px-2 py-0.5 text-[10.5px] font-medium transition-all cursor-pointer ${
                              isCurrent
                                ? "clay-primary text-white shadow-xs"
                                : "bg-white text-muted hover:text-ink border border-slate-200"
                            }`}
                          >
                            {st}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Infrastructure Health, Data Quality, Sync & Activity (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Data Quality & System Health Combined Widget */}
          <div className="clay rounded-[16px] p-5 bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0f0f8] pb-3">
              <div>
                <h2 className="font-display text-[15px] font-medium text-ink">
                  integritas data & server
                </h2>
                <p className="text-[11.5px] text-muted">
                  status pangkalan data dan kesehatan layanan
                </p>
              </div>
              <Link
                to="/admin/data-quality"
                className="text-[11.5px] font-medium text-primary hover:underline no-underline"
              >
                detail →
              </Link>
            </div>

            {/* Quality Score Bar */}
            <div className="rounded-[12px] bg-slate-50 p-3 border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-ink">
                  skor kualitas spasial
                </span>
                <span className="font-display text-[16px] font-semibold text-emerald-600">
                  {qualitySummary ? `${qualitySummary.health_score}/100` : "100/100"}
                </span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  style={{ width: `${qualitySummary ? qualitySummary.health_score : 100}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                <span>
                  {qualitySummary
                    ? `${qualitySummary.scanned_entities.businesses} bisnis · ${qualitySummary.scanned_entities.reports} laporan`
                    : "0 entitas terpindai"}
                </span>
                <span className="text-emerald-700 font-medium">
                  {qualitySummary?.total_issues === 0 ? "bersih tanpa anomali" : `${qualitySummary?.total_issues} perlu ditinjau`}
                </span>
              </div>
            </div>

            {/* System Infrastructure Indicators */}
            <div className="grid grid-cols-2 gap-2 text-[11.5px]">
              <div className="rounded-[10px] bg-slate-50 p-2.5 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Database size={13} className="text-primary" />
                  <span className="font-medium text-ink">database</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {healthSummary?.database_status || "online"}
                </span>
              </div>

              <div className="rounded-[10px] bg-slate-50 p-2.5 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Activity size={13} className="text-primary" />
                  <span className="font-medium text-ink">penyimpanan</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {healthSummary?.storage_writable ? "dapat ditulis" : "terkunci"}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Sync Operations */}
          <div className="clay rounded-[16px] p-5 bg-white space-y-3">
            <div className="flex items-center justify-between border-b border-[#f0f0f8] pb-3">
              <div>
                <h2 className="font-display text-[15px] font-medium text-ink">
                  sinkronisasi sumber data
                </h2>
                <p className="text-[11.5px] text-muted">riwayat pembaruan spasial</p>
              </div>
              <Link
                to="/admin/data-sources"
                className="text-[11.5px] font-medium text-primary hover:underline no-underline"
              >
                kelola →
              </Link>
            </div>

            <div className="space-y-2">
              {syncLogs.length === 0 ? (
                <div className="py-4 text-center text-[12px] text-muted">
                  belum ada riwayat sinkronisasi baru
                </div>
              ) : (
                syncLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-[10px] bg-slate-50 p-2.5 border border-slate-100 text-[11.5px]"
                  >
                    <div>
                      <p className="font-medium text-ink capitalize">{log.entity_type}</p>
                      <p className="text-[10.5px] text-muted">
                        {log.records_processed} baris data diproses
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        log.status === "success"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Audit Activities Stream */}
          <div className="clay rounded-[16px] p-5 bg-white space-y-3">
            <div className="flex items-center justify-between border-b border-[#f0f0f8] pb-3">
              <div>
                <h2 className="font-display text-[15px] font-medium text-ink">
                  jejak audit terkini
                </h2>
                <p className="text-[11.5px] text-muted">aktivitas admin & perubahan sistem</p>
              </div>
              <Link
                to="/admin/system-health"
                className="text-[11.5px] font-medium text-primary hover:underline no-underline"
              >
                riwayat audit →
              </Link>
            </div>

            <div className="space-y-2">
              {auditLogs.length === 0 ? (
                <div className="py-4 text-center text-[12px] text-muted">
                  belum ada catatan audit aktivitas
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2.5 rounded-[10px] bg-slate-50/70 p-2.5 border border-slate-100 text-[11.5px]"
                  >
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-primary-soft text-primary">
                      <History size={12} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink truncate">
                        {log.actor.name}{" "}
                        <span className="font-normal text-muted">
                          {log.action} {log.target_title}
                        </span>
                      </p>
                      <p className="text-[10.5px] text-slate-400 mt-0.5">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
