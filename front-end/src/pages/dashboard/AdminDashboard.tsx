
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

export type ReportStatus =
  | "reported"
  | "confirmed"
  | "resolved"
  | "rejected";

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
  status: string;
  database_status: string | null;
  storage_writable: boolean | null;
}

interface DataQualitySummary {
  health_score: number;
  total_issues: number;
  scanned_entities: {
    businesses: number;
    reports: number;
  };
}

const STATUS_LABELS: Record<ReportStatus, string> = {
  reported: "Menunggu",
  confirmed: "Terverifikasi",
  resolved: "Selesai",
  rejected: "Ditolak",
};

const STATUS_COLORS: Record<ReportStatus, string> = {
  reported: "#F59E0B",
  confirmed: "#10B981",
  resolved: "#3B82F6",
  rejected: "#F87171",
};

const STATUS_BADGES: Record<ReportStatus, string> = {
  reported: "border-amber-200 bg-amber-50 text-amber-700",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  resolved: "border-blue-200 bg-blue-50 text-blue-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

const REPORT_STATUSES: ReportStatus[] = [
  "reported",
  "confirmed",
  "resolved",
  "rejected",
];

const numberFormatter = new Intl.NumberFormat("id-ID");

function formatNumber(value: number | null | undefined): string {
  return numberFormatter.format(value ?? 0);
}

function getStatusLabel(status: ReportStatus): string {
  return STATUS_LABELS[status] ?? status;
}

function getValidNumber(
  value: unknown,
  fallback = 0,
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function getResponseRows(response: any): any[] {
  const data = response?.data?.data;

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data)) {
    return data;
  }

  return [];
}

function isHealthyStatus(status: string | null | undefined): boolean {
  const normalized = status?.toLowerCase().trim();

  return ["healthy", "online", "ok", "connected", "up"].includes(
    normalized ?? "",
  );
}

function getErrorMessage(error: any): string {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Terjadi kesalahan saat mengambil data."
  );
}

/* =========================================================
   STATUS DONUT CHART
========================================================= */

