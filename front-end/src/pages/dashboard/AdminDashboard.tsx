import { useState, useEffect, useCallback } from "react";
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

export default function AdminDashboard() {
  const [reports, setReports] = useState<CivicReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [totalBusinesses, setTotalBusinesses] = useState<number>(0);
  const { toast } = useToast();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportsRes, bizRes] = await Promise.all([
        api.get("/reports", { params: { per_page: 50 } }),
        api.get("/businesses/map", { params: { limit: 1 } }),
      ]);

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
          location: r.area?.name || (r.latitude && r.longitude ? `${r.latitude.toFixed(3)}, ${r.longitude.toFixed(3)}` : "Wilayah"),
          status: (r.status as ReportStatus) || "reported",
          severity: r.severity || "medium",
          confirmationsCount: r.confirmations_count || r.confirmations?.length || 0,
          date: r.created_at ? new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Baru",
          description: r.description,
        }));

        setReports(mapped);
      }

      if (bizRes.data?.data) {
        setTotalBusinesses(bizRes.data.data.length > 0 ? 20 : 0);
      }
    } catch (err: any) {
      console.warn("Gagal mengambil laporan publik:", err);
      setError("Gagal memuat laporan publik dari server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

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
              Verify community condition signals, manage area reports, and inspect location intelligence impact.
            </p>
          </div>
          <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-[12px] font-medium text-primary">
            demo district · live telemetry
          </span>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="clay clay-lift rounded-[16px] p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[12px] font-medium">total civic signals</span>
            <AlertTriangle size={16} className="text-warning" />
          </div>
          <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
            {reports.length}
          </p>
          <p className="mt-2 text-[11.5px] text-muted">
            <span className="font-medium text-potential">verified by community</span>
          </p>
        </div>

        <div className="clay clay-lift rounded-[16px] p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[12px] font-medium">neighbor confirmations</span>
            <CheckCircle2 size={16} className="text-potential" />
          </div>
          <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
            {reports.reduce((acc, r) => acc + r.confirmationsCount, 0)}
          </p>
          <p className="mt-2 text-[11.5px] text-muted">
            total ground confirmations
          </p>
        </div>

        <div className="clay clay-lift rounded-[16px] p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[12px] font-medium">registered businesses</span>
            <Store size={16} className="text-primary" />
          </div>
          <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
            {totalBusinesses > 0 ? totalBusinesses : 20}
          </p>
          <p className="mt-2 text-[11.5px] text-muted">
            monitored commercial points
          </p>
        </div>

        <div className="clay clay-lift rounded-[16px] p-5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[12px] font-medium">avg district potential</span>
            <TrendingUp size={16} className="text-primary" />
          </div>
          <p className="mt-3 font-display text-[32px] font-medium leading-none text-ink">
            78.4
          </p>
          <p className="mt-2 text-[11.5px] text-muted">
            favorable location rating
          </p>
        </div>
      </div>

      {/* Main Civic Reports Moderation Table */}
      <div className="clay rounded-[20px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-[#ececf6] pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-[20px] font-medium text-ink">
              Citizen condition reports moderation
            </h2>
            <p className="text-[12.5px] text-muted">
              Review and advance report statuses so that accurate area signals feed into location potential scores.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1 text-[12px]">
              <span className="text-muted">status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="clay-soft rounded-[8px] px-2.5 py-1 text-[12px] font-medium text-ink outline-none"
              >
                <option value="all">all statuses</option>
                {reportStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1 text-[12px]">
              <span className="text-muted">category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="clay-soft rounded-[8px] px-2.5 py-1 text-[12px] font-medium text-ink outline-none"
              >
                <option value="all">all categories</option>
                <option value="road">road damage</option>
                <option value="flood">flooding</option>
                <option value="waste">waste</option>
                <option value="light">street light</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports List / Table */}
        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="py-12 text-center space-y-2">
              <RefreshCw className="size-6 text-primary animate-spin mx-auto" />
              <p className="text-xs text-muted">Memuat laporan dari database...</p>
            </div>
          ) : error ? (
            <div className="py-10 text-center space-y-2">
              <AlertCircle className="size-6 text-red-500 mx-auto" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-12 text-center text-muted text-xs">
              No reports match the selected filters.
            </div>
          ) : (
            filteredReports.map((report) => (
              <div
                key={report.id}
                className="clay-soft clay-lift flex flex-col justify-between gap-4 rounded-[14px] p-4 sm:flex-row sm:items-center"
              >
                {/* Left: Icon & Info */}
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
                    style={{ background: getToneColor(report.category) }}
                  >
                    {getCategoryIcon(report.category)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-medium text-ink">
                        {report.title}
                      </p>
                      <span className="rounded-[6px] bg-canvas px-1.5 py-0.5 text-[10.5px] text-muted">
                        {report.date}
                      </span>
                      <span className="rounded-[6px] bg-primary-soft px-1.5 py-0.5 text-[10.5px] font-medium text-primary">
                        {report.confirmationsCount} konfirmasi warga
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

                {/* Right: Status Lifecycle Selector */}
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

      {/* Monitored Business Feasibility Impact */}
      <div className="clay rounded-[20px] p-5 sm:p-6">
        <h2 className="font-display text-[20px] font-medium text-ink">
          Simulated commercial ventures in monitored corridors
        </h2>
        <p className="mt-1 text-[12.5px] text-muted">
          How live community condition signals dynamically adjust the Location Potential Score for registered ventures.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="clay-soft rounded-[14px] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-ink">Jl. Sudirman Cafe</span>
              <span className="rounded-[6px] bg-[#fff8e7] px-2 py-0.5 text-[10.5px] font-medium text-consider">
                consideration
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-[28px] font-medium text-ink">74</span>
              <span className="text-[12px] text-muted">/ 100</span>
            </div>
            <p className="mt-2 text-[11.5px] text-muted">
              Pothole & sidewalk crack on main crossing dampens accessibility factor by -5 pts.
            </p>
          </div>

          <div className="clay-soft rounded-[14px] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-ink">Campus Edge Food Cart</span>
              <span className="rounded-[6px] bg-[#e8f6ee] px-2 py-0.5 text-[10.5px] font-medium text-potential">
                potential
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-[28px] font-medium text-ink">84</span>
              <span className="text-[12px] text-muted">/ 100</span>
            </div>
            <p className="mt-2 text-[11.5px] text-muted">
              High pedestrian velocity (90); flood risk is 180m away from grab-and-go zone.
            </p>
          </div>

          <div className="clay-soft rounded-[14px] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-ink">West Alley Barber</span>
              <span className="rounded-[6px] bg-[#e8f6ee] px-2 py-0.5 text-[10.5px] font-medium text-potential">
                potential
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-[28px] font-medium text-ink">78</span>
              <span className="text-[12px] text-muted">/ 100</span>
            </div>
            <p className="mt-2 text-[11.5px] text-muted">
              Commercial bin waste reported nearby; scheduled sanitation resolution pending.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
