import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, RefreshCw, Lightbulb, AlertCircle } from "lucide-react";
import api from "@/context/apiClient";
import { useToast } from "@/components/ui/Toast";
import Spinner from "@/components/ui/Spinner";

interface DataQualityIssue {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  affected_count: number;
  source_entity: string;
  recommendation: string;
}

interface DataQualityData {
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

export default function AdminDataQuality() {
  const { toast } = useToast();
  const [qualityData, setQualityData] = useState<DataQualityData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQuality = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/data-quality");
      if (res.data?.success) {
        setQualityData(res.data.data);
      }
    } catch (err: any) {
      toast({
        title: "Gagal memindai data",
        description: err.response?.data?.message || "Tidak dapat memuat modul data quality.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchQuality();
  }, [fetchQuality]);

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#f0f0f8] pb-4">
        <div>
          <h1 className="font-display text-[22px] font-medium tracking-tight text-ink sm:text-[24px]">
            data quality center
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            pemeriksaan anomali koordinat, kelengkapan metadata spasial, dan konsistensi relasi basis data.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchQuality}
          disabled={loading}
          className="clay-primary clay-press inline-flex items-center gap-2 rounded-[10px] px-4 py-2 text-[12.5px] font-medium text-white cursor-pointer disabled:opacity-50 self-start"
        >
          {loading ? <Spinner size="sm" /> : <RefreshCw size={13} />}
          <span>{loading ? "memindai..." : "pindai ulang"}</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted">
          <Spinner size="lg" className="mx-auto mb-3 text-primary" />
          <p className="text-[13px]">memindai seluruh relasi spasial dan integritas database...</p>
        </div>
      ) : qualityData ? (
        <div className="space-y-6">
          {/* Quality Banner Card */}
          <div className="clay rounded-[16px] p-5 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] text-white font-display text-[20px] font-medium shadow-xs"
                  style={{
                    background:
                      qualityData.health_score >= 80
                        ? "#10b981"
                        : qualityData.health_score >= 60
                        ? "#f59e0b"
                        : "#ef4444",
                  }}
                >
                  {qualityData.health_score}%
                </div>
                <div>
                  <h2 className="font-display text-[16px] font-medium text-ink">
                    skor integritas data spasial
                  </h2>
                  <p className="text-[12px] text-muted mt-0.5">
                    {qualityData.total_issues} anomali terdeteksi dari {qualityData.scanned_entities.businesses} bisnis dan {qualityData.scanned_entities.reports} laporan warga
                  </p>
                </div>
              </div>
              <span className="text-[11px] text-muted shrink-0">
                terakhir dipindai: {new Date(qualityData.last_scanned_at).toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Scanned Entities Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "bisnis terdaftar", value: qualityData.scanned_entities.businesses },
              { label: "laporan civic", value: qualityData.scanned_entities.reports },
              { label: "wilayah kecamatan", value: qualityData.scanned_entities.areas },
              { label: "katalog jenis usaha", value: qualityData.scanned_entities.business_types },
            ].map((item) => (
              <div key={item.label} className="clay rounded-[14px] p-4 text-center bg-white">
                <span className="text-[11px] text-muted block mb-1 lowercase">{item.label}</span>
                <span className="font-display text-[22px] font-medium text-ink">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Issues List */}
          <div className="space-y-3">
            <h2 className="font-display text-[15px] font-medium text-ink">
              temuan kualitas data & anomali
            </h2>
            {qualityData.issues.length === 0 ? (
              <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 p-8 text-center text-emerald-800">
                <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-600" />
                <p className="font-medium text-[13.5px]">seluruh data memenuhi standar integritas</p>
                <p className="text-[12px] mt-1 text-emerald-700">
                  tidak ada koordinat rusak, field esensial kosong, maupun relasi yatim yang terdeteksi.
                </p>
              </div>
            ) : (
              qualityData.issues.map((issue) => (
                <div key={issue.id} className="clay rounded-[14px] p-4 space-y-2 bg-white">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                          issue.severity === "high"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : issue.severity === "medium"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {issue.severity}
                      </span>
                      <span className="font-medium text-[13.5px] text-ink">{issue.title}</span>
                    </div>
                    <span className="text-[11px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                      {issue.affected_count} entitas terdampak
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-600 leading-relaxed">{issue.description}</p>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary-soft/40 p-2 rounded-lg">
                    <Lightbulb size={13} className="shrink-0" />
                    <span>rekomendasi: {issue.recommendation}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="py-20 text-center text-muted">
          <AlertCircle size={24} className="mx-auto mb-2 text-slate-400" />
          <p className="text-[13px]">klik "pindai ulang" untuk menjalankan verifikasi integritas data.</p>
        </div>
      )}
    </div>
  );
}
