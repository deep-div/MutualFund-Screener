import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import TickerTape from "@/components/TickerTape";
import { Button } from "@/components/ui/button";
import { Mail, Shield, KeyRound, User } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const Profile = () => {
  const { user, loading, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [loading, navigate, user]);

  if (loading || !user) return null;

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
                    <div>
                      <p className="text-[11px] text-muted-foreground">Display Name</p>
                      <p className="text-[13px] text-foreground font-medium">
                        {user.displayName || "Not set"}
                      </p>
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
                        disabled={!user.email || sendingReset}
                        onClick={async () => {
                          if (!user.email) return;
                          try {
                            setSendingReset(true);
                            await resetPassword(user.email);
                            toast("Reset email sent", {
                              description: `Password reset link sent to ${user.email}.`,
                            });
                          } finally {
                            setSendingReset(false);
                          }
                        }}
                      >
                        {sendingReset ? "Sending..." : "Send Reset Link"}
                      </Button>
                    </div>
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

