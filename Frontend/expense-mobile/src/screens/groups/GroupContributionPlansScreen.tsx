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
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useTheme } from "../../theme/ThemeContext";
import type { GroupStackParamList } from "../../app/GroupStack";
import {
  commonStyles,
  getErrMsg,
  getGroupUi,
  getShadow,
  GREEN,
} from "./groupUi";
import {
  getContributionPlans,
  getContributionProgress,
  GroupContributionPlan,
  GroupContributionProgress,
} from "../../services/groupFinance";

type Rt = RouteProp<GroupStackParamList, "GroupContributionPlans">;

function formatMoney(value?: number | null) {
  return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

export default function GroupContributionPlansScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId, groupName, myRole } = route.params;
  const isOwner = myRole === "owner";

  const [plans, setPlans] = useState<GroupContributionPlan[]>([]);
  const [progress, setProgress] = useState<GroupContributionProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [p, pr] = await Promise.all([
        getContributionPlans(groupId),
        getContributionProgress(groupId),
      ]);
      setPlans(Array.isArray(p) ? p : []);
      setProgress(Array.isArray(pr) ? pr : []);
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

  const getProgress = (planId: number) =>
    progress.find((x) => x.contributionPlanId === planId);

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
              Quỹ đóng góp
            </Text>
            <Text
              style={[commonStyles.h2, { color: ui.muted }]}
              numberOfLines={1}
            >
              {groupName || "Theo dõi đóng góp chung"}
            </Text>
          </View>

          {isOwner && (
            <Pressable
              onPress={() =>
                nav.navigate("CreateContributionPlan", { groupId })
              }
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
            data={plans}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 14,
              paddingBottom: insets.bottom + 90,
              flexGrow: plans.length === 0 ? 1 : undefined,
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="cash-outline" size={62} color={GREEN} />
                <Text style={[styles.emptyTitle, { color: ui.text }]}>
                  Chưa có quỹ đóng góp
                </Text>
                <Text style={[styles.emptyDesc, { color: ui.muted }]}>
                  Tạo quỹ để phân bổ số tiền cần đóng cho từng thành viên.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const pr = getProgress(item.id);
              const percent = Math.min(Number(pr?.progressPercent || 0), 100);

              return (
                <Pressable
                  onPress={() =>
                    nav.navigate("ContributionPlanDetail", {
                      groupId,
                      planId: item.id,
                      myRole,
                    })
                  }
                  style={[
                    styles.card,
                    { backgroundColor: ui.card, borderColor: ui.border },
                    shadow,
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View
                      style={[styles.iconBox, { backgroundColor: ui.input }]}
                    >
                      <Ionicons name="cash-outline" size={22} color={GREEN} />
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
                        numberOfLines={1}
                      >
                        {item.walletName || "Ví nhóm"} • {item.status}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={ui.muted}
                    />
                  </View>

                  <View style={styles.moneyRow}>
                    <Text style={[styles.paid, { color: ui.text }]}>
                      {formatMoney(pr?.totalPaidAmount)}
                    </Text>
                    <Text style={[styles.target, { color: ui.muted }]}>
                      /{" "}
                      {formatMoney(
                        item.targetAmount || pr?.totalExpectedAmount,
                      )}
                    </Text>
                  </View>

                  <View style={[styles.track, { backgroundColor: ui.input }]}>
                    <View style={[styles.progress, { width: `${percent}%` }]} />
                  </View>

                  <Text style={[styles.progressText, { color: ui.muted }]}>
                    {Number(pr?.progressPercent || 0).toFixed(1)}% •{" "}
                    {pr?.paidMemberCount || 0}/{pr?.memberCount || 0} thành viên
                    đã đủ
                  </Text>
                </Pressable>
              );
            }}
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
  card: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "Faustina_700Bold", fontSize: 15 },
  desc: { marginTop: 3, fontFamily: "Faustina_400Regular", fontSize: 12.5 },
  moneyRow: { marginTop: 12, flexDirection: "row", alignItems: "baseline" },
  paid: { fontFamily: "Faustina_700Bold", fontSize: 18 },
  target: { marginLeft: 4, fontFamily: "Faustina_400Regular", fontSize: 12.5 },
  track: { marginTop: 10, height: 8, borderRadius: 999, overflow: "hidden" },
  progress: { height: "100%", borderRadius: 999, backgroundColor: GREEN },
  progressText: {
    marginTop: 7,
    fontFamily: "Faustina_400Regular",
    fontSize: 12,
  },
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
