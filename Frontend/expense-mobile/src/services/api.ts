import axios from "axios";
import { getItem } from "./storage";

export const TOKEN_KEY = "auth_token";

function resolveBaseURL() {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  const isWeb = typeof window !== "undefined";

  if (isWeb) {
    if (raw && (raw.startsWith("http://localhost") || raw.startsWith("http://127.0.0.1"))) {
      return raw;
    }

    return "http://localhost:4000";
  }

  return raw || "http://localhost:4000";
}

export const api = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await getItem(TOKEN_KEY);

  config.headers = config.headers ?? {};

  if (token) {
    (config.headers as any).Authorization = `Bearer ${token}`;
  }

  const isFormData =
    typeof FormData !== "undefined" && config.data instanceof FormData;

  // Chỉ set JSON khi không phải multipart, và khi chưa có Content-Type
  if (!isFormData && !(config.headers as any)["Content-Type"]) {
    (config.headers as any)["Content-Type"] = "application/json";
  }

  return config;
});