import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
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

import { fetchCategories, Category } from "../../services/dashboard";
import { fetchMyWallets, Wallet } from "../../services/wallets";
import {
  createRecurringRule,
  createTransaction,
  createTransfer,
  fetchTransactions,
  softDeleteTransaction,
} from "../../services/transactions";
import { useTheme } from "../../theme/ThemeContext";
import { SearchBar, SegmentedControl, Button } from "../../components/ui";
import SelectModal from "../../components/SelectModal";

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
  transfer_id?: number | string | null;
  transfer_direction?: "in" | "out" | null;
  from_wallet_name?: string | null;
  to_wallet_name?: string | null;
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

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ymdLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function monthRange(date: Date) {
  const from = new Date(date.getFullYear(), date.getMonth(), 1);
  const to = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { fromDate: ymdLocal(from), toDate: ymdLocal(to) };
}

function transactionIcon(
  type: "income" | "expense",
  categoryName: string,
): keyof typeof Ionicons.glyphMap {
  const name = categoryName.toLowerCase();
  if (type === "income") {
    if (name.includes("lương")) return "briefcase-outline";
    if (name.includes("thưởng")) return "sparkles-outline";
    if (name.includes("đầu tư")) return "trending-up-outline";
    return "arrow-down-circle-outline";
  }

  if (name.includes("ăn") || name.includes("uống")) return "restaurant-outline";
  if (name.includes("mua") || name.includes("shopping")) return "bag-outline";
  if (name.includes("nhà") || name.includes("thuê")) return "home-outline";
  if (name.includes("xe") || name.includes("xăng") || name.includes("di chuyển")) return "car-outline";
  if (name.includes("sức") || name.includes("thuốc")) return "medkit-outline";
  if (name.includes("học")) return "school-outline";
  return "arrow-up-circle-outline";
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

function formatDateLabel(raw: string) {
  if (!raw || raw === "unknown") return "Khong ro ngay";
  try {
    return new Date(raw + "T00:00:00").toLocaleDateString("vi-VN", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return raw;
  }
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
  const [filterWalletId, setFilterWalletId] = useState<any>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<any>(null);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [picker, setPicker] = useState<
    null | "filterWallet" | "filterCategory" | "transferFrom" | "transferTo"
  >(null);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferDraft, setTransferDraft] = useState({
    fromWalletId: null as any,
    toWalletId: null as any,
    amountText: "",
    date: isoToday(),
    description: "",
  });

  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringDraft, setRecurringDraft] = useState({
    intervalUnit: "monthly" as "daily" | "weekly" | "monthly" | "yearly",
    intervalCount: "1",
    startDate: isoToday(),
    endDate: "",
  });
  const [selectedTx, setSelectedTx] = useState<TxRow | null>(null);

  const fade = useState(() => new Animated.Value(0))[0];
  const rise = useState(() => new Animated.Value(10))[0];

  const { fromDate, toDate } = useMemo(() => monthRange(month), [month]);
  const activeFromDate = rangeFrom || fromDate;
  const activeToDate = rangeTo || toDate;

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
      const [txs, cats, ws] = await Promise.all([
        fetchTransactions({
          fromDate: activeFromDate,
          toDate: activeToDate,
          walletId: filterWalletId || undefined,
          categoryId: filterCategoryId || undefined,
          type: filterType === "all" ? undefined : filterType,
          q: query.trim() || undefined,
        }).catch(() => []),
        fetchCategories().catch(() => []),
        fetchMyWallets({ includeArchived: true }).catch(() => []),
      ]);

      setRows(Array.isArray(txs) ? (txs as TxRow[]) : []);
      setCategories(Array.isArray(cats) ? cats : []);
      setWallets(Array.isArray(ws) ? ws : []);
    } finally {
      setLoading(false);
      animateIn();
    }
  }, [
    activeFromDate,
    activeToDate,
    animateIn,
    filterCategoryId,
    filterType,
    filterWalletId,
    query,
  ]);

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

  const walletItems = useMemo(
    () =>
      wallets.map((w) => ({
        label: w.name,
        value: w.id,
        subLabel: w.type ? `Loai: ${w.type}` : undefined,
      })),
    [wallets]
  );

  const categoryItems = useMemo(
    () =>
      categories
        .filter((c) => !c.parentCategoryId)
        .map((c) => ({ label: c.name, value: c.id })),
    [categories]
  );

  const filterWalletLabel = useMemo(() => {
    if (!filterWalletId) return "Tat ca vi";
    return walletItems.find((w) => String(w.value) === String(filterWalletId))?.label || "Tat ca vi";
  }, [filterWalletId, walletItems]);

  const filterCategoryLabel = useMemo(() => {
    if (!filterCategoryId) return "Tat ca danh muc";
    return categoryItems.find((c) => String(c.value) === String(filterCategoryId))?.label || "Tat ca danh muc";
  }, [filterCategoryId, categoryItems]);

  const groupedRows = useMemo(() => {
    const groups = new Map<string, TxRow[]>();
    rows.forEach((tx) => {
      const raw = tx.tx_date || tx.date || "";
      const key = raw ? raw.slice(0, 10) : "unknown";
      const arr = groups.get(key) ?? [];
      arr.push(tx);
      groups.set(key, arr);
    });

    return Array.from(groups.entries()).sort((a, b) =>
      String(b[0]).localeCompare(String(a[0]))
    );
  }, [rows]);

  const chips: Array<{ key: FilterType; label: string }> = [
    { key: "all", label: "Tất cả" },
    { key: "income", label: "Thu nhập" },
    { key: "expense", label: "Chi tiêu" },
  ];

  const intervalItems = [
    { key: "daily", label: "Hang ngay" },
    { key: "weekly", label: "Hang tuan" },
    { key: "monthly", label: "Hang thang" },
    { key: "yearly", label: "Hang nam" },
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

  const duplicateTx = async (tx: TxRow) => {
    if (tx.transfer_id) {
      Toast.show({ type: "info", text1: "Khong the nhan ban giao dich chuyen tien" });
      return;
    }

    try {
      await createTransaction({
        type: pickType(tx),
        amount: Math.abs(Number(tx.amount ?? 0)),
        categoryId: tx.category_id ?? tx.categoryId ?? null,
        walletId: tx.wallet_id ?? tx.walletId ?? null,
        date: isoToday(),
        description: String(tx.description ?? tx.note ?? "").trim(),
      });
      Toast.show({ type: "success", text1: "Da nhan ban giao dich" });
      await load();
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: e?.response?.data?.message ?? "Nhan ban that bai",
      });
    }
  };

  const openRecurring = (tx: TxRow) => {
    setSelectedTx(tx);
    setRecurringDraft((prev) => ({
      ...prev,
      startDate: tx.tx_date || tx.date || isoToday(),
    }));
    setRecurringOpen(true);
  };

  const submitRecurring = async () => {
    if (!selectedTx) return;
    try {
      await createRecurringRule({
        categoryId: selectedTx.category_id ?? selectedTx.categoryId,
        walletId: selectedTx.wallet_id ?? selectedTx.walletId,
        amount: Math.abs(Number(selectedTx.amount ?? 0)),
        description: String(selectedTx.description ?? selectedTx.note ?? "").trim(),
        intervalUnit: recurringDraft.intervalUnit,
        intervalCount: Number(recurringDraft.intervalCount || "1"),
        startDate: recurringDraft.startDate,
        endDate: recurringDraft.endDate || null,
      });
      Toast.show({ type: "success", text1: "Da tao giao dich lap" });
      setRecurringOpen(false);
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: e?.response?.data?.message ?? "Khong tao duoc giao dich lap",
      });
    }
  };

  const openTransfer = () => {
    if (!wallets.length) return;
    const [first, second] = wallets;
    setTransferDraft((prev) => ({
      ...prev,
      fromWalletId: prev.fromWalletId ?? first?.id ?? null,
      toWalletId: prev.toWalletId ?? second?.id ?? first?.id ?? null,
      date: prev.date || isoToday(),
    }));
    setTransferOpen(true);
  };

  const submitTransfer = async () => {
    const amount = Number((transferDraft.amountText || "").replace(/[^\d]/g, ""));
    if (!transferDraft.fromWalletId || !transferDraft.toWalletId || !amount) {
      Toast.show({ type: "info", text1: "Vui long nhap du thong tin" });
      return;
    }

    try {
      await createTransfer({
        fromWalletId: transferDraft.fromWalletId,
        toWalletId: transferDraft.toWalletId,
        amount,
        description: transferDraft.description,
        txDate: transferDraft.date,
      });
      Toast.show({ type: "success", text1: "Da chuyen tien" });
      setTransferOpen(false);
      setTransferDraft({
        fromWalletId: null,
        toWalletId: null,
        amountText: "",
        date: isoToday(),
        description: "",
      });
      await load();
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: e?.response?.data?.message ?? "Chuyen tien that bai",
      });
    }
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
                onPress={() => setAdvancedOpen(true)}
                style={({ pressed }) => [
                  styles.iconBtn,
                  { backgroundColor: ui.card, borderColor: ui.stroke },
                  shadowStyle(isDark),
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Ionicons name="options-outline" size={18} color={ui.text} />
              </Pressable>
              <Pressable
                onPress={openTransfer}
                style={({ pressed }) => [
                  styles.iconBtn,
                  { backgroundColor: ui.card, borderColor: ui.stroke },
                  shadowStyle(isDark),
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Ionicons name="swap-horizontal" size={18} color={ui.text} />
              </Pressable>
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
            colors={isDark ? ["#113C2F", "#0A221B"] : ["#10B981", "#047857"]}
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

          <SearchBar
            value={queryInput}
            onChangeText={setQueryInput}
            onClear={() => setQueryInput("")}
            placeholder="Tìm theo mô tả, danh mục, ví..."
          />

          <View style={{ marginTop: 12, marginBottom: 12 }}>
            <SegmentedControl
              items={chips.map((chip) => ({ key: chip.key, label: chip.label }))}
              value={filterType}
              onChange={(key) => setFilterType(key as FilterType)}
            />
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
                {groupedRows.map(([groupDate, list]) => (
                  <View key={groupDate} style={styles.groupBlock}>
                    <Text style={[styles.groupTitle, { color: ui.muted }]}>
                      {formatDateLabel(groupDate)}
                    </Text>

                    {list.map((tx) => {
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
                      const txIcon = transactionIcon(type, categoryName);
                      const isTransfer = Boolean(tx.transfer_id);
                      const transferLabel = tx.transfer_direction === "out"
                        ? `Chuyen toi ${tx.to_wallet_name ?? "vi"}`
                        : tx.transfer_direction === "in"
                        ? `Nhan tu ${tx.from_wallet_name ?? "vi"}`
                        : "Chuyen tien";

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
                              <LinearGradient
                                colors={
                                  type === "income"
                                    ? ["rgba(16,185,129,0.95)", "rgba(5,150,105,0.86)"]
                                    : ["rgba(239,68,68,0.95)", "rgba(249,115,22,0.86)"]
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.txIcon}
                              >
                                <Ionicons name={txIcon} size={21} color="#FFFFFF" />
                              </LinearGradient>

                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={[styles.txTitle, { color: ui.text }]} numberOfLines={1}>
                                  {title}
                                </Text>
                                <Text style={[styles.txMeta, { color: ui.muted }]} numberOfLines={2}>
                                  {categoryName}{walletName ? ` • ${walletName}` : ""}
                                </Text>
                                {isTransfer ? (
                                  <Text style={[styles.txMeta, { color: ui.muted }]} numberOfLines={1}>
                                    {transferLabel}
                                  </Text>
                                ) : null}
                              </View>

                              <Text style={[styles.txAmount, { color: amountColor }]}> 
                                {type === "income" ? "+" : "-"}{fmtMoney(amount)}
                              </Text>
                            </View>
                          </Pressable>

                          <View style={[styles.txFooter, { borderTopColor: ui.stroke }]}>
                            <View style={styles.txPillsRow}>
                              <View style={[styles.smallPill, { backgroundColor: ui.card, borderColor: ui.stroke }]}>
                                <Text style={[styles.smallPillText, { color: ui.text }]}>{type === "income" ? "Thu nhap" : "Chi tieu"}</Text>
                              </View>
                              {walletName ? (
                                <View style={[styles.smallPill, { backgroundColor: ui.card, borderColor: ui.stroke }]}>
                                  <Text style={[styles.smallPillText, { color: ui.text }]}>{walletName}</Text>
                                </View>
                              ) : null}
                              {isTransfer ? (
                                <View style={[styles.smallPill, { backgroundColor: ui.card, borderColor: ui.stroke }]}>
                                  <Text style={[styles.smallPillText, { color: ui.text }]}>Chuyen tien</Text>
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
                                <Text style={[styles.actionText, { color: ui.text }]}>Sua</Text>
                              </Pressable>

                              <Pressable
                                onPress={() => duplicateTx(tx)}
                                style={({ pressed }) => [
                                  styles.actionBtn,
                                  { backgroundColor: ui.card, borderColor: ui.stroke, opacity: pressed ? 0.9 : 1 },
                                ]}
                              >
                                <Ionicons name="copy-outline" size={16} color={ui.text} />
                                <Text style={[styles.actionText, { color: ui.text }]}>Nhan ban</Text>
                              </Pressable>

                              <Pressable
                                onPress={() => openRecurring(tx)}
                                style={({ pressed }) => [
                                  styles.actionBtn,
                                  { backgroundColor: ui.card, borderColor: ui.stroke, opacity: pressed ? 0.9 : 1 },
                                ]}
                              >
                                <Ionicons name="repeat" size={16} color={ui.text} />
                                <Text style={[styles.actionText, { color: ui.text }]}>Lap lai</Text>
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
                                <Text style={[styles.actionText, { color: ui.danger }]}>Xoa</Text>
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      <Modal
        visible={advancedOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAdvancedOpen(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: "rgba(15,23,42,0.55)" }]}
          onPress={() => setAdvancedOpen(false)}
        >
          <Pressable
            onPress={() => {}}
            style={[styles.modalCard, { backgroundColor: ui.card, borderColor: ui.stroke }]}
          >
            <Text style={[styles.modalTitle, { color: ui.text }]}>Bo loc nang cao</Text>
            <Text style={[styles.modalSubtitle, { color: ui.muted }]}
              >
              Loc theo vi, danh muc va khoang ngay
            </Text>

            <Pressable
              onPress={() => setPicker("filterWallet")}
              style={[styles.modalField, { borderColor: ui.stroke, backgroundColor: ui.soft }]}
            >
              <Text style={[styles.modalFieldLabel, { color: ui.muted }]}>Vi</Text>
              <Text style={[styles.modalFieldValue, { color: ui.text }]}>{filterWalletLabel}</Text>
            </Pressable>

            <Pressable
              onPress={() => setPicker("filterCategory")}
              style={[styles.modalField, { borderColor: ui.stroke, backgroundColor: ui.soft }]}
            >
              <Text style={[styles.modalFieldLabel, { color: ui.muted }]}>Danh muc</Text>
              <Text style={[styles.modalFieldValue, { color: ui.text }]}>{filterCategoryLabel}</Text>
            </Pressable>

            <View style={styles.modalRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalFieldLabel, { color: ui.muted }]}>Tu ngay</Text>
                <TextInput
                  value={rangeFrom}
                  onChangeText={setRangeFrom}
                  placeholder={fromDate}
                  placeholderTextColor={ui.muted}
                  style={[styles.modalInput, { color: ui.text, borderColor: ui.stroke, backgroundColor: ui.soft }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalFieldLabel, { color: ui.muted }]}>Den ngay</Text>
                <TextInput
                  value={rangeTo}
                  onChangeText={setRangeTo}
                  placeholder={toDate}
                  placeholderTextColor={ui.muted}
                  style={[styles.modalInput, { color: ui.text, borderColor: ui.stroke, backgroundColor: ui.soft }]}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Reset"
                variant="secondary"
                onPress={() => {
                  setFilterWalletId(null);
                  setFilterCategoryId(null);
                  setRangeFrom("");
                  setRangeTo("");
                }}
                fullWidth
              />
              <Button
                title="Ap dung"
                onPress={() => {
                  setAdvancedOpen(false);
                  load();
                }}
                fullWidth
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={transferOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTransferOpen(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: "rgba(15,23,42,0.55)" }]}
          onPress={() => setTransferOpen(false)}
        >
          <Pressable
            onPress={() => {}}
            style={[styles.modalCard, { backgroundColor: ui.card, borderColor: ui.stroke }]}
          >
            <Text style={[styles.modalTitle, { color: ui.text }]}>Chuyen tien giua vi</Text>
            <Text style={[styles.modalSubtitle, { color: ui.muted }]}
              >
              Nhap so tien va chon vi nguon/vi nhan
            </Text>

            <Pressable
              onPress={() => setPicker("transferFrom")}
              style={[styles.modalField, { borderColor: ui.stroke, backgroundColor: ui.soft }]}
            >
              <Text style={[styles.modalFieldLabel, { color: ui.muted }]}>Tu vi</Text>
              <Text style={[styles.modalFieldValue, { color: ui.text }]}
                >
                {walletItems.find((w) => String(w.value) === String(transferDraft.fromWalletId))?.label || "Chon vi"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setPicker("transferTo")}
              style={[styles.modalField, { borderColor: ui.stroke, backgroundColor: ui.soft }]}
            >
              <Text style={[styles.modalFieldLabel, { color: ui.muted }]}>Den vi</Text>
              <Text style={[styles.modalFieldValue, { color: ui.text }]}
                >
                {walletItems.find((w) => String(w.value) === String(transferDraft.toWalletId))?.label || "Chon vi"}
              </Text>
            </Pressable>

            <Text style={[styles.modalFieldLabel, { color: ui.muted }]}>So tien</Text>
            <TextInput
              value={transferDraft.amountText}
              onChangeText={(value) =>
                setTransferDraft((prev) => ({
                  ...prev,
                  amountText: value.replace(/[^\d]/g, ""),
                }))
              }
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor={ui.muted}
              style={[styles.modalInput, { color: ui.text, borderColor: ui.stroke, backgroundColor: ui.soft }]}
            />

            <Text style={[styles.modalFieldLabel, { color: ui.muted }]}>Ngay</Text>
            <TextInput
              value={transferDraft.date}
              onChangeText={(value) => setTransferDraft((prev) => ({ ...prev, date: value }))}
              placeholder={isoToday()}
              placeholderTextColor={ui.muted}
              style={[styles.modalInput, { color: ui.text, borderColor: ui.stroke, backgroundColor: ui.soft }]}
            />

            <Text style={[styles.modalFieldLabel, { color: ui.muted }]}>Ghi chu</Text>
            <TextInput
              value={transferDraft.description}
              onChangeText={(value) => setTransferDraft((prev) => ({ ...prev, description: value }))}
              placeholder="Vi du: Chuyen vi cho chi tieu"
              placeholderTextColor={ui.muted}
              style={[styles.modalInput, { color: ui.text, borderColor: ui.stroke, backgroundColor: ui.soft }]}
            />

            <View style={styles.modalActions}>
              <Button
                title="Huy"
                variant="secondary"
                onPress={() => setTransferOpen(false)}
                fullWidth
              />
              <Button title="Chuyen tien" onPress={submitTransfer} fullWidth />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={recurringOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRecurringOpen(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: "rgba(15,23,42,0.55)" }]}
          onPress={() => setRecurringOpen(false)}
        >
          <Pressable
            onPress={() => {}}
            style={[styles.modalCard, { backgroundColor: ui.card, borderColor: ui.stroke }]}
          >
            <Text style={[styles.modalTitle, { color: ui.text }]}>Lap lai giao dich</Text>
            <Text style={[styles.modalSubtitle, { color: ui.muted }]}
              >
              Tao quy tac lap cho giao dich dang chon
            </Text>

            <View style={{ marginBottom: 12 }}>
              <SegmentedControl
                items={intervalItems}
                value={recurringDraft.intervalUnit}
                onChange={(key) =>
                  setRecurringDraft((prev) => ({
                    ...prev,
                    intervalUnit: key as any,
                  }))
                }
              />
            </View>

            <Text style={[styles.modalFieldLabel, { color: ui.muted }]}>Chu ky</Text>
            <TextInput
              value={recurringDraft.intervalCount}
              onChangeText={(value) =>
                setRecurringDraft((prev) => ({
                  ...prev,
                  intervalCount: value.replace(/[^\d]/g, ""),
                }))
              }
              placeholder="1"
              keyboardType="numeric"
              placeholderTextColor={ui.muted}
              style={[styles.modalInput, { color: ui.text, borderColor: ui.stroke, backgroundColor: ui.soft }]}
            />

            <View style={styles.modalRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalFieldLabel, { color: ui.muted }]}>Bat dau</Text>
                <TextInput
                  value={recurringDraft.startDate}
                  onChangeText={(value) =>
                    setRecurringDraft((prev) => ({ ...prev, startDate: value }))
                  }
                  placeholder={isoToday()}
                  placeholderTextColor={ui.muted}
                  style={[styles.modalInput, { color: ui.text, borderColor: ui.stroke, backgroundColor: ui.soft }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalFieldLabel, { color: ui.muted }]}>Ket thuc</Text>
                <TextInput
                  value={recurringDraft.endDate}
                  onChangeText={(value) =>
                    setRecurringDraft((prev) => ({ ...prev, endDate: value }))
                  }
                  placeholder="(tuy chon)"
                  placeholderTextColor={ui.muted}
                  style={[styles.modalInput, { color: ui.text, borderColor: ui.stroke, backgroundColor: ui.soft }]}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Huy"
                variant="secondary"
                onPress={() => setRecurringOpen(false)}
                fullWidth
              />
              <Button title="Tao lap" onPress={submitRecurring} fullWidth />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <SelectModal
        visible={picker === "filterWallet"}
        title="Chon vi"
        items={[{ label: "Tat ca vi", value: null }, ...walletItems]}
        selectedValue={filterWalletId}
        onClose={() => setPicker(null)}
        onPick={(value) => {
          setFilterWalletId(value || null);
          setPicker(null);
        }}
      />

      <SelectModal
        visible={picker === "filterCategory"}
        title="Chon danh muc"
        items={[{ label: "Tat ca danh muc", value: null }, ...categoryItems]}
        selectedValue={filterCategoryId}
        onClose={() => setPicker(null)}
        onPick={(value) => {
          setFilterCategoryId(value || null);
          setPicker(null);
        }}
      />

      <SelectModal
        visible={picker === "transferFrom"}
        title="Chon vi nguon"
        items={walletItems}
        selectedValue={transferDraft.fromWalletId}
        onClose={() => setPicker(null)}
        onPick={(value) => {
          setTransferDraft((prev) => ({ ...prev, fromWalletId: value }));
          setPicker(null);
        }}
      />

      <SelectModal
        visible={picker === "transferTo"}
        title="Chon vi nhan"
        items={walletItems}
        selectedValue={transferDraft.toWalletId}
        onClose={() => setPicker(null)}
        onPick={(value) => {
          setTransferDraft((prev) => ({ ...prev, toWalletId: value }));
          setPicker(null);
        }}
      />

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
  hero: { borderRadius: 30, padding: 20, marginBottom: 14 },
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
  txCard: { borderRadius: 24, borderWidth: 1, padding: 14 },
  txTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  txIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  txTitle: { fontFamily: "Faustina_700Bold", fontSize: 15.5 },
  txMeta: { marginTop: 4, fontFamily: "Faustina_500Medium", fontSize: 12.5, lineHeight: 18 },
  txAmount: { marginLeft: 10, fontFamily: "Faustina_700Bold", fontSize: 16.5 },
  txFooter: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 10 },
  txPillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  smallPillText: { fontFamily: "Faustina_600SemiBold", fontSize: 12 },
  actionRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  actionText: { fontFamily: "Faustina_700Bold", fontSize: 13 },
  fab: { position: "absolute", right: 18, bottom: 18, width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
