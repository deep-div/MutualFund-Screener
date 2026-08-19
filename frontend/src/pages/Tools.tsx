import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Seo from "@/components/Seo";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Legend,
} from "recharts";
import {
  BarChart2, TrendingUp, ArrowDownLeft, Zap, Target, Flame, Receipt,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import TickerTape from "@/components/TickerTape";
import Footer from "@/components/Footer";

// ─── Types ────────────────────────────────────────────────────────────────────
type CalcKey = "sip" | "stepsip" | "swp" | "lumpsum" | "goal" | "inflation" | "tax";

interface Tab {
  key: CalcKey;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const TABS: Tab[] = [
  { key: "sip",       label: "SIP",                icon: BarChart2,     color: "text-blue-500",    bg: "bg-blue-50"    },
  { key: "stepsip",   label: "Step-Up SIP",        icon: TrendingUp,    color: "text-indigo-500",  bg: "bg-indigo-50"  },
  { key: "swp",       label: "SWP",                icon: ArrowDownLeft, color: "text-emerald-600", bg: "bg-emerald-50" },
  { key: "lumpsum",   label: "Lump Sum",           icon: Zap,           color: "text-violet-500",  bg: "bg-violet-50"  },
  { key: "goal",      label: "Goal Planner",       icon: Target,        color: "text-amber-500",   bg: "bg-amber-50"   },
  { key: "inflation", label: "Inflation Adjusted", icon: Flame,         color: "text-orange-500",  bg: "bg-orange-50"  },
  { key: "tax",       label: "Tax on MF",          icon: Receipt,       color: "text-rose-500",    bg: "bg-rose-50"    },
];

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const fmtC = (v: number) => `₹${fmt.format(v)}`;
const fmtP = (v: number) => `${v.toFixed(2)}%`;

// ─── Field with slider ────────────────────────────────────────────────────────
function Field({
  label, value, onChange, min = 0, max, step = 1, prefix, suffix,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; prefix?: string; suffix?: string;
}) {
  const [inputVal, setInputVal] = useState(String(value));
  const isFocused = useRef(false);

  // Sync text from parent only when the slider (or external change) updates the value
  useEffect(() => {
    if (!isFocused.current) {
      setInputVal(String(value));
    }
  }, [value]);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/30 transition-all">
        {prefix && <span className="text-[13px] text-muted-foreground shrink-0">{prefix}</span>}
        <input
          type="number"
          value={inputVal}
          min={min}
          max={max}
          step={step}
          onFocus={() => { isFocused.current = true; }}
          onBlur={() => {
            isFocused.current = false;
            const parsed = Number(inputVal);
            if (inputVal === "" || isNaN(parsed)) {
              setInputVal(String(min));
              onChange(min);
            } else {
              let v = parsed;
              if (max !== undefined && v > max) v = max;
              if (v < min) v = min;
              setInputVal(String(v));
              onChange(v);
            }
          }}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") { setInputVal(""); return; }
            let v = Number(raw);
            if (isNaN(v)) return;
            if (max !== undefined && v > max) { v = max; setInputVal(String(v)); }
            else { setInputVal(raw); }
            if (v < min) v = min;
            onChange(v);
          }}
          className="w-full bg-transparent text-[14px] font-semibold text-foreground outline-none min-w-0"
        />
        {suffix && <span className="text-[12px] text-muted-foreground shrink-0">{suffix}</span>}
      </div>
      {max !== undefined && (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1 rounded-full accent-blue-500 cursor-pointer"
        />
      )}
    </div>
  );
}

// ─── Stat strip ───────────────────────────────────────────────────────────────
interface StatCard { label: string; value: string; highlight?: boolean }

