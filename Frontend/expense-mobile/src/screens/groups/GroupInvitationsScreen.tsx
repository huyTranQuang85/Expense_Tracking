import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
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
  acceptGroupInvitation,
  declineGroupInvitation,
  getMyGroupInvitations,
  GroupInvitation,
} from "../../services/groups";
import {
  commonStyles,
  getErrMsg,
  getGroupUi,
  getShadow,
  GREEN,
} from "./groupUi";

export default function GroupInvitationsScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const [items, setItems] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getMyGroupInvitations();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onAccept = async (id: number) => {
    try {
      await acceptGroupInvitation(id);
      Toast.show({ type: "success", text1: "Bạn đã tham gia nhóm" });
      load();
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    }
  };

  const onDecline = async (id: number) => {
    try {
      await declineGroupInvitation(id);
      Toast.show({ type: "success", text1: "Đã từ chối lời mời" });
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
            <Text style={[commonStyles.h1, { color: ui.text }]}>
              Lời mời nhóm
            </Text>
            <Text style={[commonStyles.h2, { color: ui.muted }]}>
              Các nhóm đang chờ bạn xác nhận
            </Text>
          </View>
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
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load();
                }}
              />
            }
            contentContainerStyle={{
              paddingTop: 12,
              paddingBottom: insets.bottom + 90,
              flexGrow: items.length === 0 ? 1 : undefined,
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View
                  style={[
                    styles.emptyIcon,
                    { backgroundColor: ui.card },
                    shadow,
                  ]}
                >
                  <Ionicons name="mail-open-outline" size={54} color={GREEN} />
                </View>
                <Text style={[styles.emptyTitle, { color: ui.text }]}>
                  Không có lời mời
                </Text>
                <Text style={[styles.emptyDesc, { color: ui.muted }]}>
                  Khi owner mời bạn vào nhóm, lời mời sẽ hiển thị tại đây.
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
                <View style={styles.cardTop}>
                  <View style={[styles.iconBox, { backgroundColor: ui.input }]}>
                    <Ionicons name="people-outline" size={22} color={GREEN} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.title, { color: ui.text }]}
                      numberOfLines={1}
                    >
                      {item.groupName || `Nhóm #${item.groupId}`}
                    </Text>
                    <Text style={[styles.desc, { color: ui.muted }]}>
                      Được mời bởi {item.invitedByName || "một thành viên"}
                    </Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    onPress={() => onDecline(item.id)}
                    style={[
                      commonStyles.secondaryBtn,
                      { flex: 1, backgroundColor: ui.input },
                    ]}
                  >
                    <Text
                      style={[
                        commonStyles.secondaryBtnText,
                        { color: ui.text },
                      ]}
                    >
                      Từ chối
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => onAccept(item.id)}
                    style={[
                      commonStyles.primaryBtn,
                      { flex: 1, backgroundColor: GREEN },
                    ]}
                  >
                    <Text style={commonStyles.primaryBtnText}>Chấp nhận</Text>
                  </Pressable>
                </View>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "Faustina_700Bold", fontSize: 15 },
  desc: { marginTop: 4, fontFamily: "Faustina_400Regular", fontSize: 12.5 },
  actions: { flexDirection: "row", gap: 12, marginTop: 14 },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 86,
    height: 86,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { marginTop: 16, fontFamily: "Faustina_700Bold", fontSize: 20 },
  emptyDesc: {
    marginTop: 8,
    fontFamily: "Faustina_400Regular",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
