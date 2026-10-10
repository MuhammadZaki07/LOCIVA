import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Compass, LayoutDashboard, ShieldCheck, User as UserIcon } from "lucide-react";
import Logo from "@/components/sections/Logo";

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-svh bg-canvas text-ink flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[#ececf6] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          {/* Logo */}
          <Link
            to="/dashboard"
            className="flex items-center gap-2 font-display text-[21px] font-medium tracking-tight text-ink no-underline"
          >
           <Logo/>
            <span>lociva</span>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-6">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-[13px] font-medium text-ink no-underline"
            >
              <LayoutDashboard size={14} className="text-primary" />
              <span>my workspace</span>
            </Link>

            <Link
              to="/profile"
              className="flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink no-underline transition-colors"
            >
              <UserIcon size={14} className="text-primary" />
              <span>profile</span>
            </Link>

            <Link
              to="/"
              className="flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink no-underline transition-colors"
            >
              <Compass size={14} className="text-primary" />
              <span>explore map</span>
            </Link>

            {user?.role === "admin" && (
              <Link
                to="/admin"
                className="hidden sm:flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[12px] font-medium text-primary no-underline"
              >
                <ShieldCheck size={13} />
                <span>admin panel</span>
              </Link>
            )}

            <div className="flex items-center gap-2 border-l border-[#ececf6] pl-4">
              <Link to="/profile" className="hidden sm:block text-right no-underline group">
                <p className="text-[12.5px] font-medium text-ink leading-tight group-hover:text-primary transition-colors">
                  {user?.name}
                </p>
                <p className="text-[10.5px] text-muted">{user?.email}</p>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="clay-soft clay-press flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-warning transition-colors"
                title="Sign out"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">logout</span>
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}
