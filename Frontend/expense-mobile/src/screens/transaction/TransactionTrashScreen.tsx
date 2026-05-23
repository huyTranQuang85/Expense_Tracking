import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import { useCategories } from "../categories/CategoriesContext";
import { getCategoryById, resolveCategoryIcon } from "../categories/categoryFixtures";
import type { RootStackParamList } from "../../../App";
import { useTransactions } from "./TransactionContext";

type Props = NativeStackScreenProps<RootStackParamList, "TransactionTrash">;

function formatCurrency(value: number) {
  try {
    return `${new Intl.NumberFormat("vi-VN").format(Math.abs(value || 0))}đ`;
  } catch {
    return `${Math.abs(value || 0)}đ`;
  }
}

export default function TransactionTrashScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const { categories } = useCategories();
  const { trashedTransactions, restoreTransaction, forceDeleteTransaction } = useTransactions();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"restore" | "delete">("delete");

  const colors = useMemo(
    () =>
      isDark
        ? {
            bg: "#0B0F14",
            card: "#111827",
            cardSoft: "#172032",
            text: "#F5F7FA",
            muted: "rgba(226,232,240,0.68)",
            stroke: "rgba(148,163,184,0.22)",
            green: "#4EECA5",
            greenSoft: "rgba(78,236,165,0.18)",
            redSoft: "rgba(248,113,113,0.18)",
          }
        : {
            bg: "#F4F6FA",
            card: "#FFFFFF",
            cardSoft: "#F8FAFC",
            text: "#111827",
            muted: "rgba(55,65,81,0.72)",
            stroke: "rgba(15,23,42,0.08)",
            green: "#2EC98E",
            greenSoft: "rgba(78,236,165,0.18)",
            redSoft: "rgba(251,207,213,0.8)",
          },
    [isDark],
  );

  const selectedCount = selectedIds.length;

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const runRestore = () => {
    if (selectedCount === 0) return;
    selectedIds.forEach((id) => restoreTransaction(id));
    clearSelection();
  };

  const runDelete = () => {
    if (selectedCount === 0) return;
    selectedIds.forEach((id) => forceDeleteTransaction(id));
    clearSelection();
  };

  const confirmAction = () => {
    setConfirmOpen(false);
    if (confirmMode === "restore") {
      runRestore();
      return;
    }
    runDelete();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={{ height: insets.top, backgroundColor: colors.bg }} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.closeBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.stroke,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Chọn giao dịch</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Đã chọn {selectedCount}/{trashedTransactions.length}</Text>
          </View>

          <View style={[styles.counterPill, { backgroundColor: colors.card, borderColor: colors.stroke }]}>
            <Text style={[styles.counterText, { color: colors.text }]}>{trashedTransactions.length}</Text>
          </View>
        </View>

        <View style={[styles.actionBar, { backgroundColor: colors.card }]}>
          <Pressable
            onPress={clearSelection}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.cardSoft, borderColor: colors.stroke, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Ionicons name="checkbox-outline" size={18} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>Bỏ chọn</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (selectedCount === 0) {
                Alert.alert("Chưa chọn giao dịch", "Hãy chọn ít nhất một giao dịch để khôi phục.");
                return;
              }
              setConfirmMode("restore");
              setConfirmOpen(true);
            }}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.greenSoft, borderColor: colors.green, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.green} />
            <Text style={[styles.actionText, { color: colors.text }]}>Khôi phục</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (selectedCount === 0) {
                Alert.alert("Chưa chọn giao dịch", "Hãy chọn ít nhất một giao dịch để xoá.");
                return;
              }
              setConfirmMode("delete");
              setConfirmOpen(true);
            }}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.redSoft, borderColor: "rgba(239,68,68,0.28)", opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={[styles.actionText, { color: colors.text }]}>Xóa</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {trashedTransactions.length > 0 ? (
            trashedTransactions.map((item) => {
              const rootCategory = getCategoryById(item.categoryId as string, categories);
              const selected = selectedIds.includes(item.id);

              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleSelection(item.id)}
                  onLongPress={() => toggleSelection(item.id)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderColor: selected ? colors.green : colors.stroke,
                      backgroundColor: selected ? colors.greenSoft : colors.cardSoft,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={[styles.checkBox, { borderColor: selected ? colors.green : colors.stroke, backgroundColor: selected ? colors.greenSoft : colors.card }]}>
                    <Ionicons name={selected ? "checkmark" : "square-outline"} size={18} color={selected ? colors.green : colors.muted} />
                  </View>

                  <View style={[styles.txIcon, { backgroundColor: rootCategory?.color || colors.green }]}>
                    <Text style={styles.txEmoji}>{resolveCategoryIcon(rootCategory?.iconKey)}</Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.description || "Giao dịch đã xoá"}
                    </Text>
                    <Text style={[styles.rowSub, { color: colors.muted }]} numberOfLines={1}>
                      {rootCategory?.name ?? "Danh mục"} • {item.walletName} • {item.deletedAt ? new Date(item.deletedAt).toLocaleString("vi-VN") : ""}
                    </Text>
                  </View>

                  <Text style={[styles.amount, { color: item.type === "expense" ? "#EF4444" : "#16A34A" }]}>
                    {item.type === "expense" ? "-" : "+"}
                    {formatCurrency(item.amount)}
                  </Text>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.greenSoft }]}>
                <Ionicons name="trash-outline" size={28} color={colors.green} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Giỏ rác trống</Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>Các giao dịch bị xoá mềm sẽ xuất hiện ở đây.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <ConfirmDeleteModal
        visible={confirmOpen}
        title={confirmMode === "restore" ? "Khôi phục giao dịch" : "Xóa giao dịch"}
        message={
          confirmMode === "restore"
            ? "Bạn chắc chắn muốn khôi phục các giao dịch đã chọn?"
            : "Bạn chắc chắn muốn xóa vĩnh viễn các giao dịch đã chọn?"
        }
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "Faustina_700Bold", fontSize: 22 },
  subtitle: { marginTop: 4, fontFamily: "Faustina_500Medium", fontSize: 12.5 },
  counterPill: {
    minWidth: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  counterText: { fontFamily: "Faustina_700Bold", fontSize: 14 },
  actionBar: {
    marginTop: 16,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionText: { fontFamily: "Faustina_700Bold", fontSize: 13 },
  card: { marginTop: 14, borderRadius: 20, padding: 14 },
  row: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  checkBox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  txIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  txEmoji: { fontSize: 18 },
  rowTitle: { fontFamily: "Faustina_700Bold", fontSize: 14 },
  rowSub: { marginTop: 4, fontFamily: "Faustina_400Regular", fontSize: 11.5 },
  amount: { fontFamily: "Faustina_700Bold", fontSize: 14 },
  emptyWrap: { alignItems: "center", paddingVertical: 28 },
  emptyIcon: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginTop: 12, fontFamily: "Faustina_700Bold", fontSize: 16 },
  emptySub: { marginTop: 6, fontFamily: "Faustina_400Regular", fontSize: 12, textAlign: "center", maxWidth: 250 },
});
