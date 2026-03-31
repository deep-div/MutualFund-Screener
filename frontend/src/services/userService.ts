import { apiGet, apiPost, apiPut } from "@/lib/apiClient";

export const syncUser = async (token: string) => {
  return apiPost("/api/v1/users", undefined, { params: { token: token } });
};

export const saveUserFilters = async (
  token: string,
  payload: {
    name: string;
    description: string;
    screens: Record<string, Record<string, number | string | string[]>>;
    sort_field?: string;
    sort_order?: "asc" | "desc";
    enabled_screens?: string[];
    external_ids?: string[];
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
    screens: Record<string, Record<string, number | string | string[]>>;
    sort_field?: string;
    sort_order?: "asc" | "desc";
    enabled_screens?: string[];
    external_ids?: string[];
  }
) => {
  return apiPut(`/api/v1/users/screens/${externalId}`, payload, { params: { token: token } });
};

export interface SavedUserFilter {
  external_id: string;
  screen_type?: "screen" | "watchlist" | null;
  external_ids?: string[];
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

interface BackendSavedUserFilter {
  external_id: string;
  screen_type?: "screen" | "watchlist" | null;
  external_ids?: string[];
  name?: string | null;
  description?: string | null;
  screens?: {
    screens?: Record<string, Record<string, number | string | string[]>>;
    filters?: Record<string, Record<string, number | string | string[]>>;
    sort_field?: string;
    sort_order?: "asc" | "desc";
    enabled_screens?: string[];
    enabled_filters?: string[];
  };
  filters?: {
    screens?: Record<string, Record<string, number | string | string[]>>;
    filters?: Record<string, Record<string, number | string | string[]>>;
    sort_field?: string;
    sort_order?: "asc" | "desc";
    enabled_screens?: string[];
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

const normalizeSavedFilter = (item: BackendSavedUserFilter): SavedUserFilter => {
  const source = item.screens ?? item.filters ?? {};
  return {
    external_id: item.external_id,
    screen_type: item.screen_type,
    external_ids: Array.isArray(item.external_ids) ? item.external_ids : [],
    name: item.name,
    description: item.description,
    filters: {
      filters: source.screens ?? source.filters ?? {},
      sort_field: source.sort_field,
      sort_order: source.sort_order,
      enabled_filters: source.enabled_screens ?? source.enabled_filters ?? [],
    },
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
};

export const getUserFilters = async (
  token: string,
  options?: { limit?: number; offset?: number; screen_type?: string }
) => {
  const response = await apiGet<{
    screens: BackendSavedUserFilter[];
    total?: number;
    limit?: number | null;
    offset?: number;
  }>("/api/v1/users/screens", {
    token,
    limit: options?.limit,
    offset: options?.offset,
    screen_type: options?.screen_type,
  });
  return {
    filters: Array.isArray(response?.screens) ? response.screens.map(normalizeSavedFilter) : [],
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
      screens?: BackendSavedUserFilter[];
      filters?: BackendSavedUserFilter[];
    }>;
    group_count?: number;
    total?: number;
  }>("/api/v1/users/screens/defaults");
  return {
    groups: Array.isArray(response?.groups)
      ? response.groups.map((group) => ({
          key: group.key,
          label: group.label,
          filters: Array.isArray(group.screens ?? group.filters)
            ? (group.screens ?? group.filters ?? []).map(normalizeSavedFilter)
            : [],
        }))
      : [],
    group_count: response?.group_count,
    total: response?.total,
  } satisfies DefaultFiltersResponse;
};
