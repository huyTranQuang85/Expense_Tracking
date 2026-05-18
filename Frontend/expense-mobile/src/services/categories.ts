import { api } from "./api";

export type Category = {
  id: number | string;
  name: string;
  type: "income" | "expense";
  icon?: string | null;
  color?: string | null;
  parentCategoryId?: number | string | null;
  isGlobal?: boolean;
};

const unwrap = (res: any) => res?.data?.data ?? res?.data ?? res;

export async function fetchAllCategories(): Promise<Category[]> {
  const res = await api.get("/api/categories");
  return (unwrap(res) || []) as Category[];
}

export async function createCategory(payload: {
  name: string;
  type: "income" | "expense";
  parentCategoryId?: number | string | null;
  icon?: string | null;
  color?: string | null;
}) {
  const res = await api.post("/api/categories", payload);
  return unwrap(res);
}

export async function updateCategory(
  id: number | string,
  payload: Partial<{
    name: string;
    type: "income" | "expense";
    parentCategoryId: number | string | null;
    icon: string | null;
    color: string | null;
  }>
) {
  const res = await api.put(`/api/categories/${id}`, payload);
  return unwrap(res);
}

// ✅ thêm hàm này
export async function deleteCategory(id: number | string) {
  const res = await api.delete(`/api/categories/${id}`);
  return unwrap(res);
}