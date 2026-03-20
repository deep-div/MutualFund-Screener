import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Share2, Lock, Plus } from "lucide-react";
import { listSchemes, SchemeListItem } from "@/services/mutualFundService";

const LIMIT = 10;

const columns: Array<{
  key: keyof SchemeListItem;
  label: string;
  align: "left" | "right";
  format?: "number" | "percent";
}> = [
  { key: "scheme_sub_name", label: "Name", align: "left" },
  { key: "scheme_sub_category", label: "Sub Category", align: "left" },
  { key: "scheme_class", label: "Class", align: "left" },
  { key: "current_nav", label: "NAV", align: "right", format: "number" },
  { key: "abs_3m", label: "Abs 3M (%)", align: "right", format: "percent" },
  { key: "abs_6m", label: "Abs 6M (%)", align: "right", format: "percent" },
  { key: "cagr_1y", label: "CAGR 1Y (%)", align: "right", format: "percent" },
  { key: "cagr_3y", label: "CAGR 3Y (%)", align: "right", format: "percent" },
  { key: "cagr_5y", label: "CAGR 5Y (%)", align: "right", format: "percent" },
  { key: "rolling_avg_1y", label: "Rolling Avg 1Y (%)", align: "right", format: "percent" },
  { key: "volatility_max", label: "Volatility Max", align: "right", format: "percent" },
  { key: "sharpe_max", label: "Sharpe Max", align: "right", format: "number" },
  { key: "mdd_max_drawdown_percent", label: "Max Drawdown (%)", align: "right", format: "percent" },
];

interface FundTableProps {
  filters: Record<string, Record<string, number | string>>;
}

const FundTable = ({ filters }: FundTableProps) => {
  const [sortKey, setSortKey] = useState<keyof SchemeListItem>("scheme_sub_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [items, setItems] = useState<SchemeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const handleSort = (key: keyof SchemeListItem) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const formatNumber = (val: number, format?: "number" | "percent") => {
    if (format === "percent") return val.toFixed(2);
    return val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getReturnColor = (val: number | null | undefined) => {
    if (typeof val !== "number") return "text-muted-foreground";
    return val >= 0 ? "text-positive" : "text-negative";
  };

  const fetchPage = async (nextOffset: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await listSchemes(
        {
          filters,
          sort_field: String(sortKey),
          sort_order: sortDir,
        },
        { limit: LIMIT, offset: nextOffset }
      );
      setTotal(response.total);
      setItems((prev) => (append ? [...prev, ...response.items] : response.items));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
      if (!append) {
        setItems([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(0, false);
  }, [filterKey, sortKey, sortDir]);

  const canLoadMore = items.length < total;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-[15px] font-semibold text-foreground tracking-tight">
              Track, Sell bad funds, Buy other Opportunities -20%
            </h1>
            <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
              1. Check rolling returns 2. AUM more then 20 3. Number of stocks held high 60 plus 4. No funds with same fund house 5. Cagr overall in ticker tape
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button className="p-2 border border-border rounded-md hover:bg-surface-hover transition-colors">
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button className="p-2 border border-border rounded-md hover:bg-surface-hover transition-colors">
              <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button className="px-4 py-2 bg-foreground text-background rounded-md text-[13px] font-medium hover:bg-foreground/90 transition-colors">
              Update
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-[13px]">
            <span className="text-muted-foreground">Showing </span>
            <span className="text-primary font-medium">1 - {items.length}</span>
            <span className="text-muted-foreground"> of </span>
            <span className="text-primary font-medium">{total}</span>
            <span className="text-muted-foreground"> results</span>
          </p>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground font-mono-data">last updated at 8:00 AM IST</span>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-[12px] font-medium text-foreground hover:bg-surface-hover transition-colors">
              <Lock className="w-3 h-3" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface border-b border-border">
              <th className="w-8 px-2 py-3">
                <button className="p-0.5 hover:bg-surface-hover rounded transition-colors">
                  <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </th>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  onClick={() => handleSort(col.key)}
                  className={`px-3 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors whitespace-nowrap ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {col.label}
                  {sortKey === col.key && <span className="ml-1">{sortDir === "asc" ? "^" : "v"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((fund, index) => (
              <motion.tr
                key={fund.scheme_id ?? `${fund.scheme_sub_name}-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="border-b border-border hover:bg-surface-hover/50 transition-colors cursor-default group"
              >
                <td className="px-3 py-3 text-[13px] font-mono-data text-muted-foreground">
                  {index + 1}.
                </td>
                {columns.map((col) => {
                  const value = fund[col.key];
                  if (col.key === "scheme_sub_name") {
                    return (
                      <td key={String(col.key)} className="px-3 py-3">
                        <span className="text-[13px] font-medium text-primary hover:underline cursor-pointer">
                          {typeof value === "string" && value ? value : "-"}
                        </span>
                      </td>
                    );
                  }

                  if (typeof value === "number") {
                    return (
                      <td
                        key={String(col.key)}
                        className={`px-3 py-3 text-[13px] font-mono-data text-right ${getReturnColor(value)}`}
                      >
                        {formatNumber(value, col.format)}
                      </td>
                    );
                  }

                  return (
                    <td
                      key={String(col.key)}
                      className={`px-3 py-3 text-[13px] ${col.align === "right" ? "text-right" : "text-left"} text-foreground`}
                    >
                      {typeof value === "string" && value ? value : "-"}
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>

        {error && <div className="p-4 text-sm text-negative">{error}</div>}
        {loading && items.length === 0 && <div className="p-4 text-sm text-muted-foreground">Loading...</div>}
        {!loading && items.length === 0 && !error && (
          <div className="p-4 text-sm text-muted-foreground">No schemes found.</div>
        )}

        <div className="p-4 flex justify-center">
          {canLoadMore && (
            <button
              onClick={() => fetchPage(items.length, true)}
              disabled={loading}
              className="px-4 py-2 border border-border rounded-md text-[13px] font-medium text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FundTable;
