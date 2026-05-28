import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
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

import type { GroupStackParamList } from "../../app/GroupStack";
import { useTheme } from "../../theme/ThemeContext";
import {
  getGroupWallets,
  updateGroupWallet,
} from "../../services/groupFinance";
import {
  commonStyles,
  getErrMsg,
  getGroupUi,
  getShadow,
  GREEN,
} from "./groupUi";

type Rt = RouteProp<GroupStackParamList, "EditGroupWallet">;

export default function EditGroupWalletScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId, walletId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [balance, setBalance] = useState("0");

  const load = useCallback(async () => {
    try {
      const wallets = await getGroupWallets(groupId, { includeArchived: true });
      const wallet = wallets.find((w) => w.id === walletId);

      if (!wallet) {
        Toast.show({ type: "error", text1: "Không tìm thấy ví nhóm" });
        nav.goBack();
        return;
      }

      setName(wallet.name || "");
      setDescription(wallet.description || "");
      setBalance(String(wallet.balance ?? 0));
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
      nav.goBack();
    } finally {
      setLoading(false);
    }
  }, [groupId, walletId, nav]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSubmit = async () => {
    const cleanName = name.trim();
    const amount = Number(balance);

    if (!cleanName)
      return Alert.alert("Thiếu thông tin", "Tên ví không được để trống");
    if (Number.isNaN(amount) || amount < 0) {
      return Alert.alert("Sai dữ liệu", "Số dư ví không hợp lệ");
    }

    try {
      setSaving(true);
      await updateGroupWallet(groupId, walletId, {
        name: cleanName,
        description: description.trim(),
        balance: amount,
      });
      Toast.show({ type: "success", text1: "Đã cập nhật ví nhóm" });
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
          Chỉnh sửa ví nhóm
        </Text>
        <Text style={[commonStyles.h2, { color: ui.muted }]}>
          Cập nhật thông tin ví và số dư hiện tại.
        </Text>

        {loading ? (
          <View style={{ minHeight: 300, justifyContent: "center" }}>
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
            <Text style={[commonStyles.label, { color: ui.text }]}>Tên ví</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Tên ví"
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
              placeholder="Mô tả ví"
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

            <Text style={[commonStyles.label, { color: ui.text }]}>Số dư</Text>
            <TextInput
              value={balance}
              onChangeText={setBalance}
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
        )}
      </ScrollView>
    </View>
  );
}
