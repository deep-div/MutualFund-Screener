export interface MutualFund {
  id: number;
  name: string;
  subCategory: string;
  plan: string;
  aum: number;
  absReturn3M: number;
  absReturn6M: number;
  absReturn1Y: number;
  cagr3Y: number;
  cagr5Y: number;
  cagr10Y: number;
  equityHolding: number;
}

export interface FilterRange {
  min: number;
  max: number;
  currentMin: number;
  currentMax: number;
}

export const FILTER_CATEGORIES = [
  { id: "scheme", label: "Scheme Info" },
  { id: "returns", label: "Returns" },
  { id: "risk", label: "Risk" },
  { id: "portfolio", label: "Portfolio Composition" },
  { id: "ratios", label: "Ratios" },
];

export const RETURN_FILTERS = [
  { id: "absReturn1Y", label: "Absolute Returns - 1Y", checked: true },
  { id: "cagr3Y", label: "CAGR 3Y", checked: true },
  { id: "cagr5Y", label: "CAGR 5Y", checked: true },
  { id: "cagr10Y", label: "CAGR 10Y", checked: true },
  { id: "absReturn3M", label: "Absolute Returns - 3M", checked: true },
  { id: "absReturn6M", label: "Absolute Returns - 6M", checked: true },
  { id: "alpha", label: "Alpha", checked: false },
  { id: "rollingReturn3Y", label: "3Y Avg Annual Rolling Return", checked: false, locked: true },
];
