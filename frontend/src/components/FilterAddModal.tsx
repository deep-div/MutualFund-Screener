import { useMemo, useState } from "react";
import { Search, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import { FILTER_CATEGORIES, FILTER_DEFINITIONS, PINNED_FILTERS } from "@/data/filters";

interface FilterAddModalProps {
  onClose: () => void;
  enabledFilters: string[];
  onChangeEnabled: (next: string[]) => void;
}

const FilterAddModal = ({ onClose, enabledFilters, onChangeEnabled }: FilterAddModalProps) => {
  const [activeCategory, setActiveCategory] = useState("returns");
  const [searchQuery, setSearchQuery] = useState("");

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-y-0 left-0 w-full bg-background border border-border shadow-2xl overflow-hidden flex flex-col md:left-72 md:w-[640px] md:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Add Filters</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex w-full items-center gap-2 bg-background border border-border rounded-md px-3 py-1.5 hover:bg-[#f1f1f1] transition-colors sm:w-52">
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

        <div className="flex flex-1 min-h-0 flex-col">
          <div className="border-b border-border">
            <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-thin sm:px-4">
              {FILTER_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors sm:text-[13px] ${
                    activeCategory === cat.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                  }`}
                >
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
            {visibleFilters.map((filter) => {
              const checked = enabledFilters.includes(filter.id);
              return (
                <label
                  key={filter.id}
                  onClick={() => toggleFilter(filter.id)}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-[#f1f1f1] sm:px-6 sm:py-2.5"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      checked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border hover:border-muted-foreground bg-[#f1f1f1]"
                    }`}
                  >
                    {checked && <Check className="w-3 h-3" />}
                  </div>
                  <span className="text-[13px] text-foreground">{filter.label}</span>
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
