import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useTheme } from "../../theme/ThemeContext";
import {
  FamilyGroup,
  getGroupDashboard,
  getGroupDetail,
  leaveGroup,
} from "../../services/groups";
import type { GroupStackParamList } from "../../app/GroupStack";
import {
  commonStyles,
  getErrMsg,
  getGroupUi,
  getShadow,
  GREEN,
} from "./groupUi";

type Nav = NativeStackNavigationProp<GroupStackParamList>;
type Rt = RouteProp<GroupStackParamList, "GroupDetail">;

export default function GroupDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId } = route.params;

  const [group, setGroup] = useState<FamilyGroup | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [g, d] = await Promise.all([
        getGroupDetail(groupId),
        getGroupDashboard(groupId).catch(() => null),
      ]);
      setGroup(g);
      setDashboard(d);
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

  const onLeaveGroup = () => {
    Alert.alert("Rời nhóm", "Bạn có chắc muốn rời khỏi nhóm này không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Rời nhóm",
        style: "destructive",
        onPress: async () => {
          try {
            await leaveGroup(groupId);
            Toast.show({ type: "success", text1: "Đã rời nhóm" });
            nav.goBack();
          } catch (e) {
            Toast.show({ type: "error", text1: getErrMsg(e) });
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: ui.bg }]}>
        <ActivityIndicator color={ui.iconColor || GREEN} />
      </View>
    );
  }

  if (!group) return null;

  const isOwner = group.myRole === "owner";

  return (
    <View style={[commonStyles.root, { backgroundColor: ui.bg }]}>
      <View style={{ height: insets.top, backgroundColor: ui.bg }} />

      <ScrollView
        style={commonStyles.page}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 10,
          paddingBottom: insets.bottom + 90,
        }}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => nav.goBack()} style={commonStyles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={ui.text} />
          </Pressable>

          <View style={{ flexDirection: "row", gap: 8 }}>
            {isOwner && (
              <Pressable
                onPress={() => nav.navigate("EditGroup", { groupId })}
                style={[
                  styles.memberBtn,
                  { backgroundColor: ui.card, borderColor: ui.border },
                  shadow,
                ]}
              >
                <Ionicons
                  name="create-outline"
                  size={17}
                  color={ui.iconColor || GREEN}
                />
                <Text style={[styles.memberBtnText, { color: ui.text }]}>
                  Sửa
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() =>
                nav.navigate("GroupMembers", {
                  groupId,
                  groupName: group.name,
                  myRole: group.myRole,
                })
              }
              style={[
                styles.memberBtn,
                { backgroundColor: ui.card, borderColor: ui.border },
                shadow,
              ]}
            >
              <Ionicons
                name="people-outline"
                size={17}
                color={ui.iconColor || GREEN}
              />
              <Text style={[styles.memberBtnText, { color: ui.text }]}>
                {group.memberCount ?? 1}
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.heroCard,
            { backgroundColor: ui.card, borderColor: ui.border },
            shadow,
          ]}
        >
          <View
            style={[
              styles.heroIcon,
              { backgroundColor: ui.iconBg || ui.input },
            ]}
          >
            <Ionicons
              name="home-outline"
              size={30}
              color={ui.iconColor || GREEN}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[styles.groupName, { color: ui.text }]}
              numberOfLines={1}
            >
              {group.name}
            </Text>
            <Text
              style={[styles.groupDesc, { color: ui.muted }]}
              numberOfLines={2}
            >
              {group.description || "Nhóm quản lý chi tiêu chung"}
            </Text>

            <View style={styles.tagRow}>
              <View
                style={[
                  styles.tag,
                  { backgroundColor: ui.accentSoft || "rgba(78,236,165,0.25)" },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: ui.accentText || "#047857" },
                  ]}
                >
                  {isOwner ? "Owner" : "Member"}
                </Text>
              </View>
              <View
                style={[styles.tag, { backgroundColor: ui.iconBg || ui.input }]}
              >
                <Text style={[styles.tagText, { color: ui.muted }]}>
                  {group.memberCount ?? 1} thành viên
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={[commonStyles.sectionTitle, { color: ui.text }]}>
          Tổng quan nhóm
        </Text>

        <View style={styles.statsGrid}>
          <MiniStat
            label="Ví nhóm"
            value={String(dashboard?.wallets?.length ?? 0)}
            ui={ui}
            shadow={shadow}
          />
          <MiniStat
            label="Ngân sách"
            value={String(dashboard?.budgets?.length ?? 0)}
            ui={ui}
            shadow={shadow}
          />
          <MiniStat
            label="Quỹ"
            value={String(dashboard?.contributions?.length ?? 0)}
            ui={ui}
            shadow={shadow}
          />
        </View>

        <Text style={[commonStyles.sectionTitle, { color: ui.text }]}>
          Chức năng
        </Text>

        <Feature
          icon="chatbubbles-outline"
          title="Chat nhóm"
          desc="Trò chuyện realtime với thành viên"
          ui={ui}
          shadow={shadow}
          onPress={() =>
            nav.navigate("GroupChat", {
              groupId,
              groupName: group.name,
            })
          }
        />

        <Feature
          icon="wallet-outline"
          title="Ví nhóm"
          desc="Quản lý các ví chung của nhóm"
          ui={ui}
          shadow={shadow}
          onPress={() =>
            nav.navigate("GroupWallets", {
              groupId,
              groupName: group.name,
              myRole: group.myRole,
            })
          }
        />
        <Feature
          icon="folder-outline"
          title="Danh mục nhóm"
          desc="Tạo danh mục thu chi dùng riêng cho nhóm"
          ui={ui}
          shadow={shadow}
          onPress={() =>
            nav.navigate("GroupCategories", {
              groupId,
              groupName: group.name,
              myRole: group.myRole,
            })
          }
        />

        <Feature
          icon="swap-horizontal-outline"
          title="Giao dịch nhóm"
          desc="Ghi nhận thu chi chung theo nhóm"
          ui={ui}
          shadow={shadow}
          onPress={() =>
            nav.navigate("GroupTransactions", {
              groupId,
              groupName: group.name,
            })
          }
        />

        <Feature
          icon="pie-chart-outline"
          title="Ngân sách nhóm"
          desc="Theo dõi hạn mức chi tiêu theo tháng"
          ui={ui}
          shadow={shadow}
          onPress={() =>
            nav.navigate("GroupBudgets", {
              groupId,
              groupName: group.name,
              myRole: group.myRole,
            })
          }
        />

        <Feature
          icon="cash-outline"
          title="Quỹ đóng góp"
          desc="Phân bổ, ghi nhận và theo dõi đóng góp"
          ui={ui}
          shadow={shadow}
          onPress={() =>
            nav.navigate("GroupContributionPlans", {
              groupId,
              groupName: group.name,
              myRole: group.myRole,
            })
          }
        />
        <Feature
          icon="alarm-outline"
          title="Nhắc nhở nhóm"
          desc="Tạo lịch nhắc và gửi thông báo cho thành viên"
          ui={ui}
          shadow={shadow}
          onPress={() =>
            nav.navigate("GroupReminders", {
              groupId,
              groupName: group.name,
              myRole: group.myRole,
            })
          }
        />
        {!isOwner && (
          <Pressable
            onPress={onLeaveGroup}
            style={[
              styles.leaveBtn,
              { borderColor: ui.danger, backgroundColor: ui.card },
            ]}
          >
            <Ionicons name="exit-outline" size={18} color={ui.danger} />
            <Text style={[styles.leaveText, { color: ui.danger }]}>
              Rời khỏi nhóm
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function MiniStat({ label, value, ui, shadow }: any) {
  return (
    <View
      style={[
        styles.statBox,
        { backgroundColor: ui.card, borderColor: ui.border },
        shadow,
      ]}
    >
      <Text style={[styles.statValue, { color: ui.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: ui.muted }]}>{label}</Text>
    </View>
  );
}

function Feature({ icon, title, desc, ui, shadow, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(15,23,42,0.06)" }}
      style={({ pressed }) => [
        styles.featureCard,
        {
          backgroundColor: ui.card,
          borderColor: ui.border,
          opacity: pressed && Platform.OS !== "android" ? 0.9 : 1,
        },
        shadow,
      ]}
    >
      <View
        style={[styles.featureIcon, { backgroundColor: ui.iconBg || ui.input }]}
      >
        <Ionicons name={icon} size={21} color={ui.iconColor || GREEN} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.featureTitle, { color: ui.text }]}>{title}</Text>
        <Text style={[styles.featureDesc, { color: ui.muted }]}>{desc}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={ui.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memberBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  memberBtnText: { fontFamily: "Faustina_700Bold", fontSize: 13 },
  heroCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  groupName: { fontFamily: "Faustina_700Bold", fontSize: 21 },
  groupDesc: {
    marginTop: 4,
    fontFamily: "Faustina_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  tagRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tagText: { fontFamily: "Faustina_700Bold", fontSize: 11 },
  statsGrid: { flexDirection: "row", gap: 10 },
  statBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: "center",
  },
  statValue: { fontFamily: "Faustina_700Bold", fontSize: 19 },
  statLabel: { marginTop: 4, fontFamily: "Faustina_500Medium", fontSize: 11.5 },
  featureCard: {
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: { fontFamily: "Faustina_700Bold", fontSize: 14 },
  featureDesc: {
    marginTop: 3,
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
  },
  leaveBtn: {
    marginTop: 10,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  leaveText: { fontFamily: "Faustina_700Bold", fontSize: 13 },
});
