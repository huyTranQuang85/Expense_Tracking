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
  deleteGroupBudget,
  getGroupBudgets,
  getGroupBudgetUsage,
  GroupBudget,
  GroupBudgetUsage,
} from "../../services/groupFinance";

type Rt = RouteProp<GroupStackParamList, "GroupBudgets">;

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function GroupBudgetsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId, groupName, myRole } = route.params;
  const isOwner = myRole === "owner";

  const [budgets, setBudgets] = useState<GroupBudget[]>([]);
  const [usage, setUsage] = useState<GroupBudgetUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [b, u] = await Promise.all([
        getGroupBudgets(groupId, { month: selectedMonth }),
        getGroupBudgetUsage(groupId, { month: selectedMonth }),
      ]);

      setBudgets(Array.isArray(b) ? b : []);
      setUsage(Array.isArray(u) ? u : []);
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    } finally {
      setLoading(false);
    }
  }, [groupId, selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const changeMonth = (step: number) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month - 1 + step, 1);

    const nextMonth = `${date.getFullYear()}-${String(
      date.getMonth() + 1,
    ).padStart(2, "0")}`;

    setSelectedMonth(nextMonth);
  };
  const getUsage = (budgetId: number) => usage.find((x) => x.id === budgetId);

  const onDelete = (budget: GroupBudget) => {
    Alert.alert("Xóa ngân sách", "Bạn có chắc muốn xóa ngân sách này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGroupBudget(groupId, budget.id);
            Toast.show({ type: "success", text1: "Đã xóa ngân sách" });
            load();
          } catch (e) {
            Toast.show({ type: "error", text1: getErrMsg(e) });
          }
        },
      },
    ]);
  };

  const totalLimit = budgets.reduce(
    (sum, b) => sum + Number(b.limitAmount || 0),
    0,
  );
  const totalSpent = usage.reduce(
    (sum, u) => sum + Number(u.spentAmount || 0),
    0,
  );

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
              Ngân sách nhóm
            </Text>
            <Text
              style={[commonStyles.h2, { color: ui.muted }]}
              numberOfLines={1}
            >
              {groupName || "Theo dõi hạn mức chi tiêu"}
            </Text>
          </View>

          {isOwner && (
            <Pressable
              onPress={() =>
                nav.navigate("CreateGroupBudget", {
                  groupId,
                  defaultMonth: selectedMonth,
                })
              }
              style={[styles.addBtn, { backgroundColor: GREEN }]}
            >
              <Ionicons name="add" size={20} color="#063B2B" />
            </Pressable>
          )}
        </View>
        <View
          style={[
            styles.monthBar,
            { backgroundColor: ui.card, borderColor: ui.border },
            shadow,
          ]}
        >
          <Pressable onPress={() => changeMonth(-1)} style={styles.monthBtn}>
            <Ionicons name="chevron-back" size={18} color={ui.text} />
          </Pressable>

          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.monthLabel, { color: ui.text }]}>
              Tháng {selectedMonth}
            </Text>
            <Text style={[styles.monthHint, { color: ui.muted }]}>
              Chỉ hiển thị ngân sách của tháng này
            </Text>
          </View>

          <Pressable onPress={() => changeMonth(1)} style={styles.monthBtn}>
            <Ionicons name="chevron-forward" size={18} color={ui.text} />
          </Pressable>
        </View>
        <View style={styles.summaryRow}>
          <View
            style={[
              styles.sumBox,
              { backgroundColor: ui.card, borderColor: ui.border },
              shadow,
            ]}
          >
            <Text style={[styles.sumLabel, { color: ui.muted }]}>Hạn mức</Text>
            <Text style={[styles.sumValue, { color: ui.text }]}>
              {formatMoney(totalLimit)}
            </Text>
          </View>

          <View
            style={[
              styles.sumBox,
              { backgroundColor: ui.card, borderColor: ui.border },
              shadow,
            ]}
          >
            <Text style={[styles.sumLabel, { color: ui.muted }]}>Đã chi</Text>
            <Text style={[styles.sumValue, { color: "#EF4444" }]}>
              {formatMoney(totalSpent)}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={GREEN} />
          </View>
        ) : (
          <FlatList
            data={budgets}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 12,
              paddingBottom: insets.bottom + 90,
              flexGrow: budgets.length === 0 ? 1 : undefined,
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="pie-chart-outline" size={62} color={GREEN} />
                <Text style={[styles.emptyTitle, { color: ui.text }]}>
                  Chưa có ngân sách
                </Text>
                <Text style={[styles.emptyDesc, { color: ui.muted }]}>
                  Tạo ngân sách theo tháng để kiểm soát chi tiêu chung của nhóm.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const u = getUsage(item.id);
              const percent = Math.min(Number(u?.usagePercent || 0), 100);
              const status = u?.status || "safe";
              const barColor =
                status === "exceeded"
                  ? "#EF4444"
                  : status === "warning"
                    ? "#F59E0B"
                    : GREEN;

              return (
                <View
                  style={[
                    styles.budgetCard,
                    { backgroundColor: ui.card, borderColor: ui.border },
                    shadow,
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View
                      style={[styles.iconBox, { backgroundColor: ui.input }]}
                    >
                      <Ionicons
                        name="pie-chart-outline"
                        size={22}
                        color={barColor}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.cardTitle, { color: ui.text }]}
                        numberOfLines={1}
                      >
                        {item.categoryName || "Ngân sách tổng"}
                      </Text>
                      <Text
                        style={[styles.cardSub, { color: ui.muted }]}
                        numberOfLines={1}
                      >
                        {item.walletName || "Tất cả ví"} • Ngưỡng{" "}
                        {item.alertThreshold}%
                      </Text>
                    </View>

                    {isOwner && (
                      <View style={{ gap: 12, alignItems: "center" }}>
                        <Pressable
                          onPress={() =>
                            nav.navigate("EditGroupBudget", {
                              groupId,
                              budgetId: item.id,
                              initialBudget: {
                                month: String(item.month || "").slice(0, 7),
                                limitAmount: Number(item.limitAmount || 0),
                                alertThreshold: Number(
                                  item.alertThreshold || 80,
                                ),
                                categoryName: item.categoryName,
                                walletName: item.walletName,
                              },
                            })
                          }
                          hitSlop={8}
                        >
                          <Ionicons
                            name="create-outline"
                            size={19}
                            color={GREEN}
                          />
                        </Pressable>

                        <Pressable onPress={() => onDelete(item)} hitSlop={8}>
                          <Ionicons
                            name="trash-outline"
                            size={19}
                            color={ui.danger}
                          />
                        </Pressable>
                      </View>
                    )}
                  </View>

                  <View style={styles.moneyRow}>
                    <Text style={[styles.spent, { color: ui.text }]}>
                      {formatMoney(u?.spentAmount || 0)}
                    </Text>
                    <Text style={[styles.limit, { color: ui.muted }]}>
                      / {formatMoney(item.limitAmount)}
                    </Text>
                  </View>

                  <View style={[styles.track, { backgroundColor: ui.input }]}>
                    <View
                      style={[
                        styles.progress,
                        { width: `${percent}%`, backgroundColor: barColor },
                      ]}
                    />
                  </View>

                  <Text style={[styles.percentText, { color: ui.muted }]}>
                    Đã dùng {Number(u?.usagePercent || 0).toFixed(1)}%
                  </Text>
                </View>
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
  summaryRow: { marginTop: 14, flexDirection: "row", gap: 12 },
  sumBox: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 14 },
  sumLabel: { fontFamily: "Faustina_500Medium", fontSize: 12.5 },
  sumValue: { marginTop: 4, fontFamily: "Faustina_700Bold", fontSize: 15 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  budgetCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontFamily: "Faustina_700Bold", fontSize: 15 },
  cardSub: { marginTop: 3, fontFamily: "Faustina_400Regular", fontSize: 12.5 },
  moneyRow: { marginTop: 12, flexDirection: "row", alignItems: "baseline" },
  spent: { fontFamily: "Faustina_700Bold", fontSize: 18 },
  limit: { marginLeft: 4, fontFamily: "Faustina_400Regular", fontSize: 12.5 },
  track: { marginTop: 10, height: 8, borderRadius: 999, overflow: "hidden" },
  progress: { height: "100%", borderRadius: 999 },
  percentText: {
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
  monthBar: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  monthBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  monthLabel: {
    fontFamily: "Faustina_700Bold",
    fontSize: 15,
  },

  monthHint: {
    marginTop: 2,
    fontFamily: "Faustina_400Regular",
    fontSize: 11.5,
  },
});
