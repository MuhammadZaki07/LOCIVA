import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Camera,
  X,
  AlertCircle,
  Crosshair,
} from "lucide-react";
import api from "@/context/apiClient";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import Spinner from "@/components/ui/Spinner";
import type { MapCivicReport } from "./ReportMarker";

interface ReportCategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCoords: { lat: number; lng: number } | null;
  onSelectCoordsOnMap?: () => void;
  onReportCreated?: (newReport: MapCivicReport) => void;
}

export const CreateReportModal: React.FC<CreateReportModalProps> = ({
  isOpen,
  onClose,
  selectedCoords,
  onSelectCoordsOnMap,
  onReportCreated,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [categories, setCategories] = useState<ReportCategoryItem[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [latInput, setLatInput] = useState<string>("");
  const [lngInput, setLngInput] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync selectedCoords when updated
  useEffect(() => {
    if (selectedCoords) {
      setLatInput(selectedCoords.lat.toFixed(6));
      setLngInput(selectedCoords.lng.toFixed(6));
    }
  }, [selectedCoords]);

  // Fetch report categories
  useEffect(() => {
    if (!isOpen) return;
    setLoadingCats(true);
    api
      .get("/report-categories")
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setCategories(res.data.data);
          if (res.data.data.length > 0 && !categoryId) {
            setCategoryId(res.data.data[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn("Gagal memuat kategori laporan:", err);
      })
      .finally(() => setLoadingCats(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("Silakan login terlebih dahulu untuk mengirimkan laporan.");
      return;
    }

    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);

    if (isNaN(lat) || isNaN(lng)) {
      setError("Koordinat lokasi laporan belum valid. Klik peta atau isi manual.");
      return;
    }

    if (!title.trim()) {
      setError("Judul laporan wajib diisi.");
      return;
    }

    if (!categoryId) {
      setError("Pilih salah satu kategori laporan.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("category_id", categoryId);
      formData.append("latitude", lat.toString());
      formData.append("longitude", lng.toString());
      formData.append("severity", severity);
      if (description.trim()) {
        formData.append("description", description.trim());
      }
      if (selectedFile) {
        formData.append("image", selectedFile);
      }

      const res = await api.post("/reports", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success && res.data?.data) {
        toast({
          title: "Laporan berhasil dibuat",
          description: "Laporan civic Anda sudah diterbitkan dan muncul di peta.",
          variant: "success",
        });

        const createdData = res.data.data;
        const mapped: MapCivicReport = {
          id: String(createdData.id),
          title: createdData.title,
          description: createdData.description,
          latitude: Number(createdData.latitude),
          longitude: Number(createdData.longitude),
          status: createdData.status || "reported",
          severity: createdData.severity || severity,
          category: createdData.category,
          area: createdData.area,
          user: createdData.user,
          confirmations_count: 0,
          created_at: createdData.created_at || new Date().toISOString(),
          media: createdData.media || [],
        };

        onReportCreated?.(mapped);
        onClose();
        // Reset form
        setTitle("");
        setDescription("");
        setSelectedFile(null);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        "Gagal menyimpan laporan. Periksa kelengkapan form.";
      setError(msg);
      toast({
        title: "Gagal mengirim laporan",
        description: msg,
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="clay max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[20px] bg-white p-5 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f0f0f8] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-rose-50 text-rose-600">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="font-display text-[16px] font-medium text-ink">
                Tambah laporan civic
              </h2>
              <p className="text-[12px] text-muted">
                Laporkan kondisi jalan, banjir, sampah, atau utilitas ke peta LOCIVA.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] p-1.5 text-muted hover:bg-slate-100 hover:text-ink cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-[10px] bg-rose-50 p-3 text-[12px] text-rose-700 border border-rose-100">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-left">
          {/* Title */}
          <div>
            <label className="block text-[12px] font-medium text-ink">
              Judul laporan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Aspal berlubang di dekat halte"
              className="mt-1 w-full rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-primary"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[12px] font-medium text-ink">
              Kategori masalah <span className="text-rose-500">*</span>
            </label>
            {loadingCats ? (
              <div className="flex items-center gap-2 text-[12px] text-muted py-2">
                <Spinner size="sm" />
                <span>Memuat kategori...</span>
              </div>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="mt-1 w-full rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-primary cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Coordinates selection */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-ink">
                Koordinat lokasi <span className="text-rose-500">*</span>
              </label>
              {onSelectCoordsOnMap && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectCoordsOnMap();
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline cursor-pointer"
                >
                  <Crosshair size={12} />
                  <span>pilih titik langsung dari peta</span>
                </button>
              )}
            </div>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10.5px] text-muted">Latitude:</span>
                <input
                  type="text"
                  required
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  placeholder="-6.917464"
                  className="w-full rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-1.5 text-[12px] text-ink outline-none focus:border-primary"
                />
              </div>
              <div>
                <span className="text-[10.5px] text-muted">Longitude:</span>
                <input
                  type="text"
                  required
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  placeholder="107.619123"
                  className="w-full rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-1.5 text-[12px] text-ink outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-[12px] font-medium text-ink">
              Tingkat urgensi / keparahan
            </label>
            <div className="mt-1 flex gap-2">
              {(["low", "medium", "high"] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverity(sev)}
                  className={`clay-press flex-1 rounded-[10px] py-1.5 text-[12px] font-medium capitalize cursor-pointer transition-colors ${
                    severity === sev
                      ? sev === "high"
                        ? "bg-rose-500 text-white"
                        : sev === "medium"
                        ? "bg-amber-500 text-white"
                        : "bg-emerald-500 text-white"
                      : "bg-slate-100 text-muted hover:bg-slate-200"
                  }`}
                >
                  {sev === "low" ? "rendah" : sev === "medium" ? "sedang" : "tinggi"}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12px] font-medium text-ink">
              Deskripsi kejadian / kondisi
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan detail kendala di lapangan, dampak terhadap akses toko atau pejalan kaki..."
              className="mt-1 w-full rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-2 text-[12.5px] text-ink outline-none focus:border-primary"
            />
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-[12px] font-medium text-ink">
              Foto bukti kondisi (opsional)
            </label>
            <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#d5d5e5] bg-slate-50/50 p-3 text-[12px] text-muted hover:bg-slate-100">
              <Camera size={16} />
              <span>{selectedFile ? selectedFile.name : "Pilih gambar dari perangkat (JPG, PNG)"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                }}
              />
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-[#f0f0f8] pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="clay-press rounded-[10px] bg-slate-100 px-4 py-2 text-[12.5px] font-medium text-muted hover:bg-slate-200 cursor-pointer"
            >
              batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="clay-primary inline-flex items-center gap-1.5 rounded-[10px] px-5 py-2 text-[12.5px] font-medium text-white cursor-pointer disabled:opacity-50"
            >
              {submitting && <Spinner size="sm" />}
              <span>{submitting ? "mengirim..." : "kirim laporan"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateReportModal;
