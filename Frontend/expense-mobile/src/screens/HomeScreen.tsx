// src/screens/HomeScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../theme/ThemeContext";
import { fetchCurrentBudgetAutoCarry } from "../services/budgets";
import {
  fetchCategories,
  fetchMe,
  fetchTransactions,
  pickCategoryColor,
  Category,
  Transaction,
} from "../services/dashboard";
import { ICON_BY_KEY } from "../constants/categoryPicker";
import PieChart from "../components/charts/PieChart";
import BarChart from "../components/charts/BarChart";

const normalizeEmoji = (s: string) => s.replace(/\uFE0F/g, "");
const isProbablyEmoji = (s: string) =>
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s);

const resolveIconText = (raw?: string | null) => {
  if (!raw) return null;
  const mapped = ICON_BY_KEY[raw];
  if (mapped) return normalizeEmoji(mapped);
  const s = String(raw);
  if (isProbablyEmoji(s)) return normalizeEmoji(s);
  return null;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";

function normalizeAvatarUri(src?: string | null) {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("/")) return `${API_BASE_URL}${src}`;
  return src;
}

function getInitials(name: string) {
  const s = (name || "").trim();
  if (!s) return "BF";
  return s.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

const GREEN = "#10B981";

function fmtVnd(n: number) {
  const abs = Math.abs(Number(n || 0));
  try {
    return new Intl.NumberFormat("vi-VN").format(abs) + "đ";
  } catch {
    return `${abs}đ`;
  }
}

function monthLabel(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${yyyy}`;
}

function ymdLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function monthRange(d: Date) {
  const from = new Date(d.getFullYear(), d.getMonth(), 1);
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { fromDate: ymdLocal(from), toDate: ymdLocal(to) };
}

type TxNorm = Transaction & { _type: "income" | "expense"; _abs: number };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { mode, colors } = useTheme();
  const isDark = mode === "dark";

  const ui = useMemo(
    () => ({
      bg: colors.bg, card: colors.card, soft: colors.soft,
      track: colors.track, stroke: colors.stroke, text: colors.text, muted: colors.muted,
    }),
    [colors, isDark],
  );

  const shadow = isDark ? {} : styles.shadow;

  const [month, setMonth] = useState(() => new Date());
  const [monthModal, setMonthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState<any>(null);
  const [q, setQ] = useState("");

  const { fromDate, toDate } = useMemo(() => monthRange(month), [month]);
  const monthStr = useMemo(() => monthLabel(month), [month]);

  const catMap = useMemo(() => {
    const map = new Map<any, { name: string; color: string; icon?: string }>();
    categories.forEach((c, idx) => {
      map.set(c.id, { name: c.name, color: pickCategoryColor(c, idx), icon: c.icon });
    });
    return map;
  }, [categories]);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(10)).current;
  const heroPop = useRef(new Animated.Value(0)).current;
  const prog = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    fade.setValue(0);
    rise.setValue(10);
    heroPop.setValue(0);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(heroPop, { toValue: 1, damping: 14, stiffness: 180, mass: 0.9, useNativeDriver: true }),
    ]).start();
  };

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      (async () => {
        try {
          setLoading(true);
          const [u, cats, b] = await Promise.all([
            fetchMe().catch(() => null),
            fetchCategories().catch(() => []),
            fetchCurrentBudgetAutoCarry().catch(() => null),
          ]);
          if (!alive) return;
          setMe(u);
          setCategories(cats);
          setBudget(b);
          const list = await fetchTransactions({ fromDate, toDate }).catch(() => []);
          if (!alive) return;
          setTxs(list);
        } finally {
          if (alive) { setLoading(false); animateIn(); }
        }
      })();
      return () => { alive = false; };
    }, [fromDate, toDate]),
  );

  const computed = useMemo(() => {
    const list: TxNorm[] = (txs || [])
      .filter((t: any) => {
        if (!t.date) return false;
        const dStr = t.date.length === 10 ? t.date : t.date.slice(0, 10);
        return dStr >= fromDate && dStr <= toDate;
      })
      .map((t: any) => {
        const amount = Number(t.amount ?? 0);
        const type = (t.type ?? "expense") as "income" | "expense";
        return { ...t, _type: type, _abs: Math.abs(amount) };
      });

    const income = list.filter((x) => x._type === "income").reduce((s, x) => s + x._abs, 0);
    const expense = list.filter((x) => x._type === "expense").reduce((s, x) => s + x._abs, 0);
    const balance = income - expense;

    // Expense by category for pie chart
    const catTotals = new Map<string, { value: number; color: string; label: string }>();
    const catColorMap = new Map<string, string>();
    const pieColors = ["#F97316", "#3B82F6", "#EC4899", "#8B5CF6", "#EF4444", "#14B8A6", "#F59E0B", "#6366F1", "#06B6D4", "#64748B"];
    categories.forEach((c, i) => catColorMap.set(String(c.id), c.color || pieColors[i % pieColors.length]));

    list.filter((x) => x._type === "expense").forEach((t: any) => {
      const catId = String(t.categoryId ?? "");
      if (!catId) return;
      const name = String(catMap.get(t.categoryId)?.name || t.categoryName || "Khác");
      const amount = Math.abs(Number(t.amount ?? 0));
      const existing = catTotals.get(catId);
      if (existing) existing.value += amount;
      else catTotals.set(catId, { value: amount, color: catColorMap.get(catId) || "#94A3B8", label: name });
    });
    const expenseByCat = Array.from(catTotals.values()).sort((a, b) => b.value - a.value);
    if (expenseByCat.length > 5) {
      const top5 = expenseByCat.slice(0, 5);
      const other = expenseByCat.slice(5).reduce((s, x) => s + x.value, 0);
      top5.push({ value: other, color: "#94A3B8", label: "Khác" });
      expenseByCat.length = 0;
      expenseByCat.push(...top5);
    }

    // Daily trend for bar chart (last 7 days)
    const dailyMap = new Map<string, { income: number; expense: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = ymdLocal(d);
      dailyMap.set(key, { income: 0, expense: 0 });
    }
    list.forEach((t: any) => {
      const dStr = t.date ? (t.date.length === 10 ? t.date : t.date.slice(0, 10)) : null;
      if (dStr && dailyMap.has(dStr)) {
        if (t._type === "income") dailyMap.get(dStr)!.income += t._abs;
        else dailyMap.get(dStr)!.expense += t._abs;
      }
    });
    const dailyTrend = Array.from(dailyMap.entries()).map(([date, vals]) => ({
      label: new Date(date).getDate().toString(),
      value: vals.income - vals.expense,
      color: vals.income - vals.expense >= 0 ? "#10B981" : "#EF4444",
    }));

    const qq = q.trim().toLowerCase();
    const filtered = !qq
      ? list
      : list.filter((t: any) => {
          const desc = String(t.description ?? t.note ?? "").toLowerCase();
          const cname = String(t.categoryName ?? catMap.get(t.categoryId)?.name ?? "").toLowerCase();
          return desc.includes(qq) || cname.includes(qq);
        });
    return { income, expense, balance, filtered, expenseByCat, dailyTrend };
  }, [txs, q, catMap, fromDate, toDate, categories]);

  const budgetView = useMemo(() => {
    const limitAmount = Number(budget?.limitAmount ?? 0);
    const threshold = Number(budget?.alertThreshold ?? 80);
    if (!Number.isFinite(limitAmount) || limitAmount <= 0) return null;
    const used = Number(computed.expense ?? 0);
    const pct = Math.max(0, Math.min(100, Math.round((used / limitAmount) * 100)));
    const left = Math.max(0, limitAmount - used);
    const status = pct >= 100 ? "Vượt" : pct >= threshold ? "Cảnh báo" : "Ổn";
    return { limitAmount, threshold, used, left, pct, status };
  }, [budget, computed.expense]);

  useEffect(() => {
    Animated.timing(prog, { toValue: budgetView?.pct ?? 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [budgetView?.pct, prog]);

  const prevMonth = () => setMonth((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1));
  const nextMonth = () => setMonth((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1));
  const resetMonth = () => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const displayName = me?.fullName ?? me?.name ?? "BestFlace";
  const avatarRaw = me?.avatarUrl ?? me?.avatar_url ?? me?.profilePicture ?? me?.avatar ?? null;
  const avatarUri = normalizeAvatarUri(avatarRaw);
  const progressWidth = prog.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });

  return (
    <View style={[styles.root, { backgroundColor: ui.bg }]}>
      <View style={{ height: insets.top, backgroundColor: ui.bg }} />
      <View style={styles.page}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 10, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Pressable onPress={() => nav.navigate("UpdateProfile")} style={({ pressed }) => [styles.profileHit, pressed && { opacity: 0.9 }]}>
                  <View style={[styles.avatarBox, { backgroundColor: ui.card, borderColor: ui.stroke }, shadow]}>
                    {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImg} resizeMode="cover" /> :
                      <Text style={{ fontFamily: "Faustina_700Bold", color: isDark ? "#E8FFF4" : "#0E1B13" }}>{getInitials(displayName)}</Text>}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.hello, { color: ui.muted }]}>Xin chào,</Text>
                    <Text style={[styles.name, { color: GREEN }]} numberOfLines={1}>{displayName}</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => nav.navigate("Settings")} hitSlop={10}
                  style={({ pressed }) => [styles.settingsBtn, { backgroundColor: ui.card, borderColor: ui.stroke }, shadow, pressed && { opacity: 0.9 }]}>
                  <Ionicons name="settings-outline" size={18} color={ui.text} />
                </Pressable>
              </View>
              <Pressable onPress={() => nav.navigate("AddTransaction")} android_ripple={{ color: "rgba(6,59,43,0.12)" }}
                style={({ pressed }) => [styles.addBtn, { backgroundColor: GREEN, opacity: pressed && Platform.OS !== "android" ? 0.92 : 1 }]}>
                <Text style={styles.addBtnText}>Thêm giao dịch</Text>
              </Pressable>
            </View>

            {/* Hero Tổng số dư */}
            <Animated.View style={{ transform: [{ scale: heroPop.interpolate({ inputRange: [0, 1], outputRange: [0.992, 1] }) }] }}>
              <LinearGradient colors={isDark ? ["#0F3D2E", "#0B2C22"] : ["#35D39A", "#129C6D"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, shadow]}>
                <View style={styles.heroTop}>
                  <Text style={styles.heroTitle}>Tổng số dư</Text>
                  <Pressable onPress={() => setMonthModal(true)} style={({ pressed }) => [styles.monthChip, { opacity: pressed ? 0.85 : 1 }]}>
                    <Ionicons name="calendar-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.monthChipText}>{monthStr}</Text>
                  </Pressable>
                </View>
                <Text style={styles.heroValue}>{computed.balance < 0 ? "-" : ""}{fmtVnd(computed.balance)}</Text>
                <View style={styles.heroDivider} />
                <View style={styles.heroRow}>
                  <View style={styles.heroMini}>
                    <View style={[styles.heroMiniIcon, { backgroundColor: "rgba(22,163,74,0.25)" }]}>
                      <Ionicons name="arrow-up" size={18} color="#E8FFF4" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.heroMiniLabel}>Thu nhập</Text>
                      <Text style={styles.heroMiniValue}>{fmtVnd(computed.income)}</Text>
                    </View>
                  </View>
                  <View style={styles.heroMini}>
                    <View style={[styles.heroMiniIcon, { backgroundColor: "rgba(239,68,68,0.25)" }]}>
                      <Ionicons name="arrow-down" size={18} color="#FFEDED" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.heroMiniLabel}>Chi tiêu</Text>
                      <Text style={styles.heroMiniValue}>{fmtVnd(computed.expense)}</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Budget card */}
            <View style={[styles.card, { backgroundColor: ui.card }, shadow]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitleMuted, { color: ui.muted }]}>Tiến trình ngân sách tháng</Text>
                  {budgetView ? (
                    <>
                      <Text style={[styles.cardBig, { color: ui.text }]}>Đã dùng {budgetView.pct}%</Text>
                      <Text style={[styles.cardSmall, { color: ui.muted }]}>Cảnh báo khi đạt {budgetView.threshold}%</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.cardBig, { color: ui.text }]}>Chưa thiết lập ngân sách</Text>
                      <Text style={[styles.cardSmall, { color: ui.muted }]}>Bạn có thể thiết lập trong phần Budget</Text>
                    </>
                  )}
                </View>
                <View style={[styles.statusPill, { borderColor: GREEN }]}>
                  <Text style={[styles.statusText, { color: GREEN }]}>{budgetView?.status ?? "—"}</Text>
                </View>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: ui.track }]}>
                <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: GREEN }]} />
                <View style={[styles.progressMarker, { left: `${budgetView?.threshold ?? 80}%` }]} />
              </View>
              <View style={styles.budgetFooter}>
                <View>
                  <Text style={[styles.cardSmall, { color: ui.muted }]}>Đã chi</Text>
                  <Text style={[styles.money, { color: ui.text }]}>{fmtVnd(budgetView?.used ?? computed.expense)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.cardSmall, { color: ui.muted }]}>Còn lại</Text>
                  <Text style={[styles.money, { color: ui.text }]}>{budgetView ? fmtVnd(budgetView.left) : "—"}</Text>
                </View>
              </View>
            </View>

            {/* Charts Section */}
            <View style={[styles.chartsCard, { backgroundColor: ui.card }, shadow]}>
              <View style={styles.chartsHeader}>
                <Text style={[styles.chartsTitle, { color: ui.text }]}>Phân tích chi tiêu</Text>
                <View style={[styles.chartsTabs, { backgroundColor: ui.soft }]}>
                  <View style={[styles.chartsTab, styles.chartsTabActive]}>
                    <Text style={[styles.chartsTabText, styles.chartsTabTextActive]}>Danh mục</Text>
                  </View>
                </View>
              </View>
              {computed.expenseByCat && computed.expenseByCat.length > 0 ? (
                <View style={styles.pieChartWrap}>
                  <PieChart
                    data={computed.expenseByCat}
                    size={140}
                    innerRadius={42}
                    showLegend={true}
                  />
                </View>
              ) : (
                <View style={styles.chartEmpty}>
                  <Ionicons name="pie-chart-outline" size={32} color={ui.muted} />
                  <Text style={[styles.chartEmptyText, { color: ui.muted }]}>Chưa có chi tiêu</Text>
                </View>
              )}
            </View>

            <View style={[styles.chartsCard, { backgroundColor: ui.card }, shadow]}>
              <View style={styles.chartsHeader}>
                <Text style={[styles.chartsTitle, { color: ui.text }]}>Xu hướng 7 ngày</Text>
                <View style={[styles.trendIndicator, computed.dailyTrend?.reduce((s, d) => s + d.value, 0) >= 0 ? { backgroundColor: "rgba(16,185,129,0.15)" } : { backgroundColor: "rgba(239,68,68,0.15)" }]}>
                  <Ionicons
                    name={computed.dailyTrend?.reduce((s, d) => s + d.value, 0) >= 0 ? "trending-up" : "trending-down"}
                    size={14}
                    color={computed.dailyTrend?.reduce((s, d) => s + d.value, 0) >= 0 ? "#10B981" : "#EF4444"}
                  />
                </View>
              </View>
              {computed.dailyTrend && computed.dailyTrend.length > 0 ? (
                <View style={styles.barChartWrap}>
                  <BarChart
                    data={computed.dailyTrend.map(d => ({
                      ...d,
                      gradient: d.color === "#10B981" ? ["#10B981", "#059669"] as [string, string] : ["#EF4444", "#DC2626"] as [string, string]
                    }))}
                    height={160}
                    barWidth={24}
                    unit="đ"
                    gridLines={4}
                  />
                </View>
              ) : (
                <View style={styles.chartEmpty}>
                  <Ionicons name="bar-chart-outline" size={32} color={ui.muted} />
                  <Text style={[styles.chartEmptyText, { color: ui.muted }]}>Chưa có dữ liệu</Text>
                </View>
              )}
            </View>

            {/* Search */}
            <View style={[styles.search, { backgroundColor: ui.card }, shadow]}>
              <Ionicons name="search" size={18} color={ui.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder="Tìm kiếm giao dịch" placeholderTextColor={ui.muted} style={[styles.searchInput, { color: ui.text }]} />
              {!!q && <Pressable onPress={() => setQ("")} hitSlop={10}><Ionicons name="close-circle" size={18} color={ui.muted} /></Pressable>}
            </View>

            {/* Recent transactions */}
            <View style={[styles.card, { backgroundColor: ui.card }, shadow]}>
              <View style={styles.listHeader}>
                <Text style={[styles.listTitle, { color: ui.text }]}>Giao dịch gần đây</Text>
                <View style={styles.listHeaderRight}>
                  <View style={[styles.countPill, { backgroundColor: ui.track }]}>
                    <Text style={[styles.countText, { color: ui.muted }]}>{computed.filtered.length} giao dịch</Text>
                  </View>
                  <Pressable onPress={() => nav.navigate("TransactionTrash")} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} hitSlop={8}>
                    <Ionicons name="trash-outline" size={20} color={ui.muted} />
                  </Pressable>
                </View>
              </View>
              {loading ? (
                <View style={{ paddingVertical: 18 }}><ActivityIndicator /></View>
              ) : (
                <View style={{ maxHeight: 380 }}>
                  <ScrollView showsVerticalScrollIndicator>
                    {computed.filtered.map((t: any) => {
                      const meta = catMap.get(t.categoryId);
                      const color = meta?.color ?? "rgba(15,23,42,0.18)";
                      const cname = t.categoryName ?? meta?.name ?? "Danh mục";
                      const desc = t.description ?? t.note ?? "Mô tả";
                      const dateTxt = t.date ? new Date(t.date).toLocaleDateString("vi-VN") : "";
                      const sign = t._type === "income" ? "+" : "-";
                      const amountColor = t._type === "income" ? "#16A34A" : "#EF4444";
                      const txId = t.id ?? t.transactionId ?? t.transaction_id;
                      return (
                        <Pressable key={String(txId)} onPress={() => nav.navigate("EditTransaction", { tx: t })} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
                          <View style={[styles.txRow, { backgroundColor: ui.soft, borderColor: ui.stroke }]}>
                            <View style={[styles.catBadge, { backgroundColor: color }]}>
                              {resolveIconText(meta?.icon) ? <Text style={styles.catEmoji}>{resolveIconText(meta?.icon)}</Text> :
                                <Ionicons name="pricetag-outline" size={18} color="#0E1B13" />}
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={[styles.txTitle, { color: ui.text }]} numberOfLines={1}>{desc}</Text>
                              <Text style={[styles.txSub, { color: ui.muted }]} numberOfLines={1}>{cname} {dateTxt ? `• ${dateTxt}` : ""}</Text>
                            </View>
                            <Text style={[styles.txAmount, { color: amountColor }]}>{sign}{fmtVnd(t._abs)}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                    {computed.filtered.length === 0 ? <Text style={{ textAlign: "center", paddingVertical: 16, color: ui.muted, fontFamily: "Faustina_500Medium" }}>Không có giao dịch phù hợp</Text> : null}
                  </ScrollView>
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </View>

      {/* Month modal */}
      <Modal visible={monthModal} transparent animationType="fade" onRequestClose={() => setMonthModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMonthModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: ui.card, borderColor: ui.stroke }]} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: ui.text }]}>Chọn tháng</Text>
              <Pressable onPress={() => setMonthModal(false)} hitSlop={8}><Ionicons name="close" size={20} color={ui.muted} /></Pressable>
            </View>
            <View style={styles.modalRow}>
              <Pressable onPress={prevMonth} style={({ pressed }) => [styles.modalBtn, { opacity: pressed ? 0.8 : 1 }]}>
                <Ionicons name="chevron-back" size={18} color={ui.text} />
                <Text style={[styles.modalBtnText, { color: ui.text }]}>Tháng trước</Text>
              </Pressable>
              <View style={[styles.modalPill, { backgroundColor: ui.track }]}>
                <Text style={[styles.modalPillText, { color: ui.text }]}>{monthStr}</Text>
              </View>
              <Pressable onPress={nextMonth} style={({ pressed }) => [styles.modalBtn, { opacity: pressed ? 0.8 : 1 }]}>
                <Text style={[styles.modalBtnText, { color: ui.text }]}>Tháng sau</Text>
                <Ionicons name="chevron-forward" size={18} color={ui.text} />
              </Pressable>
            </View>
            <View style={{ height: 12 }} />
            <Pressable onPress={() => { resetMonth(); setMonthModal(false); }} style={({ pressed }) => [styles.resetBtn, { backgroundColor: GREEN, opacity: pressed ? 0.85 : 1 }]}>
              <Text style={styles.resetBtnText}>Về tháng hiện tại</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { flex: 1, width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 16 },
  shadow: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  profileHit: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  settingsBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  hello: { fontFamily: "Faustina_500Medium", fontSize: 13 },
  name: { fontFamily: "Faustina_700Bold", fontSize: 16.5 },
  addBtn: { paddingHorizontal: 14, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: Platform.OS === "android" ? 4 : 0 },
  addBtnText: { fontFamily: "Faustina_700Bold", color: "#063B2B", fontSize: 13.5 },
  hero: { marginTop: 14, borderRadius: 22, padding: 16 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroTitle: { fontFamily: "Faustina_600SemiBold", fontSize: 13, color: "rgba(255,255,255,0.90)" },
  monthChip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)" },
  monthChipText: { fontFamily: "Faustina_700Bold", fontSize: 12.5, color: "#FFFFFF" },
  heroValue: { fontFamily: "Faustina_700Bold", fontSize: 32, marginTop: 12, color: "#FFFFFF" },
  heroDivider: { marginTop: 12, height: 1, backgroundColor: "rgba(255,255,255,0.18)" },
  heroRow: { marginTop: 12, flexDirection: "row", gap: 12 },
  heroMini: { flex: 1, borderRadius: 16, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.20)" },
  heroMiniIcon: { width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  heroMiniLabel: { fontFamily: "Faustina_500Medium", fontSize: 11.5, color: "rgba(255,255,255,0.90)" },
  heroMiniValue: { fontFamily: "Faustina_700Bold", fontSize: 14.5, marginTop: 2, color: "#FFFFFF" },
  card: { marginTop: 14, borderRadius: 18, padding: 14 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  cardTitleMuted: { fontFamily: "Faustina_600SemiBold", fontSize: 12.5 },
  cardBig: { fontFamily: "Faustina_700Bold", fontSize: 18, marginTop: 6 },
  cardSmall: { fontFamily: "Faustina_500Medium", fontSize: 12, marginTop: 2 },
  statusPill: { borderWidth: 1, paddingHorizontal: 12, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  statusText: { fontFamily: "Faustina_700Bold", fontSize: 12 },
  progressTrack: { height: 10, borderRadius: 999, marginTop: 14, overflow: "hidden", position: "relative" },
  progressFill: { height: "100%", borderRadius: 999 },
  progressMarker: { position: "absolute", top: 0, bottom: 0, width: 3, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.22)" },
  budgetFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  money: { fontFamily: "Faustina_700Bold", fontSize: 14, marginTop: 4 },
  search: { marginTop: 14, borderRadius: 16, paddingHorizontal: 12, height: 44, flexDirection: "row", alignItems: "center", gap: 10, overflow: "hidden" },
  searchInput: { flex: 1, fontFamily: "Faustina_500Medium", fontSize: 13.5 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  listTitle: { fontFamily: "Faustina_700Bold", fontSize: 16 },
  listHeaderRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  countPill: { height: 28, paddingHorizontal: 10, borderRadius: 14, justifyContent: "center" },
  countText: { fontFamily: "Faustina_700Bold", fontSize: 12 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1 },
  catBadge: { width: 40, height: 40, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  catEmoji: { fontSize: 20, lineHeight: 24, includeFontPadding: false, textAlign: "center", ...(Platform.OS === "android" ? { textAlignVertical: "center" as any } : {}) },
  txTitle: { fontFamily: "Faustina_700Bold", fontSize: 13.5 },
  txSub: { fontFamily: "Faustina_500Medium", fontSize: 12, marginTop: 2 },
  txAmount: { fontFamily: "Faustina_700Bold", fontSize: 13.5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(2,6,23,0.45)", justifyContent: "center", paddingHorizontal: 16 },
  modalCard: { borderRadius: 18, padding: 14, borderWidth: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontFamily: "Faustina_700Bold", fontSize: 16 },
  modalRow: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  modalBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, height: 38, borderRadius: 12 },
  modalBtnText: { fontFamily: "Faustina_600SemiBold", fontSize: 12.5 },
  modalPill: { height: 38, paddingHorizontal: 14, borderRadius: 19, justifyContent: "center" },
  modalPillText: { fontFamily: "Faustina_700Bold", fontSize: 13 },
  resetBtn: { height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  resetBtnText: { fontFamily: "Faustina_700Bold", color: "#063B2B", fontSize: 13 },
  avatarBox: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%" },
  chartsCard: { marginTop: 14, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(15,23,42,0.08)" },
  chartsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  chartsTitle: { fontFamily: "Faustina_700Bold", fontSize: 16 },
  chartsTabs: { flexDirection: "row", gap: 6, borderRadius: 14, padding: 4 },
  chartsTab: { paddingHorizontal: 12, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  chartsTabActive: { backgroundColor: "rgba(16,185,129,0.15)" },
  chartsTabText: { fontFamily: "Faustina_600SemiBold", fontSize: 12, color: "rgba(100,116,139,0.8)" },
  chartsTabTextActive: { color: "#10B981" },
  pieChartWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 10 },
  barChartWrap: { alignItems: "center", paddingVertical: 4 },
  chartEmpty: { alignItems: "center", justifyContent: "center", paddingVertical: 32 },
  chartEmptyText: { marginTop: 8, fontFamily: "Faustina_500Medium", fontSize: 13 },
  trendIndicator: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});