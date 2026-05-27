import React, { useEffect, useRef, useMemo } from "react";
import {
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

type Props = { navigation: any };

const GREEN = "#34D399";

type Palette = {
  bg: string;
  card: string;
  soft: string;
  text: string;
  muted: string;
  stroke: string;
};

function SmallCard({
  icon,
  title,
  desc,
  palette,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  palette: Palette;
}) {
  return (
    <View
      style={[
        styles.smallCard,
        { backgroundColor: palette.soft, borderColor: palette.stroke },
      ]}
    >
      <View style={styles.smallHeader}>
        {icon}
        <Text
          style={[
            styles.smallTitle,
            {
              color: palette.text,
            },
          ]}
        >
          {title}
        </Text>
      </View>
      <Text
        style={[
          styles.smallDesc,
          {
            color: palette.muted,
          },
        ]}
      >
        {desc}
      </Text>
    </View>
  );
}

export default function PrivacyPolicyScreen({ navigation }: Props) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  // 🎨 Palette copy đúng style CategoryScreen
  const palette: Palette = useMemo(() => {
    if (isDark) {
      return {
        bg: "#020617",
        card: "rgba(15,23,42,0.98)",
        soft: "rgba(15,23,42,0.9)",
        text: "rgba(248,250,252,0.96)",
        muted: "rgba(148,163,184,0.95)",
        stroke: "rgba(51,65,85,1)",
      };
    }
    return {
      bg: "#F5F6FA",
      card: "#FFFFFF",
      soft: "rgba(15,23,42,0.03)",
      text: "#0F172A",
      muted: "#64748B",
      stroke: "rgba(15,23,42,0.06)",
    };
  }, [isDark]);

  const shadow = isDark ? {} : styles.shadow;

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    fade.setValue(0);
    rise.setValue(10);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Top row */}
          <View style={styles.topRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [
                styles.backBtn,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.stroke,
                  opacity: pressed ? 0.9 : 1,
                },
                shadow,
              ]}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={20} color={palette.text} />
            </Pressable>
            <View style={{ flex: 1 }} />
          </View>

          <Text style={[styles.h1, { color: palette.text }]}>
            Chính sách Quyền riêng tư
          </Text>
          <Text style={[styles.h2, { color: palette.muted }]}>
            Cách chúng tôi bảo vệ và xử lý dữ liệu của bạn
          </Text>

          <Animated.View
            style={{ opacity: fade, transform: [{ translateY: rise }] }}
          >
            {/* Intro card */}
            <View
              style={[
                styles.card,
                { backgroundColor: palette.card, borderColor: palette.stroke },
                shadow,
              ]}
            >
              <View style={styles.row}>
                <View
                  style={[
                    styles.bell,
                    {
                      backgroundColor: "rgba(52,211,153,0.25)",
                    },
                  ]}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={18}
                    color={palette.text}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.cardTitle,
                      {
                        color: palette.text,
                      },
                    ]}
                  >
                    BudgetF giữ an toàn quan trọng !
                  </Text>
                  <Text
                    style={[
                      styles.cardDesc,
                      {
                        color: palette.muted,
                      },
                    ]}
                  >
                    Tại BudgetF, chúng tôi cam kết bảo vệ quyền riêng tư và bảo
                    đảm an toàn cho thông tin cá nhân của bạn. Chính sách này
                    giải thích cách chúng tôi thu thập, sử dụng và bảo vệ dữ
                    liệu khi bạn sử dụng ứng dụng.
                  </Text>
                  <Text
                    style={[
                      styles.cardFoot,
                      {
                        color: palette.muted,
                      },
                    ]}
                  >
                    Cập nhật lần cuối: 25 tháng 12, 2025
                  </Text>
                </View>
              </View>
            </View>

            {/* Rights card */}
            <View
              style={[
                styles.card,
                {
                  marginTop: 12,
                  backgroundColor: palette.card,
                  borderColor: palette.stroke,
                },
                shadow,
              ]}
            >
              <View style={styles.rightsHeader}>
                <View
                  style={[
                    styles.eye,
                    {
                      backgroundColor: palette.soft,
                    },
                  ]}
                >
                  <Ionicons name="eye-outline" size={18} color={palette.text} />
                </View>
                <Text
                  style={[
                    styles.rightsTitle,
                    {
                      color: palette.text,
                    },
                  ]}
                >
                  Quyền của bạn
                </Text>
              </View>

              <View style={styles.grid}>
                <SmallCard
                  icon={
                    <Ionicons
                      name="swap-horizontal"
                      size={18}
                      color={palette.text}
                    />
                  }
                  title="Truy cập & di chuyển dữ liệu"
                  desc="Yêu cầu sao lưu, truy xuất hoặc chuyển dữ liệu sang dịch vụ khác."
                  palette={palette}
                />
                <SmallCard
                  icon={
                    <Ionicons
                      name="create-outline"
                      size={18}
                      color={palette.text}
                    />
                  }
                  title="Chỉnh sửa"
                  desc="Cập nhật hoặc sửa các thông tin cá nhân không chính xác."
                  palette={palette}
                />
                <SmallCard
                  icon={
                    <Ionicons
                      name="close-circle-outline"
                      size={18}
                      color={palette.text}
                    />
                  }
                  title="Từ chối nhận thông tin tiếp thị"
                  desc="Hủy đăng ký nhận thông tin tiếp thị bất cứ lúc nào."
                  palette={palette}
                />
                <SmallCard
                  icon={
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  }
                  title="Xóa"
                  desc="Yêu cầu xóa tài khoản và dữ liệu cá nhân của bạn."
                  palette={palette}
                />
              </View>
            </View>

            {/* Contact card */}
            <View
              style={[
                styles.card,
                {
                  marginTop: 12,
                  backgroundColor: palette.card,
                  borderColor: palette.stroke,
                },
                shadow,
              ]}
            >
              <Text
                style={[
                  styles.qaTitle,
                  {
                    color: palette.text,
                  },
                ]}
              >
                Câu hỏi về quyền riêng tư?
              </Text>
              <Text
                style={[
                  styles.qaDesc,
                  {
                    color: palette.muted,
                  },
                ]}
              >
                Nếu bạn có câu hỏi về chính sách này hoặc cách chúng tôi xử lý
                dữ liệu, vui lòng liên hệ:
              </Text>

              <View style={{ marginTop: 10 }}>
                <Text
                  style={[
                    styles.qaLine,
                    {
                      color: palette.muted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.qaBold,
                      {
                        color: palette.text,
                      },
                    ]}
                  >
                    Email:
                  </Text>{" "}
                  23251774@gm.uit.edu.vn
                </Text>
                <Text
                  style={[
                    styles.qaLine,
                    {
                      color: palette.muted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.qaBold,
                      {
                        color: palette.text,
                      },
                    ]}
                  >
                    Địa chỉ:
                  </Text>{" "}
                  Ký túc xá khu B, Đông Hòa, Thành phố Hồ Chí Minh
                </Text>
                <Text
                  style={[
                    styles.qaLine,
                    {
                      color: palette.muted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.qaBold,
                      {
                        color: palette.text,
                      },
                    ]}
                  >
                    Điện thoại:
                  </Text>{" "}
                  +84 987654321
                </Text>
              </View>
            </View>

            {/* Back button */}
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [
                styles.bigBtn,
                {
                  backgroundColor: GREEN,
                  opacity: pressed ? 0.9 : 1,
                },
                shadow,
              ]}
            >
              <Text style={styles.bigBtnText}>Quay lại cài đặt</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>
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
    paddingTop: 6,
  },

  container: { paddingTop: 4, paddingBottom: 18 },

  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  topRow: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  h1: {
    marginTop: 6,
    fontFamily: "Faustina_700Bold",
    fontSize: 16,
  },
  h2: {
    marginTop: 4,
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
  },

  card: {
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },

  row: { flexDirection: "row", gap: 12 },
  bell: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  cardTitle: { fontFamily: "Faustina_700Bold", fontSize: 13 },
  cardDesc: {
    marginTop: 6,
    fontFamily: "Faustina_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  cardFoot: {
    marginTop: 10,
    fontFamily: "Faustina_600SemiBold",
    fontSize: 11.5,
  },

  rightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  eye: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  rightsTitle: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  smallCard: {
    width: "48%",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  smallHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  smallTitle: {
    flex: 1,
    fontFamily: "Faustina_700Bold",
    fontSize: 12,
  },
  smallDesc: {
    marginTop: 6,
    fontFamily: "Faustina_400Regular",
    fontSize: 11.5,
    lineHeight: 17,
  },

  qaTitle: { fontFamily: "Faustina_700Bold", fontSize: 13 },
  qaDesc: {
    marginTop: 6,
    fontFamily: "Faustina_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  qaLine: {
    marginTop: 6,
    fontFamily: "Faustina_400Regular",
    fontSize: 12,
  },
  qaBold: { fontFamily: "Faustina_700Bold" },

  bigBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  bigBtnText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13.5,
    color: "#063B2B",
  },
});
