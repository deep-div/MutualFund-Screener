import { apiPost, apiPut } from "@/lib/apiClient";

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