function StatStrip({ stats }: { stats: StatCard[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`rounded-xl px-4 py-3.5 ${s.highlight ? "bg-blue-600" : "border border-border bg-muted/40"}`}
        >
          <p className={`text-[11px] font-medium mb-1.5 truncate ${s.highlight ? "text-blue-100" : "text-muted-foreground"}`}>
            {s.label}
          </p>
          <p className={`text-[17px] font-bold leading-none ${s.highlight ? "text-white" : "text-foreground"}`}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Donut ────────────────────────────────────────────────────────────────────
const DEFAULT_DONUT_COLORS: [string, string] = ["#e2e8f0", "#3b82f6"];

function DonutChart({
  invested, gains, labels, colors = DEFAULT_DONUT_COLORS,
}: {
  invested: number; gains: number; labels: [string, string]; colors?: [string, string];
}) {
  const data = [
    { name: labels[0], value: Math.max(0, invested) },
    { name: labels[1], value: Math.max(0, gains) },
  ];
  return (
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie data={data} cx="50%" cy="46%" innerRadius={60} outerRadius={95} dataKey="value" paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={colors[i]} />)}
        </Pie>
        <Tooltip formatter={(v: number) => fmtC(v)} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Bar ──────────────────────────────────────────────────────────────────────
function GrowthBar({
  data, dataKeys, stacked = true,
}: {
  data: object[];
  dataKeys: { key: string; color: string; name: string }[];
  stacked?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        barSize={stacked ? 14 : undefined}
        barCategoryGap={stacked ? undefined : "30%"}
        margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
      >
        <XAxis dataKey="year" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(v) =>
            v >= 1e7 ? `₹${(v / 1e7).toFixed(1)}Cr` :
            v >= 1e5 ? `₹${(v / 1e5).toFixed(0)}L` :
            `₹${(v / 1e3).toFixed(0)}K`
          }
          tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={52}
        />
        <Tooltip formatter={(v: number) => fmtC(v)} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
        {dataKeys.map((d) => (
          <Bar
            key={d.key}
            dataKey={d.key}
            name={d.name}
            fill={d.color}
            radius={[3, 3, 0, 0]}
            {...(stacked ? { stackId: "a" } : {})}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Shared calculator shell ──────────────────────────────────────────────────
function CalcShell({
  inputs, stats, donut, bar, note, donutColors,
}: {
  inputs: React.ReactNode;
  stats: StatCard[];
  donut: { invested: number; gains: number; labels: [string, string] };
  bar: { data: object[]; keys: { key: string; color: string; name: string }[]; stacked?: boolean };
  note?: string;
  donutColors?: [string, string];
}) {
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
      <div className="flex flex-col gap-5 xl:w-[340px] xl:shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{inputs}</div>
        <StatStrip stats={stats} />
        {note && <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{note}</p>}
      </div>
      <div className="flex flex-col gap-4 xl:flex-1 xl:min-w-0">
        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <DonutChart {...donut} colors={donutColors} />
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <GrowthBar data={bar.data} dataKeys={bar.keys} stacked={bar.stacked} />
        </div>
      </div>
    </div>
  );
}

// ─── SIP ──────────────────────────────────────────────────────────────────────
function SIPCalc() {
  const [monthly, setMonthly] = useState(5000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const r = rate / 100 / 12;
  const n = years * 12;
  const fv = r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  const invested = monthly * n;
  const gains = fv - invested;
  const barData = useMemo(() => Array.from({ length: Math.max(1, years) }, (_, i) => {
    const ni = (i + 1) * 12;
    const fvi = r === 0 ? monthly * ni : monthly * ((Math.pow(1 + r, ni) - 1) / r) * (1 + r);
    return { year: `Y${i + 1}`, Invested: monthly * ni, Gains: Math.max(0, fvi - monthly * ni) };
  }), [monthly, r, years]);
  return (
    <CalcShell
      inputs={<>
        <Field label="Monthly Investment" value={monthly} onChange={setMonthly} min={0} max={10000000} step={500} prefix="₹" />
        <Field label="Expected Annual Return" value={rate} onChange={setRate} min={0} max={30} step={0.5} suffix="%" />
        <Field label="Investment Period" value={years} onChange={setYears} min={1} max={40} step={1} suffix="yrs" />
      </>}
      stats={[
        { label: "Monthly SIP", value: fmtC(monthly) },
        { label: "Total Invested", value: fmtC(invested) },
        { label: "Est. Returns", value: fmtC(gains) },
        { label: "Future Value", value: fmtC(fv), highlight: true },
      ]}
      donut={{ invested, gains, labels: ["Invested", "Returns"] }}
      bar={{ data: barData, keys: [{ key: "Invested", color: "#e2e8f0", name: "Invested" }, { key: "Gains", color: "#3b82f6", name: "Returns" }] }}
    />
  );
}

// ─── Step-Up SIP ──────────────────────────────────────────────────────────────
function StepSIPCalc() {
  const [monthly, setMonthly] = useState(5000);
  const [rate, setRate] = useState(12);
  const [stepUp, setStepUp] = useState(10);
  const [years, setYears] = useState(10);
  const r = rate / 100 / 12;
  const s = stepUp / 100;
  const { fv, invested } = useMemo(() => {
    let totalInvested = 0; let corpus = 0; let sip = monthly;
    for (let y = 0; y < years; y++) {
      for (let m = 0; m < 12; m++) { corpus = (corpus + sip) * (1 + r); totalInvested += sip; }
      sip *= (1 + s);
    }
    return { fv: corpus, invested: totalInvested };
  }, [monthly, r, s, years]);
  const gains = fv - invested;
  const barData = useMemo(() => {
    let corpus = 0; let totalInvested = 0; let sip = monthly;
    return Array.from({ length: Math.max(1, years) }, (_, i) => {
      for (let m = 0; m < 12; m++) { corpus = (corpus + sip) * (1 + r); totalInvested += sip; }
      sip *= (1 + s);
      return { year: `Y${i + 1}`, Invested: Math.round(totalInvested), Gains: Math.max(0, Math.round(corpus - totalInvested)) };
    });
  }, [monthly, r, s, years]);
  return (
    <CalcShell
      inputs={<>
        <Field label="Starting Monthly SIP" value={monthly} onChange={setMonthly} min={0} max={10000000} step={500} prefix="₹" />
        <Field label="Expected Annual Return" value={rate} onChange={setRate} min={0} max={30} step={0.5} suffix="%" />
        <Field label="Annual Step-Up" value={stepUp} onChange={setStepUp} min={0} max={50} step={1} suffix="%" />
        <Field label="Investment Period" value={years} onChange={setYears} min={1} max={40} step={1} suffix="yrs" />
      </>}
      stats={[
        { label: "Starting SIP", value: fmtC(monthly) },
        { label: "Total Invested", value: fmtC(invested) },
        { label: "Est. Returns", value: fmtC(gains) },
        { label: "Future Value", value: fmtC(fv), highlight: true },
      ]}
      donut={{ invested, gains, labels: ["Invested", "Returns"] }}
      bar={{ data: barData, keys: [{ key: "Invested", color: "#e2e8f0", name: "Invested" }, { key: "Gains", color: "#6366f1", name: "Returns" }] }}
      donutColors={["#e2e8f0", "#6366f1"]}
    />
  );
}

// ─── SWP ──────────────────────────────────────────────────────────────────────
function SWPCalc() {
  const [corpus, setCorpus] = useState(1000000);
  const [withdrawal, setWithdrawal] = useState(8000);
  const [rate, setRate] = useState(10);
  const [years, setYears] = useState(10);
  const r = rate / 100 / 12;
  const totalWithdrawn = withdrawal * years * 12;
  const { finalCorpus, barData } = useMemo(() => {
    let balance = corpus;
    const bd: { year: string; Balance: number }[] = [];
    for (let y = 0; y < years; y++) {
      for (let m = 0; m < 12; m++) { balance = balance * (1 + r) - withdrawal; if (balance < 0) balance = 0; }
      bd.push({ year: `Y${y + 1}`, Balance: Math.round(Math.max(0, balance)) });
    }
    return { finalCorpus: Math.max(0, balance), barData: bd };
  }, [corpus, withdrawal, r, years]);
  return (
    <CalcShell
      inputs={<>
        <Field label="Initial Corpus" value={corpus} onChange={setCorpus} min={0} max={500000000} step={10000} prefix="₹" />
        <Field label="Monthly Withdrawal" value={withdrawal} onChange={setWithdrawal} min={0} max={10000000} step={500} prefix="₹" />
        <Field label="Expected Annual Return" value={rate} onChange={setRate} min={0} max={30} step={0.5} suffix="%" />
        <Field label="Withdrawal Period" value={years} onChange={setYears} min={1} max={40} step={1} suffix="yrs" />
      </>}
      stats={[
        { label: "Initial Corpus", value: fmtC(corpus) },
        { label: "Total Withdrawn", value: fmtC(totalWithdrawn) },
        { label: "Remaining Corpus", value: fmtC(finalCorpus), highlight: true },
      ]}
      donut={{ invested: totalWithdrawn, gains: finalCorpus, labels: ["Withdrawn", "Remaining"] }}
      donutColors={["#e2e8f0", "#10b981"]}
      bar={{ data: barData, keys: [{ key: "Balance", color: "#10b981", name: "Balance" }] }}
    />
  );
}

// ─── Lump Sum ─────────────────────────────────────────────────────────────────
function LumpSumCalc() {
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const fv = principal * Math.pow(1 + rate / 100, years);
  const gains = fv - principal;
  const barData = useMemo(() => Array.from({ length: Math.max(1, years) }, (_, i) => {
    const fvi = principal * Math.pow(1 + rate / 100, i + 1);
    return { year: `Y${i + 1}`, Invested: principal, Gains: Math.max(0, Math.round(fvi - principal)) };
  }), [principal, rate, years]);
  return (
    <CalcShell
      inputs={<>
        <Field label="Investment Amount" value={principal} onChange={setPrincipal} min={0} max={500000000} step={5000} prefix="₹" />
        <Field label="Expected Annual Return" value={rate} onChange={setRate} min={0} max={30} step={0.5} suffix="%" />
        <Field label="Investment Period" value={years} onChange={setYears} min={1} max={40} step={1} suffix="yrs" />
      </>}
      stats={[
        { label: "Invested", value: fmtC(principal) },
        { label: "Est. Returns", value: fmtC(gains) },
        { label: "CAGR", value: fmtP(rate) },
        { label: "Future Value", value: fmtC(fv), highlight: true },
      ]}
      donut={{ invested: principal, gains, labels: ["Invested", "Returns"] }}
      donutColors={["#e2e8f0", "#8b5cf6"]}
      bar={{ data: barData, keys: [{ key: "Invested", color: "#e2e8f0", name: "Invested" }, { key: "Gains", color: "#8b5cf6", name: "Returns" }] }}
    />
  );
}

// ─── Goal Planner ─────────────────────────────────────────────────────────────
function GoalCalc() {
  const [goal, setGoal] = useState(5000000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(15);
  const r = rate / 100 / 12;
  const n = years * 12;
  const requiredSIP = r === 0 ? goal / n : (goal * r) / ((Math.pow(1 + r, n) - 1) * (1 + r));
  const invested = requiredSIP * n;
  const gains = Math.max(0, goal - invested);
  const barData = useMemo(() => Array.from({ length: Math.max(1, years) }, (_, i) => {
    const ni = (i + 1) * 12;
    const fvi = r === 0 ? requiredSIP * ni : requiredSIP * ((Math.pow(1 + r, ni) - 1) / r) * (1 + r);
    return { year: `Y${i + 1}`, Invested: Math.round(requiredSIP * ni), Gains: Math.max(0, Math.round(fvi - requiredSIP * ni)) };
  }), [requiredSIP, r, years]);
  return (
    <CalcShell
      inputs={<>
        <Field label="Target Amount" value={goal} onChange={setGoal} min={0} max={1000000000} step={50000} prefix="₹" />
        <Field label="Expected Annual Return" value={rate} onChange={setRate} min={0} max={30} step={0.5} suffix="%" />
        <Field label="Time to Achieve Goal" value={years} onChange={setYears} min={1} max={40} step={1} suffix="yrs" />
      </>}
      stats={[
        { label: "Required Monthly SIP", value: fmtC(requiredSIP), highlight: true },
        { label: "Total Invested", value: fmtC(invested) },
        { label: "Total Returns", value: fmtC(gains) },
        { label: "Goal Amount", value: fmtC(goal) },
      ]}
      donut={{ invested, gains, labels: ["Invested", "Returns"] }}
      donutColors={["#e2e8f0", "#f59e0b"]}
      bar={{ data: barData, keys: [{ key: "Invested", color: "#e2e8f0", name: "Invested" }, { key: "Gains", color: "#f59e0b", name: "Returns" }] }}
    />
  );
}

// ─── Inflation Adjusted ───────────────────────────────────────────────────────
function InflationCalc() {
  const [monthly, setMonthly] = useState(5000);
  const [nominalRate, setNominalRate] = useState(12);
  const [inflation, setInflation] = useState(6);
  const [years, setYears] = useState(10);
  const r = nominalRate / 100 / 12;
  const n = years * 12;
  const nominalFV = r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  const invested = monthly * n;
  const realRate = ((1 + nominalRate / 100) / (1 + inflation / 100) - 1) * 100;
  const rReal = realRate / 100 / 12;
  const realFV = rReal === 0 ? monthly * n : monthly * ((Math.pow(1 + rReal, n) - 1) / rReal) * (1 + rReal);
  const inflationErosion = nominalFV - realFV;
  const barData = useMemo(() => Array.from({ length: Math.max(1, years) }, (_, i) => {
    const ni = (i + 1) * 12;
    const nomFVi = r === 0 ? monthly * ni : monthly * ((Math.pow(1 + r, ni) - 1) / r) * (1 + r);
    const realFVi = rReal === 0 ? monthly * ni : monthly * ((Math.pow(1 + rReal, ni) - 1) / rReal) * (1 + rReal);
    return { year: `Y${i + 1}`, "Nominal": Math.round(nomFVi), "Real": Math.round(realFVi) };
  }), [monthly, r, rReal, years]);
  return (
    <CalcShell
      inputs={<>
        <Field label="Monthly Investment" value={monthly} onChange={setMonthly} min={0} max={10000000} step={500} prefix="₹" />
        <Field label="Expected Return (CAGR)" value={nominalRate} onChange={setNominalRate} min={0} max={30} step={0.5} suffix="%" />
        <Field label="Inflation Rate" value={inflation} onChange={setInflation} min={0} max={20} step={0.5} suffix="%" />
        <Field label="Investment Period" value={years} onChange={setYears} min={1} max={40} step={1} suffix="yrs" />
      </>}
      stats={[
        { label: "Total Invested", value: fmtC(invested) },
        { label: "Nominal FV", value: fmtC(nominalFV) },
        { label: "Real FV", value: fmtC(realFV), highlight: true },
        { label: "Inflation Loss", value: fmtC(inflationErosion) },
      ]}
      donut={{ invested: realFV, gains: inflationErosion, labels: ["Real Value", "Inflation Loss"] }}
      donutColors={["#3b82f6", "#f97316"]}
      bar={{ data: barData, keys: [{ key: "Nominal", color: "#3b82f6", name: "Nominal" }, { key: "Real", color: "#f97316", name: "Real" }], stacked: false }}
    />
  );
}

// ─── Tax on MF ────────────────────────────────────────────────────────────────
function TaxCalc() {
  const [invested, setInvested] = useState(100000);
  const [currentValue, setCurrentValue] = useState(150000);
  const [holdingMonths, setHoldingMonths] = useState(18);
  const [fundType, setFundType] = useState<"equity" | "debt">("equity");
  const gains = Math.max(0, currentValue - invested);
  const isLongTerm = fundType === "equity" ? holdingMonths >= 12 : holdingMonths >= 24;
  const taxLabel = isLongTerm ? "LTCG" : "STCG";
  const exemption = fundType === "equity" && isLongTerm ? 125000 : 0;
  const taxableGains = Math.max(0, gains - exemption);
  const taxRate = fundType === "equity" ? (isLongTerm ? 12.5 : 20) : (isLongTerm ? 20 : 30);
  const taxAmount = taxableGains * (taxRate / 100);
  const netReturns = gains - taxAmount;
  const pieData = [
    { name: "Invested", value: invested },
    { name: "Net Returns", value: Math.max(0, netReturns) },
    { name: "Tax", value: taxAmount },
  ];
  const PIE_COLORS = ["#e2e8f0", "#10b981", "#f43f5e"];
  const taxStats: StatCard[] = [
    { label: "Total Gains", value: fmtC(gains) },
    { label: `${taxLabel} @ ${taxRate}%`, value: fmtC(taxAmount) },
    ...(exemption > 0 ? [{ label: "LTCG Exemption", value: fmtC(exemption) }] : []),
    { label: "Net Returns (Post Tax)", value: fmtC(netReturns), highlight: true },
  ];
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
      <div className="flex flex-col gap-5 xl:w-[340px] xl:shrink-0">
        {/* Fund type toggle */}
        <div className="flex gap-2">
          {(["equity", "debt"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFundType(t)}
              className={`flex-1 rounded-lg border py-2 text-[13px] font-semibold transition-colors ${
                fundType === t
                  ? "border-blue-400 bg-blue-50 text-blue-700"
                  : "border-border text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {t === "equity" ? "Equity Fund" : "Debt Fund"}
            </button>
          ))}
        </div>
        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Amount Invested" value={invested} onChange={setInvested} min={0} max={500000000} step={1000} prefix="₹" />
          <Field label="Current Value" value={currentValue} onChange={setCurrentValue} min={0} max={500000000} step={1000} prefix="₹" />
          <Field label="Holding Period" value={holdingMonths} onChange={setHoldingMonths} min={0} max={360} step={1} suffix="months" />
        </div>
        <StatStrip stats={taxStats} />
      </div>
      {/* Right — chart + info */}
      <div className="flex flex-col gap-4 xl:flex-1 xl:min-w-0">
        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="46%" innerRadius={60} outerRadius={95} dataKey="value" paddingAngle={2}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => fmtC(v)} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border border-border bg-muted/20 px-5 py-4">
          <p className="text-[13px] font-semibold text-foreground mb-2">Tax Rules (Budget 2024)</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {fundType === "equity"
              ? "STCG 20% for holding < 12 months. LTCG 12.5% for holding ≥ 12 months with ₹1.25L annual exemption."
              : "STCG taxed as per income slab for holding < 24 months. LTCG 20% for holding ≥ 24 months."}
          </p>
          <p className="mt-3 text-[11px] text-muted-foreground/60">Consult a tax advisor for personalised advice.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Calculator map ───────────────────────────────────────────────────────────
const CALC_MAP: Record<CalcKey, { title: string; desc: string; component: React.ReactNode }> = {
  sip:       { title: "SIP Calculator",             desc: "Estimate the future value of your monthly SIP investments.",         component: <SIPCalc /> },
  stepsip:   { title: "Step-Up SIP Calculator",     desc: "Calculate growth with an annual increase in your SIP amount.",       component: <StepSIPCalc /> },
  swp:       { title: "SWP Calculator",             desc: "Plan systematic withdrawals from your mutual fund corpus.",          component: <SWPCalc /> },
  lumpsum:   { title: "Lump Sum Calculator",        desc: "Find the future value of a one-time mutual fund investment.",        component: <LumpSumCalc /> },
  goal:      { title: "Goal Planner",               desc: "Calculate the monthly SIP required to reach your financial goal.",   component: <GoalCalc /> },
  inflation: { title: "Inflation-Adjusted Returns", desc: "See the real value of your returns after accounting for inflation.", component: <InflationCalc /> },
  tax:       { title: "Tax on MF Returns",          desc: "Estimate your STCG / LTCG tax liability on mutual fund profits.",    component: <TaxCalc /> },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Tools() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paramCalc = searchParams.get("calc") as CalcKey | null;
  const [active, setActive] = useState<CalcKey>(
    paramCalc && CALC_MAP[paramCalc] ? paramCalc : "sip"
  );

  useEffect(() => {
    if (paramCalc && CALC_MAP[paramCalc] && paramCalc !== active) setActive(paramCalc);
  }, [paramCalc]);

  const handleTabClick = (key: CalcKey) => {
    setActive(key);
    navigate(`/tools?calc=${key}`, { replace: true });
  };

  const current = CALC_MAP[active];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Seo
        title="Mutual Fund Calculators — SIP, SWP, Lumpsum & More"
        description="Free mutual fund calculators: SIP, step-up SIP, SWP, lumpsum, goal planning, inflation, and tax — plan your investments with FundScreener."
        path="/tools"
      />
      <div className="sticky top-0 z-[90] bg-[#0f1729]">
        <TickerTape />
        <Navbar />
      </div>

      <main className="flex-1 analytics-shell px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Financial Calculators</h1>
            <p className="mt-1 text-sm text-muted-foreground">Tools to plan your mutual fund investments</p>
          </div>

          <div className="flex gap-5 items-start">
            {/* Left sidebar — desktop only */}
            <div className="hidden md:flex flex-col w-[200px] shrink-0 rounded-xl border border-border bg-muted/40 p-1.5 gap-0.5 sticky top-20">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabClick(tab.key)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-all ${
                    active === tab.key
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/60"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Right column: mobile tabs + calculator card */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Mobile horizontal tabs */}
              <div className="md:hidden w-full mb-4 flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1 scrollbar-hidden">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleTabClick(tab.key)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-[12px] font-semibold whitespace-nowrap transition-all ${
                      active === tab.key
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/60"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Calculator card with fade transition */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                >
                  <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
                    <div className="mb-6">
                      <div>
                        <h2 className="text-[18px] font-bold text-foreground">{current.title}</h2>
                        <p className="text-[13px] text-muted-foreground">{current.desc}</p>
                      </div>
                    </div>
                    {current.component}
                  </div>
                  <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
                    Results are indicative. Actual returns may vary. Not investment advice.
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
