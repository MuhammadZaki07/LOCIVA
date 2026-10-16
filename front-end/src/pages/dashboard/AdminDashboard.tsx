import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  Sliders,
  ArrowRight,
  ShieldCheck,
  Database,
  HardDrive,
  Cpu,
  Activity,
  Calendar,
  Layers,
  Search,
  ExternalLink,
  Users,
} from "lucide-react";
import api from "@/context/apiClient";
import { useToast } from "@/components/ui/Toast";

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

export interface DataQualityIssue {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  affected_count: number;
  source_entity: string;
  recommendation: string;
}

export interface DataQualityData {
  health_score: number;
  total_issues: number;
  issues: DataQualityIssue[];
  scanned_entities: {
    businesses: number;
    reports: number;
    areas: number;
    business_types: number;
  };
  last_scanned_at: string;
}

export interface DataSourceItem {
  id: string;
  name: string;
  type: string;
  website: string | null;
  license: string | null;
  description: string | null;
  last_synced_at: string | null;
  latest_sync_log?: {
    status: string;
    records_processed: number;
    started_at: string;
    finished_at: string;
  } | null;
}

export interface DataSyncLogItem {
  id: string;
  data_source?: {
    id: string;
    name: string;
    type: string;
  };
  entity_type: string;
  status: string;
  records_processed: number;
  error_message?: string | null;
  started_at: string;
  finished_at?: string | null;
}

export interface SystemHealthData {
  status: "healthy" | "degraded" | "error";
  components: {
    database?: {
      status: string;
      latency_ms?: number;
      driver?: string;
      message?: string;
    };
    storage?: {
      status: string;
      disk?: string;
      writable?: boolean;
      message?: string;
    };
    cache?: {
      status: string;
      driver?: string;
      message?: string;
    };
  };
  server: {
    php_version: string;
    laravel_version: string;
    server_time: string;
    timezone: string;
    memory_usage_mb: number;
  };
}

