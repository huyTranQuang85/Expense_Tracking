import { CATEGORY_COLORS, CATEGORY_ICONS } from "../../constants/categoryPicker";

export type CategoryType = "income" | "expense";

export type CategoryNode = {
  id: string;
  name: string;
  type: CategoryType;
  iconKey: string;
  color: string;
  parentId: string | null;
  description: string;
  isLocked?: boolean;
};

export const CATEGORY_FIXTURES: CategoryNode[] = [
  {
    id: "freelance",
    name: "Freelance",
    type: "income",
    iconKey: "resume",
    color: "#1F7A6B",
    parentId: null,
    description: "0 danh mục con",
  },
  {
    id: "an-uong",
    name: "Ăn uống",
    type: "expense",
    iconKey: "bibimbap",
    color: "#C97A1E",
    parentId: null,
    description: "1 danh mục con",
  },
  {
    id: "an-sang",
    name: "Ăn sáng",
    type: "expense",
    iconKey: "coffee",
    color: "#D97706",
    parentId: "an-uong",
    description: "Danh mục con của Ăn uống",
    isLocked: false,
  },
];

const normalizeEmoji = (s: string) => s.replace(/\uFE0F/g, "");

const iconByIndex = (index: number) =>
  CATEGORY_ICONS[index % CATEGORY_ICONS.length]?.icon ?? "📁";

const colorByIndex = (index: number) =>
  CATEGORY_COLORS[index % CATEGORY_COLORS.length] ?? "#4EECA5";

export function resolveCategoryIcon(iconKey?: string | null) {
  if (!iconKey) return "📁";

  const legacy = CATEGORY_ICONS.find((item) => item.key === iconKey);
  if (legacy) return normalizeEmoji(legacy.icon);

  const iconIndex = CATEGORY_ICONS.findIndex((item) => item.key === iconKey);
  return normalizeEmoji(iconByIndex(iconIndex >= 0 ? iconIndex : 0));
}

export function getCategoryById(
  categoryId?: string | null,
  source: CategoryNode[] = CATEGORY_FIXTURES,
) {
  if (!categoryId) return null;
  return source.find((item) => item.id === categoryId) ?? null;
}

export function getRootCategories(
  type?: CategoryType,
  source: CategoryNode[] = CATEGORY_FIXTURES,
) {
  return source.filter(
    (item) => item.parentId === null && (!type || item.type === type),
  );
}

export function getChildCategories(
  parentId?: string | null,
  source: CategoryNode[] = CATEGORY_FIXTURES,
) {
  if (!parentId) return [];
  return source.filter((item) => item.parentId === parentId);
}

export function getAvailableIconItems() {
  return CATEGORY_ICONS;
}

export function getAvailableColorItems() {
  return CATEGORY_COLORS;
}

export function getDemoStats(source: CategoryNode[] = CATEGORY_FIXTURES) {
  return {
    totalRoots: source.filter((item) => item.parentId === null).length,
    incomeRoots: getRootCategories("income", source).length,
    expenseRoots: getRootCategories("expense", source).length,
  };
}

export function createTempCategoryId(name: string) {
  return `${name.trim().toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
}

export function buildCategoryDescription(childCount: number) {
  return `${childCount} danh mục con`;
}

export function buildNextCategoryPreview(
  name: string,
  type: CategoryType,
  parentId: string | null,
  iconKey: string,
  color: string,
): CategoryNode {
  return {
    id: createTempCategoryId(name || "category"),
    name: name || "Danh mục mới",
    type,
    iconKey,
    color,
    parentId,
    description: parentId ? "Danh mục con mới" : "Danh mục cấp cao",
  };
}

export function normalizeCategoryType(value: string): CategoryType {
  return value === "income" ? "income" : "expense";
}

export function nextIndexColor(index: number) {
  return colorByIndex(index);
}

export function nextIndexIcon(index: number) {
  return iconByIndex(index);
}
