import { api } from "./api";

export type TxType = "income" | "expense";

export type Transaction = {
  id: number | string;
  categoryId: number | string;
  walletId: number | string;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  type?: TxType;
  transferId?: number | string | null;
  recurringId?: number | string | null;
  transferDirection?: "in" | "out" | null;
  fromWalletId?: number | string | null;
  toWalletId?: number | string | null;
  fromWalletName?: string | null;
  toWalletName?: string | null;
};

export type TxUpsertPayload = {
  type: TxType;
  amount: number;
  categoryId?: string | number | null;
  subCategoryId?: string | number | null;
  walletId?: string | number | null;
  date: string; // YYYY-MM-DD
  description?: string;
};

export type RecurringRule = {
  recurring_id: number | string;
  category_id: number | string;
  wallet_id: number | string;
  amount: number;
  description?: string | null;
  interval_unit: "daily" | "weekly" | "monthly" | "yearly";
  interval_count: number;
  start_date: string;
  next_run_date: string;
  end_date?: string | null;
  is_active: boolean;
};

const unwrap = (res: any) => res?.data?.data ?? res?.data ?? res;

function toApiPayload(p: TxUpsertPayload) {
  const finalCategoryId = p.subCategoryId ?? p.categoryId ?? null;

  return {
    type: p.type,
    amount: p.amount,

    categoryId: finalCategoryId,
    category_id: finalCategoryId,

    parentCategoryId: p.categoryId ?? null,
    parent_category_id: p.categoryId ?? null,

    walletId: p.walletId ?? null,
    wallet_id: p.walletId ?? null,

    date: p.date,
    tx_date: p.date,

    description: p.description ?? "",
    note: p.description ?? "",
  };
}
function normalizeType(raw: any): TxType | undefined {
  if (!raw) return undefined;
  const s = String(raw).toLowerCase();
  if (s === "income" || s === "in" || s === "thu" || s === "receive")
    return "income";
  if (s === "expense" || s === "out" || s === "chi" || s === "spend")
    return "expense";
  if (s === "1") return "income";
  if (s === "0") return "expense";
  return undefined;
}

function normalizeTx(raw: any): Transaction {
  return {
    id: raw.id ?? raw.transaction_id ?? raw.transactionId,
    categoryId: raw.categoryId ?? raw.category_id,
    walletId: raw.walletId ?? raw.wallet_id,
    amount: Number(raw.amount ?? 0),
    description: raw.description ?? raw.note ?? "",
    date: raw.date ?? raw.tx_date ?? raw.transaction_date,
    type: normalizeType(
      raw.type ?? raw.tx_type ?? raw.transaction_type ?? raw.transactionType
    ), // ✅ giữ type
    transferId: raw.transferId ?? raw.transfer_id ?? null,
    recurringId: raw.recurringId ?? raw.recurring_id ?? null,
    transferDirection: raw.transferDirection ?? raw.transfer_direction ?? null,
    fromWalletId: raw.fromWalletId ?? raw.from_wallet_id ?? null,
    toWalletId: raw.toWalletId ?? raw.to_wallet_id ?? null,
    fromWalletName: raw.fromWalletName ?? raw.from_wallet_name ?? null,
    toWalletName: raw.toWalletName ?? raw.to_wallet_name ?? null,
  };
}

// Report dùng
export async function fetchAllTransactions(): Promise<Transaction[]> {
  const res = await api.get("/api/transactions");
  const data = unwrap(res) || [];
  return (Array.isArray(data) ? data : []).map(normalizeTx);
}

export async function fetchTransactions(params: {
  fromDate?: string;
  toDate?: string;
  walletId?: string | number;
  categoryId?: string | number;
  type?: TxType | "all";
  q?: string;
}): Promise<Transaction[]> {
  const res = await api.get("/api/transactions", { params });
  const data = unwrap(res) || [];
  return (Array.isArray(data) ? data : []).map(normalizeTx);
}

export async function createTransaction(payload: TxUpsertPayload) {
  const res = await api.post("/api/transactions", toApiPayload(payload));
  return unwrap(res);
}

export async function updateTransaction(
  id: string | number,
  payload: TxUpsertPayload
) {
  const res = await api.put(`/api/transactions/${id}`, toApiPayload(payload));
  return unwrap(res);
}

export async function softDeleteTransaction(id: string | number) {
  const res = await api.delete(`/api/transactions/${id}`);
  return unwrap(res);
}

export async function createTransfer(payload: {
  fromWalletId: string | number;
  toWalletId: string | number;
  amount: number;
  description?: string;
  txDate?: string;
}) {
  const res = await api.post("/api/transactions/transfer", payload);
  return unwrap(res);
}

export async function fetchRecurringRules(): Promise<RecurringRule[]> {
  const res = await api.get("/api/transactions/recurring");
  return (unwrap(res) || []) as RecurringRule[];
}

export async function createRecurringRule(payload: {
  categoryId: string | number;
  walletId: string | number;
  amount: number;
  description?: string;
  intervalUnit: "daily" | "weekly" | "monthly" | "yearly";
  intervalCount?: number;
  startDate?: string;
  endDate?: string | null;
}) {
  const res = await api.post("/api/transactions/recurring", payload);
  return unwrap(res);
}

export async function updateRecurringRule(
  id: string | number,
  payload: Partial<{
    categoryId: string | number;
    walletId: string | number;
    amount: number;
    description: string;
    intervalUnit: "daily" | "weekly" | "monthly" | "yearly";
    intervalCount: number;
    startDate: string;
    nextRunDate: string;
    endDate: string | null;
    isActive: boolean;
  }>
) {
  const res = await api.put(`/api/transactions/recurring/${id}`, payload);
  return unwrap(res);
}

export async function deleteRecurringRule(id: string | number) {
  const res = await api.delete(`/api/transactions/recurring/${id}`);
  return unwrap(res);
}