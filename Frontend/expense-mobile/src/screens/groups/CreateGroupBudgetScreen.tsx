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
  createGroupBudget,
  getGroupCategories,
  getGroupWallets,
  GroupCategory,
  GroupWallet,
} from "../../services/groupFinance";

type Rt = RouteProp<GroupStackParamList, "CreateGroupBudget">;

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function CreateGroupBudgetScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId, defaultMonth } = route.params;

  const [wallets, setWallets] = useState<GroupWallet[]>([]);
  const [categories, setCategories] = useState<GroupCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [month, setMonth] = useState(defaultMonth || currentMonth());
  const [walletId, setWalletId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [limitAmount, setLimitAmount] = useState("");
  const [alertThreshold, setAlertThreshold] = useState(80);

  const expenseCategories = categories.filter((c) => c.type === "expense");

  const load = useCallback(async () => {
    try {
      const [w, c] = await Promise.all([
        getGroupWallets(groupId),
        getGroupCategories(groupId, { type: "expense" }),
      ]);
      setWallets(w);
      setCategories(c);

      if (w[0]) setWalletId(w[0].id);
      if (c[0]) setCategoryId(c[0].id);
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

  const onSubmit = async () => {
    const amount = Number(limitAmount);

    if (!amount || amount <= 0) {
      return Alert.alert("Sai hạn mức", "Hạn mức ngân sách phải lớn hơn 0");
    }

    try {
      setSaving(true);
      await createGroupBudget(groupId, {
        groupCategoryId: categoryId,
        groupWalletId: walletId,
        month,
        limitAmount: amount,
        alertThreshold,
        notifyInApp: true,
        notifyEmail: false,
      });

      Toast.show({ type: "success", text1: "Đã tạo ngân sách nhóm" });
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

        <Text style={[commonStyles.h1, { color: ui.text }]}>Tạo ngân sách</Text>
        <Text style={[commonStyles.h2, { color: ui.muted }]}>
          Thiết lập hạn mức chi tiêu theo tháng cho nhóm.
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
            <Text style={[commonStyles.label, { color: ui.text }]}>Tháng</Text>
            <TextInput
              value={month}
              onChangeText={setMonth}
              placeholder="YYYY-MM"
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

            <Text style={[commonStyles.label, { color: ui.text }]}>
              Ví áp dụng
            </Text>
            <View style={styles.chipWrap}>
              <Chip
                label="Tất cả ví"
                active={walletId === null}
                onPress={() => setWalletId(null)}
                ui={ui}
              />
              {wallets.map((w) => (
                <Chip
                  key={w.id}
                  label={w.name}
                  active={walletId === w.id}
                  onPress={() => setWalletId(w.id)}
                  ui={ui}
                />
              ))}
            </View>

            <Text style={[commonStyles.label, { color: ui.text }]}>
              Danh mục chi
            </Text>
            <View style={styles.chipWrap}>
              <Chip
                label="Tất cả danh mục"
                active={categoryId === null}
                onPress={() => setCategoryId(null)}
                ui={ui}
              />
              {expenseCategories.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  active={categoryId === c.id}
                  onPress={() => setCategoryId(c.id)}
                  ui={ui}
                />
              ))}
            </View>

            <Text style={[commonStyles.label, { color: ui.text }]}>
              Hạn mức
            </Text>
            <TextInput
              value={limitAmount}
              onChangeText={setLimitAmount}
              keyboardType="numeric"
              placeholder="3000000"
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

            <Text style={[commonStyles.label, { color: ui.text }]}>
              Ngưỡng cảnh báo
            </Text>
            <View style={styles.chipWrap}>
              {[70, 80, 90, 100].map((n) => (
                <Chip
                  key={n}
                  label={`${n}%`}
                  active={alertThreshold === n}
                  onPress={() => setAlertThreshold(n)}
                  ui={ui}
                />
              ))}
            </View>

            <Pressable
              disabled={saving}
              onPress={onSubmit}
              style={[
                commonStyles.primaryBtn,
                {
                  marginTop: 20,
                  backgroundColor: GREEN,
                  opacity: saving ? 0.65 : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#063B2B" />
              ) : (
                <Text style={commonStyles.primaryBtnText}>Lưu ngân sách</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Chip({ label, active, onPress, ui }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? "rgba(78,236,165,0.32)" : ui.input,
          borderColor: active ? GREEN : ui.border,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: ui.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { minHeight: 300, alignItems: "center", justifyContent: "center" },
  chipWrap: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
  },
  chipText: { fontFamily: "Faustina_700Bold", fontSize: 12.5 },
});
