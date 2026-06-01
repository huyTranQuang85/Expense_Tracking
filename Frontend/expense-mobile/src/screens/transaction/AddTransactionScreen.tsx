import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import SelectModal from "../../components/SelectModal";
import { createTransaction, TxType } from "../../services/transactions";
import { fetchCategories, Category } from "../../services/dashboard";
import { api } from "../../services/api";
import { checkBudgetAndNotifyInApp } from "../../services/budgets";
import { useTheme } from "../../theme/ThemeContext";

type Wallet = { id: string | number; name?: string; title?: string };
type FieldErrors = {
  amount?: string;
  category?: string;
  wallet?: string;
  date?: string;
};

const INCOME_ACTIVE = "rgba(78,236,165,0.45)";
const EXPENSE_ACTIVE = "rgba(252,165,165,0.55)";

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function onlyDigits(s: string) {
  return s.replace(/[^\d]/g, "");
}
function parentKey(c: any) {
  return (
    c?.parentCategoryId ??
    c?.parent_id ??
    c?.parentId ??
    c?.parent_category_id ??
    null
  );
}
function safeText(x: any) {
  return String(x ?? "");
}
function walletKey(w: any) {
  return w?.id ?? w?.wallet_id ?? w?.walletId ?? null;
}
function walletName(w: any) {
  return w?.name ?? w?.wallet_name ?? w?.title ?? "Ví";
}

