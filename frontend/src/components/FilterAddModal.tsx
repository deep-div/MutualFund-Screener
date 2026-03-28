import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { FILTER_CATEGORIES, FILTER_DEFINITIONS, PINNED_FILTERS, type FilterDefinition } from "@/data/filters";

interface FilterAddModalProps {
  onClose: () => void;
  enabledFilters: string[];
  onChangeEnabled: (next: string[]) => void;
}

const buildFilterHint = (filter: FilterDefinition) => {
  const id = filter.id;
  if (id.startsWith("abs_")) {
    if (id === "abs_1w") return "Absolute return over the last 1 week.";
    if (id === "abs_1m") return "Absolute return over the last 1 month.";
    if (id === "abs_3m") return "Absolute return over the last 3 months.";
    if (id === "abs_6m") return "Absolute return over the last 6 months.";
  }
  if (id.startsWith("cagr_")) {
    const years = id.match(/cagr_(\d+)y/)?.[1];
    return years ? `Compounded annual growth rate over ${years} years.` : "Compounded annual growth rate.";
  }
  if (id.startsWith("rolling_avg_")) {
    const years = id.match(/rolling_avg_(\d+)y/)?.[1];
    return years ? `Average rolling CAGR for ${years}-year windows.` : "Average rolling CAGR.";
  }
  if (id.startsWith("rolling_min_")) {
    const years = id.match(/rolling_min_(\d+)y/)?.[1];
    return years ? `Lowest rolling CAGR for ${years}-year windows.` : "Lowest rolling CAGR.";
  }
  if (id.startsWith("rolling_max_")) {
    const years = id.match(/rolling_max_(\d+)y/)?.[1];
    return years ? `Highest rolling CAGR for ${years}-year windows.` : "Highest rolling CAGR.";
  }
  if (id === "calmar") return "Return divided by max drawdown (risk-adjusted).";
  if (id === "volatility") return "Annualized return volatility (risk).";
  if (id === "downside_deviation") return "Volatility of negative returns only.";
  if (id === "skewness") return "Asymmetry of returns distribution.";
  if (id === "pain_index") return "Average drawdown over the period.";
  if (id === "ulcer_index") return "RMS drawdown over the period.";
  if (id === "current_drawdown_percent") return "Drawdown from latest NAV vs peak.";
  if (id === "mdd_max_drawdown_percent") return "Maximum drawdown over full history.";
  if (id === "mdd_one_year_pct") return "Maximum drawdown over the last 1 year.";
  if (id === "mdd_three_year_pct") return "Maximum drawdown over the last 3 years.";
  if (id === "mdd_five_year_pct") return "Maximum drawdown over the last 5 years.";
  if (id === "mdd_ten_year_pct") return "Maximum drawdown over the last 10 years.";
  if (id === "current_nav") return "Latest reported NAV.";
  if (id === "time_since_inception_years") return "Years since the scheme started.";
  if (id === "scheme_class") return "High-level scheme class (Equity, Debt, etc.).";
  if (id === "scheme_sub_category") return "AMC sub-category within the scheme class.";
  return "";
};

const FilterAddModal = ({ onClose, enabledFilters, onChangeEnabled }: FilterAddModalProps) => {
  const [activeCategory, setActiveCategory] = useState("returns");
  const [searchQuery, setSearchQuery] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

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
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Add Filters</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex w-full items-center gap-2 bg-background border border-border rounded-md px-3 py-1.5 hover:bg-surface-hover transition-colors sm:w-52">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for Filters"
                className="bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground outline-none w-full"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-surface-hover md:hidden"
              aria-label="Close add filters"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 flex-col sm:flex-row">
          <div className="border-b border-border sm:border-b-0 sm:border-r sm:w-44">
            <div className="py-3 pl-3 pr-5 sm:pl-4 sm:pr-6">
              <div className="flex flex-col gap-1">
                {FILTER_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full border-l-2 px-3 py-2 text-left text-[13px] font-medium transition-colors sm:text-[14px] ${
                      activeCategory === cat.id
                        ? "border-primary bg-[#f1f1f1] text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-[#f1f1f1]"
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
                  onClick={() => toggleFilter(filter.id)}
                  className="group flex cursor-pointer items-start gap-3 px-5 py-1.5 transition-colors hover:bg-[#f1f1f1] sm:px-7 sm:py-3"
                >
                  <div
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      checked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border hover:border-muted-foreground bg-secondary"
                    }`}
                  >
                    {checked && <Check className="w-3 h-3" />}
                  </div>
                  <div className="flex flex-col gap-0">
                    <span className="text-[13px] text-foreground">{filter.label}</span>
                    {hint ? (
                      <span className="hidden text-[11px] text-muted-foreground group-hover:block">
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
