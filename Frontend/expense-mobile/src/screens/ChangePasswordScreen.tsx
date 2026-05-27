import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { changePassword } from "../services/auth";
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

function RuleRow({
  ok,
  text,
  palette,
}: {
  ok: boolean;
  text: string;
  palette: { text: string; muted: string };
}) {
  return (
    <View style={styles.ruleRow}>
      <View
        style={[
          styles.dot,
          { backgroundColor: ok ? "#16A34A" : palette.muted },
        ]}
      />
      <Text style={[styles.ruleText, { color: palette.text }]}>{text}</Text>
    </View>
  );
}

export default function ChangePasswordScreen({ navigation }: Props) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  // 🎨 Palette nội bộ, đồng bộ với Category / Wallet / Profile
  const palette: Palette = useMemo(() => {
    if (isDark) {
      return {
        bg: "#020617",
        card: "rgba(15,23,42,0.98)",
        text: "rgba(248,250,252,0.96)",
        muted: "rgba(148,163,184,0.95)",
        soft: "rgba(15,23,42,0.9)",
        stroke: "rgba(51,65,85,1)",
      };
    }
    return {
      bg: "#F5F6FA",
      card: "#FFFFFF",
      text: "#0F172A",
      muted: "#64748B",
      soft: "rgba(148,163,184,0.16)",
      stroke: "rgba(15,23,42,0.06)",
    };
  }, [isDark]);

  const shadow = isDark ? {} : styles.shadow;

  const [submitting, setSubmitting] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // page animation
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

  const rules = useMemo(() => {
    const lenOk = newPw.length >= 6;
    const numOk = /\d/.test(newPw);
    const matchOk = newPw.length > 0 && newPw === confirmPw;
    return { lenOk, numOk, matchOk, allOk: lenOk && numOk && matchOk };
  }, [newPw, confirmPw]);

  const onSubmit = useCallback(async () => {
    if (!currentPw.trim()) {
      Toast.show({ type: "error", text1: "Vui lòng nhập mật khẩu hiện tại" });
      return;
    }
    if (!rules.allOk) {
      Toast.show({ type: "error", text1: "Mật khẩu mới chưa hợp lệ" });
      return;
    }

    try {
      setSubmitting(true);
      await changePassword({ currentPassword: currentPw, newPassword: newPw });
      Toast.show({ type: "success", text1: "Đổi mật khẩu thành công" });
      navigation.goBack();
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: e?.response?.data?.message ?? "Không đổi được mật khẩu",
      });
    } finally {
      setSubmitting(false);
    }
  }, [currentPw, newPw, rules.allOk, navigation]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
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
                  backgroundColor: palette.card,
                  borderColor: palette.stroke,
                  opacity: pressed ? 0.9 : 1,
                },
                shadow,
              ]}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={22} color={palette.text} />
            </Pressable>
            <Text style={[styles.topTitle, { color: palette.text }]}>
              Đổi mật khẩu
            </Text>
            {/* spacer để title ở giữa */}
            <View style={{ width: 34 }} />
          </View>

          <Animated.View
            style={{ opacity: fade, transform: [{ translateY: rise }] }}
          >
            <View
              style={[
                styles.card,
                { backgroundColor: palette.card, borderColor: palette.stroke },
                shadow,
              ]}
            >
              <Text style={[styles.sub, { color: palette.muted }]}>
                Nhập mật khẩu hiện tại và mật khẩu mới để thay đổi mật khẩu của
                bạn.
              </Text>

              <View
                style={[
                  styles.ruleBox,
                  {
                    backgroundColor: isDark
                      ? "rgba(52,211,153,0.18)"
                      : "rgba(52,211,153,0.16)",
                  },
                ]}
              >
                <Text style={[styles.ruleTitle, { color: palette.text }]}>
                  Yêu cầu mật khẩu mới:
                </Text>
                <RuleRow
                  ok={rules.lenOk}
                  text="Ít nhất 6 ký tự"
                  palette={palette}
                />
                <RuleRow
                  ok={rules.numOk}
                  text="Chứa ít nhất 1 số"
                  palette={palette}
                />
                <RuleRow
                  ok={rules.matchOk}
                  text="Mật khẩu khớp nhau"
                  palette={palette}
                />
              </View>

              <Text
                style={[styles.label, { marginTop: 10, color: palette.text }]}
              >
                Mật khẩu hiện tại
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: palette.soft,
                    borderColor: palette.stroke,
                  },
                ]}
              >
                <TextInput
                  value={currentPw}
                  onChangeText={setCurrentPw}
                  secureTextEntry
                  placeholder=" "
                  placeholderTextColor={palette.muted}
                  style={[styles.input, { color: palette.text }]}
                />
              </View>

              <Text
                style={[styles.label, { marginTop: 10, color: palette.text }]}
              >
                Mật khẩu mới
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: palette.soft,
                    borderColor: palette.stroke,
                  },
                ]}
              >
                <TextInput
                  value={newPw}
                  onChangeText={setNewPw}
                  secureTextEntry
                  placeholder=" "
                  placeholderTextColor={palette.muted}
                  style={[styles.input, { color: palette.text }]}
                />
              </View>

              <Text
                style={[styles.label, { marginTop: 10, color: palette.text }]}
              >
                Xác nhận mật khẩu mới
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: palette.soft,
                    borderColor: palette.stroke,
                  },
                ]}
              >
                <TextInput
                  value={confirmPw}
                  onChangeText={setConfirmPw}
                  secureTextEntry
                  placeholder=" "
                  placeholderTextColor={palette.muted}
                  style={[styles.input, { color: palette.text }]}
                />
              </View>

              <View style={styles.btnRow}>
                <Pressable
                  onPress={() => navigation.goBack()}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.btn,
                    {
                      backgroundColor: palette.card,
                      borderColor: palette.stroke,
                      opacity: submitting ? 0.55 : pressed ? 0.9 : 1,
                    },
                    shadow,
                  ]}
                >
                  <Text
                    style={[
                      styles.btnText,
                      { color: isDark ? palette.text : "#0F172A" },
                    ]}
                  >
                    Hủy
                  </Text>
                </Pressable>

                <Pressable
                  disabled={submitting}
                  onPress={onSubmit}
                  style={({ pressed }) => [
                    styles.btn,
                    {
                      backgroundColor: GREEN,
                      borderColor: "transparent",
                      opacity: submitting ? 0.6 : pressed ? 0.9 : 1,
                    },
                    shadow,
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator color="#052E1B" />
                  ) : (
                    <Text style={[styles.btnText, { color: "#052E1B" }]}>
                      Đổi mật khẩu
                    </Text>
                  )}
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
  safe: { flex: 1 },

  page: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 16,
  },

  container: { paddingTop: 10, paddingBottom: 18 },

  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  topTitle: {
    fontFamily: "Faustina_600SemiBold",
    fontSize: 14,
  },

  card: {
    marginTop: 12,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },

  sub: {
    fontFamily: "Faustina_400Regular",
    fontSize: 12,
  },

  ruleBox: {
    marginTop: 10,
    borderRadius: 14,
    padding: 12,
  },
  ruleTitle: {
    fontFamily: "Faustina_600SemiBold",
    fontSize: 12.5,
    marginBottom: 8,
  },

  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ruleText: {
    fontFamily: "Faustina_500Medium",
    fontSize: 12,
  },

  label: {
    fontFamily: "Faustina_600SemiBold",
    fontSize: 12.5,
  },
  inputWrap: {
    marginTop: 8,
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  input: {
    fontFamily: "Faustina_500Medium",
    fontSize: 12.5,
  },

  btnRow: { flexDirection: "row", gap: 14, marginTop: 14 },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  btnText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13.5,
  },
});
