import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import {
  Animated,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Easing,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { LinearGradient } from "expo-linear-gradient";
import { updateWallet, Wallet } from "../../services/wallets";
import { useTheme } from "../../theme/ThemeContext";

const ICONS: Array<{ key: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "cash", icon: "cash-outline" },
  { key: "card", icon: "card-outline" },
  { key: "bank", icon: "business-outline" },
  { key: "coins", icon: "server-outline" },
  { key: "wallet", icon: "wallet-outline" },
  { key: "bag", icon: "bag-handle-outline" },
  { key: "gift", icon: "gift-outline" },
  { key: "home", icon: "home-outline" },
  { key: "car", icon: "car-outline" },
  { key: "food", icon: "fast-food-outline" },
  { key: "receipt", icon: "receipt-outline" },
  { key: "box", icon: "cube-outline" },
];

function normalizeWalletIcon(raw?: string | null) {
  const map: Record<string, string> = {
    "💰": "cash",
    "💳": "card",
    "🏦": "bank",
    "🪙": "coins",
    "🐷": "wallet",
    "👜": "bag",
    "🎁": "gift",
    "🏠": "home",
    "🚗": "car",
    "🍔": "food",
    "🧾": "receipt",
    "📦": "box",
  };
  const value = String(raw ?? "").trim();
  return ICONS.some((x) => x.key === value) ? value : map[value] ?? ICONS[0].key;
}

type ColorSwatch =
  | { key: string; type: "solid"; primary: string }
  | {
      key: string;
      type: "gradient";
      primary: string;
      colors: [string, string];
    };

const SWATCHES: ColorSwatch[] = [
  { key: "red", type: "solid", primary: "#EF4444" },
  { key: "teal", type: "solid", primary: "#0F766E" },
  { key: "indigo", type: "solid", primary: "#4F46E5" },
  { key: "violet", type: "solid", primary: "#5B21B6" },
  { key: "amber", type: "solid", primary: "#D97706" },
  { key: "pink", type: "solid", primary: "#E879F9" },
  { key: "brown", type: "solid", primary: "#9B5C5C" },
  { key: "blue", type: "solid", primary: "#1D4ED8" },
  { key: "mint", type: "solid", primary: "#2DD4BF" },
  { key: "sand", type: "solid", primary: "#E5D3B3" },
  { key: "yellow", type: "solid", primary: "#EAB308" },
  { key: "olive", type: "solid", primary: "#7C8A2A" },
  {
    key: "g_teal",
    type: "gradient",
    primary: "#0F766E",
    colors: ["#0F766E", "#2DD4BF"],
  },
  {
    key: "g_indigo",
    type: "gradient",
    primary: "#4F46E5",
    colors: ["#4F46E5", "#A78BFA"],
  },
  {
    key: "g_sunset",
    type: "gradient",
    primary: "#EF4444",
    colors: ["#EF4444", "#F59E0B"],
  },
  {
    key: "g_sky",
    type: "gradient",
    primary: "#1D4ED8",
    colors: ["#1D4ED8", "#60A5FA"],
  },
];

