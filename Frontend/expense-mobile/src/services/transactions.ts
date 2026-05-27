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
  };
}

// Report dùng
export async function fetchAllTransactions(): Promise<Transaction[]> {
  const res = await api.get("/api/transactions");
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