import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import SelectModal from "../../components/SelectModal";
import { useCategories } from "../categories/CategoriesContext";
import {
  getChildCategories,
  getCategoryById,
  resolveCategoryIcon,
} from "../categories/categoryFixtures";
import type { RootStackParamList } from "../../../App";
import { TransactionRecord, TransactionType, useTransactions } from "./TransactionContext";

type Props = NativeStackScreenProps<RootStackParamList, "AddTransaction" | "EditTransaction">;

type SelectItem = {
  label: string;
  value: string | number;
  subLabel?: string;
};

function todayText() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? `${Number(digits).toLocaleString("vi-VN")}` : "";
}

export default function TransactionFormScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const { categories, getRoots, getChildren } = useCategories();
  const { saveTransaction, getTransaction, walletOptions } = useTransactions();

  const editTx = route.params && "tx" in route.params ? route.params.tx : null;
  const editId = route.params && "txId" in route.params ? route.params.txId : null;
  const current =
    (editTx as TransactionRecord | null) ?? getTransaction(editId ? String(editId) : null);

  const [type, setType] = useState<TransactionType>(current?.type ?? "expense");
  const [amount, setAmount] = useState(String(current?.amount ?? ""));
  const [description, setDescription] = useState(current?.description ?? "");
  const [date, setDate] = useState(current?.date ?? todayText());
  const [categoryId, setCategoryId] = useState<string | number | null>(
    current?.categoryId ?? null,
  );
  const [subCategoryId, setSubCategoryId] = useState<string | number | null>(
    current?.subCategoryId ?? null,
  );
  const [walletId, setWalletId] = useState(current?.walletId ?? walletOptions[0]?.id ?? "main-wallet");
  const [walletName, setWalletName] = useState(current?.walletName ?? walletOptions[0]?.name ?? "Ví chính");

  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [subCategoryPickerOpen, setSubCategoryPickerOpen] = useState(false);
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);

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
            pinkSoft: "rgba(251,207,213,0.8)",
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
            pinkSoft: "rgba(251,207,213,0.8)",
          },
    [isDark],
  );

  const rootCategories = useMemo(
    () => getRoots(type as TransactionType),
    [getRoots, type],
  );

  const selectedCategory = useMemo(
    () => getCategoryById(String(categoryId), categories),
    [categoryId, categories],
  );

  const subCategories = useMemo(() => {
    if (!selectedCategory) return [];
    return getChildren(selectedCategory.id);
  }, [getChildren, selectedCategory]);

  const selectedSubCategory = useMemo(
    () => getCategoryById(String(subCategoryId), categories),
    [categories, subCategoryId],
  );

  const categoryItems = useMemo<SelectItem[]>(
    () =>
      rootCategories.map((item) => ({
        label: `${resolveCategoryIcon(item.iconKey)} ${item.name}`,
        value: item.id,
        subLabel: item.description || `${getChildren(item.id).length} danh mục con`,
      })),
    [getChildren, rootCategories],
  );

  const subCategoryItems = useMemo<SelectItem[]>(
    () =>
      subCategories.map((item) => ({
        label: `${resolveCategoryIcon(item.iconKey)} ${item.name}`,
        value: item.id,
        subLabel: item.description || "Danh mục con",
      })),
    [subCategories],
  );

  const walletItems = useMemo<SelectItem[]>(
    () =>
      walletOptions.map((item) => ({
        label: item.name,
        value: item.id,
      })),
    [walletOptions],
  );

  useEffect(() => {
    if (selectedCategory && selectedCategory.type !== type) {
      setCategoryId(null);
      setSubCategoryId(null);
    }
  }, [selectedCategory, type]);

  const selectedWalletLabel = walletName || "Ví chính";

  const onSave = () => {
    if (!selectedCategory) {
      Alert.alert("Thiếu danh mục", "Hãy chọn danh mục trước khi lưu giao dịch.");
      return;
    }

    if (!amount.trim()) {
      Alert.alert("Thiếu số tiền", "Hãy nhập số tiền giao dịch.");
      return;
    }

    saveTransaction({
      id: current?.id,
      type,
      amount: Number(amount.replace(/[^\d]/g, "")),
      description: description.trim(),
      date,
      categoryId: selectedCategory.id,
      subCategoryId: selectedSubCategory?.id ?? null,
      walletId,
      walletName,
    });

    navigation.goBack();
  };

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
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.stroke,
              opacity: pressed ? 0.86 : 1,
            },
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>

        <Text style={[styles.title, { color: colors.text }]}>
          {current ? "Chỉnh sửa giao dịch" : "Thêm giao dịch"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {current
            ? "Cập nhật giao dịch thu nhập hoặc chi tiêu"
            : "Thêm giao dịch thu nhập hoặc chi tiêu mới"}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Loại giao dịch</Text>
          <View style={styles.segmentRow}>
            {([
              { value: "income", label: "Thu nhập", emoji: "💰", activeBg: colors.greenSoft },
              { value: "expense", label: "Chi tiêu", emoji: "🪙", activeBg: colors.pinkSoft },
            ] as const).map((item) => {
              const active = type === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => {
                    setType(item.value);
                    setCategoryId(null);
                    setSubCategoryId(null);
                  }}
                  style={({ pressed }) => [
                    styles.segmentBtn,
                    {
                      backgroundColor: active ? item.activeBg : colors.cardSoft,
                      borderColor: active ? colors.green : colors.stroke,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text style={styles.segmentEmoji}>{item.emoji}</Text>
                  <Text style={[styles.segmentText, { color: colors.text }]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Danh mục</Text>
              <Pressable
                onPress={() => setCategoryPickerOpen(true)}
                style={[styles.selectField, { backgroundColor: colors.cardSoft, borderColor: colors.stroke }]}
              >
                <Text style={[styles.selectText, { color: selectedCategory ? colors.text : colors.muted }]} numberOfLines={1}>
                  {selectedCategory?.name ?? "Chọn danh mục"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.muted} />
              </Pressable>
            </View>

            <View style={styles.gridCol}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Danh mục con</Text>
              <Pressable
                onPress={() => selectedCategory && setSubCategoryPickerOpen(true)}
                style={[
                  styles.selectField,
                  { backgroundColor: colors.cardSoft, borderColor: colors.stroke, opacity: selectedCategory ? 1 : 0.72 },
                ]}
              >
                <Text style={[styles.selectText, { color: selectedSubCategory ? colors.text : colors.muted }]} numberOfLines={1}>
                  {selectedSubCategory?.name ?? "Chọn danh mục con"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.muted} />
              </Pressable>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Số tiền</Text>
              <View style={[styles.inputField, { backgroundColor: colors.cardSoft, borderColor: colors.stroke }]}>
                <Text style={[styles.currencyPrefix, { color: colors.muted }]}>đ</Text>
                <TextInput
                  value={amount}
                  onChangeText={(text) => setAmount(formatCurrencyInput(text))}
                  keyboardType="number-pad"
                  placeholder="50000"
                  placeholderTextColor={colors.muted}
                  style={[styles.inputText, { color: colors.text }]}
                />
              </View>
            </View>

            <View style={styles.gridCol}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Ví</Text>
              <Pressable
                onPress={() => setWalletPickerOpen(true)}
                style={[styles.selectField, { backgroundColor: colors.cardSoft, borderColor: colors.stroke }]}
              >
                <Text style={[styles.selectText, { color: colors.text }]} numberOfLines={1}>
                  {selectedWalletLabel}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.muted} />
              </Pressable>
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.text }]}>Ngày</Text>
          <View style={[styles.selectField, { backgroundColor: colors.cardSoft, borderColor: colors.stroke }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.muted} />
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.muted}
              style={[styles.inputText, { color: colors.text, flex: 1 }]}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.text }]}>Mô tả</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Mô tả giao dịch"
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.textArea, { backgroundColor: colors.cardSoft, color: colors.text, borderColor: colors.stroke }]}
          />
        </View>

        <View style={styles.footerActions}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.footerBtn,
              { backgroundColor: colors.green, opacity: pressed ? 0.86 : 1 },
            ]}
          >
            <Text style={styles.footerBtnText}>Hủy</Text>
          </Pressable>

          <Pressable
            onPress={onSave}
            style={({ pressed }) => [
              styles.footerBtn,
              { backgroundColor: colors.green, opacity: pressed ? 0.86 : 1 },
            ]}
          >
              <Text style={styles.footerBtnText}>
                {current ? "Lưu giao dịch" : "Thêm giao dịch"}
              </Text>
          </Pressable>
        </View>
      </ScrollView>

      <SelectModal
        visible={categoryPickerOpen}
        title="Chọn danh mục"
        items={categoryItems}
        selectedValue={categoryId ?? undefined}
        onClose={() => setCategoryPickerOpen(false)}
        onPick={(value) => {
          setCategoryId(value);
          setSubCategoryId(null);
          setCategoryPickerOpen(false);
        }}
      />

      <SelectModal
        visible={subCategoryPickerOpen}
        title="Chọn danh mục con"
        items={subCategoryItems}
        selectedValue={subCategoryId ?? undefined}
        onClose={() => setSubCategoryPickerOpen(false)}
        onPick={(value) => {
          setSubCategoryId(value);
          setSubCategoryPickerOpen(false);
        }}
      />

      <SelectModal
        visible={walletPickerOpen}
        title="Chọn ví"
        items={walletItems.length > 0 ? walletItems : [{ label: "Ví chính", value: "main-wallet" }]}
        selectedValue={walletId}
        onClose={() => setWalletPickerOpen(false)}
        onPick={(value) => {
          setWalletId(String(value));
          const picked = walletOptions.find((item) => item.id === String(value));
          setWalletName(picked?.name ?? "Ví chính");
          setWalletPickerOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  title: { marginTop: 14, fontFamily: "Faustina_700Bold", fontSize: 26 },
  subtitle: { marginTop: 4, fontFamily: "Faustina_400Regular", fontSize: 13 },
  card: { marginTop: 16, borderRadius: 20, padding: 14 },
  sectionLabel: { fontFamily: "Faustina_700Bold", fontSize: 14, marginBottom: 10 },
  segmentRow: { flexDirection: "row", gap: 12 },
  segmentBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 54,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  segmentEmoji: { fontSize: 16 },
  segmentText: { fontFamily: "Faustina_700Bold", fontSize: 13 },
  gridRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  gridCol: { flex: 1 },
  fieldLabel: { fontFamily: "Faustina_700Bold", fontSize: 13, marginBottom: 8 },
  selectField: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  selectText: { flex: 1, fontFamily: "Faustina_500Medium", fontSize: 13 },
  inputField: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currencyPrefix: { fontFamily: "Faustina_700Bold", fontSize: 13 },
  inputText: { flex: 1, fontFamily: "Faustina_500Medium", fontSize: 13 },
  textArea: {
    minHeight: 120,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: "Faustina_400Regular",
    fontSize: 13,
    textAlignVertical: "top",
  },
  footerActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  footerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  footerBtnText: { fontFamily: "Faustina_700Bold", color: "#0E1B13", fontSize: 14 },
});
