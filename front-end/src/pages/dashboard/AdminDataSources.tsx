import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ExternalLink } from "lucide-react";
import api from "@/context/apiClient";
import { useToast } from "@/components/ui/Toast";
import Spinner from "@/components/ui/Spinner";
import { ClayButton } from "@/components/ui/ClayButton";

interface DataSourceItem {
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

interface DataSyncLogItem {
  id: string;
  data_source?: { id: string; name: string; type: string };
  entity_type: string;
  status: string;
  records_processed: number;
  error_message?: string | null;
  started_at: string;
  finished_at?: string | null;
}

export default function AdminDataSources() {
  const { toast } = useToast();
  const [dataSources, setDataSources] = useState<DataSourceItem[]>([]);
  const [syncLogs, setSyncLogs] = useState<DataSyncLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);

  // Pagination for sync logs
  const [logPage, setLogPage] = useState(1);
  const logsPerPage = 5;

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const [sourcesRes, logsRes] = await Promise.all([
        api.get("/admin/data-sources"),
        api.get("/admin/data-sync-logs"),
      ]);
      if (sourcesRes.data?.success) setDataSources(sourcesRes.data.data);
      if (logsRes.data?.success) setSyncLogs(logsRes.data.data.data || []);
    } catch (err: any) {
      toast({
        title: "Gagal memuat sumber data",
        description: err.response?.data?.message || "Tidak dapat memuat sumber data eksternal.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleTriggerSync = async (sourceId: string) => {
    setSyncingSourceId(sourceId);
    try {
      const res = await api.post(`/admin/data-sources/${sourceId}/sync`);
      if (res.data?.success) {
        toast({
          title: "Sinkronisasi berhasil",
          description: res.data.message || "Data berhasil disinkronkan.",
          variant: "success",
        });
        fetchSources();
      }
    } catch (err: any) {
      toast({
        title: "Sinkronisasi gagal",
        description: err.response?.data?.message || "Terjadi kesalahan saat sinkronisasi.",
        variant: "error",
      });
    } finally {
      setSyncingSourceId(null);
    }
  };

  const totalLogPages = Math.max(1, Math.ceil(syncLogs.length / logsPerPage));
  const displayedLogs = syncLogs.slice((logPage - 1) * logsPerPage, logPage * logsPerPage);

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#f0f0f8] pb-4">
        <div>
          <h1 className="font-display text-[22px] font-medium tracking-tight text-ink sm:text-[24px]">
            data sources & sinkronisasi
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            kendali data OpenStreetMap Overpass, BPS kependudukan, dan feed telemetri lapangan.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchSources}
          disabled={loading}
          className="clay-soft clay-press inline-flex items-center gap-2 rounded-[10px] px-3.5 py-1.5 text-[12.5px] font-medium text-ink cursor-pointer disabled:opacity-50 self-start border border-slate-200"
        >
          {loading ? <Spinner size="sm" /> : <RefreshCw size={13} />}
          <span>{loading ? "menyegarkan..." : "segarkan status"}</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted">
          <Spinner size="lg" className="mx-auto mb-3 text-primary" />
          <p className="text-[13px]">memuat status sumber data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sources grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dataSources.map((source) => (
              <div
                key={source.id}
                className="clay rounded-[16px] p-5 flex flex-col justify-between bg-white"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-700 capitalize">
                      {source.type}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>aktif</span>
                    </span>
                  </div>

                  <h2 className="font-display text-[15px] font-medium text-ink mt-3">
                    {source.name}
                  </h2>
                  <p className="text-[12px] text-muted mt-1 leading-relaxed line-clamp-2">
                    {source.description || "Sumber data spasial terintegrasi."}
                  </p>

                  {source.website && (
                    <a
                      href={source.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-2 font-medium"
                    >
                      <span>kunjungi portal sumber</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                  <div className="text-[11px] text-muted">
                    <span>terakhir sinkron:</span>
                    <p className="font-medium text-slate-700 mt-0.5">
                      {source.last_synced_at
                        ? new Date(source.last_synced_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "belum pernah"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTriggerSync(source.id)}
                    disabled={syncingSourceId === source.id}
                    className="clay-primary clay-press inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[11.5px] font-medium text-white cursor-pointer disabled:opacity-50"
                  >
                    {syncingSourceId === source.id ? (
                      <Spinner size="sm" />
                    ) : (
                      <RefreshCw size={11} />
                    )}
                    <span>{syncingSourceId === source.id ? "proses..." : "sinkronkan"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Sync history table */}
          <div className="clay rounded-[16px] p-5 bg-white space-y-3">
            <div className="border-b border-[#f0f0f8] pb-3">
              <h2 className="font-display text-[15px] font-medium text-ink">
                log sinkronisasi terkini
              </h2>
              <p className="text-[11.5px] text-muted">
                riwayat proses pembaruan data dan hasil batch sinkronisasi
              </p>
            </div>

            {syncLogs.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-slate-200 py-8 text-center text-muted">
                <p className="text-[12.5px]">belum ada riwayat log sinkronisasi.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="bg-slate-50/60 text-muted border-b border-slate-100 text-[11px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">sumber data</th>
                      <th className="py-2.5 px-4">status</th>
                      <th className="py-2.5 px-4">data diproses</th>
                      <th className="py-2.5 px-4">waktu mulai</th>
                      <th className="py-2.5 px-4">selesai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {displayedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-medium text-ink capitalize">
                          {log.data_source?.name || log.entity_type}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                              log.status === "completed" || log.status === "success"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : log.status === "running"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {log.records_processed} baris
                        </td>
                        <td className="py-3 px-4 text-muted">
                          {new Date(log.started_at).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 text-muted">
                          {log.finished_at
                            ? new Date(log.finished_at).toLocaleString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalLogPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[11.5px] text-muted">
                    <span>
                      halaman {logPage} dari {totalLogPages}  total log
                    </span>
                    <div className="flex items-center gap-1">
                      <ClayButton
                        variant="secondary"
                        disabled={logPage <= 1}
                        onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                      >
                        sebelumnya
                      </ClayButton>
                      <ClayButton
                        variant="secondary"
                        disabled={logPage >= totalLogPages}
                        onClick={() => setLogPage((p) => p + 1)}
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
