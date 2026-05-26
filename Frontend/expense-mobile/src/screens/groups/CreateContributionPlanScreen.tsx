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
  createContributionPlan,
  getGroupWallets,
  GroupWallet,
} from "../../services/groupFinance";

type Rt = RouteProp<GroupStackParamList, "CreateContributionPlan">;

export default function CreateContributionPlanScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId } = route.params;

  const [wallets, setWallets] = useState<GroupWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [walletId, setWalletId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const load = useCallback(async () => {
    try {
      const w = await getGroupWallets(groupId);
      setWallets(w);
      if (w[0]) setWalletId(w[0].id);
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
    const cleanTitle = title.trim();
    const amount = targetAmount ? Number(targetAmount) : null;

    if (!walletId)
      return Alert.alert("Thiếu ví nhóm", "Vui lòng chọn ví nhận đóng góp");
    if (!cleanTitle)
      return Alert.alert("Thiếu tiêu đề", "Vui lòng nhập tên quỹ");
    if (amount != null && (!amount || amount <= 0)) {
      return Alert.alert("Sai số tiền", "Mục tiêu đóng góp phải lớn hơn 0");
    }

    try {
      setSaving(true);
      const plan = await createContributionPlan(groupId, {
        groupWalletId: walletId,
        title: cleanTitle,
        description: description.trim() || undefined,
        targetAmount: amount,
        dueDate: dueDate.trim() || null,
      });
      Toast.show({ type: "success", text1: "Đã tạo quỹ đóng góp" });
      nav.replace("ContributionPlanDetail", {
        groupId,
        planId: plan.id,
        myRole: "owner",
      });
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
          Tạo quỹ đóng góp
        </Text>
        <Text style={[commonStyles.h2, { color: ui.muted }]}>
          Tạo quỹ để phân bổ và theo dõi đóng góp của từng thành viên.
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
              Ví nhận tiền
            </Text>
            <View style={styles.chipWrap}>
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
              Tên quỹ
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ví dụ: Quỹ tiền nhà tháng 5"
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
              placeholder="Mô tả ngắn về mục đích đóng góp"
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
              Mục tiêu tiền
            </Text>
            <TextInput
              value={targetAmount}
              onChangeText={setTargetAmount}
              keyboardType="numeric"
              placeholder="6000000"
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
              Hạn đóng
            </Text>
            <TextInput
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
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
                  marginTop: 20,
                  backgroundColor: GREEN,
                  opacity: saving ? 0.65 : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#063B2B" />
              ) : (
                <Text style={commonStyles.primaryBtnText}>Tạo quỹ</Text>
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
