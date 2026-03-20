import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Share2, Lock } from "lucide-react";
import { listSchemes, SchemeListItem } from "@/services/mutualFundService";
import { FILTER_DEFINITIONS_BY_ID } from "@/data/filters";

const LIMIT = 15;
const SKELETON_ROWS = 10;

const baseColumns: Array<{
  key: keyof SchemeListItem;
  label: string;
  align: "left" | "right" | "center";
}> = [
  { key: "scheme_sub_name", label: "Name", align: "left" },
  { key: "scheme_sub_category", label: "Sub Category", align: "left" },
  { key: "option_type", label: "Plan", align: "left" },
];

interface FundTableProps {
  filters: Record<string, Record<string, number | string>>;
  enabledFilters: string[];
}

const FundTable = ({ filters, enabledFilters }: FundTableProps) => {
  const [sortKey, setSortKey] = useState<keyof SchemeListItem | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [items, setItems] = useState<SchemeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  const formatNumber = (val: number) => {
    return val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const columns = useMemo(() => {
    const baseKeys = new Set(baseColumns.map((col) => String(col.key)));
    const dynamicColumns = enabledFilters
      .filter((id) => !baseKeys.has(id))
      .filter((id) => id !== "scheme_class")
      .map((id) => {
        const def = FILTER_DEFINITIONS_BY_ID[id];
        return {
          key: id as keyof SchemeListItem,
          label: def?.label ?? id,
          align: "center" as const,
        };
      });
    return baseColumns.map((col) => ({ ...col, align: "center" as const })).concat(dynamicColumns);
  }, [enabledFilters]);

  const toSchemeSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const getSchemePath = (fund: SchemeListItem) => {
    const schemeId = fund.scheme_id;
    const schemeSlug = toSchemeSlug(fund.scheme_sub_name ?? "scheme");
    return schemeId ? `/${schemeSlug}/${schemeId}` : "#";
  };

  const fetchPage = async (nextOffset: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const payload: {
        filters: Record<string, Record<string, number | string>>;
        sort_field?: string;
        sort_order?: "asc" | "desc";
      } = { filters };
      if (sortKey) {
        payload.sort_field = String(sortKey);
        payload.sort_order = sortDir;
      }
      const response = await listSchemes(payload, { limit: LIMIT, offset: nextOffset });
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
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
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

      <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
        <div className="w-full overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-max table-fixed border-separate border-spacing-0">
          <colgroup>
            {columns.map((col) => (
              <col key={String(col.key)} className="min-w-[160px]" />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20 bg-surface-hover dimmable-header">
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  onClick={() => {
                    const nextKey = col.key;
                    if (sortKey === nextKey) {
                      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
                    } else {
                      setSortKey(nextKey);
                      setSortDir("desc");
                    }
                  }}
                  className={`px-3 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap bg-surface-hover shadow-[0_1px_0_0_hsl(var(--border))] cursor-pointer select-none hover:text-foreground text-center group ${
                    col.key === "scheme_sub_name" ? "sticky left-0 z-30" : ""
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <span>{col.label}</span>
                    <span className="inline-flex flex-col items-center leading-none text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <span
                        className={
                          sortKey === col.key && sortDir === "asc" ? "text-foreground" : "text-muted-foreground"
                        }
                      >
                        ↑
                      </span>
                      <span
                        className={
                          sortKey === col.key && sortDir === "desc" ? "text-foreground" : "text-muted-foreground"
                        }
                      >
                        ↓
                      </span>
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0
              ? Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`} className="border-b border-border">
                    {columns.map((col) => (
                      <td key={`${rowIndex}-${String(col.key)}`} className="px-3 py-3">
                        <Skeleton
                          className={`h-3 ${
                            col.key === "scheme_sub_name"
                              ? "w-48"
                              : col.key === "scheme_sub_category"
                                ? "w-40"
                                : "w-24"
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              : items.map((fund, index) => (
                  <motion.tr
                    key={fund.scheme_id ?? `${fund.scheme_sub_name}-${index}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-border hover:bg-surface-hover transition-colors cursor-pointer group dimmable-row"
                  >
                    {columns.map((col) => {
                      const value = fund[col.key];
                      const schemePath = getSchemePath(fund);
                      if (col.key === "scheme_sub_name") {
                        return (
                      <td
                        key={String(col.key)}
                        className={`px-3 py-3 ${col.key === "scheme_sub_name" ? "sticky left-0 z-10 bg-background" : ""}`}
                      >
                        <Link
                          to={schemePath}
                          className="block text-[13px] font-medium text-primary hover:no-underline cursor-pointer"
                        >
                          {typeof value === "string" && value ? value : "-"}
                        </Link>
                      </td>
                        );
                      }

                      return (
                        <td
                          key={String(col.key)}
                          className={`px-3 py-3 text-[13px] text-center text-foreground ${
                            col.key === "scheme_sub_name" ? "sticky left-0 z-10 bg-background text-left" : ""
                          }`}
                        >
                          <Link to={schemePath} className="block">
                            {typeof value === "string" && value
                              ? value
                              : typeof value === "number"
                                ? formatNumber(value)
                                : "-"}
                          </Link>
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}
          </tbody>
          </table>
        </div>

        {error && <div className="p-4 text-sm text-negative">{error}</div>}
        {!loading && items.length === 0 && !error && (
          <div className="p-4 text-sm text-muted-foreground">No schemes found.</div>
        )}

        <div className="p-4 flex justify-center">
          {canLoadMore && (
            <button
              onClick={() => fetchPage(items.length, true)}
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
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
