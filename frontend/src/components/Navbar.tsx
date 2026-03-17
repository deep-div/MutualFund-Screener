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
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <nav className="h-12 bg-nav border-b border-nav-hover flex items-center px-6 gap-6">
        <div className="text-nav-foreground font-bold text-lg tracking-tight">screener</div>

        <div className="flex items-center gap-1 ml-4">
          {["Mutual Funds", "All Screens", "New Screen"].map((item) => (
            <button
              key={item}
              className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
                item === "Mutual Funds"
                  ? "text-nav-foreground"
                  : "text-nav-foreground/60 hover:text-nav-foreground hover:bg-nav-hover"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 bg-nav-hover rounded-md px-3 py-1.5 w-64 border border-nav-foreground/10">
          <Search className="w-3.5 h-3.5 text-nav-foreground/50" />
          <input
            type="text"
            placeholder="Search for Indices"
            className="bg-transparent text-[13px] text-nav-foreground placeholder:text-nav-foreground/40 outline-none w-full"
          />
          <kbd className="text-[10px] font-mono-data text-nav-foreground/50 bg-nav px-1.5 py-0.5 rounded border border-nav-foreground/10">/</kbd>
        </div>

        {isLoggedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 text-[13px] text-nav-foreground">
                <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center text-[10px] font-medium text-nav-foreground">
                  {user?.email?.[0]?.toUpperCase() || "A"}
                </div>
                Account
                <ChevronDown className="w-3.5 h-3.5 text-nav-foreground/60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-[13px] font-medium">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[13px] cursor-pointer" onClick={() => navigate("/profile")}>
                <User className="w-3.5 h-3.5 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[13px] cursor-pointer text-destructive" onClick={logout}>
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-2 text-[13px] text-nav-foreground border border-nav-foreground/20 rounded-md px-3 py-1.5 hover:bg-nav-hover transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            Sign Up / Login
          </button>
        )}
      </nav>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};

export default Navbar;
