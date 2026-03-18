import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import Navbar from "@/components/Navbar";
import TickerTape from "@/components/TickerTape";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSchemeAnalytics } from "@/services/mutualFundService";

const formatPercent = (value?: number | null) =>
  typeof value === "number" ? `${value.toFixed(2)}%` : "—";

const formatNumber = (value?: number | null) =>
  typeof value === "number" ? value.toLocaleString("en-IN") : "—";

const FundAnalytics = () => {
  const { schemeCode } = useParams();
  const code = schemeCode ? Number(schemeCode) : NaN;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["scheme-analytics", code],
    queryFn: () => getSchemeAnalytics(code),
    enabled: Number.isFinite(code),
  });

  const yoyData = useMemo(() => {
    const entries = data?.metrics?.returns?.year_on_year_percent || {};
    return Object.entries(entries)
      .map(([year, value]) => ({ year, value }))
      .sort((a, b) => Number(a.year) - Number(b.year));
  }, [data]);

  const rolling1Y = data?.metrics?.returns?.rolling_cagr_percent?.["1_year"]?.points ?? [];

  const absoluteReturns = useMemo(() => {
    const source = data?.metrics?.returns?.absolute_returns_percent || {};
    const keys = [
      ["one_day", "1D"],
      ["one_week", "1W"],
      ["one_month", "1M"],
      ["three_month", "3M"],
      ["six_month", "6M"],
      ["one_year", "1Y"],
      ["two_year", "2Y"],
      ["three_year", "3Y"],
      ["four_year", "4Y"],
    ] as const;
    return keys
      .filter(([key]) => typeof source[key] === "number")
      .map(([key, label]) => ({ label, value: source[key] as number }));
  }, [data]);

  const sipRows = useMemo(() => {
    const sip = data?.metrics?.returns?.sip_returns || {};
    const picks = [
      ["one_year", "1 Year"],
      ["two_year", "2 Year"],
      ["three_year", "3 Year"],
      ["four_year", "4 Year"],
      ["five_year", "5 Year"],
    ] as const;
    return picks
      .map(([key, label]) => ({ label, value: sip[key] }))
      .filter((row) => row.value);
  }, [data]);

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
    <div className="flex flex-col min-h-screen bg-background">
      <TickerTape />
      <Navbar />
      <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading analytics...</div>
        ) : isError || !data ? (
          <div className="text-sm text-destructive">Failed to load analytics.</div>
        ) : (
          <>
            <Card className="border border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{data.meta.scheme_sub_name}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {data.meta.fund_house} • {data.meta.scheme_sub_category} • {data.meta.plan_type} {data.meta.option_type}
                </div>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Current NAV</div>
                  <div className="text-lg font-semibold">₹{formatNumber(data.meta.current_nav)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">1D Change</div>
                  <div className={`text-lg font-semibold ${data.meta.nav_change_1d && data.meta.nav_change_1d < 0 ? "text-rose-500" : "text-emerald-600"}`}>
                    {formatPercent(data.meta.nav_change_1d)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Scheme Class</div>
                  <div className="text-lg font-semibold">{data.meta.scheme_class}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Inception (Years)</div>
                  <div className="text-lg font-semibold">{formatNumber(data.meta.time_since_inception_years)}</div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Year-on-Year Returns</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yoyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                      <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Rolling CAGR (1Y)</CardTitle>
                </CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rolling1Y}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} hide />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                      <Line type="monotone" dataKey="cagr_percent" stroke="#16a34a" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Absolute Returns</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={absoluteReturns}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                    <Bar dataKey="value" fill="#0f172a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">SIP Returns Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sipRows.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No SIP data available.</div>
                  ) : (
                    sipRows.map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-sm border-b border-border/60 pb-2 last:border-b-0">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-medium">
                          {formatPercent(row.value?.xirr_percent)} XIRR • ₹{formatNumber(row.value?.current_value)}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Risk Overview</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Volatility (1Y)</div>
                    <div className="font-semibold">
                      {formatPercent(data.metrics.risk_metrics?.volatility_annualized_percent?.one_year)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Downside Dev (1Y)</div>
                    <div className="font-semibold">
                      {formatPercent(data.metrics.risk_metrics?.downside_deviation_percent?.one_year)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Sharpe (1Y)</div>
                    <div className="font-semibold">
                      {formatNumber(data.metrics.risk_adjusted_returns?.sharpe_ratio?.one_year)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Sortino (1Y)</div>
                    <div className="font-semibold">
                      {formatNumber(data.metrics.risk_adjusted_returns?.sortino_ratio?.one_year)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default FundAnalytics;
