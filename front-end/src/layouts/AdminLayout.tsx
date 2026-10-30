import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Sidebar from "@/components/layouts/Sidebar";
import AdminNavbar from "@/components/layouts/AdminNavbar";
import {
  AdminNotificationsProvider,
} from "@/context/AdminNotificationsContext";

export default function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("lociva_admin_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("lociva_admin_sidebar_collapsed", String(next));
      } catch { }
      return next;
    });
  };

  return (
    <AdminNotificationsProvider>
      <div className="flex min-h-svh bg-canvas text-ink">
        {/* Desktop sidebar */}
        {/* Desktop sidebar */}
        <div
          className={`sticky top-0 hidden h-svh shrink-0 flex-col
    border-r border-[#ececf6] bg-white/80 backdrop-blur-md
    lg:flex transition-all duration-200
    ${collapsed ? "w-20" : "w-64"}`}
        >
          <div
            className={`flex h-full min-h-0 flex-col overflow-y-auto ${collapsed ? "p-3" : "p-5"
              }`}
          >
            <Sidebar
              collapsed={collapsed}
              onToggleCollapse={toggleCollapse}
            />
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Mobile header strip */}
          <div className="flex h-14 items-center justify-between border-b border-[#ececf6] bg-white/80 px-4 backdrop-blur-md lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="clay clay-press flex h-8 w-8 items-center justify-center rounded-[8px] text-ink cursor-pointer"
              aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <span className="font-display text-[16px] font-medium text-ink">lociva admin</span>
            <div className="w-8" />
          </div>

          {/* Mobile sidebar drawer */}
          {mobileMenuOpen && (
            <div className="clay-soft border-b border-[#ececf6] p-4 lg:hidden">
              <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
            </div>
          )}

          {/* Desktop navbar (always visible on lg+) */}
          <div className="hidden lg:block">
            <AdminNavbar
              collapsed={collapsed}
              onToggleCollapse={toggleCollapse}
            />
          </div>

          <main className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminNotificationsProvider>

  );
}
