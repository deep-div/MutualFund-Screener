export type ApiErrorBody = unknown;

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;

  constructor(message: string, status: number, body: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_BASE_URL = typeof window !== "undefined" ? window.location.origin : "http://localhost:4000";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || DEFAULT_BASE_URL;

const buildUrl = (path: string, params?: Record<string, string | number | boolean | undefined>) => {
  const url = new URL(path, API_BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
};

const parseResponse = async (res: Response) => {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
};

const request = async <T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  {
    params,
    body,
    headers,
    signal,
  }: {
    params?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    headers?: HeadersInit;
    signal?: AbortSignal;
  } = {}
): Promise<T> => {
  const url = buildUrl(path, params);
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  const data = await parseResponse(res);

  if (!res.ok) {
    const message = typeof data === "string" && data ? data : `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
};

export const apiGet = <T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: { headers?: HeadersInit; signal?: AbortSignal }
) => request<T>("GET", path, { params, ...options });

export const apiPost = <T, B = unknown>(
  path: string,
  body?: B,
  options?: { params?: Record<string, string | number | boolean | undefined>; headers?: HeadersInit; signal?: AbortSignal }
) => request<T>("POST", path, { body, ...options });

export const apiPut = <T, B = unknown>(
  path: string,
  body?: B,
  options?: { params?: Record<string, string | number | boolean | undefined>; headers?: HeadersInit; signal?: AbortSignal }
) => request<T>("PUT", path, { body, ...options });

export const apiDelete = <T>(
  path: string,
  options?: { params?: Record<string, string | number | boolean | undefined>; headers?: HeadersInit; signal?: AbortSignal }
) => request<T>("DELETE", path, options);
