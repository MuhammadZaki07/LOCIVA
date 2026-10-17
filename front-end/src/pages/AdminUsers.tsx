import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { getUsers, updateUser, deleteUser } from "@/context/userService";
import type { ManagedUser } from "@/context/userService";
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

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<PageMode>("list");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRoleFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const perPage = 10;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeUser, setActiveUser] = useState<ManagedUser | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editValidationErrors, setEditValidationErrors] = useState<ValidationErrors>({});

  // Delete modal state
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

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
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenDetail = (user: ManagedUser) => {
    setActiveUser(user);
    setMode("detail");
  };

  const handleOpenEdit = (user: ManagedUser) => {
    setActiveUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditError(null);
    setEditValidationErrors({});
    setMode("edit");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
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

      toast({
        title: "Pengguna diperbarui",
        description: `Data ${updated.name} berhasil disimpan.`,
        variant: "success",
      });

      await fetchUsers();
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
          "Gagal memperbarui pengguna. Silakan coba lagi."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenDelete = (user: ManagedUser) => {
    if (currentUser && String(user.id) === String(currentUser.id)) {
      toast({
        title: "Tindakan ditolak",
        description: "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.",
        variant: "error",
      });
      return;
    }

    setDeletingUser(user);
    setDeleteError(null);
  };

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

      setDeletingUser(null);
      if (mode !== "list") {
        setMode("list");
        setActiveUser(null);
      }
      await fetchUsers();
    } catch (err: any) {
      setDeleteError(
        err.response?.data?.message ||
          err.message ||
          "Gagal menghapus pengguna. Silakan coba lagi."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render Detail View ──────────────────────────────────────────────────────
  if (mode === "detail" && activeUser) {
    return (
      <div className="space-y-6 text-left max-w-4xl mx-auto">
        {/* Breadcrumb / Back button */}
        <div className="flex items-center justify-between border-b border-[#f0f0f8] pb-4">
          <button
            type="button"
            onClick={() => setMode("list")}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted hover:text-ink cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>kembali ke daftar pengguna</span>
          </button>

          <div className="flex items-center gap-2">
            <ClayButton
              variant="secondary"
              onClick={() => handleOpenEdit(activeUser)}
            >
              <Pencil size={14} />
              <span>edit data</span>
            </ClayButton>

            <button
              type="button"
              onClick={() => handleOpenDelete(activeUser)}
              className="clay-press inline-flex items-center gap-1.5 rounded-[10px] bg-rose-50 border border-rose-200 px-3 py-1.5 text-[12.5px] font-medium text-rose-700 hover:bg-rose-100 cursor-pointer"
            >
              <Trash2 size={14} />
              <span>hapus akun</span>
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="clay rounded-[20px] p-6 bg-white space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-2xl font-bold text-primary shadow-xs">
              <span>{activeUser.name.charAt(0).toUpperCase()}</span>
              {activeUser.image && (
                <img
                  src={activeUser.image}
                  alt={`Foto ${activeUser.name}`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-[20px] font-medium text-ink">
                  {activeUser.name}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
                    activeUser.role === "admin"
                      ? "bg-primary-soft text-primary"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {activeUser.role === "admin" ? <ShieldCheck size={12} /> : <Store size={12} />}
                  <span>{activeUser.role}</span>
                </span>
              </div>
              <p className="text-[13px] text-muted mt-0.5">{activeUser.email}</p>
            </div>
          </div>

          {/* User Details Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-4 border-t border-[#f0f0f8]">
            <div className="rounded-[12px] bg-slate-50 p-3.5 border border-slate-100">
              <span className="text-[11px] text-muted font-medium block">
                tanggal bergabung
              </span>
              <p className="mt-1 font-display text-[14px] font-medium text-ink">
                {activeUser.joinedDate || "—"}
              </p>
            </div>

            <div className="rounded-[12px] bg-slate-50 p-3.5 border border-slate-100">
              <span className="text-[11px] text-muted font-medium block">
                status verifikasi email
              </span>
              <p className="mt-1 font-display text-[14px] font-medium text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={13} />
                <span>terverifikasi</span>
              </p>
            </div>

            <div className="rounded-[12px] bg-slate-50 p-3.5 border border-slate-100">
              <span className="text-[11px] text-muted font-medium block">
                aktivitas analitik
              </span>
              <p className="mt-1 font-display text-[14px] font-medium text-ink">
                {activeUser.activityCount ?? 0} aksi tercatat
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render Edit View ────────────────────────────────────────────────────────
  if (mode === "edit" && activeUser) {
    return (
      <div className="space-y-6 text-left max-w-2xl mx-auto">
        <div className="flex items-center justify-between border-b border-[#f0f0f8] pb-4">
          <button
            type="button"
            onClick={() => setMode("detail")}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted hover:text-ink cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>batal & kembali ke detail</span>
          </button>

          <h2 className="font-display text-[16px] font-medium text-ink">
            edit pengguna
          </h2>
        </div>

        {editError && (
          <div className="flex items-center gap-2 rounded-[12px] bg-rose-50 p-3.5 text-[12.5px] text-rose-700 border border-rose-100">
            <AlertCircle size={16} className="shrink-0" />
            <span>{editError}</span>
          </div>
        )}

        <form onSubmit={handleSaveEdit} className="clay rounded-[20px] p-6 bg-white space-y-5">
          <div>
            <label className="block text-[12.5px] font-medium text-ink">
              nama lengkap pengguna <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1 w-full rounded-[10px] border border-[#e5e5f0] bg-white px-3.5 py-2 text-[13px] text-ink outline-none focus:border-primary"
            />
            {editValidationErrors.name?.[0] && (
              <p className="mt-1 text-[11px] text-rose-600">{editValidationErrors.name[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-ink">
              alamat email (hanya baca)
            </label>
            <input
              type="text"
              disabled
              value={activeUser.email}
              className="mt-1 w-full rounded-[10px] border border-[#e5e5f0] bg-slate-50 px-3.5 py-2 text-[13px] text-muted outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-ink mb-1.5">
              peran dalam sistem (role) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`clay-soft flex items-center gap-3 rounded-[12px] p-3.5 cursor-pointer border transition-all ${
                  editRole === "user" ? "border-primary bg-primary/5" : "border-slate-200"
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
                  <p className="text-[13px] font-medium text-ink">user (pelaku UMKM)</p>
                  <p className="text-[11px] text-muted">akses publik & analisis lokasi</p>
                </div>
              </label>

              <label
                className={`clay-soft flex items-center gap-3 rounded-[12px] p-3.5 cursor-pointer border transition-all ${
                  editRole === "admin" ? "border-primary bg-primary/5" : "border-slate-200"
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
                  <p className="text-[13px] font-medium text-ink">administrator</p>
                  <p className="text-[11px] text-muted">akses moderasi & kontrol sistem</p>
                </div>
              </label>
            </div>
            {editValidationErrors.role?.[0] && (
              <p className="mt-1 text-[11px] text-rose-600">{editValidationErrors.role[0]}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#f0f0f8]">
            <ClayButton
              variant="secondary"
              type="button"
              disabled={savingEdit}
              onClick={() => setMode("detail")}
            >
              batal
            </ClayButton>

            <button
              type="submit"
              disabled={savingEdit}
              className="clay-primary inline-flex items-center gap-1.5 rounded-[10px] px-5 py-2 text-[12.5px] font-medium text-white cursor-pointer disabled:opacity-50"
            >
              {savingEdit && <Spinner size="sm" />}
              <span>{savingEdit ? "menyimpan..." : "simpan perubahan"}</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Render List View ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f0f8] pb-4">
        <div>
          <h1 className="font-display text-[22px] font-medium tracking-tight text-ink sm:text-[24px]">
            manajemen pengguna
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            kelola akun pengguna terdaftar, verifikasi peran, dan izin akses sistem LOCIVA.
          </p>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-[11.5px] font-medium text-muted">
          total {totalUsers} pengguna terdaftar
        </span>
      </div>

      {/* Toolbar: Proportional Search & Filters */}
      <div className="clay flex flex-wrap items-center justify-between gap-3 rounded-[16px] p-4 bg-white">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          {/* Proportional Search */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full rounded-[10px] border border-[#e5e5f0] bg-white pl-8 pr-3 py-1.5 text-[12.5px] text-ink outline-none focus:border-primary"
            />
          </div>

          {/* Role Filter */}
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as UserRoleFilter);
              setCurrentPage(1);
            }}
            className="rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-1.5 text-[12px] font-medium text-ink outline-none focus:border-primary cursor-pointer"
          >
            <option value="all">semua peran</option>
            <option value="user">user (pelaku UMKM)</option>
            <option value="admin">administrator</option>
          </select>

          {/* Date range filters */}
          <div className="hidden md:flex items-center gap-1.5 text-[12px] text-muted">
            <span>dari:</span>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-[8px] border border-[#e5e5f0] bg-white px-2 py-1 text-[11.5px] text-ink outline-none focus:border-primary"
            />
            <span>ke:</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-[8px] border border-[#e5e5f0] bg-white px-2 py-1 text-[11.5px] text-ink outline-none focus:border-primary"
            />
          </div>
        </div>

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
            className="text-[12px] font-medium text-primary hover:underline cursor-pointer"
          >
            reset filter
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="clay overflow-hidden rounded-[16px] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[#ececf6] bg-slate-50/60 text-[11px] font-semibold text-muted">
              <tr>
                <th className="px-5 py-3">pengguna</th>
                <th className="px-5 py-3">peran sistem</th>
                <th className="px-5 py-3">tanggal bergabung</th>
                <th className="px-5 py-3 text-right">tindakan</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f0f0f8]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-muted">
                    <Spinner size="md" className="mx-auto mb-2 text-primary" />
                    <p className="text-[12.5px]">memuat data pengguna...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-rose-600">
                    <p className="text-[13px]">{error}</p>
                    <button
                      type="button"
                      onClick={() => void fetchUsers()}
                      className="mt-2 text-[12px] font-medium text-primary underline cursor-pointer"
                    >
                      coba lagi
                    </button>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-muted">
                    <p className="text-[13px] font-medium text-ink">tidak ada pengguna ditemukan</p>
                    <p className="mt-0.5 text-[11.5px]">coba sesuaikan kata kunci pencarian atau filter peran.</p>
                  </td>
                </tr>
              ) : (
                users.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-[12px] font-bold text-primary">
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
                          <p className="flex items-center gap-1.5 font-medium text-ink truncate">
                            <span>{item.name}</span>
                            {currentUser && String(item.id) === String(currentUser.id) && (
                              <span className="rounded-[4px] bg-primary/10 px-1 py-0.2 text-[9.5px] font-medium text-primary">
                                Anda
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted truncate">{item.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
                          item.role === "admin"
                            ? "bg-primary-soft text-primary"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {item.role === "admin" ? <ShieldCheck size={11} /> : <Store size={11} />}
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
                          onClick={() => handleOpenDetail(item)}
                          className="clay-press inline-flex items-center gap-1 rounded-[6px] border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-muted hover:text-ink cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>detail</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="clay-press inline-flex items-center gap-1 rounded-[6px] border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-muted hover:text-ink cursor-pointer"
                        >
                          <Pencil size={12} />
                          <span>edit</span>
                        </button>

                        <button
                          type="button"
                          disabled={Boolean(currentUser && String(item.id) === String(currentUser.id))}
                          onClick={() => handleOpenDelete(item)}
                          className="clay-press inline-flex items-center gap-1 rounded-[6px] border border-rose-200 bg-rose-50 px-2 py-1 text-[11.5px] font-medium text-rose-700 hover:bg-rose-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Hapus akun pengguna"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Standard Pagination Footer */}
        {totalUsers > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[#f0f0f8] px-5 py-3.5 text-[12px] text-muted">
            <div>
              menampilkan halaman <span className="font-semibold text-ink">{currentPage}</span> dari{" "}
              <span className="font-semibold text-ink">{lastPage}</span> (total {totalUsers} pengguna)
            </div>

            <div className="flex items-center gap-1.5">
              <ClayButton
                variant="secondary"
                disabled={loading || currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                sebelumnya
              </ClayButton>

              <ClayButton
                variant="secondary"
                disabled={loading || currentPage >= lastPage}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                selanjutnya
              </ClayButton>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (kept strictly for confirmation) */}
      <Modal
        open={deletingUser !== null}
        onOpenChange={(open) => {
          if (!open) {
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
                  Apakah Anda yakin ingin menghapus akun <strong>{deletingUser.name}</strong> ({deletingUser.email})? Tindakan ini tidak dapat dibatalkan.
                </ModalDescription>
              </ModalHeader>

              {deleteError && (
                <div className="p-3 text-[12px] text-rose-700 bg-rose-50 rounded-[10px] border border-rose-200">
                  {deleteError}
                </div>
              )}

              <ModalFooter className="border-t border-[#ececf6] pt-3 flex items-center justify-end gap-2">
                <ClayButton
                  variant="secondary"
                  disabled={isDeleting}
                  onClick={() => setDeletingUser(null)}
                >
                  batal
                </ClayButton>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="clay-press inline-flex items-center gap-1.5 rounded-[10px] bg-rose-600 px-4 py-2 text-[12.5px] font-medium text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                >
                  {isDeleting && <Spinner size="sm" />}
                  <span>{isDeleting ? "menghapus..." : "ya, hapus pengguna"}</span>
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
