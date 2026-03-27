import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ChevronDown, LogOut, User, Bookmark } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import { SchemeSearchItem, searchSchemes } from "@/services/mutualFundService";
import { SavedUserFilter, getUserFilters } from "@/services/userService";
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

const LEADERBOARDS_SESSION_KEY = "mf_leaderboards_cache";
const LEADERBOARDS_LOADING_EVENT = "mf_leaderboards_loading";
const NEW_SCREEN_EVENT = "mf_new_screen_requested";
const SAVED_FILTERS_BATCH_SIZE = 10;
type NavItem = "All Screens" | "New Screen";

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
const LEADERBOARD_SKELETON_ROWS = 6;

type BestPerformerItem = {
  external_id?: string | number;
  scheme_code?: number;
  scheme_sub_name: string;
  current_nav?: number | null;
  cagr_3y?: number | null;
};

type TopGainerItem = {
  external_id?: string | number;
  scheme_code?: number;
  scheme_sub_name: string;
  current_nav?: number | null;
  nav_change_1d?: number | null;
};

type TopLoserItem = {
  external_id?: string | number;
  scheme_code?: number;
  scheme_sub_name: string;
  current_nav?: number | null;
  nav_change_1d?: number | null;
};

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
  const [bestPerformers, setBestPerformers] = useState<BestPerformerItem[]>([]);
  const [topGainers, setTopGainers] = useState<TopGainerItem[]>([]);
  const [topLosers, setTopLosers] = useState<TopLoserItem[]>([]);
  const [leaderboardsLoading, setLeaderboardsLoading] = useState(false);
  const [screenExplorerOpen, setScreenExplorerOpen] = useState(false);
  const [savedFiltersLoading, setSavedFiltersLoading] = useState(false);
  const [savedFiltersLoadingMore, setSavedFiltersLoadingMore] = useState(false);
  const [savedFiltersError, setSavedFiltersError] = useState<string | null>(null);
  const [savedFilters, setSavedFilters] = useState<SavedUserFilter[]>([]);
  const [savedFiltersTotal, setSavedFiltersTotal] = useState(0);
  const [savedListScrollable, setSavedListScrollable] = useState(false);
  const [bodyTopOffset, setBodyTopOffset] = useState(56);
  const navRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const isSearchActive = searchOpen || searchFocused;

  useEffect(() => {
    const readBestPerformers = () => {
      try {
        const raw = sessionStorage.getItem(LEADERBOARDS_SESSION_KEY);
        if (!raw) {
          setLeaderboardsLoading(true);
          setBestPerformers([]);
          setTopGainers([]);
          setTopLosers([]);
          return;
        }
        const parsed = JSON.parse(raw) as {
          best_performers?: BestPerformerItem[];
          top_gainers?: TopGainerItem[];
          top_losers?: TopLoserItem[];
        };
        setBestPerformers(Array.isArray(parsed?.best_performers) ? parsed.best_performers : []);
        setTopGainers(Array.isArray(parsed?.top_gainers) ? parsed.top_gainers : []);
        setTopLosers(Array.isArray(parsed?.top_losers) ? parsed.top_losers : []);
        setLeaderboardsLoading(false);
      } catch {
        setBestPerformers([]);
        setTopGainers([]);
        setTopLosers([]);
        setLeaderboardsLoading(false);
      }
    };

    readBestPerformers();
    const handleUpdate = () => readBestPerformers();
    const handleLeaderboardsLoading = (event: Event) => {
      const { detail } = event as CustomEvent<{ loading?: boolean }>;
      if (typeof detail?.loading === "boolean") {
        setLeaderboardsLoading(detail.loading);
      }
    };
    window.addEventListener("mf_leaderboards_updated", handleUpdate);
    window.addEventListener(LEADERBOARDS_LOADING_EVENT, handleLeaderboardsLoading as EventListener);
    return () => {
      window.removeEventListener("mf_leaderboards_updated", handleUpdate);
      window.removeEventListener(LEADERBOARDS_LOADING_EVENT, handleLeaderboardsLoading as EventListener);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
        setSearchFocused(false);
        setSearchQuery("");
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
      setSearchOpen(searchFocused);
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
  }, [searchQuery, searchFocused]);

  useEffect(() => {
    if (isSearchActive) {
      document.body.classList.add("search-dim");
    } else {
      document.body.classList.remove("search-dim");
    }
    return () => document.body.classList.remove("search-dim");
  }, [isSearchActive]);

  useEffect(() => {
    if (!screenExplorerOpen || !isLoggedIn || !user) return;
    const loadSavedFilters = async () => {
      setSavedFiltersLoading(true);
      setSavedFiltersError(null);
      try {
        const token = await user.getIdToken();
        const response = await getUserFilters(token, {
          limit: SAVED_FILTERS_BATCH_SIZE,
          offset: 0,
        });
        const filters = Array.isArray(response?.filters) ? response.filters : [];
        setSavedFilters(filters);
        setSavedFiltersTotal(typeof response?.total === "number" ? response.total : filters.length);
        setSavedListScrollable(false);
      } catch (error) {
        setSavedFilters([]);
        setSavedFiltersTotal(0);
        setSavedFiltersError(error instanceof Error ? error.message : "Failed to load saved screens.");
      } finally {
        setSavedFiltersLoading(false);
      }
    };
    void loadSavedFilters();
  }, [screenExplorerOpen, isLoggedIn, user]);

  useEffect(() => {
    const syncBodyTopOffset = () => {
      const navBottom = navRef.current?.getBoundingClientRect().bottom;
      if (typeof navBottom === "number" && Number.isFinite(navBottom)) {
        setBodyTopOffset(Math.max(0, Math.round(navBottom)));
      }
    };
    syncBodyTopOffset();
    window.addEventListener("resize", syncBodyTopOffset);
    return () => window.removeEventListener("resize", syncBodyTopOffset);
  }, []);

  const handleNavClick = (item: NavItem) => {
    navigate("/");
    if (item === "All Screens") {
      setScreenExplorerOpen(true);
      return;
    }
    if (item === "New Screen") {
      window.dispatchEvent(new CustomEvent(NEW_SCREEN_EVENT));
    }
  };

  const handleLoadMoreSavedFilters = async () => {
    if (!user || savedFiltersLoadingMore) return;
    const currentOffset = savedFilters.length;
    if (savedFiltersTotal > 0 && currentOffset >= savedFiltersTotal) return;
    setSavedListScrollable(true);
    setSavedFiltersLoadingMore(true);
    try {
      const token = await user.getIdToken();
      const response = await getUserFilters(token, {
        limit: SAVED_FILTERS_BATCH_SIZE,
        offset: currentOffset,
      });
      const incoming = Array.isArray(response?.filters) ? response.filters : [];
      setSavedFilters((prev) => {
        const seen = new Set(prev.map((item) => item.external_id));
        const dedupedIncoming = incoming.filter((item) => !seen.has(item.external_id));
        return prev.concat(dedupedIncoming);
      });
      if (typeof response?.total === "number") {
        setSavedFiltersTotal(response.total);
      } else if (incoming.length === 0) {
        setSavedFiltersTotal(currentOffset);
      }
    } catch (error) {
      setSavedFiltersError(error instanceof Error ? error.message : "Failed to load more screens.");
    } finally {
      setSavedFiltersLoadingMore(false);
    }
  };

  return (
    <>
      {screenExplorerOpen && (
        <div
          className="fixed left-0 right-0 bottom-0 bg-black/40 z-[58]"
          style={{ top: `${bodyTopOffset}px` }}
          onClick={() => setScreenExplorerOpen(false)}
        />
      )}
      {isSearchActive && (
        <div
          className="fixed inset-0 bg-black/60 z-[55]"
          onClick={() => {
            setSearchOpen(false);
            setSearchFocused(false);
          }}
        />
      )}

      <nav ref={navRef} className="h-14 bg-[#0f1729] border-b border-nav-hover flex items-center pl-6 pr-0 relative z-[70]">

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
                className="px-5 py-2 text-[13px] font-medium rounded-xl transition-colors text-white hover:text-white hover:bg-nav-hover/80 active:bg-nav-hover active:text-white"
                onClick={() => handleNavClick(item as NavItem)}
              >
                {item}
              </button>
            ))}
          </div>

          {/* SEARCH */}
          <div ref={searchRef} className="relative w-full max-w-md z-[80]">
            <div
              className={`flex items-center gap-2 w-full border transition-all ${
                searchOpen || searchFocused
                  ? "bg-white border-slate-200 border-b-0 shadow-lg rounded-t-xl rounded-b-none px-4 py-2.5"
                  : "bg-nav-hover border-nav-foreground/10 rounded-md px-3 py-2"
              }`}
            >
              <Search className="w-3.5 h-3.5 text-nav-foreground/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  setSearchFocused(true);
                  setSearchOpen(true);
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
              <div className="absolute left-0 right-0 top-full -mt-px bg-white border border-slate-200 border-t-0 rounded-b-xl shadow-2xl overflow-hidden z-[90] antialiased">
                {searchQuery.trim().length === 0 ? (
                  leaderboardsLoading ? (
                    <div className="px-4 py-3 space-y-3">
                      {Array.from({ length: LEADERBOARD_SKELETON_ROWS }).map((_, index) => (
                        <div key={`leaderboard-skel-${index}`} className="flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-3 w-56" />
                            <Skeleton className="h-2.5 w-28" />
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-2.5 w-12" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : bestPerformers.length === 0 && topGainers.length === 0 && topLosers.length === 0 ? (
                    <div className="px-4 py-3 text-[13px] text-slate-500">Leaderboards not available yet.</div>
                  ) : (
                    <div className="max-h-[450px] overflow-y-auto">
                      {topGainers.length > 0 && (
                        <>
                          <div className="px-4 py-2 text-[11px] uppercase tracking-widest text-slate-700 font-semibold bg-[#f1f1f1] hover:bg-[#f1f1f1] border-b border-slate-100">
                            Top Gainers
                          </div>
                          {topGainers.map((item) => {
                            const externalId = item.external_id ?? item.scheme_code;
                            const schemeSlug = toSchemeSlug(item.scheme_sub_name);
                            const changeValue = item.nav_change_1d;
                            const changeColor =
                              typeof changeValue === "number"
                                ? changeValue >= 0
                                  ? "text-emerald-600"
                                  : "text-rose-500"
                                : "text-slate-400";
                            return (
                              <Link
                                key={`top-gain-${externalId ?? item.scheme_sub_name}`}
                                to={`/${schemeSlug}/${externalId}`}
                                onClick={() => {
                                  if (externalId === undefined || externalId === null) return;
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
                                    <div className="text-[12px] text-slate-500">Top gainer</div>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className={`text-[14px] font-semibold ${changeColor}`}>
                                      {typeof changeValue === "number"
                                        ? `${changeValue >= 0 ? "+" : ""}${formatChange(changeValue)}`
                                        : "-"}
                                    </span>
                                    <span className="text-[11px] text-slate-400">1D Change</span>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </>
                      )}
                      {topLosers.length > 0 && (
                        <>
                          <div className="px-4 py-2 text-[11px] uppercase tracking-widest text-slate-700 font-semibold bg-[#f1f1f1] hover:bg-[#f1f1f1] border-b border-slate-100">
                            Top Losers
                          </div>
                          {topLosers.map((item) => {
                            const externalId = item.external_id ?? item.scheme_code;
                            const schemeSlug = toSchemeSlug(item.scheme_sub_name);
                            const changeValue = item.nav_change_1d;
                            const changeColor =
                              typeof changeValue === "number"
                                ? changeValue >= 0
                                  ? "text-emerald-600"
                                  : "text-rose-500"
                                : "text-slate-400";
                            return (
                              <Link
                                key={`top-lose-${externalId ?? item.scheme_sub_name}`}
                                to={`/${schemeSlug}/${externalId}`}
                                onClick={() => {
                                  if (externalId === undefined || externalId === null) return;
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
                                    <div className="text-[12px] text-slate-500">Top loser</div>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className={`text-[14px] font-semibold ${changeColor}`}>
                                      {typeof changeValue === "number"
                                        ? `${changeValue >= 0 ? "+" : ""}${formatChange(changeValue)}`
                                        : "-"}
                                    </span>
                                    <span className="text-[11px] text-slate-400">1D Change</span>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </>
                      )}
                      {bestPerformers.length > 0 && (
                        <>
                          <div className="px-4 py-2 text-[11px] uppercase tracking-widest text-slate-700 font-semibold bg-[#f1f1f1] hover:bg-[#f1f1f1] border-b border-slate-100">
                            Top Performers
                          </div>
                          {bestPerformers.map((item) => {
                            const externalId = item.external_id ?? item.scheme_code;
                            const schemeSlug = toSchemeSlug(item.scheme_sub_name);
                            const cagrValue = item.cagr_3y;
                            const cagrColor =
                              typeof cagrValue === "number"
                                ? cagrValue >= 0
                                  ? "text-emerald-600"
                                  : "text-rose-500"
                                : "text-slate-400";
                            return (
                              <Link
                                key={`top-perf-${externalId ?? item.scheme_sub_name}`}
                                to={`/${schemeSlug}/${externalId}`}
                                onClick={() => {
                                  if (externalId === undefined || externalId === null) return;
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
                                    <div className="text-[12px] text-slate-500">Top performer</div>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className={`text-[14px] font-semibold ${cagrColor}`}>
                                      {typeof cagrValue === "number"
                                        ? `${cagrValue >= 0 ? "+" : ""}${cagrValue.toFixed(2)}%`
                                        : "-"}
                                    </span>
                                    <span className="text-[11px] text-slate-400">3Y CAGR</span>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )
                ) : searchLoading ? (
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
                      const externalId = item.external_id ?? item.scheme_code;
                      const schemeSlug = toSchemeSlug(item.scheme_sub_name);

                      return (
                        <Link
                          key={externalId ?? item.scheme_sub_name}
                          to={`/${schemeSlug}/${externalId}`}
                          onClick={() => {
                            if (externalId === undefined || externalId === null) return;
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

              <DropdownMenuContent align="end" sideOffset={15} className="w-52">
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
            <div className="flex items-center mr-3">
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

      {screenExplorerOpen && (
        <div
          className="fixed left-0 right-0 bottom-0 z-[75] flex items-center justify-center px-3 py-0 pointer-events-none"
          style={{ top: `${bodyTopOffset}px` }}
        >
          <div className="w-full max-w-[920px] h-full bg-background border border-slate-200 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto">
            <div className="grid grid-cols-[240px_1fr] h-full">
              <div className="bg-[#f1f1f1] border-r border-slate-200 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-4">Explore Screens</p>
                <button className="w-full text-left px-3 py-2 rounded-md bg-white text-slate-900 text-[14px] font-medium border border-slate-200 inline-flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-[hsl(var(--nav))] fill-[hsl(var(--nav))]" />
                  <span>Saved</span>
                </button>
              </div>

              <div className="p-5 flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[18px] font-semibold text-slate-900">Saved Screens</h3>
                  <button
                    className="text-[12px] text-slate-500 hover:text-slate-700"
                    onClick={() => setScreenExplorerOpen(false)}
                  >
                    Close
                  </button>
                </div>

                {!isLoggedIn ? (
                  <div className="text-[13px] text-slate-600">Sign in to view saved screens.</div>
                ) : savedFiltersLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={`saved-filters-skel-${index}`} className="rounded-lg border border-slate-200 p-3">
                        <Skeleton className="h-4 w-48 mb-2" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    ))}
                  </div>
                ) : savedFiltersError ? (
                  <div className="text-[13px] text-red-500">{savedFiltersError}</div>
                ) : savedFilters.length === 0 ? (
                  <div className="text-[13px] text-slate-600">No saved screens found.</div>
                ) : (
                  <>
                    <div
                      className={`flex-1 min-h-0 pr-1 scrollbar-thin ${
                        savedListScrollable ? "overflow-y-auto" : "overflow-y-hidden"
                      }`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 auto-rows-fr">
                      {savedFilters.map((item) => (
                        <button
                          key={item.external_id}
                          className="w-full min-h-[112px] text-left rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
                          onClick={() => {
                            navigate(`/filters/${item.external_id}`);
                            setScreenExplorerOpen(false);
                          }}
                        >
                          <div className="text-[14px] font-semibold text-slate-900">
                            {item.name?.trim() || "Untitled Screen"}
                          </div>
                          <div className="text-[12px] text-slate-600 mt-1 line-clamp-2">
                            {item.description?.trim() || "No description"}
                          </div>
                        </button>
                      ))}
                      </div>
                    </div>
                    {savedFilters.length < savedFiltersTotal && (
                      <div className="mt-4 pt-3 border-t border-slate-200 flex justify-center">
                        <button
                          className="px-4 py-2 bg-[#0f1729] text-white rounded-md text-[13px] font-medium hover:bg-[#0b1322] transition-colors disabled:opacity-50"
                          onClick={() => void handleLoadMoreSavedFilters()}
                          disabled={savedFiltersLoadingMore}
                        >
                          {savedFiltersLoadingMore ? "Loading..." : "Load more"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};

export default Navbar;
