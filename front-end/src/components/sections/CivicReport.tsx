import { useState, useEffect } from "react";
import {
  Camera,
  MapPin,
  Check,
  ThumbsUp,
  AlertTriangle,
  Droplets,
  Trash2,
  Lightbulb,
  Clock,
  Loader2,
  Upload,
  X,
  Compass,
} from "lucide-react";
import { civicReports, reportStatuses, type CivicReportItem } from "../../data/mock";
import { DemoNote, Eyebrow, Section } from "../ui/Section";
import { MapPreview } from "./MapPreview";
import {
  createReport,
  getReportCategories,
  type ReportCategoryItem,
} from "@/context/reportService";
import { useToast } from "../ui/Toast";
import { ClayButton } from "../ui/ClayButton";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "../ui/Modal";

export function CivicReport() {
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState(civicReports[0].id);
  const [confirmedReports, setConfirmedReports] = useState<Record<string, boolean>>({});

  // Submission Modal state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [categories, setCategories] = useState<ReportCategoryItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [description, setDescription] = useState("");
  const [lat, setLat] = useState<number>(-6.917464);
  const [lng, setLng] = useState<number>(107.619123);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    void getReportCategories().then((res) => {
      setCategories(res);
      if (res.length > 0) {
        setCategoryId(res[0].id);
      }
    });
  }, []);

  const report = civicReports.find((r) => r.id === selectedId) ?? civicReports[0];
  const isConfirmedByUser = !!confirmedReports[report.id];
  const currentConfirmCount = report.confirmations + (isConfirmedByUser ? 1 : 0);

  function toggleConfirmation(id: string) {
    setConfirmedReports((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
    toast({
      title: "Konfirmasi Dicatat",
      description: "Terima kasih telah memvalidasi kondisi lapangan di lingkungan Anda.",
      variant: "success",
    });
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).slice(0, 3);
    setSelectedPhotos(files);

    const previews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(previews);
  }

  function handleRemovePhoto(index: number) {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAutoLocate() {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          toast({
            title: "Lokasi Terdeteksi",
            description: `Koordinat GPS: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
            variant: "success",
          });
        },
        () => {
          toast({
            title: "GPS Tidak Tersedia",
            description: "Gunakan koordinat default atau masukkan secara manual.",
            variant: "error",
          });
        }
      );
    }
  }

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Judul laporan wajib diisi.");
      return;
    }
    if (!categoryId) {
      setFormError("Kategori laporan wajib dipilih.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const formData = new FormData();
      formData.append("title", title);
      formData.append("category_id", categoryId);
      formData.append("severity", severity);
      formData.append("latitude", lat.toString());
      formData.append("longitude", lng.toString());
      if (description.trim()) {
        formData.append("description", description);
      }

      selectedPhotos.forEach((file) => {
        formData.append("images[]", file);
      });

      await createReport(formData);

      toast({
        title: "Laporan Berhasil Dikirim",
        description: "Laporan Anda telah tercatat dan akan ditinjau oleh tim moderator civic LOCIVA.",
        variant: "success",
      });

      setSubmitModalOpen(false);
      setTitle("");
      setDescription("");
      setSelectedPhotos([]);
      setPhotoPreviews([]);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Gagal mengirim laporan. Pastikan Anda telah masuk.");
    } finally {
      setSubmitting(false);
    }
  }

  function getCategoryIcon(cat: CivicReportItem["category"]) {
    switch (cat) {
      case "flood":
        return <Droplets size={12} />;
      case "waste":
        return <Trash2 size={12} />;
      case "light":
        return <Lightbulb size={12} />;
      case "road":
      default:
        return <AlertTriangle size={12} />;
    }
  }

  return (
    <Section id="reports">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="max-w-xl">
          <Eyebrow>civic intelligence</Eyebrow>
          <h2 className="font-display text-[28px] leading-snug font-medium tracking-[-0.02em] text-ink md:text-[32px]">
            Understand what is happening around you.
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-muted">
            Citizens pin ground realities on the map, upload photos, and let neighbors verify what they see. These reports feed area-condition signals directly into the platform rather than sitting in a siloed complaint box.
          </p>
        </div>

        <ClayButton
          variant="primary"
          onClick={() => setSubmitModalOpen(true)}
          className="flex items-center gap-2 text-xs shadow-md shrink-0 w-fit"
        >
          <Camera size={14} />
          <span>Laporkan Situasi Wilayah</span>
        </ClayButton>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Map Preview with Civic Markers */}
        <div>
          <MapPreview variant="civic" showScore={false} catchment={false} />
          {/* Report category pills selector */}
          <div className="mt-3.5 flex flex-wrap gap-2">
            {civicReports.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`clay-press inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all ${
                    isSelected ? "clay-primary text-white" : "clay text-ink"
                  }`}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: item.tone }}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Report Inspection & Action Card */}
        <div className="clay flex flex-col justify-between rounded-[18px] p-5 sm:p-6">
          <div>
            <div className="flex items-center justify-between border-b border-[#ececf6] pb-3">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-white"
                  style={{ background: report.tone }}
                >
                  {getCategoryIcon(report.category)}
                </span>
                <p className="text-[13px] font-medium text-ink">{report.label}</p>
              </div>
              <span className="flex items-center gap-1 text-[11px] text-muted">
                <Clock size={11} /> {report.timeAgo}
              </span>
            </div>

            {/* Pinned location & details */}
            <div className="mt-4 space-y-3 text-[13px]">
              <div>
                <span className="flex items-center gap-1.5 text-[11px] text-muted">
                  <MapPin size={12} className="text-primary" /> pinned location
                </span>
                <p className="clay-soft mt-1 rounded-[10px] px-3 py-2 text-ink">
                  {report.streetName}
                </p>
              </div>

              {/* Photo preview tile */}
              <div>
                <span className="flex items-center gap-1.5 text-[11px] text-muted">
                  <Camera size={12} className="text-primary" /> field photo
                </span>
                <div className="clay-soft mt-1 flex items-center justify-between rounded-[10px] p-2.5 text-[12px] text-muted">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-10 w-12 items-center justify-center rounded-[6px] text-[10px] text-white"
                      style={{ background: report.tone }}
                    >
                      photo
                    </div>
                    <div>
                      <p className="font-medium text-ink">field_capture_{report.category}.jpg</p>
                      <p className="text-[10px] text-muted">geo-tagged · verified coordinates</p>
                    </div>
                  </div>
                  <span className="rounded-[4px] bg-[#f0f0f8] px-1.5 py-0.5 text-[10px] text-muted">
                    view
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <span className="text-[11px] text-muted">description</span>
                <p className="mt-1 text-[13px] leading-relaxed text-ink">
                  {report.note}
                </p>
              </div>
            </div>

            {/* Status progression stepper */}
            <div className="mt-5 border-t border-[#ececf6] pt-4">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-ink">report lifecycle</p>
                <span className="text-[11px] font-medium text-primary">
                  status: {report.status}
                </span>
              </div>
              <ol className="mt-2.5 flex flex-wrap gap-1">
                {reportStatuses.map((status) => {
                  const isActive = status === report.status;
                  return (
                    <li
                      key={status}
                      className={`rounded-[8px] px-2 py-1 text-[11px] font-medium transition-all ${
                        isActive
                          ? "clay-primary text-white"
                          : "bg-primary-soft/60 text-muted"
                      }`}
                    >
                      {status}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          {/* Neighbor confirmation button */}
          <div className="mt-6 border-t border-[#ececf6] pt-4">
            <button
              type="button"
              onClick={() => toggleConfirmation(report.id)}
              className={`clay-press flex w-full items-center justify-center gap-2 rounded-[12px] px-4 py-2.5 text-[13px] font-medium transition-all ${
                isConfirmedByUser
                  ? "bg-[#e8f6ee] text-potential border border-potential/20"
                  : "clay text-ink"
              }`}
            >
              {isConfirmedByUser ? (
                <>
                  <Check size={14} className="text-potential" />
                  <span>you and {currentConfirmCount - 1} neighbors confirmed this</span>
                </>
              ) : (
                <>
                  <ThumbsUp size={14} className="text-primary" />
                  <span>confirm this is still happening ({currentConfirmCount})</span>
                </>
              )}
            </button>
            <DemoNote>
              Civic reports act as ground signals. Neighbors verify conditions to maintain data fresh and actionable.
            </DemoNote>
          </div>
        </div>
      </div>

      {/* Citizen Report Submission Modal (Task 3 & 2) */}
      <Modal open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
        <ModalContent size="lg">
          <ModalHeader>
            <ModalTitle>Laporkan Kondisi / Masalah Lapangan</ModalTitle>
            <ModalDescription>
              Bantu sesama warga dan pelaku UMKM dengan melaporkan kondisi jalan, banjir, atau fasilitas umum.
            </ModalDescription>
          </ModalHeader>

          <form onSubmit={handleSubmitReport}>
            <ModalBody className="space-y-4">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-ink">Judul Kejadian *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Aspal amblas di depan Pasar Simpang"
                  className="mt-1.5 w-full rounded-xl border border-[#e2e2ec] bg-white px-3.5 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-ink">Kategori Laporan *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#e2e2ec] bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink">Tingkat Urgensi</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="mt-1.5 w-full rounded-xl border border-[#e2e2ec] bg-white px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                  >
                    <option value="low">Rendah (Dapat dihindari)</option>
                    <option value="medium">Sedang (Mengganggu mobilitas)</option>
                    <option value="high">Tinggi / Darurat (Membahayakan)</option>
                  </select>
                </div>
              </div>

              {/* Coordinates with auto-locate */}
              <div className="rounded-xl bg-canvas p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-ink">Titik Koordinat Lokasi</span>
                  <button
                    type="button"
                    onClick={handleAutoLocate}
                    className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <Compass size={12} />
                    <span>Deteksi GPS Saya</span>
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                    placeholder="Latitude"
                    className="rounded-lg border border-[#e2e2ec] bg-white px-2.5 py-1.5 text-xs text-ink"
                  />
                  <input
                    type="number"
                    step="0.000001"
                    value={lng}
                    onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                    placeholder="Longitude"
                    className="rounded-lg border border-[#e2e2ec] bg-white px-2.5 py-1.5 text-xs text-ink"
                  />
                </div>
              </div>

              {/* Photo Upload with Preview */}
              <div>
                <label className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Camera size={13} className="text-primary" />
                  <span>Unggah Foto Bukti Lapangan (Maks 3 foto)</span>
                </label>

                <div className="mt-2 flex flex-wrap gap-2.5">
                  {photoPreviews.map((url, idx) => (
                    <div key={idx} className="relative h-20 w-24 overflow-hidden rounded-xl border border-[#ececf6]">
                      <img src={url} alt="Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}

                  {photoPreviews.length < 3 && (
                    <label className="flex h-20 w-24 flex-col items-center justify-center rounded-xl border border-dashed border-[#d0d0e0] bg-canvas/50 text-muted cursor-pointer hover:border-primary hover:text-primary transition-colors">
                      <Upload size={16} />
                      <span className="mt-1 text-[10px] font-medium">Pilih Foto</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink">Catatan Keterangan</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail patokan jalan, arah arus lalu lintas, atau waktu kejadian..."
                  className="mt-1.5 w-full rounded-xl border border-[#e2e2ec] bg-white px-3.5 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>
            </ModalBody>

            <ModalFooter>
              <ClayButton
                type="button"
                variant="secondary"
                onClick={() => setSubmitModalOpen(false)}
                disabled={submitting}
                className="text-xs"
              >
                Batal
              </ClayButton>
              <ClayButton
                type="submit"
                variant="primary"
                disabled={submitting}
                className="text-xs"
              >
                {submitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin mr-1" />
                    Mengirim Laporan...
                  </>
                ) : (
                  "Kirim Laporan Lapangan"
                )}
              </ClayButton>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </Section>
  );
}
