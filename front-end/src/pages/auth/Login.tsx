import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ClayButton } from "@/components/ui/ClayButton";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, AlertCircle, Sparkles } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login({ email, password });
      // GuestRoute will also auto-redirect, but navigate ensures immediate transition
      if (email.includes("admin")) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        errObj.response?.data?.message ||
        errObj.message ||
        "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role: "admin" | "user") => {
    if (role === "admin") {
      setEmail("admin@lociva.id");
      setPassword("admin123");
    } else {
      setEmail("user@lociva.id");
      setPassword("user123");
    }
    setError(null);
  };

  return (
    <div className="flex min-h-svh flex-col justify-center bg-canvas px-4 py-10 sm:px-6 lg:px-8">
      {/* Top Floating Back Link */}
      <div className="mx-auto mb-6 w-full max-w-[440px]">
        <Link
          to="/"
          className="clay-soft clay-press inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-ink no-underline"
        >
          <ArrowLeft size={14} className="text-primary" />
          <span>back to explore map</span>
        </Link>
      </div>

      <div className="mx-auto w-full max-w-[440px]">
        {/* Claymorphic Card Container */}
        <div className="clay rounded-[22px] p-6 sm:p-8">
          {/* Header */}
          <div className="text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-display text-[24px] font-medium tracking-tight text-ink no-underline"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              <span>lociva</span>
            </Link>
            <h1 className="mt-3 font-display text-[24px] font-medium text-ink">
              Sign in to lociva
            </h1>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
              Access your location intelligence dashboard, simulation catchments, and community alerts.
            </p>
          </div>

          {/* Quick Demo Credentials Switcher */}
          <div className="clay-soft mt-5 rounded-[14px] p-3">
            <div className="flex items-center justify-between text-[11px] text-muted">
              <span className="flex items-center gap-1 font-medium text-primary">
                <Sparkles size={11} /> demo accounts
              </span>
              <span>1-click fill</span>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("admin")}
                className="clay-press flex-1 rounded-[10px] bg-white py-1.5 text-[12px] font-medium text-ink shadow-sm transition-all hover:bg-primary-soft"
              >
                admin role
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("user")}
                className="clay-press flex-1 rounded-[10px] bg-white py-1.5 text-[12px] font-medium text-ink shadow-sm transition-all hover:bg-primary-soft"
              >
                user role
              </button>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-[12px] border border-warning/30 bg-[#fbf0ee] p-3 text-[12.5px] text-warning">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-[12.5px] font-medium text-ink"
              >
                email address
              </label>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                  <Mail size={15} />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="clay-inset w-full rounded-[12px] py-2.5 pl-10 pr-3.5 text-[13.5px] text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-[12.5px] font-medium text-ink"
                >
                  password
                </label>
                <span className="text-[11.5px] text-muted">
                  min. 6 characters
                </span>
              </div>
              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                  <Lock size={15} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="clay-inset w-full rounded-[12px] py-2.5 pl-10 pr-10 text-[13.5px] text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <ClayButton
                type="submit"
                disabled={loading}
                className="w-full !rounded-[12px] !py-2.5 text-[14px]"
              >
                {loading ? "signing in..." : "sign in to account"}
              </ClayButton>
            </div>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 border-t border-[#ececf6] pt-4 text-center text-[13px] text-muted">
            <span>don't have an account yet? </span>
            <Link
              to="/register"
              className="font-medium text-primary hover:underline no-underline"
            >
              create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
