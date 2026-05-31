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
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  Easing,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import Toast from "react-native-toast-message";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";

import { useTheme } from "../theme/ThemeContext";
import { TOKEN_KEY } from "../services/api";
import { fetchMe, Me } from "../services/profile";
import {
  fetchMySettings,
  updateMySettings,
  Settings,
  AppLocale,
} from "../services/settings";

const QUOTE = "Chưa có tiểu sử cá nhân. Hãy cập nhật ngay!";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";

type Props = {
  navigation: any;
  onLogout?: () => void;
};

const pickName = (me?: Me | null) =>
  (me as any)?.user_name || (me as any)?.fullName || "BestFlace";
const pickEmail = (me?: Me | null) => (me as any)?.email || "";
const pickPhone = (me?: Me | null) =>
  (me as any)?.phone || (me as any)?.phoneNumber || "";
const pickBio = (me?: Me | null) => (me as any)?.bio || "";
const pickAvatar = (me?: any) => me?.avatar_url ?? me?.avatarUrl ?? "";

function softText(s: string) {
  return (s || "").trim();
}

function normalizeAvatarUri(uri?: string) {
  if (!uri) return "";
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  if (uri.startsWith("/")) return `${API_BASE_URL}${uri}`;
  return uri;
}

function Avatar({ uri, size = 64 }: { uri?: string; size?: number }) {
  const u = normalizeAvatarUri(uri);
  const [broken, setBroken] = React.useState(false);

  const valid = !!u && !broken;

  return (
    <View
      style={[
        styles.avatarWrap,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {valid ? (
        <Image
          source={{ uri: u }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={(e) => {
            console.log("Avatar load error:", u, e.nativeEvent);
            setBroken(true);
          }}
        />
      ) : (
        <View
          style={[
            styles.avatarFallback,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={styles.avatarFallbackText}>BF</Text>
        </View>
      )}
    </View>
  );
}

// ───────────────── ActionTile (tile nhỏ trong grid) ─────────────────
function ActionTile({
  icon,
  iconLib = "mci",
  label,
  onPress,
  danger = false,
  tone = "emerald",
}: {
  icon: string;
  iconLib?: "ion" | "mci";
  label: string;
  onPress: () => void;
  danger?: boolean;
  tone?: "emerald" | "indigo" | "amber" | "slate" | "rose";
}) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  // nền tile
  const baseBg = isDark ? "rgba(15,23,42,0.98)" : "#FFFFFF";
  const baseBorder = isDark ? "rgba(148,163,184,0.45)" : "rgba(15,23,42,0.06)";

  // màu bubble icon
  let toneBg: string;
  let toneFg: string;

  if (isDark) {
    // 🎨 dark mode: icon sáng, bubble hơi nhạt
    switch (tone) {
      case "indigo":
        toneBg = "rgba(129,140,248,0.24)";
        toneFg = "#E0E7FF";
        break;
      case "amber":
        toneBg = "rgba(251,191,36,0.22)";
        toneFg = "#FDE68A";
        break;
      case "slate":
        toneBg = "rgba(148,163,184,0.26)";
        toneFg = "#E5E7EB"; // ✨ fix: icon xám sáng
        break;
      case "rose":
        toneBg = "rgba(248,113,113,0.22)";
        toneFg = "#FCA5A5";
        break;
      default: // emerald
        toneBg = "rgba(52,211,153,0.24)";
        toneFg = "#A7F3D0";
        break;
    }
  } else {
    // light mode giữ nguyên như cũ
    toneBg =
      tone === "indigo"
        ? "rgba(79,70,229,0.12)"
        : tone === "amber"
          ? "rgba(217,119,6,0.14)"
          : tone === "slate"
            ? "rgba(15,23,42,0.08)"
            : tone === "rose"
              ? "rgba(244,63,94,0.14)"
              : "rgba(52,211,153,0.16)";

    toneFg =
      tone === "indigo"
        ? "#3730A3"
        : tone === "amber"
          ? "#92400E"
          : tone === "slate"
            ? "#0F172A"
            : tone === "rose"
              ? "#BE123C"
              : "#065F46";
  }

  const chevronColor = danger
    ? isDark
      ? "rgba(248,113,113,0.9)"
      : "rgba(185,28,28,0.6)"
    : isDark
      ? "rgba(148,163,184,0.9)"
      : "rgba(15,23,42,0.35)";

  const textColor = isDark ? "#E5E7EB" : "#0F172A";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: baseBg,
          borderColor: danger
            ? isDark
              ? "rgba(248,113,113,0.7)"
              : "rgba(239,68,68,0.22)"
            : baseBorder,
        },
        pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 },
      ]}
    >
      <View
        style={[
          styles.tileIcon,
          {
            backgroundColor: danger ? "rgba(239,68,68,0.14)" : toneBg,
          },
        ]}
      >
        {iconLib === "ion" ? (
          <Ionicons
            name={icon as any}
            size={18}
            color={danger ? "#FCA5A5" : toneFg}
          />
        ) : (
          <MaterialCommunityIcons
            name={icon as any}
            size={18}
            color={danger ? "#FCA5A5" : toneFg}
          />
        )}
      </View>

      <Text
        style={[
          styles.tileText,
          { color: textColor },
          danger && { color: "#F97373" },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>

      <Ionicons name="chevron-forward" size={16} color={chevronColor} />
    </Pressable>
  );
}

// ───────────────── Bottom Sheet (UI & language) ─────────────────
function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

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

  if (!visible) return null;

  const translateY = a.interpolate({
    inputRange: [0, 1],
    outputRange: [320, 0],
  });

  const sheetBg = isDark ? "#020617" : "#FFFFFF";
  const borderColor = isDark ? "rgba(148,163,184,0.4)" : "rgba(15,23,42,0.06)";
  const titleColor = isDark ? "#E5E7EB" : "#0F172A";
  const closeColor = isDark ? "#E5E7EB" : "#0F172A";

  return (
    <View style={styles.sheetOverlay}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY }],
            backgroundColor: sheetBg,
            borderColor,
          },
        ]}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: titleColor }]}>
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={closeColor} />
          </Pressable>
        </View>
        {children}
      </Animated.View>
    </View>
  );
}

