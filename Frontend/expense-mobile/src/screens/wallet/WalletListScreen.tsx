import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "../../../App";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import { useWallets } from "./WalletContext";

type Props = NativeStackScreenProps<RootStackParamList, "WalletList">;

function formatCurrency(value: number) {
  try {
    return `${new Intl.NumberFormat("vi-VN").format(Math.abs(value || 0))}đ`;
  } catch {
    return `${Math.abs(value || 0)}đ`;
  }
}

export default function WalletListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const { wallets, totalBalance, deleteWallet } = useWallets();

  const [query, setQuery] = useState("");
  const [menuWalletId, setMenuWalletId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
            green: "#2EC98E",
            greenSoft: "rgba(46,201,142,0.16)",
          }
        : {
            bg: "#F4F6FA",
            card: "#FFFFFF",
            cardSoft: "#F8FAFC",
            text: "#111827",
            muted: "rgba(55,65,81,0.72)",
            stroke: "rgba(15,23,42,0.08)",
            green: "#2EC98E",
            greenSoft: "rgba(46,201,142,0.16)",
          },
    [isDark],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return wallets;
    return wallets.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q),
    );
  }, [query, wallets]);

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
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate("TransactionList");
            }}
            style={({ pressed }) => [
              styles.backBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.stroke,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [
                styles.chatBtn,
                {
                  backgroundColor: colors.green,
                  opacity: pressed ? 0.86 : 1,
                },
              ]}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("WalletForm", { mode: "create" })}
              style={({ pressed }) => [
                styles.addBtn,
                {
                  backgroundColor: colors.green,
                  opacity: pressed ? 0.86 : 1,
                },
              ]}
            >
              <Text style={styles.addBtnText}>Thêm ví</Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Quản lý ví</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Quản lý các ví và nguồn tiền của bạn</Text>

        <View style={[styles.totalCard, { backgroundColor: colors.green }]}>
          <View style={styles.totalHeader}>
            <View style={styles.totalIconWrap}>
              <Ionicons name="wallet-outline" size={16} color="#DFF8EE" />
            </View>
            <Text style={styles.totalCaption}>Tổng số dư</Text>
          </View>
          <Text style={styles.totalValue}>{formatCurrency(totalBalance)}</Text>
          <Text style={styles.totalSub}>Trên {wallets.length} ví</Text>
        </View>

        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.card, borderColor: colors.stroke },
          ]}
        >
          <Ionicons name="search-outline" size={20} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm kiếm ví theo tên hoặc mô tả"
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        <View style={styles.listWrap}>
          {filtered.length > 0 ? (
            filtered.map((item) => {
              const opening = menuWalletId === item.id;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.walletCardWrap,
                    {
                      backgroundColor: colors.card,
                      borderColor: item.color || colors.green,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => navigation.navigate("WalletForm", { mode: "edit", walletId: item.id })}
                    style={({ pressed }) => [
                      styles.walletCard,
                      { opacity: pressed ? 0.92 : 1 },
                    ]}
                  >
                    <View style={[styles.walletIcon, { backgroundColor: item.color || colors.green }]}> 
                      <Text style={styles.walletIconText}>{item.icon || "💰"}</Text>
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.walletName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.walletDesc, { color: colors.muted }]} numberOfLines={1}>
                        {item.description || "Không có mô tả"}
                      </Text>
                    </View>

                    <View style={styles.walletRightCol}>
                      <Text style={[styles.walletAmount, { color: item.color || colors.green }]}>
                        {formatCurrency(item.balance)}
                      </Text>
                      <Pressable
                        onPress={() => setMenuWalletId((prev) => (prev === item.id ? null : item.id))}
                        hitSlop={10}
                      >
                        <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
                      </Pressable>
                    </View>
                  </Pressable>

                  {opening ? (
                    <View style={[styles.walletMenu, { borderTopColor: colors.stroke }]}> 
                      <Pressable
                        onPress={() => {
                          setMenuWalletId(null);
                          navigation.navigate("WalletForm", { mode: "edit", walletId: item.id });
                        }}
                        style={({ pressed }) => [styles.menuBtn, { opacity: pressed ? 0.72 : 1 }]}
                      >
                        <Ionicons name="create-outline" size={18} color={colors.text} />
                        <Text style={[styles.menuText, { color: colors.text }]}>Chỉnh sửa</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          setMenuWalletId(null);
                          setDeleteId(item.id);
                        }}
                        style={({ pressed }) => [styles.menuBtn, { opacity: pressed ? 0.72 : 1 }]}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        <Text style={[styles.menuText, { color: "#EF4444" }]}>Xóa ví</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })
          ) : (
            <View style={[styles.emptyWrap, { backgroundColor: colors.card }]}> 
              <View style={[styles.emptyIcon, { backgroundColor: colors.greenSoft }]}> 
                <Ionicons name="wallet-outline" size={28} color={colors.green} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Chưa có ví nào</Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>Tạo ví đầu tiên để quản lý nguồn tiền của bạn.</Text>
              <Pressable
                onPress={() => navigation.navigate("WalletForm", { mode: "create" })}
                style={({ pressed }) => [
                  styles.emptyAddBtn,
                  { backgroundColor: colors.green, opacity: pressed ? 0.86 : 1 },
                ]}
              >
                <Text style={styles.addBtnText}>Thêm ví mới</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.floatChatWrap, { bottom: insets.bottom + 18 }]}> 
        <Pressable
          onPress={() => {}}
          style={({ pressed }) => [
            styles.floatChatBtn,
            {
              backgroundColor: colors.green,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
        </Pressable>
      </View>

      <ConfirmDeleteModal
        visible={!!deleteId}
        title="Xóa ví"
        message="Bạn chắc chắn muốn xóa ví này? Hành động này chỉ áp dụng cho dữ liệu FE hiện tại."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteWallet(deleteId);
          setDeleteId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: { alignItems: "flex-end", gap: 10 },
  chatBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  addBtn: {
    minWidth: 102,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  addBtnText: { fontFamily: "Faustina_700Bold", color: "#0E1B13", fontSize: 14 },
  title: { marginTop: 14, fontFamily: "Faustina_700Bold", fontSize: 34 },
  subtitle: { marginTop: 4, fontFamily: "Faustina_400Regular", fontSize: 14 },
  totalCard: {
    marginTop: 16,
    borderRadius: 22,
    padding: 18,
  },
  totalHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  totalIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  totalCaption: {
    color: "#E8FFF4",
    fontFamily: "Faustina_700Bold",
    fontSize: 15,
  },
  totalValue: {
    marginTop: 14,
    color: "#E8FFF4",
    fontFamily: "Faustina_700Bold",
    fontSize: 44,
  },
  totalSub: {
    marginTop: 8,
    color: "rgba(232,255,244,0.86)",
    fontFamily: "Faustina_500Medium",
    fontSize: 14,
  },
  searchBox: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, fontFamily: "Faustina_500Medium", fontSize: 14 },
  listWrap: { marginTop: 14 },
  walletCardWrap: {
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: 12,
    overflow: "hidden",
  },
  walletCard: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  walletIconText: { fontSize: 20 },
  walletName: { fontFamily: "Faustina_700Bold", fontSize: 24 },
  walletDesc: { marginTop: 2, fontFamily: "Faustina_500Medium", fontSize: 13 },
  walletRightCol: { alignItems: "flex-end", gap: 8 },
  walletAmount: { fontFamily: "Faustina_700Bold", fontSize: 16 },
  walletMenu: {
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  menuText: { fontFamily: "Faustina_700Bold", fontSize: 13.5 },
  emptyWrap: {
    borderRadius: 20,
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { marginTop: 12, fontFamily: "Faustina_700Bold", fontSize: 16 },
  emptySub: {
    marginTop: 6,
    maxWidth: 260,
    textAlign: "center",
    fontFamily: "Faustina_400Regular",
    fontSize: 12,
  },
  emptyAddBtn: {
    marginTop: 16,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  floatChatWrap: {
    position: "absolute",
    right: 16,
  },
  floatChatBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
});
