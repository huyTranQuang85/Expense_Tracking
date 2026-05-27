import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import {
  fetchCurrentBudgetAutoCarry,
  upsertCurrentBudget,
  CurrentBudget,
} from "../services/budgets";
import { useTheme } from "../theme/ThemeContext";

type Props = { navigation: any };

const GREEN = "#34D399";
const VND = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}₫`;

const THRESHOLDS: Array<{
  label: string;
  value: 70 | 80 | 90 | 100;
  hint: string;
}> = [
  {
    label: "70%",
    value: 70,
    hint: "Nhận cảnh báo khi chi tiêu đạt 70% ngân sách",
  },
  {
    label: "80%",
    value: 80,
    hint: "Nhận cảnh báo khi chi tiêu đạt 80% ngân sách",
  },
  {
    label: "90%",
    value: 90,
    hint: "Nhận cảnh báo khi chi tiêu đạt 90% ngân sách",
  },
  {
    label: "100%",
    value: 100,
    hint: "Nhận cảnh báo khi chi tiêu đạt 100% ngân sách",
  },
];

type Palette = {
  bg: string;
  card: string;
  soft: string;
  text: string;
  muted: string;
  stroke: string;
};

function Sheet({
  visible,
  title,
  onClose,
  palette,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  palette: Palette;
  children: React.ReactNode;
}) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    a.setValue(0);
    Animated.timing(a, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, a]);

  if (!visible) return null;

  const translateY = a.interpolate({
    inputRange: [0, 1],
    outputRange: [280, 0],
  });

  return (
    <View style={styles.sheetOverlay}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY }], backgroundColor: palette.card },
        ]}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: palette.text }]}>
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={palette.muted} />
          </Pressable>
        </View>
        {children}
      </Animated.View>
    </View>
  );
}

export default function ManageMonthlyBudgetScreen({ navigation }: Props) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  // 🎨 Palette đồng bộ với Category / Wallet
  const palette: Palette = useMemo(() => {
    if (isDark) {
      return {
        bg: "#020617",
        card: "rgba(15,23,42,0.98)",
        text: "rgba(248,250,252,0.96)",
        muted: "rgba(148,163,184,0.95)",
        soft: "rgba(15,23,42,0.9)",
        stroke: "rgba(51,65,85,1)",
      };
    }
    return {
      bg: "#F5F6FA",
      card: "#FFFFFF",
      text: "#0F172A",
      muted: "#64748B",
      soft: "rgba(148,163,184,0.12)",
      stroke: "rgba(15,23,42,0.06)",
    };
  }, [isDark]);

  const shadow = isDark ? {} : styles.shadow;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [budget, setBudget] = useState<CurrentBudget>({
    limitAmount: 0,
    alertThreshold: 80,
    notifyInApp: true,
    notifyEmail: false,
  });

  const [amountText, setAmountText] = useState("");
  const [thresholdSheet, setThresholdSheet] = useState(false);

  // page animation
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(10)).current;

  const animateIn = useCallback(() => {
    fade.setValue(0);
    rise.setValue(10);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCurrentBudgetAutoCarry();

      const b = data ?? {
        limitAmount: 0,
        alertThreshold: 80,
        notifyInApp: true,
        notifyEmail: false,
      };

      setBudget(b);
      setAmountText(b.limitAmount ? String(Math.round(b.limitAmount)) : "");
    } catch (e) {
      Toast.show({ type: "error", text1: "Không tải được ngân sách" });
    } finally {
      setLoading(false);
      animateIn();
    }
  }, [animateIn]);

  useEffect(() => {
    load();
  }, [load]);

  const thresholdMeta = useMemo(
    () =>
      THRESHOLDS.find((x) => x.value === budget.alertThreshold) ??
      THRESHOLDS[1],
    [budget.alertThreshold]
  );

  const parseAmount = (t: string) => {
    const raw = (t || "").replace(/[^\d]/g, "");
    const n = Number(raw || 0);
    return Number.isFinite(n) ? n : 0;
  };

  const onSave = useCallback(async () => {
    const limitAmount = parseAmount(amountText);
    if (!limitAmount || limitAmount <= 0) {
      Toast.show({ type: "error", text1: "Hạn mức phải lớn hơn 0" });
      return;
    }

    try {
      setSaving(true);
      const updated = await upsertCurrentBudget({
        limitAmount,
        alertThreshold: budget.alertThreshold,
        notifyInApp: budget.notifyInApp,
        notifyEmail: budget.notifyEmail,
      });
      setBudget(updated);
      setAmountText(String(Math.round(updated.limitAmount)));
      Toast.show({ type: "success", text1: "Đã lưu ngân sách tháng" });
      navigation.goBack();
    } catch (e) {
      Toast.show({ type: "error", text1: "Không lưu được ngân sách" });
    } finally {
      setSaving(false);
    }
  }, [amountText, budget, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={palette.text} />
          <Text style={[styles.loadingText, { color: palette.muted }]}>
            Đang tải ngân sách...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const formattedHint =
    parseAmount(amountText) > 0 ? `≈ ${VND(parseAmount(amountText))}` : " ";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={{ paddingTop: 10, paddingBottom: 18 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top bar */}
          <View style={styles.topRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [
                styles.backBtn,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.stroke,
                  opacity: pressed ? 0.9 : 1,
                },
                shadow,
              ]}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={20} color={palette.text} />
            </Pressable>

            <Text style={[styles.topTitle, { color: palette.text }]}>
              Quản lý ngân sách tháng
            </Text>

            <View style={{ width: 34 }} />
          </View>

          <Animated.View
            style={{ opacity: fade, transform: [{ translateY: rise }] }}
          >
            <View
              style={[
                styles.card,
                { backgroundColor: palette.card, borderColor: palette.stroke },
                shadow,
              ]}
            >
              {/* Limit */}
              <Text style={[styles.label, { color: palette.text }]}>
                Hạn mức chi tiêu tháng (VND)
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: palette.soft,
                    borderColor: palette.stroke,
                  },
                ]}
              >
                <TextInput
                  value={amountText}
                  onChangeText={(t) => setAmountText(t.replace(/[^\d]/g, ""))}
                  keyboardType="number-pad"
                  placeholder=" "
                  placeholderTextColor={palette.muted}
                  style={[styles.input, { color: palette.text }]}
                />
              </View>
              <Text style={[styles.miniHint, { color: palette.muted }]}>
                {formattedHint}
              </Text>

              {/* Threshold */}
              <Text
                style={[styles.label, { marginTop: 10, color: palette.text }]}
              >
                Ngưỡng cảnh báo
              </Text>
              <Pressable
                onPress={() => setThresholdSheet(true)}
                style={[
                  styles.selectRow,
                  {
                    backgroundColor: palette.soft,
                    borderColor: palette.stroke,
                  },
                ]}
              >
                <Text style={[styles.selectText, { color: palette.text }]}>
                  {thresholdMeta.label}
                </Text>
                <Ionicons name="chevron-down" size={16} color={palette.muted} />
              </Pressable>
              <Text style={[styles.miniHint, { color: palette.muted }]}>
                {thresholdMeta.hint}
              </Text>

              {/* Switches */}
              <Text
                style={[styles.label, { marginTop: 10, color: palette.text }]}
              >
                Cảnh báo trong ứng dụng
              </Text>
              <View
                style={[
                  styles.switchRow,
                  {
                    backgroundColor: palette.soft,
                    borderColor: palette.stroke,
                  },
                ]}
              >
                <Text style={[styles.switchSub, { color: palette.text }]}>
                  Hiển thị cảnh báo khi vượt ngân sách
                </Text>
                <Switch
                  value={budget.notifyInApp}
                  onValueChange={(v) =>
                    setBudget((p) => ({ ...p, notifyInApp: v }))
                  }
                  trackColor={{
                    false: isDark
                      ? "rgba(30,41,59,0.85)"
                      : "rgba(148,163,184,0.35)",
                    true: "rgba(52,211,153,0.5)",
                  }}
                  thumbColor={budget.notifyInApp ? GREEN : undefined}
                />
              </View>

              <Text
                style={[styles.label, { marginTop: 10, color: palette.text }]}
              >
                Cảnh báo qua email
              </Text>
              <View
                style={[
                  styles.switchRow,
                  {
                    backgroundColor: palette.soft,
                    borderColor: palette.stroke,
                  },
                ]}
              >
                <Text style={[styles.switchSub, { color: palette.text }]}>
                  Gửi email khi vượt ngân sách
                </Text>
                <Switch
                  value={budget.notifyEmail}
                  onValueChange={(v) =>
                    setBudget((p) => ({ ...p, notifyEmail: v }))
                  }
                  trackColor={{
                    false: isDark
                      ? "rgba(30,41,59,0.85)"
                      : "rgba(148,163,184,0.35)",
                    true: "rgba(52,211,153,0.5)",
                  }}
                  thumbColor={budget.notifyEmail ? GREEN : undefined}
                />
              </View>

              {/* Buttons */}
              <View style={styles.btnRow}>
                <Pressable
                  onPress={() => navigation.goBack()}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.btn,
                    {
                      backgroundColor: palette.card,
                      borderColor: palette.stroke,
                      opacity: saving ? 0.55 : pressed ? 0.9 : 1,
                    },
                    shadow,
                  ]}
                >
                  <Text
                    style={[
                      styles.btnText,
                      { color: isDark ? palette.text : "#0F172A" },
                    ]}
                  >
                    Hủy
                  </Text>
                </Pressable>

                <Pressable
                  disabled={saving}
                  onPress={onSave}
                  style={({ pressed }) => [
                    styles.btn,
                    {
                      backgroundColor: GREEN,
                      borderColor: "transparent",
                      opacity: saving ? 0.6 : pressed ? 0.9 : 1,
                    },
                    shadow,
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator color="#052E1B" />
                  ) : (
                    <Text style={[styles.btnText, { color: "#052E1B" }]}>
                      Lưu thay đổi
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </View>

      <Sheet
        visible={thresholdSheet}
        title="Chọn ngưỡng cảnh báo"
        onClose={() => setThresholdSheet(false)}
        palette={palette}
      >
        {THRESHOLDS.map((x) => {
          const active = x.value === budget.alertThreshold;
          return (
            <Pressable
              key={x.value}
              onPress={() => {
                setBudget((p) => ({ ...p, alertThreshold: x.value }));
                setThresholdSheet(false);
              }}
              style={({ pressed }) => [
                styles.sheetItem,
                {
                  backgroundColor: active ? palette.soft : palette.card,
                  borderColor: palette.stroke,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.sheetItemText,
                    {
                      color: palette.text,
                      fontFamily: active
                        ? "Faustina_700Bold"
                        : "Faustina_600SemiBold",
                    },
                  ]}
                >
                  {x.label}
                </Text>
                <Text style={[styles.sheetItemSub, { color: palette.muted }]}>
                  {x.hint}
                </Text>
              </View>
              {active && (
                <Ionicons name="checkmark" size={20} color={palette.text} />
              )}
            </Pressable>
          );
        })}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  page: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 16,
  },

  center: { alignItems: "center", justifyContent: "center" },
  loadingText: {
    marginTop: 10,
    fontFamily: "Faustina_400Regular",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  topTitle: {
    fontFamily: "Faustina_600SemiBold",
    fontSize: 14,
  },

  card: {
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },

  label: {
    fontFamily: "Faustina_600SemiBold",
    fontSize: 12.5,
  },

  inputWrap: {
    marginTop: 8,
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  input: {
    fontFamily: "Faustina_500Medium",
    fontSize: 12.5,
  },

  selectRow: {
    marginTop: 8,
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
  },
  selectText: {
    fontFamily: "Faustina_500Medium",
    fontSize: 12.5,
  },

  miniHint: {
    marginTop: 6,
    fontFamily: "Faustina_400Regular",
    fontSize: 11.5,
  },

  switchRow: {
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
  },
  switchSub: {
    flex: 1,
    fontFamily: "Faustina_400Regular",
    fontSize: 12,
  },

  btnRow: { flexDirection: "row", gap: 14, marginTop: 14 },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  btnText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13.5,
  },

  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  sheetOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.45)",
  },
  sheet: {
    padding: 14,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sheetTitle: {
    fontFamily: "Faustina_600SemiBold",
    fontSize: 14,
  },

  sheetItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 10,
  },
  sheetItemText: {
    fontSize: 13,
  },
  sheetItemSub: {
    marginTop: 3,
    fontFamily: "Faustina_400Regular",
    fontSize: 11.5,
  },
});
