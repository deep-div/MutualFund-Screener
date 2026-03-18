import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Activity, BarChart3, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import TickerTape from "@/components/TickerTape";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getSchemeAnalytics } from "@/services/mutualFundService";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PERIOD_LABELS: Record<string, string> = {
  one_day: "1D",
  one_week: "1W",
  one_month: "1M",
  three_month: "3M",
  six_month: "6M",
  one_year: "1Y",
  two_year: "2Y",
  three_year: "3Y",
  four_year: "4Y",
  five_year: "5Y",
  seven_year: "7Y",
  ten_year: "10Y",
  max: "Max",
};

const toYmd = (value?: string | Date | null) => {
  if (!value) return null;
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [dd, mm, yyyy] = trimmed.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
};

type MfApiNavPoint = { date: string; nav: string };
type MfApiResponse = { meta?: Record<string, string>; data?: MfApiNavPoint[] };

const MetricCard = ({
  label,
  value,
  suffix = "%",
  color,
}: {
  label: string;
  value: number | null | undefined;
  suffix?: string;
  color?: string;
}) => (
  <div className="flex flex-col gap-1 px-4 py-3 rounded-lg bg-surface border border-border">
    <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</span>
    <span
      className={`text-[15px] font-semibold font-mono-data ${
        color || (value !== null && value !== undefined && value >= 0 ? "text-positive" : "text-negative")
      }`}
    >
      {typeof value === "number" ? `${value.toFixed(2)}${suffix}` : "-"}
    </span>
  </div>
);

const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 mb-4 mt-8 first:mt-0">
    <Icon className="w-4 h-4 text-primary" />
    <h2 className="text-[14px] font-semibold text-foreground tracking-tight">{title}</h2>
  </div>
);

