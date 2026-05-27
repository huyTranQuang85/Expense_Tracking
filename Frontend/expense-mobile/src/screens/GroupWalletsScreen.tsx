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
} from "./groups/groupUi";
import {
  archiveGroupWallet,
  createGroupWallet,
  getGroupWallets,
  GroupWallet,
} from "../../services/groupFinance";

type Rt = RouteProp<GroupStackParamList, "GroupWallets">;

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

export default function GroupWalletsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId, groupName, myRole } = route.params;
  const isOwner = myRole === "owner";

  const [wallets, setWallets] = useState<GroupWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [balance, setBalance] = useState("0");

  const totalBalance = wallets.reduce(
    (sum, w) => sum + Number(w.balance || 0),
    0,
  );

  const load = useCallback(async () => {
    try {
      const data = await getGroupWallets(groupId);
      setWallets(Array.isArray(data) ? data : []);
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

  const resetForm = () => {
    setName("");
    setDescription("");
    setBalance("0");
  };

  const onCreate = async () => {
    const cleanName = name.trim();
    const amount = Number(balance || 0);

    if (!cleanName)
      return Alert.alert("Thiếu thông tin", "Vui lòng nhập tên ví nhóm");
    if (Number.isNaN(amount) || amount < 0) {
      return Alert.alert("Sai dữ liệu", "Số dư ban đầu không hợp lệ");
    }

    try {
      setSaving(true);
      await createGroupWallet(groupId, {
        name: cleanName,
        description: description.trim() || undefined,
        balance: amount,
        type: "standard",
        color: "#4EECA5",
      });
      Toast.show({ type: "success", text1: "Đã tạo ví nhóm" });
      resetForm();
      setModalOpen(false);
      load();
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    } finally {
      setSaving(false);
    }
  };

  const onArchive = (wallet: GroupWallet) => {
    Alert.alert("Lưu trữ ví", `Lưu trữ ví "${wallet.name}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Lưu trữ",
        style: "destructive",
        onPress: async () => {
          try {
            await archiveGroupWallet(groupId, wallet.id);
            Toast.show({ type: "success", text1: "Đã lưu trữ ví nhóm" });
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
            <Text style={[commonStyles.h1, { color: ui.text }]}>Ví nhóm</Text>
            <Text
              style={[commonStyles.h2, { color: ui.muted }]}
              numberOfLines={1}
            >
              {groupName || "Quản lý ví chung"}
            </Text>
          </View>

          {isOwner && (
            <Pressable
              onPress={() => setModalOpen(true)}
              style={[styles.addBtn, { backgroundColor: GREEN }]}
            >
              <Ionicons name="add" size={20} color="#063B2B" />
            </Pressable>
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
            Tổng số dư ví nhóm
          </Text>
          <Text style={[styles.summaryValue, { color: ui.text }]}>
            {formatMoney(totalBalance)}
          </Text>
          <Text style={[styles.summaryHint, { color: ui.muted }]}>
            Gồm {wallets.length} ví đang hoạt động
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={GREEN} />
          </View>
        ) : (
          <FlatList
            data={wallets}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 10,
              paddingBottom: insets.bottom + 90,
              flexGrow: wallets.length === 0 ? 1 : undefined,
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="wallet-outline" size={60} color={GREEN} />
                <Text style={[styles.emptyTitle, { color: ui.text }]}>
                  Chưa có ví nhóm
                </Text>
                <Text style={[styles.emptyDesc, { color: ui.muted }]}>
                  Owner có thể tạo ví để bắt đầu ghi nhận giao dịch chung.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.walletCard,
                  { backgroundColor: ui.card, borderColor: ui.border },
                  shadow,
                ]}
              >
                <View
                  style={[styles.walletIcon, { backgroundColor: ui.input }]}
                >
                  <Ionicons name="wallet-outline" size={22} color={GREEN} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.walletName, { color: ui.text }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.walletDesc, { color: ui.muted }]}
                    numberOfLines={1}
                  >
                    {item.description || "Ví chi tiêu chung"}
                  </Text>
                  <Text style={[styles.walletBalance, { color: ui.text }]}>
                    {formatMoney(item.balance)}
                  </Text>
                </View>

                {isOwner && (
                  <View style={{ gap: 12, alignItems: "center" }}>
                    <Pressable
                      onPress={() =>
                        nav.navigate("EditGroupWallet", {
                          groupId,
                          walletId: item.id,
                        })
                      }
                      hitSlop={8}
                    >
                      <Ionicons name="create-outline" size={20} color={GREEN} />
                    </Pressable>

                    <Pressable onPress={() => onArchive(item)} hitSlop={8}>
                      <Ionicons
                        name="archive-outline"
                        size={20}
                        color={ui.muted}
                      />
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          />
        )}
      </View>

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: ui.overlay }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: ui.card, borderColor: ui.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: ui.text }]}>
              Tạo ví nhóm
            </Text>
            <Text style={[styles.modalDesc, { color: ui.muted }]}>
              Ví nhóm dùng để ghi nhận thu chi và đóng góp chung.
            </Text>

            <Text style={[commonStyles.label, { color: ui.text }]}>Tên ví</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ví gia đình"
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

            <Text style={[commonStyles.label, { color: ui.text }]}>Mô tả</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Ví chi tiêu chung"
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
              Số dư ban đầu
            </Text>
            <TextInput
              value={balance}
              onChangeText={setBalance}
              keyboardType="numeric"
              placeholder="0"
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
                onPress={() => setModalOpen(false)}
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
                onPress={onCreate}
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
                  <Text style={commonStyles.primaryBtnText}>Tạo ví</Text>
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
  summaryCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  summaryLabel: { fontFamily: "Faustina_500Medium", fontSize: 13 },
  summaryValue: { marginTop: 4, fontFamily: "Faustina_700Bold", fontSize: 25 },
  summaryHint: {
    marginTop: 4,
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  walletCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  walletName: { fontFamily: "Faustina_700Bold", fontSize: 15 },
  walletDesc: {
    marginTop: 3,
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
  },
  walletBalance: { marginTop: 7, fontFamily: "Faustina_700Bold", fontSize: 16 },
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
