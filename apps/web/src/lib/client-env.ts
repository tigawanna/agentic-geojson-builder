function resolveClientApiUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://127.0.0.1:3050";
}

export const clientEnv = {
  VITE_API_URL: resolveClientApiUrl(),
};
