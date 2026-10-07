import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ClayButton } from "@/components/ui/ClayButton";
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Logo from "@/components/sections/Logo";
import Spinner from "@/components/ui/Spinner";
import Label from "@/components/ui/Label";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { useToast } from "@/components/ui/Toast";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
      const currentUser = useAuth;
      if (currentUser) {
        navigate(currentUser.role === "admin" ? "/admin" : "/dashboard");
      }
    } catch (err: unknown) {
      const errObj = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        errObj.response?.data?.message ||
          errObj.message ||
          "Login failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col justify-center bg-canvas px-4 py-10 sm:px-6 lg:px-8">
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
        <div className="clay rounded-[22px] p-6 sm:p-8">
          <div className="text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-display text-[24px] font-medium tracking-tight text-ink no-underline"
            >
              <Logo />
              <span>lociva</span>
            </Link>
            <h1 className="mt-3 font-display text-[24px] font-medium text-ink">
              Sign in to lociva
            </h1>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
              Access your location intelligence dashboard, simulation
              catchments, and community alerts.
            </p>
          </div>

          {error && (
            <Alert variant="success" icon={<CheckCircle2 size={17} />}>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="email">email address</Label>

              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                  <Mail size={15} />
                </div>

                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">password</Label>

                <span className="text-[11.5px] text-muted">
                  min. 6 characters
                </span>
              </div>

              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                  <Lock size={15} />
                </div>

                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
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
                className="inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70 !rounded-[12px] !py-2.5 text-[14px]"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    signing in...
                  </>
                ) : (
                  "sign in to account"
                )}
              </ClayButton>
            </div>
          </form>

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
