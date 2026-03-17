import { useState } from "react";
import { Search, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { FILTER_CATEGORIES, RETURN_FILTERS } from "@/data/funds";

interface FilterAddModalProps {
  onClose: () => void;
}

const FilterAddModal = ({ onClose }: FilterAddModalProps) => {
  const [activeCategory, setActiveCategory] = useState("returns");
  const [searchQuery, setSearchQuery] = useState("");
  const [checkedFilters, setCheckedFilters] = useState<Record<string, boolean>>(
    Object.fromEntries(RETURN_FILTERS.map(f => [f.id, f.checked]))
  );

  const toggleFilter = (id: string) => {
    setCheckedFilters(prev => ({ ...prev, [id]: !prev[id] }));
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
        {/* Header */}
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

        {/* Content */}
        <div className="flex h-[400px]">
          {/* Categories */}
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
                {cat.id === "returns" && (
                  <span className="ml-1 text-muted-foreground">›</span>
                )}
              </button>
            ))}
          </div>

          {/* Filter options */}
          <div className="flex-1 py-2 overflow-y-auto scrollbar-thin">
            {RETURN_FILTERS.map((filter) => (
              <label
                key={filter.id}
                className="flex items-center gap-3 px-6 py-2.5 hover:bg-surface-hover transition-colors cursor-pointer"
              >
                {filter.locked ? (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <div
                    onClick={() => toggleFilter(filter.id)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      checkedFilters[filter.id]
                        ? "bg-primary border-primary"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    {checkedFilters[filter.id] && (
                      <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                )}
                <span className={`text-[13px] ${filter.locked ? "text-muted-foreground" : "text-foreground"}`}>
                  {filter.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary">i</span>
            Learn more about <button className="text-primary hover:underline">Returns</button>
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
