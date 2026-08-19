import { motion } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  BarChart2,
  BookmarkPlus,
  DollarSign,
  Percent,
  TrendingUp,
  Activity,
  Zap,
  Scale,
  Shield,
  ArrowDownUp,
  BookOpen,
  ExternalLink,
  Play,
  ChevronRight,
  Layers,
  PiggyBank,
  BarChart,
  Clock,
  Landmark,
  GraduationCap,
  Lightbulb,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import TickerTape from "@/components/TickerTape";
import Footer from "@/components/Footer";

// ── Animation variants ──────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] as const, delay: i * 0.06 },
  }),
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

// ── Data ────────────────────────────────────────────────────────

const STEPS = [
  {
    n: "01",
    icon: SlidersHorizontal,
    color: "text-blue-500",
    bg: "bg-blue-50",
    title: "Filter & Discover",
    desc: "Use the sidebar to filter funds by category, risk level, AMC, and rating. Narrow down thousands of funds instantly.",
  },
  {
    n: "02",
    icon: Search,
    color: "text-violet-500",
    bg: "bg-violet-50",
    title: "Search Any Fund",
    desc: "Type a fund name or AMC in the search bar to instantly find and jump to any scheme across all categories.",
  },
  {
    n: "03",
    icon: BarChart2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    title: "Analyze Performance",
    desc: "Click any fund to open its analytics — NAV charts, rolling returns, risk metrics, drawdowns, and peer comparisons.",
  },
  {
    n: "04",
    icon: BookmarkPlus,
    color: "text-amber-500",
    bg: "bg-amber-50",
    title: "Shortlist & Compare",
    desc: "Save funds to your watchlist and compare them side-by-side to pick the best fit for your portfolio.",
  },
];

const METRICS = [
  {
    icon: DollarSign,
    color: "text-blue-500",
    bg: "bg-blue-50",
    name: "NAV",
    full: "Net Asset Value",
    def: "The per-unit market price of a fund. Calculated daily after market close.",
    example: "₹ 248.52",
    direction: null as "higher" | "lower" | null,
  },
  {
    icon: Landmark,
    color: "text-violet-500",
    bg: "bg-violet-50",
    name: "AUM",
    full: "Assets Under Management",
    def: "Total market value of all assets the fund manages. Larger AUM generally means more stability.",
    example: "₹ 42,310 Cr",
    direction: "higher" as const,
  },
  {
    icon: Percent,
    color: "text-rose-500",
    bg: "bg-rose-50",
    name: "Expense Ratio",
    full: "Annual Management Fee",
    def: "Yearly fee charged by the fund. Lower means more of your returns stay with you.",
    example: "0.89% p.a.",
    direction: "lower" as const,
  },
  {
    icon: TrendingUp,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    name: "CAGR",
    full: "Compounded Annual Growth Rate",
    def: "Your annualised return over a period, accounting for compounding — the gold standard metric.",
    example: "17.4% (5Y)",
    direction: "higher" as const,
  },
  {
    icon: Zap,
    color: "text-amber-500",
    bg: "bg-amber-50",
    name: "Alpha",
    full: "Excess Return over Benchmark",
    def: "How much more (or less) the fund returned vs its benchmark. Positive α = manager added value.",
    example: "+3.2",
    direction: "higher" as const,
  },
  {
    icon: Activity,
    color: "text-orange-500",
    bg: "bg-orange-50",
    name: "Beta",
    full: "Market Sensitivity",
    def: "Measures how much the fund moves relative to the market. Beta > 1 means more volatile than the index.",
    example: "0.92",
    direction: null,
  },
  {
    icon: Scale,
    color: "text-cyan-500",
    bg: "bg-cyan-50",
    name: "Sharpe Ratio",
    full: "Risk-Adjusted Return",
    def: "Return earned per unit of total risk taken. Higher Sharpe = better bang for your risk.",
    example: "1.34",
    direction: "higher" as const,
  },
  {
    icon: ArrowDownUp,
    color: "text-indigo-500",
    bg: "bg-indigo-50",
    name: "Std Dev",
    full: "Standard Deviation",
    def: "How much fund returns fluctuate over time. Higher = more volatile, riskier ride.",
    example: "14.6%",
    direction: "lower" as const,
  },
  {
    icon: Shield,
    color: "text-teal-500",
    bg: "bg-teal-50",
    name: "Sortino",
    full: "Sortino Ratio",
    def: "Like Sharpe but only penalises downside volatility — better for evaluating funds in falling markets.",
    example: "1.87",
    direction: "higher" as const,
  },
  {
    icon: Clock,
    color: "text-slate-500",
    bg: "bg-slate-100",
    name: "Exit Load",
    full: "Redemption Fee",
    def: "Fee charged when you redeem units before a specified period (usually 1 year). Nil after that.",
    example: "1% < 1Y",
    direction: "lower" as const,
  },
];

