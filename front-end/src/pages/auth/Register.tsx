import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ClayButton } from "@/components/ui/ClayButton";
import {
  ArrowLeft,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Store,
} from "lucide-react";
import Logo from "@/components/sections/Logo";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !passwordConfirmation) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Password confirmation does not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
        role,
      });

      if (role === "admin" || email.includes("admin")) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        errObj.response?.data?.message ||
        errObj.message ||
        "Registration failed. Please check your data."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col justify-center bg-canvas px-4 py-10 sm:px-6 lg:px-8">
      {/* Top Floating Back Link */}
      <div className="mx-auto mb-6 w-full max-w-[460px]">
        <Link
          to="/"
          className="clay-soft clay-press inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-ink no-underline"
        >
          <ArrowLeft size={14} className="text-primary" />
          <span>back to explore map</span>
        </Link>
      </div>

      <div className="mx-auto w-full max-w-[460px]">
        {/* Claymorphic Card Container */}
        <div className="clay rounded-[22px] p-6 sm:p-8">
          {/* Header */}
          <div className="text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-display text-[24px] font-medium tracking-tight text-ink no-underline"
            >
               <Logo />
              <span>lociva</span>
            </Link>
            <h1 className="mt-3 font-display text-[24px] font-medium text-ink">
              Create your account
            </h1>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
              Start evaluating locations, simulating business models, and verifying area conditions.
            </p>
          </div>

          {/* Account Role Selector */}
          <div className="mt-5">
            <p className="text-[12px] font-medium text-muted">account type</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("user")}
                className={`clay-press flex items-center justify-center gap-1.5 rounded-[12px] p-2.5 text-[12.5px] font-medium transition-all ${
                  role === "user"
                    ? "clay-primary text-white"
                    : "clay-soft text-ink"
                }`}
              >
                <Store size={14} />
                <span>business / community</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`clay-press flex items-center justify-center gap-1.5 rounded-[12px] p-2.5 text-[12.5px] font-medium transition-all ${
                  role === "admin"
                    ? "clay-primary text-white"
                    : "clay-soft text-ink"
                }`}
              >
                <ShieldCheck size={14} />
                <span>admin / analyst</span>
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

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            <div>
              <label
                htmlFor="name"
                className="block text-[12.5px] font-medium text-ink"
              >
                full name
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                  <UserIcon size={15} />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Muhammad Zaki"
                  className="clay-inset w-full rounded-[12px] py-2.5 pl-10 pr-3.5 text-[13.5px] text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-[12.5px] font-medium text-ink"
              >
                email address
              </label>
              <div className="relative mt-1">
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
                  placeholder="zaki@example.com"
                  className="clay-inset w-full rounded-[12px] py-2.5 pl-10 pr-3.5 text-[13.5px] text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[12.5px] font-medium text-ink"
              >
                password
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                  <Lock size={15} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
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

            <div>
              <label
                htmlFor="passwordConfirmation"
                className="block text-[12.5px] font-medium text-ink"
              >
                confirm password
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                  <Lock size={15} />
                </div>
                <input
                  id="passwordConfirmation"
                  type={showPassword ? "text" : "password"}
                  required
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="••••••••"
                  className="clay-inset w-full rounded-[12px] py-2.5 pl-10 pr-3.5 text-[13.5px] text-ink placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="pt-2">
              <ClayButton
                type="submit"
                disabled={loading}
                className="w-full !rounded-[12px] !py-2.5 text-[14px]"
              >
                {loading ? "creating account..." : "create account"}
              </ClayButton>
            </div>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 border-t border-[#ececf6] pt-4 text-center text-[13px] text-muted">
            <span>already have an account? </span>
            <Link
              to="/login"
              className="font-medium text-primary hover:underline no-underline"
            >
              sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
