import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";

import { useTheme } from "../../theme/ThemeContext";
import { FamilyGroup, getMyGroups } from "../../services/groups";
import { getUnreadNotificationCount } from "../../services/notifications";
import type { GroupStackParamList } from "../../app/GroupStack";
import {
  commonStyles,
  getErrMsg,
  getGroupUi,
  getShadow,
  GREEN,
} from "./groupUi";

type Nav = NativeStackNavigationProp<GroupStackParamList>;

export default function GroupListScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const load = useCallback(async () => {
    try {
      const [groupsData, unreadData] = await Promise.all([
        getMyGroups(),
        getUnreadNotificationCount().catch(() => ({ total: 0 })),
      ]);

      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setUnreadCount(Number(unreadData?.total || 0));
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

  const onCreate = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    nav.navigate("CreateGroup");
  };

  return (
    <View style={[commonStyles.root, { backgroundColor: ui.bg }]}>
      <View style={{ height: insets.top, backgroundColor: ui.bg }} />

      <View style={commonStyles.page}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[commonStyles.h1, { color: ui.text }]}>
              Nhóm gia đình
            </Text>
            <Text style={[commonStyles.h2, { color: ui.muted }]}>
              Quản lý chi tiêu chung, thành viên và trò chuyện nhóm
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => nav.navigate("Notifications")}
              style={[
                styles.bellBtn,
                { backgroundColor: ui.card, borderColor: ui.border },
                shadow,
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={19}
                color={ui.iconColor || GREEN}
              />

              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={onCreate}
              android_ripple={{ color: "rgba(6,59,43,0.12)" }}
              style={({ pressed }) => [
                styles.addBtn,
                { opacity: pressed && Platform.OS !== "android" ? 0.9 : 1 },
              ]}
            >
              <Ionicons name="add" size={18} color="#063B2B" />
              <Text style={styles.addBtnText}>Tạo nhóm</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={() => nav.navigate("GroupInvitations")}
          style={[
            styles.inviteCard,
            { backgroundColor: ui.card, borderColor: ui.border },
            shadow,
          ]}
        >
          <View
            style={[
              styles.circleIcon,
              { backgroundColor: ui.iconBg || ui.input },
            ]}
          >
            <Ionicons
              name="mail-unread-outline"
              size={21}
              color={ui.iconColor || GREEN}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: ui.text }]}>
              Lời mời vào nhóm
            </Text>
            <Text style={[styles.cardSub, { color: ui.muted }]}>
              Xem các lời mời đang chờ xác nhận
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={ui.muted} />
        </Pressable>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={ui.iconColor || GREEN} />
            <Text style={[styles.loadingText, { color: ui.muted }]}>
              Đang tải nhóm...
            </Text>
          </View>
        ) : (
          <FlatList
            data={groups}
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
              paddingTop: 6,
              paddingBottom: insets.bottom + 90,
              flexGrow: groups.length === 0 ? 1 : undefined,
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
                  <Ionicons
                    name="people-circle-outline"
                    size={58}
                    color={ui.iconColor || GREEN}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: ui.text }]}>
                  Chưa có nhóm nào
                </Text>
                <Text style={[styles.emptyDesc, { color: ui.muted }]}>
                  Tạo nhóm để cùng quản lý ví chung, giao dịch, ngân sách và
                  chat với thành viên.
                </Text>
                <Pressable
                  onPress={onCreate}
                  style={[
                    commonStyles.primaryBtn,
                    styles.emptyBtn,
                    { backgroundColor: ui.accent || GREEN },
                  ]}
                >
                  <Text style={commonStyles.primaryBtnText}>
                    Tạo nhóm đầu tiên
                  </Text>
                </Pressable>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  nav.navigate("GroupDetail", { groupId: item.id })
                }
                style={({ pressed }) => [
                  styles.groupCard,
                  {
                    backgroundColor: ui.card,
                    borderColor: ui.border,
                    opacity: pressed ? 0.92 : 1,
                  },
                  shadow,
                ]}
              >
                <View
                  style={[
                    styles.circleIcon,
                    { backgroundColor: ui.iconBg || ui.input },
                  ]}
                >
                  <Ionicons
                    name="home-outline"
                    size={21}
                    color={ui.iconColor || GREEN}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.cardTop}>
                    <Text
                      style={[styles.cardTitle, { color: ui.text }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <View
                      style={[
                        styles.rolePill,
                        {
                          backgroundColor:
                            item.myRole === "owner"
                              ? "rgba(78,236,165,0.28)"
                              : ui.input,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleText,
                          {
                            color:
                              item.myRole === "owner" ? "#047857" : ui.muted,
                          },
                        ]}
                      >
                        {item.myRole === "owner" ? "Owner" : "Member"}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[styles.cardSub, { color: ui.muted }]}
                    numberOfLines={2}
                  >
                    {item.description || "Nhóm quản lý chi tiêu chung"}
                  </Text>

                  <View style={styles.metaRow}>
                    <Ionicons
                      name="people-outline"
                      size={14}
                      color={ui.muted}
                    />
                    <Text style={[styles.metaText, { color: ui.muted }]}>
                      {item.memberCount ?? 1} thành viên
                    </Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={18} color={ui.muted} />
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
  addBtn: {
    height: 38,
    borderRadius: 18,
    paddingHorizontal: 14,
    backgroundColor: "#0F766E",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  addBtnText: {
    fontFamily: "Faustina_700Bold",
    color: "#FFFFFF",
    fontSize: 13.5,
  },
  inviteCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  groupCard: {
    marginTop: 10,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  circleIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, fontFamily: "Faustina_700Bold", fontSize: 14.5 },
  cardSub: {
    marginTop: 3,
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
    lineHeight: 17,
  },
  rolePill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  roleText: { fontFamily: "Faustina_700Bold", fontSize: 10.5 },
  metaRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontFamily: "Faustina_500Medium", fontSize: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 10, fontFamily: "Faustina_500Medium" },
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
  emptyBtn: { marginTop: 18, width: 170, backgroundColor: GREEN },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  badgeText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 10,
    color: "#FFFFFF",
    lineHeight: 12,
  },
});
