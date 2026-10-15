import { useState, useEffect, useCallback } from "react";
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
import { useDebounce } from "@/hooks/useDebounce";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";

interface ValidationErrors {
  name?: string[];
  role?: string[];
}

type UserRoleFilter = "all" | "admin" | "user";

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

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

  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const [savingEdit, setSavingEdit] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const [editError, setEditError] = useState<string | null>(null);
  const [editValidationErrors, setEditValidationErrors] =
    useState<ValidationErrors>({});

  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      console.error("Failed to get users:", err);
      setError("Failed to get users.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, role, fromDate, toDate, currentPage]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleRoleChange = (value: UserRoleFilter) => {
    setRole(value);
    setCurrentPage(1);
  };

  const handleOpenEdit = (user: ManagedUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditError(null);
    setEditValidationErrors({});
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      setSavingEdit(true);
      setEditError(null);
      setEditValidationErrors({});

      const updated = await updateUser(editingUser.id, {
        name: editName.trim(),
        role: editRole,
      });

      setSelectedUser((prev) =>
        prev?.id === updated.id ? { ...prev, ...updated } : prev,
      );

      setEditingUser(null);

      toast({
        title: "Success",
        description: `User ${updated.name} updated successfully.`,
        variant: "success",
      });

      await fetchUsers();
    } catch (err: unknown) {
      const errObj = err as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            errors?: ValidationErrors;
          };
        };
        message?: string;
      };

      const status = errObj.response?.status;
      const responseData = errObj.response?.data;

      if (status === 422 && responseData?.errors) {
        setEditValidationErrors(responseData.errors);
        return;
      }

      setEditError(
        responseData?.message ||
          errObj.message ||
          "Failed to update user. Please try again.",
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenDelete = (user: ManagedUser) => {
    if (currentUser && String(user.id) === String(currentUser.id)) {
      toast({
        title: "Action Denied",
        description: "You cannot delete your own account.",
        variant: "error",
      });
      return;
    }

    setDeletingUser(user);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    if (currentUser && String(deletingUser.id) === String(currentUser.id)) {
      setDeleteError("You cannot delete your own account.");
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError(null);

      const deletedUser = deletingUser;

      await deleteUser(deletedUser.id);

      if (selectedUser?.id === deletedUser.id) {
        setSelectedUser(null);
      }

      setDeletingUser(null);

      toast({
        title: "User Deleted",
        description: `User ${deletedUser.name} deleted successfully.`,
        variant: "success",
      });

      if (users.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      } else {
        await fetchUsers();
      }
    } catch (err: unknown) {
      console.error("Error deleting user:", err);

      const errMsg =
        err && typeof err === "object" && "response" in err
          ? (
              err as {
                response?: {
                  data?: { message?: string };
                };
              }
            ).response?.data?.message
          : null;

      setDeleteError(errMsg || "Failed to delete user. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

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
          {totalUsers} registered accounts
        </span>
      </div>

      {/* Search and Filters */}
      <div className="flex w-full flex-wrap items-end gap-3">
        {/* Search */}
        <div className="relative min-w-50 flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
            <Search size={15} />
          </div>

          <input
            type="text"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search by name or email..."
            className="clay-inset w-full rounded-[12px] py-2 pl-10 pr-4 text-[13.5px] text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Role */}
        <select
          value={role}
          onChange={(event) =>
            handleRoleChange(event.target.value as UserRoleFilter)
          }
          className="clay-inset w-full rounded-xl bg-white px-3.5 py-2 text-[13.5px] text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-auto"
          aria-label="Filter berdasarkan role"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>

        {/* From Date */}
        <div className="w-full sm:w-41.25">
          <label
            htmlFor="filter-from-date"
            className="mb-1.5 block text-[12px] font-medium text-ink"
          >
            Joined From
          </label>

          <input
            id="filter-from-date"
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) => {
              setFromDate(event.target.value);
              setCurrentPage(1);
            }}
            className="clay-inset w-full min-w-0 rounded-xl px-2 py-2 text-[13px] text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* To Date */}
        <div className="w-full sm:w-41.25">
          <label
            htmlFor="filter-to-date"
            className="mb-1.5 block text-[12px] font-medium text-ink"
          >
            Joined To
          </label>

          <input
            id="filter-to-date"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) => {
              setToDate(event.target.value);
              setCurrentPage(1);
            }}
            className="clay-inset w-full min-w-0 rounded-xl px-2 py-2 text-[13px] text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Reset */}
        <ClayButton
          variant="secondary"
          disabled={!fromDate && !toDate}
          onClick={() => {
            setFromDate("");
            setToDate("");
            setCurrentPage(1);
          }}
        >
          Reset
        </ClayButton>
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
                      <span>Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-red-500"
                  >
                    <div className="space-y-3">
                      <p>{error}</p>
                      <ClayButton
                        variant="secondary"
                        onClick={() => void fetchUsers()}
                      >
                        Try Again
                      </ClayButton>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-white/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-[12px] font-bold text-primary">
                          {user.image ? (
                            <img
                              src={user.image}
                              alt={`Profile ${user.name}`}
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div>
                          <p className="flex items-center gap-1.5 font-medium text-ink">
                            <span>{user.name}</span>
                            {currentUser &&
                              String(user.id) === String(currentUser.id) && (
                                <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                  You
                                </span>
                              )}
                          </p>
                          <p className="text-[11.5px] text-muted">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
                          user.role === "admin"
                            ? "bg-primary-soft text-primary"
                            : "bg-[#e8f6ee] text-potential"
                        }`}
                      >
                        {user.role === "admin" ? (
                          <ShieldCheck size={11} />
                        ) : (
                          <Store size={11} />
                        )}
                        {user.role}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-muted">
                      {user.activityCount ?? "-"} simulated actions
                    </td>

                    <td className="px-6 py-4 text-muted">{user.joinedDate}</td>

                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(user)}
                          title="Lihat detail pengguna"
                          aria-label={`Lihat detail ${user.name}`}
                          className="clay-press inline-flex items-center justify-center rounded-lg border border-[#ececf6] bg-white p-2 text-muted transition-colors hover:bg-primary-soft hover:text-primary"
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

      {/* Pagination */}
      {!loading && !error && lastPage > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Showing {Math.min((currentPage - 1) * perPage + 1, totalUsers)}-
            {Math.min(currentPage * perPage, totalUsers)} of {totalUsers} users
          </p>

          <div className="flex gap-2">
            <ClayButton
              variant="secondary"
              disabled={loading || currentPage <= 1}
              onClick={() => setCurrentPage((page) => page - 1)}
            >
              Previous
            </ClayButton>

            <ClayButton
              variant="secondary"
              disabled={loading || currentPage >= lastPage}
              onClick={() => setCurrentPage((page) => page + 1)}
            >
              Next
            </ClayButton>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      <Modal
        open={selectedUser !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedUser(null);
        }}
      >
        <ModalContent size="md" showClose>
          {selectedUser && (
            <>
              <ModalHeader>
                <ModalTitle id="user-detail-title">User Detail</ModalTitle>
                <ModalDescription>User account information.</ModalDescription>
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
                    <h3 className="wrap-break-word text-base font-semibold text-ink">
                      {selectedUser.name}
                    </h3>
                    <p className="break-all text-sm text-muted">
                      {selectedUser.email}
                    </p>

                    <span
                      className={`mt-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
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

                <div className="mt-6 space-y-4 rounded-xl bg-white/60 p-4">
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
                  onClick={() => handleOpenEdit(selectedUser)}
                >
                  <Pencil size={15} />
                  Edit
                </ClayButton>

                <ClayButton
                  variant="secondary"
                  className="!border-0 !bg-[#feecec] !text-[#c53030] hover:!bg-[#fddada]"
                  onClick={() => handleOpenDelete(selectedUser)}
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
          if (!open && !savingEdit) setEditingUser(null);
        }}
      >
        <ModalContent size="md" showClose={!savingEdit}>
          <ModalHeader>
            <ModalTitle id="edit-user-title">Edit User Data</ModalTitle>
            <ModalDescription>
              Edit user information and system role.
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
                <label
                  htmlFor="edit-user-name"
                  className="mb-1.5 block text-[12px] font-medium text-ink"
                >
                  User Name
                </label>

                <input
                  id="edit-user-name"
                  type="text"
                  value={editName}
                  onChange={(event) => {
                    setEditName(event.target.value);
                    setEditValidationErrors((prev) => ({
                      ...prev,
                      name: undefined,
                    }));
                  }}
                  disabled={savingEdit}
                  placeholder="Masukkan nama pengguna"
                  className={`clay-inset w-full rounded-xl px-3.5 py-2 text-[13.5px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 ${
                    editValidationErrors.name
                      ? "border border-warning focus:border-warning"
                      : "focus:border-primary"
                  }`}
                />

                {editValidationErrors.name && (
                  <p className="mt-1.5 flex items-center gap-1 text-[12px] text-warning">
                    <AlertCircle size={13} />
                    {editValidationErrors.name[0]}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="edit-user-role"
                  className="mb-1.5 block text-[12px] font-medium text-ink"
                >
                  System Role
                </label>

                <select
                  id="edit-user-role"
                  value={editRole}
                  onChange={(event) => {
                    setEditRole(event.target.value as "admin" | "user");
                    setEditValidationErrors((prev) => ({
                      ...prev,
                      role: undefined,
                    }));
                  }}
                  disabled={savingEdit}
                  className={`clay-inset w-full rounded-xl bg-white px-3.5 py-2 text-[13.5px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 ${
                    editValidationErrors.role
                      ? "border border-warning focus:border-warning"
                      : "focus:border-primary"
                  }`}
                >
                  <option value="user">User (Entrepreneur)</option>
                  <option value="admin">Admin (Administrator)</option>
                </select>

                {editValidationErrors.role && (
                  <p className="mt-1.5 flex items-center gap-1 text-[12px] text-warning">
                    <AlertCircle size={13} />
                    {editValidationErrors.role[0]}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="edit-user-email"
                  className="mb-1.5 block text-[12px] font-medium text-muted"
                >
                  Email (Read-only)
                </label>

                <input
                  id="edit-user-email"
                  type="email"
                  value={editingUser?.email || ""}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-[#ececf6] bg-[#f8f8fc] px-3.5 py-2 text-[13.5px] text-muted"
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
              onClick={() => void handleSaveEdit()}
              className="min-w-22.5"
            >
              {savingEdit ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
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
          if (!open && !isDeleting) setDeletingUser(null);
        }}
      >
        <ModalContent size="sm" showClose={!isDeleting}>
          <ModalHeader>
            <ModalTitle id="delete-user-title" className="text-warning">
              Delete User Confirmation
            </ModalTitle>
            <ModalDescription>
              This action cannot be undone. Deleting the user account will
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
              <div className="rounded-xl bg-[#fff8e7] p-3.5 text-[13px] text-ink">
                Are you sure you want to delete the user account{" "}
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
              Cancel
            </ClayButton>

            <ClayButton
              variant="secondary"
              disabled={isDeleting}
              onClick={() => void handleConfirmDelete()}
              className="!border-0 !bg-[#feecec] !text-[#c53030] hover:!bg-[#fddada]"
            >
              {isDeleting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Deleting...</span>
                </span>
              ) : (
                "Delete User"
              )}
            </ClayButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
