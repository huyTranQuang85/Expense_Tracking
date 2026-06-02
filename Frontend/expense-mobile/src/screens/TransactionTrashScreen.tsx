import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";

import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
  fetchTrash,
  forceDeleteTransaction,
  restoreTransaction,
} from "../services/dashboard";
import { checkBudgetAndNotifyInApp } from "../services/budgets";
const GREEN = "#34D399";

function fmtVnd(n: number) {
  const abs = Math.abs(Number(n || 0));
  try {
    return new Intl.NumberFormat("vi-VN").format(abs) + "đ";
  } catch {
    return `${abs}đ`;
  }
}

function pickTxId(t: any) {
  return t?.id ?? t?.transactionId ?? t?.transaction_id;
}

function pickType(t: any) {
  const amount = Number(t?.amount ?? 0);
  return (t?.type ??
    t?.category_type ??
    (amount >= 0 ? "income" : "expense")) as "income" | "expense";
}

type UI = {
  bg: string;
  card: string;
  text: string;
  muted: string;
  soft: string;
  stroke: string;
  danger: string;
};

function TrashTxItem({
  item,
  index,
  ui,
  shadow,
  selectMode,
  checked,
  onToggle,
  onEnterSelectMode,
  onRestoreSingle,
  onForceDeleteSingle,
}: {
  item: any;
  index: number;
  ui: UI;
  shadow: any;
  selectMode: boolean;
  checked: boolean;
  onToggle: (id: string) => void;
  onEnterSelectMode: (id: string) => void;
  onRestoreSingle: (id: string) => void;
  onForceDeleteSingle: (id: string) => void;
}) {
  const txId = pickTxId(item);
  if (!txId) return null;

  const idStr = String(txId);

  const type = pickType(item);
  const amount = Number(item.amount ?? 0);
  const abs = Math.abs(amount);
  const amountColor = type === "income" ? "#16A34A" : ui.danger;

  const desc = item.description ?? item.note ?? "Mô tả";
  const dateRaw = item.date ?? item.tx_date;
  const dateTxt = dateRaw ? new Date(dateRaw).toLocaleDateString("vi-VN") : "";

  const deletedRaw = item.deletedAt ?? item.deleted_at;
  const deletedAt = deletedRaw
    ? new Date(deletedRaw).toLocaleString("vi-VN")
    : "";

  // ✅ Hook dùng trong component -> OK
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    a.setValue(0);
    Animated.timing(a, {
      toValue: 1,
      duration: 260,
      delay: Math.min(index * 24, 180),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [a, index]);

  const translateY = a.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });

  return (
    <Animated.View style={{ opacity: a, transform: [{ translateY }] }}>
      <Pressable
        onLongPress={() => onEnterSelectMode(idStr)}
        delayLongPress={220}
        onPress={() => {
          if (selectMode) onToggle(idStr);
        }}
        style={({ pressed }) => [
          styles.txCard,
          {
            backgroundColor: ui.card,
            borderColor: checked ? GREEN : ui.stroke,
            opacity: pressed ? 0.92 : 1,
          },
          shadow,
        ]}
      >
        <View style={styles.txTop}>
          {selectMode ? (
            <Pressable
              onPress={() => onToggle(idStr)}
              hitSlop={8}
              style={[
                styles.checkbox,
                {
                  borderColor: checked ? GREEN : ui.stroke,
                  backgroundColor: checked
                    ? "rgba(52,211,153,0.18)"
                    : "transparent",
                },
              ]}
            >
              {checked ? (
                <Ionicons name="checkmark" size={16} color={GREEN} />
              ) : null}
            </Pressable>
          ) : (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    type === "income"
                      ? "rgba(22,163,74,0.14)"
                      : "rgba(239,68,68,0.14)",
                },
              ]}
            >
              <Ionicons
                name={type === "income" ? "arrow-up" : "arrow-down"}
                size={16}
                color={type === "income" ? "#16A34A" : ui.danger}
              />
            </View>
          )}

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[styles.txTitle, { color: ui.text }]}
              numberOfLines={1}
            >
              {desc}
            </Text>
            <Text style={[styles.txSub, { color: ui.muted }]} numberOfLines={2}>
              {dateTxt ? dateTxt : " "}
              {deletedAt ? `  •  Đã xoá ${deletedAt}` : ""}
            </Text>
          </View>

          <Text style={[styles.txAmount, { color: amountColor }]}>
            {type === "income" ? "+" : "-"}
            {fmtVnd(abs)}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: ui.stroke }]} />

        {!selectMode ? (
          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => onRestoreSingle(idStr)}
              android_ripple={{ color: "rgba(6,95,70,0.12)" }}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: "rgba(52,211,153,0.16)",
                  borderColor: "rgba(52,211,153,0.30)",
                  opacity: pressed && Platform.OS !== "android" ? 0.9 : 1,
                },
              ]}
            >
              <Ionicons name="refresh" size={16} color={GREEN} />
              <Text style={[styles.actionText, { color: GREEN }]}>
                Khôi phục
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onForceDeleteSingle(idStr)}
              android_ripple={{ color: "rgba(239,68,68,0.14)" }}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: "rgba(239,68,68,0.12)",
                  borderColor: "rgba(239,68,68,0.26)",
                  opacity: pressed && Platform.OS !== "android" ? 0.9 : 1,
                },
              ]}
            >
              <Ionicons name="trash-outline" size={16} color={ui.danger} />
              <Text style={[styles.actionText, { color: ui.danger }]}>
                Xóa vĩnh viễn
              </Text>
            </Pressable>
          </View>
        ) : (
          <Text style={[styles.hintSelect, { color: ui.muted }]}>
            Chạm để chọn • Long-press để bật chọn nhiều
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function TransactionTrashScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { mode, colors } = useTheme();
  const isDark = mode === "dark";

  const ui: UI = useMemo(
    () => ({
      bg: colors.bg,
      card: colors.card,
      text: colors.text,
      muted: colors.muted,
      soft: colors.soft,
      stroke: colors.stroke,
      danger: "#EF4444", // vẫn dùng đỏ cố định
    }),
    [colors]
  );

  const shadow = isDark ? {} : styles.shadow;

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((k) => selected[k]),
    [selected]
  );

  const allIds = useMemo(() => {
    return rows
      .map((r) => String(pickTxId(r)))
      .filter((x) => x && x !== "undefined");
  }, [rows]);

  const selectedCount = selectedIds.length;
  const count = rows.length;

  // page animation
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(10)).current;

  const animateIn = useCallback(() => {
    fade.setValue(0);
    rise.setValue(10);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise]);

  const clearSelection = useCallback(() => {
    setSelected({});
    setSelectMode(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchTrash();
      const list = Array.isArray(r) ? r : [];
      setRows(list);

      // dọn selection không còn tồn tại sau refresh
      setSelected((prev) => {
        if (!prev || !Object.keys(prev).length) return prev;
        const keep = new Set(list.map((x) => String(pickTxId(x))));
        const next: Record<string, boolean> = {};
        Object.keys(prev).forEach((k) => {
          if (keep.has(k) && prev[k]) next[k] = true;
        });
        return next;
      });
    } finally {
      setLoading(false);
      animateIn();
    }
  }, [animateIn]);

  useEffect(() => {
    load();
  }, [load]);

  const onRestoreSingle = useCallback(
    async (id: string) => {
      try {
        await restoreTransaction(id);
        Toast.show({ type: "success", text1: "Đã khôi phục giao dịch" });
        await checkBudgetAndNotifyInApp();

        await load();
      } catch (e: any) {
        Alert.alert(
          "Không khôi phục được",
          e?.message ?? "Lỗi khôi phục giao dịch"
        );
      }
    },
    [load]
  );

  const onForceDeleteSingle = useCallback(
    async (id: string) => {
      Alert.alert("Xóa vĩnh viễn?", "Hành động này không thể hoàn tác.", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await forceDeleteTransaction(id);
              Toast.show({ type: "success", text1: "Đã xóa vĩnh viễn" });
              await load();
            } catch (e: any) {
              Alert.alert("Không xóa được", e?.message ?? "Lỗi xóa vĩnh viễn");
            }
          },
        },
      ]);
    },
    [load]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const enterSelectMode = useCallback((id: string) => {
    setSelectMode(true);
    setSelected((prev) => ({ ...prev, [id]: true }));
  }, []);

  const selectAll = useCallback(() => {
    const next: Record<string, boolean> = {};
    allIds.forEach((id) => (next[id] = true));
    setSelected(next);
    setSelectMode(true);
  }, [allIds]);

  const unselectAll = useCallback(() => setSelected({}), []);

  const bulkRestore = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      Alert.alert(
        "Khôi phục giao dịch",
        `Bạn muốn khôi phục ${ids.length} giao dịch đã chọn?`,
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Khôi phục",
            onPress: async () => {
              try {
                await Promise.all(ids.map((id) => restoreTransaction(id)));
                Toast.show({
                  type: "success",
                  text1: `Đã khôi phục ${ids.length} giao dịch`,
                });
                clearSelection();
                await load();
              } catch (e: any) {
                Alert.alert(
                  "Không khôi phục được",
                  e?.message ?? "Lỗi khôi phục giao dịch"
                );
              }
            },
          },
        ]
      );
    },
    [clearSelection, load]
  );

  const bulkDelete = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      Alert.alert(
        "Xóa vĩnh viễn",
        `Bạn muốn xóa vĩnh viễn ${ids.length} giao dịch đã chọn?\nHành động không thể hoàn tác.`,
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Xóa",
            style: "destructive",
            onPress: async () => {
              try {
                await Promise.all(ids.map((id) => forceDeleteTransaction(id)));
                Toast.show({
                  type: "success",
                  text1: `Đã xóa vĩnh viễn ${ids.length} giao dịch`,
                });
                clearSelection();
                await load();
              } catch (e: any) {
                Alert.alert(
                  "Không xóa được",
                  e?.message ?? "Lỗi xóa vĩnh viễn"
                );
              }
            },
          },
        ]
      );
    },
    [clearSelection, load]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const id = pickTxId(item);
      if (!id) return null;
      const idStr = String(id);

      return (
        <TrashTxItem
          item={item}
          index={index}
          ui={ui}
          shadow={shadow}
          selectMode={selectMode}
          checked={!!selected[idStr]}
          onToggle={toggleSelect}
          onEnterSelectMode={enterSelectMode}
          onRestoreSingle={onRestoreSingle}
          onForceDeleteSingle={onForceDeleteSingle}
        />
      );
    },
    [
      ui,
      shadow,
      selectMode,
      selected,
      toggleSelect,
      enterSelectMode,
      onRestoreSingle,
      onForceDeleteSingle,
    ]
  );

  return (
    <View style={[styles.root, { backgroundColor: ui.bg }]}>
      <View style={{ height: insets.top, backgroundColor: ui.bg }} />

      <View style={styles.page}>
        <Animated.View
          style={{ opacity: fade, transform: [{ translateY: rise }] }}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={() =>
                selectMode ? clearSelection() : navigation.goBack()
              }
              style={({ pressed }) => [
                styles.backBtn,
                {
                  backgroundColor: ui.card,
                  borderColor: ui.stroke,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              hitSlop={10}
            >
              <Ionicons
                name={selectMode ? "close" : "chevron-back"}
                size={22}
                color={ui.text}
              />
            </Pressable>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.h1, { color: ui.text }]} numberOfLines={1}>
                {selectMode ? "Chọn giao dịch" : "Giỏ rác giao dịch"}
              </Text>
              <Text style={[styles.sub, { color: ui.muted }]} numberOfLines={2}>
                {selectMode
                  ? `Đã chọn ${selectedCount}/${count}`
                  : "Khôi phục hoặc xoá vĩnh viễn các giao dịch đã xoá mềm."}
              </Text>
            </View>

            <View
              style={[
                styles.countPill,
                { backgroundColor: ui.soft, borderColor: ui.stroke },
              ]}
            >
              <Text style={[styles.countText, { color: ui.muted }]}>
                {count}
              </Text>
            </View>
          </View>

          {/* Bulk toolbar */}
          {selectMode ? (
            <View
              style={[
                styles.bulkBar,
                { backgroundColor: ui.card, borderColor: ui.stroke },
                shadow,
              ]}
            >
              <Pressable
                onPress={() => {
                  if (selectedCount === allIds.length && allIds.length > 0)
                    unselectAll();
                  else selectAll();
                }}
                style={({ pressed }) => [
                  styles.bulkBtn,
                  {
                    backgroundColor: ui.soft,
                    borderColor: ui.stroke,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Ionicons name="checkbox-outline" size={16} color={ui.text} />
                <Text style={[styles.bulkBtnText, { color: ui.text }]}>
                  {selectedCount === allIds.length && allIds.length > 0
                    ? "Bỏ chọn"
                    : "Chọn tất cả"}
                </Text>
              </Pressable>

              <Pressable
                disabled={!selectedCount}
                onPress={() => bulkRestore(selectedIds)}
                style={({ pressed }) => [
                  styles.bulkBtnStrong,
                  {
                    opacity: !selectedCount ? 0.45 : pressed ? 0.92 : 1,
                    backgroundColor: "rgba(52,211,153,0.18)",
                    borderColor: "rgba(52,211,153,0.30)",
                  },
                ]}
              >
                <Ionicons name="refresh" size={16} color={GREEN} />
                <Text style={[styles.bulkStrongText, { color: GREEN }]}>
                  Khôi phục
                </Text>
              </Pressable>

              <Pressable
                disabled={!selectedCount}
                onPress={() => bulkDelete(selectedIds)}
                style={({ pressed }) => [
                  styles.bulkBtnStrong,
                  {
                    opacity: !selectedCount ? 0.45 : pressed ? 0.92 : 1,
                    backgroundColor: "rgba(239,68,68,0.12)",
                    borderColor: "rgba(239,68,68,0.26)",
                  },
                ]}
              >
                <Ionicons name="trash-outline" size={16} color={ui.danger} />
                <Text style={[styles.bulkStrongText, { color: ui.danger }]}>
                  Xóa
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Animated.View>

        <View style={{ flex: 1, marginTop: 12 }}>
          {loading ? (
            <View
              style={[
                styles.loadingBox,
                { backgroundColor: ui.card, borderColor: ui.stroke },
                shadow,
              ]}
            >
              <ActivityIndicator />
              <Text style={[styles.loadingText, { color: ui.muted }]}>
                Đang tải giỏ rác...
              </Text>
            </View>
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(it, idx) => String(pickTxId(it) ?? `trash-${idx}`)}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: insets.bottom + 18,
              }}
              ListEmptyComponent={
                <View
                  style={[
                    styles.emptyBox,
                    { backgroundColor: ui.card, borderColor: ui.stroke },
                    shadow,
                  ]}
                >
                  <Ionicons name="trash-outline" size={22} color={ui.muted} />
                  <Text style={[styles.emptyText, { color: ui.text }]}>
                    Giỏ rác trống
                  </Text>
                  <Text style={[styles.emptySub, { color: ui.muted }]}>
                    Không có giao dịch nào đang bị xoá mềm.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  page: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  headerRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },

  h1: { fontFamily: "Faustina_700Bold", fontSize: 18 },
  sub: {
    marginTop: 2,
    fontFamily: "Faustina_500Medium",
    fontSize: 12.5,
    lineHeight: 18,
  },

  countPill: {
    minWidth: 36,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    marginTop: 4,
  },
  countText: { fontFamily: "Faustina_700Bold", fontSize: 12.5 },

  bulkBar: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  bulkBtn: {
    flex: 1.2,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    overflow: "hidden",
  },
  bulkBtnText: { fontFamily: "Faustina_700Bold", fontSize: 12.5 },

  bulkBtnStrong: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    overflow: "hidden",
  },
  bulkStrongText: { fontFamily: "Faustina_700Bold", fontSize: 12.5 },

  loadingBox: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { fontFamily: "Faustina_500Medium", fontSize: 12.5 },

  txCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  txTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  badge: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  txTitle: { fontFamily: "Faustina_700Bold", fontSize: 13.5 },
  txSub: {
    marginTop: 3,
    fontFamily: "Faustina_500Medium",
    fontSize: 12,
    lineHeight: 16,
  },
  txAmount: { fontFamily: "Faustina_700Bold", fontSize: 13.5 },

  divider: { marginTop: 12, height: 1 },

  actionsRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    overflow: "hidden",
  },
  actionText: { fontFamily: "Faustina_700Bold", fontSize: 12.5 },

  hintSelect: {
    marginTop: 10,
    fontFamily: "Faustina_500Medium",
    fontSize: 12,
    textAlign: "center",
  },

  emptyBox: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: { fontFamily: "Faustina_700Bold", fontSize: 14 },
  emptySub: {
    textAlign: "center",
    fontFamily: "Faustina_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
});
