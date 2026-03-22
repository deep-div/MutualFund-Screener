export type FilterType = "range" | "single";

export interface FilterCategory {
  id: string;
  label: string;
}

export interface FilterDefinition {
  id: string;
  label: string;
  type: FilterType;
  category: string;
  options?: string[];
  groupedOptions?: Array<{ id: string; label: string; options: string[]; schemeClassValue?: string }>;
  pinned?: boolean;
}

export type FilterValue = {
  gte?: number | "";
  lte?: number | "";
  value?: string | string[];
};

export type FilterValueMap = Record<string, FilterValue>;

export type FilterRangeMeta = Record<string, { min: number | null; max: number | null }>;

export const FILTER_CATEGORIES: FilterCategory[] = [
  { id: "scheme", label: "Scheme Info" },
  { id: "returns", label: "Returns" },
  { id: "rolling", label: "Rolling Returns" },
  { id: "risk", label: "Risk" },
  { id: "ratios", label: "Ratios" },
  { id: "drawdown", label: "Drawdown" },
];

export const SCHEME_CLASS_OPTIONS = ["Equity", "Debt", "Hybrid", "Commodity", "Other"] as const;

export const SCHEME_SUB_CATEGORY_GROUPS = [
  {
    id: "equity",
    label: "Equity",
    schemeClassValue: "Equity",
    options: [
      "Large Cap Fund",
      "Mid Cap Fund",
      "Small Cap Fund",
      "Large & Mid Cap Fund",
      "Multi Cap Fund",
      "Flexi Cap Fund",
      "Focused Fund",
      "ELSS Fund",
      "Value Fund",
      "Contra Fund",
      "Dividend Yield Fund",
      "Sectoral/Thematic Fund",
      "Index Fund",
    ],
  },
  {
    id: "debt",
    label: "Debt",
    schemeClassValue: "Debt",
    options: [
      "Overnight Fund",
      "Liquid Fund",
      "Ultra Short Duration Fund",
      "Low Duration Fund",
      "Money Market Fund",
      "Short Duration Fund",
      "Medium Duration Fund",
      "Medium to Long Duration Fund",
      "Long Duration Fund",
      "Dynamic Bond Fund",
      "Corporate Bond Fund",
      "Banking and PSU Fund",
      "Credit Risk Fund",
      "Floater Fund",
      "Gilt Fund",
    ],
  },
  {
    id: "hybrid",
    label: "Hybrid",
    schemeClassValue: "Hybrid",
    options: [
      "Aggressive Hybrid Fund",
      "Balanced Hybrid Fund",
      "Conservative Hybrid Fund",
      "Dynamic Asset Allocation Fund",
      "Equity Savings Fund",
      "Multi Asset Allocation Fund",
      "Arbitrage Fund",
    ],
  },
  {
    id: "commodity",
    label: "Commodity",
    schemeClassValue: "Commodity",
    options: ["Gold", "Silver"],
  },
  {
    id: "others",
    label: "Others",
    schemeClassValue: "Other",
    options: [
      "Solution Oriented - Retirement Fund",
      "Solution Oriented - Children's Fund",
      "FoFs (Domestic)",
      "FoFs (Overseas)",
    ],
  },
];

