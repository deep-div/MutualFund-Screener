import { useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FilterAddModal from "./FilterAddModal";

interface FilterItem {
  id: string;
  label: string;
  min: number;
  max: number;
  currentMin: number;
  currentMax: number;
}

const DEFAULT_FILTERS: FilterItem[] = [
  { id: "plan", label: "Plan", min: 0, max: 0, currentMin: 0, currentMax: 0 },
  { id: "aum", label: "AUM (Cr)", min: 0, max: 150000, currentMin: 0, currentMax: 150000 },
  { id: "absReturn3M", label: "Absolute Ret. - 3M (%)", min: -30, max: 30, currentMin: -30, currentMax: 30 },
  { id: "absReturn6M", label: "Absolute Ret. - 6M (%)", min: -30, max: 30, currentMin: -30, currentMax: 30 },
  { id: "absReturn1Y", label: "Absolute Ret. - 1Y (%)", min: -50, max: 100, currentMin: -50, currentMax: 100 },
  { id: "cagr3Y", label: "CAGR 3Y (%)", min: -20, max: 50, currentMin: -20, currentMax: 50 },
  { id: "cagr5Y", label: "CAGR 5Y (%)", min: -61, max: 152, currentMin: -61, currentMax: 152 },
  { id: "cagr10Y", label: "CAGR 10Y (%)", min: -37, max: 74, currentMin: -37, currentMax: 74 },
  { id: "equityHolding", label: "% Equity Holding (%)", min: 0, max: 100, currentMin: 0, currentMax: 100 },
];

const FilterSidebar = () => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState(1);
  const [showAddFilter, setShowAddFilter] = useState(false);

  const toggleFilter = (id: string) => {
    setExpandedFilter(expandedFilter === id ? null : id);
  };

  const handleRangeChange = (filterId: string, type: "min" | "max", value: number) => {
    setFilters(filters.map(f => 
      f.id === filterId 
        ? { ...f, [type === "min" ? "currentMin" : "currentMax"]: value }
        : f
    ));
  };

  const setPreset = (filterId: string, preset: "low" | "mid" | "high") => {
    setFilters(filters.map(f => {
      if (f.id !== filterId) return f;
      const range = f.max - f.min;
      const third = range / 3;
      switch (preset) {
        case "low": return { ...f, currentMin: f.min, currentMax: f.min + third };
        case "mid": return { ...f, currentMin: f.min + third, currentMax: f.min + 2 * third };
        case "high": return { ...f, currentMin: f.min + 2 * third, currentMax: f.max };
      }
    }));
  };

  return (
    <>
      <div className="w-72 border-r border-border bg-surface flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-[13px] text-muted-foreground">
            {activeFilters} filter applied
          </span>
          <button className="text-[12px] font-medium text-foreground border border-border rounded px-2.5 py-1 hover:bg-surface-hover transition-colors">
            Reset all
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filters.map((filter) => (
            <div key={filter.id} className="border-b border-border">
              <button
                onClick={() => toggleFilter(filter.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-hover transition-colors"
              >
                <span className="text-[13px] font-medium text-foreground">{filter.label}</span>
                {expandedFilter === filter.id ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              <AnimatePresence>
                {expandedFilter === filter.id && filter.id !== "plan" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      <div className="relative pt-2">
                        <input
                          type="range"
                          min={filter.min}
                          max={filter.max}
                          value={filter.currentMin}
                          onChange={(e) => handleRangeChange(filter.id, "min", Number(e.target.value))}
                          className="absolute w-full h-1 bg-border rounded-full appearance-none cursor-pointer accent-primary"
                        />
                        <input
                          type="range"
                          min={filter.min}
                          max={filter.max}
                          value={filter.currentMax}
                          onChange={(e) => handleRangeChange(filter.id, "max", Number(e.target.value))}
                          className="absolute w-full h-1 bg-transparent rounded-full appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        <input
                          type="number"
                          value={filter.currentMin.toFixed(2)}
                          onChange={(e) => handleRangeChange(filter.id, "min", Number(e.target.value))}
                          className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-[12px] font-mono-data text-foreground text-center outline-none focus:border-primary"
                        />
                        <span className="text-[12px] text-muted-foreground">to</span>
                        <input
                          type="number"
                          value={filter.currentMax.toFixed(2)}
                          onChange={(e) => handleRangeChange(filter.id, "max", Number(e.target.value))}
                          className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-[12px] font-mono-data text-foreground text-center outline-none focus:border-primary"
                        />
                      </div>

                      <div className="flex gap-1">
                        {(["low", "mid", "high"] as const).map((preset) => (
                          <button
                            key={preset}
                            onClick={() => setPreset(filter.id, preset)}
                            className="flex-1 py-1.5 text-[12px] font-medium text-foreground bg-secondary border border-border rounded hover:bg-surface-hover transition-colors capitalize"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      <button className="text-[11px] text-negative hover:underline">Remove</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
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

      {showAddFilter && <FilterAddModal onClose={() => setShowAddFilter(false)} />}
    </>
  );
};

export default FilterSidebar;
