import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
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
  deactivateGroupReminder,
  getGroupReminders,
  GroupReminder,
  sendGroupReminderNow,
} from "../../services/groupReminder";
import {
  commonStyles,
  getErrMsg,
  getGroupUi,
  getShadow,
  GREEN,
} from "./groups/groupUi";

type Rt = RouteProp<GroupStackParamList, "GroupReminders">;

function formatDateTime(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(
    2,
    "0",
  )}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function GroupRemindersScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId, groupName, myRole } = route.params;
  const isOwner = myRole === "owner";

  const [items, setItems] = useState<GroupReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getGroupReminders(groupId);
      setItems(Array.isArray(data) ? data : []);
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

  const onSendNow = async (item: GroupReminder) => {
    try {
      await sendGroupReminderNow(groupId, item.id);
      Toast.show({ type: "success", text1: "Đã gửi nhắc nhở đến thành viên" });
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    }
  };

  const onDeactivate = (item: GroupReminder) => {
    Alert.alert("Tắt nhắc nhở", `Tắt nhắc nhở "${item.title}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Tắt",
        style: "destructive",
        onPress: async () => {
          try {
            await deactivateGroupReminder(groupId, item.id);
            Toast.show({ type: "success", text1: "Đã tắt nhắc nhở" });
            load();
          } catch (e) {
            Toast.show({ type: "error", text1: getErrMsg(e) });
          }
        },
      },
    ]);
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
              Nhắc nhở nhóm
            </Text>
            <Text
              style={[commonStyles.h2, { color: ui.muted }]}
              numberOfLines={1}
            >
              {groupName || "Lịch nhắc cho thành viên"}
            </Text>
          </View>

          {isOwner && (
            <Pressable
              onPress={() => nav.navigate("CreateGroupReminder", { groupId })}
              style={[styles.addBtn, { backgroundColor: GREEN }]}
            >
              <Ionicons name="add" size={20} color="#063B2B" />
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={GREEN} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 14,
              paddingBottom: insets.bottom + 90,
              flexGrow: items.length === 0 ? 1 : undefined,
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="alarm-outline" size={62} color={GREEN} />
                <Text style={[styles.emptyTitle, { color: ui.text }]}>
                  Chưa có nhắc nhở
                </Text>
                <Text style={[styles.emptyDesc, { color: ui.muted }]}>
                  Owner có thể tạo nhắc nhở đóng quỹ, cập nhật giao dịch hoặc
                  họp nhóm.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.card,
                  { backgroundColor: ui.card, borderColor: ui.border },
                  shadow,
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: ui.input }]}>
                  <Ionicons name="alarm-outline" size={22} color={GREEN} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.title, { color: ui.text }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[styles.desc, { color: ui.muted }]}
                    numberOfLines={2}
                  >
                    {item.message || "Không có nội dung"}
                  </Text>
                  <Text style={[styles.time, { color: ui.muted }]}>
                    {formatDateTime(item.remindAt)}
                    {item.isRecurring ? ` • Lặp ${item.frequency}` : ""}
                  </Text>
                </View>

                {isOwner && (
                  <View style={styles.actions}>
                    <Pressable onPress={() => onSendNow(item)} hitSlop={8}>
                      <Ionicons
                        name="paper-plane-outline"
                        size={19}
                        color={GREEN}
                      />
                    </Pressable>
                    <Pressable onPress={() => onDeactivate(item)} hitSlop={8}>
                      <Ionicons
                        name="close-circle-outline"
                        size={20}
                        color={ui.danger}
                      />
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          />
        )}
      </View>
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
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "Faustina_700Bold", fontSize: 15 },
  desc: {
    marginTop: 3,
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
    lineHeight: 17,
  },
  time: { marginTop: 6, fontFamily: "Faustina_500Medium", fontSize: 12 },
  actions: { gap: 12, alignItems: "center" },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: { marginTop: 14, fontFamily: "Faustina_700Bold", fontSize: 20 },
  emptyDesc: {
    marginTop: 8,
    textAlign: "center",
    fontFamily: "Faustina_400Regular",
    lineHeight: 19,
  },
});