const FUND_TYPES = [
  {
    icon: TrendingUp,
    accent: "border-l-blue-400",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
    riskColor: "bg-rose-400",
    riskLabel: "High Risk",
    riskDots: 4,
    name: "Equity Funds",
    desc: "Invest primarily in stocks. Best for long-term wealth creation with higher risk tolerance.",
    horizon: "5+ years",
  },
  {
    icon: Shield,
    accent: "border-l-emerald-400",
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    riskColor: "bg-emerald-400",
    riskLabel: "Low Risk",
    riskDots: 1,
    name: "Debt Funds",
    desc: "Invest in bonds and fixed-income instruments. Stable, predictable returns with lower risk.",
    horizon: "1–3 years",
  },
  {
    icon: Layers,
    accent: "border-l-violet-400",
    iconColor: "text-violet-500",
    iconBg: "bg-violet-50",
    riskColor: "bg-amber-400",
    riskLabel: "Moderate Risk",
    riskDots: 3,
    name: "Hybrid Funds",
    desc: "A mix of equity and debt for a balanced risk-return profile. Ideal for moderate investors.",
    horizon: "3–5 years",
  },
  {
    icon: Percent,
    accent: "border-l-rose-400",
    iconColor: "text-rose-500",
    iconBg: "bg-rose-50",
    riskColor: "bg-rose-400",
    riskLabel: "High Risk",
    riskDots: 4,
    name: "ELSS Funds",
    desc: "Tax-saving equity funds under Section 80C. 3-year lock-in with high growth potential.",
    horizon: "3+ years (lock-in)",
  },
  {
    icon: BarChart,
    accent: "border-l-cyan-400",
    iconColor: "text-cyan-500",
    iconBg: "bg-cyan-50",
    riskColor: "bg-amber-400",
    riskLabel: "Moderate Risk",
    riskDots: 2,
    name: "Index Funds",
    desc: "Passively track Nifty/Sensex. Very low expense ratio and no fund manager risk.",
    horizon: "5+ years",
  },
  {
    icon: PiggyBank,
    accent: "border-l-slate-300",
    iconColor: "text-slate-500",
    iconBg: "bg-slate-100",
    riskColor: "bg-emerald-400",
    riskLabel: "Very Low Risk",
    riskDots: 1,
    name: "Liquid Funds",
    desc: "Park surplus cash here. Redeemable in 24 hours — better than a savings account for short parking.",
    horizon: "Days – 3 months",
  },
];

const RESOURCES = [
  {
    icon: GraduationCap,
    gradient: "from-blue-500 to-indigo-600",
    name: "Zerodha Varsity",
    sub: "Free Comprehensive Course",
    desc: "The most complete free resource on mutual funds — types, SIP math, taxation, and fund selection.",
    href: "https://zerodha.com/varsity/module/personalfinance/",
    tag: "Text + Video",
  },
  {
    icon: Play,
    gradient: "from-rose-500 to-pink-600",
    name: "ET Money",
    sub: "YouTube Channel",
    desc: "Bite-sized Hindi & English videos on fund selection, market concepts, and investment strategies.",
    href: "https://www.youtube.com/@ETMoney",
    tag: "YouTube",
  },
  {
    icon: Lightbulb,
    gradient: "from-amber-500 to-orange-500",
    name: "Groww Learn",
    sub: "Beginner-Friendly Articles",
    desc: "Well-structured articles on MF basics, SIP vs lump sum, NAV, returns, and more.",
    href: "https://groww.in/blog",
    tag: "Articles",
  },
  {
    icon: BookOpen,
    gradient: "from-emerald-500 to-teal-600",
    name: "AMFI India",
    sub: "Official Investor Education",
    desc: "Official AMFI portal with certified investor education material and verified fund data.",
    href: "https://www.amfiindia.com/investor",
    tag: "Official",
  },
];

