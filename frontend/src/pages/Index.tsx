import Navbar from "@/components/Navbar";
import TickerTape from "@/components/TickerTape";
import FilterSidebar from "@/components/FilterSidebar";
import FundTable from "@/components/FundTable";
import {
  FILTER_DEFINITIONS_BY_ID,
  PINNED_FILTERS,
  FilterValueMap,
} from "@/data/filters";
import { useMemo, useState } from "react";

const Index = () => {
  const [enabledFilters, setEnabledFilters] = useState<string[]>(PINNED_FILTERS);
  const [filterValues, setFilterValues] = useState<FilterValueMap>({});

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
        count += 1;
      }
    });
    return count;
  }, [enabledFilters, filterValues]);

  const filtersPayload = useMemo(() => {
    const payload: Record<string, Record<string, number | string>> = {};
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
        payload[id] = { eq: value.value };
      }
    });
    return payload;
  }, [enabledFilters, filterValues]);

  const handleReset = () => {
    setEnabledFilters(PINNED_FILTERS);
    setFilterValues({});
  };

  const handleValueChange = (id: string, nextValue: { gte?: number | ""; lte?: number | ""; value?: string }) => {
    setFilterValues((prev) => ({ ...prev, [id]: nextValue }));
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TickerTape />
      <Navbar />
      <div className="flex flex-1 overflow-hidden page-dimmable">
        <FilterSidebar
          enabledFilters={enabledFilters}
          values={filterValues}
          activeCount={activeCount}
          onChangeEnabled={setEnabledFilters}
          onChangeValue={handleValueChange}
          onReset={handleReset}
        />
        <FundTable filters={filtersPayload} enabledFilters={enabledFilters} filterValues={filterValues} />
      </div>
    </div>
  );
};

export default Index;
