import { api } from "./api";
import type { Me } from "./profile";
export type AppLocale = "vi-VN" | "en-US";

export type Settings = {
  darkMode: boolean;
  locale: AppLocale;
  timezone: string;
  createdAt?: string;
  updatedAt?: string;
};

const unwrap = (res: any) => res?.data?.data ?? res?.data ?? res;

export async function fetchMySettings(): Promise<Settings> {
  const res = await api.get("/api/settings");
  return unwrap(res) as Settings;
}

export async function updateMySettings(
  payload: Partial<Settings>
): Promise<Settings> {
  const res = await api.put("/api/settings", payload);
  return unwrap(res) as Settings;
}

export async function uploadMyAvatar(fileUri: string): Promise<Me> {
  const form = new FormData();

  const filename = fileUri.split("/").pop() || "avatar.jpg";
  const ext = filename.split(".").pop()?.toLowerCase();
  const type =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  form.append("avatar", { uri: fileUri, name: filename, type } as any);

  const res = await api.post("/api/settings/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  // backend trả { status, data } → unwrap() sẽ lấy data
  return unwrap(res) as any as Me;
}