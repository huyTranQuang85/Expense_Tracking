import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useTheme } from "../../theme/ThemeContext";
import {
  AppNotification,
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../services/notifications";
import {
  commonStyles,
  getErrMsg,
  getGroupUi,
  getShadow,
  GREEN,
} from "./groups/groupUi";

function formatTime(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

function getNotificationIcon(item: AppNotification) {
  const action = item.metadata?.action;

  if (item.type === "budget" || action === "group_budget_alert") {
    return "warning-outline";
  }

  if (
    item.type === "transaction" ||
    String(action || "").startsWith("group_transaction_")
  ) {
    return "swap-horizontal-outline";
  }

  if (item.type === "reminder" || action === "group_reminder") {
    return "alarm-outline";
  }

  if (item.type === "group" || action === "group_invitation") {
    return "people-outline";
  }

  return "notifications-outline";
}

function getNotificationSubtitle(item: AppNotification) {
  const action = item.metadata?.action;
  const metadata = item.metadata || {};

  if (action === "group_budget_alert") {
    const threshold = Number(metadata.threshold || 0);
    const usage = Number(metadata.usagePercent || 0);

    if (threshold === 101 || usage > 100) {
      return `Ngân sách nhóm đã vượt giới hạn (${usage.toFixed(0)}%).`;
    }

    return `Ngân sách nhóm đã đạt ${usage.toFixed(0)}% ngưỡng cảnh báo.`;
  }

  if (action === "group_transaction_created") {
    return item.message || "Có giao dịch nhóm mới.";
  }

  if (action === "group_transaction_updated") {
    return item.message || "Một giao dịch nhóm vừa được cập nhật.";
  }

  if (action === "group_transaction_deleted") {
    return item.message || "Một giao dịch nhóm vừa được xóa.";
  }

  return item.message;
}

export default function NotificationsScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getMyNotifications({ limit: 100 });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRead = async (item: AppNotification) => {
    try {
      if (!item.isRead) await markNotificationAsRead(item.id);

      const action = item.metadata?.action;
      const groupId = item.metadata?.groupId
        ? Number(item.metadata.groupId)
        : null;

      if (action === "group_invitation") {
        nav.navigate("GroupInvitations");
        return;
      }

      if (
        groupId &&
        (action === "group_reminder" ||
          action === "group_budget_alert" ||
          action === "group_transaction_created" ||
          action === "group_transaction_updated" ||
          action === "group_transaction_deleted")
      ) {
        nav.navigate("GroupDetail", { groupId });
        return;
      }

      load();
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    }
  };

  const onReadAll = async () => {
    try {
      await markAllNotificationsAsRead();
      Toast.show({ type: "success", text1: "Đã đọc tất cả thông báo" });
      load();
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    }
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
            <Text style={[commonStyles.h1, { color: ui.text }]}>Thông báo</Text>
            <Text style={[commonStyles.h2, { color: ui.muted }]}>
              Lời mời nhóm, giao dịch và cảnh báo ngân sách
            </Text>
          </View>

          <Pressable
            onPress={onReadAll}
            style={[styles.readAllBtn, { backgroundColor: GREEN }]}
          >
            <Text style={styles.readAllText}>Đọc hết</Text>
          </Pressable>
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
                <Ionicons
                  name="notifications-off-outline"
                  size={56}
                  color={ui.muted}
                />
                <Text style={[styles.emptyTitle, { color: ui.text }]}>
                  Chưa có thông báo
                </Text>
                <Text style={[styles.emptyDesc, { color: ui.muted }]}>
                  Các lời mời nhóm, giao dịch nhóm và cảnh báo ngân sách sẽ xuất
                  hiện tại đây.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onRead(item)}
                style={[
                  styles.card,
                  {
                    backgroundColor: ui.card,
                    borderColor: item.isRead ? ui.border : GREEN,
                  },
                  shadow,
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: ui.input }]}>
                  <Ionicons
                    name={getNotificationIcon(item) as any}
                    size={22}
                    color={GREEN}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[styles.title, { color: ui.text }]}
                      numberOfLines={1}
                    >
                      {item.title || "Thông báo"}
                    </Text>
                    {!item.isRead && <View style={styles.unreadDot} />}
                  </View>

                  <Text
                    style={[styles.message, { color: ui.muted }]}
                    numberOfLines={2}
                  >
                    {getNotificationSubtitle(item)}
                  </Text>

                  <Text style={[styles.time, { color: ui.muted }]}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              </Pressable>
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
  readAllBtn: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  readAllText: {
    fontFamily: "Faustina_700Bold",
    color: "#063B2B",
    fontSize: 12.5,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontFamily: "Faustina_700Bold", fontSize: 15 },
  unreadDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: GREEN },
  message: {
    marginTop: 3,
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
    lineHeight: 17,
  },
  time: { marginTop: 6, fontFamily: "Faustina_500Medium", fontSize: 11.5 },
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
