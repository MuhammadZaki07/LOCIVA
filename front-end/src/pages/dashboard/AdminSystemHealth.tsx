import { useState, useEffect, useCallback } from "react";
import { Database, HardDrive, Cpu, RefreshCw, History } from "lucide-react";
import api from "@/context/apiClient";
import { useToast } from "@/components/ui/Toast";
import Spinner from "@/components/ui/Spinner";
import { ClayButton } from "@/components/ui/ClayButton";

interface SystemHealthData {
  status: "healthy" | "degraded" | "error";
  components: {
    database?: { status: string; latency_ms?: number; driver?: string; message?: string };
    storage?: { status: string; disk?: string; writable?: boolean; message?: string };
    cache?: { status: string; driver?: string; message?: string };
  };
  server: {
    php_version: string;
    laravel_version: string;
    server_time: string;
    timezone: string;
    memory_usage_mb: number;
  };
}

interface AuditLogItem {
  id: string;
  actor: { id?: string; name: string; email?: string };
  action: string;
  target_entity: string;
  target_id: string;
  target_title: string;
  category?: string;
  note: string;
  timestamp: string;
}

export default function AdminSystemHealth() {
  const { toast } = useToast();
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination for audit logs
  const [auditPage, setAuditPage] = useState(1);
  const logsPerPage = 6;

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, auditRes] = await Promise.all([
        api.get("/admin/system-health"),
        api.get("/admin/audit-logs"),
      ]);
      if (healthRes.data?.success) setHealthData(healthRes.data.data);
      if (auditRes.data?.success) setAuditLogs(auditRes.data.data.data || []);
    } catch (err: any) {
      toast({
        title: "Gagal memuat telemetri sistem",
        description: err.response?.data?.message || "Gagal menghubungi telemetry server backend.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const statusColor = (s?: string) =>
    s === "ok" || s === "healthy" || s === "online"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : s === "degraded"
      ? "bg-amber-50 text-amber-700 border border-amber-200"
      : "bg-rose-50 text-rose-700 border border-rose-200";

  const totalAuditPages = Math.max(1, Math.ceil(auditLogs.length / logsPerPage));
  const displayedAuditLogs = auditLogs.slice(
    (auditPage - 1) * logsPerPage,
    auditPage * logsPerPage
  );

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#f0f0f8] pb-4">
        <div>
          <h1 className="font-display text-[22px] font-medium tracking-tight text-ink sm:text-[24px]">
            system health & audit trail
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            telemetri langsung server backend, storage disk, dan jejak audit verifikasi admin.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchHealth}
          disabled={loading}
          className="clay-primary clay-press inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-[12.5px] font-medium text-white cursor-pointer disabled:opacity-50 self-start"
        >
          {loading ? <Spinner size="sm" /> : <RefreshCw size={13} />}
          <span>{loading ? "menguji..." : "uji sekarang"}</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted">
          <Spinner size="lg" className="mx-auto mb-3 text-primary" />
          <p className="text-[13px]">menguji konektivitas database dan storage...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Component cards */}
          {healthData && (
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Database */}
              <div className="clay rounded-[16px] p-5 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-primary" />
                    <span className="font-medium text-[13.5px] text-ink">
                      basis data relasional
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium border ${statusColor(
                      healthData.components.database?.status
                    )}`}
                  >
                    {healthData.components.database?.status || "online"}
                  </span>
                </div>
                <div className="mt-4 text-[12px] text-muted space-y-1.5 border-t border-slate-100 pt-3">
                  <div className="flex justify-between">
                    <span>driver</span>
                    <span className="font-medium text-slate-700">
                      {healthData.components.database?.driver ?? "mysql"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>latensi query</span>
                    <span className="font-medium text-emerald-600">
                      {healthData.components.database?.latency_ms ?? "—"} ms
                    </span>
                  </div>
                </div>
              </div>

              {/* Storage */}
              <div className="clay rounded-[16px] p-5 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive size={16} className="text-primary" />
                    <span className="font-medium text-[13.5px] text-ink">
                      penyimpanan media
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium border ${statusColor(
                      healthData.components.storage?.status
                    )}`}
                  >
                    {healthData.components.storage?.status || "online"}
                  </span>
                </div>
                <div className="mt-4 text-[12px] text-muted space-y-1.5 border-t border-slate-100 pt-3">
                  <div className="flex justify-between">
                    <span>disk volume</span>
                    <span className="font-medium text-slate-700">
                      {healthData.components.storage?.disk ?? "local"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>status izin tulis</span>
                    <span className="font-medium text-emerald-600">
                      {healthData.components.storage?.writable ? "dapat ditulis" : "terkunci"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Server Runtime */}
              <div className="clay rounded-[16px] p-5 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu size={16} className="text-primary" />
                    <span className="font-medium text-[13.5px] text-ink">
                      runtime backend
                    </span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-700">
                    PHP {healthData.server?.php_version ?? "8.x"}
                  </span>
                </div>
                <div className="mt-4 text-[12px] text-muted space-y-1.5 border-t border-slate-100 pt-3">
                  <div className="flex justify-between">
                    <span>kerangka kerja</span>
                    <span className="font-medium text-slate-700">
                      Laravel {healthData.server?.laravel_version ?? "11.x"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>konsumsi memori</span>
                    <span className="font-medium text-emerald-600">
                      {healthData.server?.memory_usage_mb ?? "—"} MB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audit trail table */}
          <div className="clay rounded-[16px] p-5 bg-white space-y-3">
            <div className="border-b border-[#f0f0f8] pb-3">
              <h2 className="font-display text-[15px] font-medium text-ink">
                jejak audit aktivitas admin
              </h2>
              <p className="text-[11.5px] text-muted">
                catatan log tindakan moderasi laporan, sinkronisasi data, dan perubahan konfigurasi sistem
              </p>
            </div>

            {auditLogs.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-slate-200 py-8 text-center text-muted">
                <History size={20} className="mx-auto mb-1.5 text-slate-300" />
                <p className="text-[12.5px]">belum ada aktivitas audit yang tercatat.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="bg-slate-50/60 text-muted border-b border-slate-100 text-[11px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">waktu</th>
                      <th className="py-2.5 px-4">aktor</th>
                      <th className="py-2.5 px-4">tindakan</th>
                      <th className="py-2.5 px-4">entitas target</th>
                      <th className="py-2.5 px-4">catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {displayedAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-muted whitespace-nowrap">
                          {log.timestamp
                            ? new Date(log.timestamp).toLocaleString("id-ID", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="py-3 px-4 font-medium text-ink">
                          {log.actor?.name || "Sistem"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-ink font-medium max-w-xs truncate">
                          {log.target_title || log.target_entity}
                        </td>
                        <td className="py-3 px-4 text-muted max-w-sm truncate">
                          {log.note || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalAuditPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[11.5px] text-muted">
                    <span>
                      halaman {auditPage} dari {totalAuditPages} (total {auditLogs.length} jejak audit)
                    </span>
                    <div className="flex items-center gap-1">
                      <ClayButton
                        variant="secondary"
                        disabled={auditPage <= 1}
                        onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      >
                        sebelumnya
                      </ClayButton>
                      <ClayButton
                        variant="secondary"
                        disabled={auditPage >= totalAuditPages}
                        onClick={() => setAuditPage((p) => p + 1)}
                      >
                        selanjutnya
                      </ClayButton>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
