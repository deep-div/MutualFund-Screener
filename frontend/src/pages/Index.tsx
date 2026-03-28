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
import { SlidersHorizontal, X } from "lucide-react";
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

  const handleReset = () => {
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
      handleReset();
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
        const derivedEnabledFilters = Array.from(
          new Set([...DEFAULT_ENABLED_FILTERS, ...Object.keys(savedFilterMap)])
        );

        setEnabledFilters(savedEnabledFilters.length > 0 ? savedEnabledFilters : derivedEnabledFilters);
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
        <div className="hidden lg:block h-full">
          <FilterSidebar
            enabledFilters={enabledFilters}
            values={filterValues}
            rangeMeta={rangeMeta}
            activeCount={activeCount}
            onChangeEnabled={setEnabledFilters}
            onChangeValue={handleValueChange}
            onReset={handleReset}
          />
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
                onReset={handleReset}
              />
              <button
                type="button"
                className="absolute right-2 top-2 inline-flex items-center justify-center rounded-md border border-border bg-background p-1.5 text-muted-foreground"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
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
