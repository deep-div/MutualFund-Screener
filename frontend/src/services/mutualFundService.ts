import { apiGet } from "@/lib/apiClient";

export interface SchemeSearchItem {
  scheme_code: number;
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

export const getSchemeAnalytics = (schemeCode: number | string, options?: { signal?: AbortSignal }) =>
  apiGet<SchemeAnalyticsResponse>(`/api/v1/schemes/${schemeCode}/analytics`, undefined, {
    signal: options?.signal,
  });
