import type { Category } from "../services/categories";
export type CategoryStackParamList = {
  Category: undefined;
  AddCategory:
    | { type?: "income" | "expense"; parentId?: number | string | null }
    | undefined;
  EditCategory: { cat: Category };
};
