import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCategories } from "../categories/CategoriesContext";
import { getChildCategories, getCategoryById, resolveCategoryIcon } from "../categories/categoryFixtures";
import type { RootStackParamList } from "../../../App";
import { useTransactions } from "./TransactionContext";

type Props = NativeStackScreenProps<RootStackParamList, "TransactionList">;

type FilterType = "all" | "income" | "expense";

function formatCurrency(value: number) {
  try {
    return `${new Intl.NumberFormat("vi-VN").format(Math.abs(value || 0))}đ`;
  } catch {
    return `${Math.abs(value || 0)}đ`;
  }
}

function formatDate(value?: string) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("vi-VN");
  } catch {
    return value;
  }
}

export default function TransactionListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const { categories } = useCategories();
  const { transactions, moveToTrash } = useTransactions();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const colors = useMemo(
    () =>
      isDark
        ? {
            bg: "#0B0F14",
            card: "#111827",
            cardSoft: "#172032",
            text: "#F5F7FA",
            muted: "rgba(226,232,240,0.68)",
            stroke: "rgba(148,163,184,0.22)",
            green: "#4EECA5",
            greenSoft: "rgba(78,236,165,0.18)",
            redSoft: "rgba(248,113,113,0.18)",
          }
        : {
            bg: "#F4F6FA",
            card: "#FFFFFF",
            cardSoft: "#F8FAFC",
            text: "#111827",
            muted: "rgba(55,65,81,0.72)",
            stroke: "rgba(15,23,42,0.08)",
            green: "#2EC98E",
            greenSoft: "rgba(78,236,165,0.18)",
            redSoft: "rgba(251,207,213,0.8)",
          },
    [isDark],
  );

  const roots = useMemo(() => {
    const q = query.trim().toLowerCase();

    return [...transactions]
      .filter((item) => {
        if (filter !== "all" && item.type !== filter) return false;
        if (!q) return true;

        const category =
          getCategoryById(item.subCategoryId as string, categories) ??
          getCategoryById(item.categoryId as string, categories);

        return (
          item.description.toLowerCase().includes(q) ||
          category?.name.toLowerCase().includes(q) ||
          item.walletName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [categories, filter, query, transactions]);

  const summary = useMemo(() => {
    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const expense = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [transactions]);

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={{ height: insets.top, backgroundColor: colors.bg }} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Giao dịch</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Quản lý thu nhập, chi tiêu và giao dịch đã xoá
            </Text>
          </View>

          <Pressable
            onPress={() => navigation.navigate("Categories")}
            style={({ pressed }) => [
              styles.ghostBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.stroke,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <Text style={[styles.ghostBtnText, { color: colors.text }]}>Danh mục</Text>
          </Pressable>
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.card }]}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroCaption, { color: colors.muted }]}>
                Tổng quan tháng hiện tại
              </Text>
              <Text style={[styles.heroBalance, { color: colors.text }]}> 
                {formatCurrency(summary.balance)}
              </Text>
            </View>

            <Pressable
              onPress={() => navigation.navigate("AddTransaction")}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: colors.green,
                  opacity: pressed ? 0.86 : 1,
                },
              ]}
            >
              <Text style={styles.primaryBtnText}>Thêm giao dịch</Text>
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: colors.cardSoft }]}>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Thu nhập</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(summary.income)}
              </Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.cardSoft }]}>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Chi tiêu</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(summary.expense)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.searchCard, { backgroundColor: colors.card }]}>
          <View
            style={[
              styles.searchBox,
              { backgroundColor: colors.cardSoft, borderColor: colors.stroke },
            ]}
          >
            <Ionicons name="search-outline" size={20} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm giao dịch"
              placeholderTextColor={colors.muted}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>

          <View style={styles.tabRow}>
            {(["all", "income", "expense"] as FilterType[]).map((item) => {
              const active = filter === item;
              const label =
                item === "all" ? "Tất cả" : item === "income" ? "Thu nhập" : "Chi tiêu";
              return (
                <Pressable
                  key={item}
                  onPress={() => setFilter(item)}
                  style={({ pressed }) => [
                    styles.tabBtn,
                    {
                      backgroundColor: active
                        ? item === "expense"
                          ? colors.redSoft
                          : colors.greenSoft
                        : colors.cardSoft,
                      borderColor: active ? colors.green : colors.stroke,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.tabText, { color: colors.text }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.listCard, { backgroundColor: colors.card }]}>
          <View style={styles.listHeader}>
            <Text style={[styles.listTitle, { color: colors.text }]}>Danh sách giao dịch</Text>
            <Pressable
              onPress={() => navigation.navigate("TransactionTrash")}
              hitSlop={10}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Ionicons name="trash-outline" size={20} color={colors.muted} />
            </Pressable>
          </View>

          {roots.length > 0 ? (
            roots.map((item) => {
              const category =
                getCategoryById(item.subCategoryId as string, categories) ??
                getCategoryById(item.categoryId as string, categories);
              const rootCategory = getCategoryById(item.categoryId as string, categories);
              const childCount = rootCategory
                ? getChildCategories(rootCategory.id, categories).length
                : 0;

              const amountColor = item.type === "expense" ? "#EF4444" : "#16A34A";
              const sign = item.type === "expense" ? "-" : "+";

              return (
                <Pressable
                  key={item.id}
                  onPress={() => navigation.navigate("EditTransaction", { tx: item })}
                  style={({ pressed }) => [
                    styles.txCard,
                    {
                      backgroundColor: colors.cardSoft,
                      borderColor: colors.stroke,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={[styles.txIcon, { backgroundColor: rootCategory?.color || colors.green }]}>
                    <Text style={styles.txEmoji}>
                      {resolveCategoryIcon(rootCategory?.iconKey)}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.description || "Giao dịch mới"}
                    </Text>
                    <Text style={[styles.txSub, { color: colors.muted }]} numberOfLines={1}>
                      {(category?.name || rootCategory?.name || "Danh mục") +
                        (childCount > 0 && category?.id === rootCategory?.id
                          ? ` • ${childCount} danh mục con`
                          : "")}
                      {item.walletName ? ` • ${item.walletName}` : ""}
                      {item.date ? ` • ${formatDate(item.date)}` : ""}
                    </Text>
                  </View>

                  <View style={styles.txActions}>
                    <Text style={[styles.txAmount, { color: amountColor }]}>
                      {sign}
                      {formatCurrency(item.amount)}
                    </Text>

                    <View style={styles.iconActions}>
                      <Pressable
                        onPress={() => navigation.navigate("EditTransaction", { tx: item })}
                        hitSlop={8}
                      >
                        <Ionicons name="create-outline" size={18} color={colors.muted} />
                      </Pressable>
                      <Pressable
                        onPress={() => moveToTrash(item.id)}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.greenSoft }]}>
                <Ionicons name="wallet-outline" size={28} color={colors.green} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Chưa có giao dịch</Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>
                Bấm “Thêm giao dịch” để tạo bản ghi đầu tiên.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  title: { fontFamily: "Faustina_700Bold", fontSize: 24 },
  subtitle: { marginTop: 4, fontFamily: "Faustina_400Regular", fontSize: 13 },
  ghostBtn: {
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: "center",
  },
  ghostBtnText: { fontFamily: "Faustina_700Bold", fontSize: 13 },
  heroCard: {
    marginTop: 16,
    borderRadius: 22,
    padding: 16,
  },
  heroTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroCaption: { fontFamily: "Faustina_500Medium", fontSize: 12 },
  heroBalance: { marginTop: 4, fontFamily: "Faustina_700Bold", fontSize: 28 },
  primaryBtn: {
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryBtnText: { fontFamily: "Faustina_700Bold", color: "#0E1B13", fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  statBox: { flex: 1, borderRadius: 16, padding: 12 },
  statLabel: { fontFamily: "Faustina_500Medium", fontSize: 12 },
  statValue: { marginTop: 6, fontFamily: "Faustina_700Bold", fontSize: 14 },
  searchCard: { marginTop: 14, borderRadius: 20, padding: 14 },
  searchBox: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchInput: { flex: 1, fontFamily: "Faustina_500Medium", fontSize: 13 },
  tabRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  tabBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  tabText: { fontFamily: "Faustina_700Bold", fontSize: 13 },
  listCard: { marginTop: 14, borderRadius: 20, padding: 14 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listTitle: { fontFamily: "Faustina_700Bold", fontSize: 16 },
  txCard: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  txEmoji: { fontSize: 18 },
  txTitle: { fontFamily: "Faustina_700Bold", fontSize: 14 },
  txSub: { marginTop: 4, fontFamily: "Faustina_400Regular", fontSize: 11.5 },
  txActions: { alignItems: "flex-end", gap: 8 },
  txAmount: { fontFamily: "Faustina_700Bold", fontSize: 14 },
  iconActions: { flexDirection: "row", gap: 12 },
  emptyWrap: { alignItems: "center", paddingVertical: 28 },
  emptyIcon: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginTop: 12, fontFamily: "Faustina_700Bold", fontSize: 16 },
  emptySub: { marginTop: 6, fontFamily: "Faustina_400Regular", fontSize: 12, textAlign: "center", maxWidth: 240 },
});
