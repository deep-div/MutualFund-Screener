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
  return apiPost("/api/v1/users/screens", payload, { params: { token: token } });
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
  return apiPut(`/api/v1/users/screens/${externalId}`, payload, { params: { token: token } });
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

export interface UserFiltersResponse {
  filters: SavedUserFilter[];
  total?: number;
  limit?: number | null;
  offset?: number;
}

export interface DefaultFilterGroup {
  key: string;
  label: string;
  filters: SavedUserFilter[];
}

export interface DefaultFiltersResponse {
  groups: DefaultFilterGroup[];
  group_count?: number;
  total?: number;
}

export const getUserFilters = async (
  token: string,
  options?: { limit?: number; offset?: number }
) => {
  const response = await apiGet<{
    screens: SavedUserFilter[];
    total?: number;
    limit?: number | null;
    offset?: number;
  }>("/api/v1/users/screens", {
    token,
    limit: options?.limit,
    offset: options?.offset,
  });
  return {
    filters: Array.isArray(response?.screens) ? response.screens : [],
    total: response?.total,
    limit: response?.limit,
    offset: response?.offset,
  } satisfies UserFiltersResponse;
};

export const getDefaultFilters = async () => {
  const response = await apiGet<{
    groups: Array<{
      key: string;
      label: string;
      screens?: SavedUserFilter[];
    }>;
    group_count?: number;
    total?: number;
  }>("/api/v1/users/screens/defaults");
  return {
    groups: Array.isArray(response?.groups)
      ? response.groups.map((group) => ({
          key: group.key,
          label: group.label,
          filters: Array.isArray(group.screens) ? group.screens : [],
        }))
      : [],
    group_count: response?.group_count,
    total: response?.total,
  } satisfies DefaultFiltersResponse;
};
