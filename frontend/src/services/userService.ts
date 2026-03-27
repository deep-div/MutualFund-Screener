import { apiGet, apiPost, apiPut } from "@/lib/apiClient";

export const syncUser = async (token: string) => {
  return apiPost("/api/v1/users", undefined, { params: { token: token } });
};

export const saveUserFilters = async (
  token: string,
  payload: {
    name: string;
    description: string;
    filters: Record<string, Record<string, number | string | string[]>>;
    sort_field?: string;
    sort_order?: "asc" | "desc";
    enabled_filters?: string[];
  }
) => {
  return apiPost("/api/v1/users/filters", payload, { params: { token: token } });
};

export const updateUserFilters = async (
  token: string,
  externalId: string,
  payload: {
    name: string;
    description: string;
    filters: Record<string, Record<string, number | string | string[]>>;
    sort_field?: string;
    sort_order?: "asc" | "desc";
    enabled_filters?: string[];
  }
) => {
  return apiPut(`/api/v1/users/filters/${externalId}`, payload, { params: { token: token } });
};

export interface SavedUserFilter {
  external_id: string;
  name?: string | null;
  description?: string | null;
  filters: {
    filters?: Record<string, Record<string, number | string | string[]>>;
    sort_field?: string;
    sort_order?: "asc" | "desc";
    enabled_filters?: string[];
  };
  created_at?: string;
  updated_at?: string;
}

export const getUserFilters = async (token: string) => {
  return apiGet<{ filters: SavedUserFilter[] }>("/api/v1/users/filters", { token });
};
