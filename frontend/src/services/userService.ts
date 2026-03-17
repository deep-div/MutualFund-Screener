import { apiPost } from "@/lib/apiClient";

export const syncUser = async (firebaseToken: string) => {
  return apiPost("/api/v1/users", undefined, { params: { firebase_token: firebaseToken } });
};
