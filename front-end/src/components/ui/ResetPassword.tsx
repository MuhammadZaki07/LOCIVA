import { useState, useEffect } from "react";
import Card, {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Spinner from "@/components/ui/Spinner";
import { Alert } from "./Alert";
import { ClayButton } from "./ClayButton";
import api from "@/context/apiClient";
import Logo from "../sections/Logo";
import { Info } from "lucide-react";

type FormErrors = {
  token?: string[];
  email?: string[];
  password?: string[];
  password_confirmation?: string[];
};

export function ResetPassword() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    const urlEmail = params.get("email");

    if (urlToken) setToken(urlToken);
    if (urlEmail) setEmail(urlEmail);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    setErrors({});

    if (password !== passwordConfirmation) {
      setAlert({
        type: "error",
        message: "Password confirmation does not match.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/reset-password", {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      setAlert({
        type: "success",
        message:
          response.data?.message ||
          "Password has been successfully updated. Please log in again.",
      });

      setPassword("");
      setPasswordConfirmation("");
    } catch (err: any) {
      const responseData = err.response?.data;

      setAlert({
        type: "error",
        message: responseData?.message || "An error occurred. Please try again.",
      });

      if (responseData?.errors) {
        setErrors(responseData.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center w-full min-h-screen p-4 bg-[var(--color-canvas)]">
      <Card className="w-full max-w-md clay rounded-3xl p-2 sm:p-4">
        <CardHeader className="text-center space-y-2">
          <Logo className="mx-auto w-12" />
          <CardTitle className="font-display text-2xl font-bold text-[var(--color-ink)]">
            Reset Password
          </CardTitle>
          <CardDescription className="text-sm text-[var(--color-muted)] leading-relaxed">
            Create a strong new password for your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="mt-4">
          {alert?.type == "success" && (
            <div className="mb-4">
              <Alert variant={"success"}>
                {alert.message}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-[var(--color-ink)]"
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                error={!!errors.email}
              />
              {errors.email?.[0] && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-2"><Info size={15}/>{errors.email[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-[var(--color-ink)]"
              >
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                error={!!errors.password}
              />
              {errors.password?.[0] && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-2"><Info size={15}/>{errors.password[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password_confirmation"
                className="text-sm font-medium text-[var(--color-ink)]"
              >
                Confirm New Password
              </Label>
              <Input
                id="password_confirmation"
                type="password"
                placeholder="Repeat new password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                minLength={8}
                error={!!errors.password_confirmation}
              />
              {errors.password_confirmation?.[0] && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.password_confirmation[0]}
                </p>
              )}
            </div>

            <ClayButton
              type="submit"
              disabled={loading}
              className="w-full clay-primary clay-press py-3.5 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
            >
              {loading ? (
                <>
                  <Spinner className="w-5 h-5 text-white" />
                  <span>Updating Password...</span>
                </>
              ) : (
                "Save New Password"
              )}
            </ClayButton>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/login"
              className="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-deep)] transition-colors"
            >
              &larr; Back to Login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
