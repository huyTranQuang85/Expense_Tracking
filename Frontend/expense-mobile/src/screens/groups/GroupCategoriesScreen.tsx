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
  createGroupCategory,
  deleteGroupCategory,
  getGroupCategories,
  GroupCategory,
  GroupCategoryType,
} from "../../services/groupFinance";

type Rt = RouteProp<GroupStackParamList, "GroupCategories">;

export default function GroupCategoriesScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<Rt>();
  const insets = useSafeAreaInsets();

  const { mode } = useTheme();
  const isDark = mode === "dark";
  const ui = useMemo(() => getGroupUi(isDark), [isDark]);
  const shadow = getShadow(isDark);

  const { groupId, groupName, myRole } = route.params;
  const isOwner = myRole === "owner";

  const [items, setItems] = useState<GroupCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<GroupCategoryType>("expense");

  const load = useCallback(async () => {
    try {
      const data = await getGroupCategories(groupId);
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

  const onCreate = async () => {
    const cleanName = name.trim();
    if (!cleanName)
      return Alert.alert("Thiếu thông tin", "Vui lòng nhập tên danh mục");

    try {
      setSaving(true);
      await createGroupCategory(groupId, {
        name: cleanName,
        type,
        color: type === "income" ? "#4EECA5" : "#FCA5A5",
        icon: type === "income" ? "cash" : "cart",
      });
      Toast.show({ type: "success", text1: "Đã tạo danh mục nhóm" });
      setName("");
      setType("expense");
      setModalOpen(false);
      load();
    } catch (e) {
      Toast.show({ type: "error", text1: getErrMsg(e) });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (item: GroupCategory) => {
    Alert.alert("Xóa danh mục", `Xóa danh mục "${item.name}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGroupCategory(groupId, item.id);
            Toast.show({ type: "success", text1: "Đã xóa danh mục" });
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
              Danh mục nhóm
            </Text>
            <Text
              style={[commonStyles.h2, { color: ui.muted }]}
              numberOfLines={1}
            >
              {groupName || "Phân loại thu chi nhóm"}
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
                <Ionicons name="folder-open-outline" size={60} color={GREEN} />
                <Text style={[styles.emptyTitle, { color: ui.text }]}>
                  Chưa có danh mục
                </Text>
                <Text style={[styles.emptyDesc, { color: ui.muted }]}>
                  Tạo danh mục thu/chi để ghi nhận giao dịch nhóm rõ ràng hơn.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isIncome = item.type === "income";

              return (
                <View
                  style={[
                    styles.card,
                    { backgroundColor: ui.card, borderColor: ui.border },
                    shadow,
                  ]}
                >
                  <View
                    style={[
                      styles.iconBox,
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
                    <Text style={[styles.name, { color: ui.text }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.typeText, { color: ui.muted }]}>
                      {isIncome ? "Thu nhập nhóm" : "Chi tiêu nhóm"}
                    </Text>
                  </View>

                  {isOwner && (
                    <View style={{ gap: 12, alignItems: "center" }}>
                      <Pressable
                        onPress={() =>
                          nav.navigate("EditGroupCategory", {
                            groupId,
                            categoryId: item.id,
                          })
                        }
                        hitSlop={8}
                      >
                        <Ionicons
                          name="create-outline"
                          size={20}
                          color={GREEN}
                        />
                      </Pressable>

                      <Pressable onPress={() => onDelete(item)} hitSlop={8}>
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color={ui.danger}
                        />
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            }}
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
              Tạo danh mục nhóm
            </Text>

            <Text style={[commonStyles.label, { color: ui.text }]}>
              Loại danh mục
            </Text>
            <View style={styles.typeRow}>
              <Pressable
                onPress={() => setType("expense")}
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor:
                      type === "expense" ? "rgba(252,165,165,0.45)" : ui.input,
                    borderColor: type === "expense" ? "#EF4444" : ui.border,
                  },
                ]}
              >
                <Text style={[styles.typeBtnText, { color: ui.text }]}>
                  Chi tiêu
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setType("income")}
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor:
                      type === "income" ? "rgba(78,236,165,0.35)" : ui.input,
                    borderColor: type === "income" ? GREEN : ui.border,
                  },
                ]}
              >
                <Text style={[styles.typeBtnText, { color: ui.text }]}>
                  Thu nhập
                </Text>
              </Pressable>
            </View>

            <Text style={[commonStyles.label, { color: ui.text }]}>
              Tên danh mục
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ví dụ: Ăn uống, Tiền góp"
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
                  <Text style={commonStyles.primaryBtnText}>Tạo danh mục</Text>
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
  name: { fontFamily: "Faustina_700Bold", fontSize: 15 },
  typeText: { marginTop: 3, fontFamily: "Faustina_400Regular", fontSize: 12.5 },
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
  typeRow: { marginTop: 8, flexDirection: "row", gap: 12 },
  typeBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  typeBtnText: { fontFamily: "Faustina_700Bold", fontSize: 13 },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 18 },
});
