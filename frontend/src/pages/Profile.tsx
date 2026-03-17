import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import TickerTape from "@/components/TickerTape";
import { Button } from "@/components/ui/button";
import { User, Mail, Shield, LogOut } from "lucide-react";

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TickerTape />
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-8 w-full max-w-sm shadow-sm">
          <div className="flex flex-col items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center text-3xl font-bold text-primary border-2 border-primary/20">
              {user.email[0].toUpperCase()}
            </div>

            {/* Info */}
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Your Profile</h2>
              <p className="text-sm text-muted-foreground">Manage your account</p>
            </div>

            {/* Details */}
            <div className="w-full space-y-3 mt-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[11px] text-muted-foreground">Email / Mobile</p>
                  <p className="text-[13px] text-foreground font-medium">{user.email}</p>
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

            {/* Logout */}
            <Button
              variant="destructive"
              size="sm"
              className="mt-2 w-full gap-2"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
