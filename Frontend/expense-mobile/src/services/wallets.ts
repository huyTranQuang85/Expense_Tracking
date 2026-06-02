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
  isFrozen?: boolean;
  currencyCode?: string;
  archivedAt?: string | null;
  createdAt?: string;
};

export type WalletStats = Wallet & {
  incomeTotal: number;
  expenseTotal: number;
};

const unwrap = (res: any) => res?.data?.data ?? res?.data ?? res;

export async function fetchMyWallets(options?: { includeArchived?: boolean }): Promise<Wallet[]> {
  const res = await api.get("/api/wallets", { params: options });
  return (unwrap(res) as Wallet[]) ?? [];
}

export async function fetchWalletStats(params?: {
  fromDate?: string;
  toDate?: string;
}): Promise<WalletStats[]> {
  const res = await api.get("/api/wallets/stats", { params });
  return (unwrap(res) as WalletStats[]) ?? [];
}

export async function createWallet(payload: {
  name: string;
  balance?: number; 
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  type?: string | "standard";
  currencyCode?: string;
  isFrozen?: boolean;
}): Promise<Wallet> {
  const res = await api.post("/api/wallets", {
    name: payload.name?.trim(),
    balance: payload.balance ?? 0,
    description: payload.description ?? null,
    icon: payload.icon ?? null,
    color: payload.color ?? "#4ECDC4",
    type: payload.type ?? "standard",
    currencyCode: payload.currencyCode ?? "VND",
    isFrozen: payload.isFrozen ?? false,
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
    isArchived: boolean;
    isFrozen: boolean;
    currencyCode: string;
  }>
): Promise<Wallet> {
  const res = await api.put(`/api/wallets/${id}`, payload);
  return unwrap(res) as Wallet;
}

export async function deleteWallet(id: number): Promise<void> {
  await api.delete(`/api/wallets/${id}`);
}