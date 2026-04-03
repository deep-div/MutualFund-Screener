import Navbar from "@/components/Navbar";
import TickerTape from "@/components/TickerTape";
import FilterSidebar from "@/components/FilterSidebar";
import FundTable from "@/components/FundTable";
import { listSchemes } from "@/services/mutualFundService";
import {
  FILTER_DEFINITIONS_BY_ID,
  DEFAULT_ENABLED_FILTERS,
  PINNED_FILTERS,
  FilterValueMap,
  FilterRangeMeta,
} from "@/data/filters";
import { useAuth } from "@/contexts/AuthContext";
import { getDefaultFilters, getUserFilters, SavedUserFilter } from "@/services/userService";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
const NEW_SCREEN_EVENT = "mf_new_screen_requested";
const NEW_WATCHLIST_EVENT = "mf_new_watchlist_requested";
const OPEN_MOBILE_FILTERS_EVENT = "mf_open_mobile_filters";
const MOBILE_FILTERS_HISTORY_KEY = "__mf_mobile_filters_popup";
const WATCHLIST_DERIVED_FILTER_FETCH_LIMIT = 100;
type BuilderType = "screen" | "watchlist";

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { savedFilterId } = useParams<{ savedFilterId?: string }>();
  const sessionKey = "mfs:filters:temp";
  const [enabledFilters, setEnabledFilters] = useState<string[]>(DEFAULT_ENABLED_FILTERS);
  const [filterValues, setFilterValues] = useState<FilterValueMap>({});
  const [rangeMeta, setRangeMeta] = useState<FilterRangeMeta>({});
  const [screenResetToken, setScreenResetToken] = useState(0);
  const [initialScreenTitle, setInitialScreenTitle] = useState("");
  const [initialScreenDescription, setInitialScreenDescription] = useState("");
  const [initialScreenUpdatedAt, setInitialScreenUpdatedAt] = useState<string | null>(null);
  const [initialSortField, setInitialSortField] = useState<string | null>(null);
  const [initialSortOrder, setInitialSortOrder] = useState<"asc" | "desc" | null>(null);
  const [initialExternalIds, setInitialExternalIds] = useState<string[]>([]);
  const [builderType, setBuilderType] = useState<BuilderType>("screen");
  const [restoredFilterExternalId, setRestoredFilterExternalId] = useState<string | null>(null);
  const [restoringSavedFilter, setRestoringSavedFilter] = useState(false);
  const [lastSavedFilterRestoreAttemptKey, setLastSavedFilterRestoreAttemptKey] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [desktopFiltersCollapsed, setDesktopFiltersCollapsed] = useState(false);
  const mobileFiltersHistoryEntryRef = useRef(false);
  const normalizedSavedFilterId = savedFilterId?.trim().toLowerCase() ?? "";
  const currentRestoreAttemptKey = normalizedSavedFilterId
    ? `${normalizedSavedFilterId}|${user?.uid ?? "__anon__"}`
    : "";
  const isSavedFilterRestored = Boolean(
    normalizedSavedFilterId &&
      restoredFilterExternalId?.trim().toLowerCase() === normalizedSavedFilterId
  );
  const hasCompletedCurrentRestoreAttempt = Boolean(
    currentRestoreAttemptKey && lastSavedFilterRestoreAttemptKey === currentRestoreAttemptKey
  );
  const shouldShowSavedFilterLoader = Boolean(
    normalizedSavedFilterId && !isSavedFilterRestored && !hasCompletedCurrentRestoreAttempt
  );

  useEffect(() => {
    if (savedFilterId) return;
    try {
      const raw = sessionStorage.getItem(sessionKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        enabledFilters?: string[];
        filterValues?: FilterValueMap;
      };
      if (parsed.enabledFilters && Array.isArray(parsed.enabledFilters)) {
        setEnabledFilters(parsed.enabledFilters);
      }
      if (parsed.filterValues && typeof parsed.filterValues === "object") {
        setFilterValues(parsed.filterValues);
      }
    } catch {
      // Ignore corrupted session data.
    }
  }, [savedFilterId]);

  useEffect(() => {
    if (authLoading) return;
    if (user) return;
    setEnabledFilters(DEFAULT_ENABLED_FILTERS);
    setFilterValues((prev) => {
      const next: FilterValueMap = {};
      DEFAULT_ENABLED_FILTERS.forEach((id) => {
        if (prev[id]) {
          next[id] = prev[id];
        }
      });
      return next;
    });
    setRangeMeta({});
    try {
      sessionStorage.removeItem(sessionKey);
    } catch {
      // Ignore storage errors.
    }
  }, [authLoading, user]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        sessionKey,
        JSON.stringify({
          enabledFilters,
          filterValues,
        })
      );
    } catch {
      // Ignore write errors (e.g., storage full).
    }
  }, [enabledFilters, filterValues]);

  const activeCount = useMemo(() => {
    let count = 0;
    enabledFilters.forEach((id) => {
      const def = FILTER_DEFINITIONS_BY_ID[id];
      const value = filterValues[id];
      if (!def || !value) return;
      if (
        def.type === "range" &&
        ((value.gte !== undefined && value.gte !== "") || (value.lte !== undefined && value.lte !== ""))
      ) {
        count += 1;
      }
      if (def.type === "single" && value.value) {
        if (Array.isArray(value.value)) {
          if (value.value.length > 0) count += 1;
          return;
        }
        count += 1;
      }
    });
    return count;
  }, [enabledFilters, filterValues]);

  const filtersPayload = useMemo(() => {
    const payload: Record<string, Record<string, number | string | string[]>> = {};
    enabledFilters.forEach((id) => {
      const def = FILTER_DEFINITIONS_BY_ID[id];
      const value = filterValues[id];
      if (!def || !value) return;
      if (def.type === "range") {
        const range: Record<string, number> = {};
        if (value.gte !== undefined && value.gte !== "") range.gte = Number(value.gte);
        if (value.lte !== undefined && value.lte !== "") range.lte = Number(value.lte);
        if (Object.keys(range).length > 0) payload[id] = range;
      }
      if (def.type === "single" && value.value) {
        if (Array.isArray(value.value)) {
          if (value.value.length > 0) payload[id] = { in: value.value };
          return;
        }
        payload[id] = { eq: value.value };
      }
    });
    return payload;
  }, [enabledFilters, filterValues]);

  const handleResetAll = () => {
    setFilterValues({});
    try {
      sessionStorage.removeItem(sessionKey);
    } catch {
      // Ignore storage errors.
    }
  };

  const handleValueChange = (
    id: string,
    nextValue: { gte?: number | ""; lte?: number | ""; value?: string | string[] }
  ) => {
    setFilterValues((prev) => ({ ...prev, [id]: nextValue }));
  };

  useEffect(() => {
    const handleNewScreen = () => {
      setBuilderType("screen");
      setEnabledFilters(DEFAULT_ENABLED_FILTERS);
      setFilterValues({});
      try {
        sessionStorage.removeItem(sessionKey);
      } catch {
        // Ignore storage errors.
      }
      setRangeMeta({});
      setInitialScreenTitle("");
      setInitialScreenDescription("");
      setInitialScreenUpdatedAt(null);
      setInitialSortField(null);
      setInitialSortOrder(null);
      setInitialExternalIds([]);
      setRestoredFilterExternalId(null);
      setScreenResetToken((prev) => prev + 1);
      setMobileFiltersOpen(false);
    };
    const handleNewWatchlist = () => {
      setBuilderType("watchlist");
      setEnabledFilters(DEFAULT_ENABLED_FILTERS);
      setFilterValues({});
      try {
        sessionStorage.removeItem(sessionKey);
      } catch {
        // Ignore storage errors.
      }
      setRangeMeta({});
      setInitialScreenTitle("");
      setInitialScreenDescription("");
      setInitialScreenUpdatedAt(null);
      setInitialSortField(null);
      setInitialSortOrder(null);
      setInitialExternalIds([]);
      setRestoredFilterExternalId(null);
      setScreenResetToken((prev) => prev + 1);
      setMobileFiltersOpen(false);
    };
    const handleOpenMobileFilters = (event: Event) => {
      const { detail } = event as CustomEvent<{ open?: boolean }>;
      if (typeof detail?.open === "boolean") {
        setMobileFiltersOpen(detail.open);
        return;
      }
      setMobileFiltersOpen(true);
    };
    window.addEventListener(NEW_SCREEN_EVENT, handleNewScreen);
    window.addEventListener(NEW_WATCHLIST_EVENT, handleNewWatchlist);
    window.addEventListener(OPEN_MOBILE_FILTERS_EVENT, handleOpenMobileFilters);
    return () => {
      window.removeEventListener(NEW_SCREEN_EVENT, handleNewScreen);
      window.removeEventListener(NEW_WATCHLIST_EVENT, handleNewWatchlist);
      window.removeEventListener(OPEN_MOBILE_FILTERS_EVENT, handleOpenMobileFilters);
    };
  }, []);

  useEffect(() => {
    const isMobileViewport = () => window.matchMedia("(max-width: 1023px)").matches;
    const hasMobileFiltersMarker = (state: unknown) =>
      Boolean(
        state &&
          typeof state === "object" &&
          MOBILE_FILTERS_HISTORY_KEY in (state as Record<string, unknown>)
      );

    const handlePopState = (event: PopStateEvent) => {
      if (!isMobileViewport()) return;
      if (!mobileFiltersOpen || !mobileFiltersHistoryEntryRef.current) return;
      if (hasMobileFiltersMarker(event.state)) return;
      mobileFiltersHistoryEntryRef.current = false;
      setMobileFiltersOpen(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [mobileFiltersOpen]);

  useEffect(() => {
    const isMobileViewport = () => window.matchMedia("(max-width: 1023px)").matches;
    const hasMobileFiltersMarker = (state: unknown) =>
      Boolean(
        state &&
          typeof state === "object" &&
          MOBILE_FILTERS_HISTORY_KEY in (state as Record<string, unknown>)
      );

    if (!isMobileViewport()) {
      mobileFiltersHistoryEntryRef.current = false;
      return;
    }

    if (mobileFiltersOpen) {
      if (mobileFiltersHistoryEntryRef.current) return;
      const currentState =
        window.history.state && typeof window.history.state === "object" ? window.history.state : {};
      window.history.pushState({ ...currentState, [MOBILE_FILTERS_HISTORY_KEY]: true }, "", window.location.href);
      mobileFiltersHistoryEntryRef.current = true;
      return;
    }

    if (!mobileFiltersHistoryEntryRef.current) return;
    const hasMarker = hasMobileFiltersMarker(window.history.state);
    mobileFiltersHistoryEntryRef.current = false;
    if (hasMarker) {
      window.history.back();
    }
  }, [mobileFiltersOpen]);

  useEffect(() => {
    if (!savedFilterId) {
      setRestoredFilterExternalId(null);
      setInitialScreenTitle("");
      setInitialScreenDescription("");
      setInitialScreenUpdatedAt(null);
      setInitialSortField(null);
      setInitialSortOrder(null);
      setInitialExternalIds([]);
      setLastSavedFilterRestoreAttemptKey(null);
    }
  }, [savedFilterId]);

  const applySavedScreenByExternalId = useCallback(
    async (externalId: string) => {
      if (!externalId) return;
      const normalizedExternalId = externalId.trim().toLowerCase();
      if (!normalizedExternalId) return;

      const normalizeFilterId = (id: string) => {
        const normalized = String(id ?? "").trim();
        if (normalized === "scheme_category") return "scheme_sub_category";
        return normalized;
      };

      const deriveWatchlistSchemeFilters = async (externalIds: string[]) => {
        const normalizedExternalIds = Array.from(
          new Set(
            (Array.isArray(externalIds) ? externalIds : [])
              .map((id) => String(id ?? "").trim())
              .filter((id) => id.length > 0)
          )
        );
        if (normalizedExternalIds.length === 0) return {};

        const schemeClassSet = new Set<string>();
        const subCategorySet = new Set<string>();
        let offset = 0;
        let total = Number.POSITIVE_INFINITY;

        while (offset < total) {
          const response = await listSchemes(
            {
              screens: {},
              scheme_external_id: normalizedExternalIds,
            },
            {
              limit: WATCHLIST_DERIVED_FILTER_FETCH_LIMIT,
              offset,
            }
          );

          const items = Array.isArray(response?.items) ? response.items : [];
          items.forEach((item) => {
            const schemeClass = String(item.scheme_class ?? "").trim();
            const schemeSubCategory = String(item.scheme_sub_category ?? "").trim();
            if (schemeClass) schemeClassSet.add(schemeClass);
            if (schemeSubCategory) subCategorySet.add(schemeSubCategory);
          });

          if (items.length === 0) break;
          total = typeof response?.total === "number" ? response.total : items.length;
          offset += items.length;
        }

        const derived: FilterValueMap = {};
        if (schemeClassSet.size > 0) {
          derived["scheme_class"] = { value: Array.from(schemeClassSet) };
        }
        if (subCategorySet.size > 0) {
          derived["scheme_sub_category"] = { value: Array.from(subCategorySet) };
        }
        return derived;
      };

      const applySelectedFilter = async (selected: SavedUserFilter) => {
        const savedFilterMap = selected.filters?.filters ?? {};
        const restoredValues: FilterValueMap = {};
        Object.entries(savedFilterMap).forEach(([key, condition]) => {
          if (!condition || typeof condition !== "object") return;
          const normalizedKey = normalizeFilterId(key);
          if (!normalizedKey || !FILTER_DEFINITIONS_BY_ID[normalizedKey]) return;
          const nextValue: { gte?: number | ""; lte?: number | ""; value?: string | string[] } = {};
          if ("gte" in condition) nextValue.gte = Number(condition.gte as number);
          if ("lte" in condition) nextValue.lte = Number(condition.lte as number);
          if ("eq" in condition) nextValue.value = String(condition.eq);
          if ("in" in condition && Array.isArray(condition.in)) {
            nextValue.value = condition.in.map((entry) => String(entry));
          }
          if (Object.keys(nextValue).length > 0) restoredValues[normalizedKey] = nextValue;
        });

        const selectedExternalIds = Array.isArray(selected.external_ids) ? selected.external_ids : [];
        const isWatchlistFilter =
          selected.screen_type === "watchlist" || selectedExternalIds.length > 0;
        if (isWatchlistFilter) {
          const hasSchemeClass = Boolean(restoredValues["scheme_class"]?.value);
          const hasSubCategory = Boolean(restoredValues["scheme_sub_category"]?.value);
          if (!hasSchemeClass || !hasSubCategory) {
            try {
              const derivedWatchlistFilters = await deriveWatchlistSchemeFilters(selectedExternalIds);
              if (!hasSchemeClass && derivedWatchlistFilters["scheme_class"]) {
                restoredValues["scheme_class"] = derivedWatchlistFilters["scheme_class"];
              }
              if (!hasSubCategory && derivedWatchlistFilters["scheme_sub_category"]) {
                restoredValues["scheme_sub_category"] = derivedWatchlistFilters["scheme_sub_category"];
              }
            } catch {
              // If derivation fails, keep available saved filter values.
            }
          }
        }

        const savedEnabledFilters = Array.isArray(selected.filters?.enabled_filters)
          ? selected.filters.enabled_filters
              .map((id) => normalizeFilterId(id))
              .filter((id) => Boolean(FILTER_DEFINITIONS_BY_ID[id]))
          : [];
        const restoredFilterIds = Object.keys(restoredValues).filter((id) => Boolean(FILTER_DEFINITIONS_BY_ID[id]));
        const resolvedEnabledFilters = Array.from(
          new Set([...PINNED_FILTERS, ...savedEnabledFilters, ...restoredFilterIds])
        );

        setEnabledFilters(resolvedEnabledFilters.length > 0 ? resolvedEnabledFilters : DEFAULT_ENABLED_FILTERS);
        setFilterValues(restoredValues);
        setInitialScreenTitle(selected.name ?? "");
        setInitialScreenDescription(selected.description ?? "");
        setInitialScreenUpdatedAt(selected.updated_at ?? null);
        setInitialSortField(selected.filters?.sort_field ?? null);
        setInitialSortOrder(selected.filters?.sort_order ?? null);
        setInitialExternalIds(selectedExternalIds);
        setBuilderType(
          selected.screen_type === "watchlist" ||
            selectedExternalIds.length > 0
            ? "watchlist"
            : "screen"
        );
        setRestoredFilterExternalId(selected.external_id);
      };

      try {
        setRestoringSavedFilter(true);
        const defaultsResponse = await getDefaultFilters();
        const defaultFilters = (defaultsResponse.groups ?? []).flatMap((group) => group.filters ?? []);
        const defaultSelected = defaultFilters.find(
          (item) => item.external_id?.trim().toLowerCase() === normalizedExternalId
        );
        if (defaultSelected) {
          await applySelectedFilter(defaultSelected);
          return;
        }

        if (authLoading || !user) return;
        const token = await user.getIdToken();
        const response = await getUserFilters(token);
        const selected = response.filters.find(
          (item) => item.external_id?.trim().toLowerCase() === normalizedExternalId
        );
        if (!selected) {
          setRestoredFilterExternalId(null);
          return;
        }
        await applySelectedFilter(selected);
      } catch {
        // If restore fails, keep current in-memory/local state.
      } finally {
        setRestoringSavedFilter(false);
        setLastSavedFilterRestoreAttemptKey(`${normalizedExternalId}|${user?.uid ?? "__anon__"}`);
      }
    },
    [authLoading, user]
  );

  useEffect(() => {
    if (!savedFilterId || restoringSavedFilter) return;
    if (authLoading) return;
    if (isSavedFilterRestored) return;
    if (hasCompletedCurrentRestoreAttempt) return;
    void applySavedScreenByExternalId(savedFilterId);
  }, [
    savedFilterId,
    authLoading,
    restoringSavedFilter,
    isSavedFilterRestored,
    hasCompletedCurrentRestoreAttempt,
    applySavedScreenByExternalId,
  ]);

  if (shouldShowSavedFilterLoader) {
    return (
      <div className="flex flex-col h-screen bg-background overflow-hidden">
        <TickerTape />
        <Navbar mobileAppliedFiltersCount={0} />
        <div className="flex flex-1 items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">Loading saved screener...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TickerTape />
      <Navbar mobileAppliedFiltersCount={activeCount} />
      <div className="relative flex flex-1 overflow-hidden page-dimmable">
        <div className="relative hidden lg:flex h-full">
          {desktopFiltersCollapsed ? (
            <div className="relative h-full w-4 border-r border-border bg-background/70">
              <button
                type="button"
                onClick={() => setDesktopFiltersCollapsed(false)}
                className="absolute left-1/2 top-3 inline-flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-surface-hover"
                aria-label="Expand filters sidebar"
                title="Expand filters"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative h-full">
              <FilterSidebar
                enabledFilters={enabledFilters}
                values={filterValues}
                rangeMeta={rangeMeta}
                activeCount={activeCount}
                resetToken={screenResetToken}
                savedFilterCollapseKey={restoredFilterExternalId}
                onChangeEnabled={setEnabledFilters}
                onChangeValue={handleValueChange}
                onReset={handleResetAll}
              />
              <button
                type="button"
                onClick={() => setDesktopFiltersCollapsed(true)}
                className="absolute right-0 top-3 z-20 inline-flex h-7 w-7 translate-x-[calc(50%+1px)] items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-surface-hover"
                aria-label="Collapse filters sidebar"
                title="Collapse filters"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        {mobileFiltersOpen && (
          <div className="absolute inset-0 z-[115] lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/45"
              onClick={() => setMobileFiltersOpen(false)}
              aria-label="Close filters"
            />
            <div className="absolute inset-0 sm:inset-y-0 sm:left-0 sm:w-[85vw] sm:max-w-[320px]">
              <FilterSidebar
                className="w-full border-r border-border shadow-xl"
                enabledFilters={enabledFilters}
                values={filterValues}
                rangeMeta={rangeMeta}
                activeCount={activeCount}
                resetToken={screenResetToken}
                savedFilterCollapseKey={restoredFilterExternalId}
                onChangeEnabled={setEnabledFilters}
                onChangeValue={handleValueChange}
                onReset={handleResetAll}
              />
            </div>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <FundTable
            filters={filtersPayload}
            enabledFilters={enabledFilters}
            builderType={builderType}
            onOpenMobileFilters={() => setMobileFiltersOpen(true)}
            resetToken={screenResetToken}
            initialTitle={initialScreenTitle}
            initialDescription={initialScreenDescription}
            initialUpdatedAt={initialScreenUpdatedAt}
            initialSortField={initialSortField}
            initialSortOrder={initialSortOrder}
            initialExternalIds={initialExternalIds}
            restoredFilterExternalId={restoredFilterExternalId}
            onSavedFilterCreated={applySavedScreenByExternalId}
            onMetaChange={(meta) =>
              setRangeMeta((prev) => (Object.keys(prev).length > 0 ? prev : meta ?? {}))
            }
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
