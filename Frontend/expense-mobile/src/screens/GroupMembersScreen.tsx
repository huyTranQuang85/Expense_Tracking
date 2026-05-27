import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
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
import {
  createGroupInvitation,
  getGroupMembers,
  GroupMember,
  removeGroupMember,
  transferGroupOwner,
} from "../../services/group";
import type { GroupStackParamList } from "../../app/GroupStack";
import {
  commonStyles,
  getErrMsg,
  getGroupUi,
  getShadow,
  GREEN,
} from "./groups/groupUi";

type Rt = RouteProp<GroupStackParamList, "GroupMembers">;

export default function GroupMembersScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId, groupName, myRole } = route.params;
  const isOwner = myRole === "owner";

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getGroupMembers(groupId);
      setMembers(Array.isArray(data) ? data : []);
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

  const onInvite = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail)
      return Alert.alert("Thiếu email", "Vui lòng nhập email thành viên");

    try {
      setSending(true);
      await createGroupInvitation(groupId, { email: cleanEmail });
      setEmail("");
      setInviteOpen(false);
      Toast.show({ type: "success", text1: "Đã tạo lời mời vào nhóm" });
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    } finally {
      setSending(false);
    }
  };

  const onRemove = (m: GroupMember) => {
    Alert.alert(
      "Xóa thành viên",
      `Xóa ${m.nickname || m.userName || m.email} khỏi nhóm?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await removeGroupMember(groupId, m.userId);
              Toast.show({ type: "success", text1: "Đã xóa thành viên" });
              load();
            } catch (e) {
              Toast.show({ type: "error", text1: getErrMsg(e) });
            }
          },
        },
      ],
    );
  };

  const onTransfer = (m: GroupMember) => {
    Alert.alert(
      "Chuyển quyền owner",
      `Chuyển quyền owner cho ${m.nickname || m.userName || m.email}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Chuyển",
          onPress: async () => {
            try {
              await transferGroupOwner(groupId, m.userId);
              Toast.show({ type: "success", text1: "Đã chuyển quyền owner" });
              nav.goBack();
            } catch (e) {
              Toast.show({ type: "error", text1: getErrMsg(e) });
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[commonStyles.root, { backgroundColor: ui.bg }]}>
      <View style={{ height: insets.top, backgroundColor: ui.bg }} />

      <View style={commonStyles.page}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => nav.goBack()} style={commonStyles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={ui.text} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={[commonStyles.h1, { color: ui.text }]}>
              Thành viên
            </Text>
            <Text
              style={[commonStyles.h2, { color: ui.muted }]}
              numberOfLines={1}
            >
              {groupName || "Nhóm"}
            </Text>
          </View>

          {isOwner && (
            <Pressable
              onPress={() => setInviteOpen(true)}
              style={[styles.addBtn, { backgroundColor: GREEN }]}
            >
              <Ionicons name="person-add-outline" size={18} color="#063B2B" />
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={GREEN} />
          </View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 12,
              paddingBottom: insets.bottom + 90,
            }}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.memberCard,
                  { backgroundColor: ui.card, borderColor: ui.border },
                  shadow,
                ]}
              >
                <View style={[styles.avatar, { backgroundColor: ui.input }]}>
                  <Ionicons name="person-outline" size={20} color={GREEN} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.name, { color: ui.text }]}
                    numberOfLines={1}
                  >
                    {item.nickname || item.userName || "Thành viên"}
                  </Text>
                  <Text
                    style={[styles.email, { color: ui.muted }]}
                    numberOfLines={1}
                  >
                    {item.email}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end", gap: 8 }}>
                  <View
                    style={[
                      styles.rolePill,
                      {
                        backgroundColor:
                          item.role === "owner"
                            ? "rgba(78,236,165,0.28)"
                            : ui.input,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        { color: item.role === "owner" ? "#047857" : ui.muted },
                      ]}
                    >
                      {item.role}
                    </Text>
                  </View>

                  {isOwner && item.role !== "owner" && (
                    <View style={styles.actionRow}>
                      <Pressable onPress={() => onTransfer(item)} hitSlop={8}>
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={19}
                          color={GREEN}
                        />
                      </Pressable>
                      <Pressable onPress={() => onRemove(item)} hitSlop={8}>
                        <Ionicons
                          name="trash-outline"
                          size={19}
                          color={ui.danger}
                        />
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            )}
          />
        )}
      </View>

      <Modal
        visible={inviteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: ui.overlay }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: ui.card, borderColor: ui.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: ui.text }]}>
              Mời thành viên
            </Text>
            <Text style={[styles.modalDesc, { color: ui.muted }]}>
              Nhập email tài khoản cần mời. Người được mời sẽ thấy lời mời trong
              app.
            </Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="email@example.com"
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

            <View style={styles.modalBtns}>
              <Pressable
                onPress={() => setInviteOpen(false)}
                style={[
                  commonStyles.secondaryBtn,
                  { flex: 1, backgroundColor: ui.input },
                ]}
              >
                <Text
                  style={[commonStyles.secondaryBtnText, { color: ui.text }]}
                >
                  Hủy
                </Text>
              </Pressable>

              <Pressable
                disabled={sending}
                onPress={onInvite}
                style={[
                  commonStyles.primaryBtn,
                  {
                    flex: 1.3,
                    backgroundColor: GREEN,
                    opacity: sending ? 0.65 : 1,
                  },
                ]}
              >
                {sending ? (
                  <ActivityIndicator color="#063B2B" />
                ) : (
                  <Text style={commonStyles.primaryBtnText}>Gửi lời mời</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  memberCard: {
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: "Faustina_700Bold", fontSize: 14.5 },
  email: { marginTop: 3, fontFamily: "Faustina_400Regular", fontSize: 12.5 },
  rolePill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  roleText: { fontFamily: "Faustina_700Bold", fontSize: 10.5 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  modalTitle: { fontFamily: "Faustina_700Bold", fontSize: 18 },
  modalDesc: {
    marginTop: 7,
    fontFamily: "Faustina_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 18 },
});
