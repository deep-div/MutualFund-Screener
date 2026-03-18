import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import { SchemeSearchItem, searchSchemes } from "@/services/mutualFundService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_FORMATTER = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatNav = (value?: number | null) =>
  typeof value === "number" ? `₹${NAV_FORMATTER.format(value)}` : "—";

const formatChange = (value?: number | null) =>
  typeof value === "number" ? `${NAV_FORMATTER.format(Math.abs(value))}%` : "—";

const Navbar = () => {
  const { isLoggedIn, user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SchemeSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      setSearchOpen(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const data = await searchSchemes(trimmed, {
          limit: 10,
          offset: 0,
          signal: controller.signal,
        });
        setSearchResults(data.items ?? []);
        setSearchOpen(true);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setSearchError("Search failed. Please try again.");
        setSearchResults([]);
        setSearchOpen(true);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchQuery]);

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
          <div ref={searchRef} className="relative w-full max-w-md">
            <div className="flex items-center gap-2 bg-nav-hover rounded-md px-3 py-1.5 w-full border border-nav-foreground/10">
              <Search className="w-3.5 h-3.5 text-nav-foreground/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim()) setSearchOpen(true);
                }}
                placeholder="Search for Mutual Funds"
                className="bg-transparent text-[13px] text-nav-foreground placeholder:text-nav-foreground/40 outline-none w-full"
              />
            </div>

            {searchOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-nav border border-nav-hover rounded-md shadow-lg overflow-hidden z-50">
                {searchLoading ? (
                  <div className="px-3 py-2 text-[12px] text-nav-foreground/60">Searching...</div>
                ) : searchError ? (
                  <div className="px-3 py-2 text-[12px] text-destructive">{searchError}</div>
                ) : searchResults.length === 0 ? (
                  <div className="px-3 py-2 text-[12px] text-nav-foreground/60">No results found.</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.map((item) => {
                      const hasChange = typeof item.nav_change_1d === "number";
                      const changeValue = item.nav_change_1d ?? 0;
                      const changeColor =
                        hasChange && changeValue < 0 ? "text-rose-400" : "text-emerald-400";
                      const changePrefix = changeValue < 0 ? "-" : "+";

                      return (
                        <button
                          key={item.scheme_code}
                          type="button"
                          className="w-full text-left px-3 py-2 border-b border-nav-hover/70 last:border-b-0 hover:bg-nav-hover/60 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-[13px] font-medium text-nav-foreground truncate">
                                {item.scheme_sub_name}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-nav-foreground/60">
                                <span className="uppercase tracking-wide">{item.option_type}</span>
                                <span className="h-1 w-1 rounded-full bg-nav-foreground/30" />
                                <span>{item.scheme_sub_category}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[13px] font-semibold text-nav-foreground">
                                {formatNav(item.current_nav)}
                              </span>
                              {hasChange ? (
                                <span className={`text-[11px] font-medium ${changeColor}`}>
                                  {changePrefix}
                                  {formatChange(changeValue)}
                                </span>
                              ) : (
                                <span className="text-[11px] text-nav-foreground/50">—</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT: Auth / Account */}
        <div className="ml-6 min-w-[140px] flex justify-end">
          {loading ? (
            <div className="h-7 w-24 rounded-md bg-nav-hover/70 animate-pulse" />
          ) : isLoggedIn ? (
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
