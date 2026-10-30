import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LogOut,
  Compass,
  LayoutDashboard,
  ShieldCheck,
  User as UserIcon,
  Menu,
  X,
} from "lucide-react";
import Logo from "@/components/sections/Logo";

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await logout();
    navigate("/login");
  };

  const handleNavigate = () => {
    setIsMenuOpen(false);
  };

  const navLinkClass =
    "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted no-underline transition-colors hover:bg-primary-soft hover:text-primary";

  return (
    <div className="flex min-h-svh flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-40 border-b border-[#ececf6] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-5 md:px-8">
          {/* Logo */}
          <Link
            to="/dashboard"
            onClick={handleNavigate}
            className="flex shrink-0 items-center gap-2 font-display text-[21px] font-medium tracking-tight text-ink no-underline"
          >
            <Logo />
            <span>lociva</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-4 lg:flex xl:gap-6">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-ink no-underline"
            >
              <LayoutDashboard size={14} className="text-primary" />
              <span>my workspace</span>
            </Link>

            <Link
              to="/profile"
              className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-muted no-underline transition-colors hover:text-ink"
            >
              <UserIcon size={14} className="text-primary" />
              <span>profile</span>
            </Link>

            <Link
              to="/"
              className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-muted no-underline transition-colors hover:text-ink"
            >
              <Compass size={14} className="text-primary" />
              <span>explore map</span>
            </Link>

            {user?.role === "admin" && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-primary-soft px-3 py-1 text-[12px] font-medium text-primary no-underline"
              >
                <ShieldCheck size={13} />
                <span>admin panel</span>
              </Link>
            )}
          </nav>

          {/* Desktop Account */}
          <div className="hidden shrink-0 items-center gap-3 border-l border-[#ececf6] pl-4 lg:flex">
            <Link
              to="/profile"
              className="group max-w-40 text-right no-underline"
            >
              <p className="truncate text-[12.5px] font-medium leading-tight text-ink transition-colors group-hover:text-primary">
                {user?.name}
              </p>
              <p className="truncate text-[10.5px] text-muted">
                {user?.email}
              </p>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="clay-soft clay-press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-warning transition-colors"
              title="Sign out"
            >
              <LogOut size={13} />
              <span>logout</span>
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink transition-colors hover:bg-primary-soft lg:hidden"
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="border-t border-[#ececf6] bg-white px-4 pb-4 pt-3 shadow-lg lg:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1">
              <Link
                to="/dashboard"
                onClick={handleNavigate}
                className={navLinkClass}
              >
                <LayoutDashboard size={18} className="text-primary" />
                <span>my workspace</span>
              </Link>

              <Link
                to="/profile"
                onClick={handleNavigate}
                className={navLinkClass}
              >
                <UserIcon size={18} className="text-primary" />
                <span>profile</span>
              </Link>

              <Link
                to="/"
                onClick={handleNavigate}
                className={navLinkClass}
              >
                <Compass size={18} className="text-primary" />
                <span>explore map</span>
              </Link>

              {user?.role === "admin" && (
                <Link
                  to="/admin"
                  onClick={handleNavigate}
                  className={navLinkClass}
                >
                  <ShieldCheck size={18} className="text-primary" />
                  <span>admin panel</span>
                </Link>
              )}

              <div className="my-2 border-t border-[#ececf6]" />

              <Link
                to="/profile"
                onClick={handleNavigate}
                className="flex min-w-0 flex-col rounded-xl px-3 py-2 no-underline transition-colors hover:bg-primary-soft"
              >
                <span className="truncate text-sm font-medium text-ink">
                  {user?.name}
                </span>
                <span className="truncate text-xs text-muted">
                  {user?.email}
                </span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="clay-soft clay-press mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-warning transition-colors"
              >
                <LogOut size={17} />
                <span>logout</span>
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 py-6 sm:px-5 sm:py-8 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}