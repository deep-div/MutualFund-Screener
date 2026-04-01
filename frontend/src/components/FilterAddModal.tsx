import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Check } from "lucide-react";
import { motion } from "framer-motion";
import { FILTER_CATEGORIES, FILTER_DEFINITIONS, PINNED_FILTERS, type FilterDefinition } from "@/data/filters";

interface FilterAddModalProps {
  onClose: () => void;
  enabledFilters: string[];
  onChangeEnabled: (next: string[]) => void;
}
const MOBILE_ADD_FILTERS_HISTORY_KEY = "__mf_mobile_add_filters_popup";

const buildFilterHint = (filter: FilterDefinition) => {
  const id = filter.id;
  const formatYears = (value: string | number) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return `${value} years`;
    return num === 1 ? "1 year" : `${num} years`;
  };
  if (id.startsWith("abs_")) {
    if (id === "abs_1w") return "Absolute return over the last 1 week.";
    if (id === "abs_1m") return "Absolute return over the last 1 month.";
    if (id === "abs_3m") return "Absolute return over the last 3 months.";
    if (id === "abs_6m") return "Absolute return over the last 6 months.";
  }
  if (id.startsWith("cagr_")) {
    const years = id.match(/cagr_(\d+)y/)?.[1];
    return years ? `Compounded annual growth rate over the last ${formatYears(years)}.` : "Compounded annual growth rate.";
  }
  if (id.startsWith("rolling_avg_")) {
    const years = id.match(/rolling_avg_(\d+)y/)?.[1];
    return years ? `Average rolling CAGR using ${formatYears(years)} windows.` : "Average rolling CAGR.";
  }
  if (id.startsWith("rolling_min_")) {
    const years = id.match(/rolling_min_(\d+)y/)?.[1];
    return years ? `Lowest rolling CAGR using ${formatYears(years)} windows.` : "Lowest rolling CAGR.";
  }
  if (id.startsWith("rolling_max_")) {
    const years = id.match(/rolling_max_(\d+)y/)?.[1];
    return years ? `Highest rolling CAGR using ${formatYears(years)} windows.` : "Highest rolling CAGR.";
  }
  if (id === "calmar") return "Calmar ratio (Return / Max Drawdown) over the last 3 years.";
  if (id === "volatility") return "Annualized volatility over the last 3 years.";
  if (id === "downside_deviation") return "Downside deviation over the last 3 years.";
  if (id === "skewness") return "Skewness of daily returns over the last 3 years.";
  if (id === "pain_index") return "Pain index over the last 3 years.";
  if (id === "ulcer_index") return "Ulcer index over the last 3 years.";
  if (id === "current_drawdown_percent") return "Drawdown from latest NAV vs peak.";
  if (id === "mdd_max_drawdown_percent") return "Maximum drawdown since inception.";
  if (id === "mdd_one_year_pct") return "Maximum drawdown over the last 1 year.";
  if (id === "mdd_three_year_pct") return "Maximum drawdown over the last 3 years.";
  if (id === "mdd_five_year_pct") return "Maximum drawdown over the last 5 years.";
  if (id === "mdd_ten_year_pct") return "Maximum drawdown over the last 10 years.";
  if (id === "current_nav") return "Latest reported NAV.";
  if (id === "time_since_inception_years") return "Years since scheme inception.";
  if (id === "scheme_class") return "High-level scheme class (Equity, Debt, etc.).";
  if (id === "scheme_sub_category") return "AMC sub-category within the scheme class.";
  return "";
};