function StatusDonutChart({
  values,
  total,
}: {
  values: Record<ReportStatus, number>;
  total: number;
}) {
  const entries = REPORT_STATUSES.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    value: Math.max(0, getValidNumber(values[status])),
    color: STATUS_COLORS[status],
  }));

  const chartTotal = entries.reduce(
    (sum, entry) => sum + entry.value,
    0,
  );

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const gap = 1.5;

  return (
    <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[170px_minmax(0,1fr)]">
      <div className="relative mx-auto h-[170px] w-[170px]">
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label="Grafik donat distribusi status laporan"
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="11"
          />

          {chartTotal > 0 &&
            entries.map((entry) => {
              const segmentLength =
                (entry.value / chartTotal) * circumference;

              const previousValue = entries
                .slice(0, entries.indexOf(entry))
                .reduce((sum, item) => sum + item.value, 0);

              const offset =
                (previousValue / chartTotal) * circumference;

              return (
                <circle
                  key={entry.status}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={entry.color}
                  strokeWidth="11"
                  strokeDasharray={`${Math.max(
                    0,
                    segmentLength - gap,
                  )} ${circumference}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                  className="transition-all duration-700"
                >
                  <title>
                    {entry.label}: {formatNumber(entry.value)} laporan
                  </title>
                </circle>
              );
            })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[28px] font-semibold leading-none tracking-tight text-ink">
            {formatNumber(total)}
          </span>

          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.15em] text-muted">
            laporan
          </span>

          {chartTotal === 0 && (
            <span className="mt-1 text-[9px] text-muted">
              belum tersedia
            </span>
          )}
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        {entries.map((entry) => {
          const percentage =
            chartTotal > 0
              ? Math.round((entry.value / chartTotal) * 100)
              : 0;

          return (
            <div key={entry.status} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />

                  <span className="truncate text-[12px] font-medium text-ink">
                    {entry.label}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[12px] font-semibold tabular-nums text-ink">
                    {formatNumber(entry.value)}
                  </span>

                  <span className="w-9 text-right text-[10px] tabular-nums text-muted">
                    {percentage}%
                  </span>
                </div>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: entry.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   SEVERITY BAR CHART
========================================================= */

function SeverityBarChart({
  low,
  medium,
  high,
}: {
  low: number;
  medium: number;
  high: number;
}) {
  const items = [
    {
      label: "Rendah",
      description: "Prioritas normal",
      value: Math.max(0, getValidNumber(low)),
      color: "#10B981",
      track: "bg-emerald-50",
    },
    {
      label: "Sedang",
      description: "Perlu pemantauan",
      value: Math.max(0, getValidNumber(medium)),
      color: "#F59E0B",
      track: "bg-amber-50",
    },
    {
      label: "Tinggi",
      description: "Prioritas penanganan",
      value: Math.max(0, getValidNumber(high)),
      color: "#F43F5E",
      track: "bg-rose-50",
    },
  ];

  const maxValue = Math.max(...items.map((item) => item.value), 1);

  const total = items.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  return (
    <div className="space-y-5">
      {items.map((item) => {
        const percentage =
          total > 0
            ? Math.round((item.value / total) * 100)
            : 0;

        const barWidth =
          total > 0
            ? (item.value / maxValue) * 100
            : 0;

        return (
          <div key={item.label} className="space-y-2">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold text-ink">
                  {item.label}
                </p>

                <p className="mt-0.5 text-[10.5px] text-muted">
                  {item.description}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[15px] font-semibold tabular-nums text-ink">
                  {formatNumber(item.value)}
                </span>

                <span className="ml-1.5 text-[10px] tabular-nums text-muted">
                  {percentage}%
                </span>
              </div>
            </div>

            <div
              className={`h-3 overflow-hidden rounded-full ${item.track}`}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${barWidth}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        );
      })}

      {total === 0 && (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-muted">
          Belum ada data tingkat keparahan.
        </p>
      )}
    </div>
  );
}

/* =========================================================
   REUSABLE DASHBOARD COMPONENTS
========================================================= */

function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#f0f0f8] pb-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="font-display text-[15px] font-semibold text-ink">
          {title}
        </h2>

        <p className="mt-0.5 text-[11.5px] text-muted">
          {description}
        </p>
      </div>

      {action}
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon,
  iconClass,
  iconBackground,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
  iconBackground: string;
}) {
  return (
    <div className="clay clay-lift group min-w-0 rounded-[14px] border border-[#f0f0f8] bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11.5px] font-medium leading-relaxed text-muted">
          {label}
        </span>

        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] transition-colors ${iconBackground}`}
        >
          <span className={iconClass}>{icon}</span>
        </div>
      </div>

      <p className="mt-3 break-words font-display text-[28px] font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>

      <p className="mt-3 text-[10.5px] leading-relaxed text-muted">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   MAIN DASHBOARD
========================================================= */

export default function AdminDashboard() {
  const { toast } = useToast();

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [reports, setReports] = useState<CivicReportItem[]>([]);
  const [syncLogs, setSyncLogs] = useState<QuickSyncLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<QuickAuditLog[]>([]);
  const [healthSummary, setHealthSummary] =
    useState<HealthSummary | null>(null);
  const [qualitySummary, setQualitySummary] =
    useState<DataQualitySummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(
    null,
  );

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const failedEndpoints: string[] = [];

    try {
      const [
        metricsRes,
        reportsRes,
        healthRes,
        qualityRes,
        syncRes,
        auditRes,
      ] = await Promise.allSettled([
        api.get("/admin/metrics"),
        api.get("/reports", { params: { per_page: 20 } }),
        api.get("/admin/system-health"),
        api.get("/admin/data-quality"),
        api.get("/admin/data-sync-logs"),
        api.get("/admin/audit-logs"),
      ]);

      /* Metrics */

      if (
        metricsRes.status === "fulfilled" &&
        metricsRes.value.data?.success
      ) {
        setMetrics(metricsRes.value.data.data);
      } else {
        failedEndpoints.push("metrik dashboard");
      }

      /* Reports */

      if (
        reportsRes.status === "fulfilled" &&
        reportsRes.value.data?.success
      ) {
        const rawReports = getResponseRows(reportsRes.value);

        const mappedReports: CivicReportItem[] = rawReports.map(
          (report: any) => {
            const rawCategory =
              typeof report.category === "string"
                ? report.category
                : report.category?.slug ||
                report.category?.name ||
                "road";

            const normalizedCategory = String(rawCategory).toLowerCase();

            const rawStatus = String(
              report.status || "reported",
            ).toLowerCase();

            const status: ReportStatus = REPORT_STATUSES.includes(
              rawStatus as ReportStatus,
            )
              ? (rawStatus as ReportStatus)
              : "reported";

            const latitude = report.latitude;
            const longitude = report.longitude;

            const location =
              report.area?.name ||
              report.location?.name ||
              (latitude != null && longitude != null
                ? `${Number(latitude).toFixed(3)}, ${Number(longitude).toFixed(3)}`
                : "Wilayah terdata");

            return {
              id: String(report.id),
              title: report.title || "Laporan tanpa judul",
              category: normalizedCategory,
              location,
              status,
              severity: String(report.severity || "medium").toLowerCase(),
              confirmationsCount: getValidNumber(
                report.confirmations_count ??
                report.confirmations?.length,
              ),
              date: report.created_at
                ? new Date(report.created_at).toLocaleDateString(
                  "id-ID",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  },
                )
                : "Tanggal tidak tersedia",
              description: report.description,
            };
          },
        );

        setReports(mappedReports);
      } else {
        failedEndpoints.push("antrean laporan");
      }

      /* System Health */

      if (
        healthRes.status === "fulfilled" &&
        healthRes.value.data?.success
      ) {
        const health = healthRes.value.data.data;
        const database = health?.components?.database;
        const storage = health?.components?.storage;

        setHealthSummary({
          status: String(health?.status || "unknown"),
          database_status:
            database?.status != null
              ? String(database.status)
              : null,
          storage_writable:
            typeof storage?.writable === "boolean"
              ? storage.writable
              : null,
        });
      } else {
        setHealthSummary(null);
        failedEndpoints.push("kesehatan server");
      }

      /* Data Quality */

      if (
        qualityRes.status === "fulfilled" &&
        qualityRes.value.data?.success
      ) {
        const quality = qualityRes.value.data.data;

        setQualitySummary({
          health_score: Math.min(
            100,
            Math.max(0, getValidNumber(quality?.health_score)),
          ),
          total_issues: Math.max(
            0,
            getValidNumber(quality?.total_issues),
          ),
          scanned_entities: {
            businesses: Math.max(
              0,
              getValidNumber(quality?.scanned_entities?.businesses),
            ),
            reports: Math.max(
              0,
              getValidNumber(quality?.scanned_entities?.reports),
            ),
          },
        });
      } else {
        setQualitySummary(null);
        failedEndpoints.push("kualitas data");
      }

      /* Sync Logs */

      if (
        syncRes.status === "fulfilled" &&
        syncRes.value.data?.success
      ) {
        const rawSync = getResponseRows(syncRes.value);

        setSyncLogs(
          rawSync.slice(0, 3).map((item: any) => ({
            id: String(item.id),
            entity_type: String(item.entity_type || "Data"),
            status: String(item.status || "unknown"),
            records_processed: getValidNumber(item.records_processed),
            started_at: item.started_at || item.created_at || "",
          })),
        );
      } else {
        setSyncLogs([]);
        failedEndpoints.push("riwayat sinkronisasi");
      }

      /* Audit Logs */

      if (
        auditRes.status === "fulfilled" &&
        auditRes.value.data?.success
      ) {
        const rawAudit = getResponseRows(auditRes.value);

        setAuditLogs(
          rawAudit.slice(0, 4).map((item: any) => ({
            id: String(item.id),
            actor: {
              name: item.actor?.name || "Sistem",
            },
            action: String(item.action || "melakukan aktivitas"),
            target_title: String(
              item.target_title || item.target_entity || "",
            ),
            timestamp: item.timestamp || item.created_at || "",
          })),
        );
      } else {
        setAuditLogs([]);
        failedEndpoints.push("jejak audit");
      }

      if (failedEndpoints.length > 0) {
        setError(
          `Sebagian data belum berhasil dimuat: ${failedEndpoints.join(", ")}. Periksa koneksi API atau coba segarkan data.`,
        );
      }
    } catch (err) {
      console.error("Gagal memuat dashboard LOCIVA:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  /* =======================================================
     UPDATE REPORT STATUS
  ======================================================= */

  const updateStatus = async (
    id: string,
    newStatus: ReportStatus,
  ) => {
    if (updatingReportId) return;

    setUpdatingReportId(id);

    try {
      const response = await api.patch(`/reports/${id}/status`, {
        status: newStatus,
      });

      if (response.data?.success) {
        setReports((previous) =>
          previous.map((report) =>
            report.id === id
              ? { ...report, status: newStatus }
              : report,
          ),
        );

        toast({
          title: "Status diperbarui",
          description: `Status laporan diubah menjadi ${getStatusLabel(newStatus)}.`,
          variant: "success",
        });

        await fetchDashboardData();
      } else {
        toast({
          title: "Status belum diperbarui",
          description:
            response.data?.message ||
            "Server tidak mengonfirmasi perubahan status.",
          variant: "error",
        });
      }
    } catch (err: any) {
      toast({
        title: "Gagal memperbarui status",
        description:
          err.response?.data?.message ||
          "Tidak dapat memperbarui status laporan.",
        variant: "error",
      });
    } finally {
      setUpdatingReportId(null);
    }
  };

  /* =======================================================
     REPORT FILTERS
  ======================================================= */

  const filteredReports = reports.filter((report) => {
    const matchesStatus =
      statusFilter === "all" || report.status === statusFilter;

    const matchesCategory =
      categoryFilter === "all" ||
      report.category === categoryFilter;

    return matchesStatus && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase().trim()) {
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

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase().trim()) {
      case "flood":
        return "#0284C7";

      case "waste":
        return "#D97706";

      case "light":
        return "#CA8A04";

      default:
        return "#DC2626";
    }
  };
  /* =======================================================
     METRIC CALCULATIONS
  ======================================================= */

  const totalReportsCount = Math.max(
    0,
    getValidNumber(metrics?.total_reports, reports.length),
  );

  const reportedCount = getValidNumber(
    metrics?.status_breakdown?.reported,
    reports.filter((report) => report.status === "reported").length,
  );

  const confirmedCount = getValidNumber(
    metrics?.status_breakdown?.confirmed,
    reports.filter((report) => report.status === "confirmed").length,
  );

  const resolvedCount = getValidNumber(
    metrics?.status_breakdown?.resolved,
    reports.filter((report) => report.status === "resolved").length,
  );

  const rejectedCount = getValidNumber(
    metrics?.status_breakdown?.rejected,
    reports.filter((report) => report.status === "rejected").length,
  );

  const lowSeverity = getValidNumber(
    metrics?.severity_breakdown?.low,
  );

  const mediumSeverity = getValidNumber(
    metrics?.severity_breakdown?.medium,
  );

  const highSeverity = getValidNumber(
    metrics?.severity_breakdown?.high,
  );

  const databaseStatus = healthSummary?.database_status;
  const databaseHealthy = isHealthyStatus(databaseStatus);
  const storageWritable = healthSummary?.storage_writable;

  const qualityScore = qualitySummary?.health_score;
  const qualityScoreColor =
    qualityScore == null
      ? "text-muted"
      : qualityScore >= 80
        ? "text-emerald-600"
        : qualityScore >= 50
          ? "text-amber-600"
          : "text-rose-600";

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="space-y-6 text-left">
      {/* PAGE HEADER */}

      <div className="flex flex-col gap-4 border-b border-[#f0f0f8] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-6 w-1 rounded-full bg-primary" />

            <h1 className="font-display text-[22px] font-semibold tracking-tight text-ink sm:text-[24px]">
              Dashboard Overview
            </h1>
          </div>

          <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-muted">
            Telemetri operasional spasial, antrean verifikasi
            lapangan, dan kesehatan infrastruktur LOCIVA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10.5px] font-medium text-muted">
            <span
              className={`h-2 w-2 rounded-full ${loading
                ? "animate-pulse bg-amber-400"
                : error
                  ? "bg-rose-500"
                  : "bg-emerald-500"
                }`}
            />

            {loading
              ? "Memuat data"
              : error
                ? "Sebagian data bermasalah"
                : "Data tersinkronisasi"}
          </span>

          <button
            type="button"
            onClick={() => void fetchDashboardData()}
            disabled={loading}
            className="clay-press inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-2 text-[11.5px] font-semibold text-ink transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={loading ? "animate-spin text-primary" : ""}
            />

            Segarkan data
          </button>
        </div>
      </div>

      {/* API ERROR */}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[12px] border border-amber-200 bg-amber-50 p-3.5 text-[12px] text-amber-800"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />

          <div>
            <p className="font-semibold">Sebagian data belum tersedia</p>
            <p className="mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* KPI CARDS */}

      <section aria-label="Ringkasan metrik utama">
        <div className="mb-3 flex items-center gap-2">
          <Activity size={15} className="text-primary" />

          <h2 className="text-[12px] font-semibold text-ink">
            Ringkasan operasional
          </h2>

          <span className="text-[10.5px] text-muted">
            · metrik utama
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total laporan civic"
            value={formatNumber(totalReportsCount)}
            description={`${formatNumber(confirmedCount)} terverifikasi · ${formatNumber(reportedCount)} menunggu`}
            icon={<AlertTriangle size={16} />}
            iconClass="text-amber-600"
            iconBackground="bg-amber-50 group-hover:bg-amber-100"
          />

          <MetricCard
            label="Konfirmasi warga"
            value={
              metrics
                ? formatNumber(metrics.total_confirmations)
                : formatNumber(
                  reports.reduce(
                    (sum, report) =>
                      sum + report.confirmationsCount,
                    0,
                  ),
                )
            }
            description="Konfirmasi kondisi faktual lapangan"
            icon={<CheckCircle2 size={16} />}
            iconClass="text-emerald-600"
            iconBackground="bg-emerald-50 group-hover:bg-emerald-100"
          />

          <MetricCard
            label="Titik usaha terdaftar"
            value={formatNumber(metrics?.total_businesses)}
            description={
              metrics
                ? `${formatNumber(metrics.user_businesses)} UMKM pengguna · ${formatNumber(metrics.demo_businesses)} data demo`
                : "Data usaha belum tersedia"
            }
            icon={<Store size={16} />}
            iconClass="text-primary"
            iconBackground="bg-blue-50 group-hover:bg-blue-100"
          />

          <MetricCard
            label="Rata-rata potensi koridor"
            value={
              metrics?.avg_district_potential != null
                ? Number(metrics.avg_district_potential).toLocaleString(
                  "id-ID",
                  { maximumFractionDigits: 2 },
                )
                : "—"
            }
            description={
              metrics?.avg_district_potential != null
                ? "Rata-rata skor analitik koridor"
                : "Belum ada nilai potensi tersedia"
            }
            icon={<TrendingUp size={16} />}
            iconClass="text-violet-600"
            iconBackground="bg-violet-50 group-hover:bg-violet-100"
          />
        </div>
      </section>

      {/* MAIN GRID */}

      <div className="grid gap-5 lg:grid-cols-12">
        {/* LEFT COLUMN */}

        <div className="min-w-0 space-y-5 lg:col-span-7">
          {/* ANALYTICS */}

          <section className="clay space-y-5 rounded-[16px] border border-[#f0f0f8] bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 border-b border-[#f0f0f8] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-primary-soft text-primary">
                    <TrendingUp size={16} />
                  </div>

                  <h2 className="font-display text-[15px] font-semibold text-ink">
                    Analitik laporan civic
                  </h2>
                </div>

                <p className="mt-1.5 text-[11.5px] text-muted">
                  Distribusi status penanganan dan tingkat keparahan
                  laporan.
                </p>
              </div>

              <span className="w-fit rounded-full border border-[#e5e5f0] bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-muted">
                Distribusi data
              </span>
            </div>

            {/* STATUS DONUT */}

            <div>
              <div className="mb-4">
                <h3 className="text-[12.5px] font-semibold text-ink">
                  Status penanganan
                </h3>

                <p className="mt-0.5 text-[11px] text-muted">
                  Perbandingan laporan pada setiap tahap penanganan.
                </p>
              </div>

              <StatusDonutChart
                values={{
                  reported: reportedCount,
                  confirmed: confirmedCount,
                  resolved: resolvedCount,
                  rejected: rejectedCount,
                }}
                total={totalReportsCount}
              />
            </div>

            <div className="border-t border-[#f0f0f8]" />

            {/* SEVERITY BARS */}

            <div>
              <div className="mb-4">
                <h3 className="text-[12.5px] font-semibold text-ink">
                  Tingkat keparahan
                </h3>

                <p className="mt-0.5 text-[11px] text-muted">
                  Distribusi urgensi permasalahan di lapangan.
                </p>
              </div>

              <SeverityBarChart
                low={lowSeverity}
                medium={mediumSeverity}
                high={highSeverity}
              />
            </div>

            <div className="flex items-start gap-2.5 rounded-[10px] border border-blue-100 bg-blue-50/60 p-3">
              <Activity
                size={14}
                className="mt-0.5 shrink-0 text-primary"
              />

              <p className="text-[10.5px] leading-relaxed text-slate-600">
                Gunakan distribusi ini untuk membantu menentukan
                prioritas moderasi. Laporan dengan tingkat keparahan
                tinggi perlu mendapat perhatian lebih, sedangkan
                status penanganan tetap ditentukan melalui proses
                verifikasi.
              </p>
            </div>
          </section>

          {/* MODERATION QUEUE */}

          <section className="clay rounded-[16px] border border-[#f0f0f8] bg-white p-4 sm:p-5">
            <PanelHeader
              title="Antrean moderasi lapangan"
              description="Tinjau laporan kondisi fisik sebelum memengaruhi hasil analitik."
              action={
                <Link
                  to="/admin/reports"
                  className="clay-press inline-flex w-fit shrink-0 items-center gap-1.5 rounded-[8px] border border-[#e5e5f0] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-primary no-underline transition-colors hover:bg-blue-50"
                >
                  Semua laporan
                  <ArrowRight size={12} />
                </Link>
              }
            />

            {/* FILTERS */}

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="min-w-0">
                <span className="mb-1 block text-[10.5px] font-medium text-muted">
                  Status laporan
                </span>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="w-full cursor-pointer rounded-[9px] border border-[#e5e5f0] bg-white px-3 py-2 text-[11.5px] text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">Semua status</option>
                  <option value="reported">Menunggu</option>
                  <option value="confirmed">Terverifikasi</option>
                  <option value="resolved">Selesai</option>
                  <option value="rejected">Ditolak</option>
                </select>
              </label>

              <label className="min-w-0">
                <span className="mb-1 block text-[10.5px] font-medium text-muted">
                  Kategori laporan
                </span>

                <select
                  value={categoryFilter}
                  onChange={(event) =>
                    setCategoryFilter(event.target.value)
                  }
                  className="w-full cursor-pointer rounded-[9px] border border-[#e5e5f0] bg-white px-3 py-2 text-[11.5px] text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">Semua kategori</option>
                  <option value="road">Jalan rusak</option>
                  <option value="flood">Banjir</option>
                  <option value="waste">Sampah</option>
                  <option value="light">Lampu jalan</option>
                </select>
              </label>
            </div>

            {/* REPORT LIST */}

            <div className="mt-4 space-y-2.5">
              {loading && reports.length === 0 ? (
                <div className="py-10 text-center text-muted">
                  <Spinner
                    size="md"
                    className="mx-auto mb-2 text-primary"
                  />

                  <p className="text-[12px]">
                    Menghubungkan ke basis data laporan...
                  </p>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-slate-200 px-4 py-10 text-center">
                  <AlertCircle
                    size={21}
                    className="mx-auto mb-2 text-slate-300"
                  />

                  <p className="text-[12.5px] font-semibold text-ink">
                    Tidak ada laporan ditemukan
                  </p>

                  <p className="mt-1 text-[11px] text-muted">
                    Coba ubah filter status atau kategori.
                  </p>
                </div>
              ) : (
                filteredReports.slice(0, 8).map((report) => (
                  <article
                    key={report.id}
                    className="rounded-[12px] border border-[#f0f0f8] bg-white p-3 transition-colors hover:border-blue-100 hover:bg-slate-50/50"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]"
                        style={{
                          backgroundColor: getCategoryColor(
                            report.category,
                          ),
                        }}
                      >
                        {getCategoryIcon(report.category)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="max-w-full break-words text-[12.5px] font-semibold text-ink">
                            {report.title}
                          </h3>

                          <span
                            className={`rounded-full border px-2 py-0.5 text-[9.5px] font-semibold ${STATUS_BADGES[report.status]}`}
                          >
                            {getStatusLabel(report.status)}
                          </span>
                        </div>

                        <p className="mt-1.5 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-muted">
                          <MapPin
                            size={11}
                            className="mt-0.5 shrink-0 text-primary"
                          />

                          <span className="min-w-0 break-words">
                            {report.location}
                          </span>
                        </p>

                        <p className="mt-1 text-[10px] text-slate-400">
                          {report.date}
                          {" · "}
                          {formatNumber(report.confirmationsCount)}{" "}
                          konfirmasi
                        </p>
                      </div>
                    </div>

                    {/* STATUS ACTIONS */}

                    <div className="mt-3 border-t border-[#f0f0f8] pt-2.5">
                      <p className="mb-2 text-[10px] font-medium text-muted">
                        Ubah status laporan
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {REPORT_STATUSES.map((status) => {
                          const isCurrent = status === report.status;
                          const isUpdating =
                            updatingReportId === report.id;

                          return (
                            <button
                              key={status}
                              type="button"
                              disabled={
                                isCurrent ||
                                updatingReportId !== null
                              }
                              onClick={() =>
                                void updateStatus(report.id, status)
                              }
                              className={`rounded-[7px] border px-2 py-1 text-[10px] font-medium transition-all ${isCurrent
                                ? `${STATUS_BADGES[status]} cursor-default`
                                : "border-[#e5e5f0] bg-white text-muted hover:border-blue-200 hover:bg-blue-50 hover:text-primary"
                                } disabled:cursor-not-allowed disabled:opacity-70`}
                              aria-label={`Ubah status laporan ${report.title} menjadi ${getStatusLabel(status)}`}
                            >
                              {isUpdating && !isCurrent
                                ? "Memproses..."
                                : getStatusLabel(status)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#f0f0f8] pt-3">
              <p className="text-[10.5px] text-muted">
                Menampilkan maksimal 5 dari {formatNumber(filteredReports.length)} laporan
                pada data yang dimuat.
              </p>

              <Link
                to="/admin/reports"
                className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-semibold text-primary no-underline hover:underline"
              >
                Buka antrean
                <ArrowRight size={11} />
              </Link>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN */}

        <aside className="min-w-0 space-y-5 lg:col-span-5">
          {/* DATA QUALITY AND HEALTH */}

          <section className="clay space-y-4 rounded-[16px] border border-[#f0f0f8] bg-white p-4 sm:p-5">
            <PanelHeader
              title="Integritas data & server"
              description="Kualitas data spasial dan status infrastruktur."
              action={
                <Link
                  to="/admin/data-quality"
                  className="text-[11px] font-semibold text-primary no-underline hover:underline"
                >
                  Detail →
                </Link>
              }
            />

            {/* QUALITY SCORE */}

            <div className="rounded-[12px] border border-slate-100 bg-slate-50 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11.5px] font-medium text-ink">
                  Skor kualitas spasial
                </span>

                <span
                  className={`font-display text-[17px] font-semibold ${qualityScoreColor}`}
                >
                  {qualityScore != null
                    ? `${qualityScore}/100`
                    : "—"}
                </span>
              </div>

              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
                role="progressbar"
                aria-label="Skor kualitas data"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={qualityScore ?? 0}
              >
                <div
                  className={`h-full rounded-full transition-all duration-700 ${qualityScore == null
                    ? "bg-slate-300"
                    : qualityScore >= 80
                      ? "bg-emerald-500"
                      : qualityScore >= 50
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                  style={{
                    width: `${qualityScore ?? 0}%`,
                  }}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted">
                    Bisnis terpindai
                  </p>

                  <p className="mt-0.5 text-[12px] font-semibold text-ink">
                    {qualitySummary
                      ? formatNumber(
                        qualitySummary.scanned_entities.businesses,
                      )
                      : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-muted">
                    Laporan terpindai
                  </p>

                  <p className="mt-0.5 text-[12px] font-semibold text-ink">
                    {qualitySummary
                      ? formatNumber(
                        qualitySummary.scanned_entities.reports,
                      )
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-200 pt-2.5">
                {qualitySummary ? (
                  <div
                    className={`flex items-center gap-1.5 text-[10.5px] font-medium ${qualitySummary.total_issues === 0
                      ? "text-emerald-700"
                      : "text-amber-700"
                      }`}
                  >
                    {qualitySummary.total_issues === 0 ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <AlertTriangle size={12} />
                    )}

                    {qualitySummary.total_issues === 0
                      ? "Tidak ditemukan anomali"
                      : `${formatNumber(qualitySummary.total_issues)} masalah perlu ditinjau`}
                  </div>
                ) : (
                  <p className="text-[10.5px] text-muted">
                    Informasi kualitas data belum tersedia.
                  </p>
                )}
              </div>
            </div>

            {/* SERVER INDICATORS */}

            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-ink">
                Status infrastruktur
              </p>

              {/* DATABASE */}

              <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#f0f0f8] bg-white p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-blue-50 text-primary">
                    <Database size={14} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11.5px] font-semibold text-ink">
                      Database
                    </p>

                    <p className="text-[10px] text-muted">
                      Koneksi basis data
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold ${databaseStatus == null
                    ? "border-slate-200 bg-slate-50 text-slate-500"
                    : databaseHealthy
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${databaseStatus == null
                      ? "bg-slate-400"
                      : databaseHealthy
                        ? "bg-emerald-500"
                        : "bg-rose-500"
                      }`}
                  />

                  {databaseStatus == null
                    ? "Tidak diketahui"
                    : databaseStatus}
                </span>
              </div>

              {/* STORAGE */}

              <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#f0f0f8] bg-white p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-violet-50 text-violet-600">
                    <Activity size={14} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11.5px] font-semibold text-ink">
                      Penyimpanan
                    </p>

                    <p className="text-[10px] text-muted">
                      Hak akses penulisan
                    </p>
                  </div>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold ${storageWritable == null
                    ? "border-slate-200 bg-slate-50 text-slate-500"
                    : storageWritable
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${storageWritable == null
                      ? "bg-slate-400"
                      : storageWritable
                        ? "bg-emerald-500"
                        : "bg-rose-500"
                      }`}
                  />

                  {storageWritable == null
                    ? "Tidak diketahui"
                    : storageWritable
                      ? "Dapat ditulis"
                      : "Tidak dapat ditulis"}
                </span>
              </div>
            </div>
          </section>

          {/* DATA SYNC */}

          <section className="clay space-y-3 rounded-[16px] border border-[#f0f0f8] bg-white p-4 sm:p-5">
            <PanelHeader
              title="Sinkronisasi sumber data"
              description="Riwayat pembaruan dan pemrosesan data."
              action={
                <Link
                  to="/admin/data-sources"
                  className="shrink-0 text-[11px] font-semibold text-primary no-underline hover:underline"
                >
                  Kelola →
                </Link>
              }
            />

            <div className="space-y-2">
              {syncLogs.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-slate-200 px-3 py-6 text-center">
                  <Database
                    size={19}
                    className="mx-auto mb-2 text-slate-300"
                  />

                  <p className="text-[11.5px] font-medium text-ink">
                    Belum ada riwayat sinkronisasi
                  </p>

                  <p className="mt-1 text-[10px] text-muted">
                    Catatan operasi akan ditampilkan di sini.
                  </p>
                </div>
              ) : (
                syncLogs.map((log) => {
                  const successful =
                    log.status.toLowerCase() === "success" ||
                    log.status.toLowerCase() === "completed";

                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-3 rounded-[10px] border border-[#f0f0f8] bg-slate-50/70 p-3"
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-white text-primary">
                          <RefreshCw size={12} />
                        </div>

                        <div className="min-w-0">
                          <p className="break-words text-[11.5px] font-semibold text-ink">
                            {log.entity_type}
                          </p>

                          <p className="mt-0.5 text-[10px] text-muted">
                            {formatNumber(log.records_processed)} baris
                            diproses
                          </p>

                          {log.started_at && (
                            <p className="mt-1 text-[9.5px] text-slate-400">
                              {new Date(
                                log.started_at,
                              ).toLocaleString("id-ID", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[9.5px] font-semibold ${successful
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* AUDIT LOGS */}

          <section className="clay space-y-3 rounded-[16px] border border-[#f0f0f8] bg-white p-4 sm:p-5">
            <PanelHeader
              title="Jejak audit terkini"
              description="Aktivitas admin dan perubahan sistem."
              action={
                <Link
                  to="/admin/system-health"
                  className="shrink-0 text-[11px] font-semibold text-primary no-underline hover:underline"
                >
                  Riwayat →
                </Link>
              }
            />

            <div className="space-y-2">
              {auditLogs.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-slate-200 px-3 py-6 text-center">
                  <History
                    size={19}
                    className="mx-auto mb-2 text-slate-300"
                  />

                  <p className="text-[11.5px] font-medium text-ink">
                    Belum ada catatan audit
                  </p>

                  <p className="mt-1 text-[10px] text-muted">
                    Aktivitas terbaru akan ditampilkan di sini.
                  </p>
                </div>
              ) : (
                auditLogs.map((log) => (
                  <article
                    key={log.id}
                    className="flex items-start gap-2.5 rounded-[10px] border border-[#f0f0f8] bg-white p-3 transition-colors hover:bg-slate-50/60"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-primary-soft text-primary">
                      <History size={14} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[11.5px] leading-relaxed text-ink">
                        <span className="font-semibold">
                          {log.actor.name}
                        </span>

                        {log.action && (
                          <span className="text-muted">
                            {" "}
                            {log.action}
                          </span>
                        )}

                        {log.target_title && (
                          <span className="font-medium text-ink">
                            {" "}
                            {log.target_title}
                          </span>
                        )}
                      </p>

                      <p className="mt-1.5 text-[10px] text-slate-400">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )
                          : "Waktu tidak tersedia"}
                      </p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
