import * as SecureStore from "expo-secure-store";
import { TOKEN_KEY } from "./api"; // bạn đã có TOKEN_KEY ở SettingsScreen

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";

function guessMime(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function uploadMyAvatar(fileUri: string) {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) throw new Error("Missing token");

  const name = fileUri.split("/").pop() || `avatar_${Date.now()}.jpg`;
  const type = guessMime(name);

  const fd = new FormData();
  fd.append("avatar", { uri: fileUri, name, type } as any);

  const res = await fetch(`${API_BASE_URL}/api/settings/avatar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // KHÔNG set Content-Type, để fetch tự set boundary
    },
    body: fd,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message || "Upload avatar failed");
  }

  return json?.data; // tuỳ backend bạn trả { avatar_url } hay { user... }
}