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

export const SAMPLE_FUNDS: MutualFund[] = [
  { id: 1, name: "Edelweiss Mid Cap Fund", subCategory: "Mid Cap Fund", plan: "Growth", aum: 13801.71, absReturn3M: -7.54, absReturn6M: -5.29, absReturn1Y: 12.3, cagr3Y: 18.5, cagr5Y: 22.1, cagr10Y: 15.8, equityHolding: 97.2 },
  { id: 2, name: "Nippon India Growth Mid Cap Fund", subCategory: "Mid Cap Fund", plan: "Growth", aum: 43982.51, absReturn3M: -5.00, absReturn6M: -4.15, absReturn1Y: 14.2, cagr3Y: 20.1, cagr5Y: 24.3, cagr10Y: 17.2, equityHolding: 95.8 },
  { id: 3, name: "ICICI Pru Nifty Midcap 150 Index Fund", subCategory: "Index Fund", plan: "Growth", aum: 957.88, absReturn3M: -8.55, absReturn6M: -6.06, absReturn1Y: 10.8, cagr3Y: 16.9, cagr5Y: 20.5, cagr10Y: 14.1, equityHolding: 99.5 },
  { id: 4, name: "Parag Parikh Flexi Cap Fund", subCategory: "Flexi Cap Fund", plan: "Growth", aum: 134253.17, absReturn3M: -6.96, absReturn6M: -5.83, absReturn1Y: 8.5, cagr3Y: 15.2, cagr5Y: 19.8, cagr10Y: 16.4, equityHolding: 72.3 },
  { id: 5, name: "Kotak Large & Midcap Fund", subCategory: "Large & Mid Cap Fund", plan: "Growth", aum: 30712.48, absReturn3M: -6.69, absReturn6M: -4.01, absReturn1Y: 11.7, cagr3Y: 17.8, cagr5Y: 21.2, cagr10Y: 15.1, equityHolding: 93.6 },
  { id: 6, name: "Nippon India Nifty Smallcap 250 Index Fund", subCategory: "Index Fund", plan: "Growth", aum: 2752.94, absReturn3M: -9.37, absReturn6M: -13.37, absReturn1Y: 5.2, cagr3Y: 19.4, cagr5Y: 25.8, cagr10Y: 13.9, equityHolding: 99.1 },
  { id: 7, name: "Edelweiss NIFTY Large Mid Cap 250 Index Fund", subCategory: "Index Fund", plan: "Growth", aum: 319.54, absReturn3M: -9.39, absReturn6M: -6.68, absReturn1Y: 7.9, cagr3Y: 14.6, cagr5Y: 18.7, cagr10Y: 12.8, equityHolding: 98.7 },
  { id: 8, name: "HDFC Small Cap Fund", subCategory: "Small Cap Fund", plan: "Growth", aum: 37423.94, absReturn3M: -9.76, absReturn6M: -12.83, absReturn1Y: 4.1, cagr3Y: 21.3, cagr5Y: 27.4, cagr10Y: 18.6, equityHolding: 91.4 },
  { id: 9, name: "Motilal Oswal Nifty 500 Index Fund", subCategory: "Index Fund", plan: "Growth", aum: 2897.80, absReturn3M: -9.75, absReturn6M: -7.56, absReturn1Y: 6.8, cagr3Y: 13.8, cagr5Y: 17.2, cagr10Y: 11.5, equityHolding: 99.3 },
  { id: 10, name: "SBI Small Cap Fund", subCategory: "Small Cap Fund", plan: "Growth", aum: 28456.12, absReturn3M: -8.12, absReturn6M: -10.45, absReturn1Y: 6.5, cagr3Y: 22.8, cagr5Y: 26.1, cagr10Y: 19.2, equityHolding: 88.9 },
];

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
