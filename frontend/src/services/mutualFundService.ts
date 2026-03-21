import { apiGet } from "@/lib/apiClient";
import { apiPost } from "@/lib/apiClient";

export interface SchemeSearchItem {
  scheme_id: number;
  scheme_code?: number;
  fund_house?: string;
  scheme_sub_name: string;
  option_type: string;
  plan_type?: string;
  scheme_sub_category: string;
  current_nav?: number | null;
  nav_change_1d?: number | null;
}

export interface SchemeSearchResponse {
  limit: number;
  offset: number;
  total: number;
  items: SchemeSearchItem[];
}

export interface SchemeAnalyticsResponse {
  meta: {
    scheme_id?: number;
    scheme_code: number;
    scheme_sub_name: string;
    scheme_sub_category: string;
    scheme_class: string;
    fund_house: string;
    plan_type: string;
    option_type: string;
    current_nav: number | null;
    nav_change_1d: number | null;
    launch_date?: string;
    current_date: string;
    time_since_inception_years: number | null;
  };
  metrics: {
    returns: {
      absolute_returns_percent: Record<string, number | null>;
      cagr_percent?: Record<string, number | null>;
      year_on_year_percent: Record<string, number>;
      monthly_return_heatmap?: Record<string, Record<string, number>>;
      rolling_cagr_percent?: Record<
        string,
        {
          points: Array<{ date: string; cagr_percent: number }>;
          summary?: Record<string, number>;
        }
      >;
      sip_returns?: Record<
        string,
        {
          xirr_percent: number;
          current_value: number;
          monthly_amount: number;
          total_invested: number;
          absolute_return_percent: number;
        } | null
      >;
    };
    drawdown?: {
      current_drawdown?: {
        max_drawdown_percent: number | null;
        drawdown_duration_days: number | null;
      };
    };
    consistency?: {
      consistency?: {
        positive_months_percent?: number;
        positive_years_percent?: number;
        best_year?: { year: number; return: number };
        worst_year?: { year: number; return: number };
      };
    };
    risk_metrics?: {
      volatility_annualized_percent?: Record<string, number | null>;
      downside_deviation_percent?: Record<string, number | null>;
    };
    risk_adjusted_returns?: {
      sharpe_ratio?: Record<string, number | null>;
      sortino_ratio?: Record<string, number | null>;
    };
  };
}

export interface SchemeListItem {
  scheme_id: string;
  scheme_sub_name?: string;
  scheme_sub_category?: string;
  scheme_class?: string;
  option_type?: string;
  current_nav?: number | null;
  time_since_inception_years?: number | null;
  abs_1w?: number | null;
  abs_1m?: number | null;
  abs_3m?: number | null;
  abs_6m?: number | null;
  cagr_1y?: number | null;
  cagr_2y?: number | null;
  cagr_3y?: number | null;
  cagr_4y?: number | null;
  cagr_5y?: number | null;
  cagr_7y?: number | null;
  cagr_10y?: number | null;
  rolling_avg_1y?: number | null;
  rolling_avg_2y?: number | null;
  rolling_avg_3y?: number | null;
  rolling_avg_4y?: number | null;
  rolling_avg_5y?: number | null;
  rolling_avg_7y?: number | null;
  rolling_avg_10y?: number | null;
  volatility_max?: number | null;
  downside_deviation_max?: number | null;
  skewness_max?: number | null;
  kurtosis_max?: number | null;
  sharpe_max?: number | null;
  sortino_max?: number | null;
  calmar_max?: number | null;
  pain_index_max?: number | null;
  ulcer_index_max?: number | null;
  current_drawdown_percent?: number | null;
  mdd_max_drawdown_percent?: number | null;
  mdd_one_year_pct?: number | null;
  mdd_two_year_pct?: number | null;
  mdd_three_year_pct?: number | null;
  mdd_four_year_pct?: number | null;
  mdd_five_year_pct?: number | null;
  mdd_seven_year_pct?: number | null;
  mdd_ten_year_pct?: number | null;
  [key: string]: string | number | null | undefined;
}

export interface SchemeListResponse {
  limit: number;
  offset: number;
  total: number;
  meta?: Record<string, { min: number | null; max: number | null }>;
  items: SchemeListItem[];
}

export const searchSchemes = (
  query: string,
  options?: { limit?: number; offset?: number; signal?: AbortSignal }
) =>
  apiGet<SchemeSearchResponse>(
    "/api/v1/schemes/search",
    {
      query,
      limit: options?.limit ?? 10,
      offset: options?.offset ?? 0,
    },
    { signal: options?.signal }
  );

export const getSchemeAnalytics = (schemeId: number | string, options?: { signal?: AbortSignal }) =>
  apiGet<SchemeAnalyticsResponse>(`/api/v1/schemes/${schemeId}/analytics`, undefined, {
    signal: options?.signal,
  });

export const listSchemes = (
  payload: {
    filters: Record<string, Record<string, number | string | string[]>>;
    sort_field?: string;
    sort_order?: "asc" | "desc";
  },
  options?: { limit?: number; offset?: number; signal?: AbortSignal }
) =>
  apiPost<SchemeListResponse, typeof payload>("/api/v1/schemes", payload, {
    params: {
      limit: options?.limit ?? 10,
      offset: options?.offset ?? 0,
    },
    signal: options?.signal,
  });
