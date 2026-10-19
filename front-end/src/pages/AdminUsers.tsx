import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Store,
  Search,
  Eye,
  Pencil,
  Trash2,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Navigation,
  FileText,
  Route,
  ExternalLink,
} from "lucide-react";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/id";

import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "@/context/userService";

import type {
  ManagedUser,
  ManagedUserDetail,
  UserReport,
  UserVendorRoute,
} from "@/context/userService";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { ClayButton } from "@/components/ui/ClayButton";
import { useDebounce } from "@/hooks/useDebounce";
import Spinner from "@/components/ui/Spinner";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/Modal";

interface ValidationErrors {
  name?: string[];
  role?: string[];
}

type UserRoleFilter = "all" | "admin" | "user";
type PageMode = "list" | "detail" | "edit";

// ─── Status badge helpers ─────────────────────────────────────────────────────
const reportStatusLabel: Record<string, string> = {
  reported: "Dilaporkan",
  verification: "Verifikasi",
  confirmed: "Dikonfirmasi",
  handled: "Ditangani",
  resolved: "Selesai",
  rejected: "Ditolak",
};

const reportStatusColor: Record<string, string> = {
  reported: "bg-amber-50 text-amber-700 border-amber-200",
  verification: "bg-blue-50 text-blue-700 border-blue-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  handled: "bg-teal-50 text-teal-700 border-teal-200",
  resolved: "bg-slate-50 text-slate-600 border-slate-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

const routeStatusLabel: Record<string, string> = {
  planned: "Direncanakan",
  active: "Aktif",
  completed: "Selesai",
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Page state
  const [mode, setMode] = useState<PageMode>("list");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [activeUser, setActiveUser] = useState<ManagedUser | null>(null);

  // User detail state
  const [userDetail, setUserDetail] = useState<ManagedUserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRoleFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Pagination state
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const perPage = 10;

  // List loading state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editValidationErrors, setEditValidationErrors] =
    useState<ValidationErrors>({});

  // Delete modal state
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Fetch paginated users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getUsers({
        search: debouncedSearch.trim(),
        role: role === "all" ? "" : role,
        per_page: perPage,
        from: fromDate || undefined,
        to: toDate || undefined,
        page: currentPage,
      });

      setUsers(result.users);
      setTotalUsers(result.meta.total);
      setLastPage(result.meta.last_page);

      if (result.meta.current_page !== currentPage) {
        setCurrentPage(result.meta.current_page);
      }
    } catch (err) {
      console.error("Gagal mengambil data pengguna:", err);
      setError("Gagal memuat daftar pengguna. Periksa koneksi jaringan Anda.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, role, fromDate, toDate, currentPage]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // Open user detail and fetch complete data from API
  const handleOpenDetail = async (user: ManagedUser) => {
    setActiveUser(user);
    setUserDetail(null);
    setDetailError(null);
    setLoadingDetail(true);
    setMode("detail");

    try {
      const detail = await getUserById(user.id);

      setUserDetail(detail);
      setActiveUser(detail);
    } catch (err) {
      console.error("Gagal mengambil detail pengguna:", err);
      setDetailError("Gagal memuat detail pengguna. Silakan coba lagi.");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Open edit form
  const handleOpenEdit = (user: ManagedUser) => {
    setActiveUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditError(null);
    setEditValidationErrors({});
    setMode("edit");
  };

  // Save user changes
  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!activeUser) return;

    try {
      setSavingEdit(true);
      setEditError(null);
      setEditValidationErrors({});

      const updated = await updateUser(activeUser.id, {
        name: editName.trim(),
        role: editRole,
      });

      setActiveUser((prev) => (prev ? { ...prev, ...updated } : null));

      // Refresh list data
      await fetchUsers();

      // Refresh detail data if available
      try {
        const detail = await getUserById(activeUser.id);
        setUserDetail(detail);
        setActiveUser(detail);
      } catch (detailErr) {
        console.error("Gagal memperbarui detail pengguna:", detailErr);
      }

      toast({
        title: "Pengguna diperbarui",
        description: `Data ${updated.name} berhasil disimpan.`,
        variant: "success",
      });

      setMode("detail");
    } catch (err: any) {
      const status = err.response?.status;
      const responseData = err.response?.data;

      if (status === 422 && responseData?.errors) {
        setEditValidationErrors(responseData.errors);
        return;
      }

      setEditError(
        responseData?.message ||
          err.message ||
          "Gagal memperbarui pengguna. Silakan coba lagi.",
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // Open delete confirmation
  const handleOpenDelete = (user: ManagedUser) => {
    if (currentUser && String(user.id) === String(currentUser.id)) {
      toast({
        title: "Tindakan ditolak",
        description:
          "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.",
        variant: "error",
      });
      return;
    }

    setDeletingUser(user);
    setDeleteError(null);
  };

  // Confirm user deletion
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    try {
      setIsDeleting(true);
      setDeleteError(null);

      await deleteUser(deletingUser.id);

      toast({
        title: "Pengguna dihapus",
        description: `Akun ${deletingUser.name} telah dihapus dari sistem.`,
        variant: "success",
      });

      const deletedId = deletingUser.id;
      setDeletingUser(null);

      if (activeUser && String(activeUser.id) === String(deletedId)) {
        setActiveUser(null);
        setUserDetail(null);
        setMode("list");
      }

      // If the last item on a page is deleted, go back one page.
      if (users.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      } else {
        await fetchUsers();
      }
    } catch (err: any) {
      setDeleteError(
        err.response?.data?.message ||
          err.message ||
          "Gagal menghapus pengguna. Silakan coba lagi.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Detail view
  if (mode === "detail" && activeUser) {
    if (loadingDetail) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Spinner size="md" />
          <p className="text-sm text-muted">Memuat detail pengguna...</p>
        </div>
      );
    }

    if (detailError || !userDetail) {
      return (
        <div className="space-y-4 py-16 text-center">
          <AlertCircle size={28} className="mx-auto text-rose-500" />

          <p className="text-sm text-rose-600">
            {detailError ?? "Data detail pengguna tidak tersedia."}
          </p>

          <div className="flex justify-center gap-2">
            <ClayButton
              variant="secondary"
              onClick={() => void handleOpenDetail(activeUser)}
            >
              Coba lagi
            </ClayButton>

            <ClayButton
              variant="secondary"
              onClick={() => {
                setMode("list");
                setActiveUser(null);
                setUserDetail(null);
              }}
            >
              Kembali
            </ClayButton>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto space-y-6 text-left">
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 border-b border-[#f0f0f8] pb-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => {
              setMode("list");
              setActiveUser(null);
              setUserDetail(null);
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] font-medium text-muted hover:text-ink"
          >
            <ArrowLeft size={14} />
            <span>Kembali ke daftar pengguna</span>
          </button>

          <div className="flex items-center gap-2">
            <ClayButton
              variant="secondary"
              onClick={() => handleOpenEdit(userDetail)}
            >
              <Pencil size={14} />
              <span>Edit data</span>
            </ClayButton>

            <button
              type="button"
              onClick={() => handleOpenDelete(userDetail)}
              className="clay-press inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12.5px] font-medium text-rose-700 hover:bg-rose-100"
            >
              <Trash2 size={14} />
              <span>Hapus akun</span>
            </button>
          </div>
        </div>

        {/* User profile */}
        <div className="clay space-y-6 rounded-[20px] bg-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-2xl font-bold text-primary shadow-xs">
              <span>{userDetail.name.charAt(0).toUpperCase()}</span>

              {userDetail.image && (
                <img
                  src={userDetail.image}
                  alt={`Foto ${userDetail.name}`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-[20px] font-medium text-ink">
                  {userDetail.name}
                </h2>

                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
                    userDetail.role === "admin"
                      ? "bg-primary-soft text-primary"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {userDetail.role === "admin" ? (
                    <ShieldCheck size={12} />
                  ) : (
                    <Store size={12} />
                  )}
                  <span>{userDetail.role}</span>
                </span>
              </div>

              <p className="mt-0.5 text-[13px] text-muted">
                {userDetail.email}
              </p>
            </div>
          </div>

          {/* User information */}
          <div className="grid gap-3 border-t border-[#f0f0f8] pt-4 sm:grid-cols-2">
            <div className="rounded-[12px] border border-slate-100 bg-slate-50 p-3.5">
              <span className="block text-[11px] font-medium text-muted">
                Tanggal bergabung
              </span>
              <p className="mt-1 font-display text-[14px] font-medium text-ink">
                {userDetail.joinedDate || "—"}
              </p>
            </div>

            <div className="rounded-[12px] border border-slate-100 bg-slate-50 p-3.5">
              <span className="block text-[11px] font-medium text-muted">
                Status verifikasi email
              </span>
              <p className="mt-1 flex items-center gap-1 font-display text-[14px] font-medium text-emerald-600">
                <CheckCircle2 size={13} />
                <span>Terverifikasi</span>
              </p>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid gap-3 border-t border-[#f0f0f8] pt-4 sm:grid-cols-3">
            <div className="rounded-[12px] border border-slate-100 bg-slate-50 p-3.5">
              <span className="block text-[11px] font-medium text-muted">
                Jumlah bisnis
              </span>
              <p className="mt-1 font-display text-xl font-semibold text-ink">
                {userDetail.businesses_count}
              </p>
            </div>

            <div className="rounded-[12px] border border-slate-100 bg-slate-50 p-3.5">
              <span className="block text-[11px] font-medium text-muted">
                Jumlah laporan
              </span>
              <p className="mt-1 font-display text-xl font-semibold text-ink">
                {userDetail.reports_count}
              </p>
            </div>

            <div className="rounded-[12px] border border-slate-100 bg-slate-50 p-3.5">
              <span className="block text-[11px] font-medium text-muted">
                Jumlah rute
              </span>
              <p className="mt-1 font-display text-xl font-semibold text-ink">
                {userDetail.vendorRoutes_count}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          {/* User businesses */}
          <div className="clay space-y-4 rounded-[20px] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-medium text-ink">
                  Bisnis pengguna
                </h3>
                <p className="mt-1 text-[12.5px] text-muted">
                  Daftar bisnis terbaru milik pengguna ini.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-muted">
                {userDetail.businesses_count} total
              </span>
            </div>

            {userDetail.businesses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
                <Store size={24} className="mx-auto text-muted" />
                <p className="mt-2 text-sm font-medium text-ink">
                  Belum ada bisnis
                </p>
                <p className="mt-1 text-xs text-muted">
                  Pengguna ini belum mendaftarkan bisnis.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {userDetail.businesses.map((business) => (
                  <button
                    key={business.id}
                    type="button"
                    onClick={() => {
                      navigate(
                        `/view-maps?focusType=business&focusId=${business.id}`,
                      );
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    {business.image ? (
                      <img
                        src={business.image}
                        alt={business.name}
                        className="size-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                        <Store size={18} className="text-primary" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {business.name}
                      </p>

                      <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted">
                        <MapPin size={12} className="shrink-0" />
                        <span>
                          {business.address || "Alamat belum tersedia"}
                        </span>
                      </p>

                      {business.description && (
                        <p className="mt-1 line-clamp-1 text-xs text-muted">
                          {business.description}
                        </p>
                      )}
                    </div>

                    <ExternalLink size={14} className="shrink-0 text-muted" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User reports */}
          <div className="clay space-y-4 rounded-[20px] bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-medium text-ink">
                  Laporan pengguna
                </h3>
                <p className="mt-1 text-[12.5px] text-muted">
                  Laporan infrastruktur terbaru dari pengguna ini.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-muted">
                {userDetail.reports_count} total
              </span>
            </div>

            {userDetail.reports.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
                <FileText size={24} className="mx-auto text-muted" />
                <p className="mt-2 text-sm font-medium text-ink">
                  Belum ada laporan
                </p>
                <p className="mt-1 text-xs text-muted">
                  Pengguna ini belum membuat laporan.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(userDetail.reports as UserReport[]).map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => {
                      if (report.latitude == null || report.longitude == null) {
                        toast({
                          title: "Koordinat tidak tersedia",
                          description:
                            "Laporan ini tidak memiliki koordinat lokasi.",
                          variant: "error",
                        });
                        return;
                      }
                      navigate(
                        `/view-maps?focusType=report&focusId=${report.id}`,
                      );
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5 disabled:cursor-default"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rose-50">
                      <FileText size={16} className="text-rose-500" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {report.title}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                            reportStatusColor[report.status] ??
                            "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {reportStatusLabel[report.status] ?? report.status}
                        </span>
                        <span className="text-[10px] text-muted">
                          {report.latitude != null && report.longitude != null
                            ? `${Number(report.latitude).toFixed(4)}, ${Number(report.longitude).toFixed(4)}`
                            : "Koordinat tidak tersedia"}
                        </span>
                      </div>
                    </div>

                    {report.latitude != null && (
                      <ExternalLink size={14} className="shrink-0 text-muted" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User routes */}
        <div className="clay space-y-4 rounded-[20px] bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-medium text-ink">
                Rute pengguna
              </h3>
              <p className="mt-1 text-[12.5px] text-muted">
                Rute usaha keliling terbaru milik pengguna ini.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-muted">
              {userDetail.vendorRoutes_count} total
            </span>
          </div>

          {userDetail.vendorRoutes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
              <Route size={24} className="mx-auto text-muted" />
              <p className="mt-2 text-sm font-medium text-ink">
                Belum ada rute
              </p>
              <p className="mt-1 text-xs text-muted">
                Pengguna ini belum membuat rute usaha keliling.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {(userDetail.vendorRoutes as UserVendorRoute[]).map((route) => (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => {
                    if (!route.waypoints || route.waypoints.length < 2) {
                      toast({
                        title: "Data rute tidak lengkap",
                        description:
                          "Rute ini tidak memiliki waypoint yang cukup untuk ditampilkan.",
                        variant: "error",
                      });
                      return;
                    }
                    // Simpan waypoints ke sessionStorage sebagai bridge
                    // karena endpoint /vendor-routes/{id} hanya accessible oleh pemilik
                    sessionStorage.setItem(
                      `lociva_focus_route_${route.id}`,
                      JSON.stringify(route.waypoints),
                    );
                    navigate(`/view-maps?focusType=route&focusId=${route.id}`);
                  }}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                    <Navigation size={16} className="text-emerald-600" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {route.name}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {route.status && (
                        <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          {routeStatusLabel[route.status] ?? route.status}
                        </span>
                      )}
                      <span className="text-[10px] text-muted">
                        {route.waypoints?.length ?? 0} titik singgah
                        {route.distance != null
                          ? ` · ${route.distance.toFixed(1)} km`
                          : ""}
                      </span>
                    </div>
                  </div>

                  <ExternalLink size={14} className="shrink-0 text-muted" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Edit view
  if (mode === "edit" && activeUser) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 text-left">
        <div className="flex items-center justify-between border-b border-[#f0f0f8] pb-4">
          <button
            type="button"
            onClick={() => setMode(userDetail ? "detail" : "list")}
            className="inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] font-medium text-muted hover:text-ink"
          >
            <ArrowLeft size={14} />
            <span>Batal & kembali</span>
          </button>

          <h2 className="font-display text-[16px] font-medium text-ink">
            Edit pengguna
          </h2>
        </div>

        {editError && (
          <div className="flex items-center gap-2 rounded-[12px] border border-rose-100 bg-rose-50 p-3.5 text-[12.5px] text-rose-700">
            <AlertCircle size={16} className="shrink-0" />
            <span>{editError}</span>
          </div>
        )}

        <form
          onSubmit={handleSaveEdit}
          className="clay space-y-5 rounded-[20px] bg-white p-6"
        >
          <div>
            <label className="block text-[12.5px] font-medium text-ink">
              Nama lengkap pengguna <span className="text-rose-500">*</span>
            </label>

            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-[#e5e5f0] bg-white px-3.5 py-2 text-[13px] text-ink outline-none focus:border-primary"
            />

            {editValidationErrors.name?.[0] && (
              <p className="mt-1 text-[11px] text-rose-600">
                {editValidationErrors.name[0]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-ink">
              Alamat email (hanya baca)
            </label>

            <input
              type="text"
              disabled
              value={activeUser.email}
              className="mt-1 w-full cursor-not-allowed rounded-[10px] border border-[#e5e5f0] bg-slate-50 px-3.5 py-2 text-[13px] text-muted outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-ink">
              Peran dalam sistem (role) <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label
                className={`clay-soft flex cursor-pointer items-center gap-3 rounded-[12px] border p-3.5 transition-all ${
                  editRole === "user"
                    ? "border-primary bg-primary/5"
                    : "border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name="edit-role"
                  value="user"
                  checked={editRole === "user"}
                  onChange={() => setEditRole("user")}
                  className="size-4 text-primary"
                />

                <div>
                  <p className="text-[13px] font-medium text-ink">
                    User (pelaku UMKM)
                  </p>
                  <p className="text-[11px] text-muted">
                    Akses publik & analisis lokasi
                  </p>
                </div>
              </label>

              <label
                className={`clay-soft flex cursor-pointer items-center gap-3 rounded-[12px] border p-3.5 transition-all ${
                  editRole === "admin"
                    ? "border-primary bg-primary/5"
                    : "border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name="edit-role"
                  value="admin"
                  checked={editRole === "admin"}
                  onChange={() => setEditRole("admin")}
                  className="size-4 text-primary"
                />

                <div>
                  <p className="text-[13px] font-medium text-ink">
                    Administrator
                  </p>
                  <p className="text-[11px] text-muted">
                    Akses moderasi & kontrol sistem
                  </p>
                </div>
              </label>
            </div>

            {editValidationErrors.role?.[0] && (
              <p className="mt-1 text-[11px] text-rose-600">
                {editValidationErrors.role[0]}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-[#f0f0f8] pt-4">
            <ClayButton
              variant="secondary"
              type="button"
              disabled={savingEdit}
              onClick={() => setMode(userDetail ? "detail" : "list")}
            >
              Batal
            </ClayButton>

            <button
              type="submit"
              disabled={savingEdit}
              className="clay-primary inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] px-5 py-2 text-[12.5px] font-medium text-white disabled:opacity-50"
            >
              {savingEdit && <Spinner size="sm" />}
              <span>{savingEdit ? "Menyimpan..." : "Simpan perubahan"}</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-[#f0f0f8] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-[22px] font-medium tracking-tight text-ink sm:text-[24px]">
            Manajemen pengguna
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Kelola akun pengguna terdaftar, verifikasi peran, dan izin akses
            sistem LOCIVA.
          </p>
        </div>

        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-[11.5px] font-medium text-muted">
          Total {totalUsers} pengguna terdaftar
        </span>
      </div>

      {/* Search and filters */}

      {/* Search and filters */}
      <div className="clay flex flex-wrap items-center gap-3 rounded-[16px] bg-white p-4">
        {/* Search */}
        <div className="relative w-full sm:w-52">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari pengguna..."
            className="w-full rounded-[10px] border border-[#e5e5f0] bg-white py-2 pl-8 pr-3 text-[12.5px] text-ink outline-none focus:border-primary"
          />
        </div>

        {/* Role filter */}
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as UserRoleFilter);
            setCurrentPage(1);
          }}
          className="w-full cursor-pointer rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-2 text-[12px] text-ink outline-none focus:border-primary sm:w-40"
        >
          <option value="all">Semua peran</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        {/* Date filters */}
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="id">
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
            <DatePicker
              label="Dari tanggal"
              format="DD/MM/YYYY"
              value={fromDate ? dayjs(fromDate) : null}
              maxDate={toDate ? dayjs(toDate) : undefined}
              onChange={(value: Dayjs | null) => {
                setFromDate(value?.isValid() ? value.format("YYYY-MM-DD") : "");
                setCurrentPage(1);
              }}
              slotProps={{
                textField: {
                  size: "small",
                  sx: {
                    width: { xs: "100%", sm: 165 },
                    "& .MuiInputBase-root": {
                      borderRadius: "10px",
                      fontSize: "12px",
                      backgroundColor: "#fff",
                    },
                    "& .MuiInputLabel-root": {
                      fontSize: "12px",
                    },
                  },
                },
              }}
            />

            <DatePicker
              label="Sampai tanggal"
              format="DD/MM/YYYY"
              value={toDate ? dayjs(toDate) : null}
              minDate={fromDate ? dayjs(fromDate) : undefined}
              onChange={(value: Dayjs | null) => {
                setToDate(value?.isValid() ? value.format("YYYY-MM-DD") : "");
                setCurrentPage(1);
              }}
              slotProps={{
                textField: {
                  size: "small",
                  sx: {
                    width: { xs: "100%", sm: 165 },
                    "& .MuiInputBase-root": {
                      borderRadius: "10px",
                      fontSize: "12px",
                      backgroundColor: "#fff",
                    },
                    "& .MuiInputLabel-root": {
                      fontSize: "12px",
                    },
                  },
                },
              }}
            />
          </div>
        </LocalizationProvider>

        {/* Reset filter */}
        {(fromDate || toDate || search || role !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setRole("all");
              setFromDate("");
              setToDate("");
              setCurrentPage(1);
            }}
            className="cursor-pointer whitespace-nowrap text-[12px] font-medium text-primary hover:underline"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Users table */}
      <div className="clay overflow-hidden rounded-[16px] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[#ececf6] bg-slate-50/60 text-[11px] font-semibold text-muted">
              <tr>
                <th className="px-5 py-3">Pengguna</th>
                <th className="px-5 py-3">Peran sistem</th>
                <th className="px-5 py-3">Tanggal bergabung</th>
                <th className="px-5 py-3 text-right">Tindakan</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f0f0f8]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-muted">
                    <Spinner size="md" className="mx-auto mb-2 text-primary" />
                    <p className="text-[12.5px]">Memuat data pengguna...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-rose-600"
                  >
                    <p className="text-[13px]">{error}</p>
                    <button
                      type="button"
                      onClick={() => void fetchUsers()}
                      className="mt-2 cursor-pointer text-[12px] font-medium text-primary underline"
                    >
                      Coba lagi
                    </button>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-muted">
                    <p className="text-[13px] font-medium text-ink">
                      Tidak ada pengguna ditemukan
                    </p>
                    <p className="mt-0.5 text-[11.5px]">
                      Coba sesuaikan kata kunci pencarian atau filter peran.
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-slate-50/50"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-[12px] font-bold text-primary">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            item.name.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-medium text-ink">
                            <span>{item.name}</span>
                            {currentUser &&
                              String(item.id) === String(currentUser.id) && (
                                <span className="rounded-[4px] bg-primary/10 px-1 py-0.5 text-[9.5px] font-medium text-primary">
                                  Anda
                                </span>
                              )}
                          </p>

                          <p className="truncate text-[11px] text-muted">
                            {item.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
                          item.role === "admin"
                            ? "bg-primary-soft text-primary"
                            : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {item.role === "admin" ? (
                          <ShieldCheck size={11} />
                        ) : (
                          <Store size={11} />
                        )}
                        <span>{item.role}</span>
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-[12px] text-muted">
                      {item.joinedDate || "—"}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleOpenDetail(item)}
                          className="clay-press inline-flex cursor-pointer items-center gap-1 rounded-[6px] border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-muted hover:text-ink"
                        >
                          <Eye size={12} />
                          <span>Detail</span>
                        </button>

                        {/* <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="clay-press inline-flex cursor-pointer items-center gap-1 rounded-[6px] border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-muted hover:text-ink"
                        >
                          <Pencil size={12} />
                          <span>Edit</span>
                        </button> */}

                        {/* {(!currentUser ||
                          String(item.id) !== String(currentUser.id)) && (
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(item)}
                            className="clay-press ..."
                            title="Hapus akun pengguna"
                          >
                            <Trash2 size={12} />
                          </button>
                        )} */}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalUsers > 0 && (
          <div className="flex flex-col gap-3 border-t border-[#f0f0f8] px-5 py-3.5 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between">
            <div>
              Menampilkan halaman{" "}
              <span className="font-semibold text-ink">{currentPage}</span> dari{" "}
              <span className="font-semibold text-ink">{lastPage}</span> (total{" "}
              {totalUsers} pengguna)
            </div>

            <div className="flex items-center gap-1.5">
              <ClayButton
                variant="secondary"
                disabled={loading || currentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Sebelumnya
              </ClayButton>

              <ClayButton
                variant="secondary"
                disabled={loading || currentPage >= lastPage}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                Selanjutnya
              </ClayButton>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <Modal
        open={deletingUser !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeletingUser(null);
            setDeleteError(null);
          }
        }}
      >
        <ModalContent size="sm" showClose>
          {deletingUser && (
            <>
              <ModalHeader>
                <ModalTitle>Konfirmasi Hapus Pengguna</ModalTitle>
                <ModalDescription>
                  Apakah Anda yakin ingin menghapus akun{" "}
                  <strong>{deletingUser.name}</strong> ({deletingUser.email})?
                  Tindakan ini tidak dapat dibatalkan.
                </ModalDescription>
              </ModalHeader>

              {deleteError && (
                <div className="rounded-[10px] border border-rose-200 bg-rose-50 p-3 text-[12px] text-rose-700">
                  {deleteError}
                </div>
              )}

              <ModalFooter className="flex items-center justify-end gap-2 border-t border-[#ececf6] pt-3">
                <ClayButton
                  variant="secondary"
                  disabled={isDeleting}
                  onClick={() => setDeletingUser(null)}
                >
                  Batal
                </ClayButton>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => void handleConfirmDelete()}
                  className="clay-press inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] bg-rose-600 px-4 py-2 text-[12.5px] font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {isDeleting && <Spinner size="sm" />}
                  <span>
                    {isDeleting ? "Menghapus..." : "Ya, hapus pengguna"}
                  </span>
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
