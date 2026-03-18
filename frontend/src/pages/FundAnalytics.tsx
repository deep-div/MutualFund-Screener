import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { TrendingUp, TrendingDown, Activity, BarChart3, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Area,
  ComposedChart,
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

const formatMonthYear = (value: string) => {
  const [y, m] = value.split("-").map(Number);
  if (!y || !m) return value;
  const date = new Date(y, m - 1, 1);
  return date.toLocaleString("en-US", { month: "short", year: "2-digit" });
};

const formatLongDate = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatRollingLabel = (key: string) => {
  const normalized = key.replace(/\s+/g, "_").toLowerCase();
  const match = normalized.match(/(\d+)_?year/);
  if (match?.[1]) return `${match[1]}Y`;
  const yMatch = normalized.match(/(\d+)y/);
  if (yMatch?.[1]) return `${yMatch[1]}Y`;
  return key.replace("_", " ");
};

const NavTooltip = ({
  active,
  payload,
  label,
  baseNav,
  baseDate,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  baseNav: number | null;
  baseDate: string | null;
}) => {
  if (!active || !payload?.length || typeof payload[0]?.value !== "number") return null;
  const nav = payload[0].value;
  const delta = baseNav !== null ? nav - baseNav : null;
  const deltaPct = baseNav ? (delta! / baseNav) * 100 : null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-[12px] shadow-sm">
      <div className="font-semibold text-foreground">
        {delta !== null ? `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(2)}` : nav.toFixed(2)}
        {deltaPct !== null ? ` (${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(2)}%)` : ""}
      </div>
      <div className="text-muted-foreground">
        {baseDate ? `${formatLongDate(baseDate)} - ` : ""}{label ? formatLongDate(label) : ""}
      </div>
    </div>
  );
};

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
      className={`text-[15px] font-semibold ${
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

const ABS_RETURN_ORDER = [
  "one_day",
  "one_week",
  "one_month",
  "three_month",
  "six_month",
  "one_year",
  "two_year",
  "three_year",
  "four_year",
  "five_year",
  "seven_year",
  "ten_year",
  "max",
];

const CAGR_RETURN_ORDER = ["one_year", "two_year", "three_year", "four_year", "five_year", "seven_year", "ten_year", "max"];
const METRIC_PERIOD_ORDER = ["one_year", "two_year", "three_year", "four_year", "five_year", "seven_year", "ten_year", "max"];

const FundAnalytics = () => {
  const { schemeCode } = useParams();
  const code = schemeCode ? Number(schemeCode) : NaN;
  const [returnType, setReturnType] = useState<"absolute" | "cagr" | "rolling">("absolute");
  const [heatmapReturnType, setHeatmapReturnType] = useState<"absolute" | "cagr" | "rolling">("absolute");
  const [returnPeriod, setReturnPeriod] = useState<
    | "one_day"
    | "one_week"
    | "one_month"
    | "three_month"
    | "six_month"
    | "one_year"
    | "two_year"
    | "three_year"
    | "five_year"
    | "seven_year"
    | "ten_year"
    | "max"
  >("one_year");
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [rollingKey, setRollingKey] = useState<string>("");

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
  const yearlyChartWidth = useMemo(() => {
    const minWidth = 520;
    const perBar = 32;
    return Math.max(minWidth, yoyData.length * perBar);
  }, [yoyData.length]);
  const heatmapYears = useMemo(() => Object.keys(heatmap).sort((a, b) => Number(a) - Number(b)), [heatmap]);
  const latestHeatmapYear = heatmapYears[heatmapYears.length - 1] ?? null;

  useEffect(() => {
    if (!selectedYear && latestHeatmapYear) {
      setSelectedYear(latestHeatmapYear);
    }
  }, [selectedYear, latestHeatmapYear]);

  const rollingKeys = Object.keys(metrics?.returns?.rolling_cagr_percent || {});
  const defaultRolling = rollingKeys[0] || "1_year";
  const activeRollingKey = rollingKey || defaultRolling;
  const activeRolling = metrics?.returns?.rolling_cagr_percent?.[activeRollingKey];

  useEffect(() => {
    if (!rollingKey && defaultRolling) {
      setRollingKey(defaultRolling);
    }
  }, [rollingKey, defaultRolling]);

  const getHeatmapColor = (val: number) => {
    if (val >= 10) return "bg-positive/30 text-positive";
    if (val >= 0) return "bg-positive/10 text-positive";
    if (val >= -5) return "bg-negative/10 text-negative";
    return "bg-negative/25 text-negative";
  };

  const buildReturnSeries = (source: Record<string, number | null>, order: string[]) => {
    const entries = order
      .map((key) => {
        const value = source?.[key];
        if (typeof value !== "number") return null;
        return { key, label: PERIOD_LABELS[key] || key, value };
      })
      .filter((item): item is { key: string; label: string; value: number } => !!item);
    const extras = Object.entries(source || {})
      .filter(([key, value]) => typeof value === "number" && !order.includes(key))
      .map(([key, value]) => ({
        key,
        label: PERIOD_LABELS[key] || key,
        value: value as number,
      }));
    return [...entries, ...extras];
  };
  const buildMetricSeries = (source?: Record<string, number | null>) =>
    buildReturnSeries(source || {}, METRIC_PERIOD_ORDER);

  const getReturnScale = (series: { value: number }[]) => {
    if (series.length === 0) return 1;
    const maxAbs = Math.max(...series.map((item) => Math.abs(item.value)));
    return maxAbs === 0 ? 1 : maxAbs;
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
    const points = raw
      .map((point) => {
        const date = toYmd(point.date);
        const nav = Number(point.nav);
        return date && Number.isFinite(nav) ? { date, nav } : null;
      })
      .filter((point): point is { date: string; nav: number } => !!point)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (points.length === 0) return points;
    const base = points[0].nav;
    return points.map((point) => ({
      ...point,
      navUp: point.nav >= base ? point.nav : null,
      navDown: point.nav < base ? point.nav : null,
    }));
  }, [navQuery.data]);


  const selectedCagr = metrics?.returns?.cagr_percent?.[returnPeriod] ?? null;
  const selectedAbs = metrics?.returns?.absolute_returns_percent?.[returnPeriod] ?? null;
  const selectedReturn = returnType === "cagr" ? selectedCagr : selectedAbs;
  const periodLabel = PERIOD_LABELS[returnPeriod] || returnPeriod;

  const periodOptions =
    returnType === "rolling"
      ? ([] as const)
      : returnType === "cagr"
        ? (["one_year", "two_year", "three_year", "five_year", "seven_year", "ten_year", "max"] as const)
        : ([
            "one_month",
            "three_month",
            "six_month",
            "one_year",
            "two_year",
            "three_year",
            "five_year",
            "seven_year",
            "ten_year",
            "max",
          ] as const);

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
    else if (period === "seven_year") start.setFullYear(start.getFullYear() - 7);
    else if (period === "ten_year") start.setFullYear(start.getFullYear() - 10);
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

  const navSparkline = useMemo(() => {
    if (filteredNavSeries.length === 0) return [];
    return filteredNavSeries.slice(-40).map((point) => ({ date: point.date, nav: point.nav }));
  }, [filteredNavSeries]);

  const baseNav = filteredNavSeries.length > 0 ? filteredNavSeries[0].nav : null;
  const baseDate = filteredNavSeries.length > 0 ? filteredNavSeries[0].date : null;

  const absReturnSeries = useMemo(() => buildReturnSeries(absReturns, ABS_RETURN_ORDER), [absReturns]);
  const cagrReturnSeries = useMemo(() => buildReturnSeries(cagrReturns, CAGR_RETURN_ORDER), [cagrReturns]);
  const absScale = useMemo(() => getReturnScale(absReturnSeries), [absReturnSeries]);
  const cagrScale = useMemo(() => getReturnScale(cagrReturnSeries), [cagrReturnSeries]);
  const drawdownMddSeries = useMemo(() => {
    const order = ["one_year", "two_year", "three_year", "four_year", "five_year", "seven_year", "ten_year", "max"];
    const orderIndex = new Map(order.map((key, index) => [key, index]));
    return Object.entries(drawdown?.mdd_duration_details || {})
      .filter(([, value]) => value && typeof value.max_drawdown_percent === "number")
      .map(([period, value]) => ({
        period,
        label: PERIOD_LABELS[period] || period,
        mdd: (value as { max_drawdown_percent: number }).max_drawdown_percent,
        drawdownDays: (value as { drawdown_duration_days: number | null }).drawdown_duration_days,
        recoveryDays: (value as { recovery_duration_days: number | null }).recovery_duration_days,
        peakDate: (value as { peak_date?: string | null }).peak_date ?? null,
        troughDate: (value as { trough_date?: string | null }).trough_date ?? null,
        recoveryDate: (value as { recovery_date?: string | null }).recovery_date ?? null,
      }))
      .sort((a, b) => {
        const aIndex = orderIndex.has(a.period) ? (orderIndex.get(a.period) as number) : 99;
        const bIndex = orderIndex.has(b.period) ? (orderIndex.get(b.period) as number) : 99;
        return aIndex - bIndex;
      });
  }, [drawdown?.mdd_duration_details]);
  const drawdownFrequencySeries = useMemo(() => {
    const parseLevel = (value: string) => Number(value.replace("beyond_", "").replace("_percent", ""));
    return Object.entries(drawdown?.drawdown_frequency || {})
      .map(([level, value]) => ({
        level,
        label: level.replace("beyond_", "> ").replace("_percent", "%"),
        count: (value as { count: number }).count ?? 0,
        years: (value as { years?: string[] }).years ?? [],
        threshold: parseLevel(level),
      }))
      .sort((a, b) => a.threshold - b.threshold);
  }, [drawdown?.drawdown_frequency]);
  const yearlyMddSeries = useMemo(() => {
    return Object.entries(drawdown?.yearly_mdd_last_10_years || {})
      .map(([year, value]) => ({
        year,
        mdd: (value as { max_drawdown_percent: number | null }).max_drawdown_percent ?? null,
        drawdownDays: (value as { drawdown_duration_days: number | null }).drawdown_duration_days ?? null,
        recoveryDays: (value as { recovery_duration_days: number | null }).recovery_duration_days ?? null,
        peakDate: (value as { peak_date?: string | null }).peak_date ?? null,
        troughDate: (value as { trough_date?: string | null }).trough_date ?? null,
        recoveryDate: (value as { recovery_date?: string | null }).recovery_date ?? null,
      }))
      .sort((a, b) => Number(a.year) - Number(b.year));
  }, [drawdown?.yearly_mdd_last_10_years]);

  const monthlyScale = useMemo(() => {
    if (!selectedYear || !heatmap[selectedYear]) return 1;
    const values = Object.values(heatmap[selectedYear] as Record<string, number>)
      .filter((val) => typeof val === "number");
    if (values.length === 0) return 1;
    const maxAbs = Math.max(...values.map((val) => Math.abs(val)));
    return maxAbs === 0 ? 1 : maxAbs;
  }, [heatmap, selectedYear]);

  const getNavTickFormat = () => "month";

  const formatNavTick = (value: string, mode: "month") => {
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m) return value;
    const date = new Date(y, m - 1, d || 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };

  const navTickMode = getNavTickFormat();

  const navTicks = useMemo(() => {
    if (filteredNavSeries.length === 0) return [];
    const targetTicks = 5;
    if (filteredNavSeries.length <= targetTicks) {
      return filteredNavSeries.map((p) => p.date);
    }
    const step = (filteredNavSeries.length - 1) / (targetTicks - 1);
    const indices = Array.from({ length: targetTicks }, (_, i) => Math.round(i * step));
    return indices.map((i) => filteredNavSeries[Math.min(i, filteredNavSeries.length - 1)].date);
  }, [filteredNavSeries, navTickMode]);

  const rollingTicks = useMemo(() => {
    const points = activeRolling?.points || [];
    if (points.length === 0) return [];
    const targetTicks = 6;
    if (points.length <= targetTicks) {
      return points.map((p) => p.date);
    }
    const step = (points.length - 1) / (targetTicks - 1);
    const indices = Array.from({ length: targetTicks }, (_, i) => Math.round(i * step));
    return indices.map((i) => points[Math.min(i, points.length - 1)].date);
  }, [activeRolling?.points]);

  const navDateYmd = toYmd(meta?.current_date);
  const navDateLabel = navDateYmd ? formatLongDate(navDateYmd) : meta?.current_date ?? "-";
  const inceptionYears =
    typeof meta?.time_since_inception_years === "number"
      ? `${meta.time_since_inception_years.toFixed(1)}Y`
      : meta?.time_since_inception_years
        ? `${meta.time_since_inception_years}Y`
        : "-";

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
      <div className="flex-1 overflow-auto scrollbar-thin page-dimmable">
        <div className="max-w-[1400px] w-full mx-auto px-6 py-6">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading analytics...</div>
          ) : isError || !detail ? (
            <div className="text-sm text-destructive">Failed to load analytics.</div>
          ) : (
            <>
              {/* Header */}
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <h1 className="text-[20px] font-bold text-foreground tracking-tight">{meta?.scheme_sub_name}</h1>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      <span className="text-[12px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        {meta?.scheme_sub_category}
                      </span>
                      <span className="text-[12px] text-muted-foreground">{meta?.fund_house}</span>
                      <span className="text-[12px] text-muted-foreground">
                        {meta?.plan_type} - {meta?.option_type}
                      </span>
                      <span className="text-[12px] text-muted-foreground">Since inception {inceptionYears}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-surface border border-border/60 rounded-xl p-3 shadow-sm">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Latest NAV</div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="text-[20px] font-semibold text-foreground">
                          INR {typeof meta?.current_nav === "number" ? meta.current_nav.toFixed(4) : "-"}
                        </div>
                        <div className="h-10 w-20">
                          {navSparkline.length > 1 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={navSparkline}>
                                <Line type="monotone" dataKey="nav" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="text-[10px] text-muted-foreground">No trend</div>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">NAV date {navDateLabel}</div>
                    </div>

                    <div className="bg-surface border border-border/60 rounded-xl p-3 shadow-sm">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">1D Change</div>
                      <div
                        className={`text-[18px] font-semibold mt-1 ${
                          typeof meta?.nav_change_1d === "number" && meta?.nav_change_1d >= 0 ? "text-positive" : "text-negative"
                        }`}
                      >
                        {typeof meta?.nav_change_1d === "number" && typeof meta?.current_nav === "number"
                          ? `${meta.nav_change_1d >= 0 ? "+" : ""}${meta.nav_change_1d.toFixed(4)}%`
                          : "-"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">Change vs previous close</div>
                    </div>

                    <div className="bg-surface border border-border/60 rounded-xl p-3 shadow-sm">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Current Drawdown</div>
                      <div className="text-[18px] font-semibold mt-1 text-negative">
                        {typeof drawdown?.current_drawdown?.max_drawdown_percent === "number"
                          ? `${drawdown.current_drawdown.max_drawdown_percent.toFixed(2)}%`
                          : "-"}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-muted-foreground">
                        <div>
                          <div className="uppercase tracking-wider text-[9px]">Drawdown Days</div>
                          <div className="text-foreground text-[12px] font-semibold">
                            {typeof drawdown?.current_drawdown?.drawdown_duration_days === "number"
                              ? `${drawdown.current_drawdown.drawdown_duration_days}d`
                              : "-"}
                          </div>
                        </div>
                        <div>
                          <div className="uppercase tracking-wider text-[9px]">Recovery Days</div>
                          <div className="text-foreground text-[12px] font-semibold">
                            {typeof drawdown?.current_drawdown?.recovery_duration_days === "number"
                              ? `${drawdown.current_drawdown.recovery_duration_days}d`
                              : "-"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface border border-border/60 rounded-xl p-3 shadow-sm">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Max Drawdown</div>
                      <div className="text-[18px] font-semibold mt-1 text-negative">
                        {typeof drawdown?.mdd_duration_details?.max?.max_drawdown_percent === "number"
                          ? `${drawdown.mdd_duration_details.max.max_drawdown_percent.toFixed(2)}%`
                          : "-"}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-muted-foreground">
                        <div>
                          <div className="uppercase tracking-wider text-[9px]">Drawdown Days</div>
                          <div className="text-foreground text-[12px] font-semibold">
                            {typeof drawdown?.mdd_duration_details?.max?.drawdown_duration_days === "number"
                              ? `${drawdown.mdd_duration_details.max.drawdown_duration_days}d`
                              : "-"}
                          </div>
                        </div>
                        <div>
                          <div className="uppercase tracking-wider text-[9px]">Recovery Days</div>
                          <div className="text-foreground text-[12px] font-semibold">
                            {typeof drawdown?.mdd_duration_details?.max?.recovery_duration_days === "number"
                              ? `${drawdown.mdd_duration_details.max.recovery_duration_days}d`
                              : "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

{/* Return Metrics */}
              <SectionHeader icon={TrendingUp} title="Return Metrics" />
              <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.7fr] gap-6 items-stretch">
                <div className="flex flex-col h-full">
                  <div className="bg-surface border border-border/60 rounded-xl p-4 shadow-sm flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[13px] font-semibold text-foreground">Return Summary</div>
                      <div className="text-[11px] text-muted-foreground">Return %</div>
                    </div>
                    <div className="text-[11px] text-muted-foreground mb-3">
                      {heatmapReturnType === "rolling"
                        ? "Rolling CAGR Summary"
                        : heatmapReturnType === "cagr"
                          ? "CAGR Returns"
                          : "Absolute Returns"}
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      {(["absolute", "cagr", "rolling"] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setHeatmapReturnType(type)}
                          className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                            heatmapReturnType === type
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:text-foreground"
                          }`}
                          type="button"
                        >
                          {type === "absolute" ? "Absolute" : type === "cagr" ? "CAGR" : "Rolling"}
                        </button>
                      ))}
                    </div>
                    {heatmapReturnType === "rolling" ? (
                      !activeRolling?.summary ? (
                        <div className="text-sm text-muted-foreground">No rolling data available.</div>
                      ) : (
                        <div>
                          {rollingKeys.length > 1 && (
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              {rollingKeys.map((key) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setRollingKey(key)}
                                  className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                                    activeRollingKey === key
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                                  }`}
                                >
                                  {formatRollingLabel(key)}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 gap-3">
                            {[
                              { label: "Avg", value: activeRolling.summary?.average },
                              { label: "Median", value: activeRolling.summary?.median },
                              { label: "Max", value: activeRolling.summary?.maximum },
                              { label: "Min", value: activeRolling.summary?.minimum },
                              { label: "Positive %", value: activeRolling.summary?.positive_percent },
                            ].map((entry) => {
                              const isNumber = typeof entry.value === "number";
                              const intensity = isNumber
                                ? Math.min(0.22, Math.max(0.08, Math.abs(entry.value as number) / 100))
                                : 0.08;
                              const bg = isNumber
                                ? (entry.value as number) >= 0
                                  ? `hsl(var(--positive) / ${intensity})`
                                  : `hsl(var(--negative) / ${intensity})`
                                : "hsl(var(--muted) / 0.08)";
                              return (
                                <div
                                  key={entry.label}
                                  className="group relative rounded-xl border border-border/40 shadow-sm hover:shadow-md transition-all bg-card"
                                >
                                  <div className="rounded-xl px-3 py-3 min-h-[74px] flex flex-col justify-between" style={{ backgroundColor: bg }}>
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{entry.label}</div>
                                    <div
                                      className={`text-[16px] font-semibold ${
                                        isNumber && (entry.value as number) >= 0 ? "text-positive" : "text-negative"
                                      }`}
                                    >
                                      {isNumber ? `${(entry.value as number).toFixed(2)}%` : "-"}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    ) : heatmapReturnType === "cagr" ? (
                      cagrReturnSeries.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No CAGR return data available.</div>
                      ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 gap-3">
                          {cagrReturnSeries.map((entry) => {
                            const intensity = Math.min(0.22, Math.max(0.08, Math.abs(entry.value) / cagrScale));
                            const bg =
                              entry.value >= 0
                                ? `hsl(var(--positive) / ${intensity})`
                                : `hsl(var(--negative) / ${intensity})`;
                            return (
                              <div
                                key={entry.key}
                                className="group relative rounded-xl border border-border/40 shadow-sm hover:shadow-md transition-all bg-card"
                              >
                                <div
                                  className="rounded-xl px-3 py-3 min-h-[74px] flex flex-col justify-between"
                                  style={{ backgroundColor: bg }}
                                >
                                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{entry.label}</div>
                                  <div
                                    className={`text-[16px] font-semibold ${
                                      entry.value >= 0 ? "text-positive" : "text-negative"
                                    }`}
                                  >
                                    {entry.value >= 0 ? "+" : ""}
                                    {entry.value.toFixed(2)}%
                                  </div>
                                </div>
                                <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                                  {entry.label} ? {entry.value >= 0 ? "+" : ""}
                                  {entry.value.toFixed(2)}%
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    ) : absReturnSeries.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No absolute return data available.</div>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 gap-3">
                        {absReturnSeries.filter((entry) => entry.key !== "one_day").map((entry) => {
                          const intensity = Math.min(0.22, Math.max(0.08, Math.abs(entry.value) / absScale));
                          const bg =
                            entry.value >= 0
                              ? `hsl(var(--positive) / ${intensity})`
                              : `hsl(var(--negative) / ${intensity})`;
                          return (
                            <div
                              key={entry.key}
                              className="group relative rounded-xl border border-border/40 shadow-sm hover:shadow-md transition-all bg-card"
                            >
                              <div
                                className="rounded-xl px-3 py-3 min-h-[74px] flex flex-col justify-between"
                                style={{ backgroundColor: bg }}
                              >
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{entry.label}</div>
                                <div
                                  className={`text-[16px] font-semibold ${
                                    entry.value >= 0 ? "text-positive" : "text-negative"
                                  }`}
                                >
                                  {entry.value >= 0 ? "+" : ""}
                                  {entry.value.toFixed(2)}%
                                </div>
                              </div>
                              <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                                {entry.label} ? {entry.value >= 0 ? "+" : ""}
                                {entry.value.toFixed(2)}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col h-full">
                  <div className="bg-surface border border-border rounded-lg p-4 flex-1">
                    <div className="text-[13px] font-semibold text-foreground mb-3">NAV Performance</div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        {(["absolute", "cagr", "rolling"] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => {
                              setReturnType(type);
                              if (type === "cagr") setReturnPeriod("one_year");
                              if (type === "absolute") setReturnPeriod("one_month");
                            }}
                            className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                              returnType === type
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border hover:text-foreground"
                            }`}
                            type="button"
                          >
                            {type === "absolute" ? "Absolute" : type === "cagr" ? "CAGR" : "Rolling"}
                          </button>
                        ))}
                      </div>
                      {returnType !== "rolling" ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {periodOptions.map((key) => (
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
                      ) : rollingKeys.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {rollingKeys.map((key) => (
                            <button
                              key={key}
                              onClick={() => setRollingKey(key)}
                              className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                                activeRollingKey === key
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-muted-foreground border-border hover:text-foreground"
                              }`}
                              type="button"
                            >
                              {formatRollingLabel(key)}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {returnType !== "rolling" && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <MetricCard
                          label={`${returnType === "cagr" ? "CAGR" : "Absolute"} ${periodLabel}`}
                          value={typeof selectedReturn === "number" ? selectedReturn : null}
                        />
                      </div>
                    )}
                    <div className="h-60">
                      {returnType === "rolling" ? (
                        !activeRolling?.points?.length ? (
                          <div className="text-sm text-muted-foreground">No rolling data available.</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={activeRolling.points}>
                              <defs>
                                <linearGradient id="rollingFill" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                                </linearGradient>
                              </defs>
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                tickFormatter={(d: string) => formatNavTick(d, navTickMode)}
                                ticks={rollingTicks}
                                interval={0}
                                minTickGap={16}
                                padding={{ left: 12, right: 12 }}
                              />
                              <YAxis hide domain={["dataMin", "dataMax"]} />
                              <Tooltip
                                contentStyle={{
                                  background: "hsl(var(--popover))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: 8,
                                  fontSize: 12,
                                }}
                                formatter={(value: number) => [`${value.toFixed(2)}%`, "CAGR"]}
                              />
                              <Area type="monotone" dataKey="cagr_percent" stroke="none" fill="url(#rollingFill)" />
                              <Line type="monotone" dataKey="cagr_percent" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        )
                      ) : navQuery.isLoading ? (
                        <div className="text-sm text-muted-foreground">Loading NAV history...</div>
                      ) : navQuery.isError || filteredNavSeries.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No NAV history available.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={filteredNavSeries}>
                            <defs>
                              <linearGradient id="navUpFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--positive))" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="hsl(var(--positive))" stopOpacity={0.02} />
                              </linearGradient>
                              <linearGradient id="navDownFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--negative))" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="hsl(var(--negative))" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                              tickFormatter={(d: string) => formatNavTick(d, navTickMode)}
                              ticks={navTicks}
                              interval={0}
                              minTickGap={16}
                              padding={{ left: 12, right: 12 }}
                            />
                            <YAxis hide domain={["dataMin", "dataMax"]} />
                            <Tooltip
                              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                              contentStyle={{
                                background: "hsl(var(--popover))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: 8,
                                fontSize: 12,
                              }}
                              formatter={(value: number) => [`${value.toFixed(2)}`, "NAV"]}
                            />
                            <Area type="monotone" dataKey="navUp" stroke="none" fill="url(#navUpFill)" />
                            <Area type="monotone" dataKey="navDown" stroke="none" fill="url(#navDownFill)" />
                            <Line type="monotone" dataKey="nav" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Explorer */}
              <SectionHeader icon={Activity} title="Performance Explorer" />
              <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.7fr] gap-6 items-stretch">
                <div className="bg-surface border border-border/60 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[13px] font-semibold text-foreground">Monthly Breakdown</div>
                    <select
                      value={selectedYear ?? ""}
                      onChange={(event) => setSelectedYear(event.target.value || null)}
                      className="h-8 rounded-md border border-border bg-background px-2 text-[11px] text-foreground"
                    >
                      {!selectedYear && <option value="">Select year</option>}
                      {heatmapYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedYear && heatmap[selectedYear] ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {MONTHS.map((month, index) => {
                        const key = String(index + 1).padStart(2, "0");
                        const val = (heatmap[selectedYear] as Record<string, number>)[key];
                        const intensity = val !== undefined ? Math.min(0.22, Math.max(0.08, Math.abs(val) / monthlyScale)) : 0;
                        const bg =
                          val !== undefined
                            ? val >= 0
                              ? `hsl(var(--positive) / ${intensity})`
                              : `hsl(var(--negative) / ${intensity})`
                            : undefined;
                        return (
                          <div
                            key={month}
                            className="group relative rounded-xl border border-border/40 shadow-sm hover:shadow-md transition-all bg-card"
                          >
                            <div
                              className="rounded-xl px-3 py-3 min-h-[72px] flex flex-col justify-between"
                              style={{ backgroundColor: bg }}
                            >
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{month}</div>
                              <div
                                className={`text-[14px] font-semibold ${val !== undefined && val >= 0 ? "text-positive" : "text-negative"}`}
                              >
                                {val !== undefined ? `${val >= 0 ? "+" : ""}${val.toFixed(2)}%` : "-"}
                              </div>
                            </div>
                            {val !== undefined && (
                              <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] text-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                                {month} {selectedYear} · {val >= 0 ? "+" : ""}
                                {val.toFixed(2)}%
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No monthly data available.</div>
                  )}
                </div>

                <div className="bg-surface border border-border/60 rounded-2xl p-4 shadow-sm">
                  <div className="mb-3">
                    <div className="text-[13px] font-semibold text-foreground">Yearly Performance</div>
                    <div className="text-[11px] text-muted-foreground mt-1">Returns by calendar year.</div>
                  </div>
                  <div className="h-72 overflow-x-auto">
                    <div style={{ width: yearlyChartWidth, minWidth: "100%", height: "100%" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={yoyData} margin={{ left: 4, right: 8, bottom: 4 }}>
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
                            {yoyData.map((entry) => {
                              const fill = entry.return >= 0 ? "hsl(var(--positive))" : "hsl(var(--negative))";
                              return <Cell key={entry.year} fill={fill} opacity={0.9} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawdown */}
              <SectionHeader icon={TrendingDown} title="Drawdown Analysis" />
              <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.7fr] gap-6 items-stretch mb-4">
                <div className="bg-surface border border-border/60 rounded-2xl p-4 shadow-sm min-h-[420px]">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="text-[13px] font-semibold text-foreground">Year on Year Drawdown Analysis</div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Worst peak-to-trough drawdown for each year.
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Last 10Y</div>
                  </div>
                  <div className="h-72">
                    {yearlyMddSeries.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={yearlyMddSeries} margin={{ left: 6, right: 12, bottom: 4 }}>
                          <XAxis dataKey="year" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            tickFormatter={(v) => `${v}%`}
                            domain={[(dataMin: number) => Math.min(dataMin, -1), 0]}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                            tickFormatter={(v) => `${v}d`}
                            domain={[0, (dataMax: number) => Math.max(30, dataMax)]}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--popover))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                            labelFormatter={(label) => `Year ${label}`}
                            formatter={(value: number | null, name: string) => {
                              if (value === null || typeof value !== "number") return ["-", name];
                              if (name === "mdd") return [`${value.toFixed(2)}%`, "Max DD"];
                              if (name === "drawdownDays") return [`${value}d`, "Drawdown Duration"];
                              if (name === "recoveryDays") return [`${value}d`, "Recovery Duration"];
                              return [value, name];
                            }}
                          />
                          <Bar yAxisId="left" dataKey="mdd" radius={[6, 6, 0, 0]}>
                            {yearlyMddSeries.map((entry) => (
                              <Cell key={entry.year} fill="hsl(var(--negative))" opacity={0.85} />
                            ))}
                          </Bar>
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="drawdownDays"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ r: 2 }}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="recoveryDays"
                            stroke="hsl(var(--positive))"
                            strokeWidth={2}
                            strokeDasharray="4 3"
                            dot={false}
                            connectNulls={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-sm text-muted-foreground">No yearly drawdown history available.</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground mt-3">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-negative" />
                      Max Drawdown %
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-[2px] w-5 rounded-full bg-primary" />
                      Drawdown Duration
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-[2px] w-5 rounded-full bg-positive" />
                      Recovery Duration
                    </div>
                  </div>
                </div>
                <div className="bg-surface border border-border/60 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="text-[13px] font-semibold text-foreground">Drawdown Overview</div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Depth, duration, and frequency of drawdowns across periods.
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Percentages</div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div className="rounded-xl border border-border/60 bg-card px-3 py-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Current Drawdown</div>
                      <div className="text-[16px] font-semibold text-negative">
                        {typeof drawdown?.current_drawdown?.max_drawdown_percent === "number"
                          ? `${drawdown.current_drawdown.max_drawdown_percent.toFixed(2)}%`
                          : "-"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {typeof drawdown?.current_drawdown?.drawdown_duration_days === "number"
                          ? `${drawdown.current_drawdown.drawdown_duration_days}d`
                          : "-"}{" "}
                        in drawdown
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card px-3 py-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Max Drawdown</div>
                      <div className="text-[16px] font-semibold text-negative">
                        {typeof drawdown?.mdd_duration_details?.max?.max_drawdown_percent === "number"
                          ? `${drawdown.mdd_duration_details.max.max_drawdown_percent.toFixed(2)}%`
                          : "-"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {drawdown?.mdd_duration_details?.max?.peak_date
                          ? `Peak ${formatLongDate(drawdown.mdd_duration_details.max.peak_date)}`
                          : "Peak -"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card px-3 py-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Trough</div>
                      <div className="text-[16px] font-semibold text-foreground">
                        {typeof drawdown?.mdd_duration_details?.max?.trough_nav === "number"
                          ? drawdown.mdd_duration_details.max.trough_nav.toFixed(2)
                          : "-"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {drawdown?.mdd_duration_details?.max?.trough_date
                          ? formatLongDate(drawdown.mdd_duration_details.max.trough_date)
                          : "-"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card px-3 py-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Recovery</div>
                      <div className="text-[16px] font-semibold text-foreground">
                        {typeof drawdown?.mdd_duration_details?.max?.recovery_nav === "number"
                          ? drawdown.mdd_duration_details.max.recovery_nav.toFixed(2)
                          : "-"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {typeof drawdown?.mdd_duration_details?.max?.recovery_duration_days === "number"
                          ? `${drawdown.mdd_duration_details.max.recovery_duration_days}d recovery`
                          : "Recovery -"}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                      <div className="text-[12px] font-medium text-foreground mb-2">Max Drawdown by Period</div>
                      <div className="h-56">
                        {drawdownMddSeries.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={drawdownMddSeries} margin={{ left: 6, right: 10, bottom: 2 }}>
                              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                              <YAxis
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                tickFormatter={(v) => `${v}%`}
                                domain={[(dataMin: number) => Math.min(dataMin, -1), 0]}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: "hsl(var(--popover))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: 8,
                                  fontSize: 12,
                                }}
                                formatter={(value: number) => [`${value.toFixed(2)}%`, "Max DD"]}
                              />
                              <Bar dataKey="mdd" radius={[6, 6, 0, 0]}>
                                {drawdownMddSeries.map((entry) => (
                                  <Cell key={entry.period} fill="hsl(var(--negative))" opacity={0.9} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-sm text-muted-foreground">No drawdown history available.</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                      <div className="text-[12px] font-medium text-foreground mb-2">Drawdown Frequency</div>
                      <div className="h-56">
                        {drawdownFrequencySeries.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={drawdownFrequencySeries} layout="vertical" margin={{ left: 12, right: 10 }}>
                              <XAxis
                                type="number"
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                allowDecimals={false}
                              />
                              <YAxis
                                type="category"
                                dataKey="label"
                                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: "hsl(var(--popover))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: 8,
                                  fontSize: 12,
                                }}
                                formatter={(value: number) => [`${value}`, "Count"]}
                              />
                              <Bar dataKey="count" radius={[4, 4, 4, 4]}>
                                {drawdownFrequencySeries.map((entry) => (
                                  <Cell key={entry.level} fill="hsl(var(--negative))" opacity={0.65} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-sm text-muted-foreground">No frequency data available.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Consistency */}

              <SectionHeader icon={Zap} title="Consistency" />
              <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 mb-6">
                <div className="bg-surface border border-border/60 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="text-[13px] font-semibold text-foreground">Win Rate Snapshot</div>
                      <div className="text-[11px] text-muted-foreground mt-1">Percent of positive periods.</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Consistency</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Positive Days", value: consistency?.positive_days_percent },
                      { label: "Positive Months", value: consistency?.positive_months_percent },
                      { label: "Positive Years", value: consistency?.positive_years_percent },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-border/60 bg-card px-3 py-3">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</div>
                        <div className="text-[16px] font-semibold text-foreground">
                          {typeof item.value === "number" ? `${item.value.toFixed(2)}%` : "-"}
                        </div>
                        <div className="h-2 rounded-full bg-border/70 overflow-hidden mt-2">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${Math.min(100, Math.max(0, item.value ?? 0))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="rounded-xl border border-border/60 bg-card px-3 py-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Max +ve Streak</div>
                      <div className="text-[15px] font-semibold text-positive">
                        {typeof consistency?.max_consecutive_positive_months === "number"
                          ? `${consistency.max_consecutive_positive_months} mo`
                          : "-"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">Longest positive run</div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card px-3 py-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Max -ve Streak</div>
                      <div className="text-[15px] font-semibold text-negative">
                        {typeof consistency?.max_consecutive_negative_months === "number"
                          ? `${consistency.max_consecutive_negative_months} mo`
                          : "-"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">Longest negative run</div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card px-3 py-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Best Month</div>
                      <div className="text-[15px] font-semibold text-positive">
                        {typeof consistency?.best_month?.return === "number" ? `${consistency.best_month.return.toFixed(2)}%` : "-"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {consistency?.best_month?.month ? formatMonthYear(consistency.best_month.month) : "-"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card px-3 py-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Worst Month</div>
                      <div className="text-[15px] font-semibold text-negative">
                        {typeof consistency?.worst_month?.return === "number" ? `${consistency.worst_month.return.toFixed(2)}%` : "-"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {consistency?.worst_month?.month ? formatMonthYear(consistency.worst_month.month) : "-"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border/60 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="text-[13px] font-semibold text-foreground">Best vs Worst Returns</div>
                      <div className="text-[11px] text-muted-foreground mt-1">Extremes across day, month, and year.</div>
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Extremes</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        label: "Best Day",
                        value: consistency?.best_day?.return,
                        date: consistency?.best_day?.date ? formatLongDate(consistency.best_day.date) : null,
                      },
                      {
                        label: "Worst Day",
                        value: consistency?.worst_day?.return,
                        date: consistency?.worst_day?.date ? formatLongDate(consistency.worst_day.date) : null,
                      },
                      {
                        label: "Best Month",
                        value: consistency?.best_month?.return,
                        date: consistency?.best_month?.month ? formatMonthYear(consistency.best_month.month) : null,
                      },
                      {
                        label: "Worst Month",
                        value: consistency?.worst_month?.return,
                        date: consistency?.worst_month?.month ? formatMonthYear(consistency.worst_month.month) : null,
                      },
                      {
                        label: "Best Year",
                        value: consistency?.best_year?.return,
                        date: consistency?.best_year?.year ? String(consistency.best_year.year) : null,
                      },
                      {
                        label: "Worst Year",
                        value: consistency?.worst_year?.return,
                        date: consistency?.worst_year?.year ? String(consistency.worst_year.year) : null,
                      },
                    ].map((item) => {
                      const isPositive = typeof item.value === "number" ? item.value >= 0 : null;
                      return (
                        <div key={item.label} className="rounded-xl border border-border/60 bg-card px-3 py-3">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</div>
                          <div
                            className={`text-[16px] font-semibold ${
                              isPositive === null ? "text-foreground" : isPositive ? "text-positive" : "text-negative"
                            }`}
                          >
                            {typeof item.value === "number" ? `${item.value >= 0 ? "+" : ""}${item.value.toFixed(2)}%` : "-"}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1">{item.date || "-"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-12">
                <div>
                  <SectionHeader icon={Shield} title="Risk Metrics" />
                  <div className="bg-surface border border-border/60 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="text-[13px] font-semibold text-foreground">Risk Metrics by Period</div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          Single chart to compare all metrics across periods.
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Lines</div>
                    </div>
                    {(() => {
                      const metricRows = [
                        {
                          key: "volatility",
                          label: "Volatility (Ann.)",
                          data: riskMetrics?.volatility_annualized_percent,
                          color: "hsl(var(--primary))",
                        },
                        {
                          key: "downside",
                          label: "Downside Deviation",
                          data: riskMetrics?.downside_deviation_percent,
                          color: "hsl(var(--accent))",
                        },
                        {
                          key: "skewness",
                          label: "Skewness",
                          data: riskMetrics?.skewness,
                          color: "hsl(var(--positive))",
                        },
                        {
                          key: "kurtosis",
                          label: "Kurtosis",
                          data: riskMetrics?.kurtosis,
                          color: "hsl(var(--negative))",
                        },
                      ];
                      const periods = METRIC_PERIOD_ORDER.map((key) => ({
                        key,
                        label: PERIOD_LABELS[key] || key,
                      }));
                      const seriesByMetric = metricRows.map((row) => ({
                        ...row,
                        series: buildMetricSeries(row.data as Record<string, number | null>),
                      }));
                      const hasAny = seriesByMetric.some((row) => row.series.length > 0);
                      const chartData = periods.map((period) => {
                        const entry: Record<string, string | number> = { period: period.label };
                        seriesByMetric.forEach((row) => {
                          const match = row.series.find((item) => item.key === period.key);
                          entry[row.key] = typeof match?.value === "number" ? match.value : null;
                        });
                        return entry;
                      });
                      return hasAny ? (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ left: 6, right: 12, bottom: 4 }}>
                              <XAxis dataKey="period" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                              <Tooltip
                                contentStyle={{
                                  background: "hsl(var(--popover))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: 8,
                                  fontSize: 12,
                                }}
                              />
                              {seriesByMetric.map((row) => (
                                <Line
                                  key={row.key}
                                  type="monotone"
                                  dataKey={row.key}
                                  name={row.label}
                                  stroke={row.color}
                                  strokeWidth={2}
                                  dot={{ r: 3, strokeWidth: 1, fill: "hsl(var(--background))" }}
                                  connectNulls
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No data available.</div>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <SectionHeader icon={Shield} title="Risk-Adjusted Returns" />
                  <div className="bg-surface border border-border/60 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="text-[13px] font-semibold text-foreground">Risk-Adjusted by Period</div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          All ratios on one chart to compare stability over time.
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Lines</div>
                    </div>
                    {(() => {
                      const metricRows = [
                        { key: "sharpe", label: "Sharpe Ratio", data: riskAdj?.sharpe_ratio, color: "hsl(var(--primary))" },
                        { key: "sortino", label: "Sortino Ratio", data: riskAdj?.sortino_ratio, color: "hsl(var(--accent))" },
                        { key: "calmar", label: "Calmar Ratio", data: riskAdj?.calmar_ratio, color: "hsl(var(--positive))" },
                        { key: "ulcer", label: "Ulcer Index", data: riskAdj?.ulcer_index, color: "hsl(var(--negative))" },
                        { key: "pain", label: "Pain Index", data: riskAdj?.pain_index, color: "hsl(var(--muted-foreground))" },
                      ];
                      const periods = METRIC_PERIOD_ORDER.map((key) => ({
                        key,
                        label: PERIOD_LABELS[key] || key,
                      }));
                      const seriesByMetric = metricRows.map((row) => ({
                        ...row,
                        series: buildMetricSeries(row.data as Record<string, number | null>),
                      }));
                      const hasAny = seriesByMetric.some((row) => row.series.length > 0);
                      const chartData = periods.map((period) => {
                        const entry: Record<string, string | number> = { period: period.label };
                        seriesByMetric.forEach((row) => {
                          const match = row.series.find((item) => item.key === period.key);
                          entry[row.key] = typeof match?.value === "number" ? match.value : null;
                        });
                        return entry;
                      });
                      return hasAny ? (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ left: 6, right: 12, bottom: 4 }}>
                              <XAxis dataKey="period" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                              <Tooltip
                                contentStyle={{
                                  background: "hsl(var(--popover))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: 8,
                                  fontSize: 12,
                                }}
                              />
                              {seriesByMetric.map((row) => (
                                <Line
                                  key={row.key}
                                  type="monotone"
                                  dataKey={row.key}
                                  name={row.label}
                                  stroke={row.color}
                                  strokeWidth={2}
                                  dot={{ r: 3, strokeWidth: 1, fill: "hsl(var(--background))" }}
                                  connectNulls
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No data available.</div>
                      );
                    })()}
                  </div>
                </div>
              </div>
</>
          )}
        </div>
      </div>
    </div>
  );
};

export default FundAnalytics;
