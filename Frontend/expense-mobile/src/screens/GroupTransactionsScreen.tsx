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
} from "./groups/groupUi";
import {
  deleteGroupTransaction,
  getGroupTransactions,
  GroupTransaction,
} from "../../services/groupFinance";

type Rt = RouteProp<GroupStackParamList, "GroupTransactions">;

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

export default function GroupTransactionsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId, groupName } = route.params;

  const [items, setItems] = useState<GroupTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const totalIncome = items
    .filter((x) => x.categoryType === "income")
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const totalExpense = items
    .filter((x) => x.categoryType === "expense")
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const load = useCallback(async () => {
    try {
      const data = await getGroupTransactions(groupId, { limit: 100 });
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

  const onDelete = (item: GroupTransaction) => {
    Alert.alert("Xóa giao dịch", "Bạn có chắc muốn xóa giao dịch này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGroupTransaction(groupId, item.id);
            Toast.show({ type: "success", text1: "Đã xóa giao dịch" });
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
              Giao dịch nhóm
            </Text>
            <Text
              style={[commonStyles.h2, { color: ui.muted }]}
              numberOfLines={1}
            >
              {groupName || "Lịch sử thu chi chung"}
            </Text>
          </View>

          <Pressable
            onPress={() => nav.navigate("CreateGroupTransaction", { groupId })}
            style={[styles.addBtn, { backgroundColor: GREEN }]}
          >
            <Ionicons name="add" size={20} color="#063B2B" />
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
            <Text style={[styles.sumLabel, { color: ui.muted }]}>Thu</Text>
            <Text style={[styles.sumValue, { color: GREEN }]}>
              {formatMoney(totalIncome)}
            </Text>
          </View>

          <View
            style={[
              styles.sumBox,
              { backgroundColor: ui.card, borderColor: ui.border },
              shadow,
            ]}
          >
            <Text style={[styles.sumLabel, { color: ui.muted }]}>Chi</Text>
            <Text style={[styles.sumValue, { color: "#EF4444" }]}>
              {formatMoney(totalExpense)}
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
            contentContainerStyle={{
              paddingTop: 12,
              paddingBottom: insets.bottom + 90,
              flexGrow: items.length === 0 ? 1 : undefined,
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons
                  name="swap-horizontal-outline"
                  size={60}
                  color={GREEN}
                />
                <Text style={[styles.emptyTitle, { color: ui.text }]}>
                  Chưa có giao dịch
                </Text>
                <Text style={[styles.emptyDesc, { color: ui.muted }]}>
                  Thêm giao dịch thu hoặc chi để theo dõi tài chính nhóm.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isIncome = item.categoryType === "income";
              const sign = isIncome ? "+" : "-";

              return (
                <View
                  style={[
                    styles.txCard,
                    { backgroundColor: ui.card, borderColor: ui.border },
                    shadow,
                  ]}
                >
                  <View
                    style={[
                      styles.txIcon,
                      {
                        backgroundColor: isIncome
                          ? "rgba(78,236,165,0.25)"
                          : "rgba(252,165,165,0.25)",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        isIncome
                          ? "arrow-down-circle-outline"
                          : "arrow-up-circle-outline"
                      }
                      size={22}
                      color={isIncome ? GREEN : "#EF4444"}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.txTitle, { color: ui.text }]}
                      numberOfLines={1}
                    >
                      {item.description ||
                        item.categoryName ||
                        "Giao dịch nhóm"}
                    </Text>
                    <Text
                      style={[styles.txMeta, { color: ui.muted }]}
                      numberOfLines={1}
                    >
                      {item.walletName || "Ví nhóm"} •{" "}
                      {item.categoryName || "Danh mục"} •{" "}
                      {item.createdByName || "Thành viên"}
                    </Text>
                  </View>

                  <View style={{ alignItems: "flex-end", gap: 6 }}>
                    <Text
                      style={[
                        styles.amount,
                        { color: isIncome ? GREEN : "#EF4444" },
                      ]}
                    >
                      {sign}
                      {formatMoney(item.amount)}
                    </Text>

                    <Pressable onPress={() => onDelete(item)} hitSlop={8}>
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={ui.muted}
                      />
                    </Pressable>
                  </View>
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
  sumBox: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  sumLabel: { fontFamily: "Faustina_500Medium", fontSize: 12.5 },
  sumValue: { marginTop: 4, fontFamily: "Faustina_700Bold", fontSize: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  txCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  txTitle: { fontFamily: "Faustina_700Bold", fontSize: 14.5 },
  txMeta: { marginTop: 3, fontFamily: "Faustina_400Regular", fontSize: 12 },
  amount: { fontFamily: "Faustina_700Bold", fontSize: 13 },
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
