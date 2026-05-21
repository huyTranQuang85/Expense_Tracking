import { api } from "./api";

export type Wallet = {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  type?: string | null;
  balance: number;
  color?: string | null;
  isArchived?: boolean;
  createdAt?: string;
};

const unwrap = (res: any) => res?.data?.data ?? res?.data ?? res;

export async function fetchMyWallets(): Promise<Wallet[]> {
  const res = await api.get("/api/wallets");
  return (unwrap(res) as Wallet[]) ?? [];
}

export async function createWallet(payload: {
  name: string;
  balance?: number; 
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  type?: string | "standard";
}): Promise<Wallet> {
  const res = await api.post("/api/wallets", {
    name: payload.name?.trim(),
    balance: payload.balance ?? 0,
    description: payload.description ?? null,
    icon: payload.icon ?? null,
    color: payload.color ?? "#4ECDC4",
    type: payload.type ?? "standard",
  });
  return unwrap(res) as Wallet;
}

export async function updateWallet(
  id: number,
  payload: Partial<{
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    type: string | null;
    balance: number | null;
  }>
): Promise<Wallet> {
  const res = await api.put(`/api/wallets/${id}`, payload);
  return unwrap(res) as Wallet;
}

export async function deleteWallet(id: number): Promise<void> {
  await api.delete(`/api/wallets/${id}`);
}