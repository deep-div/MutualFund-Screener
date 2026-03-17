import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { isLoggedIn, user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <nav className="h-14 bg-nav border-b border-nav-hover flex items-center px-6">

        {/* LEFT: Logo */}
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-nav-foreground font-bold text-lg tracking-tight cursor-pointer"
        >
          <img src="/logo.svg" alt="Screener logo" className="w-8 h-8" />
          MF Screener
        </div>

        {/* CENTER: Nav + Search (Centered, no empty space) */}
        <div className="flex-1 flex items-center justify-center gap-6">

          {/* NAV ITEMS */}
          <div className="flex items-center gap-2">
            {["All Screens", "New Screen"].map((item) => (
              <button
                key={item}
                className="px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors text-nav-foreground/60 hover:text-nav-foreground hover:bg-nav-hover"
              >
                {item}
              </button>
            ))}
          </div>

          {/* SEARCH */}
          <div className="flex items-center gap-2 bg-nav-hover rounded-md px-3 py-1.5 w-full max-w-md border border-nav-foreground/10">
            <Search className="w-3.5 h-3.5 text-nav-foreground/50" />
            <input
              type="text"
              placeholder="Search for Indices"
              className="bg-transparent text-[13px] text-nav-foreground placeholder:text-nav-foreground/40 outline-none w-full"
            />
          </div>

        </div>

        {/* RIGHT: Auth / Account */}
        <div className="ml-6">
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-[13px] text-nav-foreground">
                  <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center text-[11px] font-medium">
                    {(user?.displayName || user?.email || "A")[0]?.toUpperCase()}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-nav-foreground/60" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-[13px] font-medium">{user?.displayName || user?.email}</p>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-[13px] cursor-pointer"
                  onClick={() => navigate("/profile")}
                >
                  <User className="w-3.5 h-3.5 mr-2" />
                  Profile
                </DropdownMenuItem>

              <DropdownMenuItem
                  className="text-[13px] cursor-pointer text-destructive"
                  onClick={() => void logout()}
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-[13px] bg-primary text-white px-4 py-1.5 rounded-md hover:opacity-90 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Loading..." : "Get Started"}
              </button>
            </div>
          )}
        </div>

      </nav>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};

export default Navbar;
