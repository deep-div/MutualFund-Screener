import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Share2, Lock, Plus } from "lucide-react";
import { SAMPLE_FUNDS, MutualFund } from "@/data/funds";

const columns = [
  { key: "name", label: "Name", align: "left" as const },
  { key: "subCategory", label: "Sub Category", align: "left" as const },
  { key: "plan", label: "Plan", align: "left" as const },
  { key: "aum", label: "AUM", align: "right" as const },
  { key: "absReturn3M", label: "Absolute Returns - 3M", align: "right" as const },
  { key: "absReturn6M", label: "Absolute Returns - 6M", align: "right" as const },
  { key: "absReturn1Y", label: "Absolute Returns - 1Y", align: "right" as const },
  { key: "cagr3Y", label: "CAGR 3Y", align: "right" as const },
  { key: "cagr5Y", label: "CAGR 5Y", align: "right" as const },
  { key: "cagr10Y", label: "CAGR 10Y", align: "right" as const },
];

const FundTable = () => {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const funds = SAMPLE_FUNDS;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedFunds = [...funds].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey as keyof MutualFund];
    const bVal = b[sortKey as keyof MutualFund];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    return sortDir === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const formatNumber = (val: number, isReturn = false) => {
    if (isReturn) return val.toFixed(2);
    return val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getReturnColor = (val: number) => {
    return val >= 0 ? "text-positive" : "text-negative";
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Screen header */}
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
            <span className="text-primary font-medium">1 - {funds.length}</span>
            <span className="text-muted-foreground"> of </span>
            <span className="text-primary font-medium">{funds.length}</span>
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

      {/* Table */}
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
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-3 py-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors whitespace-nowrap ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedFunds.map((fund, index) => (
              <motion.tr
                key={fund.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="border-b border-border hover:bg-surface-hover/50 transition-colors cursor-default group"
              >
                <td className="px-3 py-3 text-[13px] font-mono-data text-muted-foreground">
                  {index + 1}.
                </td>
                <td className="px-3 py-3">
                  <span className="text-[13px] font-medium text-primary hover:underline cursor-pointer">
                    {fund.name}
                  </span>
                </td>
                <td className="px-3 py-3 text-[13px] text-foreground">{fund.subCategory}</td>
                <td className="px-3 py-3 text-[13px] text-foreground">{fund.plan}</td>
                <td className="px-3 py-3 text-[13px] font-mono-data text-foreground text-right">
                  {formatNumber(fund.aum)}
                </td>
                <td className={`px-3 py-3 text-[13px] font-mono-data text-right ${getReturnColor(fund.absReturn3M)}`}>
                  {formatNumber(fund.absReturn3M, true)}
                </td>
                <td className={`px-3 py-3 text-[13px] font-mono-data text-right ${getReturnColor(fund.absReturn6M)}`}>
                  {formatNumber(fund.absReturn6M, true)}
                </td>
                <td className={`px-3 py-3 text-[13px] font-mono-data text-right ${getReturnColor(fund.absReturn1Y)}`}>
                  {formatNumber(fund.absReturn1Y, true)}
                </td>
                <td className={`px-3 py-3 text-[13px] font-mono-data text-right ${getReturnColor(fund.cagr3Y)}`}>
                  {formatNumber(fund.cagr3Y, true)}
                </td>
                <td className={`px-3 py-3 text-[13px] font-mono-data text-right ${getReturnColor(fund.cagr5Y)}`}>
                  {formatNumber(fund.cagr5Y, true)}
                </td>
                <td className={`px-3 py-3 text-[13px] font-mono-data text-right ${getReturnColor(fund.cagr10Y)}`}>
                  {formatNumber(fund.cagr10Y, true)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FundTable;