// ───────────────── Main SettingsScreen ─────────────────
export default function SettingsScreen({ navigation, onLogout }: Props) {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  const { mode, setMode } = useTheme();
  const isDark = mode === "dark";

  const palette = useMemo(
    () => ({
      bg: isDark ? "#020617" : "#F8FAFC",
      card: isDark ? "rgba(15,23,42,0.96)" : "#FFFFFF",
      softCard: isDark ? "rgba(15,23,42,0.9)" : "#FFFFFF",
      text: isDark ? "#E5E7EB" : "#0F172A",
      muted: isDark ? "#94A3B8" : "#64748B",
      stroke: isDark ? "rgba(148,163,184,0.4)" : "rgba(15,23,42,0.06)",
      divider: isDark ? "rgba(30,41,59,1)" : "rgba(226,232,240,0.9)",
      footer: isDark ? "#64748B" : "#475569",
    }),
    [isDark],
  );

  const [langSheet, setLangSheet] = useState(false);
  const [uiSheet, setUiSheet] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(10)).current;
  const cardPop = useRef(new Animated.Value(0)).current;
  const tilesIn = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    fade.setValue(0);
    rise.setValue(10);
    cardPop.setValue(0);
    tilesIn.setValue(0);

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
      Animated.spring(cardPop, {
        toValue: 1,
        damping: 12,
        stiffness: 160,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(tilesIn, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise, cardPop, tilesIn]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [meRes, stRes] = await Promise.all([fetchMe(), fetchMySettings()]);
      setMe(meRes);
      setSettings(stRes);

      // Đồng bộ theme với settings backend
      if (stRes?.darkMode != null) {
        setMode(stRes.darkMode ? "dark" : "light");
      }
    } catch (e) {
      Toast.show({ type: "error", text1: "Không tải được cài đặt" });
    } finally {
      setLoading(false);
      animateIn();
    }
  }, [animateIn, setMode]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const userName = useMemo(() => pickName(me), [me]);
  const email = useMemo(() => pickEmail(me), [me]);
  const phone = useMemo(() => pickPhone(me), [me]);
  const bio = useMemo(() => pickBio(me), [me]);
  const avatarUrl = useMemo(() => pickAvatar(me), [me]);

  const locale = settings?.locale ?? "vi-VN";
  const darkMode = settings?.darkMode ?? false;
  const localeLabel = locale === "vi-VN" ? "Tiếng Việt" : "English";

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      // Nếu patch có darkMode thì update ThemeContext ngay
      if (typeof patch.darkMode === "boolean") {
        setMode(patch.darkMode ? "dark" : "light");
      }

      setSettings((prev) => ({
        ...(prev ?? {
          darkMode: false,
          locale: "vi-VN",
          timezone: "Asia/Ho_Chi_Minh",
        }),
        ...patch,
      }));

      try {
        const updated = await updateMySettings(patch);
        setSettings(updated);
      } catch (e) {
        Toast.show({ type: "error", text1: "Không lưu được cài đặt" });
        load();
      }
    },
    [load, setMode],
  );

  const go = useCallback(
    (routeName: string) => navigation.navigate(routeName),
    [navigation],
  );

  const doLogout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);

    onLogout?.();

    Toast.show({ type: "success", text1: "Đã đăng xuất" });
  }, [onLogout]);

  const confirmLogout = useCallback(() => {
    Alert.alert("Đăng xuất?", "Bạn có chắc chắn muốn đăng xuất khỏi BudgetF?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: () => {
          doLogout();
        },
      },
    ]);
  }, [doLogout]);

  const tilesTranslate = tilesIn.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" />
          <Text style={[styles.loadingText, { color: palette.muted }]}>
            Đang tải cài đặt...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
      <View style={[styles.page, { backgroundColor: palette.bg }]}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.title, { color: palette.text }]}>
                Cài đặt
              </Text>
              <Text style={[styles.subTitle, { color: palette.muted }]}>
                Quản lý tài khoản và tuỳ chỉnh ứng dụng
              </Text>
            </View>

            <Pressable
              onPress={() => go("UpdateProfile")}
              style={({ pressed }) => [
                styles.editBtn,
                pressed && {
                  transform: [{ scale: 0.985 }],
                  opacity: 0.92,
                },
              ]}
            >
              <Text style={styles.editBtnText}>Sửa thông tin</Text>
            </Pressable>
          </View>

          <Animated.View
            style={{ opacity: fade, transform: [{ translateY: rise }] }}
          >
            {/* Profile card */}
            <Animated.View
              style={{
                transform: [
                  {
                    scale: cardPop.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.98, 1],
                    }),
                  },
                ],
              }}
            >
              <View
                style={[
                  styles.profileCard,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.stroke,
                  },
                ]}
              >
                <LinearGradient
                  colors={["rgba(52,211,153,0.35)", "rgba(79,70,229,0.18)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.profileGlow}
                />

                <View style={styles.profileTop}>
                  <Avatar uri={avatarUrl} size={70} />

                  <View style={{ flex: 1, paddingLeft: 12, minWidth: 0 }}>
                    <Text
                      style={[styles.profileName, { color: palette.text }]}
                      numberOfLines={1}
                    >
                      {userName}
                    </Text>

                    <Text
                      style={[styles.profileLine, { color: palette.muted }]}
                      numberOfLines={1}
                    >
                      {email || " "}
                    </Text>

                    <Text
                      style={[styles.profileLine, { color: palette.muted }]}
                      numberOfLines={1}
                    >
                      {phone || " "}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => go("UpdateProfile")}
                    hitSlop={10}
                    style={({ pressed }) => [
                      styles.smallPill,
                      pressed && {
                        opacity: 0.9,
                        transform: [{ scale: 0.98 }],
                      },
                    ]}
                  >
                    <Ionicons name="create-outline" size={16} color="#0F172A" />
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.profileDivider,
                    { backgroundColor: palette.divider },
                  ]}
                />

                <Text style={[styles.quoteText, { color: palette.muted }]}>
                  {softText(bio) ? bio : QUOTE}
                </Text>
              </View>
            </Animated.View>

            <Text style={[styles.sectionHeader, { color: palette.text }]}>
              Cài đặt tài khoản
            </Text>

            {/* Tiles grid */}
            <Animated.View
              style={{
                opacity: tilesIn,
                transform: [{ translateY: tilesTranslate }],
              }}
            >
              <View style={styles.grid}>
                <ActionTile
                  icon="wallet-outline"
                  iconLib="ion"
                  label="Ngân sách tháng"
                  onPress={() => go("BudgetMonth")}
                  tone="emerald"
                />
                <ActionTile
                  icon="wallet"
                  iconLib="mci"
                  label="Quản lý ví"
                  onPress={() => go("WalletManager")}
                  tone="indigo"
                />

                <ActionTile
                  icon="color-palette-outline"
                  iconLib="ion"
                  label="Cài đặt giao diện"
                  onPress={() => setUiSheet(true)}
                  tone="amber"
                />
                <ActionTile
                  icon="translate"
                  iconLib="mci"
                  label="Cài đặt ngôn ngữ"
                  onPress={() => setLangSheet(true)}
                  tone="slate"
                />

                <ActionTile
                  icon="account-edit-outline"
                  iconLib="mci"
                  label="Thay đổi thông tin"
                  onPress={() => go("UpdateProfile")}
                  tone="emerald"
                />
                <ActionTile
                  icon="lock-reset"
                  iconLib="mci"
                  label="Thay đổi mật khẩu"
                  onPress={() => go("ChangePassword")}
                  tone="slate"
                />

                <ActionTile
                  icon="shield-lock-outline"
                  iconLib="mci"
                  label="Quyền riêng tư"
                  onPress={() => go("Privacy")}
                  tone="indigo"
                />
                <ActionTile
                  icon="logout"
                  iconLib="mci"
                  label="Đăng xuất"
                  onPress={confirmLogout}
                  danger
                  tone="rose"
                />
              </View>
            </Animated.View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: palette.footer }]}>
                BudgetF v1.0.0
              </Text>
              <Text style={[styles.footerText2, { color: palette.muted }]}>
                © 2026 BudgetF. Bảo lưu mọi quyền.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </View>

      {/* UI Sheet */}
      <Sheet
        visible={uiSheet}
        title="Cài đặt giao diện"
        onClose={() => setUiSheet(false)}
      >
        <View style={[styles.sheetRow, { borderBottomColor: palette.divider }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sheetRowTitle, { color: palette.text }]}>
              Dark Mode
            </Text>
            <Text style={[styles.sheetRowSub, { color: palette.muted }]}>
              Bật/tắt giao diện tối
            </Text>
          </View>
          <Switch
            value={mode === "dark"}
            onValueChange={(v) => {
              setMode(v ? "dark" : "light");
              saveSettings({ darkMode: v });
            }}
            trackColor={{
              false: "rgba(15,23,42,0.12)",
              true: "rgba(52,211,153,0.5)",
            }}
            thumbColor={
              Platform.OS === "android"
                ? mode === "dark"
                  ? "#34D399"
                  : "#fff"
                : undefined
            }
          />
        </View>
      </Sheet>

      {/* Language Sheet */}
      <Sheet
        visible={langSheet}
        title="Cài đặt ngôn ngữ"
        onClose={() => setLangSheet(false)}
      >
        <Pressable
          onPress={() => {
            saveSettings({ locale: "vi-VN" as AppLocale });
            setLangSheet(false);
          }}
          style={({ pressed }) => [
            styles.langItem,
            {
              backgroundColor: isDark ? palette.card : "#FFFFFF",
              borderColor: isDark ? palette.stroke : "rgba(226,232,240,0.95)",
            },
            locale === "vi-VN" && {
              backgroundColor: isDark
                ? "rgba(30,64,175,0.3)"
                : "rgba(241,245,249,1)",
            },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text
            style={[
              styles.langText,
              {
                color: isDark ? palette.text : "#334155",
              },
              locale === "vi-VN" && {
                fontFamily: "Faustina_700Bold",
              },
            ]}
          >
            Tiếng Việt
          </Text>
          {locale === "vi-VN" && (
            <Ionicons
              name="checkmark"
              size={20}
              color={isDark ? "#E5E7EB" : "#0F172A"}
            />
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            saveSettings({ locale: "en-US" as AppLocale });
            setLangSheet(false);
          }}
          style={({ pressed }) => [
            styles.langItem,
            {
              backgroundColor: isDark ? palette.card : "#FFFFFF",
              borderColor: isDark ? palette.stroke : "rgba(226,232,240,0.95)",
            },
            locale === "en-US" && {
              backgroundColor: isDark
                ? "rgba(30,64,175,0.3)"
                : "rgba(241,245,249,1)",
            },
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text
            style={[
              styles.langText,
              {
                color: isDark ? palette.text : "#334155",
              },
              locale === "en-US" && {
                fontFamily: "Faustina_700Bold",
              },
            ]}
          >
            English
          </Text>
          {locale === "en-US" && (
            <Ionicons
              name="checkmark"
              size={20}
              color={isDark ? "#E5E7EB" : "#0F172A"}
            />
          )}
        </Pressable>

        <View style={{ marginTop: 10 }}>
          <Text style={[styles.sheetMiniNote, { color: palette.muted }]}>
            Ngôn ngữ hiện tại:{" "}
            <Text style={{ fontFamily: "Faustina_600SemiBold" }}>
              {localeLabel}
            </Text>
          </Text>
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  page: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  container: { paddingBottom: 18 },

  center: { alignItems: "center", justifyContent: "center" },
  loadingText: {
    marginTop: 10,
    fontFamily: "Faustina_400Regular",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  title: {
    fontFamily: "Faustina_700Bold",
    fontSize: 22,
  },
  subTitle: {
    marginTop: 6,
    fontFamily: "Faustina_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },

  editBtn: {
    backgroundColor: "#34D399",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: Platform.OS === "android" ? 4 : 0,
  },
  editBtnText: {
    fontFamily: "Faustina_600SemiBold",
    color: "#063B2B",
    fontSize: 14,
  },

  profileCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  profileGlow: {
    position: "absolute",
    left: -60,
    right: -60,
    top: -80,
    height: 160,
    borderRadius: 999,
    opacity: 0.95,
  },
  profileTop: { flexDirection: "row", alignItems: "center" },

  avatarWrap: {
    borderWidth: 3,
    borderColor: "rgba(15,23,42,0.08)",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  avatarFallback: {
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontFamily: "Faustina_700Bold",
    color: "#0F172A",
  },

  smallPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  profileName: {
    fontFamily: "Faustina_700Bold",
    fontSize: 15,
  },
  profileLine: {
    marginTop: 3,
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
  },
  profileDivider: {
    marginTop: 12,
    height: 1,
  },
  quoteText: {
    marginTop: 10,
    fontFamily: "Faustina_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },

  sectionHeader: {
    marginTop: 14,
    fontFamily: "Faustina_700Bold",
    fontSize: 16,
  },

  grid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tile: {
    width: "48%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: {
    flex: 1,
    fontFamily: "Faustina_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
  },

  footer: {
    marginTop: 10,
    alignItems: "center",
    paddingVertical: 14,
  },
  footerText: {
    fontFamily: "Faustina_500Medium",
    fontSize: 12,
  },
  footerText2: {
    marginTop: 4,
    fontFamily: "Faustina_400Regular",
    fontSize: 11.5,
  },

  sheetOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,23,0.45)",
  },
  sheet: {
    padding: 14,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sheetTitle: {
    fontFamily: "Faustina_700Bold",
    fontSize: 15,
  },

  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sheetRowTitle: {
    fontFamily: "Faustina_600SemiBold",
    fontSize: 13,
  },
  sheetRowSub: {
    marginTop: 2,
    fontFamily: "Faustina_400Regular",
    fontSize: 12,
  },

  langItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  langText: {
    fontFamily: "Faustina_500Medium",
    fontSize: 13,
  },
  sheetMiniNote: {
    fontFamily: "Faustina_400Regular",
    fontSize: 12,
  },
});