export interface AuditLogItem {
  id: string;
  actor: {
    id?: string;
    name: string;
    email?: string;
  };
  action: string;
  target_entity: string;
  target_id: string;
  target_title: string;
  category?: string;
  note: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as "overview" | "quality" | "sources" | "health") || "overview";

  const { toast } = useToast();

  // Metrics & Reports state
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [reports, setReports] = useState<CivicReportItem[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [errorMetrics, setErrorMetrics] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Data Quality state
  const [qualityData, setQualityData] = useState<DataQualityData | null>(null);
  const [loadingQuality, setLoadingQuality] = useState(false);

  // Data Sources state
  const [dataSources, setDataSources] = useState<DataSourceItem[]>([]);
  const [syncLogs, setSyncLogs] = useState<DataSyncLogItem[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);

  // System Health & Audit state
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const setTab = (tab: "overview" | "quality" | "sources" | "health") => {
    setSearchParams(tab === "overview" ? {} : { tab });
  };

  // 1. Fetch Overview & Metrics
  const fetchOverview = useCallback(async () => {
    setLoadingMetrics(true);
    setErrorMetrics(null);
    try {
      const [metricsRes, reportsRes] = await Promise.all([
        api.get("/admin/metrics"),
        api.get("/reports", { params: { per_page: 50 } }),
      ]);

      if (metricsRes.data?.success) {
        setMetrics(metricsRes.data.data);
      }

      if (reportsRes.data?.success && reportsRes.data?.data) {
        const rawReports = Array.isArray(reportsRes.data.data.data)
          ? reportsRes.data.data.data
          : Array.isArray(reportsRes.data.data)
          ? reportsRes.data.data
          : [];

        const mapped: CivicReportItem[] = rawReports.map((r: any) => ({
          id: String(r.id),
          title: r.title,
          category: r.category?.slug || r.category?.name || "road",
          location: r.area?.name || (r.latitude != null && r.longitude != null ? `${Number(r.latitude).toFixed(3)}, ${Number(r.longitude).toFixed(3)}` : "Wilayah"),
          status: (r.status as ReportStatus) || "reported",
          severity: r.severity || "medium",
          confirmationsCount: r.confirmations_count || r.confirmations?.length || 0,
          date: r.created_at ? new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Baru",
          description: r.description,
        }));

        setReports(mapped);
      }
    } catch (err: any) {
      console.warn("Gagal mengambil data metrik admin:", err);
      setErrorMetrics("Gagal memuat telemetri metrik dari server.");
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // 2. Fetch Data Quality
  const fetchQuality = useCallback(async () => {
    setLoadingQuality(true);
    try {
      const res = await api.get("/admin/data-quality");
      if (res.data?.success) {
        setQualityData(res.data.data);
      }
    } catch (err: any) {
      toast({
        title: "Gagal Memindai Integritas Data",
        description: err.response?.data?.message || "Tidak dapat memuat modul Data Quality.",
        variant: "error",
      });
    } finally {
      setLoadingQuality(false);
    }
  }, [toast]);

  // 3. Fetch Data Sources & Sync Logs
  const fetchSources = useCallback(async () => {
    setLoadingSources(true);
    try {
      const [sourcesRes, logsRes] = await Promise.all([
        api.get("/admin/data-sources"),
        api.get("/admin/data-sync-logs"),
      ]);
      if (sourcesRes.data?.success) {
        setDataSources(sourcesRes.data.data);
      }
      if (logsRes.data?.success) {
        setSyncLogs(logsRes.data.data.data || []);
      }
    } catch (err: any) {
      toast({
        title: "Gagal Memuat Data Sources",
        description: err.response?.data?.message || "Tidak dapat memuat sumber data eksternal.",
        variant: "error",
      });
    } finally {
      setLoadingSources(false);
    }
  }, [toast]);

  // 4. Fetch System Health & Audit Logs
  const fetchHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const [healthRes, auditRes] = await Promise.all([
        api.get("/admin/system-health"),
        api.get("/admin/audit-logs"),
      ]);
      if (healthRes.data?.success) {
        setHealthData(healthRes.data.data);
      }
      if (auditRes.data?.success) {
        setAuditLogs(auditRes.data.data.data || []);
      }
    } catch (err: any) {
      toast({
        title: "Gagal Memuat Health System",
        description: err.response?.data?.message || "Gagal menghubungi telemetry kesehatan server.",
        variant: "error",
      });
    } finally {
      setLoadingHealth(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === "overview") fetchOverview();
    else if (activeTab === "quality") fetchQuality();
    else if (activeTab === "sources") fetchSources();
    else if (activeTab === "health") fetchHealth();
  }, [activeTab, fetchOverview, fetchQuality, fetchSources, fetchHealth]);

  // Trigger sync for a source
  const handleTriggerSync = async (sourceId: string) => {
    setSyncingSourceId(sourceId);
    try {
      const res = await api.post(`/admin/data-sources/${sourceId}/sync`);
      if (res.data?.success) {
        toast({
          title: "Sinkronisasi Berhasil",
          description: res.data.message || "Data berhasil disinkronkan ke basis data lokal.",
          variant: "success",
        });
        fetchSources();
      }
    } catch (err: any) {
      toast({
        title: "Sinkronisasi Gagal",
        description: err.response?.data?.message || "Terjadi kesalahan saat menyinkronkan data.",
        variant: "error",
      });
    } finally {
      setSyncingSourceId(null);
    }
  };

  // Status modifier for admin
  const updateStatus = async (id: string, newStatus: ReportStatus) => {
    try {
      const res = await api.patch(`/reports/${id}/status`, { status: newStatus });
      if (res.data?.success) {
        setReports((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
        );
        toast({
          title: "Status Diperbarui",
          description: `Status laporan diubah menjadi ${newStatus}.`,
          variant: "success",
        });
        fetchOverview();
      }
    } catch (err: any) {
      toast({
        title: "Gagal Memperbarui Status",
        description: err.response?.data?.message || "Tidak dapat memperbarui status laporan.",
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
      case "road":
      default:
        return <AlertTriangle size={13} className="text-white" />;
    }
  };

  const reportStatuses: ReportStatus[] = ["reported", "confirmed", "resolved", "rejected"];

  const getToneColor = (category: string) => {
    switch (category) {
      case "flood": return "linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)";
      case "waste": return "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
      case "light": return "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)";
      default: return "linear-gradient(135deg, #f87171 0%, #dc2626 100%)";
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title & Intro */}
      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-[26px] font-medium tracking-tight text-ink sm:text-[30px]">
              Civic Analytics & Moderation Desk
            </h1>
            <p className="mt-1 text-[13.5px] text-muted">
              Live location telemetry, ground condition signals verification, and production system controls.
            </p>
          </div>
          <span className="w-fit flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[12px] font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            live production telemetry
          </span>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setTab("overview")}
          className={`px-4 py-2 text-[13px] font-medium rounded-xl transition-all cursor-pointer ${
            activeTab === "overview"
              ? "clay-primary text-white shadow-sm"
              : "text-muted hover:text-ink hover:bg-slate-100"
          }`}
        >
          Ringkasan & Moderasi Cepat
        </button>

        <button
          type="button"
          onClick={() => setTab("quality")}
          className={`px-4 py-2 text-[13px] font-medium rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "quality"
              ? "clay-primary text-white shadow-sm"
              : "text-muted hover:text-ink hover:bg-slate-100"
          }`}
        >
          <CheckCircle2 size={15} />
          Data Quality Center
        </button>

        <button
          type="button"
          onClick={() => setTab("sources")}
          className={`px-4 py-2 text-[13px] font-medium rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "sources"
              ? "clay-primary text-white shadow-sm"
              : "text-muted hover:text-ink hover:bg-slate-100"
          }`}
        >
          <RefreshCw size={15} />
          Data Sources & Sinkronisasi
        </button>

        <button
          type="button"
          onClick={() => setTab("health")}
          className={`px-4 py-2 text-[13px] font-medium rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "health"
              ? "clay-primary text-white shadow-sm"
              : "text-muted hover:text-ink hover:bg-slate-100"
          }`}
        >
          <Activity size={15} />
          System Health & Audit Logs
        </button>
      </div>

      {/* TAB 1: OVERVIEW & QUICK MODERATION */}
      {activeTab === "overview" && (
        <>
          {/* KPI Stats Strip */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="clay clay-lift rounded-[16px] p-5">
              <div className="flex items-center justify-between text-muted">
                <span className="text-[12px] font-medium">total civic signals</span>
                <AlertTriangle size={16} className="text-warning" />
              </div>
              <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
                {metrics ? metrics.total_reports : reports.length}
              </p>
              <p className="mt-2 text-[11.5px] text-muted">
                <span className="font-medium text-potential">
                  {metrics?.status_breakdown?.confirmed ?? 0} confirmed · {metrics?.status_breakdown?.reported ?? 0} new
                </span>
              </p>
            </div>

            <div className="clay clay-lift rounded-[16px] p-5">
              <div className="flex items-center justify-between text-muted">
                <span className="text-[12px] font-medium">neighbor confirmations</span>
                <CheckCircle2 size={16} className="text-potential" />
              </div>
              <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
                {metrics ? metrics.total_confirmations : reports.reduce((acc, r) => acc + r.confirmationsCount, 0)}
              </p>
              <p className="mt-2 text-[11.5px] text-muted">
                total ground verifications
              </p>
            </div>

            <div className="clay clay-lift rounded-[16px] p-5">
              <div className="flex items-center justify-between text-muted">
                <span className="text-[12px] font-medium">registered businesses</span>
                <Store size={16} className="text-primary" />
              </div>
              <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
                {metrics ? metrics.total_businesses : 0}
              </p>
              <p className="mt-2 text-[11.5px] text-muted">
                {metrics ? `${metrics.user_businesses} UMKM · ${metrics.demo_businesses} demo` : "monitored commercial points"}
              </p>
            </div>

            <div className="clay clay-lift rounded-[16px] p-5">
              <div className="flex items-center justify-between text-muted">
                <span className="text-[12px] font-medium">avg district potential</span>
                <TrendingUp size={16} className="text-primary" />
              </div>
              <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
                {metrics?.avg_district_potential !== null && metrics?.avg_district_potential !== undefined
                  ? `${metrics.avg_district_potential}`
                  : "76.5"}
              </p>
              <p className="mt-2 text-[11.5px] text-muted">
                {metrics?.avg_district_potential !== null ? "real simulation average" : "baseline model estimate"}
              </p>
            </div>
          </div>

          {/* Quick Navigation Hub */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              to="/admin/reports"
              className="clay clay-lift group flex items-center justify-between rounded-[18px] p-5 transition-all no-underline hover:border-primary/40"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-colors group-hover:bg-primary group-hover:text-white">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-display text-[16px] font-bold text-ink group-hover:text-primary">
                    Portal Moderasi Civic Reports
                  </h3>
                  <p className="mt-0.5 text-[12px] text-muted">
                    Tinjau foto bukti laporan warga, verifikasi kondisi lapangan, & periksa riwayat audit.
                  </p>
                </div>
              </div>
              <ArrowRight size={18} className="text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>

            <Link
              to="/admin/business-types"
              className="clay clay-lift group flex items-center justify-between rounded-[18px] p-5 transition-all no-underline hover:border-primary/40"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <Sliders size={24} />
                </div>
                <div>
                  <h3 className="font-display text-[16px] font-bold text-ink group-hover:text-primary">
                    Manajemen Katalog & Bobot Usaha
                  </h3>
                  <p className="mt-0.5 text-[12px] text-muted">
                    Konfigurasi parameter pembobotan faktor spasial (kampus, pasar, transit) untuk skoring analitik.
                  </p>
                </div>
              </div>
              <ArrowRight size={18} className="text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          </div>

          {/* Main Civic Signals Stream */}
          <div className="clay rounded-[20px] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f0f8] pb-5">
              <div>
                <h2 className="font-display text-[20px] font-medium text-ink">
                  Antrean Moderasi Lapangan
                </h2>
                <p className="mt-1 text-[12.5px] text-muted">
                  Periksa kondisi faktual yang dilaporkan warga sebelum memengaruhi kalkulasi potensi koridor bisnis.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-1.5 text-[12px] font-medium text-ink outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">Semua Status</option>
                  <option value="reported">Dilaporkan (Baru)</option>
                  <option value="confirmed">Dikonfirmasi Warga</option>
                  <option value="resolved">Selesai / Diperbaiki</option>
                  <option value="rejected">Ditolak</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-1.5 text-[12px] font-medium text-ink outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">Semua Kategori</option>
                  <option value="road">Jalan Rusak</option>
                  <option value="flood">Genangan / Banjir</option>
                  <option value="waste">Tumpukan Sampah</option>
                  <option value="light">Penerangan Jalan</option>
                </select>

                <button
                  type="button"
                  onClick={fetchOverview}
                  className="clay-press rounded-[10px] border border-[#e5e5f0] bg-white p-2 text-muted hover:text-ink cursor-pointer"
                  title="Segarkan data"
                >
                  <RefreshCw size={13} className={loadingMetrics ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* Reports List */}
            <div className="mt-5 space-y-3">
              {loadingMetrics ? (
                <div className="py-12 text-center text-muted">
                  <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-primary" />
                  <p className="text-[13px]">Menghubungkan ke basis data laporan civic...</p>
                </div>
              ) : errorMetrics ? (
                <div className="flex items-center gap-2 rounded-[14px] bg-red-50 p-4 text-[13px] text-red-600 border border-red-100">
                  <AlertCircle size={16} />
                  <span>{errorMetrics}</span>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-slate-200 py-12 text-center text-muted">
                  <AlertCircle size={24} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-[14px] font-medium text-ink">Tidak ada laporan dengan filter saat ini</p>
                  <p className="mt-1 text-[12px]">Coba ganti filter status atau kategori di atas.</p>
                </div>
              ) : (
                filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="clay-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[14px] p-4 transition-all"
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] shadow-sm"
                        style={{ background: getToneColor(report.category) }}
                      >
                        {getCategoryIcon(report.category)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-[14px] font-medium text-ink">
                            {report.title}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-muted">
                            {report.category}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                              report.status === "confirmed"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : report.status === "resolved"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : report.status === "rejected"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {report.status}
                          </span>
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-[12px] text-muted">
                          <MapPin size={11} className="text-primary" />
                          <span>{report.location}</span>
                        </p>
                        {report.description && (
                          <p className="mt-1 text-[12.5px] leading-relaxed text-ink/80">
                            {report.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Lifecycle Selector */}
                    <div className="shrink-0 flex flex-col sm:items-end gap-1.5 border-t border-[#f0f0f8] pt-3 sm:border-t-0 sm:pt-0">
                      <span className="text-[11px] text-muted">update status:</span>
                      <div className="flex flex-wrap gap-1">
                        {reportStatuses.map((st) => {
                          const isCurrent = st === report.status;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => updateStatus(report.id, st)}
                              className={`clay-press rounded-[8px] px-2 py-1 text-[11px] font-medium transition-all cursor-pointer ${
                                isCurrent
                                  ? "clay-primary text-white shadow-sm"
                                  : "bg-white text-muted hover:text-ink"
                              }`}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* TAB 2: DATA QUALITY CENTER */}
      {activeTab === "quality" && (
        <div className="space-y-6">
          <div className="clay rounded-[20px] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="font-display text-[20px] font-bold text-ink">
                  Data Quality & Geo-Integrity Center
                </h2>
                <p className="mt-1 text-[13px] text-muted">
                  Pemeriksaan anomali koordinat, kelengkapan metadata spasial, dan konsistensi relasi basis data.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchQuality}
                disabled={loadingQuality}
                className="clay-primary clay-press inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-medium text-white cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={loadingQuality ? "animate-spin" : ""} />
                Pindai Ulang Integritas
              </button>
            </div>

            {loadingQuality ? (
              <div className="py-16 text-center text-muted">
                <RefreshCw size={28} className="mx-auto mb-2 animate-spin text-primary" />
                <p className="text-[13.5px]">Memindai seluruh relasi spasial dan database...</p>
              </div>
            ) : qualityData ? (
              <div className="mt-6 space-y-6">
                {/* Score Banner */}
                <div className="clay-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-5 border border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white font-display text-[22px] font-bold">
                      {qualityData.health_score}%
                    </div>
                    <div>
                      <h3 className="font-display text-[17px] font-bold text-ink">
                        Skor Integritas Data Spasial
                      </h3>
                      <p className="text-[12.5px] text-muted">
                        Ditemukan {qualityData.total_issues} kategori anomali dari total {qualityData.scanned_entities.businesses} bisnis dan {qualityData.scanned_entities.reports} laporan warga.
                      </p>
                    </div>
                  </div>

                  <span className="text-[11.5px] text-muted">
                    Dipindai: {new Date(qualityData.last_scanned_at).toLocaleTimeString("id-ID")} WIB
                  </span>
                </div>

                {/* Scanned Entities Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                    <span className="text-[11px] text-muted block">Bisnis Dipindai</span>
                    <span className="font-display text-[20px] font-bold text-ink">{qualityData.scanned_entities.businesses}</span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                    <span className="text-[11px] text-muted block">Laporan Civic</span>
                    <span className="font-display text-[20px] font-bold text-ink">{qualityData.scanned_entities.reports}</span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                    <span className="text-[11px] text-muted block">Wilayah Kecamatan</span>
                    <span className="font-display text-[20px] font-bold text-ink">{qualityData.scanned_entities.areas}</span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                    <span className="text-[11px] text-muted block">Kategori Usaha</span>
                    <span className="font-display text-[20px] font-bold text-ink">{qualityData.scanned_entities.business_types}</span>
                  </div>
                </div>

                {/* Issues List */}
                <div className="space-y-3">
                  <h3 className="font-display text-[15px] font-bold text-ink">
                    Temuan Kualitas Data Aktual
                  </h3>

                  {qualityData.issues.length === 0 ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-800">
                      <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-600" />
                      <p className="font-bold text-[14px]">Seluruh Data Memenuhi Standar Integritas</p>
                      <p className="text-[12px] mt-1 text-emerald-700">Tidak ada koordinat rusak, field kosong esensial, maupun relasi yatim yang terdeteksi.</p>
                    </div>
                  ) : (
                    qualityData.issues.map((issue) => (
                      <div
                        key={issue.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase ${
                                issue.severity === "high"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : issue.severity === "medium"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {issue.severity} priority
                            </span>
                            <span className="font-bold text-[14px] text-ink">{issue.title}</span>
                          </div>
                          <span className="text-[12px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                            {issue.affected_count} entitas terdampak
                          </span>
                        </div>
                        <p className="text-[12.5px] text-slate-600 leading-relaxed">
                          {issue.description}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-primary bg-primary-soft/40 p-2 rounded-lg">
                          <Lightbulb size={13} className="shrink-0" />
                          <span>Rekomendasi tindakan: {issue.recommendation}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 3: DATA SOURCES & SYNCHRONIZATION */}
      {activeTab === "sources" && (
        <div className="space-y-6">
          <div className="clay rounded-[20px] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="font-display text-[20px] font-bold text-ink">
                  Sumber Data Eksternal & Riwayat Sinkronisasi
                </h2>
                <p className="mt-1 text-[13px] text-muted">
                  Kendali data OpenStreetMap Overpass, BPS kependudukan, dan feed telemetri lapangan.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchSources}
                disabled={loadingSources}
                className="clay-soft clay-press inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-medium text-ink cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={loadingSources ? "animate-spin" : ""} />
                Segarkan Status
              </button>
            </div>

            {loadingSources ? (
              <div className="py-16 text-center text-muted">
                <RefreshCw size={28} className="mx-auto mb-2 animate-spin text-primary" />
                <p className="text-[13.5px]">Memuat status sumber data...</p>
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                {/* Sources Cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {dataSources.map((source) => (
                    <div
                      key={source.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium uppercase text-slate-700">
                            {source.type}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        </div>
                        <h3 className="font-display text-[15px] font-bold text-ink mt-3">
                          {source.name}
                        </h3>
                        <p className="text-[12px] text-muted mt-1 leading-relaxed line-clamp-2">
                          {source.description}
                        </p>
                        {source.website && (
                          <a
                            href={source.website}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-2 font-medium"
                          >
                            <span>Kunjungi Sumber</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between">
                        <div className="text-[11px] text-muted">
                          <span>Terakhir sinkron:</span>
                          <p className="font-medium text-slate-700 mt-0.5">
                            {source.last_synced_at
                              ? new Date(source.last_synced_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                              : "Belum pernah"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleTriggerSync(source.id)}
                          disabled={syncingSourceId === source.id}
                          className="clay-primary clay-press inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw size={12} className={syncingSourceId === source.id ? "animate-spin" : ""} />
                          {syncingSourceId === source.id ? "Sinkronisasi..." : "Sinkronkan"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sync History Table */}
                <div className="space-y-3">
                  <h3 className="font-display text-[16px] font-bold text-ink">
                    Log Sinkronisasi Terbaru
                  </h3>

                  {syncLogs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-muted">
                      <p className="text-[13px]">Belum ada riwayat log sinkronisasi.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-[12px]">
                        <thead className="bg-slate-50 text-muted border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-4 font-medium">Sumber Data</th>
                            <th className="py-2.5 px-4 font-medium">Status</th>
                            <th className="py-2.5 px-4 font-medium">Data Diproses</th>
                            <th className="py-2.5 px-4 font-medium">Waktu Mulai</th>
                            <th className="py-2.5 px-4 font-medium">Selesai</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {syncLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4 font-medium text-ink">
                                {log.data_source?.name || log.entity_type}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                    log.status === "completed"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : log.status === "running"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "bg-red-50 text-red-700 border border-red-200"
                                  }`}
                                >
                                  {log.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-700">
                                {log.records_processed} entitas
                              </td>
                              <td className="py-3 px-4 text-muted">
                                {new Date(log.started_at).toLocaleString("id-ID")}
                              </td>
                              <td className="py-3 px-4 text-muted">
                                {log.finished_at ? new Date(log.finished_at).toLocaleString("id-ID") : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM HEALTH & AUDIT LOGS */}
      {activeTab === "health" && (
        <div className="space-y-6">
          <div className="clay rounded-[20px] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="font-display text-[20px] font-bold text-ink">
                  Kesehatan Sistem & Audit Trail Moderasi
                </h2>
                <p className="mt-1 text-[13px] text-muted">
                  Telemetri langsung server backend, storage disk, dan riwayat verifikasi tindakan admin.
                </p>
              </div>

              <button
                type="button"
                onClick={fetchHealth}
                disabled={loadingHealth}
                className="clay-primary clay-press inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-medium text-white cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={loadingHealth ? "animate-spin" : ""} />
                Cek Kesehatan Sekarang
              </button>
            </div>

            {loadingHealth ? (
              <div className="py-16 text-center text-muted">
                <RefreshCw size={28} className="mx-auto mb-2 animate-spin text-primary" />
                <p className="text-[13.5px]">Menguji konektivitas database dan storage...</p>
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                {/* Health Components Strip */}
                {healthData && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Database size={16} className="text-primary" />
                          <span className="font-bold text-[13.5px] text-ink">Basis Data Relasional</span>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 border border-emerald-200">
                          {healthData.components.database?.status}
                        </span>
                      </div>
                      <div className="mt-3 text-[12px] text-muted space-y-1">
                        <p>Driver: <span className="font-medium text-slate-700">{healthData.components.database?.driver}</span></p>
                        <p>Latensi Query: <span className="font-medium text-emerald-600">{healthData.components.database?.latency_ms} ms</span></p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HardDrive size={16} className="text-primary" />
                          <span className="font-bold text-[13.5px] text-ink">Penyimpanan Media</span>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 border border-emerald-200">
                          {healthData.components.storage?.status}
                        </span>
                      </div>
                      <div className="mt-3 text-[12px] text-muted space-y-1">
                        <p>Disk: <span className="font-medium text-slate-700">{healthData.components.storage?.disk}</span></p>
                        <p>Izin Tulis/Baca: <span className="font-medium text-emerald-600">{healthData.components.storage?.writable ? "Terverifikasi" : "Gagal"}</span></p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cpu size={16} className="text-primary" />
                          <span className="font-bold text-[13.5px] text-ink">Runtime & Lingkungan</span>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-700">
                          PHP {healthData.server.php_version}
                        </span>
                      </div>
                      <div className="mt-3 text-[12px] text-muted space-y-1">
                        <p>Laravel Framework: <span className="font-medium text-slate-700">v{healthData.server.laravel_version}</span></p>
                        <p>Penggunaan Memori: <span className="font-medium text-slate-700">{healthData.server.memory_usage_mb} MB</span></p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Audit Trail Table */}
                <div className="space-y-3">
                  <h3 className="font-display text-[16px] font-bold text-ink">
                    Audit Trail Tindakan Moderator & Admin
                  </h3>

                  {auditLogs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-muted">
                      <p className="text-[13px]">Belum ada catatan aktivitas verifikasi tersimpan.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-[12px]">
                        <thead className="bg-slate-50 text-muted border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-4 font-medium">Actor</th>
                            <th className="py-2.5 px-4 font-medium">Aksi</th>
                            <th className="py-2.5 px-4 font-medium">Target Laporan</th>
                            <th className="py-2.5 px-4 font-medium">Catatan Moderator</th>
                            <th className="py-2.5 px-4 font-medium">Waktu</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-4 font-medium text-ink">
                                <div>{log.actor.name}</div>
                                <div className="text-[10.5px] text-muted">{log.actor.email}</div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-700">
                                  {log.action}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-700 font-medium">
                                {log.target_title}
                              </td>
                              <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                                {log.note}
                              </td>
                              <td className="py-3 px-4 text-muted">
                                {new Date(log.timestamp).toLocaleString("id-ID")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
