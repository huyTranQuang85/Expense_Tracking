import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Toast from "react-native-toast-message";

import { api } from "../../services/api";
import { fetchCategories, Category } from "../../services/dashboard";
import { fetchMyWallets, Wallet } from "../../services/wallets";
import { softDeleteTransaction } from "../../services/transactions";
import { useTheme } from "../../theme/ThemeContext";
import { ICON_BY_KEY } from "../../constants/categoryPicker";

type FilterType = "all" | "income" | "expense";

type TxRow = {
  transaction_id?: number | string;
  id?: number | string;
  transactionId?: number | string;
  category_id?: number | string;
  categoryId?: number | string;
  wallet_id?: number | string;
  walletId?: number | string;
  amount?: number;
  description?: string;
  note?: string;
  tx_date?: string;
  date?: string;
  category_name?: string;
  category_type?: "income" | "expense";
  wallet_name?: string;
  type?: "income" | "expense";
};

function fmtMoney(value: number) {
  const n = Math.abs(Number(value || 0));
  try {
    return new Intl.NumberFormat("vi-VN").format(n) + "đ";
  } catch {
    return `${n}đ`;
  }
}

function monthText(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function keyYm(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeEmoji(value: string) {
  return value.replace(/\uFE0F/g, "");
}

function resolveGlyph(raw?: string | null) {
  if (!raw) return null;

  const mapped = ICON_BY_KEY[raw];
  if (mapped) return normalizeEmoji(mapped);

  const text = String(raw);
  if (/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+$/u.test(text)) {
    return normalizeEmoji(text);
  }

  return null;
}

function pickId(tx: TxRow) {
  return tx.transaction_id ?? tx.id ?? tx.transactionId;
}

function pickType(tx: TxRow): "income" | "expense" {
  return (tx.category_type ?? tx.type ?? (Number(tx.amount ?? 0) >= 0 ? "income" : "expense")) as
    | "income"
    | "expense";
}

function safeText(value: any) {
  return String(value ?? "");
}

export default function TransactionManagerScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { mode, colors } = useTheme();
  const isDark = mode === "dark";

  const ui = useMemo(
    () => ({
      bg: colors.bg,
      card: colors.card,
      text: colors.text,
      muted: colors.muted,
      stroke: colors.stroke,
      soft: colors.soft,
      primary: colors.primary,
      danger: colors.danger,
    }),
    [colors]
  );

  const [month, setMonth] = useState(() => new Date());
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<TxRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  const fade = useState(() => new Animated.Value(0))[0];
  const rise = useState(() => new Animated.Value(10))[0];

  const animateIn = useCallback(() => {
    fade.setValue(0);
    rise.setValue(10);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        month: month.getMonth() + 1,
        year: month.getFullYear(),
      };

      if (filterType !== "all") params.type = filterType;
      if (query.trim()) params.q = query.trim();

      const [txRes, cats, ws] = await Promise.all([
        api.get("/api/transactions", { params }).catch(() => null),
        fetchCategories().catch(() => []),
        fetchMyWallets().catch(() => []),
      ]);

      const raw = txRes?.data?.data ?? txRes?.data ?? [];
      setRows(Array.isArray(raw) ? raw : []);
      setCategories(Array.isArray(cats) ? cats : []);
      setWallets(Array.isArray(ws) ? ws : []);
    } finally {
      setLoading(false);
      animateIn();
    }
  }, [animateIn, filterType, month, query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  React.useEffect(() => {
    const id = setTimeout(() => setQuery(queryInput.trim()), 300);
    return () => clearTimeout(id);
  }, [queryInput]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, tx) => {
        const type = pickType(tx);
        const amount = Math.abs(Number(tx.amount ?? 0));
        if (type === "income") acc.income += amount;
        else acc.expense += amount;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [rows]);

  const balance = summary.income - summary.expense;

  const catMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((item) => map.set(String(item.id), item));
    return map;
  }, [categories]);

  const walletMap = useMemo(() => {
    const map = new Map<string, Wallet>();
    wallets.forEach((item) => map.set(String(item.id), item));
    return map;
  }, [wallets]);

  const chips: Array<{ key: FilterType; label: string }> = [
    { key: "all", label: "Tất cả" },
    { key: "income", label: "Thu nhập" },
    { key: "expense", label: "Chi tiêu" },
  ];

  const changeMonth = (offset: number) => {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const goAdd = () => navigation.navigate("AddTransaction");
  const goTrash = () => navigation.navigate("TransactionTrash");
  const goEdit = (tx: TxRow) => navigation.navigate("EditTransaction", { tx });

  const deleteTx = (tx: TxRow) => {
    const id = pickId(tx);
    if (!id) return;

    Alert.alert("Xóa giao dịch", "Bạn có chắc muốn xóa giao dịch này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await softDeleteTransaction(id);
            Toast.show({
              type: "success",
              text1: "Đã chuyển giao dịch vào giỏ rác",
              position: "top",
              topOffset: 60,
            });
            await load();
          } catch (e: any) {
            Toast.show({
              type: "error",
              text1: e?.response?.data?.message ?? "Xóa giao dịch thất bại.",
              position: "top",
              topOffset: 60,
            });
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: ui.bg }]}>
      <View style={{ height: insets.top, backgroundColor: ui.bg }} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: ui.text }]}>Giao dịch</Text>
              <Text style={[styles.subtitle, { color: ui.muted }]}>
                Quản lý giao dịch thu chi theo tháng, lọc nhanh và sửa ngay khi cần.
              </Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                onPress={goTrash}
                style={({ pressed }) => [
                  styles.iconBtn,
                  { backgroundColor: ui.card, borderColor: ui.stroke },
                  shadowStyle(isDark),
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Ionicons name="trash-outline" size={18} color={ui.text} />
              </Pressable>
              <Pressable
                onPress={load}
                style={({ pressed }) => [
                  styles.iconBtn,
                  { backgroundColor: ui.card, borderColor: ui.stroke },
                  shadowStyle(isDark),
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Ionicons name="refresh" size={18} color={ui.text} />
              </Pressable>
            </View>
          </View>

          <LinearGradient
            colors={isDark ? ["#113C2F", "#0A221B"] : ["#34D399", "#0F9F70"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, shadowStyle(isDark)]}
          >
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>Tháng hiện tại</Text>
                <Text style={styles.heroMonth}>{monthText(month)}</Text>
              </View>

              <View style={styles.monthControls}>
                <Pressable onPress={() => changeMonth(-1)} style={styles.monthBtn}>
                  <Ionicons name="chevron-back" size={16} color="#fff" />
                </Pressable>
                <Pressable onPress={() => setMonth(new Date())} style={styles.monthBtn}>
                  <Ionicons name="today-outline" size={16} color="#fff" />
                </Pressable>
                <Pressable onPress={() => changeMonth(1)} style={styles.monthBtn}>
                  <Ionicons name="chevron-forward" size={16} color="#fff" />
                </Pressable>
              </View>
            </View>

            <Text style={styles.heroBalanceLabel}>Số dư giao dịch</Text>
            <Text style={styles.heroBalance}>{balance < 0 ? "-" : ""}{fmtMoney(balance)}</Text>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>Thu nhập</Text>
                <Text style={styles.heroStatValue}>{fmtMoney(summary.income)}</Text>
              </View>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatLabel}>Chi tiêu</Text>
                <Text style={styles.heroStatValue}>{fmtMoney(summary.expense)}</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={[styles.searchBar, { backgroundColor: ui.card, borderColor: ui.stroke }, shadowStyle(isDark)]}>
            <Ionicons name="search" size={18} color={ui.muted} />
            <TextInput
              value={queryInput}
              onChangeText={setQueryInput}
              placeholder="Tìm theo mô tả, danh mục, ví..."
              placeholderTextColor={ui.muted}
              style={[styles.searchInput, { color: ui.text }]}
            />
            {!!queryInput && (
              <Pressable onPress={() => setQueryInput("")} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={ui.muted} />
              </Pressable>
            )}
          </View>

          <View style={styles.chipsRow}>
            {chips.map((chip) => {
              const active = filterType === chip.key;
              return (
                <Pressable
                  key={chip.key}
                  onPress={() => setFilterType(chip.key)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: active ? ui.primary : ui.card,
                      borderColor: active ? ui.primary : ui.stroke,
                      opacity: pressed ? 0.92 : 1,
                    },
                    shadowStyle(isDark),
                  ]}
                >
                  <Text style={[styles.chipText, { color: active ? "#062814" : ui.text }]}>
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.listCard, { backgroundColor: ui.card, borderColor: ui.stroke }, shadowStyle(isDark)]}>
            <View style={styles.listHeader}>
              <View>
                <Text style={[styles.listTitle, { color: ui.text }]}>Danh sách giao dịch</Text>
                <Text style={[styles.listSubtitle, { color: ui.muted }]}>
                  {rows.length} giao dịch trong {monthText(month)}
                </Text>
              </View>

              <Pressable
                onPress={goAdd}
                style={({ pressed }) => [
                  styles.addSmallBtn,
                  { backgroundColor: ui.primary, opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <Ionicons name="add" size={16} color="#052E1B" />
                <Text style={styles.addSmallText}>Thêm</Text>
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator />
                <Text style={[styles.loadingText, { color: ui.muted }]}>Đang tải giao dịch...</Text>
              </View>
            ) : rows.length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={[styles.emptyIconWrap, { backgroundColor: ui.soft }]}>
                  <Ionicons name="receipt-outline" size={28} color={ui.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: ui.text }]}>Chưa có giao dịch</Text>
                <Text style={[styles.emptyText, { color: ui.muted }]}>Hãy thêm giao dịch mới hoặc đổi bộ lọc để xem dữ liệu phù hợp.</Text>

                <View style={styles.emptyActions}>
                  <Pressable
                    onPress={goAdd}
                    style={({ pressed }) => [
                      styles.emptyBtn,
                      { backgroundColor: ui.primary, opacity: pressed ? 0.92 : 1 },
                    ]}
                  >
                    <Text style={styles.emptyBtnText}>Thêm giao dịch</Text>
                  </Pressable>
                  <Pressable
                    onPress={goTrash}
                    style={({ pressed }) => [
                      styles.emptyBtn,
                      {
                        backgroundColor: ui.card,
                        borderColor: ui.stroke,
                        opacity: pressed ? 0.92 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.emptyBtnText, { color: ui.text }]}>Xem giỏ rác</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.itemsWrap}>
                {rows.map((tx) => {
                  const id = pickId(tx);
                  if (id == null) return null;

                  const type = pickType(tx);
                  const amount = Math.abs(Number(tx.amount ?? 0));
                  const amountColor = type === "income" ? "#16A34A" : ui.danger;
                  const category = catMap.get(String(tx.category_id ?? tx.categoryId ?? ""));
                  const wallet = walletMap.get(String(tx.wallet_id ?? tx.walletId ?? ""));
                  const title = String(tx.description || category?.name || tx.category_name || "Giao dịch");
                  const categoryName = String(category?.name || tx.category_name || "Danh mục");
                  const walletName = String(wallet?.name || tx.wallet_name || "Ví");
                  const txDate = tx.tx_date || tx.date || "";
                  const dateLabel = txDate ? new Date(txDate).toLocaleDateString("vi-VN") : "";
                  const glyph = resolveGlyph(category?.icon);

                  return (
                    <View
                      key={String(id)}
                      style={[
                        styles.txCard,
                        { backgroundColor: ui.soft, borderColor: ui.stroke },
                      ]}
                    >
                      <Pressable onPress={() => goEdit(tx)} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
                        <View style={styles.txTopRow}>
                          <View
                            style={[
                              styles.txIcon,
                              {
                                backgroundColor:
                                  type === "income"
                                    ? "rgba(22,163,74,0.14)"
                                    : "rgba(239,68,68,0.14)",
                              },
                            ]}
                          >
                            {glyph ? (
                              <Text style={styles.txGlyph}>{glyph}</Text>
                            ) : (
                              <Ionicons
                                name={type === "income" ? "arrow-up" : "arrow-down"}
                                size={18}
                                color={amountColor}
                              />
                            )}
                          </View>

                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.txTitle, { color: ui.text }]} numberOfLines={1}>
                              {title}
                            </Text>
                            <Text style={[styles.txMeta, { color: ui.muted }]} numberOfLines={2}>
                              {categoryName}{walletName ? ` • ${walletName}` : ""}{dateLabel ? ` • ${dateLabel}` : ""}
                            </Text>
                          </View>

                          <Text style={[styles.txAmount, { color: amountColor }]}> 
                            {type === "income" ? "+" : "-"}{fmtMoney(amount)}
                          </Text>
                        </View>
                      </Pressable>

                      <View style={[styles.txFooter, { borderTopColor: ui.stroke }]}>
                        <View style={styles.txPillsRow}>
                          <View style={[styles.smallPill, { backgroundColor: ui.card, borderColor: ui.stroke }]}>
                            <Text style={[styles.smallPillText, { color: ui.text }]}>{type === "income" ? "Thu nhập" : "Chi tiêu"}</Text>
                          </View>
                          {walletName ? (
                            <View style={[styles.smallPill, { backgroundColor: ui.card, borderColor: ui.stroke }]}>
                              <Text style={[styles.smallPillText, { color: ui.text }]}>{walletName}</Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.actionRow}>
                          <Pressable
                            onPress={() => goEdit(tx)}
                            style={({ pressed }) => [
                              styles.actionBtn,
                              { backgroundColor: ui.card, borderColor: ui.stroke, opacity: pressed ? 0.9 : 1 },
                            ]}
                          >
                            <Ionicons name="create-outline" size={16} color={ui.text} />
                            <Text style={[styles.actionText, { color: ui.text }]}>Sửa</Text>
                          </Pressable>

                          <Pressable
                            onPress={() => deleteTx(tx)}
                            style={({ pressed }) => [
                              styles.actionBtn,
                              {
                                backgroundColor: "rgba(239,68,68,0.12)",
                                borderColor: "rgba(239,68,68,0.22)",
                                opacity: pressed ? 0.9 : 1,
                              },
                            ]}
                          >
                            <Ionicons name="trash-outline" size={16} color={ui.danger} />
                            <Text style={[styles.actionText, { color: ui.danger }]}>Xóa</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      <Pressable
        onPress={goAdd}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: ui.primary, opacity: pressed ? 0.92 : 1 },
          shadowStyle(isDark),
        ]}
      >
        <Ionicons name="add" size={24} color="#052E1B" />
      </Pressable>
    </View>
  );
}

function shadowStyle(isDark: boolean) {
  return isDark
    ? {}
    : {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
      };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  headerActions: { flexDirection: "row", gap: 10 },
  title: { fontFamily: "Faustina_700Bold", fontSize: 30, lineHeight: 34 },
  subtitle: { marginTop: 4, fontFamily: "Faustina_500Medium", fontSize: 14, lineHeight: 20 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: { borderRadius: 28, padding: 18, marginBottom: 14 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  heroLabel: { color: "rgba(255,255,255,0.85)", fontFamily: "Faustina_500Medium", fontSize: 13 },
  heroMonth: { color: "#FFFFFF", fontFamily: "Faustina_700Bold", fontSize: 20, marginTop: 4 },
  monthControls: { flexDirection: "row", gap: 8 },
  monthBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroBalanceLabel: { marginTop: 18, color: "rgba(255,255,255,0.86)", fontFamily: "Faustina_500Medium", fontSize: 13 },
  heroBalance: { marginTop: 2, color: "#FFFFFF", fontFamily: "Faustina_700Bold", fontSize: 30 },
  heroStatsRow: { marginTop: 16, flexDirection: "row", gap: 12 },
  heroStatItem: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  heroStatLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Faustina_500Medium" },
  heroStatValue: { color: "#FFFFFF", fontSize: 18, fontFamily: "Faustina_700Bold", marginTop: 4 },
  searchBar: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontFamily: "Faustina_500Medium", fontSize: 14, paddingVertical: 0 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  chipText: { fontFamily: "Faustina_700Bold", fontSize: 13 },
  listCard: { borderRadius: 28, borderWidth: 1, padding: 14 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 },
  listTitle: { fontFamily: "Faustina_700Bold", fontSize: 20 },
  listSubtitle: { marginTop: 3, fontFamily: "Faustina_500Medium", fontSize: 13 },
  addSmallBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  addSmallText: { color: "#052E1B", fontFamily: "Faustina_700Bold", fontSize: 13 },
  loadingBox: { paddingVertical: 28, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontFamily: "Faustina_500Medium", fontSize: 13 },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 28, paddingHorizontal: 12 },
  emptyIconWrap: { width: 68, height: 68, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { fontFamily: "Faustina_700Bold", fontSize: 20 },
  emptyText: { marginTop: 8, textAlign: "center", fontFamily: "Faustina_500Medium", fontSize: 13.5, lineHeight: 20 },
  emptyActions: { marginTop: 18, flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center" },
  emptyBtn: { minWidth: 140, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, alignItems: "center" },
  emptyBtnText: { fontFamily: "Faustina_700Bold", fontSize: 13.5 },
  itemsWrap: { gap: 12 },
  txCard: { borderRadius: 22, borderWidth: 1, padding: 14 },
  txTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  txIcon: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  txGlyph: { fontSize: 18 },
  txTitle: { fontFamily: "Faustina_700Bold", fontSize: 15 },
  txMeta: { marginTop: 4, fontFamily: "Faustina_500Medium", fontSize: 12.5, lineHeight: 18 },
  txAmount: { marginLeft: 10, fontFamily: "Faustina_700Bold", fontSize: 16 },
  txFooter: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 10 },
  txPillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  smallPillText: { fontFamily: "Faustina_600SemiBold", fontSize: 12 },
  actionRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  actionText: { fontFamily: "Faustina_700Bold", fontSize: 13 },
  fab: { position: "absolute", right: 18, bottom: 18, width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
