import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Users,
  Compass,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLinks = [
    { to: "/admin", label: "dashboard & reports", icon: LayoutDashboard },
    { to: "/admin/users", label: "user management", icon: Users },
  ];

  return (
    <div className="flex min-h-svh bg-canvas text-ink">
      {/* Desktop Claymorphic Sidebar */}
      <aside className="hidden w-64 flex-col justify-between border-r border-[#ececf6] bg-white/70 p-6 backdrop-blur-md lg:flex">
        <div>
          {/* Logo & Platform Tag */}
          <Link
            to="/admin"
            className="flex items-center gap-2 font-display text-[21px] font-medium tracking-tight text-ink no-underline"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <span>lociva admin</span>
          </Link>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <ShieldCheck size={12} className="text-primary" />
            <span>civic analytics moderation</span>
          </div>

          {/* Navigation Links */}
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

            <div className="pt-4 border-t border-[#ececf6]">
              <p className="px-3.5 text-[11px] font-medium text-muted uppercase tracking-wider">
                public application
              </p>
              <Link
                to="/"
                className="clay-press mt-1.5 flex items-center justify-between rounded-[12px] px-3.5 py-2 text-[13px] font-medium text-muted hover:bg-white hover:text-ink no-underline"
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
        <div className="clay rounded-[16px] p-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-[13px] font-bold text-primary">
              {user?.name?.charAt(0).toUpperCase() || "A"}
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

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header */}
        <header className="flex h-14 items-center justify-between border-b border-[#ececf6] bg-white/80 px-4 backdrop-blur-md lg:hidden">
          <Link
            to="/admin"
            className="flex items-center gap-2 font-display text-[18px] font-medium text-ink no-underline"
          >
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span>lociva admin</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="clay clay-press flex h-8 w-8 items-center justify-center rounded-[8px] text-ink"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </header>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="clay-soft border-b border-[#ececf6] p-4 lg:hidden">
            <nav className="flex flex-col gap-2">
              {navLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-[10px] px-3 py-2 text-[13.5px] font-medium text-ink no-underline hover:bg-white"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-[10px] px-3 py-2 text-[13.5px] font-medium text-primary no-underline hover:bg-white"
              >
                view live map
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-medium text-warning hover:bg-white text-left"
              >
                <LogOut size={13} />
                <span>logout</span>
              </button>
            </nav>
          </div>
        )}

        {/* Dynamic Nested Page Content */}
        <main className="flex-1 p-5 sm:p-8 lg:p-10 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}