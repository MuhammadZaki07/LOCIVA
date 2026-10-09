import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, LogIn, UserPlus, LogOut, ShieldCheck, LayoutDashboard, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Logo from "./Logo";

const links = [
  { href: "#product", label: "product" },
  { href: "#how-it-works", label: "how it works" },
  { href: "#intelligence", label: "intelligence" },
  { href: "#reports", label: "reports" },
  { href: "#about", label: "about" },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 flex w-full justify-center px-3 pt-3.5 pb-1 sm:px-6 pointer-events-none">
      <div
        className={`pointer-events-auto pill-nav-bubble clay relative w-full border border-white/80 backdrop-blur-[14px] ${
          isScrolled
            ? "max-w-6xl rounded-[22px] bg-white/95 px-5 py-2.5 shadow-[0_14px_30px_-4px_rgba(71,71,184,0.14)] sm:px-7"
            : "max-w-[580px] md:max-w-[700px] lg:max-w-[820px] rounded-full bg-white/90 px-4 py-2 shadow-[0_10px_24px_-2px_rgba(71,71,184,0.12)] sm:px-5"
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a
            href="#top"
            className="group flex items-center gap-2 font-display text-[20px] font-medium tracking-tight text-ink no-underline pill-bubble-item"
          >
           <Logo />
            <span>lociva</span>
          </a>

          {/* Desktop Navigation Links */}
          <nav
            className={`hidden items-center transition-all duration-300 lg:flex ${
              isScrolled ? "gap-2.5" : "gap-1"
            }`}
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="pill-bubble-item rounded-full px-3 py-1 text-[13px] font-medium text-muted no-underline transition-colors hover:bg-white hover:text-ink hover:shadow-sm"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Authentication Actions */}
          <div className="flex items-center gap-2">
            {user ? (
              // When user is authenticated
              <div className="flex items-center gap-2">
                <Link
                  to={user.role === "admin" ? "/admin" : "/dashboard"}
                  className="pill-bubble-item hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3.5 py-1.5 text-[12px] font-medium text-primary no-underline transition-transform hover:scale-105"
                >
                  {user.role === "admin" ? (
                    <ShieldCheck size={13} />
                  ) : (
                    <LayoutDashboard size={13} />
                  )}
                  <span className="max-w-[110px] truncate">{user.name}</span>
                </Link>

                <Link
                  to={user.role === "admin" ? "/admin/profile" : "/profile"}
                  className="pill-bubble-item hidden sm:inline-flex items-center gap-1 rounded-full border border-[#ececf6] bg-white px-2.5 py-1 text-[11.5px] font-medium text-muted hover:text-ink transition-colors no-underline"
                  title="Profile"
                >
                  <UserIcon size={12} className="text-primary" />
                  <span>profil</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="pill-bubble-item hidden sm:inline-flex items-center gap-1 rounded-full border border-[#ececf6] bg-white px-2.5 py-1 text-[11.5px] font-medium text-muted hover:text-warning transition-colors"
                  title="Sign out"
                >
                  <LogOut size={12} />
                  <span>logout</span>
                </button>
              </div>
            ) : (
              // When guest (unauthenticated)
              <div className="flex items-center gap-1.5">
                <Link
                  to="/login"
                  className="pill-bubble-item hidden sm:inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-muted hover:text-ink hover:bg-white no-underline transition-colors"
                >
                  <LogIn size={13} className="text-primary" />
                  <span>login</span>
                </Link>

                <Link
                  to="/register"
                  className="pill-bubble-item hidden sm:inline-flex items-center gap-1 clay-primary !rounded-full !px-3.5 !py-1.5 text-[12px] font-medium no-underline shadow-sm"
                >
                  <UserPlus size={13} />
                  <span>registrasi</span>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Drawer Toggle */}
            <button
              type="button"
              className="clay clay-press pill-bubble-item inline-flex h-8 w-8 items-center justify-center rounded-full text-ink lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X size={15} /> : <Menu size={15} />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu (Bubble Transition) */}
        {open && (
          <div className="mt-3 border-t border-[#ececf6] pt-3 lg:hidden">
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-3 py-2 text-[13.5px] font-medium text-ink no-underline transition-colors hover:bg-white"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              ))}

              <div className="mt-2 border-t border-[#ececf6] pt-2 space-y-2">
                {user ? (
                  <>
                    <Link
                      to={user.role === "admin" ? "/admin" : "/dashboard"}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-full bg-primary-soft px-4 py-2 text-[13px] font-medium text-primary no-underline"
                    >
                      <span className="flex items-center gap-1.5">
                        {user.role === "admin" ? <ShieldCheck size={14} /> : <LayoutDashboard size={14} />}
                        <span>{user.name} ({user.role})</span>
                      </span>
                      <span>workspace</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center justify-center gap-1.5 rounded-full border border-warning/30 bg-[#fbf0ee] py-2 text-[12.5px] font-medium text-warning"
                    >
                      <LogOut size={13} />
                      <span>logout</span>
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-1.5 rounded-full border border-[#ececf6] bg-white py-2 text-[13px] font-medium text-ink no-underline shadow-sm"
                    >
                      <LogIn size={13} className="text-primary" />
                      <span>login</span>
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-1.5 clay-primary rounded-full py-2 text-[13px] font-medium text-white no-underline shadow-sm"
                    >
                      <UserPlus size={13} />
                      <span>registrasi</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
