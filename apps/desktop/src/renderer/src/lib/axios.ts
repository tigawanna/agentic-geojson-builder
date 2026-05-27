import axios, { AxiosError, type AxiosInstance } from "axios";

/**
 * Shape of a normalized API error. Every failure from `api.*` throws this so
 * React Query + components can render consistent error states.
 */
export interface ApiError {
  status: number | null;
  message: string;
  data: unknown;
}

function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<{ message?: string }>;
    return {
      status: axErr.response?.status ?? null,
      message: axErr.response?.data?.message ?? axErr.message ?? "Request failed",
      data: axErr.response?.data ?? null,
    };
  }
  return {
    status: null,
    message: err instanceof Error ? err.message : "Unknown error",
    data: null,
  };
}

export function createApiClient(baseURL = import.meta.env.VITE_API_BASE_URL): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: 15_000,
    headers: { "Content-Type": "application/json" },
  });

  instance.interceptors.request.use((config) => {
    // Add auth headers, trace ids, etc. here.
    return config;
  });

  instance.interceptors.response.use(
    (r) => r,
    (err) => Promise.reject(toApiError(err)),
  );

  return instance;
}

export const api = createApiClient();
