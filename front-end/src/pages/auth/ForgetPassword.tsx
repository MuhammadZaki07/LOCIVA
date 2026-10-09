import { useState } from "react";
import Card, {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import api from "@/context/apiClient";
import { ClayButton } from "@/components/ui/ClayButton";
import { Alert } from "@/components/ui/Alert";
import Logo from "@/components/sections/Logo";
import LogoPuzzleLoader from "@/components/ui/Logopuzzleloader";
import { Info } from "lucide-react";

export function ForgetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    setLoading(true);

    try {
      const response = await api.post("/auth/forgot-password", { email });

      setAlert({
        type: "success",
        message:
          response.data?.message ||
          "Password reset link has been sent to your email address.",
      });
      setEmail("");
    } catch (err: any) {
      setAlert({
        type: "error",
        message:
          err.response?.data?.message ||
          "An error occurred while sending the reset link. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center w-full min-h-screen p-4 bg-[var(--color-canvas)]">
      <Card className="w-full max-w-md clay rounded-3xl p-2 sm:p-4">
        <CardHeader className="text-center space-y-2">
          <Logo className="w-12 mx-auto"/>
          <CardTitle className="font-display text-2xl font-bold text-[var(--color-ink)]">
            Forgot Password?
          </CardTitle>
          <CardDescription className="text-sm text-[var(--color-muted)] leading-relaxed">
            Enter your registered email address and we will send you instructions to reset your password.
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[var(--color-ink)]">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!alert?.type == "error"}
              />
              {alert?.type == "error" && (
              <p className="text-red-500 text-xs flex items-center gap-2"><Info size={15}/>{alert?.message}</p>
              )}
            </div>

            <ClayButton
              type="submit"
              disabled={loading}
              className="w-full clay-primary clay-press py-3.5 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LogoPuzzleLoader size={20} color="#fff" />
                  <span>Sending Link...</span>
                </>
              ) : (
                "Send Reset Link"
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
