import React, { useMemo, useState } from "react";
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
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import type { GroupStackParamList } from "../../app/GroupStack";
import { useTheme } from "../../theme/ThemeContext";
import { updateGroupBudget } from "../../services/groupFinance";
import {
  commonStyles,
  getErrMsg,
  getGroupUi,
  getShadow,
  GREEN,
} from "./groupUi";

type Rt = RouteProp<GroupStackParamList, "EditGroupBudget">;

export default function EditGroupBudgetScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId, budgetId, initialBudget } = route.params;

  const [saving, setSaving] = useState(false);

  const [limitAmount, setLimitAmount] = useState(
    initialBudget?.limitAmount != null ? String(initialBudget.limitAmount) : "",
  );

  const [alertThreshold, setAlertThreshold] = useState(
    Number(initialBudget?.alertThreshold || 80),
  );

  const onSubmit = async () => {
    const amount = Number(limitAmount);

    if (!amount || amount <= 0) {
      return Alert.alert("Sai hạn mức", "Hạn mức ngân sách phải lớn hơn 0");
    }

    try {
      setSaving(true);

      await updateGroupBudget(groupId, budgetId, {
        limitAmount: amount,
        alertThreshold,
        notifyInApp: true,
      });

      Toast.show({
        type: "success",
        text1: "Đã cập nhật ngân sách",
      });

      nav.goBack();
    } catch (e) {
      Toast.show({
        type: "error",
        text1: getErrMsg(e),
      });
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
          Chỉnh sửa ngân sách
        </Text>

        <Text style={[commonStyles.h2, { color: ui.muted }]}>
          Chỉ cập nhật hạn mức và ngưỡng cảnh báo. Tháng, ví và danh mục là
          thông tin định danh của ngân sách.
        </Text>

        <View
          style={[
            commonStyles.card,
            { backgroundColor: ui.card, borderColor: ui.border },
            shadow,
          ]}
        >
          <Text style={[commonStyles.label, { color: ui.text }]}>
            Thông tin ngân sách
          </Text>

          <View
            style={[
              styles.readonlyBox,
              { backgroundColor: ui.input, borderColor: ui.border },
            ]}
          >
            <View style={styles.readonlyRow}>
              <Text style={[styles.readonlyLabel, { color: ui.muted }]}>
                Tháng
              </Text>
              <Text style={[styles.readonlyValue, { color: ui.text }]}>
                {initialBudget?.month || "--"}
              </Text>
            </View>

            <View style={styles.readonlyRow}>
              <Text style={[styles.readonlyLabel, { color: ui.muted }]}>
                Ví
              </Text>
              <Text style={[styles.readonlyValue, { color: ui.text }]}>
                {initialBudget?.walletName || "Tất cả ví"}
              </Text>
            </View>

            <View style={styles.readonlyRow}>
              <Text style={[styles.readonlyLabel, { color: ui.muted }]}>
                Danh mục
              </Text>
              <Text style={[styles.readonlyValue, { color: ui.text }]}>
                {initialBudget?.categoryName || "Tất cả danh mục"}
              </Text>
            </View>
          </View>

          <Text style={[commonStyles.label, { color: ui.text }]}>Hạn mức</Text>
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
              <Pressable
                key={n}
                onPress={() => setAlertThreshold(n)}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      alertThreshold === n ? "rgba(78,236,165,0.32)" : ui.input,
                    borderColor: alertThreshold === n ? GREEN : ui.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: ui.text }]}>{n}%</Text>
              </Pressable>
            ))}
          </View>

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
              <Text style={commonStyles.primaryBtnText}>Lưu thay đổi</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  readonlyBox: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  readonlyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  readonlyLabel: {
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
  },
  readonlyValue: {
    flex: 1,
    textAlign: "right",
    fontFamily: "Faustina_700Bold",
    fontSize: 12.5,
  },
  chipWrap: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
  },
  chipText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 12.5,
  },
});
