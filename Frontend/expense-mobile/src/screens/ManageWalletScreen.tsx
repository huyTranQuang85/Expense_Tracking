// src/screens/ManageWalletScreen.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { fetchMe } from "../services/profile";
import { deleteWallet, fetchMyWallets, Wallet } from "../services/wallets";

// 🔥 dùng ThemeContext giống CategoryScreen
import { useTheme } from "../theme/ThemeContext";

const VND = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}₫`;
const GREEN = "#34D399";

type UI = {
  bg: string;
  card: string;
  text: string;
  muted: string;
  searchBg: string;
  stroke: string;
  chipBg: string;
  sheetBg: string;
  overlay: string;
  danger: string;
};

async function hapticLight() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}
async function hapticMedium() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {}
}
async function hapticSuccess() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}
async function hapticError() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {}
}

function ConfirmModal({
  visible,
  title,
  desc,
  onCancel,
  onConfirm,
  confirmText = "Xóa",
  cancelText = "Hủy",
  loading,
  ui,
  isDark,
}: {
  visible: boolean;
  title: string;
  desc: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  ui: UI;
  isDark: boolean;
}) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    a.setValue(0);
    Animated.timing(a, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, a]);

  if (!visible) return null;

  const scale = a.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });

  return (
    <View style={styles.modalOverlay}>
      <Pressable
        style={[styles.modalBackdrop, { backgroundColor: ui.overlay }]}
        onPress={onCancel}
      />
      <Animated.View
        style={[
          styles.modal,
          {
            opacity: a,
            transform: [{ scale }],
            backgroundColor: ui.card,
            borderColor: ui.stroke,
          },
        ]}
      >
        <Text style={[styles.modalTitle, { color: ui.text }]}>{title}</Text>
        <Text style={[styles.modalDesc, { color: ui.muted }]}>{desc}</Text>

        <View style={styles.modalBtns}>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.modalBtn,
              {
                backgroundColor: isDark ? ui.chipBg : "#E5E7EB",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[styles.modalBtnText, { color: ui.text }]}>
              {cancelText}
            </Text>
          </Pressable>

          <Pressable
            onPress={onConfirm}
            disabled={loading}
            style={({ pressed }) => [
              styles.modalBtn,
              {
                backgroundColor: GREEN,
                opacity: loading ? 0.65 : pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={styles.modalBtnTextStrong}>{confirmText}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

function ActionSheet({
  visible,
  title,
  onClose,
  actions,
  ui,
}: {
  visible: boolean;
  title?: string;
  onClose: () => void;
  actions: Array<{
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    destructive?: boolean;
    onPress: () => void;
  }>;
  ui: UI;
}) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    a.setValue(0);
    Animated.timing(a, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, a]);

  const backdropOpacity = a.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const translateY = a.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.sheetOverlay,
          { opacity: backdropOpacity, backgroundColor: "transparent" },
        ]}
      >
        <Pressable
          style={[styles.sheetBackdrop, { backgroundColor: ui.overlay }]}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY }],
            backgroundColor: ui.sheetBg,
            borderColor: ui.stroke,
          },
        ]}
      >
        <View style={styles.sheetHandle} />
        {!!title && (
          <Text style={[styles.sheetTitle, { color: ui.text }]}>{title}</Text>
        )}

        {actions.map((it) => (
          <Pressable
            key={it.key}
            onPress={it.onPress}
            style={({ pressed }) => [
              styles.sheetItem,
              {
                backgroundColor:
                  it.destructive || false
                    ? "rgba(239,68,68,0.08)"
                    : "rgba(15,23,42,0.03)",
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Ionicons
              name={it.icon}
              size={18}
              color={it.destructive ? "#DC2626" : ui.text}
            />
            <Text
              style={[
                styles.sheetText,
                { color: it.destructive ? "#DC2626" : ui.text },
              ]}
            >
              {it.label}
            </Text>
          </Pressable>
        ))}

        <View style={{ height: 10 }} />

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.sheetCancel,
            {
              backgroundColor: "rgba(148,163,184,0.18)",
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.sheetCancelText, { color: ui.text }]}>Đóng</Text>
        </Pressable>

        <View style={{ height: Platform.OS === "ios" ? 12 : 10 }} />
      </Animated.View>
    </Modal>
  );
}

function TotalBalanceCard({ total, count }: { total: number; count: number }) {
  return (
    <LinearGradient
      colors={["#0F766E", "#2CA58D"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.totalCard}
    >
      <View style={styles.totalTop}>
        <View style={styles.totalIcon}>
          <Ionicons name="wallet-outline" size={18} color="#E6FFFB" />
        </View>
        <Text style={styles.totalLabel}>Tổng số dư</Text>
      </View>

      <Text style={styles.totalValue}>{VND(total)}</Text>
      <Text style={styles.totalSub}>Trên {count} ví</Text>
    </LinearGradient>
  );
}

function WalletCard({
  wallet,
  anim,
  onOpenActions,
  palette,
  isDark,
}: {
  wallet: Wallet;
  anim: Animated.Value;
  onOpenActions: () => void;
  palette: UI;
  isDark: boolean;
}) {
  const color = wallet.color || "#0F766E";
  const icon = wallet.icon || "💰";

  const press = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    hapticLight();
    Animated.spring(press, {
      toValue: 0.985,
      useNativeDriver: true,
      speed: 22,
      bounciness: 6,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(press, {
      toValue: 1,
      useNativeDriver: true,
      speed: 22,
      bounciness: 6,
    }).start();
  };

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  return (
    <Animated.View
      style={{ opacity: anim, transform: [{ translateY }, { scale: press }] }}
    >
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => {
          hapticMedium();
          onOpenActions();
        }}
        onLongPress={() => {
          hapticMedium();
          onOpenActions();
        }}
        delayLongPress={220}
        style={({ pressed }) => [
          styles.walletCard,
          {
            backgroundColor: palette.card,
            borderColor: palette.stroke,
            borderTopColor: color,
            borderLeftColor: color,
          },
          pressed && {
            backgroundColor: isDark ? "#020617" : "#FBFDFF",
          },
        ]}
      >
        <View style={styles.walletRow}>
          <View style={[styles.walletCircle, { backgroundColor: color }]}>
            <Text style={styles.walletCircleText}>{icon}</Text>
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[styles.walletName, { color: palette.text }]}
              numberOfLines={1}
            >
              {wallet.name}
            </Text>
            <Text
              style={[styles.walletDesc, { color: palette.muted }]}
              numberOfLines={1}
            >
              {wallet.description || " "}
            </Text>
          </View>

          <View style={styles.rightCol}>
            <Text style={[styles.balanceValue, { color }]} numberOfLines={1}>
              {VND(wallet.balance)}
            </Text>

            <View style={{ height: 8 }} />

            <Pressable
              onPress={() => {
                hapticMedium();
                onOpenActions();
              }}
              hitSlop={10}
              style={({ pressed }) => [
                styles.menuBtn,
                {
                  backgroundColor: palette.chipBg,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={18}
                color={palette.muted}
              />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function ManageWalletScreen({ navigation }: any) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  const ui: UI = useMemo(() => {
    const bg = isDark ? "#020617" : "#F8FAFC";
    const card = isDark ? "rgba(15,23,42,0.98)" : "#FFFFFF";
    const text = isDark ? "rgba(248,250,252,0.96)" : "#0F172A";
    const muted = isDark ? "rgba(148,163,184,0.96)" : "#64748B";
    const searchBg = isDark ? "rgba(15,23,42,0.96)" : "#FFFFFF";
    const stroke = isDark ? "rgba(51,65,85,1)" : "rgba(15,23,42,0.06)";
    const chipBg = isDark ? "rgba(15,23,42,0.90)" : "rgba(15,23,42,0.04)";
    const sheetBg = isDark ? "rgba(15,23,42,0.98)" : "#FFFFFF";
    const overlay = "rgba(2,6,23,0.45)";
    const danger = "#EF4444";
    return {
      bg,
      card,
      text,
      muted,
      searchBg,
      stroke,
      chipBg,
      sheetBg,
      overlay,
      danger,
    };
  }, [isDark]);

  const [loading, setLoading] = useState(true);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [q, setQ] = useState("");

  const [confirm, setConfirm] = useState<{ open: boolean; wallet?: Wallet }>({
    open: false,
  });
  const [deleting, setDeleting] = useState(false);

  const [sheet, setSheet] = useState<{ open: boolean; wallet?: Wallet }>({
    open: false,
  });

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(10)).current;

  const itemAnims = useRef<Record<string, Animated.Value>>({}).current;

  const animateIn = useCallback(
    (data: Wallet[]) => {
      fade.setValue(0);
      rise.setValue(10);

      data.forEach((w) => {
        const key = String(w.id);
        if (!itemAnims[key]) itemAnims[key] = new Animated.Value(0);
        itemAnims[key].setValue(0);
      });

      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(rise, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        const anims = data.slice(0, 40).map((w, idx) =>
          Animated.timing(itemAnims[String(w.id)], {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
            delay: 40 * idx,
          })
        );
        Animated.stagger(40, anims).start();
      });
    },
    [fade, rise, itemAnims]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [, ws] = await Promise.all([fetchMe(), fetchMyWallets()]);
      setWallets(ws);
      animateIn(ws);
    } catch (e) {
      Toast.show({ type: "error", text1: "Không tải được danh sách ví" });
      hapticError();
    } finally {
      setLoading(false);
    }
  }, [animateIn]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return wallets;
    return wallets.filter((w) => {
      const name = (w.name || "").toLowerCase();
      const desc = (w.description || "").toLowerCase();
      return name.includes(s) || desc.includes(s);
    });
  }, [wallets, q]);

  const totalBalance = useMemo(() => {
    return wallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0);
  }, [wallets]);

  const openActions = (wallet: Wallet) => setSheet({ open: true, wallet });

  const goEdit = (wallet: Wallet) => {
    setSheet({ open: false });
    navigation.navigate("EditWallet", { wallet });
  };

  const askDelete = (wallet: Wallet) => {
    setSheet({ open: false });
    setConfirm({ open: true, wallet });
  };

  const onDelete = async () => {
    const w = confirm.wallet;
    if (!w) return;

    try {
      setDeleting(true);
      await hapticMedium();
      await deleteWallet(w.id);

      setConfirm({ open: false });
      setWallets((prev) => prev.filter((x) => String(x.id) !== String(w.id)));

      Toast.show({ type: "success", text1: "Xóa ví thành công" });
      hapticSuccess();
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: e?.response?.data?.message ?? "Không xóa được ví",
      });
      hapticError();
    } finally {
      setDeleting(false);
    }
  };

  const sheetWallet = sheet.wallet;

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: ui.bg }]}>
        <View style={styles.page}>
          <View style={[styles.center, { flex: 1 }]}>
            <ActivityIndicator size="large" />
            <Text style={[styles.loadingText, { color: ui.muted }]}>
              Đang tải ví...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: ui.bg }]}>
      <View style={styles.page}>
        <Animated.View
          style={{ flex: 1, opacity: fade, transform: [{ translateY: rise }] }}
        >
          {/* Header: back only */}
          <View style={styles.topRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [
                styles.backBtn,
                {
                  backgroundColor: ui.card,
                  borderColor: ui.stroke,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={22} color={ui.text} />
            </Pressable>
          </View>

          {/* Title + CTA */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: ui.text }]}>Quản lý ví</Text>

            <Pressable
              onPress={() => {
                hapticLight();
                navigation.navigate("WalletForm", { mode: "create" });
              }}
              style={({ pressed }) => [
                styles.addBtnOld,
                { opacity: pressed ? 0.92 : 1 },
              ]}
            >
              <Text style={styles.addBtnOldText}>Thêm ví</Text>
            </Pressable>
          </View>

          <Text style={[styles.subTitle, { color: ui.muted }]}>
            Quản lý các ví và nguồn tiền của bạn
          </Text>

          {/* Total balance */}
          <TotalBalanceCard total={totalBalance} count={wallets.length} />

          {/* Search */}
          <View
            style={[
              styles.searchPill,
              { backgroundColor: ui.searchBg, borderColor: ui.stroke },
            ]}
          >
            <Ionicons name="search" size={18} color={ui.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Tìm kiếm ví theo tên hoặc mô tả"
              placeholderTextColor={ui.muted}
              style={[styles.searchInput, { color: ui.text }]}
            />
            {!!q && (
              <Pressable
                onPress={() => {
                  hapticLight();
                  setQ("");
                }}
                hitSlop={10}
                style={{ padding: 4 }}
              >
                <Ionicons name="close-circle" size={18} color={ui.muted} />
              </Pressable>
            )}
          </View>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={(it) => String(it.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 12,
              paddingBottom: 18 + (Platform.OS === "ios" ? 10 : 18),
            }}
            renderItem={({ item }) => {
              const key = String(item.id);
              if (!itemAnims[key]) itemAnims[key] = new Animated.Value(1);

              return (
                <WalletCard
                  wallet={item}
                  anim={itemAnims[key]}
                  onOpenActions={() => openActions(item)}
                  palette={ui}
                  isDark={isDark}
                />
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: ui.muted }]}> 
                  Không có ví phù hợp.
                </Text>
                <View style={{ height: 12 }} />
                <Pressable
                  onPress={() => navigation.navigate("WalletForm", { mode: "create" })}
                  style={({ pressed }) => [
                    styles.emptyBtn,
                    { opacity: pressed ? 0.92 : 1 },
                  ]}
                >
                  <Text style={styles.emptyBtnText}>Thêm ví</Text>
                </Pressable>
              </View>
            }
          />
        </Animated.View>
      </View>

      {/* BottomSheet actions */}
      <ActionSheet
        visible={sheet.open}
        title={sheetWallet?.name ? sheetWallet.name : "Tùy chọn"}
        onClose={() => setSheet({ open: false })}
        ui={ui}
        actions={[
          {
            key: "edit",
            label: "Sửa ví",
            icon: "pencil",
            onPress: () => sheetWallet && goEdit(sheetWallet),
          },
          {
            key: "delete",
            label: "Xóa ví",
            icon: "trash",
            destructive: true,
            onPress: () => sheetWallet && askDelete(sheetWallet),
          },
        ]}
      />

      {/* Confirm delete */}
      <ConfirmModal
        visible={confirm.open}
        title="Xóa ví?"
        desc="Bạn chắc chắn muốn xóa ví này? Hành động không thể hoàn tác."
        onCancel={() => setConfirm({ open: false })}
        onConfirm={onDelete}
        loading={deleting}
        confirmText="Xóa ví"
        ui={ui}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC", // sẽ bị override bởi inline C.bg
  },

  page: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
  },

  center: { alignItems: "center", justifyContent: "center" },
  loadingText: {
    marginTop: 10,
    fontFamily: "Faustina_400Regular",
    color: "#334155",
  },

  topRow: { height: 46, justifyContent: "center" },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
  },

  titleRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontFamily: "Faustina_700Bold",
    fontSize: 20,
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  subTitle: {
    marginTop: 6,
    fontFamily: "Faustina_400Regular",
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },

  addBtnOld: {
    backgroundColor: "#34D399",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  addBtnOldText: {
    fontFamily: "Faustina_700Bold",
    color: "#063B2B",
    fontSize: 13.5,
  },

  totalCard: {
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
  },
  totalTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  totalIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "rgba(230,255,251,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  totalLabel: {
    fontFamily: "Faustina_600SemiBold",
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
  },
  totalValue: {
    marginTop: 10,
    fontFamily: "Faustina_700Bold",
    color: "#FFFFFF",
    fontSize: 28,
    letterSpacing: -0.3,
  },
  totalSub: {
    marginTop: 6,
    fontFamily: "Faustina_400Regular",
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
  },

  searchPill: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
  },
  searchInput: {
    flex: 1,
    fontFamily: "Faustina_400Regular",
    color: "#0F172A",
    fontSize: 13.5,
  },

  walletCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  walletRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  walletCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  walletCircleText: { fontSize: 18 },
  walletName: {
    fontFamily: "Faustina_700Bold",
    fontSize: 14.5,
    color: "#0F172A",
  },
  walletDesc: {
    marginTop: 2,
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
    color: "#64748B",
  },
  rightCol: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 120,
  },
  balanceValue: {
    fontFamily: "Faustina_700Bold",
    fontSize: 14.5,
  },
  menuBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(15,23,42,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyWrap: { paddingVertical: 28, alignItems: "center" },
  emptyText: { fontFamily: "Faustina_400Regular", color: "#94A3B8" },

  // Confirm modal
  modalOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.45)",
  },
  modal: {
    width: "86%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
  },
  modalTitle: {
    fontFamily: "Faustina_700Bold",
    fontSize: 14,
    color: "#0F172A",
  },
  modalDesc: {
    marginTop: 6,
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
    color: "#64748B",
    lineHeight: 18,
  },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 14 },
  modalBtn: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: { fontFamily: "Faustina_700Bold", color: "#0F172A" },
  modalBtnTextStrong: {
    fontFamily: "Faustina_700Bold",
    color: "#063B2B",
  },

  // BottomSheet
  sheetOverlay: { ...StyleSheet.absoluteFillObject },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.40)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -10 },
    elevation: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(148,163,184,0.55)",
    marginBottom: 10,
  },
  sheetTitle: {
    fontFamily: "Faustina_700Bold",
    color: "#0F172A",
    fontSize: 14,
    marginBottom: 8,
  },
  sheetItem: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(15,23,42,0.03)",
    marginBottom: 10,
  },
  sheetText: {
    fontFamily: "Faustina_600SemiBold",
    color: "#0F172A",
    fontSize: 13.5,
  },
  sheetCancel: {
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.18)",
  },
  sheetCancelText: {
    fontFamily: "Faustina_700Bold",
    color: "#0F172A",
    fontSize: 13.5,
  },
  emptyBtn: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: "#34D399",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBtnText: {
    fontFamily: "Faustina_700Bold",
    color: "#063B2B",
    fontSize: 13,
  },
});