export default function AddTransactionScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { mode, colors } = useTheme();
  const isDark = mode === "dark";

  const ui = useMemo(() => {
    return {
      bg: colors.bg,
      card: colors.card,
      input: isDark ? "rgba(148,163,184,0.10)" : "#F1F5F9",
      text: colors.text,
      muted: colors.muted,
      stroke: colors.stroke,
      soft: colors.soft,
      primary: colors.primary,
      danger: colors.danger,
    };
  }, [colors, isDark]);

  const shadow = isDark ? {} : styles.shadow;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<TxType>("income");

  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  const [categoryId, setCategoryId] = useState<any>(null);
  const [subCategoryId, setSubCategoryId] = useState<any>(null);
  const [walletId, setWalletId] = useState<any>(null);

  const [amountText, setAmountText] = useState("");
  const [date, setDate] = useState(isoToday());
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [picker, setPicker] = useState<
    null | "category" | "subCategory" | "wallet"
  >(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [cats, ws] = await Promise.all([
        fetchCategories().catch(() => []),
        api
          .get("/api/wallets")
          .then((r) => r.data?.data ?? r.data ?? [])
          .catch(() => []),
      ]);

      const catsArr = Array.isArray(cats) ? cats : [];
      const wsArr = Array.isArray(ws) ? ws : [];
      const normalizedWallets = wsArr.map((w: any) => ({
        ...w,
        id: walletKey(w),
        name: walletName(w),
      })).filter((w: any) => walletKey(w) != null && walletKey(w) !== "");

      setCategories(catsArr);
      setWallets(normalizedWallets);

      // default wallet
      if (normalizedWallets.length) setWalletId(walletKey(normalizedWallets[0]));

      // default category theo type
      const roots = catsArr.filter(
        (c: any) => !parentKey(c) && c?.type === type,
      );
      if (roots.length) setCategoryId(roots[0].id);
      else {
        const anyOfType = catsArr.find(
          (c: any) => c?.type === type && !parentKey(c),
        );
        if (anyOfType) setCategoryId(anyOfType.id);
      }
    } finally {
      setLoading(false);
    }
  }, [type]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // đổi danh mục cha -> reset con
  useEffect(() => {
    setSubCategoryId(null);
  }, [categoryId]);

  // đổi type -> reset chọn danh mục theo type
  useEffect(() => {
    const roots = categories.filter(
      (c: any) => !parentKey(c) && c?.type === type,
    );
    if (roots.length) setCategoryId(roots[0].id);
    else setCategoryId(null);
    setSubCategoryId(null);
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const rootCategories = useMemo(() => {
    return categories
      .filter((c: any) => !parentKey(c) && c?.type === type)
      .sort((a: any, b: any) =>
        safeText(a.name).localeCompare(safeText(b.name), "vi"),
      );
  }, [categories, type]);

  const subCategories = useMemo(() => {
    if (!categoryId) return [];
    return categories
      .filter((c: any) => String(parentKey(c)) === String(categoryId))
      .sort((a: any, b: any) =>
        safeText(a.name).localeCompare(safeText(b.name), "vi"),
      );
  }, [categories, categoryId]);

  const categoryLabel = useMemo(() => {
    const c = categories.find((x: any) => String(x.id) === String(categoryId));
    return c?.name ?? "";
  }, [categories, categoryId]);

  const subCategoryLabel = useMemo(() => {
    const c = categories.find(
      (x: any) => String(x.id) === String(subCategoryId),
    );
    return c?.name ?? "";
  }, [categories, subCategoryId]);

  const walletLabel = useMemo(() => {
    const w = wallets.find(
      (x: any) => String(walletKey(x)) === String(walletId),
    );
    return w?.name ?? w?.title ?? "";
  }, [wallets, walletId]);

  const isWalletSelected = useMemo(() => {
    if (walletId == null || walletId === "") return false;
    return wallets.some((w: any) => String(walletKey(w)) === String(walletId));
  }, [wallets, walletId]);

  const showToast = (msg: string) => {
    Toast.hide();
    Toast.show({
      type: "info",
      text1: msg,
      position: "top",
      visibilityTime: 1800,
      topOffset: 60,
    });
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    const amt = Number(amountText || "0");
    if (!Number.isFinite(amt) || amt <= 0) errors.amount = "Số tiền phải > 0";
    if (!categoryId) errors.category = "Vui lòng chọn danh mục";
    if (!isWalletSelected) errors.wallet = "Vui lòng chọn ví";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      errors.date = "Ngày phải theo dạng YYYY-MM-DD";
    return errors;
  };

  const onSubmit = async () => {
    const errors = validate();
    setFieldErrors(errors);
    const firstError = Object.values(errors)[0];
    if (firstError) return showToast(firstError);

    try {
      setSubmitting(true);

      await createTransaction({
        type,
        amount: Number(amountText),
        categoryId,
        subCategoryId: subCategoryId ?? null,
        walletId,
        date,
        description: description?.trim() ?? "",
      });
      await checkBudgetAndNotifyInApp();

      showToast("Thêm giao dịch thành công");
      setTimeout(() => {
        try {
          nav.navigate("RootTabs", { screen: "TransactionList" });
        } catch {
          nav.goBack();
        }
      }, 450);
    } catch (e: any) {
      showToast(
        e?.response?.data?.message ??
          "Tạo giao dịch thất bại. Vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const SegBtn = ({
    active,
    label,
    emoji,
    activeBg,
    onPress,
  }: {
    active: boolean;
    label: string;
    emoji: string;
    activeBg: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.segBtn,
        {
          backgroundColor: active ? activeBg : ui.input,
          borderColor: active ? "transparent" : ui.stroke,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text style={styles.segEmoji}>{emoji}</Text>
      <Text
        style={[
          styles.segText,
          { color: ui.text }, // dùng text màu dynamic cho dark/light
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const FieldBox = ({
    label,
    value,
    placeholder,
    onPress,
    disabled,
    error,
  }: {
    label: string;
    value: string;
    placeholder: string;
    onPress: () => void;
    disabled?: boolean;
    error?: string;
  }) => (
    <View style={{ flex: 1 }}>
      <Text style={[styles.label, { color: ui.text }]}>{label}</Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
        styles.select,
        {
          backgroundColor: ui.input,
          borderColor: error ? ui.danger : ui.stroke,
          opacity: disabled ? 0.55 : pressed ? 0.9 : 1,
        },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.selectText, { color: value ? ui.text : ui.muted }]}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={ui.muted} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: ui.bg, paddingTop: insets.top },
      ]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.page}>
          <View style={styles.topBar}>
            <Pressable
              onPress={() => nav.goBack()}
              hitSlop={10}
              style={({ pressed }) => [
                styles.backBtn,
                {
                  backgroundColor: ui.card,
                  borderColor: ui.stroke,
                  opacity: pressed ? 0.86 : 1,
                },
                shadow,
              ]}
            >
              <Ionicons name="chevron-back" size={22} color={ui.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.h1, { color: ui.text }]}>Thêm giao dịch</Text>
              <Text style={[styles.h2, { color: ui.muted }]}>
                Ghi nhận khoản thu hoặc chi mới
              </Text>
            </View>
          </View>

          <LinearGradient
            colors={
              type === "income"
                ? isDark
                  ? ["#065F46", "#0F766E"]
                  : ["#10B981", "#059669"]
                : isDark
                  ? ["#7F1D1D", "#991B1B"]
                  : ["#EF4444", "#F97316"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, shadow]}
          >
            <View style={styles.heroIcon}>
              <Ionicons
                name={type === "income" ? "arrow-down-circle" : "arrow-up-circle"}
                size={24}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.heroLabel}>
              {type === "income" ? "Khoản thu mới" : "Khoản chi mới"}
            </Text>
            <Text style={styles.heroAmount}>
              {amountText ? Number(amountText).toLocaleString("vi-VN") : "0"}đ
            </Text>
            <Text style={styles.heroMeta} numberOfLines={1}>
              {categoryLabel || "Chưa chọn danh mục"} • {walletLabel || "Chưa chọn ví"}
            </Text>
          </LinearGradient>

        {/* Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: ui.card, borderColor: ui.stroke },
            shadow,
          ]}
        >
          <Text style={[styles.label, { color: ui.text }]}>Loại giao dịch</Text>
          <View style={styles.segRow}>
            <SegBtn
              active={type === "income"}
              label="Thu nhập"
              emoji="💰"
              activeBg={INCOME_ACTIVE}
              onPress={() => setType("income")}
            />
            <SegBtn
              active={type === "expense"}
              label="Chi tiêu"
              emoji="💸"
              activeBg={EXPENSE_ACTIVE}
              onPress={() => setType("expense")}
            />
          </View>

          <View style={{ height: 14 }} />

          <View style={styles.twoCols}>
            <FieldBox
              label="Danh mục"
              value={categoryLabel}
              placeholder="Chọn danh mục"
              onPress={() => {
                setFieldErrors((prev) => ({ ...prev, category: undefined }));
                setPicker("category");
              }}
              disabled={loading || rootCategories.length === 0}
              error={fieldErrors.category}
            />
            <FieldBox
              label="Danh mục con"
              value={subCategoryLabel}
              placeholder={subCategories.length ? "Chọn danh mục con" : "None"}
              onPress={() => setPicker("subCategory")}
              disabled={loading || subCategories.length === 0}
            />
          </View>

          <View style={{ height: 12 }} />

          <View style={styles.twoCols}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: ui.text }]}>Số tiền</Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: ui.input,
                    borderColor: fieldErrors.amount ? ui.danger : ui.stroke,
                  },
                ]}
              >
                <Text style={[styles.currency, { color: ui.muted }]}>₫</Text>
                <TextInput
                  value={amountText}
                  onChangeText={(t) => {
                    setAmountText(onlyDigits(t));
                    setFieldErrors((prev) => ({ ...prev, amount: undefined }));
                  }}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={ui.muted}
                  style={[styles.inputText, { color: ui.text }]}
                />
              </View>
              {fieldErrors.amount ? (
                <Text style={styles.errorText}>{fieldErrors.amount}</Text>
              ) : null}
            </View>

            <FieldBox
              label="Ví"
              value={walletLabel}
              placeholder="Chọn ví"
              onPress={() => {
                setFieldErrors((prev) => ({ ...prev, wallet: undefined }));
                setPicker("wallet");
              }}
              disabled={loading || wallets.length === 0}
              error={fieldErrors.wallet}
            />
          </View>

          <View style={{ height: 12 }} />

          <Text style={[styles.label, { color: ui.text }]}>Ngày</Text>
          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: ui.input,
                borderColor: fieldErrors.date ? ui.danger : ui.stroke,
              },
            ]}
          >
            <Ionicons name="calendar-outline" size={18} color={ui.muted} />
            <TextInput
              value={date}
              onChangeText={(v) => {
                setDate(v);
                setFieldErrors((prev) => ({ ...prev, date: undefined }));
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={ui.muted}
              style={[styles.inputText, { color: ui.text }]}
            />
          </View>
          {fieldErrors.date ? (
            <Text style={styles.errorText}>{fieldErrors.date}</Text>
          ) : null}

          <View style={{ height: 12 }} />

          <Text style={[styles.label, { color: ui.text }]}>Mô tả</Text>
          <View style={[styles.textArea, { backgroundColor: ui.input }]}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Nhập mô tả..."
              placeholderTextColor={ui.muted}
              multiline
              style={[styles.textAreaInput, { color: ui.text }]}
            />
          </View>

          {loading ? (
            <View
              style={{
                marginTop: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <ActivityIndicator />
              <Text style={{ color: ui.muted, fontSize: 12 }}>
                Đang tải danh mục & ví...
              </Text>
            </View>
          ) : null}
        </View>

        {/* Buttons */}
        <View style={styles.bottomRow}>
          <Pressable
            onPress={() => nav.goBack()}
            style={({ pressed }) => [
              styles.bottomBtnSecondary,
              {
                backgroundColor: ui.card,
                borderColor: ui.stroke,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.bottomBtnText, { color: ui.text }]}>
              Hủy
            </Text>
          </Pressable>

          <Pressable
            onPress={onSubmit}
            disabled={submitting || loading}
            style={({ pressed }) => [
              styles.bottomBtn,
              {
                backgroundColor: ui.primary,
                opacity: submitting || loading ? 0.65 : pressed ? 0.9 : 1,
              },
              shadow,
            ]}
          >
            {submitting ? (
              <ActivityIndicator />
            ) : (
              <Text
                style={[styles.bottomBtnText, { color: "#052E1B" }]}
              >
                Thêm giao dịch
              </Text>
            )}
          </Pressable>
        </View>
        </View>
      </ScrollView>

      {/* Pickers */}
      <SelectModal
        visible={picker === "category"}
        title="Chọn danh mục"
        selectedValue={categoryId}
        items={rootCategories.map((c: any) => ({ label: c.name, value: c.id }))}
        onClose={() => setPicker(null)}
        onPick={(v) => {
          setCategoryId(v);
          setPicker(null);
        }}
      />

      <SelectModal
        visible={picker === "subCategory"}
        title="Chọn danh mục con"
        selectedValue={subCategoryId}
        items={subCategories.map((c: any) => ({ label: c.name, value: c.id }))}
        onClose={() => setPicker(null)}
        onPick={(v) => {
          setSubCategoryId(v);
          setPicker(null);
        }}
      />

      <SelectModal
        visible={picker === "wallet"}
        title="Chọn ví"
        selectedValue={walletId}
        items={wallets.map((w: any) => ({
          label: walletName(w),
          value: walletKey(w),
        }))}
        onClose={() => setPicker(null)}
        onPick={(v) => {
          setWalletId(v);
          setFieldErrors((prev) => ({ ...prev, wallet: undefined }));
          setPicker(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  page: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },

  h1: { fontFamily: "Faustina_700Bold", fontSize: 24, lineHeight: 29 },
  h2: { marginTop: 3, fontFamily: "Faustina_500Medium", fontSize: 13.5 },

  heroCard: {
    borderRadius: 24,
    padding: 18,
    minHeight: 154,
    overflow: "hidden",
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  heroLabel: {
    marginTop: 14,
    color: "rgba(255,255,255,0.84)",
    fontFamily: "Faustina_600SemiBold",
    fontSize: 13,
  },
  heroAmount: {
    marginTop: 2,
    color: "#FFFFFF",
    fontFamily: "Faustina_700Bold",
    fontSize: 34,
    lineHeight: 40,
  },
  heroMeta: {
    marginTop: 8,
    color: "rgba(255,255,255,0.82)",
    fontFamily: "Faustina_500Medium",
    fontSize: 13,
  },

  card: {
    marginTop: 14,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
  },

  label: { fontFamily: "Faustina_700Bold", fontSize: 13.5, marginBottom: 8 },

  segRow: { flexDirection: "row", gap: 12 },
  segBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
  },
  segEmoji: { fontSize: 17 },
  segText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13.5,
  },

  twoCols: { flexDirection: "row", gap: 12 },

  select: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
  },
  selectText: { flex: 1, fontFamily: "Faustina_500Medium", fontSize: 13 },

  inputRow: {
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
  },
  currency: { fontFamily: "Faustina_700Bold" },
  inputText: { flex: 1, fontFamily: "Faustina_700Bold", fontSize: 14 },

  textArea: { borderRadius: 16, padding: 12, minHeight: 112 },
  textAreaInput: {
    minHeight: 90,
    fontFamily: "Faustina_500Medium",
    fontSize: 13,
  },

  bottomRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  bottomBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBtnSecondary: {
    flex: 0.7,
    minHeight: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  bottomBtnText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13.5,
  },

  errorText: {
    marginTop: 6,
    color: "#EF4444",
    fontFamily: "Faustina_500Medium",
    fontSize: 12,
  },

  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: Platform.OS === "android" ? 4 : 0,
  },
});
