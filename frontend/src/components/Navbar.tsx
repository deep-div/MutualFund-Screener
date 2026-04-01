import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, ChevronDown, LogOut, User, Bookmark, LayoutTemplate, ListChecks, Trash2, Check, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import { SchemeSearchItem, searchSchemes } from "@/services/mutualFundService";
import { DefaultFilterGroup, SavedUserFilter, deleteUserFilters, getDefaultFilters, getUserFilters } from "@/services/userService";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";

const NAV_FORMATTER = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const LEADERBOARDS_SESSION_KEY = "mf_leaderboards_cache";
const LEADERBOARDS_LOADING_EVENT = "mf_leaderboards_loading";
const NEW_SCREEN_EVENT = "mf_new_screen_requested";
const NEW_WATCHLIST_EVENT = "mf_new_watchlist_requested";
const OPEN_AUTH_MODAL_EVENT = "mf_open_auth_modal";
const OPEN_MOBILE_FILTERS_EVENT = "mf_open_mobile_filters";
const CLOSE_MOBILE_WATCHLIST_PICKER_EVENT = "mf_close_mobile_watchlist_picker";
const FILTERS_SESSION_KEY = "mfs:filters:temp";
const SAVED_FILTERS_BATCH_SIZE = 10;
const MOBILE_EXPLORE_HISTORY_KEY = "__mf_mobile_explore_popup";

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
  const location = useLocation();
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
  const [savedFiltersHasMore, setSavedFiltersHasMore] = useState(false);
  const [watchlistFiltersLoading, setWatchlistFiltersLoading] = useState(false);
  const [watchlistFiltersLoadingMore, setWatchlistFiltersLoadingMore] = useState(false);
  const [watchlistFiltersError, setWatchlistFiltersError] = useState<string | null>(null);
  const [watchlistFilters, setWatchlistFilters] = useState<SavedUserFilter[]>([]);
  const [watchlistFiltersTotal, setWatchlistFiltersTotal] = useState(0);
  const [watchlistFiltersHasMore, setWatchlistFiltersHasMore] = useState(false);
  const [defaultFilterGroups, setDefaultFilterGroups] = useState<DefaultFilterGroup[]>([]);
  const [defaultFiltersLoading, setDefaultFiltersLoading] = useState(false);
  const [defaultFiltersError, setDefaultFiltersError] = useState<string | null>(null);
  const [activeScreenGroup, setActiveScreenGroup] = useState<string>("saved");
  const [selectedExternalIds, setSelectedExternalIds] = useState<string[]>([]);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [deletingExternalIds, setDeletingExternalIds] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteExternalIds, setPendingDeleteExternalIds] = useState<string[]>([]);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [mobileCreateMenuOpen, setMobileCreateMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [bodyTopOffset, setBodyTopOffset] = useState(56);
  const navRef = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const mobileExploreHistoryEntryRef = useRef(false);
  const isSearchActive = searchOpen || searchFocused;
  const selectedDefaultGroup = useMemo(
    () => defaultFilterGroups.find((group) => group.key === activeScreenGroup) ?? null,
    [defaultFilterGroups, activeScreenGroup]
  );
  const isSavedGroup = activeScreenGroup === "saved";
  const isWatchlistGroup = activeScreenGroup === "watchlist";
  const isUserCollectionGroup = isSavedGroup || isWatchlistGroup;
  const isScreenerRoute = location.pathname === "/" || location.pathname.startsWith("/filters/");
  const activeUserCollection = isSavedGroup ? savedFilters : isWatchlistGroup ? watchlistFilters : [];
  const activeSelectedExternalIds = selectedExternalIds.filter((externalId) =>
    activeUserCollection.some((item) => item.external_id === externalId)
  );
  const isDeletingAny = deletingExternalIds.length > 0;
  const pendingDeleteCount = pendingDeleteExternalIds.length;
  const closeAndClearSearch = () => {
    setSearchOpen(false);
    setSearchFocused(false);
    setSearchQuery("");
  };

  const closeSearchPanel = () => {
    setSearchOpen(false);
    setSearchFocused(false);
  };

  const setMobileFiltersOpenState = (open: boolean) => {
    window.dispatchEvent(new CustomEvent(OPEN_MOBILE_FILTERS_EVENT, { detail: { open } }));
  };

  const closeMobileWatchlistPicker = () => {
    if (!window.matchMedia("(max-width: 639px)").matches) return;
    window.dispatchEvent(new CustomEvent(CLOSE_MOBILE_WATCHLIST_PICKER_EVENT));
  };

  const openSearchPanel = () => {
    setSearchFocused(true);
    setSearchOpen(true);
  };

  const closeNavigationPopups = () => {
    setScreenExplorerOpen(false);
    setCreateMenuOpen(false);
    setMobileCreateMenuOpen(false);
  };

  const closeAllNonProfilePopups = () => {
    closeSearchPanel();
    closeNavigationPopups();
    setMobileFiltersOpenState(false);
    closeMobileWatchlistPicker();
  };

  const openAuthModal = () => {
    closeAllNonProfilePopups();
    setShowAuthModal(true);
  };

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
        closeAndClearSearch();
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
    if (!screenExplorerOpen) return;
    const loadDefaultFilters = async () => {
      setDefaultFiltersLoading(true);
      setDefaultFiltersError(null);
      try {
        const response = await getDefaultFilters();
        const groups = Array.isArray(response?.groups) ? response.groups : [];
        setDefaultFilterGroups(groups);
        setActiveScreenGroup((prev) => {
          if (prev === "saved" || prev === "watchlist" || groups.some((group) => group.key === prev)) return prev;
          return isLoggedIn ? "saved" : groups[0]?.key ?? "saved";
        });
      } catch (error) {
        setDefaultFilterGroups([]);
        setDefaultFiltersError(error instanceof Error ? error.message : "Failed to load default screens.");
      } finally {
        setDefaultFiltersLoading(false);
      }
    };
    void loadDefaultFilters();
  }, [screenExplorerOpen, isLoggedIn]);

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
          screen_type: "screen",
        });
        const filters = Array.isArray(response?.filters) ? response.filters : [];
        const hasTotal = typeof response?.total === "number";
        const resolvedTotal = hasTotal ? (response?.total as number) : filters.length;
        setSavedFilters(filters);
        setSavedFiltersTotal(resolvedTotal);
        setSavedFiltersHasMore(hasTotal ? filters.length < resolvedTotal : filters.length >= SAVED_FILTERS_BATCH_SIZE);
      } catch (error) {
        setSavedFilters([]);
        setSavedFiltersTotal(0);
        setSavedFiltersHasMore(false);
        setSavedFiltersError(error instanceof Error ? error.message : "Failed to load saved screens.");
      } finally {
        setSavedFiltersLoading(false);
      }
    };
    void loadSavedFilters();
  }, [screenExplorerOpen, isLoggedIn, user]);

  useEffect(() => {
    if (!screenExplorerOpen || !isLoggedIn || !user) return;
    const loadWatchlistFilters = async () => {
      setWatchlistFiltersLoading(true);
      setWatchlistFiltersError(null);
      try {
        const token = await user.getIdToken();
        const response = await getUserFilters(token, {
          limit: SAVED_FILTERS_BATCH_SIZE,
          offset: 0,
          screen_type: "watchlist",
        });
        const filters = Array.isArray(response?.filters) ? response.filters : [];
        const hasTotal = typeof response?.total === "number";
        const resolvedTotal = hasTotal ? (response?.total as number) : filters.length;
        setWatchlistFilters(filters);
        setWatchlistFiltersTotal(resolvedTotal);
        setWatchlistFiltersHasMore(hasTotal ? filters.length < resolvedTotal : filters.length >= SAVED_FILTERS_BATCH_SIZE);
      } catch (error) {
        setWatchlistFilters([]);
        setWatchlistFiltersTotal(0);
        setWatchlistFiltersHasMore(false);
        setWatchlistFiltersError(error instanceof Error ? error.message : "Failed to load watchlists.");
      } finally {
        setWatchlistFiltersLoading(false);
      }
    };
    void loadWatchlistFilters();
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

  useEffect(() => {
    const isMobileViewport = () => window.matchMedia("(max-width: 767px)").matches;
    const handlePopState = () => {
      if (!isMobileViewport()) return;
      if (!screenExplorerOpen || !mobileExploreHistoryEntryRef.current) return;
      mobileExploreHistoryEntryRef.current = false;
      setScreenExplorerOpen(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [screenExplorerOpen]);

  useEffect(() => {
    const isMobileViewport = () => window.matchMedia("(max-width: 767px)").matches;
    if (!isMobileViewport()) {
      mobileExploreHistoryEntryRef.current = false;
      return;
    }

    if (screenExplorerOpen) {
      if (mobileExploreHistoryEntryRef.current) return;
      const currentState =
        window.history.state && typeof window.history.state === "object" ? window.history.state : {};
      window.history.pushState({ ...currentState, [MOBILE_EXPLORE_HISTORY_KEY]: true }, "", window.location.href);
      mobileExploreHistoryEntryRef.current = true;
      return;
    }

    if (!mobileExploreHistoryEntryRef.current) return;
    const historyState = window.history.state;
    const hasExploreMarker = Boolean(
      historyState &&
        typeof historyState === "object" &&
        MOBILE_EXPLORE_HISTORY_KEY in (historyState as Record<string, unknown>)
    );
    mobileExploreHistoryEntryRef.current = false;
    if (hasExploreMarker) {
      window.history.back();
    }
  }, [screenExplorerOpen]);

  useEffect(() => {
    const handleOpenAuthModal = () => openAuthModal();
    window.addEventListener(OPEN_AUTH_MODAL_EVENT, handleOpenAuthModal);
    return () => window.removeEventListener(OPEN_AUTH_MODAL_EVENT, handleOpenAuthModal);
  }, []);

  useEffect(() => {
    const isMobileViewport = () => window.matchMedia("(max-width: 767px)").matches;
    const handleAnyScroll = () => {
      if (!isMobileViewport()) return;
      if (!profileMenuOpen && !mobileCreateMenuOpen && !createMenuOpen) return;
      setProfileMenuOpen(false);
      setMobileCreateMenuOpen(false);
      setCreateMenuOpen(false);
    };

    document.addEventListener("scroll", handleAnyScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", handleAnyScroll, true);
  }, [profileMenuOpen, mobileCreateMenuOpen, createMenuOpen]);

  useEffect(() => {
    setSelectedExternalIds((prev) =>
      prev.filter((externalId) => activeUserCollection.some((item) => item.external_id === externalId))
    );
    setBulkSelectMode(false);
  }, [activeScreenGroup, activeUserCollection]);

  useEffect(() => {
    if (!screenExplorerOpen) {
      setSelectedExternalIds([]);
      setBulkSelectMode(false);
      setDeleteConfirmOpen(false);
      setPendingDeleteExternalIds([]);
    }
  }, [screenExplorerOpen]);

  const handleExploreClick = () => {
    if (!isScreenerRoute) {
      navigate("/");
    }
    setCreateMenuOpen(false);
    setMobileCreateMenuOpen(false);
    setActiveScreenGroup("saved");
    setScreenExplorerOpen(true);
  };

  const handleCreateSelection = (type: "screen" | "watchlist") => {
    setCreateMenuOpen(false);
    setMobileCreateMenuOpen(false);
    setScreenExplorerOpen(false);
    if (!isLoggedIn) {
      toast("Sign in required", {
        description: "Please sign in to create and save new items.",
      });
      return;
    }
    if (type === "screen") {
      navigate("/");
      window.dispatchEvent(new CustomEvent(NEW_SCREEN_EVENT));
      return;
    }
    navigate("/");
    window.dispatchEvent(new CustomEvent(NEW_WATCHLIST_EVENT));
  };

  const handleMobileFiltersClick = () => {
    if (!isScreenerRoute) return;
    setMobileFiltersOpenState(true);
  };

  const handleLogout = async () => {
    closeAllNonProfilePopups();
    setProfileMenuOpen(false);
    setScreenExplorerOpen(false);

    try {
      sessionStorage.removeItem(FILTERS_SESSION_KEY);
    } catch {
      // Ignore storage errors.
    }

    try {
      await logout();
      window.location.assign("/");
    } catch (error) {
      toast("Logout failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleLoadMoreSavedFilters = async () => {
    if (!user || savedFiltersLoadingMore) return;
    if (!savedFiltersHasMore) return;
    const currentOffset = savedFilters.length;
    if (savedFiltersTotal > 0 && currentOffset >= savedFiltersTotal) return;
    setSavedFiltersLoadingMore(true);
    try {
      const token = await user.getIdToken();
      const response = await getUserFilters(token, {
        limit: SAVED_FILTERS_BATCH_SIZE,
        offset: currentOffset,
        screen_type: "screen",
      });
      const incoming = Array.isArray(response?.filters) ? response.filters : [];
      let nextSavedFiltersCount = currentOffset;
      setSavedFilters((prev) => {
        const seen = new Set(prev.map((item) => item.external_id));
        const dedupedIncoming = incoming.filter((item) => !seen.has(item.external_id));
        const next = prev.concat(dedupedIncoming);
        nextSavedFiltersCount = next.length;
        return next;
      });
      if (typeof response?.total === "number") {
        setSavedFiltersTotal(response.total);
        setSavedFiltersHasMore(nextSavedFiltersCount < response.total);
      } else {
        setSavedFiltersHasMore(incoming.length >= SAVED_FILTERS_BATCH_SIZE);
        if (incoming.length === 0) {
          setSavedFiltersTotal(currentOffset);
        }
      }
    } catch (error) {
      setSavedFiltersHasMore(false);
      setSavedFiltersError(error instanceof Error ? error.message : "Failed to load more screens.");
    } finally {
      setSavedFiltersLoadingMore(false);
    }
  };

  const handleLoadMoreWatchlistFilters = async () => {
    if (!user || watchlistFiltersLoadingMore) return;
    if (!watchlistFiltersHasMore) return;
    const currentOffset = watchlistFilters.length;
    if (watchlistFiltersTotal > 0 && currentOffset >= watchlistFiltersTotal) return;
    setWatchlistFiltersLoadingMore(true);
    try {
      const token = await user.getIdToken();
      const response = await getUserFilters(token, {
        limit: SAVED_FILTERS_BATCH_SIZE,
        offset: currentOffset,
        screen_type: "watchlist",
      });
      const incoming = Array.isArray(response?.filters) ? response.filters : [];
      let nextWatchlistFiltersCount = currentOffset;
      setWatchlistFilters((prev) => {
        const seen = new Set(prev.map((item) => item.external_id));
        const dedupedIncoming = incoming.filter((item) => !seen.has(item.external_id));
        const next = prev.concat(dedupedIncoming);
        nextWatchlistFiltersCount = next.length;
        return next;
      });
      if (typeof response?.total === "number") {
        setWatchlistFiltersTotal(response.total);
        setWatchlistFiltersHasMore(nextWatchlistFiltersCount < response.total);
      } else {
        setWatchlistFiltersHasMore(incoming.length >= SAVED_FILTERS_BATCH_SIZE);
        if (incoming.length === 0) {
          setWatchlistFiltersTotal(currentOffset);
        }
      }
    } catch (error) {
      setWatchlistFiltersHasMore(false);
      setWatchlistFiltersError(error instanceof Error ? error.message : "Failed to load more watchlists.");
    } finally {
      setWatchlistFiltersLoadingMore(false);
    }
  };

  const toggleSelectedExternalId = (externalId: string) => {
    const normalized = externalId.trim();
    if (!normalized) return;
    setSelectedExternalIds((prev) =>
      prev.includes(normalized) ? prev.filter((id) => id !== normalized) : [...prev, normalized]
    );
  };

  const handleDeleteFilters = (externalIds: string[]) => {
    const normalizedExternalIds = Array.from(
      new Set(
        externalIds
          .map((externalId) => externalId.trim())
          .filter((externalId) => externalId.length > 0)
      )
    );
    if (normalizedExternalIds.length === 0) return;
    setPendingDeleteExternalIds(normalizedExternalIds);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteFilters = async () => {
    if (!user) return;
    const normalizedExternalIds = pendingDeleteExternalIds;
    if (normalizedExternalIds.length === 0) {
      setDeleteConfirmOpen(false);
      return;
    }
    setDeletingExternalIds((prev) => Array.from(new Set([...prev, ...normalizedExternalIds])));
    try {
      const token = await user.getIdToken();
      await deleteUserFilters(token, normalizedExternalIds);
      const deletionSet = new Set(normalizedExternalIds);
      setSavedFilters((prev) => prev.filter((item) => !deletionSet.has(item.external_id)));
      setWatchlistFilters((prev) => prev.filter((item) => !deletionSet.has(item.external_id)));
      setSavedFiltersTotal((prev) => Math.max(0, prev - normalizedExternalIds.length));
      setWatchlistFiltersTotal((prev) => Math.max(0, prev - normalizedExternalIds.length));
      setSelectedExternalIds((prev) => prev.filter((externalId) => !deletionSet.has(externalId)));
      setBulkSelectMode(false);
      toast("Deleted", {
        description:
          normalizedExternalIds.length === 1
            ? "Item deleted successfully."
            : `${normalizedExternalIds.length} items deleted successfully.`,
      });
      setDeleteConfirmOpen(false);
      setPendingDeleteExternalIds([]);
    } catch (error) {
      toast("Delete failed", {
        description: error instanceof Error ? error.message : "Unable to delete selected items.",
      });
    } finally {
      setDeletingExternalIds((prev) => prev.filter((id) => !normalizedExternalIds.includes(id)));
    }
  };

  return (
    <>
      {screenExplorerOpen && (
        <div
          className="fixed left-0 right-0 bottom-0 bg-black/40 z-[58]"
          style={{ top: `${Math.max(0, bodyTopOffset - 1)}px` }}
          onClick={() => setScreenExplorerOpen(false)}
        />
      )}
      {isSearchActive && (
        <div
          className="fixed inset-0 bg-black/60 z-[55]"
          onClick={closeAndClearSearch}
        />
      )}
      {deleteConfirmOpen && (
        <div
          className="fixed inset-0 z-[130] bg-black/55 flex items-center justify-center px-4"
          onClick={() => {
            if (isDeletingAny) return;
            setDeleteConfirmOpen(false);
            setPendingDeleteExternalIds([]);
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-[17px] font-semibold text-slate-900">Delete confirmation</h3>
            <p className="mt-2 text-[13px] text-slate-600 leading-relaxed">
              {pendingDeleteCount > 1
                ? `Are you sure you want to delete ${pendingDeleteCount} selected items? This action cannot be undone.`
                : "Are you sure you want to delete this item? This action cannot be undone."}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setPendingDeleteExternalIds([]);
                }}
                disabled={isDeletingAny}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-red-600 px-3 py-2 text-[12px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
                onClick={() => void handleConfirmDeleteFilters()}
                disabled={isDeletingAny}
              >
                {isDeletingAny ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        ref={navRef}
        className="relative z-[70] flex min-h-14 flex-wrap items-center gap-y-2 border-b border-nav-hover bg-[#0f1729] px-3 py-2 sm:px-3 lg:flex-nowrap lg:gap-y-0 lg:pl-3 lg:pr-3"
      >

        {/* LEFT: Logo */}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-0.5 text-base font-bold tracking-tight text-nav-foreground sm:text-lg lg:w-[140px]"
        >
          <img src="/logo.png" alt="FundScreener logo" className="w-8 h-8" />
          <span className="hidden sm:inline">FundScreener</span>
          <span className="sm:hidden">FundScreener</span>
        </Link>

        {/* CENTER: Nav + Search (Centered, no empty space) */}
        <div className="order-3 flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3 lg:order-none lg:flex-1 lg:justify-center lg:gap-8">

          {/* NAV ITEMS */}
          <div className="hidden -ml-1 items-center gap-2 overflow-x-auto scrollbar-hidden sm:ml-0 sm:flex">
            <button
              className="min-h-10 whitespace-nowrap rounded-xl px-3 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-nav-hover/80 hover:text-white active:bg-nav-hover active:text-white sm:px-4 sm:text-[14px] lg:px-5 lg:text-[14px]"
              onClick={handleExploreClick}
            >
              Explore
            </button>

            <DropdownMenu
              modal={false}
              open={createMenuOpen}
              onOpenChange={(nextOpen) => {
                setCreateMenuOpen(nextOpen);
                if (nextOpen) {
                  closeSearchPanel();
                  setScreenExplorerOpen(false);
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <button
                  className={`inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-[13px] font-medium text-white transition-colors sm:px-4 sm:text-[14px] lg:px-5 lg:text-[14px] ${
                    createMenuOpen
                      ? "bg-nav-hover text-white"
                      : "hover:bg-nav-hover/80 hover:text-white active:bg-nav-hover active:text-white"
                  }`}
                >
                  <span>Create</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${createMenuOpen ? "rotate-180" : ""}`} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={10}
                className="w-[150px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl"
              >
                <DropdownMenuItem
                  className="group cursor-pointer rounded-lg px-2.5 py-2 text-[13px] font-semibold text-slate-900 focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
                  onClick={() => handleCreateSelection("screen")}
                >
                  <div className="mr-2 rounded-md border border-slate-200 bg-slate-50 p-1.5 text-slate-700 group-focus:bg-white">
                    <LayoutTemplate className="h-3.5 w-3.5" />
                  </div>
                  <span>Screen</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="group cursor-pointer rounded-lg px-2.5 py-2 text-[13px] font-semibold text-slate-900 focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
                  onClick={() => handleCreateSelection("watchlist")}
                >
                  <div className="mr-2 rounded-md border border-slate-200 bg-slate-50 p-1.5 text-slate-700 group-focus:bg-white">
                    <ListChecks className="h-3.5 w-3.5" />
                  </div>
                  <span>Watchlist</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* SEARCH */}
          <div ref={searchRef} className="relative z-[80] w-full lg:max-w-md">
            <div
              className={`flex h-10 w-full items-center gap-2 border transition-all ${
                searchOpen || searchFocused
                  ? "bg-white border-slate-200 border-b-0 shadow-lg rounded-t-xl rounded-b-none px-4"
                  : "bg-nav-hover border-nav-foreground/10 rounded-md px-3"
              }`}
            >
              <Search className="w-3.5 h-3.5 text-nav-foreground/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  closeNavigationPopups();
                  setSearchQuery(e.target.value);
                }}
                onFocus={() => {
                  closeNavigationPopups();
                  openSearchPanel();
                }}
                onClick={() => {
                  closeNavigationPopups();
                  openSearchPanel();
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
                                  closeAndClearSearch();
                                  if (externalId === undefined || externalId === null) return;
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
                                  closeAndClearSearch();
                                  if (externalId === undefined || externalId === null) return;
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
                                  closeAndClearSearch();
                                  if (externalId === undefined || externalId === null) return;
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
                            closeAndClearSearch();
                            if (externalId === undefined || externalId === null) return;
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
        <div className="order-2 ml-auto flex min-w-0 justify-end lg:order-none lg:ml-0 lg:w-[140px]">
          {loading ? (
            <div className="h-7 w-24 rounded-md bg-nav-hover/70 animate-pulse" />
          ) : isLoggedIn ? (
            <DropdownMenu
              modal={false}
              open={profileMenuOpen}
              onOpenChange={(nextOpen) => {
                if (nextOpen) {
                  closeAllNonProfilePopups();
                }
                setProfileMenuOpen(nextOpen);
              }}
            >
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 text-[13px] text-nav-foreground">
                  <div className="w-8 h-8 rounded-full bg-primary/30 grid place-items-center text-[12px] font-semibold leading-none">
                    <span className="leading-none">{(user?.displayName || user?.email || "A")[0]?.toUpperCase()}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-nav-foreground/60" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" sideOffset={15} className="w-40">
                <DropdownMenuItem
                  className="text-[14px] cursor-pointer py-2.5"
                  onClick={() => navigate("/profile")}
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>

              <DropdownMenuItem
                  className="text-[14px] cursor-pointer text-destructive py-2.5"
                  onClick={() => void handleLogout()}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center">
              <button
                onClick={openAuthModal}
                className="mr-1.5 text-[13px] bg-primary text-white px-4 py-1.5 rounded-md hover:opacity-90 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Loading..." : "Get Started"}
              </button>
            </div>
          )}
        </div>

      </nav>

      {isScreenerRoute && (
        <div
          className="fixed inset-x-0 z-[72] border-t border-slate-200 bg-white/90 px-2 pt-1.5 backdrop-blur-sm sm:hidden"
          style={{ bottom: "max(0px, env(safe-area-inset-bottom))" }}
        >
          <div className="grid w-full grid-cols-3 gap-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={handleMobileFiltersClick}
              className="inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white/70 px-2 py-2 text-[12px] font-semibold tracking-[0.01em] text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all hover:bg-white active:scale-[0.99] active:bg-slate-100"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
            </button>
            <button
              type="button"
              onClick={handleExploreClick}
              className={`inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[12px] font-semibold tracking-[0.01em] transition-all active:scale-[0.99] ${
                screenExplorerOpen
                  ? "border-sky-300 bg-sky-50 text-sky-700 shadow-[0_0_0_1px_rgba(56,189,248,0.12)]"
                  : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white active:bg-slate-100"
              }`}
              aria-label="Open explore screens"
            >
              <span>Explore</span>
            </button>
            <DropdownMenu
              modal={false}
              open={mobileCreateMenuOpen}
              onOpenChange={(nextOpen) => {
                setMobileCreateMenuOpen(nextOpen);
                if (nextOpen) {
                  closeSearchPanel();
                  setScreenExplorerOpen(false);
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <button
                  className={`inline-flex min-h-12 w-full items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[12px] font-semibold tracking-[0.01em] transition-all active:scale-[0.99] ${
                    mobileCreateMenuOpen
                      ? "border-[#0b64f4]/40 bg-[#0b64f4]/10 text-[#0b64f4] shadow-[0_0_0_1px_rgba(11,100,244,0.16)]"
                      : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white active:bg-slate-100"
                  }`}
                  aria-expanded={mobileCreateMenuOpen}
                  aria-label="Create menu"
                >
                  <span>Create</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mobileCreateMenuOpen ? "rotate-180" : ""}`} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                side="top"
                sideOffset={8}
                className="w-[170px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl"
              >
                <DropdownMenuItem
                  className="group cursor-pointer rounded-lg px-2.5 py-2 text-[13px] font-semibold text-slate-900 focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
                  onClick={() => handleCreateSelection("screen")}
                >
                  <div className="mr-2 rounded-md border border-slate-200 bg-slate-50 p-1.5 text-slate-700 group-focus:bg-white">
                    <LayoutTemplate className="h-3.5 w-3.5" />
                  </div>
                  <span>Screen</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="group cursor-pointer rounded-lg px-2.5 py-2 text-[13px] font-semibold text-slate-900 focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
                  onClick={() => handleCreateSelection("watchlist")}
                >
                  <div className="mr-2 rounded-md border border-slate-200 bg-slate-50 p-1.5 text-slate-700 group-focus:bg-white">
                    <ListChecks className="h-3.5 w-3.5" />
                  </div>
                  <span>Watchlist</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {screenExplorerOpen && (
        <div
          className="fixed left-0 right-0 bottom-0 z-[75] flex items-stretch justify-center px-0 py-0 pointer-events-none md:items-center md:px-3"
          style={{ top: `${Math.max(0, bodyTopOffset - 1)}px` }}
        >
          <div className="pointer-events-auto h-full w-full max-w-none overflow-hidden rounded-none border-0 border-slate-200 bg-background shadow-2xl md:max-w-[860px] md:rounded-2xl md:border">
            <div className="flex h-full flex-col md:grid md:grid-cols-[220px_1fr]">
              <div className="border-b border-slate-200 bg-[#f1f1f1] p-3 md:border-b-0 md:border-r md:p-4">
                <p className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-slate-600 md:mb-5">Screen Categories</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-mobile-hidden md:block md:space-y-3 md:overflow-visible md:pb-0">
                  <button
                    className={`shrink-0 rounded-md border px-2.5 py-2 text-left text-[14px] font-medium transition-colors md:w-full md:px-3 md:py-2.5 md:text-[15px] ${
                      activeScreenGroup === "saved"
                        ? "bg-white text-slate-900 border-slate-200"
                        : "bg-transparent text-slate-600 border-transparent hover:bg-white/70"
                    }`}
                    onClick={() => setActiveScreenGroup("saved")}
                    disabled={!isLoggedIn}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-[hsl(var(--nav))] fill-[hsl(var(--nav))]" />
                      <span className="text-[15px] font-medium">Screens</span>
                    </span>
                  </button>
                  <button
                    className={`shrink-0 rounded-md border px-2.5 py-2 text-left text-[14px] font-medium transition-colors md:w-full md:px-3 md:py-2.5 md:text-[15px] ${
                      activeScreenGroup === "watchlist"
                        ? "bg-white text-slate-900 border-slate-200"
                        : "bg-transparent text-slate-600 border-transparent hover:bg-white/70"
                    }`}
                    onClick={() => setActiveScreenGroup("watchlist")}
                    disabled={!isLoggedIn}
                  >
                    <span className="inline-flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-[hsl(var(--nav))]" />
                      <span className="text-[15px] font-medium">Watchlist</span>
                    </span>
                  </button>

                  {defaultFilterGroups.map((group) => (
                    <button
                      key={group.key}
                      className={`shrink-0 rounded-md border px-2.5 py-2 text-left text-[14px] font-medium transition-colors md:w-full md:px-3 md:py-2.5 md:text-[15px] ${
                        activeScreenGroup === group.key
                          ? "bg-white text-slate-900 border-slate-200"
                          : "bg-transparent text-slate-600 border-transparent hover:bg-white/70"
                      }`}
                      onClick={() => setActiveScreenGroup(group.key)}
                      disabled={!isLoggedIn}
                    >
                      {group.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col p-4 md:h-full md:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[18px] font-semibold text-slate-900">
                    {isSavedGroup
                      ? "Saved Screens"
                      : isWatchlistGroup
                      ? "Watchlists"
                      : selectedDefaultGroup?.label ?? "Default Screens"}
                  </h3>
                  <div className="flex items-center gap-2">
                    {isLoggedIn && isUserCollectionGroup && (
                      bulkSelectMode ? (
                        <>
                          <button
                            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-[12px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                            onClick={() => void handleDeleteFilters(activeSelectedExternalIds)}
                            disabled={activeSelectedExternalIds.length === 0 || isDeletingAny}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete {activeSelectedExternalIds.length > 0 ? `(${activeSelectedExternalIds.length})` : ""}</span>
                          </button>
                          <button
                            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              setBulkSelectMode(false);
                              setSelectedExternalIds([]);
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          onClick={() => {
                            setBulkSelectMode(true);
                            setSelectedExternalIds([]);
                          }}
                          disabled={activeUserCollection.length === 0 || isDeletingAny}
                        >
                          Select
                        </button>
                      )
                    )}
                    <button
                      className="text-[12px] text-slate-500 hover:text-slate-700"
                      onClick={() => setScreenExplorerOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>

                {!isLoggedIn ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-full max-w-sm rounded-xl border border-dashed border-slate-200 bg-white/80 p-6 text-center">
                      <p className="text-[14px] font-semibold text-slate-900">Sign in to access screens</p>
                      <p className="mt-2 text-[12px] text-slate-600">
                        Create an account to view saved and curated screens.
                      </p>
                      <button
                        onClick={() => {
                          openAuthModal();
                        }}
                        className="mt-4 inline-flex items-center justify-center rounded-md bg-[#0f1729] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#0b1322] transition-colors"
                      >
                        Sign in / Sign up
                      </button>
                    </div>
                  </div>
                ) : defaultFiltersError && !isSavedGroup && !isWatchlistGroup ? (
                  <div className="text-[13px] text-red-500">{defaultFiltersError}</div>
                ) : defaultFiltersLoading && !isSavedGroup && !isWatchlistGroup ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={`default-filters-skel-${index}`} className="rounded-lg border border-slate-200 p-3">
                        <Skeleton className="h-4 w-48 mb-2" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    ))}
                  </div>
                ) : isSavedGroup ? (
                  !isLoggedIn ? (
                    <div className="text-[13px] text-slate-600">Sign in to view your saved screens.</div>
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
                        className="flex-1 min-h-0 pr-1 overflow-y-auto scrollbar-mobile-hidden"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 auto-rows-fr">
                          {savedFilters.map((item) => {
                            const isSelected = selectedExternalIds.includes(item.external_id);
                            return (
                            <div key={item.external_id} className="relative group">
                              <button
                                className={`w-full min-h-[112px] text-left rounded-xl border border-slate-200 p-3 ${
                                  bulkSelectMode ? "pl-11 pr-3" : "pl-3 pr-10"
                                } hover:bg-slate-50 transition-colors`}
                                onClick={() => {
                                  if (bulkSelectMode) {
                                    toggleSelectedExternalId(item.external_id);
                                    return;
                                  }
                                  navigate(`/filters/${item.external_id}`);
                                  setScreenExplorerOpen(false);
                                }}
                                disabled={deletingExternalIds.includes(item.external_id)}
                              >
                                <div className="text-[17px] leading-6 font-semibold text-slate-900">
                                  {item.name?.trim() || "Untitled Screen"}
                                </div>
                                <div className="text-[12px] text-slate-600 mt-1 line-clamp-2">
                                  {item.description?.trim() || "No description"}
                                </div>
                              </button>
                              {bulkSelectMode ? (
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-label={`Select ${item.name?.trim() || "screen"}`}
                                  aria-checked={isSelected}
                                  onClick={() => toggleSelectedExternalId(item.external_id)}
                                  className={`absolute left-3 top-3 inline-flex h-4 w-4 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[hsl(var(--nav))] ${
                                    isSelected
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-border hover:border-muted-foreground bg-secondary"
                                  }`}
                                >
                                  {isSelected && <Check className="h-3 w-3" />}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto hover:bg-slate-100 hover:text-red-600 disabled:opacity-50"
                                  onClick={() => void handleDeleteFilters([item.external_id])}
                                  disabled={deletingExternalIds.includes(item.external_id)}
                                  aria-label={`Delete ${item.name?.trim() || "screen"}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )})}
                        </div>
                      </div>
                      {savedFiltersHasMore && (
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
                  )
                ) : isWatchlistGroup ? (
                  !isLoggedIn ? (
                    <div className="text-[13px] text-slate-600">Sign in to view your watchlists.</div>
                  ) : watchlistFiltersLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div key={`watchlist-filters-skel-${index}`} className="rounded-lg border border-slate-200 p-3">
                          <Skeleton className="h-4 w-48 mb-2" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : watchlistFiltersError ? (
                    <div className="text-[13px] text-red-500">{watchlistFiltersError}</div>
                  ) : watchlistFilters.length === 0 ? (
                    <div className="text-[13px] text-slate-600">No watchlists found.</div>
                  ) : (
                    <>
                      <div className="flex-1 min-h-0 pr-1 overflow-y-auto scrollbar-mobile-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 auto-rows-fr">
                          {watchlistFilters.map((item) => {
                            const isSelected = selectedExternalIds.includes(item.external_id);
                            return (
                            <div key={item.external_id} className="relative group">
                              <button
                                className={`w-full min-h-[112px] text-left rounded-xl border border-slate-200 p-3 ${
                                  bulkSelectMode ? "pl-11 pr-3" : "pl-3 pr-10"
                                } hover:bg-slate-50 transition-colors`}
                                onClick={() => {
                                  if (bulkSelectMode) {
                                    toggleSelectedExternalId(item.external_id);
                                    return;
                                  }
                                  navigate(`/filters/${item.external_id}`);
                                  setScreenExplorerOpen(false);
                                }}
                                disabled={deletingExternalIds.includes(item.external_id)}
                              >
                                <div className="text-[17px] leading-6 font-semibold text-slate-900">
                                  {item.name?.trim() || "Untitled Watchlist"}
                                </div>
                                <div className="text-[12px] text-slate-600 mt-1 line-clamp-2">
                                  {item.description?.trim() || "No description"}
                                </div>
                              </button>
                              {bulkSelectMode ? (
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-label={`Select ${item.name?.trim() || "watchlist"}`}
                                  aria-checked={isSelected}
                                  onClick={() => toggleSelectedExternalId(item.external_id)}
                                  className={`absolute left-3 top-3 inline-flex h-4 w-4 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[hsl(var(--nav))] ${
                                    isSelected
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-border hover:border-muted-foreground bg-secondary"
                                  }`}
                                >
                                  {isSelected && <Check className="h-3 w-3" />}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto hover:bg-slate-100 hover:text-red-600 disabled:opacity-50"
                                  onClick={() => void handleDeleteFilters([item.external_id])}
                                  disabled={deletingExternalIds.includes(item.external_id)}
                                  aria-label={`Delete ${item.name?.trim() || "watchlist"}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )})}
                        </div>
                      </div>
                      {watchlistFiltersHasMore && (
                        <div className="mt-4 pt-3 border-t border-slate-200 flex justify-center">
                          <button
                            className="px-4 py-2 bg-[#0f1729] text-white rounded-md text-[13px] font-medium hover:bg-[#0b1322] transition-colors disabled:opacity-50"
                            onClick={() => void handleLoadMoreWatchlistFilters()}
                            disabled={watchlistFiltersLoadingMore}
                          >
                            {watchlistFiltersLoadingMore ? "Loading..." : "Load more"}
                          </button>
                        </div>
                      )}
                    </>
                  )
                ) : !selectedDefaultGroup || selectedDefaultGroup.filters.length === 0 ? (
                  <div className="text-[13px] text-slate-600">No screens available in this category.</div>
                ) : (
                  <div className="flex-1 min-h-0 pr-1 overflow-y-auto scrollbar-mobile-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 auto-rows-fr">
                      {selectedDefaultGroup.filters.map((item) => (
                        <button
                          key={item.external_id}
                          className="w-full min-h-[112px] text-left rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
                          onClick={() => {
                            navigate(`/filters/${item.external_id}`);
                            setScreenExplorerOpen(false);
                          }}
                        >
                          <div className="text-[17px] leading-6 font-semibold text-slate-900">
                            {item.name?.trim() || "Untitled Screen"}
                          </div>
                          <div className="text-[12px] text-slate-600 mt-1 line-clamp-2">
                            {item.description?.trim() || "No description"}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
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

