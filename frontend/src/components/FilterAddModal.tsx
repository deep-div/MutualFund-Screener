import { useMemo, useState } from "react";
import { Search, Check, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { FILTER_CATEGORIES, FILTER_DEFINITIONS, PINNED_FILTERS } from "@/data/filters";

interface FilterAddModalProps {
  onClose: () => void;
  enabledFilters: string[];
  onChangeEnabled: (next: string[]) => void;
}

const FilterAddModal = ({ onClose, enabledFilters, onChangeEnabled }: FilterAddModalProps) => {
  const [activeCategory, setActiveCategory] = useState("scheme");
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
      <div className="absolute inset-0 bg-transparent" />
      <motion.div
        initial={{ x: -420 }}
        animate={{ x: 0 }}
        exit={{ x: -420 }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute left-72 top-0 bottom-0 w-[640px] bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Add Filters</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-background border border-border rounded-md px-3 py-1.5 w-52">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for Filters"
                className="bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground outline-none w-full"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-52 border-r border-border py-2">
            {FILTER_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors flex items-center justify-between ${
                  activeCategory === cat.id
                    ? "text-foreground bg-surface-hover"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                <span>{cat.label}</span>
                {activeCategory === cat.id && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
            ))}
          </div>

          <div className="flex-1 py-2 overflow-y-auto scrollbar-thin">
            {visibleFilters.map((filter) => {
              const checked = enabledFilters.includes(filter.id);
              return (
                <label
                  key={filter.id}
                  onClick={() => toggleFilter(filter.id)}
                  className="flex items-center gap-3 px-6 py-2.5 hover:bg-surface-hover transition-colors cursor-pointer"
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

        <div className="mt-auto flex items-center justify-between px-6 py-3 border-t border-border bg-popover">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
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
