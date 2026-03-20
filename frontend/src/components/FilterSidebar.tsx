import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Check, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import FilterAddModal from "./FilterAddModal";
import {
  FILTER_DEFINITIONS_BY_ID,
  PINNED_FILTERS,
  SCHEME_SUB_CATEGORY_GROUPS,
  FilterValueMap,
  FilterDefinition,
} from "@/data/filters";

interface FilterSidebarProps {
  enabledFilters: string[];
  values: FilterValueMap;
  activeCount: number;
  onChangeEnabled: (next: string[]) => void;
  onChangeValue: (id: string, next: { gte?: number | ""; lte?: number | ""; value?: string }) => void;
  onReset: () => void;
}

const FilterSidebar = ({
  enabledFilters,
  values,
  activeCount,
  onChangeEnabled,
  onChangeValue,
  onReset,
}: FilterSidebarProps) => {
  const [expandedFilter, setExpandedFilter] = useState<string | null>("scheme_sub_category");
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [subCategorySearch, setSubCategorySearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    equity: false,
    debt: false,
    hybrid: false,
    others: false,
  });

  const filtersToRender = useMemo(() => {
    const unique = Array.from(new Set([...PINNED_FILTERS, ...enabledFilters]));
    return unique
      .map((id) => FILTER_DEFINITIONS_BY_ID[id])
      .filter((filter): filter is FilterDefinition => Boolean(filter))
      .filter((filter) => filter.id !== "scheme_class")
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return a.label.localeCompare(b.label);
      });
  }, [enabledFilters]);

  const toggleFilter = (id: string) => {
    setExpandedFilter(expandedFilter === id ? null : id);
  };

  const updateRange = (filterId: string, key: "gte" | "lte", value: string) => {
    const parsed = value === "" ? "" : Number(value);
    onChangeValue(filterId, { ...values[filterId], [key]: parsed });
  };

  const getRangeBounds = (filterId: string, label: string) => {
    if (filterId === "current_nav") return { min: 0, max: 1000, step: 1 };
    if (filterId === "time_since_inception_years") return { min: 0, max: 30, step: 1 };
    if (label.includes("%")) return { min: 0, max: 100, step: 1 };
    return { min: 0, max: 100, step: 1 };
  };

  const updateSingle = (filterId: string, nextValue: string) => {
    onChangeValue(filterId, { value: nextValue });
  };

  const clearFilter = (filterId: string) => {
    onChangeValue(filterId, {});
  };

  const removeFilter = (filterId: string) => {
    if (PINNED_FILTERS.includes(filterId)) return;
    onChangeEnabled(enabledFilters.filter((id) => id !== filterId));
    if (expandedFilter === filterId) setExpandedFilter(null);
    clearFilter(filterId);
  };

  return (
    <>
      <div className="w-72 border-r border-border bg-background flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-[13px] text-muted-foreground">
            {activeCount} filter{activeCount === 1 ? "" : "s"} applied
          </span>
          <button
            onClick={onReset}
            className="text-[12px] font-medium text-foreground border border-border rounded px-2.5 py-1 hover:bg-surface-hover transition-colors"
          >
            Reset all
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filtersToRender.map((filter) => {
            const currentValue = values[filter.id] || {};
            const isExpanded = expandedFilter === filter.id;
            return (
              <div key={filter.id} className="border-b border-border">
                <button
                  onClick={() => toggleFilter(filter.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors"
                >
                  <span className="text-[13px] font-medium text-foreground">{filter.label}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3">
                        {filter.type === "range" && (
                          <>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={currentValue.gte ?? ""}
                                onChange={(e) => updateRange(filter.id, "gte", e.target.value)}
                                placeholder="Min"
                                className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-[12px] font-mono-data text-foreground text-center outline-none focus:border-primary"
                              />
                              <span className="text-[12px] text-muted-foreground">to</span>
                              <input
                                type="number"
                                value={currentValue.lte ?? ""}
                                onChange={(e) => updateRange(filter.id, "lte", e.target.value)}
                                placeholder="Max"
                                className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-[12px] font-mono-data text-foreground text-center outline-none focus:border-primary"
                              />
                            </div>
                            <button
                              onClick={() => clearFilter(filter.id)}
                              className="text-[11px] text-muted-foreground hover:underline"
                            >
                              Clear values
                            </button>
                          </>
                        )}

                        {filter.type === "single" && filter.id === "scheme_sub_category" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 bg-secondary border border-border rounded-md px-2.5 py-1.5">
                              <input
                                type="text"
                                value={subCategorySearch}
                                onChange={(e) => setSubCategorySearch(e.target.value)}
                                placeholder="Search by category name"
                                className="bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground outline-none w-full"
                              />
                            </div>
                            {SCHEME_SUB_CATEGORY_GROUPS.map((group) => {
                              const groupSearch = subCategorySearch.trim().toLowerCase();
                              const filteredOptions = group.options.filter((option) =>
                                option.toLowerCase().includes(groupSearch)
                              );
                              if (groupSearch && filteredOptions.length === 0) return null;

                              const isExpanded = expandedGroups[group.id];
                              const selectedSchemeClass = values["scheme_class"]?.value;
                              const groupSchemeClass = group.schemeClassValue ?? group.label;
                              const isGroupSelected = selectedSchemeClass === groupSchemeClass;

                              return (
                                <div key={group.id} className="space-y-2">
                                  <button
                                    onClick={() =>
                                      setExpandedGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                                    }
                                    className="w-full flex items-center justify-between px-1 py-1 text-[12px] text-foreground hover:bg-surface-hover transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          if (isGroupSelected) {
                                            onChangeValue("scheme_class", {});
                                          } else {
                                            onChangeValue("scheme_class", { value: groupSchemeClass });
                                          }
                                        }}
                                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                          isGroupSelected
                                            ? "bg-primary border-primary text-primary-foreground"
                                            : "border-border hover:border-muted-foreground"
                                        }`}
                                      >
                                        {isGroupSelected && <Check className="w-3 h-3" />}
                                      </div>
                                      <span className="text-[12px] font-medium">{group.label}</span>
                                      <span className="text-[11px] text-muted-foreground">
                                        ({group.options.length})
                                      </span>
                                    </div>
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </button>

                                  {isExpanded && (
                                    <div className="space-y-1 pl-6">
                                      {(groupSearch ? filteredOptions : group.options).map((option) => {
                                        const isSelected = currentValue.value === option;
                                        return (
                                          <button
                                            key={option}
                                            onClick={() => {
                                              if (isSelected) {
                                                clearFilter(filter.id);
                                              } else {
                                                updateSingle(filter.id, option);
                                                onChangeValue("scheme_class", { value: groupSchemeClass });
                                              }
                                            }}
                                            className="w-full flex items-center gap-2 px-1 py-1 text-[12px] text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                                          >
                                            <div
                                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                                isSelected
                                                  ? "bg-primary border-primary text-primary-foreground"
                                                  : "border-border"
                                              }`}
                                            >
                                              {isSelected && <Check className="w-3 h-3" />}
                                            </div>
                                            <span className={isSelected ? "text-foreground" : undefined}>{option}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {filter.type === "single" &&
                          filter.id !== "scheme_sub_category" &&
                          filter.options && (
                            <div className="flex flex-wrap gap-2">
                              {filter.options.map((option) => {
                                const isSelected = currentValue.value === option;
                                return (
                                  <button
                                    key={option}
                                    onClick={() => updateSingle(filter.id, option)}
                                    className={`px-3 py-1.5 text-[12px] font-medium rounded border transition-colors ${
                                      isSelected
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border text-foreground hover:bg-surface-hover"
                                    }`}
                                  >
                                    {option}
                                  </button>
                                );
                              })}
                              <button
                                onClick={() => clearFilter(filter.id)}
                                className="px-3 py-1.5 text-[12px] font-medium rounded border border-border text-muted-foreground hover:bg-surface-hover"
                              >
                                Clear
                              </button>
                            </div>
                          )}

                        {!filter.pinned && (
                          <button
                            onClick={() => removeFilter(filter.id)}
                            className="flex items-center gap-1 text-[11px] text-negative hover:underline"
                          >
                            <X className="w-3 h-3" />
                            Remove filter
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isExpanded && filter.type === "range" && (
                  <div className="px-4 pb-4">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                    <input
                      type="range"
                      min={getRangeBounds(filter.id, filter.label).min}
                      max={getRangeBounds(filter.id, filter.label).max}
                      step={getRangeBounds(filter.id, filter.label).step}
                      value={
                        values[filter.id]?.gte !== undefined && values[filter.id]?.gte !== ""
                          ? Number(values[filter.id]?.gte)
                          : Math.round(getRangeBounds(filter.id, filter.label).max / 2)
                      }
                      onChange={(e) => updateRange(filter.id, "gte", e.target.value)}
                      className="w-full mt-2"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-border">
          <button
            onClick={() => setShowAddFilter(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-md text-[13px] font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Filter
          </button>
        </div>
      </div>

      {showAddFilter && (
        <FilterAddModal
          onClose={() => setShowAddFilter(false)}
          enabledFilters={enabledFilters}
          onChangeEnabled={onChangeEnabled}
        />
      )}
    </>
  );
};

export default FilterSidebar;
