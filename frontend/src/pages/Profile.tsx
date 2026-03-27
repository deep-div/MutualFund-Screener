import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import TickerTape from "@/components/TickerTape";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Shield, KeyRound, User, Clock3 } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const Profile = () => {
  const { user, loading, resetPassword, updateDisplayName } = useAuth();
  const navigate = useNavigate();
  const [sendingReset, setSendingReset] = useState(false);
  const [resetCooldownSeconds, setResetCooldownSeconds] = useState(0);
  const [resetLastSentAt, setResetLastSentAt] = useState<Date | null>(null);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [savingDisplayName, setSavingDisplayName] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [loading, navigate, user]);

  useEffect(() => {
    if (!user) return;
    setDisplayNameInput(user.displayName || "");
  }, [user]);

  useEffect(() => {
    if (resetCooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResetCooldownSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resetCooldownSeconds]);

  if (loading || !user) return null;

  const primaryProvider = user.providerData?.[0]?.providerId ?? "password";
  const providerLabel =
    primaryProvider === "password"
      ? "Email / Password"
      : primaryProvider === "google.com"
        ? "Google"
        : primaryProvider;

  const lastLoginLabel = user.metadata?.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unavailable";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <TickerTape />
      <Navbar />
      <div className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Profile</h1>
              <p className="text-sm text-muted-foreground">
                Manage your personal information and account security
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Left column: Profile card */}
            <div className="md:col-span-1 bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center text-3xl font-bold text-primary border-2 border-primary/20">
                  {(user.displayName || user.email || "A")[0].toUpperCase()}
                </div>
                <div className="text-center">
                  <p className="text-[13px] text-muted-foreground">Signed in as</p>
                  <p className="text-sm font-medium text-foreground">{user.displayName || "User"}</p>
                  <p className="text-[12px] text-muted-foreground">{user.email || "No email on file"}</p>
                </div>
                <div className="w-full space-y-3 mt-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div className="w-full">
                      <p className="text-[11px] text-muted-foreground">Display Name</p>
                      <div className="mt-2 flex flex-col gap-2">
                        <Input
                          value={displayNameInput}
                          onChange={(e) => setDisplayNameInput(e.target.value)}
                          placeholder="Enter display name"
                          maxLength={60}
                          className="h-8 text-[13px]"
                        />
                        <div>
                          <Button
                            size="sm"
                            className="h-8"
                            disabled={savingDisplayName}
                            onClick={async () => {
                              const nextName = displayNameInput.trim();
                              if (!nextName) {
                                toast("Display name required", {
                                  description: "Please enter a valid display name.",
                                });
                                return;
                              }
                              if (nextName === (user.displayName || "").trim()) {
                                toast("No changes", {
                                  description: "Your display name is already up to date.",
                                });
                                return;
                              }
                              try {
                                setSavingDisplayName(true);
                                await updateDisplayName(nextName);
                                toast("Display name updated", {
                                  description: "Your profile name was updated successfully.",
                                });
                              } catch (error) {
                                console.error("Display name update failed", error);
                                toast("Update failed", {
                                  description: "Unable to update display name right now.",
                                });
                              } finally {
                                setSavingDisplayName(false);
                              }
                            }}
                          >
                            {savingDisplayName ? "Saving..." : "Save Name"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">Email / Mobile</p>
                      <p className="text-[13px] text-foreground font-medium">{user.email || "No email on file"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">Account Status</p>
                      <p className="text-[13px] text-positive font-medium">Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: Settings */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-sm font-semibold text-foreground">Change Password</h2>
                    <p className="text-[13px] text-muted-foreground mt-1">
                      For security, we'll send a password reset link to your email.
                    </p>
                    <div className="mt-4">
                      <Button
                        size="sm"
                        className="gap-2"
                        disabled={!user.email || sendingReset || resetCooldownSeconds > 0}
                        onClick={async () => {
                          if (!user.email) return;
                          try {
                            setSendingReset(true);
                            await resetPassword(user.email);
                            setResetLastSentAt(new Date());
                            setResetCooldownSeconds(45);
                            toast("Reset email sent", {
                              description: `Password reset link sent to ${user.email}.`,
                            });
                          } catch (error) {
                            console.error("Failed to send reset link", error);
                            toast("Unable to send reset link", {
                              description: "Please try again in a moment.",
                            });
                          } finally {
                            setSendingReset(false);
                          }
                        }}
                      >
                        {sendingReset
                          ? "Sending..."
                          : resetCooldownSeconds > 0
                            ? `Resend in ${resetCooldownSeconds}s`
                            : "Send Reset Link"}
                      </Button>
                      {resetLastSentAt && (
                        <p className="text-[12px] text-muted-foreground mt-2">
                          Last sent at{" "}
                          {resetLastSentAt.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Clock3 className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-sm font-semibold text-foreground">Active Session</h2>
                    <p className="text-[13px] text-muted-foreground mt-1">
                      Signed in via <span className="text-foreground font-medium">{providerLabel}</span>
                    </p>
                    <p className="text-[13px] text-muted-foreground mt-1">
                      Last login: <span className="text-foreground font-medium">{lastLoginLabel}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