export const FILTER_DEFINITIONS: FilterDefinition[] = [
  {
    id: "scheme_class",
    label: "Scheme Class",
    type: "single",
    category: "scheme",
    options: [...SCHEME_CLASS_OPTIONS],
    pinned: true,
  },
  {
    id: "scheme_sub_category",
    label: "Category",
    type: "single",
    category: "scheme",
    groupedOptions: SCHEME_SUB_CATEGORY_GROUPS,
    pinned: true,
  },
  { id: "current_nav", label: "Current NAV", type: "range", category: "scheme" },
  { id: "time_since_inception_years", label: "Time Since Inception", type: "range", category: "scheme" },

  { id: "abs_1w", label: "Absolute Return 1W", type: "range", category: "returns" },
  { id: "abs_1m", label: "Absolute Return 1M", type: "range", category: "returns" },
  { id: "abs_3m", label: "Absolute Return 3M", type: "range", category: "returns" },
  { id: "abs_6m", label: "Absolute Return 6M", type: "range", category: "returns" },

  { id: "cagr_1y", label: "CAGR 1Y", type: "range", category: "returns" },
  { id: "cagr_2y", label: "CAGR 2Y", type: "range", category: "returns" },
  { id: "cagr_3y", label: "CAGR 3Y", type: "range", category: "returns" },
  { id: "cagr_4y", label: "CAGR 4Y", type: "range", category: "returns" },
  { id: "cagr_5y", label: "CAGR 5Y", type: "range", category: "returns" },
  { id: "cagr_7y", label: "CAGR 7Y", type: "range", category: "returns" },
  { id: "cagr_10y", label: "CAGR 10Y", type: "range", category: "returns" },

  { id: "rolling_avg_1y", label: "Rolling Avg 1Y", type: "range", category: "rolling" },
  { id: "rolling_avg_2y", label: "Rolling Avg 2Y", type: "range", category: "rolling" },
  { id: "rolling_avg_3y", label: "Rolling Avg 3Y", type: "range", category: "rolling" },
  { id: "rolling_avg_4y", label: "Rolling Avg 4Y", type: "range", category: "rolling" },
  { id: "rolling_avg_5y", label: "Rolling Avg 5Y", type: "range", category: "rolling" },
  { id: "rolling_avg_7y", label: "Rolling Avg 7Y", type: "range", category: "rolling" },
  { id: "rolling_avg_10y", label: "Rolling Avg 10Y", type: "range", category: "rolling" },

  { id: "volatility_max", label: "Volatility", type: "range", category: "risk" },
  { id: "downside_deviation_max", label: "Downside Deviation", type: "range", category: "risk" },
  { id: "skewness_max", label: "Skewness", type: "range", category: "risk" },
  { id: "kurtosis_max", label: "Kurtosis", type: "range", category: "risk" },

  { id: "sharpe_max", label: "Sharpe", type: "range", category: "ratios" },
  { id: "sortino_max", label: "Sortino", type: "range", category: "ratios" },
  { id: "calmar_max", label: "Calmar", type: "range", category: "ratios" },
  { id: "pain_index_max", label: "Pain Index", type: "range", category: "ratios" },
  { id: "ulcer_index_max", label: "Ulcer Index", type: "range", category: "ratios" },

  { id: "current_drawdown_percent", label: "Current Drawdown", type: "range", category: "drawdown" },
  { id: "mdd_max_drawdown_percent", label: "Max Drawdown", type: "range", category: "drawdown" },
  { id: "mdd_one_year_pct", label: "MDD 1Y", type: "range", category: "drawdown" },
  { id: "mdd_two_year_pct", label: "MDD 2Y", type: "range", category: "drawdown" },
  { id: "mdd_three_year_pct", label: "MDD 3Y", type: "range", category: "drawdown" },
  { id: "mdd_four_year_pct", label: "MDD 4Y", type: "range", category: "drawdown" },
  { id: "mdd_five_year_pct", label: "MDD 5Y", type: "range", category: "drawdown" },
  { id: "mdd_seven_year_pct", label: "MDD 7Y", type: "range", category: "drawdown" },
  { id: "mdd_ten_year_pct", label: "MDD 10Y", type: "range", category: "drawdown" },
];

export const PINNED_FILTERS = FILTER_DEFINITIONS.filter((filter) => filter.pinned).map((filter) => filter.id);

export const DEFAULT_ENABLED_FILTERS = [
  ...PINNED_FILTERS,
  "cagr_1y",
  "cagr_3y",
  "cagr_5y",
];

export const FILTER_DEFINITIONS_BY_ID = Object.fromEntries(
  FILTER_DEFINITIONS.map((filter) => [filter.id, filter])
);
