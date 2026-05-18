import { api } from "./api";

export type Me = {
  user_id: string;
  user_name: string;
  email: string;
  phone?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
};

const unwrapUser = (res: any) =>
  res?.data?.data?.user ?? res?.data?.user ?? res?.data ?? res;

const normalizeMe = (u: any): Me => ({
  user_id: String(u?.user_id ?? u?.userId ?? u?.id ?? ""),
  user_name: String(
    u?.user_name ?? u?.fullName ?? u?.full_name ?? u?.name ?? ""
  ),
  email: String(u?.email ?? ""),
  phone: u?.phone ?? u?.phoneNumber ?? u?.phone_number ?? null,
  bio: u?.bio ?? null,
  avatar_url:
    u?.avatar_url ?? u?.avatarUrl ?? u?.avatar_url ?? u?.avatar ?? null,
});

export async function fetchMe(): Promise<Me> {
  const res = await api.get("/api/auth/me");
  return normalizeMe(unwrapUser(res));
}

export type UpdateProfilePayload = {
  fullName?: string;
  phoneNumber?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
};

export async function updateMyProfile(
  payload: UpdateProfilePayload
): Promise<Me> {
  const res = await api.put("/api/auth/me", {
    fullName: payload.fullName?.trim() || null,
    phoneNumber: payload.phoneNumber || null,
    bio: payload.bio || null,
    avatarUrl: payload.avatarUrl || null,
  });

  return normalizeMe(unwrapUser(res));
}