const FundAnalytics = () => {
  const { schemeCode } = useParams();
  const navigate = useNavigate();
  const code = schemeCode ? Number(schemeCode) : NaN;
  const [returnType, setReturnType] = useState<"absolute" | "cagr">("absolute");
  const [returnPeriod, setReturnPeriod] = useState<
    "one_day" | "one_week" | "one_month" | "three_month" | "six_month" | "one_year" | "two_year" | "three_year" | "five_year" | "max"
  >("one_year");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["scheme-analytics", code],
    queryFn: () => getSchemeAnalytics(code),
    enabled: Number.isFinite(code),
  });

  const detail = data;
  const meta = detail?.meta;
  const metrics = detail?.metrics;

  const absReturns = metrics?.returns?.absolute_returns_percent || {};
  const cagrReturns = metrics?.returns?.cagr_percent || {};
  const yoyReturns = metrics?.returns?.year_on_year_percent || {};
  const heatmap = metrics?.returns?.monthly_return_heatmap || {};
  const sipReturns = metrics?.returns?.sip_returns || {};
  const consistency = metrics?.consistency?.consistency;
  const riskMetrics = metrics?.risk_metrics;
  const riskAdj = metrics?.risk_adjusted_returns;
  const drawdown = metrics?.drawdown;

  const yoyData = useMemo(() => {
    return Object.entries(yoyReturns)
      .map(([year, ret]) => ({ year, return: ret as number }))
      .sort((a, b) => Number(a.year) - Number(b.year));
  }, [yoyReturns]);

  const rollingKeys = Object.keys(metrics?.returns?.rolling_cagr_percent || {});
  const defaultRolling = rollingKeys[0] || "1_year";

  const getHeatmapColor = (val: number) => {
    if (val >= 10) return "bg-positive/30 text-positive";
    if (val >= 0) return "bg-positive/10 text-positive";
    if (val >= -5) return "bg-negative/10 text-negative";
    return "bg-negative/25 text-negative";
  };

  const launchDate = toYmd(meta?.launch_date);
  const endDate = toYmd(meta?.current_date);

  const navQuery = useQuery({
    queryKey: ["mfapi-nav", code, launchDate, endDate],
    queryFn: async () => {
      const response = await fetch(
        `https://api.mfapi.in/mf/${code}?startDate=${launchDate}&endDate=${endDate}`
      );
      if (!response.ok) {
        throw new Error("Failed to load NAV history");
      }
      return (await response.json()) as MfApiResponse;
    },
    enabled: Number.isFinite(code) && !!launchDate && !!endDate,
  });

  const navSeries = useMemo(() => {
    const raw = navQuery.data?.data ?? [];
    return raw
      .map((point) => {
        const date = toYmd(point.date);
        const nav = Number(point.nav);
        return date && Number.isFinite(nav) ? { date, nav } : null;
      })
      .filter((point): point is { date: string; nav: number } => !!point)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [navQuery.data]);

  const selectedCagr = metrics?.returns?.cagr_percent?.[returnPeriod] ?? null;
  const selectedAbs = metrics?.returns?.absolute_returns_percent?.[returnPeriod] ?? null;
  const selectedReturn = returnType === "cagr" ? selectedCagr : selectedAbs;
  const periodLabel = PERIOD_LABELS[returnPeriod] || returnPeriod;

  const getPeriodStart = (end: string, period: typeof returnPeriod, fallback?: string | null) => {
    if (period === "max") {
      return fallback ?? end;
    }
    const endDateObj = new Date(end);
    if (Number.isNaN(endDateObj.getTime())) return end;
    const start = new Date(endDateObj);
    if (period === "one_day") start.setDate(start.getDate() - 1);
    else if (period === "one_week") start.setDate(start.getDate() - 7);
    else if (period === "one_month") start.setMonth(start.getMonth() - 1);
    else if (period === "three_month") start.setMonth(start.getMonth() - 3);
    else if (period === "six_month") start.setMonth(start.getMonth() - 6);
    else if (period === "one_year") start.setFullYear(start.getFullYear() - 1);
    else if (period === "two_year") start.setFullYear(start.getFullYear() - 2);
    else if (period === "three_year") start.setFullYear(start.getFullYear() - 3);
    else if (period === "five_year") start.setFullYear(start.getFullYear() - 5);
    const y = start.getFullYear();
    const m = String(start.getMonth() + 1).padStart(2, "0");
    const d = String(start.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const filteredNavSeries = useMemo(() => {
    if (!endDate) return navSeries;
    const startDate = getPeriodStart(endDate, returnPeriod, launchDate);
    return navSeries.filter((point) => point.date >= startDate && point.date <= endDate);
  }, [navSeries, endDate, returnPeriod, launchDate]);

  if (!Number.isFinite(code)) {
    return (
      <div className="min-h-screen bg-background">
        <TickerTape />
        <Navbar />
        <div className="p-6 text-sm text-muted-foreground">Invalid scheme code.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TickerTape />
      <Navbar />
      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading analytics...</div>
          ) : isError || !detail ? (
            <div className="text-sm text-destructive">Failed to load analytics.</div>
          ) : (
            <>
              {/* Header */}
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-3 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Screener
                </button>
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-[20px] font-bold text-foreground tracking-tight">{meta?.scheme_sub_name}</h1>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[12px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        {meta?.scheme_sub_category}
                      </span>
                      <span className="text-[12px] text-muted-foreground">{meta?.fund_house}</span>
                      <span className="text-[12px] text-muted-foreground">
                        {meta?.plan_type} · {meta?.option_type}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[22px] font-bold font-mono-data text-foreground">
                      INR {typeof meta?.current_nav === "number" ? meta.current_nav.toFixed(4) : "-"}
                    </div>
                    <div
                      className={`text-[13px] font-mono-data ${
                        typeof meta?.nav_change_1d === "number" && meta.nav_change_1d >= 0 ? "text-positive" : "text-negative"
                      }`}
                    >
                      {typeof meta?.nav_change_1d === "number" && typeof meta?.current_nav === "number" ? (
                        <>
                          {meta.nav_change_1d >= 0 ? "▲" : "▼"} {Math.abs(meta.nav_change_1d).toFixed(4)} (
                          {((meta.nav_change_1d / meta.current_nav) * 100).toFixed(2)}%)
                        </>
                      ) : (
                        "-"
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      NAV as of {meta?.current_date} · {meta?.time_since_inception_years}Y since inception
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* NAV Performance */}
              <SectionHeader icon={BarChart3} title="NAV Performance" />
              <div className="bg-surface border border-border rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    {(["absolute", "cagr"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setReturnType(type)}
                        className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                          returnType === type
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:text-foreground"
                        }`}
                        type="button"
                      >
                        {type === "absolute" ? "Absolute" : "CAGR"}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        "one_day",
                        "one_week",
                        "one_month",
                        "three_month",
                        "six_month",
                        "one_year",
                        "two_year",
                        "three_year",
                        "five_year",
                        "max",
                      ] as const
                    ).map((key) => (
                      <button
                        key={key}
                        onClick={() => setReturnPeriod(key)}
                        className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                          returnPeriod === key
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:text-foreground"
                        }`}
                        type="button"
                      >
                        {PERIOD_LABELS[key] || key}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <MetricCard
                    label={`${returnType === "cagr" ? "CAGR" : "Absolute"} ${periodLabel}`}
                    value={typeof selectedReturn === "number" ? selectedReturn : null}
                  />
                </div>
                <div className="h-60">
                  {navQuery.isLoading ? (
                    <div className="text-sm text-muted-foreground">Loading NAV history...</div>
                  ) : navQuery.isError || filteredNavSeries.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No NAV history available.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={filteredNavSeries}>
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(d: string) => d.slice(0, 7)}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          tickCount={5}
                          domain={["dataMin", "dataMax"]}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(value: number) => [`${value.toFixed(2)}`, "NAV"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="nav"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ r: 2 }}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Absolute Returns */}
              <SectionHeader icon={TrendingUp} title="Absolute Returns" />
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                {Object.entries(absReturns)
                  .filter(([, v]) => v !== null)
                  .map(([k, v]) => (
                    <MetricCard key={k} label={PERIOD_LABELS[k] || k} value={v as number} />
                  ))}
              </div>

              {/* CAGR */}
              <SectionHeader icon={BarChart3} title="CAGR Returns" />
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                {Object.entries(cagrReturns)
                  .filter(([, v]) => v !== null)
                  .map(([k, v]) => (
                    <MetricCard key={k} label={PERIOD_LABELS[k] || k} value={v as number} />
                  ))}
              </div>

              {/* Year on Year Returns Bar Chart */}
              <SectionHeader icon={BarChart3} title="Year-on-Year Returns" />
              <div className="h-56 bg-surface border border-border rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yoyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [`${value.toFixed(2)}%`, "Return"]}
                    />
                    <Bar dataKey="return" radius={[4, 4, 0, 0]}>
                      {yoyData.map((entry, i) => (
                        <Cell key={i} fill={entry.return >= 0 ? "hsl(var(--positive))" : "hsl(var(--negative))"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Monthly Return Heatmap */}
              <SectionHeader icon={Activity} title="Monthly Return Heatmap" />
              <div className="overflow-x-auto bg-surface border border-border rounded-lg">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left text-muted-foreground font-medium">Year</th>
                      {MONTHS.map((m) => (
                        <th key={m} className="px-2 py-2 text-center text-muted-foreground font-medium">
                          {m}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(heatmap).map(([year, months]) => (
                      <tr key={year} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 font-medium text-foreground">{year}</td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const key = String(i + 1).padStart(2, "0");
                          const val = (months as Record<string, number>)[key];
                          return (
                            <td key={i} className="px-1 py-1.5 text-center">
                              {val !== undefined ? (
                                <span
                                  className={`inline-block w-full px-1 py-0.5 rounded text-[10px] font-mono-data font-medium ${getHeatmapColor(
                                    val
                                  )}`}
                                >
                                  {val.toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/30">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SIP Returns */}
              <SectionHeader icon={TrendingUp} title="SIP Returns (INR 1,000/month)" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(sipReturns)
                  .filter(([, v]) => v !== null)
                  .map(([period, dataPoint]) => {
                    const d = dataPoint as {
                      current_value: number;
                      total_invested: number;
                      xirr_percent: number;
                      absolute_return_percent: number;
                    } | null;
                    if (!d) return null;
                    return (
                      <div key={period} className="bg-surface border border-border rounded-lg p-4">
                        <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
                          {PERIOD_LABELS[period] || period}
                        </div>
                        <div className="text-[16px] font-bold font-mono-data text-foreground">
                          INR {d.current_value.toLocaleString("en-IN")}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          Invested: INR {d.total_invested.toLocaleString("en-IN")}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[12px] font-mono-data text-positive">
                            {d.xirr_percent.toFixed(1)}% XIRR
                          </span>
                          <span className="text-[11px] text-muted-foreground">·</span>
                          <span className="text-[12px] font-mono-data text-positive">
                            {d.absolute_return_percent.toFixed(1)}% abs
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Rolling CAGR */}
              <SectionHeader icon={Activity} title="Rolling CAGR" />
              <Tabs defaultValue={defaultRolling}>
                <TabsList className="mb-3">
                  {rollingKeys.map((k) => (
                    <TabsTrigger key={k} value={k} className="text-[12px]">
                      {k.replace("_", " ")}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {rollingKeys.map((k) => {
                  const rolling = metrics?.returns?.rolling_cagr_percent?.[k];
                  if (!rolling) return null;
                  return (
                    <TabsContent key={k} value={k}>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                        <MetricCard label="Avg" value={rolling.summary.average} />
                        <MetricCard label="Median" value={rolling.summary.median} />
                        <MetricCard label="Max" value={rolling.summary.maximum} />
                        <MetricCard label="Min" value={rolling.summary.minimum} />
                        <MetricCard label="Positive %" value={rolling.summary.positive_percent} />
                        <MetricCard label="Obs" value={rolling.summary.observations} suffix="" color="text-foreground" />
                      </div>
                      <div className="h-56 bg-surface border border-border rounded-lg p-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={rolling.points}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                              tickFormatter={(d: string) => d.slice(0, 7)}
                            />
                            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${v}%`} />
                            <Tooltip
                              contentStyle={{
                                background: "hsl(var(--popover))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: 8,
                                fontSize: 12,
                              }}
                              formatter={(value: number) => [`${value.toFixed(2)}%`, "CAGR"]}
                            />
                            <Line type="monotone" dataKey="cagr_percent" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>

              {/* Drawdown */}
              <SectionHeader icon={TrendingDown} title="Drawdown Analysis" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-surface border border-border rounded-lg p-4">
                  <div className="text-[11px] text-muted-foreground uppercase mb-1">Current Drawdown</div>
                  <div className="text-[18px] font-bold font-mono-data text-negative">
                    {typeof drawdown?.current_drawdown?.max_drawdown_percent === "number"
                      ? `${drawdown.current_drawdown.max_drawdown_percent.toFixed(2)}%`
                      : "-"}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {typeof drawdown?.current_drawdown?.drawdown_duration_days === "number"
                      ? `${drawdown.current_drawdown.drawdown_duration_days} days`
                      : "-"}
                  </div>
                </div>
                {Object.entries(drawdown?.mdd_duration_details || {})
                  .filter(([, v]) => v !== null && (v as { max_drawdown_percent: number | null }).max_drawdown_percent !== null)
                  .map(([period, d]) => (
                    <div key={period} className="bg-surface border border-border rounded-lg p-4">
                      <div className="text-[11px] text-muted-foreground uppercase mb-1">
                        MDD {PERIOD_LABELS[period] || period}
                      </div>
                      <div className="text-[16px] font-bold font-mono-data text-negative">
                        {(d as { max_drawdown_percent: number }).max_drawdown_percent.toFixed(2)}%
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        DD: {(d as { drawdown_duration_days: number }).drawdown_duration_days}d · Rec:{" "}
                        {(d as { recovery_duration_days: number | null }).recovery_duration_days ?? "-"}d
                      </div>
                    </div>
                  ))}
              </div>

              {/* Drawdown Frequency */}
              <div className="bg-surface border border-border rounded-lg p-4 mb-4">
                <div className="text-[12px] font-medium text-foreground mb-3">Drawdown Frequency</div>
                <div className="flex gap-4 flex-wrap">
                  {Object.entries(drawdown?.drawdown_frequency || {}).map(([level, dataPoint]) => (
                    <div key={level} className="text-center">
                      <div className="text-[18px] font-bold font-mono-data text-negative">
                        {(dataPoint as { count: number }).count}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {level.replace("beyond_", "> ").replace("_percent", "%")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consistency */}
              <SectionHeader icon={Zap} title="Consistency" />
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                <MetricCard label="Positive Days" value={consistency?.positive_days_percent} />
                <MetricCard label="Positive Months" value={consistency?.positive_months_percent} />
                <MetricCard label="Positive Years" value={consistency?.positive_years_percent} />
                <MetricCard
                  label="Max +ve Streak"
                  value={consistency?.max_consecutive_positive_months}
                  suffix=" mo"
                  color="text-positive"
                />
                <MetricCard
                  label="Max -ve Streak"
                  value={consistency?.max_consecutive_negative_months}
                  suffix=" mo"
                  color="text-negative"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-3">
                <MetricCard label="Best Day" value={consistency?.best_day?.return} />
                <MetricCard label="Worst Day" value={consistency?.worst_day?.return} />
                <MetricCard label="Best Month" value={consistency?.best_month?.return} />
                <MetricCard label="Worst Month" value={consistency?.worst_month?.return} />
                <MetricCard label="Best Year" value={consistency?.best_year?.return} />
                <MetricCard label="Worst Year" value={consistency?.worst_year?.return} />
              </div>

              {/* Risk Metrics */}
              <SectionHeader icon={Shield} title="Risk Metrics" />
              <div className="space-y-3">
                {[
                  { label: "Volatility (Ann.)", data: riskMetrics?.volatility_annualized_percent },
                  { label: "Downside Deviation", data: riskMetrics?.downside_deviation_percent },
                  { label: "Skewness", data: riskMetrics?.skewness },
                  { label: "Kurtosis", data: riskMetrics?.kurtosis },
                ].map(({ label, data }) => (
                  <div key={label} className="bg-surface border border-border rounded-lg p-3">
                    <div className="text-[11px] text-muted-foreground uppercase mb-2">{label}</div>
                    <div className="flex gap-4 flex-wrap">
                      {Object.entries(data || {})
                        .filter(([, v]) => v !== null)
                        .map(([period, val]) => (
                          <div key={period} className="text-center min-w-[50px]">
                            <div className="text-[14px] font-semibold font-mono-data text-foreground">
                              {(val as number).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{PERIOD_LABELS[period] || period}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Risk Adjusted Returns */}
              <SectionHeader icon={Shield} title="Risk-Adjusted Returns" />
              <div className="space-y-3 mb-12">
                {[
                  { label: "Sharpe Ratio", data: riskAdj?.sharpe_ratio },
                  { label: "Sortino Ratio", data: riskAdj?.sortino_ratio },
                  { label: "Calmar Ratio", data: riskAdj?.calmar_ratio },
                  { label: "Ulcer Index", data: riskAdj?.ulcer_index },
                  { label: "Pain Index", data: riskAdj?.pain_index },
                ].map(({ label, data }) => (
                  <div key={label} className="bg-surface border border-border rounded-lg p-3">
                    <div className="text-[11px] text-muted-foreground uppercase mb-2">{label}</div>
                    <div className="flex gap-4 flex-wrap">
                      {Object.entries(data || {})
                        .filter(([, v]) => v !== null)
                        .map(([period, val]) => (
                          <div key={period} className="text-center min-w-[50px]">
                            <div className="text-[14px] font-semibold font-mono-data text-foreground">
                              {(val as number).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{PERIOD_LABELS[period] || period}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FundAnalytics;
