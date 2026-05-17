import axios from "axios";
import * as SecureStore from "expo-secure-store";

export const TOKEN_KEY = "auth_token";

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

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