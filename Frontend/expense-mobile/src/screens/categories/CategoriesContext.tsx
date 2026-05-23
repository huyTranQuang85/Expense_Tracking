import React, { createContext, useContext, useMemo, useState } from "react";
import {
  CATEGORY_FIXTURES,
  CategoryNode,
  CategoryType,
  buildCategoryDescription,
  createTempCategoryId,
  getCategoryById,
  getChildCategories,
  getRootCategories,
} from "./categoryFixtures";

type CreatePayload = {
  name: string;
  type: CategoryType;
  parentId: string | null;
  iconKey: string;
  color: string;
};

type UpdatePayload = CreatePayload & {
  id: string;
};

type CategoriesContextValue = {
  categories: CategoryNode[];
  getCategory: (id?: string | null) => CategoryNode | null;
  getChildren: (parentId?: string | null) => CategoryNode[];
  getRoots: (type?: CategoryType) => CategoryNode[];
  createCategory: (payload: CreatePayload) => CategoryNode;
  updateCategory: (payload: UpdatePayload) => CategoryNode | null;
  deleteCategory: (id: string) => void;
};

const CategoriesContext = createContext<CategoriesContextValue | undefined>(
  undefined,
);

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function cloneFixtures() {
  return CATEGORY_FIXTURES.map((item) => ({ ...item }));
}

export function CategoriesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, setCategories] =
    useState<CategoryNode[]>(cloneFixtures);

  const value = useMemo<CategoriesContextValue>(
    () => ({
      categories,
      getCategory: (id?: string | null) => getCategoryById(id, categories),
      getChildren: (parentId?: string | null) =>
        getChildCategories(parentId, categories),
      getRoots: (type?: CategoryType) => getRootCategories(type, categories),
      createCategory: (payload: CreatePayload) => {
        const next: CategoryNode = {
          id: createTempCategoryId(payload.name || "category"),
          name: normalizeName(payload.name) || "Danh mục mới",
          type: payload.type,
          parentId: payload.parentId,
          iconKey: payload.iconKey,
          color: payload.color,
          description: payload.parentId
            ? "Danh mục con mới"
            : "Danh mục cấp cao mới",
        };

        setCategories((prev: CategoryNode[]) => [next, ...prev]);
        return next;
      },
      updateCategory: (payload: UpdatePayload) => {
        let updated: CategoryNode | null = null;

        setCategories((prev: CategoryNode[]) => {
          const nextState = prev.map((item: CategoryNode) => {
            if (item.id !== payload.id) return item;

            updated = {
              ...item,
              name: normalizeName(payload.name) || item.name,
              type: payload.type,
              parentId: payload.parentId,
              iconKey: payload.iconKey,
              color: payload.color,
              description: buildCategoryDescription(
                getChildCategories(item.id, prev).length,
              ),
            };

            return updated;
          });

          return nextState;
        });

        return updated;
      },
      deleteCategory: (id: string) => {
        setCategories((prev: CategoryNode[]) =>
          prev.filter((item: CategoryNode) => item.id !== id && item.parentId !== id),
        );
      },
    }),
    [categories],
  );

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) {
    throw new Error("useCategories must be used inside CategoriesProvider");
  }
  return ctx;
}
