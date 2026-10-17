import React from "react";
import { MapMarker, MapPopup } from "@/components/ui/shadcn-ui/map";
import {
  AlertTriangle,
  Droplets,
  Trash2,
  Lightbulb,
  ShieldAlert,
  Clock,
  CheckCircle2,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getStorageUrl } from "@/context/userService";

export interface MapCivicReport {
  id: string;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  status: "reported" | "verification" | "confirmed" | "handled" | "resolved" | "rejected";
  severity?: "low" | "medium" | "high";
  category?: {
    id: string;
    name: string;
    slug: string;
    icon?: string;
  };
  area?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
    email?: string;
  };
  confirmations_count?: number;
  created_at: string;
  media?: Array<{
    id: string;
    file_path: string;
    file_type?: string;
  }>;
}

interface ReportMarkerProps {
  report: MapCivicReport;
  onSelect?: (report: MapCivicReport) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  road: { bg: "#ef4444", border: "#dc2626", text: "#fee2e2" },
  flood: { bg: "#0284c7", border: "#0369a1", text: "#e0f2fe" },
  waste: { bg: "#d97706", border: "#b45309", text: "#fef3c7" },
  light: { bg: "#ca8a04", border: "#a16207", text: "#fef9c3" },
  security: { bg: "#8b5cf6", border: "#7c3aed", text: "#ede9fe" },
};

const STATUS_LABELS: Record<string, { label: string; badgeClass: string }> = {
  reported: { label: "menunggu verifikasi", badgeClass: "bg-amber-100 text-amber-800 border-amber-300" },
  verification: { label: "sedang ditinjau", badgeClass: "bg-blue-100 text-blue-800 border-blue-300" },
  confirmed: { label: "dikonfirmasi warga", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  handled: { label: "dalam penanganan", badgeClass: "bg-purple-100 text-purple-800 border-purple-300" },
  resolved: { label: "selesai ditangani", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  rejected: { label: "ditolak", badgeClass: "bg-rose-100 text-rose-800 border-rose-300" },
};

export const ReportMarker: React.FC<ReportMarkerProps> = ({ report }) => {
  const categorySlug = report.category?.slug || "road";
  const catColor = CATEGORY_COLORS[categorySlug] || CATEGORY_COLORS.road;
  const statusInfo = STATUS_LABELS[report.status] || {
    label: report.status,
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
  };

  const getCategoryIcon = () => {
    switch (categorySlug) {
      case "flood":
        return <Droplets size={13} className="text-white" />;
      case "waste":
        return <Trash2 size={13} className="text-white" />;
      case "light":
        return <Lightbulb size={13} className="text-white" />;
      case "security":
        return <ShieldAlert size={13} className="text-white" />;
      default:
        return <AlertTriangle size={13} className="text-white" />;
    }
  };

  // Distinct marker shape: hexagonal pin with alert icon
  const iconNode = (
    <div
      style={{
        backgroundColor: catColor.bg,
        borderColor: catColor.border,
      }}
      className="relative flex h-8 w-8 items-center justify-center rounded-xl border-2 shadow-lg transition-transform hover:scale-110 cursor-pointer"
      title={`Laporan warga: ${report.title}`}
    >
      {report.status === "reported" && (
        <span
          className="absolute -top-1 -right-1 h-3 w-3 rounded-full animate-ping opacity-75"
          style={{ backgroundColor: catColor.bg }}
        />
      )}
      {getCategoryIcon()}
    </div>
  );

  const formattedDate = report.created_at
    ? new Date(report.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const firstPhoto = report.media?.[0]?.file_path
    ? getStorageUrl(report.media[0].file_path)
    : null;

  return (
    <MapMarker
      position={[report.latitude, report.longitude]}
      icon={iconNode}
      iconAnchor={[16, 16]}
      popupAnchor={[0, -18]}
    >
      <MapPopup className="lociva-popup-wrapper">
        <div className="p-3.5 space-y-2.5 text-left min-w-[240px] max-w-[300px]">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <span
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-medium text-white"
              style={{ backgroundColor: catColor.bg }}
            >
              {report.category?.name || "laporan civic"}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusInfo.badgeClass}`}
            >
              {statusInfo.label}
            </span>
          </div>

          {/* Title */}
          <h4 className="font-display font-medium text-slate-900 text-[13.5px] leading-snug">
            {report.title}
          </h4>

          {/* Optional photo */}
          {firstPhoto && (
            <div className="overflow-hidden rounded-lg border border-slate-100 max-h-32 bg-slate-50">
              <img
                src={firstPhoto}
                alt={report.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Description */}
          {report.description && (
            <p className="text-[12px] text-slate-600 line-clamp-3 leading-relaxed">
              {report.description}
            </p>
          )}

          {/* Metadata */}
          <div className="space-y-1 pt-1 text-[11px] text-slate-500 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <MapPin size={11} className="text-slate-400" />
                <span>{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</span>
              </span>
              {report.confirmations_count ? (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 size={11} />
                  <span>{report.confirmations_count} konfirmasi</span>
                </span>
              ) : null}
            </div>

            {formattedDate && (
              <div className="flex items-center gap-1 text-slate-400">
                <Clock size={11} />
                <span>{formattedDate}</span>
              </div>
            )}
          </div>

          {/* Link to admin moderation queue if available */}
          <div className="pt-1">
            <Link
              to="/admin/reports"
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-primary hover:underline"
            >
              <span>moderasi laporan di admin</span>
              <ExternalLink size={11} />
            </Link>
          </div>
        </div>
      </MapPopup>
    </MapMarker>
  );
};

export default ReportMarker;
