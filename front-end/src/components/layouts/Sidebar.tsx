import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Compass,
  LogOut,
  ShieldCheck,
  ExternalLink,
  UserIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/sections/Logo";
import { getStorageUrl } from "@/context/userService";

interface SidebarProps {
  onNavigate?: () => void;
}


  const navLinks = [
    { to: "/admin", label: "dashboard & reports", icon: LayoutDashboard },
    { to: "/admin/users", label: "user management", icon: Users },
    { to: "/admin/profile", label: "my profile", icon: UserIcon },
  ];


export default function Sidebar({ onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    onNavigate?.();
    navigate("/login");
  };

  return (
    <aside className="flex w-full flex-col justify-between">
      <div>
        <Link
          to="/admin"
          onClick={onNavigate}
          className="flex items-center gap-2 font-display text-[21px] font-medium tracking-tight text-ink no-underline"
        >
          <Logo />
          <span>lociva admin</span>
        </Link>

        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
          <ShieldCheck size={12} className="text-primary" />
          <span>civic analytics moderation</span>
        </div>

        <nav className="mt-8 space-y-1.5">
        {navLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={({ isActive }) =>
                `clay-press flex items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[13px] font-medium transition-all no-underline ${
                  isActive
                    ? "clay-primary text-white shadow-sm"
                    : "text-muted hover:bg-white hover:text-ink"
                }`
              }
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

          <div className="border-t border-[#ececf6] pt-4">
            <p className="px-3.5 text-[11px] font-medium uppercase tracking-wider text-muted">
              public application
            </p>

            <Link
              to="/view-maps"
              target="_blank"
              onClick={onNavigate}
              className="clay-press mt-1.5 flex items-center justify-between rounded-[12px] px-3.5 py-2 text-[13px] font-medium text-muted no-underline hover:bg-white hover:text-ink"
            >
              <div className="flex items-center gap-2.5">
                <Compass size={15} className="text-primary" />
                <span>view live map</span>
              </div>
              <ExternalLink size={12} />
            </Link>
          </div>
        </nav>
      </div>

      {/* Profile Card & Logout */}
      <div className="clay mt-8 rounded-[16px] p-3.5">
        <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full overflow-hidden bg-primary-soft text-[13px] font-bold text-primary">
            <img src={getStorageUrl(user?.profile_image)} alt="Photo" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">
              {user?.name || "Admin"}
            </p>
            <p className="truncate text-[11px] text-muted">
              {user?.email || "admin@lociva.id"}
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between border-t border-[#f0f0f8] pt-2.5">
          <span className="rounded-[6px] bg-primary-soft px-1.5 py-0.5 text-[10.5px] font-medium text-primary">
            administrator
          </span>

          <button
            type="button"
            onClick={handleLogout}
            className="clay-press flex items-center gap-1 text-[12px] font-medium text-warning hover:opacity-80"
          >
            <LogOut size={12} />
            <span>logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
