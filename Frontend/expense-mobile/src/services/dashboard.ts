import { api } from "./api";

export type Category = {
  id: number | string;
  name: string;
  type?: "income" | "expense";
  color?: string;
  icon?: string;
  parentCategoryId?: number | string | null;
};

export type Transaction = {
  id: number | string;
  amount: number;
  type?: "income" | "expense";
  description?: string;
  note?: string;
  date?: string; // ISO
  categoryId?: number | string;
  categoryName?: string;
  isDeleted?: boolean;
  deletedAt?: string;
};

const palette = [
  "#FF4D4F",
  "#52C41A",
  "#9254DE",
  "#1677FF",
  "#13C2C2",
  "#FAAD14",
  "#EB2F96",
];

export function pickCategoryColor(c: Category, index: number) {
  return c.color || palette[index % palette.length];
}

export async function fetchMe() {
  const res = await api.get("/api/auth/me");
  return res.data?.data?.user ?? res.data?.user ?? res.data;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await api.get("/api/categories");
  const arr = res.data?.data ?? [];
  const list = Array.isArray(arr) ? arr : arr?.categories ?? [];

  return list.map((c: any) => ({
    id: c.category_id ?? c.id,
    name: c.category_name ?? c.name,
    type: c.type ?? c.category_type,
    color: c.color,
    icon: c.icon,

    // ✅ quan trọng: map parent
    parentCategoryId:
      c.parent_category_id ??
      c.parentCategoryId ??
      c.parent_id ??
      c.parentId ??
      null,
  }));
}

/**
 * GET /api/transactions
 * backend hỗ trợ filter. Ở đây mình gửi from/to nếu backend có nhận thì ok,
 * nếu không nhận thì backend sẽ ignore (UI vẫn chạy).
 */
export async function fetchTransactions(params: {
  fromDate?: string;
  toDate?: string;
  q?: string;
}): Promise<Transaction[]> {
  const res = await api.get("/api/transactions", { params });

  const arr = res.data?.data ?? [];
  const list = Array.isArray(arr) ? arr : arr?.transactions ?? [];

  return list.map((t: any) => ({
    id: t.transaction_id ?? t.id,
    amount: Number(t.amount ?? 0),
    type: t.category_type ?? t.type, // ✅ QUAN TRỌNG (expense/income)
    description: t.description,
    note: t.note,
    date: t.tx_date ?? t.date, // ✅ map tx_date -> date
    categoryId: t.category_id ?? t.categoryId,
    categoryName: t.category_name ?? t.categoryName,
    isDeleted: !!t.is_deleted,
    deletedAt: t.deleted_at,
  }));
}

/**
 * GET /api/transactions/trash
 */
export async function fetchTrash(): Promise<Transaction[]> {
  const res = await api.get("/api/transactions/trash");
  const rows = res.data?.data ?? res.data;
  return Array.isArray(rows) ? rows : rows?.transactions ?? [];
}

/**
 * POST /api/transactions/:id/restore
 */
export async function restoreTransaction(id: number | string) {
  const res = await api.post(`/api/transactions/${id}/restore`);
  return res.data;
}

/**
 * DELETE /api/transactions/:id/force
 */
export async function forceDeleteTransaction(id: number | string) {
  const res = await api.delete(`/api/transactions/${id}/force`);
  return res.data;
}