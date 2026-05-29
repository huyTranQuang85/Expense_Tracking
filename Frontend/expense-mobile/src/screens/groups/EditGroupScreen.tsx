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
import { getGroupDetail, updateGroup } from "../../services/groups";
import {
  commonStyles,
  getErrMsg,
  getGroupUi,
  getShadow,
  GREEN,
} from "./groupUi";

type Rt = RouteProp<GroupStackParamList, "EditGroup">;

export default function EditGroupScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    try {
      const group = await getGroupDetail(groupId);
      setName(group.name || "");
      setDescription(group.description || "");
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
      nav.goBack();
    } finally {
      setLoading(false);
    }
  }, [groupId, nav]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSubmit = async () => {
    const cleanName = name.trim();

    if (!cleanName) {
      return Alert.alert("Thiếu thông tin", "Tên nhóm không được để trống");
    }

    try {
      setSaving(true);
      await updateGroup(groupId, {
        name: cleanName,
        description: description.trim() || null,
      });

      Toast.show({ type: "success", text1: "Đã cập nhật nhóm" });
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
          Chỉnh sửa nhóm
        </Text>
        <Text style={[commonStyles.h2, { color: ui.muted }]}>
          Cập nhật tên và mô tả của nhóm.
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
            <Text style={[commonStyles.label, { color: ui.text }]}>
              Tên nhóm
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Tên nhóm"
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
              placeholder="Mô tả nhóm"
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
