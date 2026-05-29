import React, { useCallback, useMemo, useState } from "react";
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
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useTheme } from "../../theme/ThemeContext";
import type { GroupStackParamList } from "../../app/GroupStack";
import {
  commonStyles,
  getErrMsg,
  getGroupUi,
  getShadow,
  GREEN,
} from "./groupUi";
import {
  createGroupTransaction,
  getGroupCategories,
  getGroupWallets,
  GroupCategory,
  GroupCategoryType,
  GroupWallet,
} from "../../services/groupFinance";

type Rt = RouteProp<GroupStackParamList, "CreateGroupTransaction">;

export default function CreateGroupTransactionScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId } = route.params;

  const [wallets, setWallets] = useState<GroupWallet[]>([]);
  const [categories, setCategories] = useState<GroupCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<GroupCategoryType>("expense");
  const [walletId, setWalletId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const filteredCategories = categories.filter((c) => c.type === type);

  const load = useCallback(async () => {
    try {
      const [w, c] = await Promise.all([
        getGroupWallets(groupId),
        getGroupCategories(groupId),
      ]);

      setWallets(w);
      setCategories(c);

      if (w[0]) setWalletId(w[0].id);

      const firstExpense = c.find((x) => x.type === "expense");
      if (firstExpense) setCategoryId(firstExpense.id);
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const changeType = (nextType: GroupCategoryType) => {
    setType(nextType);
    const first = categories.find((c) => c.type === nextType);
    setCategoryId(first?.id ?? null);
  };

  const onSubmit = async () => {
    const money = Number(amount);

    if (!walletId)
      return Alert.alert("Thiếu ví nhóm", "Vui lòng tạo hoặc chọn ví nhóm");
    if (!categoryId)
      return Alert.alert("Thiếu danh mục", "Vui lòng tạo hoặc chọn danh mục");
    if (!money || money <= 0)
      return Alert.alert("Sai số tiền", "Số tiền phải lớn hơn 0");

    try {
      setSaving(true);
      await createGroupTransaction(groupId, {
        groupWalletId: walletId,
        groupCategoryId: categoryId,
        amount: money,
        description: description.trim() || undefined,
      });
      Toast.show({ type: "success", text1: "Đã tạo giao dịch nhóm" });
      nav.goBack();
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[commonStyles.root, { backgroundColor: ui.bg }]}>
      <View style={{ height: insets.top, backgroundColor: ui.bg }} />

      <ScrollView
        style={commonStyles.page}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 10,
          paddingBottom: insets.bottom + 28,
        }}
      >
        <Pressable onPress={() => nav.goBack()} style={commonStyles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={ui.text} />
        </Pressable>

        <Text style={[commonStyles.h1, { color: ui.text }]}>
          Thêm giao dịch nhóm
        </Text>
        <Text style={[commonStyles.h2, { color: ui.muted }]}>
          Ghi nhận thu hoặc chi cho ví chung của nhóm.
        </Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={GREEN} />
          </View>
        ) : (
          <View
            style={[
              commonStyles.card,
              { backgroundColor: ui.card, borderColor: ui.border },
              shadow,
            ]}
          >
            <Text style={[commonStyles.label, { color: ui.text }]}>
              Loại giao dịch
            </Text>
            <View style={styles.typeRow}>
              <Pressable
                onPress={() => changeType("expense")}
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor:
                      type === "expense" ? "rgba(252,165,165,0.45)" : ui.input,
                    borderColor: type === "expense" ? "#EF4444" : ui.border,
                  },
                ]}
              >
                <Text style={[styles.typeText, { color: ui.text }]}>
                  Chi tiêu
                </Text>
              </Pressable>

              <Pressable
                onPress={() => changeType("income")}
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor:
                      type === "income" ? "rgba(78,236,165,0.35)" : ui.input,
                    borderColor: type === "income" ? GREEN : ui.border,
                  },
                ]}
              >
                <Text style={[styles.typeText, { color: ui.text }]}>
                  Thu nhập
                </Text>
              </Pressable>
            </View>

            <Text style={[commonStyles.label, { color: ui.text }]}>
              Ví nhóm
            </Text>
            <View style={styles.chipWrap}>
              {wallets.map((w) => (
                <Pressable
                  key={w.id}
                  onPress={() => setWalletId(w.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        walletId === w.id ? "rgba(78,236,165,0.32)" : ui.input,
                      borderColor: walletId === w.id ? GREEN : ui.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: ui.text }]}>
                    {w.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[commonStyles.label, { color: ui.text }]}>
              Danh mục
            </Text>
            <View style={styles.chipWrap}>
              {filteredCategories.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        categoryId === c.id
                          ? "rgba(78,236,165,0.32)"
                          : ui.input,
                      borderColor: categoryId === c.id ? GREEN : ui.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: ui.text }]}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            {wallets.length === 0 || filteredCategories.length === 0 ? (
              <View style={[styles.warningBox, { backgroundColor: ui.input }]}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#F59E0B"
                />
                <Text style={[styles.warningText, { color: ui.muted }]}>
                  Cần có ít nhất một ví nhóm và một danh mục{" "}
                  {type === "income" ? "thu nhập" : "chi tiêu"}.
                </Text>
              </View>
            ) : null}

            <Text style={[commonStyles.label, { color: ui.text }]}>
              Số tiền
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={ui.muted}
              style={[
                commonStyles.input,
                {
                  backgroundColor: ui.input,
                  borderColor: ui.border,
                  color: ui.text,
                },
              ]}
            />

            <Text style={[commonStyles.label, { color: ui.text }]}>Mô tả</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Ví dụ: Mua đồ ăn tối"
              placeholderTextColor={ui.muted}
              style={[
                commonStyles.input,
                {
                  backgroundColor: ui.input,
                  borderColor: ui.border,
                  color: ui.text,
                },
              ]}
            />

            <Pressable
              disabled={saving}
              onPress={onSubmit}
              style={[
                commonStyles.primaryBtn,
                {
                  marginTop: 18,
                  backgroundColor: GREEN,
                  opacity: saving ? 0.65 : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#063B2B" />
              ) : (
                <Text style={commonStyles.primaryBtnText}>Lưu giao dịch</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { minHeight: 300, alignItems: "center", justifyContent: "center" },
  typeRow: { marginTop: 8, flexDirection: "row", gap: 12 },
  typeBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  typeText: { fontFamily: "Faustina_700Bold", fontSize: 13 },
  chipWrap: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
  },
  chipText: { fontFamily: "Faustina_700Bold", fontSize: 12.5 },
  warningBox: {
    marginTop: 14,
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontFamily: "Faustina_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
});
