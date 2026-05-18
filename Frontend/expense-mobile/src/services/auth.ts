import * as SecureStore from "expo-secure-store";
import { api, TOKEN_KEY } from "./api";

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
};

function pickToken(resData: any) {
  return resData?.data?.token ?? resData?.token ?? resData?.accessToken;
}

function pickUser(resData: any) {
  return resData?.data?.user ?? resData?.user;
}

export async function login(payload: LoginPayload) {
  const res = await api.post("/api/auth/login", payload);
  const token = pickToken(res.data);
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  return { raw: res.data, token, user: pickUser(res.data) };
}

export async function register(payload: RegisterPayload) {
  const res = await api.post("/api/auth/register", payload);
  const token = pickToken(res.data);
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  return { raw: res.data, token, user: pickUser(res.data) };
}

export async function me() {
  const res = await api.get("/api/auth/me");
  return res.data?.data?.user ?? res.data?.user ?? res.data;
}

export async function updateProfile(payload: {
  fullName?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
}) {
  const res = await api.put("/api/auth/me", payload);
  return res.data;
}

export async function forgotSendCode(email: string) {
  const res = await api.post("/api/auth/forgot-password", { email });
  return res.data;
}

export async function forgotResetPassword(payload: {
  email: string;
  code: string;
  newPassword: string;
}) {
  const res = await api.post("/api/auth/reset-password", {
    token: payload.code,
    newPassword: payload.newPassword,
  });
  return res.data;
}
export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  const res = await api.post("/api/auth/change-password", payload);
  return res.data?.data ?? res.data;
}