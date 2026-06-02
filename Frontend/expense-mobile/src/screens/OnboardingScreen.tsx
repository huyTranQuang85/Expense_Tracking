import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { STORAGE_KEYS } from "../constants/storage";
import { setItem } from "../services/storage";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CARD_H_RATIO = 0.38;

type RootStackParamList = { Onboarding: undefined; Auth: undefined };
type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

type Slide = {
  key: string;
  logoOnly?: boolean;
  title: string;
  desc: string;
  image: any;
  cardColor: string;
  accent: string;
};

export default function OnboardingScreen({ navigation }: Props) {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = scheme === "dark";

  const slides: Slide[] = useMemo(
    () => [
      {
        key: "1",
        logoOnly: true,
        title: "Chào mừng bạn đã đến với BudgetF",
        desc: "Giải pháp quản lý thu chi giúp bạn kiểm soát và đạt được mục tiêu tài chính toàn diện.",
        image: require("../../img/BudgetF.png"),
        cardColor: "#2E79E6",
        accent: "#4CC2B1",
      },
      {
        key: "2",
        title: "Quản lý thu chi thông minh",
        desc: "Lưu lại mọi giao dịch, danh mục theo loại danh mục và ví. Dễ dàng theo dõi và kiểm soát chi tiêu.",
        image: require("../../img/economics.png"),
        cardColor: "#C77BEA",
        accent: "#0A7F6B",
      },
      {
        key: "3",
        title: "Dữ liệu trực quan, sinh động",
        desc: "Hiển thị thống kê theo tháng/năm bằng biểu đồ trực quan và hỗ trợ xuất file Excel để lưu trữ.",
        image: require("../../img/line-chart.png"),
        cardColor: "#2CB56F",
        accent: "#0A7F6B",
      },
      {
        key: "4",
        title: "Cảnh báo vượt hạn mức",
        desc: "Thiết lập hạn mức ngân sách theo tháng và nhận email cảnh báo ngay khi chi tiêu vượt ngưỡng.",
        image: require("../../img/notify.png"),
        cardColor: "#F39A3C",
        accent: "#0A7F6B",
      },
    ],
    []
  );

  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef<Animated.FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const bg = isDark ? "#0B0F14" : "#F4F6FA";
  const cardHeight = SCREEN_H * CARD_H_RATIO;
  const activeAccent = slides[index]?.accent ?? "#4CC2B1";
  const defaultImage = slides[0]?.image;

  const goTo = (i: number) => {
    listRef.current?.scrollToOffset({ offset: i * SCREEN_W, animated: true });
    setIndex(i);
  };

  const onNext = async () => {
    if (index < slides.length - 1) {
      return goTo(index + 1);
    }

    // Đã ở slide cuối cùng → đánh dấu đã onboarding
    await setItem(STORAGE_KEYS.onboardingDone, "1");

    // Chuyển sang Auth
    navigation.replace("Auth");
  };

  const onPrev = () => {
    if (index <= 0) return;
    goTo(index - 1);
  };

  const onSkip = () => goTo(slides.length - 1);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bg, paddingTop: insets.top },
      ]}
    >
      <Animated.FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
          setIndex(i);
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: false,
          }
        )}
        scrollEventThrottle={16}
        renderItem={({ item, index: itemIndex }) => {
          const g1 = isDark
            ? darken(item.cardColor, 0.3)
            : darken(item.cardColor, 0.04);
          const g2 = isDark
            ? darken(item.cardColor, 0.12)
            : lighten(item.cardColor, 0.12);
          const glow = withAlpha(item.accent, isDark ? 0.18 : 0.12);

          const inputRange = [
            (itemIndex - 1) * SCREEN_W,
            itemIndex * SCREEN_W,
            (itemIndex + 1) * SCREEN_W,
          ];

          // Parallax / Zoom cho ảnh
          const imgTranslateY = scrollX.interpolate({
            inputRange,
            outputRange: [14, 0, 14],
            extrapolate: "clamp",
          });
          const imgScale = scrollX.interpolate({
            inputRange,
            outputRange: [0.96, 1, 0.96],
            extrapolate: "clamp",
          });

          // Animation text
          const textOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.35, 1, 0.35],
            extrapolate: "clamp",
          });
          const textTranslateY = scrollX.interpolate({
            inputRange,
            outputRange: [10, 0, 10],
            extrapolate: "clamp",
          });

          return (
            <View style={{ width: SCREEN_W, height: SCREEN_H }}>
              {/* HERO */}
              <View style={[styles.hero, { paddingBottom: cardHeight }]}>
                <View style={styles.illusArea}>
                  <View
                    style={[
                      styles.illusGlow,
                      { backgroundColor: glow, shadowColor: item.accent },
                    ]}
                  />

                  <Animated.View
                    style={[
                      item.logoOnly ? styles.logoImage : styles.illusImage,
                      {
                        transform: [
                          { translateY: imgTranslateY },
                          { scale: imgScale },
                        ],
                      },
                    ]}
                  >
                    <Image
                      source={item.image ?? defaultImage}
                      resizeMode="contain"
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                </View>

                {/* Dots (đặt sát mép card, không che ảnh) */}
                <View style={[styles.dotsWrapAbs, { bottom: cardHeight + 10 }]}>
                  {slides.map((_, i) => {
                    const r = [
                      (i - 1) * SCREEN_W,
                      i * SCREEN_W,
                      (i + 1) * SCREEN_W,
                    ];

                    const w = scrollX.interpolate({
                      inputRange: r,
                      outputRange: [7, 16, 7],
                      extrapolate: "clamp",
                    });
                    const s = scrollX.interpolate({
                      inputRange: r,
                      outputRange: [0.9, 1.25, 0.9],
                      extrapolate: "clamp",
                    });
                    const o = scrollX.interpolate({
                      inputRange: r,
                      outputRange: [0.25, 1, 0.25],
                      extrapolate: "clamp",
                    });

                    return (
                      <Animated.View
                        key={`dot-${i}`}
                        style={[
                          styles.dot,
                          {
                            width: w,
                            opacity: o,
                            backgroundColor: activeAccent,
                            transform: [{ scale: s }],
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>

              {/* CARD bottom sheet */}
              <View
                style={[
                  styles.cardShell,
                  {
                    height: cardHeight,
                    paddingBottom: Math.max(insets.bottom, 12) + 10,
                  },
                ]}
              >
                <LinearGradient
                  colors={[g1, g2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.card,
                    { borderColor: withAlpha("#FFFFFF", isDark ? 0.1 : 0.18) },
                  ]}
                >
                  <View
                    style={[
                      styles.accentLine,
                      { backgroundColor: withAlpha(item.accent, 0.65) },
                    ]}
                  />

                  <Animated.View
                    style={{
                      opacity: textOpacity,
                      transform: [{ translateY: textTranslateY }],
                    }}
                  >
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardDesc}>{item.desc}</Text>
                  </Animated.View>

                  <View style={{ flex: 1 }} />

                  <View style={styles.actions}>
                    <Pressable
                      onPress={onPrev}
                      disabled={index === 0}
                      style={({ pressed }) => [
                        styles.btn,
                        styles.btnGhost,
                        {
                          opacity: index === 0 ? 0.45 : pressed ? 0.92 : 1,
                          backgroundColor: withAlpha(
                            "#FFFFFF",
                            isDark ? 0.12 : 0.18
                          ),
                        },
                      ]}
                    >
                      <Text style={styles.btnText}>Trang trước</Text>
                    </Pressable>

                    <Pressable
                      onPress={onNext}
                      style={({ pressed }) => [
                        styles.btn,
                        styles.btnPrimary,
                        {
                          opacity: pressed ? 0.92 : 1,
                          backgroundColor: withAlpha("#000000", 0.18),
                        },
                      ]}
                    >
                      <Text style={styles.btnText}>
                        {index === slides.length - 1 ? "Bắt đầu" : "Tiếp theo"}
                      </Text>
                    </Pressable>
                  </View>

                  {index !== slides.length - 1 && (
                    <Pressable
                      onPress={onSkip}
                      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                    >
                      <Text style={styles.skip}>Bỏ qua</Text>
                    </Pressable>
                  )}
                </LinearGradient>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

/** Color helpers */
function withAlpha(hexOrRgb: string, alpha: number) {
  if (hexOrRgb.startsWith("rgb")) return hexOrRgb;
  const clean = hexOrRgb.replace("#", "");
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
function darken(hex: string, amount: number) {
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgb(${clamp(r * (1 - amount))}, ${clamp(g * (1 - amount))}, ${clamp(
    b * (1 - amount)
  )})`;
}
function lighten(hex: string, amount: number) {
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgb(${clamp(r + (255 - r) * amount)}, ${clamp(
    g + (255 - g) * amount
  )}, ${clamp(b + (255 - b) * amount)})`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },

  illusArea: { width: "100%", alignItems: "center", justifyContent: "center" },

  illusGlow: {
    position: "absolute",
    width: SCREEN_W * 0.56,
    height: SCREEN_W * 0.56,
    borderRadius: 999,
    shadowOpacity: 0.24,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },

  logoImage: { width: 210, height: 210 },
  illusImage: { width: SCREEN_W * 0.7, height: SCREEN_W * 0.7 },

  dotsWrapAbs: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  dot: { height: 8, borderRadius: 999 },

  cardShell: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  card: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
    borderWidth: 1,
    overflow: "hidden",
  },

  accentLine: { width: 56, height: 4, borderRadius: 999, marginBottom: 12 },

  cardTitle: {
    color: "white",
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Faustina_700Bold",
    marginBottom: 8,
  },
  cardDesc: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 14.2,
    lineHeight: 20,
    fontFamily: "Faustina_400Regular",
  },

  actions: { flexDirection: "row", gap: 12, marginTop: 16, marginBottom: 10 },
  btn: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {},
  btnPrimary: {},
  btnText: {
    color: "white",
    fontFamily: "Faustina_600SemiBold",
    fontSize: 13.6,
  },

  skip: {
    textAlign: "center",
    color: "rgba(255,255,255,0.92)",
    fontFamily: "Faustina_500Medium",
    fontSize: 12.6,
    marginTop: 2,
  },
});
