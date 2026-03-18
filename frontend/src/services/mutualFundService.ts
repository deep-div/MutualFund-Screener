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
