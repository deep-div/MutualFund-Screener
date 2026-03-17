import { useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { loginWithEmail, signupWithEmail, loginWithGoogle, resetPassword, loading } = useAuth();

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const switchMode = (newMode: "login" | "signup" | "forgot") => {
    resetForm();
    setMode(newMode);
  };

  const parseAuthError = (err: unknown) => {
    if (err instanceof FirebaseError) {
      switch (err.code) {
        case "auth/invalid-email":
          return "Please enter a valid email address.";
        case "auth/user-not-found":
          return "No account found with this email.";
        case "auth/wrong-password":
          return "Incorrect password. Please try again.";
        case "auth/invalid-credential":
          return "Invalid email or password. Please try again.";
        case "auth/too-many-requests":
          return "Too many attempts. Please try again later.";
        case "auth/email-already-in-use":
          return "This email is already registered.";
        case "auth/weak-password":
          return "Password should be at least 6 characters.";
        case "auth/popup-blocked":
          return "Popup was blocked. Please allow popups and try again.";
        case "auth/popup-closed-by-user":
          return "Popup closed before sign-in completed.";
        case "auth/account-exists-with-different-credential":
          return "An account already exists with a different sign-in method.";
        default:
          return err.message || "Something went wrong. Please try again.";
      }
    }
    return "Something went wrong. Please try again.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (mode === "forgot") {
      try {
        setSubmitting(true);
        await resetPassword(email.trim());
        toast("Reset email sent", {
          description: `Password reset link sent to ${email.trim()}.`,
        });
        switchMode("login");
      } catch (err) {
        setError(parseAuthError(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (mode === "signup") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    try {
      setSubmitting(true);
      if (mode === "signup") {
        await signupWithEmail(email.trim(), password);
      } else {
        await loginWithEmail(email.trim(), password);
      }
      resetForm();
      onClose();
    } catch (err) {
      setError(parseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      setSubmitting(true);
      await loginWithGoogle();
      resetForm();
      onClose();
    } catch (err) {
      setError(parseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-foreground tracking-tight">MF Screener</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === "login" && "Sign in to your account"}
              {mode === "signup" && "Create a new account"}
              {mode === "forgot" && "Reset your password"}
            </p>
          </div>

          {/* Google Login (not on forgot) */}
          {mode !== "forgot" && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 text-[13px] gap-2"
                onClick={handleGoogleLogin}
                disabled={submitting || loading}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>

              <div className="flex items-center gap-3 my-5">
                <Separator className="flex-1" />
                <span className="text-muted-foreground text-xs">or</span>
                <Separator className="flex-1" />
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-foreground text-[13px]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 text-[13px]"
                autoFocus
                disabled={submitting || loading}
              />
            </div>

            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-foreground text-[13px]">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 text-[13px] pr-10"
                    disabled={submitting || loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={submitting || loading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-foreground text-[13px]">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-10 text-[13px] pr-10"
                    disabled={submitting || loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={submitting || loading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Forgot password link */}
            {mode === "login" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-primary text-[12px] hover:underline"
                  disabled={submitting || loading}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {error && (
              <p className="text-destructive text-[12px]">{error}</p>
            )}

            <Button type="submit" className="w-full h-10 text-[13px]" disabled={submitting || loading}>
              {mode === "login" && (submitting ? "Signing In..." : "Sign In")}
              {mode === "signup" && (submitting ? "Creating..." : "Create Account")}
              {mode === "forgot" && (submitting ? "Sending..." : "Send Reset Link")}
            </Button>
          </form>

          {/* Toggle login/signup */}
          <div className="text-center mt-5">
            {mode === "login" && (
              <p className="text-muted-foreground text-[12px]">
                Don't have an account?{" "}
                <button
                  onClick={() => switchMode("signup")}
                  className="text-primary hover:underline font-medium"
                  disabled={submitting || loading}
                >
                  Sign Up
                </button>
              </p>
            )}
            {mode === "signup" && (
              <p className="text-muted-foreground text-[12px]">
                Already have an account?{" "}
                <button
                  onClick={() => switchMode("login")}
                  className="text-primary hover:underline font-medium"
                  disabled={submitting || loading}
                >
                  Sign In
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <p className="text-muted-foreground text-[12px]">
                Remember your password?{" "}
                <button
                  onClick={() => switchMode("login")}
                  className="text-primary hover:underline font-medium"
                  disabled={submitting || loading}
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
