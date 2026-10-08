import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ClayButton } from "@/components/ui/ClayButton";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import Logo from "@/components/sections/Logo";
import Label from "@/components/ui/Label";
import Input from "@/components/ui/Input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { ButtonGoogle } from "@/components/ui/ButtonGoogle";
import { useToast } from "@/components/ui/Toast";
import LogoPuzzleLoader from "@/components/ui/Logopuzzleloader";

interface ValidationErrors {
  email?: string[];
  password?: string[];
}

export default function Login() {
  const { login, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const isSubmitting = loading || googleLoading;

  const handleGoogleClick = async () => {
    setGoogleLoading(true);
    setError(null);

    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      const errObj = err as {
        response?: {
          data?: {
            message?: string;
          };
        };
        message?: string;
      };

      setError(
        errObj.response?.data?.message ||
          errObj.message ||
          "Google sign-in failed. Please try again later.",
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setValidationErrors({});

    try {
      const loggedInUser = await login({ email, password });

      toast({
        title: `Welcome, ${loggedInUser.name}`,
        description: "You have successfully signed in to your account.",
        variant: "success",
      });

      navigate(loggedInUser.role === "admin" ? "/admin" : "/dashboard");
    } catch (err: unknown) {
      setEmail("");
      setPassword("");

      const errObj = err as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            errors?: ValidationErrors;
          };
        };
        message?: string;
      };

      const status = errObj.response?.status;
      const responseData = errObj.response?.data;

      if (status === 422 && responseData?.errors) {
        setValidationErrors(responseData.errors);
        return;
      }

      setError(
        responseData?.message ||
          errObj.message ||
          "Login failed. Please try again later.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-svh flex-col justify-center bg-canvas px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto mb-6 w-full max-w-[440px]">
        <Link
          to="/"
          className={`clay-soft clay-press inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-ink no-underline ${
            isSubmitting ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <ArrowLeft size={14} className="text-primary" />
          <span>back to explore map</span>
        </Link>
      </div>

      <div className="mx-auto w-full max-w-[440px]">
        {error && (
          <div className="mb-4">
            <Alert variant="error" icon={<AlertCircle size={17} />}>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="clay rounded-[22px] p-6 sm:p-8">
          <div className="text-center">
            <Link
              to="/"
              className={`inline-flex items-center gap-2 font-display text-[24px] font-medium tracking-tight text-ink no-underline ${
                isSubmitting ? "pointer-events-none opacity-50" : ""
              }`}
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

            <ButtonGoogle
              className="w-full"
              variant="outline"
              onClick={handleGoogleClick}
              disabled={isSubmitting}
            >
              {googleLoading ? "Connecting to Google..." : "Login with Google"}
            </ButtonGoogle>
          </div>

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
                  disabled={isSubmitting}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationErrors.email) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        email: undefined,
                      }));
                    }
                  }}
                  placeholder="name@example.com"
                  error={!!validationErrors.email}
                  className="pl-10"
                />
              </div>

              {validationErrors.email && (
                <p className="mt-1.5 flex items-center gap-1 text-[12px] text-warning">
                  <AlertCircle size={13} />
                  {validationErrors.email[0]}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">password</Label>
              </div>

              <div className="relative mt-1.5">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
                  <Lock size={15} />
                </div>

                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationErrors.password) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }));
                    }
                  }}
                  placeholder="••••••••"
                  error={!!validationErrors.password}
                  className="pl-10 pr-10"
                />

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted hover:text-ink disabled:opacity-50"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {validationErrors.password && (
                <p className="mt-1.5 flex items-center gap-1 text-[12px] text-warning">
                  <AlertCircle size={13} />
                  {validationErrors.password[0]}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Link className="text-xs text-[#5E5ED8] font-semibold" to={'/forget-password'}>Forget Password?</Link>
            </div>

            <div className="pt-2">
              <ClayButton
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 !rounded-[12px] !py-2.5 text-[14px]"
              >
                {loading ? (
                  <>
                    <LogoPuzzleLoader size={15} color="#ffff" />
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
              className={`font-medium text-primary hover:underline no-underline ${
                isSubmitting ? "pointer-events-none opacity-50" : ""
              }`}
            >
              create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
