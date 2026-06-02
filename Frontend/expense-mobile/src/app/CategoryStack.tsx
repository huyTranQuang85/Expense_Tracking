import type { Category } from "../services/categories";
export type CategoryStackParamList = {
  Category: undefined;
  AddCategory:
    | { type?: "income" | "expense"; parentId?: number | string | null }
    | undefined;
  AddSubCategory:
    | { parentId?: number | string; parentName?: string; type?: "income" | "expense" }
    | undefined;
  EditCategory: { cat: Category };
};
