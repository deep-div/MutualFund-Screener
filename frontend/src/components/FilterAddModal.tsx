import { useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[640px] bg-popover border border-border rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Add Filters</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Pick from over 50 filters</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1.5 text-[12px] font-medium text-foreground border border-border rounded-md hover:bg-surface-hover transition-colors">
              Custom
            </button>
            <div className="flex items-center gap-2 bg-secondary border border-border rounded-md px-3 py-1.5 w-48">
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

        <div className="flex h-[400px]">
          <div className="w-48 border-r border-border py-2">
            {FILTER_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors ${
                  activeCategory === cat.id
                    ? "text-foreground bg-surface-hover"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex-1 py-2 overflow-y-auto scrollbar-thin">
            {visibleFilters.map((filter) => {
              const checked = enabledFilters.includes(filter.id);
              return (
                <label
                  key={filter.id}
                  className="flex items-center gap-3 px-6 py-2.5 hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  <div
                    onClick={() => toggleFilter(filter.id)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      checked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border hover:border-muted-foreground"
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

        <div className="flex items-center justify-between px-6 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary">i</span>
            Learn more about <button className="text-primary hover:underline">Filters</button>
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
