import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Check } from "lucide-react";
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
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({
    scheme_sub_category: true,
  });
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [subCategorySearch, setSubCategorySearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    equity: false,
    debt: false,
    hybrid: false,
    others: false,
  });
  const [draftRanges, setDraftRanges] = useState<Record<string, { gte?: number | ""; lte?: number | "" }>>({});

  const filtersToRender = useMemo(() => {
    const unique = Array.from(new Set([...PINNED_FILTERS, ...enabledFilters]));
    return unique
      .map((id) => FILTER_DEFINITIONS_BY_ID[id])
      .filter((filter): filter is FilterDefinition => Boolean(filter))
      .filter((filter) => filter.id !== "scheme_class");
  }, [enabledFilters]);

  useEffect(() => {
    const next: Record<string, { gte?: number | ""; lte?: number | "" }> = {};
    Object.entries(values).forEach(([id, value]) => {
      if (value?.gte !== undefined || value?.lte !== undefined) {
        next[id] = { ...value };
      }
    });
    setDraftRanges(next);
  }, [values]);

  const toggleFilter = (id: string) => {
    setExpandedFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateRange = (filterId: string, key: "gte" | "lte", value: string) => {
    const parsed = value === "" ? "" : Number(value);
    onChangeValue(filterId, { ...values[filterId], [key]: parsed });
  };

  const updateDraftRange = (filterId: string, key: "gte" | "lte", value: string) => {
    const parsed = value === "" ? "" : Number(value);
    setDraftRanges((prev) => ({
      ...prev,
      [filterId]: { ...values[filterId], ...prev[filterId], [key]: parsed },
    }));
  };

  const commitDraftRange = (filterId: string) => {
    const draft = draftRanges[filterId];
    if (!draft) return;
    onChangeValue(filterId, draft);
  };

  const getRangeBounds = (filterId: string, label: string) => {
    if (filterId === "current_nav") return { min: 0, max: 1000, step: 1 };
    if (filterId === "time_since_inception_years") return { min: 0, max: 30, step: 1 };
    if (label.includes("%")) return { min: 0, max: 100, step: 1 };
    return { min: 0, max: 100, step: 1 };
  };

  const getSegmentBounds = (min: number, max: number) => {
    const span = max - min;
    const first = Math.round(min + span / 3);
    const second = Math.round(min + (2 * span) / 3);
    return { first, second };
  };

  const getSegmentSelection = (value: { gte?: number | ""; lte?: number | "" }, min: number, max: number) => {
    if (value.gte === undefined || value.lte === undefined || value.gte === "" || value.lte === "") return null;
    const { first, second } = getSegmentBounds(min, max);
    if (value.gte <= min && value.lte <= first) return "low";
    if (value.gte >= first && value.lte <= second) return "mid";
    if (value.gte >= second && value.lte >= second) return "high";
    return null;
  };

  const applySegment = (filterId: string, segment: "low" | "mid" | "high", min: number, max: number) => {
    const { first, second } = getSegmentBounds(min, max);
    if (segment === "low") {
      onChangeValue(filterId, { gte: min, lte: first });
      return;
    }
    if (segment === "mid") {
      onChangeValue(filterId, { gte: first, lte: second });
      return;
    }
    onChangeValue(filterId, { gte: second, lte: max });
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
    setExpandedFilters((prev) => {
      if (!prev[filterId]) return prev;
      const next = { ...prev };
      delete next[filterId];
      return next;
    });
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
            const draftValue = draftRanges[filter.id] ?? currentValue;
            const isExpanded = Boolean(expandedFilters[filter.id]);
            return (
              <div key={filter.id} className="border-b border-border">
                <div className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors">
                  <button
                    onClick={() => toggleFilter(filter.id)}
                    className="flex-1 text-left text-[13px] font-semibold text-foreground"
                  >
                    {filter.label}
                  </button>
                  <div className="flex items-center gap-3">
                    {!filter.pinned && (
                      <button
                        onClick={() => removeFilter(filter.id)}
                        className="text-[11px] font-medium text-muted-foreground hover:text-negative"
                      >
                        Remove
                      </button>
                    )}
                    <button
                      onClick={() => toggleFilter(filter.id)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label={isExpanded ? "Collapse filter" : "Expand filter"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

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
                            {(() => {
                              const { min, max, step } = getRangeBounds(filter.id, filter.label);
                              const selected = getSegmentSelection(currentValue, min, max);
                              return (
                                <>
                                  <div className="space-y-2 pt-2">
                                    <div className="relative h-4 range-track">
                                      {(() => {
                                        const minValue =
                                          draftValue.gte !== undefined && draftValue.gte !== ""
                                            ? Number(draftValue.gte)
                                            : min;
                                        const maxValue =
                                          draftValue.lte !== undefined && draftValue.lte !== ""
                                            ? Number(draftValue.lte)
                                            : max;
                                        const span = max - min || 1;
                                        const left = ((Math.min(minValue, maxValue) - min) / span) * 100;
                                        const right = ((Math.max(minValue, maxValue) - min) / span) * 100;
                                        return (
                                          <div
                                            className="range-track__fill"
                                            style={{
                                              background: `linear-gradient(90deg,
                                                hsl(var(--border)) 0%,
                                                hsl(var(--border)) ${left}%,
                                                hsl(var(--primary)) ${left}%,
                                                hsl(var(--primary)) ${right}%,
                                                hsl(var(--border)) ${right}%,
                                                hsl(var(--border)) 100%)`,
                                            }}
                                          />
                                        );
                                      })()}
                                      <input
                                        type="range"
                                        min={min}
                                        max={max}
                                        step={step}
                                        value={
                                          draftValue.gte !== undefined && draftValue.gte !== ""
                                            ? Number(draftValue.gte)
                                            : min
                                        }
                                        onChange={(e) => updateDraftRange(filter.id, "gte", e.target.value)}
                                        onPointerUp={() => commitDraftRange(filter.id)}
                                        onPointerCancel={() => commitDraftRange(filter.id)}
                                        onKeyUp={() => commitDraftRange(filter.id)}
                                        className="range-input range-input--min absolute left-0 right-0 top-0 w-full"
                                      />
                                      <input
                                        type="range"
                                        min={min}
                                        max={max}
                                        step={step}
                                        value={
                                          draftValue.lte !== undefined && draftValue.lte !== ""
                                            ? Number(draftValue.lte)
                                            : max
                                        }
                                        onChange={(e) => updateDraftRange(filter.id, "lte", e.target.value)}
                                        onPointerUp={() => commitDraftRange(filter.id)}
                                        onPointerCancel={() => commitDraftRange(filter.id)}
                                        onKeyUp={() => commitDraftRange(filter.id)}
                                        className="range-input range-input--max absolute left-0 right-0 top-0 w-full"
                                      />
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <input
                                        type="number"
                                        value={draftValue.gte ?? ""}
                                        onChange={(e) => updateRange(filter.id, "gte", e.target.value)}
                                        placeholder={String(min)}
                                        className="w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-[12px] font-mono-data text-foreground text-center outline-none focus:border-primary"
                                      />
                                      <span className="text-[12px] text-muted-foreground">to</span>
                                      <input
                                        type="number"
                                        value={draftValue.lte ?? ""}
                                        onChange={(e) => updateRange(filter.id, "lte", e.target.value)}
                                        placeholder={String(max)}
                                        className="w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-[12px] font-mono-data text-foreground text-center outline-none focus:border-primary"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 rounded-md border border-border overflow-hidden">
                                    {[
                                      { id: "low", label: "Low" },
                                      { id: "mid", label: "Mid" },
                                      { id: "high", label: "High" },
                                    ].map((segment) => (
                                      <button
                                        key={segment.id}
                                        onClick={() =>
                                          applySegment(filter.id, segment.id as "low" | "mid" | "high", min, max)
                                        }
                                        className={`py-1.5 text-[12px] font-medium transition-colors ${
                                          selected === segment.id
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-background text-foreground hover:bg-surface-hover"
                                        } ${segment.id !== "high" ? "border-r border-border" : ""}`}
                                      >
                                        {segment.label}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              );
                            })()}
                            <button
                              onClick={() => clearFilter(filter.id)}
                              className="text-[11px] text-muted-foreground hover:text-negative focus:outline-none active:text-negative"
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

                        
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                
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