type Props = { navigation: any; route: any };
const VND = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}₫`;

type UI = {
  bg: string;
  card: string;
  text: string;
  muted: string;
  inputBg: string;
  stroke: string;
  pickerBg: string;
  pickerStroke: string;
  iconCellBg: string;
  iconCellBorder: string;
  iconCellActiveBg: string;
  iconCellActiveBorder: string;
  swatchBg: string;
  ghostBtnBg: string;
  readonlyBg: string;
  readonlyLockBg: string;
  backBtnBg: string;
  backBtnBorder: string;
};

export default function EditWalletScreen({ navigation, route }: Props) {
  const wallet: Wallet | undefined = route?.params?.wallet;

  const { mode } = useTheme();
  const isDark = mode === "dark";

  const ui: UI = useMemo(() => {
    const bg = isDark ? "#020617" : "#F8FAFC";
    const card = isDark ? "rgba(15,23,42,0.98)" : "#FFFFFF";
    const text = isDark ? "rgba(248,250,252,0.96)" : "#0F172A";
    const muted = isDark ? "rgba(148,163,184,0.96)" : "#64748B";
    const inputBg = isDark ? "rgba(15,23,42,0.90)" : "rgba(148,163,184,0.16)";
    const stroke = isDark ? "rgba(51,65,85,1)" : "rgba(15,23,42,0.06)";
    const pickerBg = isDark ? "rgba(15,23,42,0.96)" : "#F8FAFC";
    const pickerStroke = isDark
      ? "rgba(30,64,175,0.55)"
      : "rgba(226,232,240,0.95)";
    const iconCellBg = isDark ? "rgba(15,23,42,0.98)" : "#FFFFFF";
    const iconCellBorder = isDark ? "rgba(51,65,85,1)" : "rgba(226,232,240,1)";
    const iconCellActiveBg = isDark
      ? "rgba(30,64,175,0.38)"
      : "rgba(241,245,249,1)";
    const iconCellActiveBorder = isDark
      ? "rgba(129,140,248,1)"
      : "rgba(203,213,225,1)";
    const swatchBg = isDark ? "rgba(15,23,42,0.98)" : "#FFFFFF";
    const ghostBtnBg = isDark
      ? "rgba(15,23,42,0.85)"
      : "rgba(148,163,184,0.18)";
    const readonlyBg = isDark
      ? "rgba(15,23,42,0.92)"
      : "rgba(255,255,255,0.75)";
    const readonlyLockBg = isDark
      ? "rgba(15,23,42,0.85)"
      : "rgba(15,23,42,0.05)";
    const backBtnBg = card;
    const backBtnBorder = stroke;
    return {
      bg,
      card,
      text,
      muted,
      inputBg,
      stroke,
      pickerBg,
      pickerStroke,
      iconCellBg,
      iconCellBorder,
      iconCellActiveBg,
      iconCellActiveBorder,
      swatchBg,
      ghostBtnBg,
      readonlyBg,
      readonlyLockBg,
      backBtnBg,
      backBtnBorder,
    };
  }, [isDark]);

  const [name, setName] = useState(wallet?.name ?? "");
  const [description, setDescription] = useState(wallet?.description ?? "");
  const [icon, setIcon] = useState<string>(normalizeWalletIcon(wallet?.icon));

  const initialSwatchKey = useMemo(() => {
    const base = wallet?.color ?? "#0F766E";
    const found = SWATCHES.find((s) => s.primary === base);
    return found?.key ?? "teal";
  }, [wallet?.color]);

  const [selectedSwatchKey, setSelectedSwatchKey] =
    useState<string>(initialSwatchKey);

  const [color, setColor] = useState<string>(wallet?.color ?? "#0F766E");

  useEffect(() => {
    setSelectedSwatchKey(initialSwatchKey);
    setColor(wallet?.color ?? "#0F766E");
    setIcon(normalizeWalletIcon(wallet?.icon));
    setName(wallet?.name ?? "");
    setDescription(wallet?.description ?? "");
  }, [
    wallet?.id,
    wallet?.color,
    wallet?.icon,
    wallet?.name,
    wallet?.description,
    initialSwatchKey,
  ]);

  const [saving, setSaving] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    fade.setValue(0);
    rise.setValue(10);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise]);

  const onSubmit = useCallback(async () => {
    if (!wallet) return;
    if (!name.trim()) {
      Toast.show({ type: "error", text1: "Vui lòng nhập tên ví" });
      return;
    }

    try {
      setSaving(true);
      await updateWallet(wallet.id, {
        name: name.trim(),
        description: description?.trim() || null,
        icon,
        color,
      });
      Toast.show({ type: "success", text1: "Cập nhật ví thành công" });
      navigation.goBack();
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: e?.response?.data?.message ?? "Không cập nhật được ví",
      });
    } finally {
      setSaving(false);
    }
  }, [wallet, name, description, icon, color, navigation]);

  if (!wallet) {
    return (
      <SafeAreaView
        style={[
          styles.safe,
          {
            backgroundColor: ui.bg,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <Text style={{ color: ui.text, fontFamily: "Faustina_500Medium" }}>
          Không tìm thấy ví
        </Text>
      </SafeAreaView>
    );
  }

  const renderIcon = ({ item }: { item: (typeof ICONS)[number] }) => {
    const active = item.key === icon;
    return (
      <Pressable
        onPress={() => setIcon(item.key)}
        style={({ pressed }) => [
          styles.iconCell,
          {
            backgroundColor: ui.iconCellBg,
            borderColor: ui.iconCellBorder,
            opacity: pressed ? 0.9 : 1,
          },
          active && {
            backgroundColor: ui.iconCellActiveBg,
            borderColor: ui.iconCellActiveBorder,
          },
        ]}
      >
        <Ionicons
          name={item.icon}
          size={20}
          color={active ? "#10B981" : ui.muted}
        />
      </Pressable>
    );
  };

  const renderSwatch = ({ item }: { item: ColorSwatch }) => {
    const active = item.key === selectedSwatchKey;

    const content =
      item.type === "solid" ? (
        <View style={[styles.colorCell, { backgroundColor: item.primary }]} />
      ) : (
        <LinearGradient
          colors={item.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.colorCell}
        />
      );

    return (
      <Pressable
        onPress={() => {
          setSelectedSwatchKey(item.key);
          setColor(item.primary);
        }}
        style={({ pressed }) => [
          styles.swatchWrap,
          {
            backgroundColor: ui.swatchBg,
            borderColor: ui.iconCellBorder,
            opacity: pressed ? 0.9 : 1,
          },
          active && {
            borderColor: ui.iconCellActiveBorder,
            borderWidth: 2,
            padding: 3,
          },
        ]}
      >
        {content}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: ui.bg }]}>
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [
                styles.backBtn,
                {
                  backgroundColor: ui.backBtnBg,
                  borderColor: ui.backBtnBorder,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={22} color={ui.text} />
            </Pressable>
          </View>

          <Text style={[styles.h1, { color: ui.text }]}>Sửa ví</Text>
          <Text style={[styles.h2, { color: ui.muted }]}>
            Cập nhật thông tin ví của bạn
          </Text>

          <Animated.View
            style={{ opacity: fade, transform: [{ translateY: rise }] }}
          >
            {/* Số dư readonly */}
            <View
              style={[
                styles.readonlyBox,
                {
                  backgroundColor: ui.readonlyBg,
                  borderColor: ui.stroke,
                  borderTopColor: color,
                  borderLeftColor: color,
                },
              ]}
            >
              <LinearGradient
                colors={[color, "#10B981"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.readonlyCircle}
              >
                <Ionicons
                  name={ICONS.find((x) => x.key === icon)?.icon ?? "wallet-outline"}
                  size={22}
                  color="#FFFFFF"
                />
              </LinearGradient>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.readonlyLabel, { color: ui.muted }]}>
                  Số dư
                </Text>
                <Text
                  style={[styles.readonlyValue, { color }]}
                  numberOfLines={1}
                >
                  {VND(Number(wallet.balance) || 0)}
                </Text>
              </View>

              <View
                style={[
                  styles.lockBadge,
                  { backgroundColor: ui.readonlyLockBg },
                ]}
              >
                <Ionicons name="lock-closed" size={14} color={ui.muted} />
              </View>
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: ui.card, borderColor: ui.stroke },
              ]}
            >
              <Text style={[styles.label, { color: ui.text }]}>Tên ví</Text>
              <View
                style={[
                  styles.inputWrap,
                  { backgroundColor: ui.inputBg, borderColor: ui.stroke },
                ]}
              >
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Tên ví"
                  placeholderTextColor={ui.muted}
                  style={[styles.input, { color: ui.text }]}
                />
              </View>

              <Text style={[styles.label, { marginTop: 12, color: ui.text }]}>
                Mô tả
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  { backgroundColor: ui.inputBg, borderColor: ui.stroke },
                ]}
              >
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Mô tả ví (tùy chọn)"
                  placeholderTextColor={ui.muted}
                  style={[styles.input, { color: ui.text }]}
                />
              </View>

              <Text style={[styles.label, { marginTop: 14, color: ui.text }]}>
                Icon
              </Text>
              <View
                style={[
                  styles.pickerCard,
                  {
                    backgroundColor: ui.pickerBg,
                    borderColor: ui.pickerStroke,
                  },
                ]}
              >
                <FlatList
                  data={ICONS}
                  keyExtractor={(it) => it.key}
                  renderItem={renderIcon}
                  numColumns={6}
                  scrollEnabled={false}
                  columnWrapperStyle={styles.gridRow}
                />
              </View>

              <Text style={[styles.label, { marginTop: 14, color: ui.text }]}>
                Màu sắc
              </Text>
              <View
                style={[
                  styles.pickerCard,
                  {
                    backgroundColor: ui.pickerBg,
                    borderColor: ui.pickerStroke,
                  },
                ]}
              >
                <FlatList
                  data={SWATCHES}
                  keyExtractor={(it) => it.key}
                  renderItem={renderSwatch}
                  numColumns={6}
                  scrollEnabled={false}
                  columnWrapperStyle={styles.gridRow}
                />
              </View>

              <View style={styles.btnRow}>
                <Pressable
                  onPress={() => navigation.goBack()}
                  style={({ pressed }) => [
                    styles.btnGhost,
                    {
                      backgroundColor: ui.ghostBtnBg,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.btnGhostText, { color: ui.text }]}>
                    Hủy
                  </Text>
                </Pressable>

                <Pressable
                  disabled={saving}
                  onPress={onSubmit}
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    { opacity: saving ? 0.6 : pressed ? 0.92 : 1 },
                  ]}
                >
                  <Text style={styles.btnPrimaryText}>Lưu thay đổi</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  page: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  container: { paddingBottom: 18 },

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

  h1: {
    marginTop: 6,
    fontFamily: "Faustina_700Bold",
    fontSize: 20,
    color: "#0F172A",
  },
  h2: {
    marginTop: 6,
    fontFamily: "Faustina_400Regular",
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },

  readonlyBox: {
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
    borderTopWidth: 0,
    borderLeftWidth: 0,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    opacity: 0.8,
  },
  readonlyCircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  readonlyLabel: {
    fontFamily: "Faustina_600SemiBold",
    color: "#64748B",
    fontSize: 12.5,
  },
  readonlyValue: {
    marginTop: 2,
    fontFamily: "Faustina_700Bold",
    fontSize: 16,
  },

  lockBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(15,23,42,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
  },

  label: {
    fontFamily: "Faustina_600SemiBold",
    fontSize: 12.5,
    color: "#0F172A",
  },

  inputWrap: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: "rgba(148,163,184,0.16)",
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.06)",
  },
  input: { fontFamily: "Faustina_500Medium", fontSize: 13, color: "#0F172A" },

  pickerCard: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.95)",
    padding: 10,
  },
  gridRow: { justifyContent: "space-between", marginBottom: 10 },

  iconCell: {
    flex: 1,
    height: 44,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,1)",
  },
  iconCellActive: {
    backgroundColor: "rgba(241,245,249,1)",
    borderColor: "rgba(203,213,225,1)",
  },

  swatchWrap: {
    flex: 1,
    height: 44,
    marginHorizontal: 4,
    borderRadius: 16,
    padding: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,1)",
  },
  swatchWrapActive: {
    borderColor: "rgba(15,23,42,0.9)",
    borderWidth: 2,
    padding: 3,
  },
  colorCell: { flex: 1, borderRadius: 10 },

  btnRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  btnGhost: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "rgba(148,163,184,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhostText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13.5,
    color: "#0F172A",
  },

  btnPrimary: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: Platform.OS === "android" ? 4 : 0,
  },
  btnPrimaryText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13.5,
    color: "#063B2B",
  },
});
