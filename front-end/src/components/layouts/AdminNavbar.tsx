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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getStorageUrl } from "@/context/userService";
import api from "@/context/apiClient";

// Breadcrumb map: path segment -> readable label (sentence case)
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
    // If segment is UUID or numeric ID, display as "detail" or "id"
    const isId =
      seg.length > 20 || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(seg) || /^\d+$/.test(seg);
    const label = isId ? "detail" : (BREADCRUMB_LABELS[seg] ?? seg);
    const isLast = i === segments.length - 1;
    return { path, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1.5 text-[12px] text-muted overflow-x-auto" aria-label="Breadcrumb">
      {crumbs.map((crumb) => (
        <span key={crumb.path} className="flex items-center gap-1.5 shrink-0">
          {!crumb.isLast ? (
            <>
              <Link
                to={crumb.path}
                className="hover:text-ink transition-colors no-underline text-muted font-medium lowercase"
              >
                {crumb.label}
              </Link>
              <ChevronRight size={11} className="text-muted/50" />
            </>
          ) : (
            <span className="font-semibold text-ink lowercase">{crumb.label}</span>
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

  // Notifications from new reports
  const [notifications, setNotifications] = useState<RecentReport[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get("/reports", { params: { per_page: 8, status: "reported" } })
      .then((res) => {
        const raw = res.data?.data?.data ?? res.data?.data ?? [];
        setNotifications(
          (raw as any[]).slice(0, 6).map((r: any) => ({
            id: String(r.id),
            title: r.title,
            status: r.status,
            created_at: r.created_at,
          }))
        );
      })
      .catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-[#ececf6] bg-white/90 lg:px-5 backdrop-blur-md px-8">
      {/* Left: Collapse toggle + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-[8px] text-muted hover:bg-slate-100 hover:text-ink cursor-pointer transition-colors shrink-0"
            title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <Breadcrumb />
        </div>
      </div>

      {/* Center: Search */}
      <form
        onSubmit={handleSearch}
        className="hidden sm:flex items-center gap-2 rounded-[10px] border border-[#e5e5f0] bg-slate-50/80 px-3 py-1.5 w-[200px] lg:w-[260px] focus-within:border-primary focus-within:bg-white transition-all"
      >
        <Search size={13} className="text-muted shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari laporan civic..."
          className="flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-muted"
        />
      </form>

      {/* Right: Notifications + Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            id="admin-notifications-btn"
            onClick={() => {
              setNotifOpen((v) => !v);
              setProfileOpen(false);
            }}
            className="clay-press relative flex h-8 w-8 items-center justify-center rounded-[8px] text-muted hover:text-ink border border-[#e5e5f0] bg-white cursor-pointer"
            aria-label="Notifikasi laporan"
          >
            <Bell size={15} />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-10 z-50 w-80 rounded-[14px] border border-[#ececf6] bg-white shadow-xl text-left">
              <div className="flex items-center justify-between border-b border-[#f0f0f8] px-4 py-3">
                <span className="font-display text-[13px] font-medium text-ink">
                  Laporan civic baru
                </span>
                {unread > 0 && (
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10.5px] font-medium text-rose-600 border border-rose-100">
                    {unread} belum ditinjau
                  </span>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[#f5f5fa]">
                {notifications.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-6 text-[12.5px] text-muted justify-center">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span>Tidak ada antrean laporan baru</span>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <Link
                      key={n.id}
                      to="/admin/reports"
                      onClick={() => setNotifOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 no-underline hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-amber-50 text-amber-600">
                        <AlertTriangle size={13} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-medium text-ink">{n.title}</p>
                        <p className="text-[11px] text-muted mt-0.5">
                          {new Date(n.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
              <div className="border-t border-[#f0f0f8] px-4 py-2.5">
                <Link
                  to="/admin/reports"
                  onClick={() => setNotifOpen(false)}
                  className="text-[12px] font-medium text-primary hover:underline no-underline"
                >
                  Buka moderasi laporan →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            id="admin-profile-btn"
            onClick={() => {
              setProfileOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="clay-press flex h-8 w-8 items-center justify-center rounded-full overflow-hidden border border-[#e5e5f0] bg-primary-soft text-[12px] font-bold text-primary cursor-pointer"
            aria-label="Profil administrator"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span>{(user?.name || "A")[0].toUpperCase()}</span>
            )}
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-10 z-50 w-56 rounded-[14px] border border-[#ececf6] bg-white p-1.5 shadow-xl text-left">
              <div className="border-b border-[#f0f0f8] px-3 py-2.5">
                <p className="truncate text-[13px] font-medium text-ink">{user?.name || "Admin"}</p>
                <p className="truncate text-[11px] text-muted">{user?.email}</p>
                <span className="mt-1 inline-block rounded-[5px] bg-primary-soft px-1.5 py-0.2 text-[10px] font-medium text-primary">
                  administrator
                </span>
              </div>

              <div className="py-1">
                <Link
                  to="/admin/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-[12.5px] font-medium text-muted hover:bg-slate-50 hover:text-ink no-underline transition-colors"
                >
                  <User size={14} />
                  <span>profil akun</span>
                </Link>

                <Link
                  to="/admin/system-health"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-[12.5px] font-medium text-muted hover:bg-slate-50 hover:text-ink no-underline transition-colors"
                >
                  <Settings size={14} />
                  <span>status & audit sistem</span>
                </Link>
              </div>

              <div className="border-t border-[#f0f0f8] pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-[12.5px] font-medium text-warning hover:bg-red-50 no-underline transition-colors cursor-pointer"
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
