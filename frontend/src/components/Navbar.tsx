import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ChevronDown, LogOut, User, Bookmark } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import { SchemeSearchItem, searchSchemes } from "@/services/mutualFundService";
import { Skeleton } from "@/components/ui/skeleton";
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

const toSchemeSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const SEARCH_SKELETON_ROWS = 6;

const Navbar = () => {
  const { isLoggedIn, user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SchemeSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const isSearchActive = searchOpen || searchFocused;

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
        setSearchFocused(false);
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
          limit: 15,
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

  useEffect(() => {
    if (isSearchActive) {
      document.body.classList.add("search-dim");
    } else {
      document.body.classList.remove("search-dim");
    }
    return () => document.body.classList.remove("search-dim");
  }, [isSearchActive]);

  return (
    <>
      {isSearchActive && (
        <div
          className="fixed inset-0 bg-black/45 z-45"
          onClick={() => {
            setSearchOpen(false);
            setSearchFocused(false);
          }}
        />
      )}

      <nav className="h-14 bg-nav border-b border-nav-hover flex items-center px-6 relative z-40">

        {/* LEFT: Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-nav-foreground font-bold text-lg tracking-tight"
        >
          <img src="/logo.svg" alt="Screener logo" className="w-8 h-8" />
          MF Screener
        </Link>

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
          <div ref={searchRef} className="relative w-full max-w-md z-60">
            <div
              className={`flex items-center gap-2 w-full border transition-all ${
                searchOpen || searchFocused
                  ? "bg-white border-slate-200 border-b-0 shadow-lg rounded-t-xl rounded-b-none px-4 py-2"
                  : "bg-nav-hover border-nav-foreground/10 rounded-md px-3 py-1.5"
              }`}
            >
              <Search className="w-3.5 h-3.5 text-nav-foreground/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  setSearchFocused(true);
                  if (searchQuery.trim()) setSearchOpen(true);
                }}
                placeholder="Search for Mutual Funds"
                className={`bg-transparent text-[13px] outline-none w-full ${
                  searchOpen || searchFocused
                    ? "text-slate-900 placeholder:text-slate-400"
                    : "text-nav-foreground placeholder:text-nav-foreground/40"
                }`}
              />
            </div>

            {searchOpen && (
              <div className="absolute left-0 right-0 top-full -mt-px bg-white border border-slate-200 border-t-0 rounded-b-xl shadow-2xl overflow-hidden z-50 antialiased">
                {searchLoading ? (
                  <div className="px-4 py-3 space-y-3">
                    {Array.from({ length: SEARCH_SKELETON_ROWS }).map((_, index) => (
                      <div key={`search-skel-${index}`} className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-2">
                          <Skeleton className="h-3 w-56" />
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-2.5 w-16" />
                            <Skeleton className="h-2.5 w-2.5 rounded-full" />
                            <Skeleton className="h-2.5 w-28" />
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-2.5 w-12" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchError ? (
                  <div className="px-4 py-3 text-[13px] text-red-500">{searchError}</div>
                ) : searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-[13px] text-slate-500">No results found.</div>
                ) : (
                  <div className="max-h-[450px] overflow-y-auto">
                    {searchResults.map((item) => {
                      const hasChange = typeof item.nav_change_1d === "number";
                      const changeValue = item.nav_change_1d ?? 0;
                      const changeColor =
                        hasChange && changeValue < 0 ? "text-rose-500" : "text-emerald-600";
                      const changePrefix = changeValue < 0 ? "-" : "+";
                      const schemeId = item.scheme_id ?? item.scheme_code;
                      const schemeSlug = toSchemeSlug(item.scheme_sub_name);

                      return (
                        <Link
                          key={schemeId ?? item.scheme_sub_name}
                          to={`/${schemeSlug}/${schemeId}`}
                          onClick={() => {
                            if (schemeId === undefined || schemeId === null) return;
                            setSearchOpen(false);
                            setSearchFocused(false);
                          }}
                          className="block w-full text-left px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors font-normal focus-visible:outline-none"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-[14px] font-medium text-slate-900 truncate">
                                {item.scheme_sub_name}
                              </div>
                              <div className="flex items-center gap-2 text-[12px] text-slate-500">
                                <span className="uppercase tracking-wide">{item.option_type}</span>
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                <span>{item.scheme_sub_category}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-end">
                                <span className="text-[14px] font-semibold text-slate-900">
                                  {formatNav(item.current_nav)}
                                </span>
                                {hasChange ? (
                                  <span className={`text-[12px] font-medium ${changeColor}`}>
                                    {changePrefix}
                                    {formatChange(changeValue)}
                                  </span>
                                ) : (
                                  <span className="text-[12px] text-slate-400">—</span>
                                )}
                              </div>
                              <span className="text-slate-400 pointer-events-none">
                                <Bookmark className="w-4 h-4" aria-hidden="true" focusable="false" />
                              </span>
                            </div>
                          </div>
                        </Link>
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
