import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";

import { useTheme } from "../../theme/ThemeContext";
import { createGroup } from "../../services/groups";
import type { GroupStackParamList } from "../../app/GroupStack";
import {
  commonStyles,
  getErrMsg,
  getGroupUi,
  getShadow,
  GREEN,
} from "./groupUi";

type Nav = NativeStackNavigationProp<GroupStackParamList>;

export default function CreateGroupScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const onSubmit = async () => {
    const cleanName = name.trim();
    if (!cleanName)
      return Alert.alert("Thiếu thông tin", "Vui lòng nhập tên nhóm");

    try {
      setSaving(true);
      const group = await createGroup({
        name: cleanName,
        description: description.trim() || undefined,
      });

      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } catch {}

      Toast.show({ type: "success", text1: "Nhóm đã được tạo thành công!" });
      nav.replace("GroupDetail", { groupId: group.id });
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[commonStyles.root, { backgroundColor: ui.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ height: insets.top, backgroundColor: ui.bg }} />

      <ScrollView
        style={commonStyles.page}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 10,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <Pressable onPress={() => nav.goBack()} style={commonStyles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={ui.text} />
        </Pressable>

        <Text style={[commonStyles.h1, { color: ui.text }]}>Tạo nhóm mới</Text>
        <Text style={[commonStyles.h2, { color: ui.muted }]}>
          Tạo không gian quản lý chi tiêu chung cho gia đình hoặc nhóm bạn.
        </Text>

        <View
          style={[
            commonStyles.card,
            { backgroundColor: ui.card, borderColor: ui.border },
            shadow,
          ]}
        >
          <View style={[styles.hero, { backgroundColor: ui.input }]}>
            <Ionicons name="people-outline" size={30} color={GREEN} />
          </View>

          <Text style={[commonStyles.label, { color: ui.text }]}>Tên nhóm</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ví dụ: Gia đình tôi"
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
            Mô tả nhóm
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Ví dụ: Nhóm quản lý chi tiêu gia đình"
            placeholderTextColor={ui.muted}
            multiline
            textAlignVertical="top"
            style={[
              commonStyles.textArea,
              {
                backgroundColor: ui.input,
                borderColor: ui.border,
                color: ui.text,
              },
            ]}
          />

          <View style={styles.bottomRow}>
            <Pressable
              onPress={() => nav.goBack()}
              style={[
                commonStyles.secondaryBtn,
                { flex: 1, backgroundColor: ui.input },
              ]}
            >
              <Text style={[commonStyles.secondaryBtnText, { color: ui.text }]}>
                Hủy
              </Text>
            </Pressable>

            <Pressable
              disabled={saving}
              onPress={onSubmit}
              style={[
                commonStyles.primaryBtn,
                { flex: 1, backgroundColor: GREEN, opacity: saving ? 0.65 : 1 },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#063B2B" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#063B2B"
                  />
                  <Text style={commonStyles.primaryBtnText}>Tạo nhóm</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  bottomRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 16,
  },
});
