import Navbar from "@/components/Navbar";
import TickerTape from "@/components/TickerTape";
import FilterSidebar from "@/components/FilterSidebar";
import FundTable from "@/components/FundTable";
import {
  FILTER_DEFINITIONS_BY_ID,
  DEFAULT_ENABLED_FILTERS,
  PINNED_FILTERS,
  FilterValueMap,
  FilterRangeMeta,
} from "@/data/filters";
import { useAuth } from "@/contexts/AuthContext";
import { getDefaultFilters, getUserFilters, SavedUserFilter } from "@/services/userService";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
const NEW_SCREEN_EVENT = "mf_new_screen_requested";

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
  const [restoredFilterExternalId, setRestoredFilterExternalId] = useState<string | null>(null);
  const [restoringSavedFilter, setRestoringSavedFilter] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [desktopFiltersCollapsed, setDesktopFiltersCollapsed] = useState(false);

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
    setEnabledFilters(PINNED_FILTERS);
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
      setEnabledFilters(DEFAULT_ENABLED_FILTERS);
      setFilterValues({});
      try {
        sessionStorage.removeItem(sessionKey);
      } catch {
        // Ignore storage errors.
      }
      setRangeMeta({});
      setScreenResetToken((prev) => prev + 1);
      setMobileFiltersOpen(false);
    };
    window.addEventListener(NEW_SCREEN_EVENT, handleNewScreen);
    return () => window.removeEventListener(NEW_SCREEN_EVENT, handleNewScreen);
  }, []);

  useEffect(() => {
    if (!savedFilterId) {
      setRestoredFilterExternalId(null);
      setInitialScreenTitle("");
      setInitialScreenDescription("");
      setInitialScreenUpdatedAt(null);
      setInitialSortField(null);
      setInitialSortOrder(null);
    }
  }, [savedFilterId]);

  const applySavedScreenByExternalId = useCallback(
    async (externalId: string) => {
      if (!externalId) return;
      const normalizedExternalId = externalId.trim().toLowerCase();
      if (!normalizedExternalId) return;

      const applySelectedFilter = (selected: SavedUserFilter) => {
        const savedFilterMap = selected.filters?.filters ?? {};
        const restoredValues: FilterValueMap = {};
        Object.entries(savedFilterMap).forEach(([key, condition]) => {
          if (!condition || typeof condition !== "object") return;
          const nextValue: { gte?: number | ""; lte?: number | ""; value?: string | string[] } = {};
          if ("gte" in condition) nextValue.gte = Number(condition.gte as number);
          if ("lte" in condition) nextValue.lte = Number(condition.lte as number);
          if ("eq" in condition) nextValue.value = String(condition.eq);
          if ("in" in condition && Array.isArray(condition.in)) {
            nextValue.value = condition.in.map((entry) => String(entry));
          }
          if (Object.keys(nextValue).length > 0) restoredValues[key] = nextValue;
        });

        const savedEnabledFilters = Array.isArray(selected.filters?.enabled_filters)
          ? selected.filters.enabled_filters.filter((id) => Boolean(FILTER_DEFINITIONS_BY_ID[id]))
          : [];
        const restoredFilterIds = Object.keys(savedFilterMap).filter((id) => Boolean(FILTER_DEFINITIONS_BY_ID[id]));
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
          applySelectedFilter(defaultSelected);
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
        applySelectedFilter(selected);
      } catch {
        // If restore fails, keep current in-memory/local state.
      } finally {
        setRestoringSavedFilter(false);
      }
    },
    [authLoading, user]
  );

  useEffect(() => {
    if (!savedFilterId || restoringSavedFilter) return;
    if (authLoading) return;
    if (restoredFilterExternalId?.trim().toLowerCase() === savedFilterId.trim().toLowerCase()) return;
    void applySavedScreenByExternalId(savedFilterId);
  }, [
    savedFilterId,
    authLoading,
    user,
    restoredFilterExternalId,
    restoringSavedFilter,
    applySavedScreenByExternalId,
  ]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TickerTape />
      <Navbar />
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
            <div className="absolute inset-y-0 left-0 w-[85vw] max-w-[320px]">
              <FilterSidebar
                className="w-full border-r border-border shadow-xl"
                enabledFilters={enabledFilters}
                values={filterValues}
                rangeMeta={rangeMeta}
                activeCount={activeCount}
                onChangeEnabled={setEnabledFilters}
                onChangeValue={handleValueChange}
                onReset={handleResetAll}
              />
            </div>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-border px-3 py-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-foreground"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters ({activeCount})
            </button>
          </div>
          <FundTable
            filters={filtersPayload}
            enabledFilters={enabledFilters}
            resetToken={screenResetToken}
            initialTitle={initialScreenTitle}
            initialDescription={initialScreenDescription}
            initialUpdatedAt={initialScreenUpdatedAt}
            initialSortField={initialSortField}
            initialSortOrder={initialSortOrder}
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
