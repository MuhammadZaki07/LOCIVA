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

import dayjs from "dayjs";

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

const reportStatusLabel: Record<string, string> = {
  reported: "Reported",
  verification: "Under Verification",
  confirmed: "Confirmed",
  handled: "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
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
  planned: "Planned",
  active: "Active",
  completed: "Completed",
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
      console.error("Failed to fetch users:", err);
      setError("Failed to load users. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, role, fromDate, toDate, currentPage]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  // Open user details
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
      console.error("Failed to fetch user details:", err);
      setDetailError("Failed to load user details. Please try again.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const getPageNumbers = (
    currentPage: number,
    lastPage: number,
  ): (number | "...")[] => {
    if (lastPage <= 7) {
      return Array.from({ length: lastPage }, (_, i) => i + 1);
    }

    const pages: (number | "...")[] = [];

    pages.push(1);

    const start = Math.max(2, currentPage - 2);
    const end = Math.min(lastPage - 1, currentPage + 2);

    if (start > 2) {
      pages.push("...");
    }

    for (let page = start; page <= end; page++) {
      pages.push(page);
    }

    if (end < lastPage - 1) {
      pages.push("...");
    }

    pages.push(lastPage);

    return pages;
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

      await fetchUsers();

      try {
        const detail = await getUserById(activeUser.id);
        setUserDetail(detail);
        setActiveUser(detail);
      } catch (detailErr) {
        console.error("Failed to refresh user details:", detailErr);
      }

      toast({
        title: "User Updated",
        description: `${updated.name} has been updated successfully.`,
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
          "Failed to update user. Please try again.",
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // Open delete confirmation
  const handleOpenDelete = (user: ManagedUser) => {
    if (currentUser && String(user.id) === String(currentUser.id)) {
      toast({
        title: "Action Denied",
        description: "You cannot delete your own active account.",
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
        title: "User Deleted",
        description: `The account belonging to ${deletingUser.name} has been deleted.`,
        variant: "success",
      });

      const deletedId = deletingUser.id;
      setDeletingUser(null);

      if (activeUser && String(activeUser.id) === String(deletedId)) {
        setActiveUser(null);
        setUserDetail(null);
        setMode("list");
      }

      // Move back one page if the last item on the current page is deleted.
      if (users.length === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      } else {
        await fetchUsers();
      }
    } catch (err: any) {
      setDeleteError(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete user. Please try again.",
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
          <p className="text-sm text-muted">Loading user details...</p>
        </div>
      );
    }

    if (detailError || !userDetail) {
      return (
        <div className="space-y-4 py-16 text-center">
          <AlertCircle size={28} className="mx-auto text-rose-500" />

          <p className="text-sm text-rose-600">
            {detailError ?? "User details are unavailable."}
          </p>

          <div className="flex justify-center gap-2">
            <ClayButton
              variant="secondary"
              onClick={() => void handleOpenDetail(activeUser)}
            >
              Try Again
            </ClayButton>

            <ClayButton
              variant="secondary"
              onClick={() => {
                setMode("list");
                setActiveUser(null);
                setUserDetail(null);
              }}
            >
              Back
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
            <span>Back to User List</span>
          </button>

          <div className="flex items-center gap-2">
            <ClayButton
              variant="secondary"
              onClick={() => handleOpenEdit(userDetail)}
            >
              <Pencil size={14} />
              <span>Edit User</span>
            </ClayButton>

            <button
              type="button"
              onClick={() => handleOpenDelete(userDetail)}
              className="clay-press inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12.5px] font-medium text-rose-700 hover:bg-rose-100"
            >
              <Trash2 size={14} />
              <span>Delete Account</span>
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
                  alt={`Photo of ${userDetail.name}`}
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
                Date Joined
              </span>
              <p className="mt-1 font-display text-[14px] font-medium text-ink">
                {userDetail.joinedDate || "—"}
              </p>
            </div>

            <div className="rounded-[12px] border border-slate-100 bg-slate-50 p-3.5">
              <span className="block text-[11px] font-medium text-muted">
                Email Verification Status
              </span>
              <p className="mt-1 flex items-center gap-1 font-display text-[14px] font-medium text-emerald-600">
                <CheckCircle2 size={13} />
                <span>Verified</span>
              </p>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid gap-3 border-t border-[#f0f0f8] pt-4 sm:grid-cols-3">
            <div className="rounded-[12px] border border-slate-100 bg-slate-50 p-3.5">
              <span className="block text-[11px] font-medium text-muted">
                Total Businesses
              </span>
              <p className="mt-1 font-display text-xl font-semibold text-ink">
                {userDetail.businesses_count}
              </p>
            </div>

            <div className="rounded-[12px] border border-slate-100 bg-slate-50 p-3.5">
              <span className="block text-[11px] font-medium text-muted">
                Total Reports
              </span>
              <p className="mt-1 font-display text-xl font-semibold text-ink">
                {userDetail.reports_count}
              </p>
            </div>

            <div className="rounded-[12px] border border-slate-100 bg-slate-50 p-3.5">
              <span className="block text-[11px] font-medium text-muted">
                Total Routes
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
                  User Businesses
                </h3>
                <p className="mt-1 text-[12.5px] text-muted">
                  Recent businesses registered by this user.
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
                  No Businesses Yet
                </p>
                <p className="mt-1 text-xs text-muted">
                  This user has not registered any businesses.
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
                        <span>{business.address || "Address unavailable"}</span>
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
                  User Reports
                </h3>
                <p className="mt-1 text-[12.5px] text-muted">
                  Recent infrastructure reports submitted by this user.
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
                  No Reports Yet
                </p>
                <p className="mt-1 text-xs text-muted">
                  This user has not submitted any reports.
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
                          title: "Coordinates Unavailable",
                          description:
                            "This report does not have location coordinates.",
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
                            : "Coordinates unavailable"}
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
                User Routes
              </h3>
              <p className="mt-1 text-[12.5px] text-muted">
                Recent mobile business routes created by this user.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-muted">
              {userDetail.vendorRoutes_count} total
            </span>
          </div>

          {userDetail.vendorRoutes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
              <Route size={24} className="mx-auto text-muted" />
              <p className="mt-2 text-sm font-medium text-ink">No Routes Yet</p>
              <p className="mt-1 text-xs text-muted">
                This user has not created any mobile business routes.
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
                        title: "Incomplete Route Data",
                        description:
                          "This route does not have enough waypoints to be displayed.",
                        variant: "error",
                      });
                      return;
                    }

                    // Store waypoints in sessionStorage as a bridge.
                    // The /vendor-routes/{id} endpoint is only accessible to the owner.
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
                        {route.waypoints?.length ?? 0} stops
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
            <span>Cancel and Go Back</span>
          </button>

          <h2 className="font-display text-[16px] font-medium text-ink">
            Edit User
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
              Full Name <span className="text-rose-500">*</span>
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
              Email Address (Read Only)
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
              System Role <span className="text-rose-500">*</span>
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
                    User (Business Owner)
                  </p>
                  <p className="text-[11px] text-muted">
                    Public Access & Location Analysis
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
                    Moderation & System Control
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
              Cancel
            </ClayButton>

            <button
              type="submit"
              disabled={savingEdit}
              className="clay-primary inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] px-5 py-2 text-[12.5px] font-medium text-white disabled:opacity-50"
            >
              {savingEdit && <Spinner size="sm" />}
              <span>{savingEdit ? "Saving..." : "Save Changes"}</span>
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
            User Management
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Manage registered user accounts, verify roles, and control access to
            the LOCIVA system.
          </p>
        </div>

        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-[11.5px] font-medium text-muted">
          Total {totalUsers} registered users
        </span>
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap items-center gap-3">
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
            placeholder="Search users..."
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
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>

        {/* Date range filter */}
        <div className="w-full sm:w-50">
          <DatePicker
            selectsRange
            startDate={fromDate ? dayjs(fromDate).toDate() : null}
            endDate={toDate ? dayjs(toDate).toDate() : null}
            onChange={(dates) => {
              const [start, end] = dates;

              setFromDate(start ? dayjs(start).format("YYYY-MM-DD") : "");
              setToDate(end ? dayjs(end).format("YYYY-MM-DD") : "");

              setCurrentPage(1);
            }}
            dateFormat="dd/MM/yyyy"
            placeholderText="Select date range"
            isClearable
            calendarClassName="lociva-calendar"
            wrapperClassName="w-full"
            className="w-full rounded-[10px] border border-[#e5e5f0] bg-white px-3 py-2 text-[12px] text-ink outline-none focus:border-primary"
          />
        </div>

        {/* Reset filters */}
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
            Reset Filters
          </button>
        )}
      </div>

      {/* Users table */}
      <div className="clay overflow-hidden rounded-[16px] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[#ececf6] bg-slate-50/60 text-[11px] font-semibold text-muted">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">System Role</th>
                <th className="px-5 py-3">Date Joined</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#f0f0f8]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-muted">
                    <Spinner size="md" className="mx-auto mb-2 text-primary" />
                    <p className="text-[12.5px]">Loading users...</p>
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
                      Try Again
                    </button>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-muted">
                    <p className="text-[13px] font-medium text-ink">
                      No Users Found
                    </p>
                    <p className="mt-0.5 text-[11.5px]">
                      Try adjusting your search keywords or role filter.
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
                                  You
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
                          <span>Details</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* User Pagination */}
        {totalUsers > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted">
              Page <strong>{currentPage}</strong> of <strong>{lastPage}</strong>
              {" ("}
              {totalUsers} users total
              {")"}
            </span>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1 || loading}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-ink transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              {getPageNumbers(currentPage, lastPage).map((page, index) =>
                page === "..." ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1 text-slate-400"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    disabled={loading || currentPage === page}
                    className={`min-w-9 rounded-xl px-3 py-2 text-xs font-bold transition disabled:cursor-default ${
                      currentPage === page
                        ? "bg-primary text-white"
                        : "border border-slate-200 bg-white text-ink hover:bg-slate-100"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(lastPage, prev + 1))
                }
                disabled={currentPage >= lastPage || loading}
                className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white transition hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
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
                <ModalTitle>Confirm User Deletion</ModalTitle>
                <ModalDescription>
                  Are you sure you want to delete the account belonging to{" "}
                  <strong>{deletingUser.name}</strong> ({deletingUser.email})?
                  This action cannot be undone.
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
                  Cancel
                </ClayButton>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => void handleConfirmDelete()}
                  className="clay-press inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] bg-rose-600 px-4 py-2 text-[12.5px] font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {isDeleting && <Spinner size="sm" />}
                  <span>{isDeleting ? "Deleting..." : "Yes, Delete User"}</span>
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
