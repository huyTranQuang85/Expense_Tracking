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

import type { GroupStackParamList } from "../../app/GroupStack";
import { useTheme } from "../../theme/ThemeContext";
import {
  getGroupContributions,
  GroupContribution,
} from "../../services/groupFinance";
import {
  commonStyles,
  getErrMsg,
  getGroupUi,
  getShadow,
  GREEN,
} from "./groupUi";

type Rt = RouteProp<GroupStackParamList, "ContributionHistory">;

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

function formatDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function ContributionHistoryScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId, planId } = route.params;

  const [items, setItems] = useState<GroupContribution[]>([]);
  const [loading, setLoading] = useState(true);

  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const load = useCallback(async () => {
    try {
      const data = await getGroupContributions(groupId, {
        planId,
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    } finally {
      setLoading(false);
    }
  }, [groupId, planId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
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
              Lịch sử đóng góp
            </Text>
            <Text style={[commonStyles.h2, { color: ui.muted }]}>
              Các khoản đã được ghi nhận trong nhóm
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.summaryCard,
            { backgroundColor: ui.card, borderColor: ui.border },
            shadow,
          ]}
        >
          <Text style={[styles.summaryLabel, { color: ui.muted }]}>
            Tổng đã đóng
          </Text>
          <Text style={[styles.summaryValue, { color: ui.text }]}>
            {formatMoney(total)}
          </Text>
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
                <Ionicons name="receipt-outline" size={60} color={GREEN} />
                <Text style={[styles.emptyTitle, { color: ui.text }]}>
                  Chưa có lịch sử đóng góp
                </Text>
                <Text style={[styles.emptyDesc, { color: ui.muted }]}>
                  Khi owner ghi nhận đóng góp, lịch sử sẽ hiển thị tại đây.
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
                  <Ionicons name="cash-outline" size={22} color={GREEN} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.title, { color: ui.text }]}
                    numberOfLines={1}
                  >
                    {item.userName || "Thành viên"}
                  </Text>
                  <Text
                    style={[styles.desc, { color: ui.muted }]}
                    numberOfLines={1}
                  >
                    {item.note || "Đóng góp vào quỹ"} •{" "}
                    {formatDate(item.contributedAt)}
                  </Text>
                </View>

                <Text style={[styles.amount, { color: GREEN }]}>
                  +{formatMoney(item.amount)}
                </Text>
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
  summaryCard: { marginTop: 14, borderRadius: 18, borderWidth: 1, padding: 14 },
  summaryLabel: { fontFamily: "Faustina_500Medium", fontSize: 12.5 },
  summaryValue: { marginTop: 4, fontFamily: "Faustina_700Bold", fontSize: 24 },
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
  title: { fontFamily: "Faustina_700Bold", fontSize: 14.5 },
  desc: { marginTop: 3, fontFamily: "Faustina_400Regular", fontSize: 12.5 },
  amount: { fontFamily: "Faustina_700Bold", fontSize: 13.5 },
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
