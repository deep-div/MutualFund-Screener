import { apiPost } from "@/lib/apiClient";

export const syncUser = async (token: string) => {
  return apiPost("/api/v1/users", undefined, { params: { token: token } });
};
