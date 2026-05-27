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
  getContributionPlanDetail,
  GroupContributionAssignment,
  GroupContributionPlanDetail,
  recordContribution,
  upsertContributionAssignments,
  updateContributionPlan,
} from "../../services/groupFinance";
import { getGroupMembers, GroupMember } from "../../services/groups";

type Rt = RouteProp<GroupStackParamList, "ContributionPlanDetail">;

function formatMoney(value?: number | null) {
  return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

export default function ContributionPlanDetailScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId, planId, myRole } = route.params;
  const isOwner = myRole === "owner";

  const [detail, setDetail] = useState<GroupContributionPlanDetail | null>(
    null,
  );
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [assignOpen, setAssignOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<GroupContributionAssignment | null>(null);

  const [defaultAmount, setDefaultAmount] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, m] = await Promise.all([
        getContributionPlanDetail(groupId, planId),
        getGroupMembers(groupId),
      ]);
      setDetail(d);
      setMembers(m);
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

  const assignments = detail?.assignments || [];
  const totalExpected = assignments.reduce(
    (s, x) => s + Number(x.expectedAmount || 0),
    0,
  );
  const totalPaid = assignments.reduce(
    (s, x) => s + Number(x.paidAmount || 0),
    0,
  );
  const percent =
    totalExpected > 0 ? Math.min((totalPaid / totalExpected) * 100, 100) : 0;

  const onAutoAssign = async () => {
    const amount = Number(defaultAmount);
    if (!amount || amount <= 0) {
      return Alert.alert(
        "Sai số tiền",
        "Vui lòng nhập số tiền mỗi người cần đóng",
      );
    }

    try {
      setSaving(true);
      await upsertContributionAssignments(
        groupId,
        planId,
        members.map((m) => ({
          userId: m.userId,
          expectedAmount: amount,
        })),
      );
      Toast.show({ type: "success", text1: "Đã phân bổ đóng góp" });
      setAssignOpen(false);
      setDefaultAmount("");
      load();
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    } finally {
      setSaving(false);
    }
  };

  const openRecord = (assignment: GroupContributionAssignment) => {
    setSelectedAssignment(assignment);
    const remaining = Math.max(
      Number(assignment.expectedAmount || 0) -
        Number(assignment.paidAmount || 0),
      0,
    );
    setPayAmount(String(remaining || ""));
    setNote("");
    setContributeOpen(true);
  };

  const onRecordContribution = async () => {
    if (!detail || !selectedAssignment) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      return Alert.alert("Sai số tiền", "Số tiền đóng góp phải lớn hơn 0");
    }

    try {
      setSaving(true);
      await recordContribution(groupId, {
        groupWalletId: detail.groupWalletId,
        contributionPlanId: detail.id,
        assignmentId: selectedAssignment.id,
        userId: selectedAssignment.userId,
        amount,
        note: note.trim() || undefined,
      });
      Toast.show({ type: "success", text1: "Đã ghi nhận đóng góp" });
      setContributeOpen(false);
      setSelectedAssignment(null);
      load();
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    } finally {
      setSaving(false);
    }
  };
  const onChangePlanStatus = (status: "closed" | "cancelled") => {
    Alert.alert(
      status === "closed" ? "Đóng quỹ" : "Hủy quỹ",
      status === "closed"
        ? "Sau khi đóng, quỹ sẽ không tiếp tục theo dõi đóng góp mới."
        : "Bạn có chắc muốn hủy quỹ này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: status === "closed" ? "Đóng quỹ" : "Hủy quỹ",
          style: status === "cancelled" ? "destructive" : "default",
          onPress: async () => {
            try {
              await updateContributionPlan(groupId, planId, { status });

              Toast.show({
                type: "success",
                text1: status === "closed" ? "Đã đóng quỹ" : "Đã hủy quỹ",
              });

              load();
            } catch (e) {
              Toast.show({ type: "error", text1: getErrMsg(e) });
            }
          },
        },
      ],
    );
  };
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: ui.bg }]}>
        <ActivityIndicator color={GREEN} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.center, { backgroundColor: ui.bg }]}>
        <Text style={{ color: ui.text }}>Không tìm thấy quỹ đóng góp</Text>
      </View>
    );
  }

  return (
    <View style={[commonStyles.root, { backgroundColor: ui.bg }]}>
      <View style={{ height: insets.top, backgroundColor: ui.bg }} />

      <View style={commonStyles.page}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => nav.goBack()} style={commonStyles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={ui.text} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text
              style={[commonStyles.h1, { color: ui.text }]}
              numberOfLines={1}
            >
              {detail.title}
            </Text>
            <Text
              style={[commonStyles.h2, { color: ui.muted }]}
              numberOfLines={1}
            >
              {detail.walletName || "Ví nhóm"} • {detail.status}
            </Text>
          </View>

          {isOwner && (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() =>
                  nav.navigate("ContributionHistory", { groupId, planId })
                }
                style={[styles.addBtn, { backgroundColor: ui.input }]}
              >
                <Ionicons name="receipt-outline" size={19} color={GREEN} />
              </Pressable>

              {detail.status === "open" && (
                <Pressable
                  onPress={() => setAssignOpen(true)}
                  style={[styles.addBtn, { backgroundColor: GREEN }]}
                >
                  <Ionicons name="people-outline" size={19} color="#063B2B" />
                </Pressable>
              )}
            </View>
          )}
        </View>

        <View
          style={[
            styles.summaryCard,
            { backgroundColor: ui.card, borderColor: ui.border },
            shadow,
          ]}
        >
          <Text style={[styles.summaryLabel, { color: ui.muted }]}>
            Tiến độ đóng góp
          </Text>
          <View style={styles.moneyRow}>
            <Text style={[styles.paid, { color: ui.text }]}>
              {formatMoney(totalPaid)}
            </Text>
            <Text style={[styles.target, { color: ui.muted }]}>
              / {formatMoney(totalExpected || detail.targetAmount)}
            </Text>
          </View>

          <View style={[styles.track, { backgroundColor: ui.input }]}>
            <View style={[styles.progress, { width: `${percent}%` }]} />
          </View>

          <Text style={[styles.percentText, { color: ui.muted }]}>
            {percent.toFixed(1)}% hoàn thành
          </Text>
        </View>

        <Text style={[commonStyles.sectionTitle, { color: ui.text }]}>
          Thành viên đóng góp
        </Text>
        {isOwner && detail.status === "open" && (
          <View style={styles.planActions}>
            <Pressable
              onPress={() => onChangePlanStatus("closed")}
              style={[
                commonStyles.secondaryBtn,
                { flex: 1, backgroundColor: ui.input },
              ]}
            >
              <Text style={[commonStyles.secondaryBtnText, { color: ui.text }]}>
                Đóng quỹ
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onChangePlanStatus("cancelled")}
              style={[
                commonStyles.secondaryBtn,
                { flex: 1, backgroundColor: "rgba(239,68,68,0.14)" },
              ]}
            >
              <Text
                style={[commonStyles.secondaryBtnText, { color: ui.danger }]}
              >
                Hủy quỹ
              </Text>
            </Pressable>
          </View>
        )}
        <FlatList
          data={assignments}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 90,
            flexGrow: assignments.length === 0 ? 1 : undefined,
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="person-add-outline" size={58} color={GREEN} />
              <Text style={[styles.emptyTitle, { color: ui.text }]}>
                Chưa phân bổ thành viên
              </Text>
              <Text style={[styles.emptyDesc, { color: ui.muted }]}>
                Owner cần phân bổ số tiền cần đóng cho từng thành viên.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const memberPercent =
              item.expectedAmount > 0
                ? Math.min((item.paidAmount / item.expectedAmount) * 100, 100)
                : 0;

            const statusColor =
              item.status === "paid"
                ? GREEN
                : item.status === "partial"
                  ? "#F59E0B"
                  : "#EF4444";

            return (
              <View
                style={[
                  styles.assignmentCard,
                  { backgroundColor: ui.card, borderColor: ui.border },
                  shadow,
                ]}
              >
                <View style={styles.assignmentTop}>
                  <View style={[styles.avatar, { backgroundColor: ui.input }]}>
                    <Ionicons name="person-outline" size={19} color={GREEN} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.memberName, { color: ui.text }]}
                      numberOfLines={1}
                    >
                      {item.userName || item.email || "Thành viên"}
                    </Text>
                    <Text style={[styles.memberMeta, { color: ui.muted }]}>
                      {formatMoney(item.paidAmount)} /{" "}
                      {formatMoney(item.expectedAmount)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: `${statusColor}22` },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View
                  style={[styles.smallTrack, { backgroundColor: ui.input }]}
                >
                  <View
                    style={[
                      styles.smallProgress,
                      {
                        width: `${memberPercent}%`,
                        backgroundColor: statusColor,
                      },
                    ]}
                  />
                </View>

                {isOwner && item.status !== "paid" && (
                  <Pressable
                    onPress={() => openRecord(item)}
                    style={[
                      commonStyles.primaryBtn,
                      { marginTop: 12, backgroundColor: GREEN },
                    ]}
                  >
                    <Text style={commonStyles.primaryBtnText}>
                      Ghi nhận đóng góp
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      </View>

      <Modal
        visible={assignOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: ui.overlay }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: ui.card, borderColor: ui.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: ui.text }]}>
              Phân bổ đóng góp
            </Text>
            <Text style={[styles.modalDesc, { color: ui.muted }]}>
              Nhập số tiền cần đóng cho mỗi thành viên hiện có trong nhóm.
            </Text>

            <Text style={[commonStyles.label, { color: ui.text }]}>
              Số tiền mỗi người
            </Text>
            <TextInput
              value={defaultAmount}
              onChangeText={setDefaultAmount}
              keyboardType="numeric"
              placeholder="3000000"
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
                onPress={() => setAssignOpen(false)}
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
                disabled={saving}
                onPress={onAutoAssign}
                style={[
                  commonStyles.primaryBtn,
                  {
                    flex: 1.3,
                    backgroundColor: GREEN,
                    opacity: saving ? 0.65 : 1,
                  },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#063B2B" />
                ) : (
                  <Text style={commonStyles.primaryBtnText}>Phân bổ</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={contributeOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setContributeOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: ui.overlay }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: ui.card, borderColor: ui.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: ui.text }]}>
              Ghi nhận đóng góp
            </Text>
            <Text style={[styles.modalDesc, { color: ui.muted }]}>
              Thành viên:{" "}
              {selectedAssignment?.userName || selectedAssignment?.email}
            </Text>

            <Text style={[commonStyles.label, { color: ui.text }]}>
              Số tiền
            </Text>
            <TextInput
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              placeholder="1000000"
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

            <Text style={[commonStyles.label, { color: ui.text }]}>
              Ghi chú
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Đóng trước một phần"
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
                onPress={() => setContributeOpen(false)}
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
                disabled={saving}
                onPress={onRecordContribution}
                style={[
                  commonStyles.primaryBtn,
                  {
                    flex: 1.3,
                    backgroundColor: GREEN,
                    opacity: saving ? 0.65 : 1,
                  },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#063B2B" />
                ) : (
                  <Text style={commonStyles.primaryBtnText}>Ghi nhận</Text>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: { marginTop: 14, borderRadius: 18, borderWidth: 1, padding: 14 },
  summaryLabel: { fontFamily: "Faustina_500Medium", fontSize: 12.5 },
  moneyRow: { marginTop: 6, flexDirection: "row", alignItems: "baseline" },
  paid: { fontFamily: "Faustina_700Bold", fontSize: 20 },
  target: { marginLeft: 4, fontFamily: "Faustina_400Regular", fontSize: 12.5 },
  track: { marginTop: 10, height: 8, borderRadius: 999, overflow: "hidden" },
  progress: { height: "100%", backgroundColor: GREEN, borderRadius: 999 },
  percentText: {
    marginTop: 7,
    fontFamily: "Faustina_400Regular",
    fontSize: 12,
  },
  assignmentCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  assignmentTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  memberName: { fontFamily: "Faustina_700Bold", fontSize: 14.5 },
  memberMeta: {
    marginTop: 3,
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
  },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontFamily: "Faustina_700Bold", fontSize: 10.5 },
  smallTrack: {
    marginTop: 12,
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
  },
  smallProgress: { height: "100%", borderRadius: 999 },
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
  modalOverlay: { flex: 1, justifyContent: "center", padding: 22 },
  modalCard: { borderRadius: 18, padding: 16, borderWidth: 1 },
  modalTitle: { fontFamily: "Faustina_700Bold", fontSize: 18 },
  modalDesc: {
    marginTop: 7,
    fontFamily: "Faustina_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 18 },
});