// ── Component ───────────────────────────────────────────────────
export default function Learn() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Seo
        title="Learn Mutual Fund Investing"
        description="Learn how mutual funds work — categories, returns, risk, expense ratio, SIP, and how to choose the right fund for your financial goals."
        path="/learn"
      />
      <div className="sticky top-0 z-[90] bg-[#0f1729]">
        <TickerTape />
        <Navbar />
      </div>

      <main className="flex-1 analytics-shell">
        {/* ── HERO ──────────────────────────────────────────────── */}
        <section className="px-4 pb-14 pt-16 sm:px-6 lg:px-8 lg:pt-20">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5"
            >
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                Learning Hub
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Invest with{" "}
              <span className="bg-gradient-to-r from-primary via-blue-500 to-emerald-500 bg-clip-text text-transparent">
                clarity
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Everything you need to understand mutual funds — how to use the screener,
              what the metrics mean, and how to pick the right fund for your goals.
            </motion.p>

            {/* Section jump chips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-6 flex flex-wrap justify-center gap-2"
            >
              {[
                { label: "How to Use", href: "#how-to-use" },
                { label: "Key Metrics", href: "#key-metrics" },
                { label: "Fund Types", href: "#fund-types" },
                { label: "Resources", href: "#resources" },
              ].map(({ label, href }) => (
                <a key={label} href={href} className="analytics-chip no-underline hover:border-primary/40 hover:text-foreground transition-colors">
                  {label}
                </a>
              ))}
            </motion.div>

            {/* Decorative stat pills */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.42 }}
              className="mt-10 flex flex-wrap justify-center gap-3"
            >
              {[
                { label: "5Y CAGR", value: "17.4%", color: "text-emerald-600" },
                { label: "Expense Ratio", value: "0.89%", color: "text-rose-500" },
                { label: "Sharpe Ratio", value: "1.34", color: "text-blue-500" },
                { label: "Alpha", value: "+3.2", color: "text-amber-500" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="analytics-card flex items-center gap-3 px-4 py-2.5"
                >
                  <span className="text-[11px] text-muted-foreground">{s.label}</span>
                  <span className={`text-[13px] font-bold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── HOW TO USE ────────────────────────────────────────── */}
        <section id="how-to-use" className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              chip="Getting Started"
              title="How to use the Screener"
              sub="Four simple steps to find your ideal fund."
            />

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.n}
                  variants={fadeUp}
                  custom={i}
                  className="analytics-card group relative flex flex-col gap-4 p-6"
                >
                  <span className="text-[11px] font-bold tracking-widest text-muted-foreground/50">
                    {step.n}
                  </span>

                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${step.bg}`}>
                    <step.icon className={`h-5 w-5 ${step.color}`} />
                  </div>

                  <div>
                    <h3 className="text-[15px] font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{step.desc}</p>
                  </div>

                  {/* connector on desktop */}
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="absolute -right-2.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-background text-slate-300 shadow lg:block" />
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── KEY METRICS ───────────────────────────────────────── */}
        <section id="key-metrics" className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              chip="Metrics Guide"
              title="Key metrics explained"
              sub="Decode every number shown in the screener."
            />

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            >
              {METRICS.map((m, i) => (
                <motion.div
                  key={m.name}
                  variants={fadeUp}
                  custom={i}
                  className="analytics-card flex flex-col gap-3 p-4"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${m.bg}`}>
                    <m.icon className={`h-4 w-4 ${m.color}`} />
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-[14px] font-bold text-foreground">{m.name}</span>
                      {m.direction && (
                        <span
                          className={`text-[9px] font-semibold ${
                            m.direction === "higher" ? "text-emerald-600" : "text-rose-500"
                          }`}
                        >
                          {m.direction === "higher" ? "↑ higher better" : "↓ lower better"}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{m.full}</p>
                  </div>

                  <p className="text-[12px] leading-relaxed text-muted-foreground flex-1">{m.def}</p>

                  <div className="rounded-md bg-secondary px-2.5 py-1.5">
                    <span className="text-[12px] font-semibold text-foreground">{m.example}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── FUND TYPES ────────────────────────────────────────── */}
        <section id="fund-types" className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              chip="Fund Types"
              title="Which fund is right for you?"
              sub="Match fund categories to your goals and risk appetite."
            />

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {FUND_TYPES.map((ft, i) => (
                <motion.div
                  key={ft.name}
                  variants={fadeUp}
                  custom={i}
                  className={`analytics-card flex flex-col gap-4 border-l-4 p-5 ${ft.accent}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${ft.iconBg}`}>
                      <ft.icon className={`h-5 w-5 ${ft.iconColor}`} />
                    </div>

                    {/* Risk indicator */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((d) => (
                          <span
                            key={d}
                            className={`h-2 w-2 rounded-full transition-colors ${
                              d <= ft.riskDots ? ft.riskColor : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {ft.riskLabel}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[15px] font-bold text-foreground">{ft.name}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{ft.desc}</p>
                  </div>

                  <div className="mt-auto flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[12px] font-medium text-muted-foreground">
                      Horizon: {ft.horizon}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── RESOURCES ─────────────────────────────────────────── */}
        <section id="resources" className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              chip="Go Deeper"
              title="Curated learning resources"
              sub="Trusted sources to take your investing knowledge further."
            />

            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {RESOURCES.map((r, i) => (
                <motion.a
                  key={r.name}
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  variants={fadeUp}
                  custom={i}
                  className="analytics-card group flex gap-4 p-5 no-underline"
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${r.gradient} shadow-sm`}
                  >
                    <r.icon className="h-6 w-6 text-white" />
                  </div>

                  <div className="flex flex-1 flex-col justify-center gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-bold text-foreground">{r.name}</span>
                      <span className="analytics-chip">{r.tag}</span>
                    </div>
                    <p className="text-[11px] font-semibold text-primary">{r.sub}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{r.desc}</p>
                  </div>

                  <ExternalLink className="h-4 w-4 shrink-0 self-center text-slate-300 transition-colors group-hover:text-primary" />
                </motion.a>
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// ── Shared SectionHeader ────────────────────────────────────────
function SectionHeader({
  chip,
  title,
  sub,
}: {
  chip: string;
  title: string;
  sub: string;
}) {
  return (
    <div>
      <span className="analytics-chip">{chip}</span>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      <p className="mt-1.5 text-[14px] text-muted-foreground">{sub}</p>
    </div>
  );
}
