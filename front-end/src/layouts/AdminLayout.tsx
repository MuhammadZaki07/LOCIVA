import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Compass,
  LogOut,
  Menu,
  X,
  ExternalLink,
  User as UserIcon,
} from "lucide-react";
import Logo from "@/components/sections/Logo";
import Sidebar from "@/components/layouts/Sidebar";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const {logout , user} = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navLinks = [
    { to: "/admin", label: "dashboard & reports", icon: LayoutDashboard },
    { to: "/admin/users", label: "user management", icon: Users },
    { to: "/admin/profile", label: "my profile", icon: UserIcon },
  ];

  return (
    <div className="flex min-h-svh bg-canvas text-ink">
      <div className="hidden w-64 shrink-0 flex-col justify-between border-r border-[#ececf6] bg-white/70 p-6 backdrop-blur-md lg:flex">
        <Sidebar />
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

        {/* Profile Card & Logout */}
        <div className="clay rounded-[16px] p-3.5">
          <Link to="/admin/profile" className="flex items-center gap-3 no-underline group">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-[13px] font-bold text-primary group-hover:scale-105 transition-transform">
              {user?.name?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink group-hover:text-primary transition-colors">
                {user?.name || "Admin"}
              </p>
              <p className="truncate text-[11px] text-muted">
                {user?.email || "admin@lociva.id"}
              </p>
            </div>
          </Link>

          <div className="mt-2.5 flex items-center justify-between border-t border-[#f0f0f8] pt-2.5">
            <Link
              to="/admin/profile"
              className="rounded-[6px] bg-primary-soft px-1.5 py-0.5 text-[10.5px] font-medium text-primary no-underline hover:bg-primary/20"
            >
              administrator
            </Link>
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

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header */}
        <header className="flex h-14 items-center justify-between border-b border-[#ececf6] bg-white/80 px-4 backdrop-blur-md lg:hidden">
          <Link
            to="/admin"
            className="flex items-center gap-2 font-display text-[18px] font-medium text-ink no-underline"
          >
            <Logo />
            <span>lociva admin</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="clay clay-press flex h-8 w-8 items-center justify-center rounded-[8px] text-ink"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </header>

        {mobileMenuOpen && (
          <div className="clay-soft border-b border-[#ececf6] p-4 lg:hidden">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