const FilterAddModal = ({ onClose, enabledFilters, onChangeEnabled }: FilterAddModalProps) => {
  const [activeCategory, setActiveCategory] = useState("returns");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeHintId, setActiveHintId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mobileAddFiltersHistoryEntryRef = useRef(false);
  const onCloseRef = useRef(onClose);

  const selectableFilters = useMemo(
    () => FILTER_DEFINITIONS.filter((filter) => !PINNED_FILTERS.includes(filter.id)),
    []
  );

  const visibleFilters = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    return selectableFilters.filter((filter) => {
      const matchesSearch =
        trimmed.length === 0 ||
        filter.label.toLowerCase().includes(trimmed) ||
        filter.id.toLowerCase().includes(trimmed);
      const matchesCategory = trimmed.length > 0 || filter.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activeCategory, searchQuery, selectableFilters]);

  const selectedOptionalCount = useMemo(
    () => enabledFilters.filter((filterId) => !PINNED_FILTERS.includes(filterId)).length,
    [enabledFilters]
  );

  const toggleFilter = (id: string) => {
    if (enabledFilters.includes(id)) {
      onChangeEnabled(enabledFilters.filter((filterId) => filterId !== id));
    } else {
      onChangeEnabled([...enabledFilters, id]);
    }
  };

  const handleFilterTap = (id: string) => {
    const wasEnabled = enabledFilters.includes(id);
    toggleFilter(id);
    setActiveHintId(wasEnabled ? null : id);
  };

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [onClose]);

  useEffect(() => {
    const isMobileViewport = () => window.matchMedia("(max-width: 1023px)").matches;
    const hasAddFiltersMarker = (state: unknown) =>
      Boolean(
        state &&
          typeof state === "object" &&
          MOBILE_ADD_FILTERS_HISTORY_KEY in (state as Record<string, unknown>)
      );

    if (isMobileViewport() && !mobileAddFiltersHistoryEntryRef.current) {
      const currentState =
        window.history.state && typeof window.history.state === "object" ? window.history.state : {};
      window.history.pushState(
        { ...currentState, [MOBILE_ADD_FILTERS_HISTORY_KEY]: true },
        "",
        window.location.href
      );
      mobileAddFiltersHistoryEntryRef.current = true;
    }

    const handlePopState = (event: PopStateEvent) => {
      if (!isMobileViewport()) return;
      if (!mobileAddFiltersHistoryEntryRef.current) return;
      if (hasAddFiltersMarker(event.state)) return;
      mobileAddFiltersHistoryEntryRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (!isMobileViewport()) {
        mobileAddFiltersHistoryEntryRef.current = false;
        return;
      }
      if (!mobileAddFiltersHistoryEntryRef.current) return;
      const hasMarker = hasAddFiltersMarker(window.history.state);
      mobileAddFiltersHistoryEntryRef.current = false;
      if (hasMarker) {
        window.history.back();
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50"
    >
      <motion.div
        ref={panelRef}
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="absolute inset-y-0 left-0 w-full bg-background border border-border shadow-2xl overflow-hidden flex flex-col md:left-72 md:w-[640px] md:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-foreground">Add Filters</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex w-full items-center gap-2 bg-background border border-border rounded-md px-3 py-2 hover:bg-surface-hover transition-colors sm:w-52 sm:py-1.5">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for Filters"
                className="bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none w-full sm:text-[12px]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 flex-col sm:flex-row">
          <div className="border-b border-border px-3 py-2 sm:hidden">
            <div className="flex flex-wrap gap-2">
              {FILTER_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    activeCategory === cat.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-b border-border sm:border-b-0 sm:border-r sm:w-56">
            <div className="py-3 pl-3 pr-16 sm:pl-4 sm:pr-20">
              <div className="hidden flex-col gap-1 sm:flex">
                {FILTER_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full border-l-2 px-3 py-2 text-left text-[13px] font-medium transition-colors sm:text-[14px] ${
                      activeCategory === cat.id
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
            {visibleFilters.map((filter) => {
              const checked = enabledFilters.includes(filter.id);
              const hint = buildFilterHint(filter);
              return (
                <label
                  key={filter.id}
                  onClick={() => handleFilterTap(filter.id)}
                  className="group flex cursor-pointer items-start gap-3 px-4 py-2 transition-colors hover:bg-transparent sm:px-7 sm:py-3"
                >
                  <div
                    className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                      checked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border hover:border-muted-foreground bg-secondary"
                    }`}
                  >
                    {checked && <Check className="w-3 h-3" />}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] text-foreground sm:text-[13px]">{filter.label}</span>
                    {hint ? (
                      <span
                        className={`text-[11px] text-muted-foreground ${
                          activeHintId === filter.id ? "block sm:hidden" : "hidden"
                        } sm:group-hover:block`}
                      >
                        {hint}
                      </span>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border bg-popover px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            {selectedOptionalCount} selected
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-[13px] font-medium hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FilterAddModal;
