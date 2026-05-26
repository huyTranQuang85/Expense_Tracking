import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import { checkBudgetAndNotifyInApp } from "../../services/budgets";
import SelectModal from "../../components/SelectModal";
import {
  updateTransaction,
  softDeleteTransaction,
  TxType,
} from "../../services/transaction";
import { fetchCategories, Category } from "../../services/dashboard";
import { api } from "../../services/api";
import { useTheme } from "../../theme/ThemeContext";

type Wallet = { id: string | number; name?: string; title?: string };

const BG = "#F3F5F7";
const CARD = "#FFFFFF";
const INPUT_BG = "#DADADA";
const GREEN = "#4EECA5";

const INCOME_ACTIVE = "rgba(78,236,165,0.45)";
const EXPENSE_ACTIVE = "rgba(252,165,165,0.55)";

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
function inferIsoDate(tx: any) {
  const v =
    tx?.date ??
    tx?.transactionDate ??
    tx?.transaction_date ??
    tx?.createdAt ??
    tx?.created_at ??
    null;
  if (!v) return "";
  const s = String(v);
  if (s.includes("T")) return s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try {
    return new Date(s).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function EditTransactionScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  // 🔹 Dùng chung ThemeContext như AddTransactionScreen
  const { mode } = useTheme();
  const isDark = mode === "dark";

  const ui = useMemo(() => {
    // Light mode giống AddTransaction
    if (!isDark)
      return {
        bg: BG,
        card: CARD,
        input: INPUT_BG,
        text: "#111111",
        muted: "rgba(0,0,0,0.55)",
      };

    // Dark mode – chỉ đổi màu, không đổi layout
    return {
      bg: "#020617", // slate-950
      card: "rgba(15,23,42,0.96)", // slate-900
      input: "rgba(30,41,59,0.9)", // slate-800-ish
      text: "rgba(248,250,252,0.96)", // slate-50
      muted: "rgba(148,163,184,0.95)", // slate-400
    };
  }, [isDark]);

  const shadow = isDark ? {} : styles.shadow;

  const tx = route.params?.tx;
  const txId = tx?.id ?? tx?.transactionId ?? tx?.transaction_id;

  const initType: TxType = (tx?.category_type ??
    tx?.type ??
    (Number(tx?.amount ?? 0) >= 0 ? "income" : "expense")) as TxType;

  const initAmount = Math.abs(Number(tx?.amount ?? 0)) || 0;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<TxType>(initType);
  const lastTypeRef = useRef(type);

  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const didMount = useRef(false);

  const [categoryId, setCategoryId] = useState<any>(
    tx?.categoryId ?? tx?.category_id ?? null,
  );
  const [subCategoryId, setSubCategoryId] = useState<any>(
    tx?.subCategoryId ?? tx?.sub_category_id ?? null,
  );
  const [walletId, setWalletId] = useState<any>(
    tx?.walletId ?? tx?.wallet_id ?? null,
  );

  const [amountText, setAmountText] = useState(
    initAmount ? String(initAmount) : "",
  );
  const [date, setDate] = useState(inferIsoDate(tx));
  const [description, setDescription] = useState(
    tx?.description ?? tx?.note ?? "",
  );

  const [picker, setPicker] = useState<
    null | "category" | "subCategory" | "wallet"
  >(null);

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

      setCategories(catsArr);
      setWallets(wsArr);

      // fallback wallet nếu null
      if (!walletId && wsArr.length) setWalletId(wsArr[0]?.id);

      // đảm bảo chọn category hợp lệ theo type
      if (categoryId) return;

      const roots = catsArr.filter(
        (c: any) => !parentKey(c) && c?.type === type,
      );
      if (roots.length) setCategoryId(roots[0].id);
    } finally {
      setLoading(false);
    }
  }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!categories.length) return;

    const rawLeafId =
      tx?.subCategoryId ??
      tx?.sub_category_id ??
      tx?.categoryId ??
      tx?.category_id ??
      null;

    if (!rawLeafId) return;

    const leafId = String(rawLeafId);
    const leaf = categories.find((c: any) => String(c.id) === leafId);
    if (!leaf) return;

    const parentId = parentKey(leaf);

    if (parentId) {
      setCategoryId(String(parentId));
      setSubCategoryId(String(leaf.id));
    } else {
      setCategoryId(String(leaf.id));
      setSubCategoryId(null);
    }
  }, [
    categories,
    tx?.categoryId,
    tx?.category_id,
    tx?.subCategoryId,
    tx?.sub_category_id,
  ]);

  useEffect(() => {
    if (!subCategoryId) return;

    const sub = categories.find((c) => String(c.id) === String(subCategoryId));
    if (sub && String(parentKey(sub)) === String(categoryId)) return;

    setSubCategoryId(null);
  }, [categoryId, categories, subCategoryId]);

  useEffect(() => {
    if (!categories.length) return;

    if (!didMount.current) {
      didMount.current = true;
      return;
    }

    if (lastTypeRef.current === type) return;
    lastTypeRef.current = type;

    const roots = categories.filter(
      (c: any) => !parentKey(c) && c?.type === type,
    );
    setCategoryId(roots[0]?.id ?? null);
    setSubCategoryId(null);
  }, [type, categories]);

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
    const w = wallets.find((x: any) => String(x.id) === String(walletId));
    return w?.name ?? w?.title ?? "";
  }, [wallets, walletId]);

  const validate = () => {
    if (!txId) return "Không tìm thấy id giao dịch";
    const amt = Number(amountText || "0");
    if (!Number.isFinite(amt) || amt <= 0) return "Số tiền phải > 0";
    if (!categoryId) return "Vui lòng chọn danh mục";
    if (!walletId) return "Vui lòng chọn ví";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return "Ngày phải theo dạng YYYY-MM-DD";
    return null;
  };

  const leafCategoryId = subCategoryId ?? categoryId;

  const onSave = async () => {
    const msg = validate();
    if (msg) return showToast(msg);

    try {
      setSubmitting(true);

      await updateTransaction(txId, {
        type,
        amount: Number(amountText),
        categoryId: leafCategoryId,
        walletId,
        date,
        description: description?.trim() ?? "",
      });

      await checkBudgetAndNotifyInApp();

      showToast("Lưu thay đổi thành công");
      setTimeout(() => nav.goBack(), 450);
    } catch (e: any) {
      showToast(
        e?.response?.data?.message ?? "Cập nhật thất bại. Vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = () => {
    if (!txId) return;

    Alert.alert("Xóa giao dịch", "Bạn chắc chắn muốn xóa giao dịch này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            setSubmitting(true);
            await softDeleteTransaction(txId);
            showToast("Xóa giao dịch thành công");
            setTimeout(() => nav.goBack(), 450);
          } catch (e: any) {
            showToast(e?.response?.data?.message ?? "Xóa thất bại.");
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
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
          opacity: pressed ? 0.9 : 1,
        },
        shadow,
      ]}
    >
      <Text style={styles.segEmoji}>{emoji}</Text>
      <Text
        style={[
          styles.segText,
          { color: ui.text }, // dynamic color cho dark/light
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
  }: {
    label: string;
    value: string;
    placeholder: string;
    onPress: () => void;
    disabled?: boolean;
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
          padding: 16,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <Pressable
          onPress={() => nav.goBack()}
          hitSlop={10}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color={ui.text} />
        </Pressable>

        <Text style={[styles.h1, { color: ui.text }]}>Chỉnh sửa giao dịch</Text>
        <Text style={[styles.h2, { color: ui.muted }]}>
          Thêm giao dịch thu nhập hoặc chi tiêu mới
        </Text>

        <View style={[styles.card, { backgroundColor: ui.card }, shadow]}>
          {loading ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <>
              <Text style={[styles.label, { color: ui.text }]}>
                Loại giao dịch
              </Text>
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
                  onPress={() => setPicker("category")}
                  disabled={rootCategories.length === 0}
                />
                <FieldBox
                  label="Danh mục con"
                  value={subCategoryLabel}
                  placeholder={
                    subCategories.length ? "Chọn danh mục con" : "None"
                  }
                  onPress={() => setPicker("subCategory")}
                  disabled={subCategories.length === 0}
                />
              </View>

              <View style={{ height: 12 }} />

              <View style={styles.twoCols}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: ui.text }]}>
                    Số tiền
                  </Text>
                  <View
                    style={[styles.inputRow, { backgroundColor: ui.input }]}
                  >
                    <Text style={[styles.currency, { color: ui.muted }]}>
                      ₫
                    </Text>
                    <TextInput
                      value={amountText}
                      onChangeText={(t) => setAmountText(onlyDigits(t))}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={ui.muted}
                      style={[styles.inputText, { color: ui.text }]}
                    />
                  </View>
                </View>

                <FieldBox
                  label="Ví"
                  value={walletLabel}
                  placeholder="Chọn ví"
                  onPress={() => setPicker("wallet")}
                  disabled={wallets.length === 0}
                />
              </View>

              <View style={{ height: 12 }} />

              <Text style={[styles.label, { color: ui.text }]}>Ngày</Text>
              <View style={[styles.inputRow, { backgroundColor: ui.input }]}>
                <Ionicons name="calendar-outline" size={18} color={ui.muted} />
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={ui.muted}
                  style={[styles.inputText, { color: ui.text }]}
                />
              </View>

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
            </>
          )}
        </View>

        <View style={styles.bottomRow}>
          <Pressable
            onPress={onSave}
            disabled={submitting || loading}
            style={({ pressed }) => [
              styles.bottomBtn,
              {
                backgroundColor: GREEN,
                opacity: submitting || loading ? 0.65 : pressed ? 0.9 : 1,
              },
              shadow,
            ]}
          >
            {submitting ? (
              <ActivityIndicator />
            ) : (
              <Text
                style={[
                  styles.bottomBtnText,
                  { color: isDark ? "#052E1B" : "#0E1B13" },
                ]}
              >
                Lưu thay đổi
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={onDelete}
            disabled={submitting || loading}
            style={({ pressed }) => [
              styles.bottomBtn,
              {
                backgroundColor: GREEN,
                opacity: submitting || loading ? 0.65 : pressed ? 0.9 : 1,
              },
              shadow,
            ]}
          >
            <Text
              style={[
                styles.bottomBtnText,
                { color: isDark ? "#052E1B" : "#0E1B13" },
              ]}
            >
              Xóa giao dịch
            </Text>
          </Pressable>
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
          label: w.name ?? w.title ?? "Ví",
          value: w.id,
        }))}
        onClose={() => setPicker(null)}
        onPick={(v) => {
          setWalletId(v);
          setPicker(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  backBtn: { width: 34, height: 34, justifyContent: "center" },

  h1: { marginTop: 8, fontFamily: "Faustina_700Bold", fontSize: 20 },
  h2: { marginTop: 4, fontFamily: "Faustina_500Medium" },

  card: { marginTop: 14, borderRadius: 16, padding: 14 },

  label: { fontFamily: "Faustina_700Bold", fontSize: 13, marginBottom: 8 },

  segRow: { flexDirection: "row", gap: 12 },
  segBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  segEmoji: { fontSize: 16 },
  segText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13,
  },

  twoCols: { flexDirection: "row", gap: 12 },

  select: {
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: { flex: 1, fontFamily: "Faustina_500Medium", fontSize: 13 },

  inputRow: {
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  currency: { fontFamily: "Faustina_700Bold" },
  inputText: { flex: 1, fontFamily: "Faustina_700Bold", fontSize: 13 },

  textArea: { borderRadius: 12, padding: 12, minHeight: 120 },
  textAreaInput: {
    minHeight: 90,
    fontFamily: "Faustina_500Medium",
    fontSize: 13,
  },

  bottomRow: { flexDirection: "row", gap: 16, marginTop: 18 },
  bottomBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBtnText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13,
  },

  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
