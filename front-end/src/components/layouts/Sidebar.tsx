import { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Compass,
  LogOut,
  ShieldCheck,
  ExternalLink,
  UserIcon,
  AlertTriangle,
  Store,
  CheckCircle2,
  RefreshCw,
  Activity,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/sections/Logo";
import { getStorageUrl } from "@/context/userService";

interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  end?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navGroups: NavGroup[] = [
  {
    title: "Workspace",
    defaultOpen: true,
    items: [
      { to: "/admin", label: "dashboard overview", icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: "Location intelligence",
    defaultOpen: true,
    items: [
      { to: "/admin/reports", label: "moderasi laporan civic", icon: AlertTriangle },
      { to: "/admin/business-types", label: "katalog & bobot usaha", icon: Store },
    ],
  },
  {
    title: "Data management",
    defaultOpen: true,
    items: [
      { to: "/admin/data-quality", label: "data quality center", icon: CheckCircle2 },
      { to: "/admin/data-sources", label: "data sources & sync", icon: RefreshCw },
    ],
  },
  {
    title: "System",
    defaultOpen: true,
    items: [
      { to: "/admin/system-health", label: "system health & audit", icon: Activity },
      { to: "/admin/users", label: "manajemen pengguna", icon: Users },
      { to: "/admin/profile", label: "profil admin", icon: UserIcon },
    ],
  },
];

function NavGroupSection({
  group,
  onNavigate,
  collapsed,
}: {
  group: NavGroup;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const location = useLocation();
  const hasActiveChild = group.items.some((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );

  const [open, setOpen] = useState(hasActiveChild || (group.defaultOpen ?? true));

  if (collapsed) {
    return (
      <div className="space-y-1 py-1 border-b border-slate-100/80 last:border-0">
        {group.items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.to} className="relative group flex justify-center">
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                title={item.label}
                className={({ isActive }) =>
                  `clay-press flex h-10 w-10 items-center justify-center rounded-[10px] transition-all no-underline ${isActive
                    ? "clay-primary text-white shadow-sm"
                    : "text-muted hover:bg-slate-100 hover:text-ink"
                  }`
                }
              >
                <Icon size={18} />
              </NavLink>

              {/* Tooltip on hover */}
              <div className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 hidden rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white shadow-md group-hover:block whitespace-nowrap">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-semibold tracking-wider text-muted/80 hover:text-ink transition-colors cursor-pointer"
      >
        <span>{group.title}</span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      {open && (
        <div className="mt-0.5 space-y-0.5">
          {group.items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `clay-press flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[12.5px] font-medium transition-all no-underline ${isActive
                    ? "clay-primary text-white shadow-sm"
                    : "text-muted hover:bg-slate-100 hover:text-ink"
                  }`
                }
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  onNavigate,
  collapsed = false,
  onToggleCollapse: _onToggleCollapse,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    onNavigate?.();
    navigate("/login");
  };

  return (
    <aside className="flex w-full flex-col justify-between h-full text-left">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Header / Logo */}
        <div className={`flex items-center ${!collapsed ? "justify-none mb-3" : "justify-center"}`}>
          <Link
            to="/admin"
            onClick={onNavigate}
            className="flex items-center gap-2 font-display text-[18px] font-medium tracking-tight text-ink no-underline"
          >
            <Logo />
            {!collapsed && <span>lociva admin</span>}
          </Link>
        </div>

        {!collapsed && (
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <ShieldCheck size={11} className="text-primary" />
            <span>civic analytics moderation</span>
          </div>
        )}

        {/* Nav groups */}
        <nav className={`space-y-3 ${collapsed ? "mt-4" : "mt-6"}`}>
          {navGroups.map((group) => (
            <NavGroupSection
              key={group.title}
              group={group}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          ))}

          {/* Public map link */}
          <div className={`border-t border-[#ececf6] ${collapsed ? "pt-2" : "pt-3"}`}>
            {!collapsed && (
              <p className="px-2 text-[10.5px] font-semibold tracking-wider text-muted/70 lowercase">
                public app
              </p>
            )}
            <Link
              to="/view-maps"
              target="_blank"
              onClick={onNavigate}
              title="buka peta live interaktif"
              className={`clay-press flex items-center rounded-[10px] text-[12.5px] font-medium text-muted no-underline hover:bg-slate-100 hover:text-ink ${collapsed
                ? "h-10 w-10 justify-center mx-auto"
                : "mt-1 justify-between px-3 py-2"
                }`}
            >
              <div className="flex items-center gap-2.5">
                <Compass size={16} className="text-primary" />
                {!collapsed && <span>buka peta live</span>}
              </div>
              {!collapsed && <ExternalLink size={12} />}
            </Link>
          </div>
        </nav>
      </div>

      {/* Profile footer */}
      <div className={`clay mt-4 rounded-[14px] ${collapsed ? "p-2 text-center" : "p-3"}`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full overflow-hidden bg-primary-soft text-[12px] font-bold text-primary">
            {getStorageUrl(user?.profile_image) ? (
              <img
                src={getStorageUrl(user?.profile_image)!}
                alt="Photo"
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{(user?.name || "A")[0].toUpperCase()}</span>
            )}
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-ink">
                {user?.name || "admin"}
              </p>
              <p className="truncate text-[10.5px] text-muted">{user?.email}</p>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="mt-2.5 flex items-center justify-between border-t border-[#f0f0f8] pt-2">
            <span className="rounded-[6px] bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary">
              administrator
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="clay-press flex items-center gap-1 text-[11.5px] font-medium text-warning hover:opacity-80 cursor-pointer"
            >
              <LogOut size={12} />
              <span>logout</span>
            </button>
          </div>
        )}

        {collapsed && (
          <div className="mt-2 flex justify-center border-t border-slate-100 pt-1.5">
            <button
              type="button"
              onClick={handleLogout}
              title="logout"
              className="text-warning hover:opacity-80 cursor-pointer p-1"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
