import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getStorageUrl } from "@/context/userService";
import api from "@/context/apiClient";
import echo from "@/lib/echo";

// Breadcrumb map: path segment -> readable label
const BREADCRUMB_LABELS: Record<string, string> = {
  admin: "dashboard",
  reports: "moderasi laporan",
  "business-types": "katalog & bobot usaha",
  users: "manajemen pengguna",
  profile: "profil admin",
  "data-quality": "data quality center",
  "data-sources": "data sources & sync",
  "system-health": "system health & audit",
  create: "tambah baru",
  edit: "edit data",
  weights: "bobot spasial",
};

function Breadcrumb() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) {
    return (
      <span className="text-[12.5px] font-medium text-ink">
        dashboard
      </span>
    );
  }

  const crumbs = segments.map((seg, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    const isId =
      seg.length > 20 ||
      /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(seg) ||
      /^\d+$/.test(seg);

    const label = isId ? "detail" : (BREADCRUMB_LABELS[seg] ?? seg);
    const isLast = i === segments.length - 1;

    return { path, label, isLast };
  });

  return (
    <nav
      className="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap text-[12px] text-muted"
      aria-label="Breadcrumb"
    >
      {crumbs.map((crumb) => (
        <span
          key={crumb.path}
          className="flex shrink-0 items-center gap-1"
        >
          {!crumb.isLast ? (
            <>
              <Link
                to={crumb.path}
                className="font-medium lowercase text-muted no-underline transition-colors hover:text-ink"
              >
                {crumb.label}
              </Link>
              <ChevronRight
                size={11}
                className="shrink-0 text-muted/50"
              />
            </>
          ) : (
            <span className="font-semibold lowercase text-ink">
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

interface RecentReport {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface AdminNavbarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function AdminNavbar({
  collapsed,
  onToggleCollapse,
}: AdminNavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState<RecentReport[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load recent reports
  useEffect(() => {
    api
      .get("/reports", {
        params: {
          per_page: 8,
          status: "reported",
        },
      })
      .then((res) => {
        const raw = res.data?.data?.data ?? res.data?.data ?? [];

        setNotifications(
          (raw as any[])
            .filter((report: any) => !report.is_dismissed)
            .slice(0, 6)
            .map((report: any) => ({
              id: String(report.id),
              title: report.title,
              status: report.status,
              created_at: report.created_at,
            })),
        );
      })
      .catch((error) => {
        console.error("Gagal memuat notifikasi:", error);
      });
  }, []);

  // Real-time notifications using Laravel Reverb
  useEffect(() => {
    if (!user || user.role !== "admin") return;

    console.log("[Reverb] Memasang listener admin.reports");

    const channel = echo.private("admin.reports");

    channel.listen(".report.created", (event: RecentReport) => {
      console.log("[Reverb] Laporan baru diterima:", event);

      setNotifications((current) => {
        if (current.some((item) => item.id === String(event.id))) {
          return current;
        }

        return [
          {
            id: String(event.id),
            title: event.title,
            status: event.status,
            created_at: event.created_at,
          },
          ...current,
        ].slice(0, 6);
      });
    });

    return () => {
      echo.leave("admin.reports");
    };
  }, [user?.id, user?.role]);

  const handleDeleteNotification = async (
    e: React.MouseEvent,
    id: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await api.patch(`/reports/${id}/dismiss`);

      setNotifications((current) =>
        current.filter((notification) => notification.id !== id),
      );
    } catch (error) {
      console.error("Gagal menyembunyikan notifikasi:", error);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!search.trim()) return;

    navigate(`/admin/reports?search=${encodeURIComponent(search.trim())}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const unread = notifications.length;
  const avatarSrc = getStorageUrl(user?.profile_image);

  return (
    <header className="sticky top-0 z-40 flex min-h-14 w-full min-w-0 items-center gap-2 border-b border-[#ececf6] bg-white/95 px-3 py-2 backdrop-blur-md sm:gap-3 sm:px-5 lg:px-5">
      {/* Left: Sidebar toggle + Breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-slate-100 hover:text-ink"
            title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <PanelLeftClose size={17} />
            )}
          </button>
        )}

        <div className="min-w-0 flex-1 overflow-hidden">
          <Breadcrumb />
        </div>
      </div>

      {/* Center: Search, hidden on small screens */}
      <form
        onSubmit={handleSearch}
        className="hidden w-[200px] shrink-0 items-center gap-2 rounded-[10px] border border-[#e5e5f0] bg-slate-50/80 px-3 py-1.5 transition-all focus-within:border-primary focus-within:bg-white md:flex lg:w-[260px]"
      >
        <Search size={13} className="shrink-0 text-muted" />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari laporan civic..."
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-muted"
        />
      </form>

      {/* Right: Notifications + Profile */}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {/* Notifications */}
        <div ref={notifRef} className="relative shrink-0">
          <button
            type="button"
            id="admin-notifications-btn"
            onClick={() => {
              setNotifOpen((v) => !v);
              setProfileOpen(false);
            }}
            className="clay-press relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-[#e5e5f0] bg-white text-muted transition-colors hover:text-ink"
            aria-label="Notifikasi laporan"
            aria-expanded={notifOpen}
          >
            <Bell size={17} />

            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-11 z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-[14px] border border-[#ececf6] bg-white text-left shadow-xl">
              <div className="flex items-center justify-between gap-2 border-b border-[#f0f0f8] px-3 py-3 sm:px-4">
                <span className="font-display text-[13px] font-medium text-ink">
                  Laporan civic baru
                </span>

                {unread > 0 && (
                  <span className="shrink-0 rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600">
                    {unread} belum ditinjau
                  </span>
                )}
              </div>

              <div className="max-h-[min(18rem,60vh)] divide-y divide-[#f5f5fa] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 px-3 py-6 text-center text-[12.5px] text-muted sm:px-4">
                    <CheckCircle2
                      size={16}
                      className="shrink-0 text-emerald-500"
                    />
                    <span>Tidak ada antrean laporan baru</span>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-2 px-3 py-3 transition-colors hover:bg-slate-50/70 sm:px-4"
                    >
                      <Link
                        to="/admin/reports"
                        onClick={() => setNotifOpen(false)}
                        className="flex min-w-0 flex-1 items-start gap-3 no-underline"
                      >
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-amber-50 text-amber-600">
                          <AlertTriangle size={13} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="break-words text-[12.5px] font-medium text-ink">
                            {n.title}
                          </p>

                          <p className="mt-0.5 text-[11px] text-muted">
                            {new Date(n.created_at).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                      </Link>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteNotification(e, n.id)}
                        aria-label={`Hapus notifikasi ${n.title}`}
                        title="Hapus notifikasi"
                        className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-[#f0f0f8] px-3 py-2.5 sm:px-4">
                <Link
                  to="/admin/reports"
                  onClick={() => setNotifOpen(false)}
                  className="text-[12px] font-medium text-primary no-underline hover:underline"
                >
                  Buka moderasi laporan →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div ref={profileRef} className="relative shrink-0">
          <button
            type="button"
            id="admin-profile-btn"
            onClick={() => {
              setProfileOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="clay-press flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#e5e5f0] bg-primary-soft text-[12px] font-bold text-primary"
            aria-label="Profil administrator"
            aria-expanded={profileOpen}
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{(user?.name || "A")[0].toUpperCase()}</span>
            )}
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-11 z-50 w-[min(14rem,calc(100vw-1.5rem))] overflow-hidden rounded-[14px] border border-[#ececf6] bg-white p-1.5 text-left shadow-xl">
              <div className="border-b border-[#f0f0f8] px-3 py-2.5">
                <p className="truncate text-[13px] font-medium text-ink">
                  {user?.name || "Admin"}
                </p>

                <p className="truncate text-[11px] text-muted">
                  {user?.email}
                </p>

                <span className="mt-1 inline-block rounded-[5px] bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  administrator
                </span>
              </div>

              <div className="py-1">
                <Link
                  to="/admin/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-[12.5px] font-medium text-muted no-underline transition-colors hover:bg-slate-50 hover:text-ink"
                >
                  <User size={14} />
                  <span>profil akun</span>
                </Link>

                <Link
                  to="/admin/system-health"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-[12.5px] font-medium text-muted no-underline transition-colors hover:bg-slate-50 hover:text-ink"
                >
                  <Settings size={14} />
                  <span>status & audit sistem</span>
                </Link>
              </div>

              <div className="border-t border-[#f0f0f8] pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-3 py-2 text-left text-[12.5px] font-medium text-warning transition-colors hover:bg-red-50"
                >
                  <LogOut size={14} />
                  <span>keluar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}