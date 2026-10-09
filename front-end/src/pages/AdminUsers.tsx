import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Store,
  Search,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getUsers, updateUser, deleteUser } from "@/context/userService";
import type { ManagedUser } from "@/context/userService";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { ClayButton } from "@/components/ui/ClayButton";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  // Edit User State
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete User State
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Gagal mengambil data pengguna:", err);
      setError("Gagal memuat data pengguna.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const handleOpenEdit = (u: ManagedUser) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    if (!editName.trim()) {
      setEditError("Nama pengguna tidak boleh kosong.");
      return;
    }

    try {
      setSavingEdit(true);
      setEditError(null);

      const updated = await updateUser(editingUser.id, {
        name: editName.trim(),
        role: editRole,
      });

      // Update state locally
      setUsers((prev) =>
        prev.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );

      if (selectedUser?.id === updated.id) {
        setSelectedUser((prev) => (prev ? { ...prev, ...updated } : null));
      }

      toast({
        title: "Berhasil",
        description: `Pengguna ${updated.name} berhasil diperbarui.`,
        variant: "success",
      });

      setEditingUser(null);
    } catch (err: unknown) {
      console.error("Error updating user:", err);
      const errMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : null;
      setEditError(errMsg || "Gagal memperbarui pengguna. Silakan coba lagi.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenDelete = (u: ManagedUser) => {
    if (currentUser && String(u.id) === String(currentUser.id)) {
      toast({
        title: "Tindakan Ditolak",
        description: "Anda tidak dapat menghapus akun Anda sendiri.",
        variant: "error",
      });
      return;
    }
    setDeletingUser(u);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    if (currentUser && String(deletingUser.id) === String(currentUser.id)) {
      setDeleteError("Anda tidak dapat menghapus akun Anda sendiri.");
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError(null);

      await deleteUser(deletingUser.id);

      setUsers((prev) => prev.filter((item) => item.id !== deletingUser.id));

      if (selectedUser?.id === deletingUser.id) {
        setSelectedUser(null);
      }

      toast({
        title: "Pengguna Dihapus",
        description: `Akun ${deletingUser.name} telah berhasil dihapus.`,
        variant: "success",
      });

      setDeletingUser(null);
    } catch (err: unknown) {
      console.error("Error deleting user:", err);
      const errMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : null;
      setDeleteError(errMsg || "Gagal menghapus pengguna. Silakan coba lagi.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-[26px] font-medium tracking-tight text-ink sm:text-[30px]">
            User & Stakeholder Directory
          </h1>
          <p className="mt-1 text-[13.5px] text-muted">
            Manage registered entrepreneurs, community contributors, and
            administrative privileges.
          </p>
        </div>

        <span className="w-fit rounded-full bg-primary-soft px-3 py-1 text-[12px] font-medium text-primary">
          {users.length} registered accounts
        </span>
      </div>

      {/* Search Input */}
      <div className="clay w-full rounded-[16px] p-4">
        <div className="relative w-full max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
            <Search size={15} />
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email address..."
            className="clay-inset w-full rounded-[12px] py-2 pl-10 pr-4 text-[13.5px] text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="clay overflow-hidden rounded-[20px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[#ececf6] bg-white/60 text-[11.5px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-6 py-3.5 font-medium">user profile</th>
                <th className="px-6 py-3.5 font-medium">system role</th>
                <th className="px-6 py-3.5 font-medium">activity</th>
                <th className="px-6 py-3.5 font-medium">joined date</th>
                <th className="px-6 py-3.5 text-right font-medium">actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f0f0f8]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2
                        size={16}
                        className="animate-spin text-primary"
                      />
                      <span>Memuat data pengguna...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-red-500"
                  >
                    {error}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted">
                    Tidak ada pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="transition-colors hover:bg-white/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-[12px] font-bold text-primary">
                          {u.image ? (
                            <img
                              src={u.image}
                              alt={`Profile ${u.name}`}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            u.name.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div>
                          <p className="font-medium text-ink flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {currentUser &&
                              String(u.id) === String(currentUser.id) && (
                                <span className="rounded-[4px] bg-primary/10 px-1.5 py-0.2 text-[10px] font-medium text-primary">
                                  Anda
                                </span>
                              )}
                          </p>
                          <p className="text-[11.5px] text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[11px] font-medium capitalize ${
                          u.role === "admin"
                            ? "bg-primary-soft text-primary"
                            : "bg-[#e8f6ee] text-potential"
                        }`}
                      >
                        {u.role === "admin" ? (
                          <ShieldCheck size={11} />
                        ) : (
                          <Store size={11} />
                        )}
                        {u.role}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-muted">
                      {u.activityCount ?? "-"} simulated actions
                    </td>

                    <td className="px-6 py-4 text-muted">{u.joinedDate}</td>

                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(u)}
                          title="Lihat detail pengguna"
                          aria-label={`Lihat detail ${u.name}`}
                          className="clay-press inline-flex items-center justify-center rounded-[8px] border border-[#ececf6] bg-white p-2 text-muted transition-colors hover:bg-primary-soft hover:text-primary"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Modal */}
      <Modal
        open={selectedUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUser(null);
          }
        }}
      >
        <ModalContent size="md" showClose>
          {selectedUser && (
            <>
              <ModalHeader>
                <ModalTitle id="user-detail-title">User Detail</ModalTitle>
                <ModalDescription>
                  User account information.
                </ModalDescription>
              </ModalHeader>
              <ModalBody>
                <div className="flex items-center gap-4">
                  <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-xl font-bold text-primary">
                    <span>{selectedUser.name.charAt(0).toUpperCase()}</span>
                    {selectedUser.image && (
                      <img
                        src={selectedUser.image}
                        alt={`Foto profil ${selectedUser.name}`}
                        className="absolute inset-0 h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="break-words text-base font-semibold text-ink">
                      {selectedUser.name}
                    </h3>
                    <p className="break-all text-sm text-muted">
                      {selectedUser.email}
                    </p>

                    <span
                      className={`mt-2 inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[11px] font-medium capitalize ${
                        selectedUser.role === "admin"
                          ? "bg-primary-soft text-primary"
                          : "bg-[#e8f6ee] text-potential"
                      }`}
                    >
                      {selectedUser.role === "admin" ? (
                        <ShieldCheck size={11} />
                      ) : (
                        <Store size={11} />
                      )}
                      {selectedUser.role}
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-4 rounded-[12px] bg-white/60 p-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                      Joined Date
                    </p>
                    <p className="mt-1 text-sm text-ink">
                      {selectedUser.joinedDate || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                      Activity
                    </p>
                    <p className="mt-1 text-sm text-ink">
                      {selectedUser.activityCount ?? "-"} simulated actions
                    </p>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter className="border-t border-[#ececf6] pt-4">
                <ClayButton
                  variant="secondary"
                  className="!border-0 !bg-[#e8edff] !text-[#4256a8] hover:!bg-[#dce4ff]"
                  onClick={() => {
                    if (selectedUser) {
                      handleOpenEdit(selectedUser);
                    }
                  }}
                >
                  <Pencil size={15} />
                  Edit
                </ClayButton>

                <ClayButton
                  variant="secondary"
                  className="!border-0 !bg-[#feecec] !text-[#c53030] hover:!bg-[#fddada]"
                  onClick={() => {
                    if (selectedUser) {
                      handleOpenDelete(selectedUser);
                    }
                  }}
                >
                  <Trash2 size={15} />
                  Delete
                </ClayButton>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        open={editingUser !== null}
        onOpenChange={(open) => {
          if (!open && !savingEdit) {
            setEditingUser(null);
          }
        }}
      >
        <ModalContent size="md" showClose={!savingEdit}>
          <ModalHeader>
            <ModalTitle id="edit-user-title">Edit Data Pengguna</ModalTitle>
            <ModalDescription>
              Ubah informasi pengguna dan peranan sistem.
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            {editError && (
              <div className="mb-4 flex items-center gap-2 rounded-[10px] bg-[#feecec] p-3 text-[12.5px] text-[#c53030]">
                <AlertCircle size={16} className="shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-ink">
                  Nama Pengguna
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={savingEdit}
                  placeholder="Masukkan nama pengguna"
                  className="clay-inset w-full rounded-[12px] py-2 px-3.5 text-[13.5px] text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-ink">
                  Role Sistem
                </label>
                <select
                  value={editRole}
                  onChange={(e) =>
                    setEditRole(e.target.value as "admin" | "user")
                  }
                  disabled={savingEdit}
                  className="clay-inset w-full rounded-[12px] py-2 px-3.5 text-[13.5px] text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 bg-white"
                >
                  <option value="user">User (Entrepreneur)</option>
                  <option value="admin">Admin (Administrator)</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-muted">
                  Email (Read-only)
                </label>
                <input
                  type="email"
                  value={editingUser?.email || ""}
                  disabled
                  className="w-full rounded-[12px] border border-[#ececf6] bg-[#f8f8fc] py-2 px-3.5 text-[13.5px] text-muted cursor-not-allowed"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="border-t border-[#ececf6] pt-4">
            <ClayButton
              variant="secondary"
              disabled={savingEdit}
              onClick={() => setEditingUser(null)}
            >
              Batal
            </ClayButton>

            <ClayButton
              variant="primary"
              disabled={savingEdit}
              onClick={handleSaveEdit}
              className="min-w-[90px]"
            >
              {savingEdit ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Menyimpan...</span>
                </span>
              ) : (
                "Simpan"
              )}
            </ClayButton>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        open={deletingUser !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeletingUser(null);
          }
        }}
      >
        <ModalContent size="sm" showClose={!isDeleting}>
          <ModalHeader>
            <ModalTitle id="delete-user-title" className="text-warning">
              Konfirmasi Hapus Pengguna
            </ModalTitle>
            <ModalDescription>
              Tindakan ini tidak dapat dibatalkan. Menghapus akun pengguna akan
              menghapus data aksesnya.
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            {deleteError && (
              <div className="mb-3 flex items-center gap-2 rounded-[10px] bg-[#feecec] p-3 text-[12.5px] text-[#c53030]">
                <AlertCircle size={16} className="shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {deletingUser && (
              <div className="rounded-[12px] bg-[#fff8e7] p-3.5 text-[13px] text-ink">
                Apakah Anda yakin ingin menghapus akun{" "}
                <span className="font-semibold">{deletingUser.name}</span> (
                {deletingUser.email})?
              </div>
            )}
          </ModalBody>
          <ModalFooter className="border-t border-[#ececf6] pt-4">
            <ClayButton
              variant="secondary"
              disabled={isDeleting}
              onClick={() => setDeletingUser(null)}
            >
              Batal
            </ClayButton>

            <ClayButton
              variant="secondary"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="!border-0 !bg-[#feecec] !text-[#c53030] hover:!bg-[#fddada]"
            >
              {isDeleting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Menghapus...</span>
                </span>
              ) : (
                "Hapus Pengguna"
              )}
            </ClayButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
