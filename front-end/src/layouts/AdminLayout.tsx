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
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
  return (
    <div className="flex min-h-svh bg-canvas text-ink">
      <div className="hidden w-64 shrink-0 flex-col justify-between border-r border-[#ececf6] bg-white/70 p-6 backdrop-blur-md lg:flex">
        <Sidebar />
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
