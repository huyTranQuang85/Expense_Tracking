import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../app/AuthNavigator";
import {
  BackCircle,
  ErrorText,
  Field,
  GreenBlob,
  Label,
  PrimaryButton,
} from "../../components/AuthUI";
import { login } from "../../services/auth";
import { deleteItem, getItem, setItem } from "../../services/storage";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});
type FormData = z.infer<typeof schema>;

const REMEMBER_KEY = "remember_email";

type Props = NativeStackScreenProps<AuthStackParamList, "Login"> & {
  onAuthSuccess?: () => void;
};

export default function LoginScreen({ navigation, onAuthSuccess }: Props) {
  const isDark = useColorScheme() === "dark";
  const bg = isDark ? "#080D14" : "#F6F7FB";
  const title = isDark ? "#34D399" : "#047857";
  const text = isDark ? "rgba(248,250,252,0.9)" : "#475569";

  const [remember, setRemember] = useState(true);
  const [apiError, setApiError] = useState<string | undefined>(undefined);

  const {
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  React.useEffect(() => {
    (async () => {
      const saved = await getItem(REMEMBER_KEY);
      if (saved) setValue("email", saved);
    })();
  }, [setValue]);

  const onSubmit = handleSubmit(async (data) => {
    setApiError(undefined);
    try {
      await login(data);

      if (remember) {
        await setItem(REMEMBER_KEY, data.email);
      } else {
        await deleteItem(REMEMBER_KEY);
      }

      onAuthSuccess?.();
    } catch (e: any) {
      setApiError(
        e?.response?.data?.message ?? "Đăng nhập thất bại. Vui lòng thử lại.",
      );
    }
  });

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <GreenBlob />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.topRow}>
          <BackCircle
            onPress={() => {
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.replace("Login"); // hoặc navigation.navigate("Login")
            }}
          />
        </View>

      <Text style={[styles.title, { color: title }]}>Đăng Nhập</Text>
      <Text style={[styles.subtitle, { color: text }]}>
        Chào mừng bạn đã trở lại
      </Text>

      <View
        style={[
          styles.form,
          {
            backgroundColor: isDark ? "rgba(15,23,42,0.74)" : "rgba(255,255,255,0.78)",
            borderColor: isDark ? "rgba(148,163,184,0.18)" : "rgba(15,23,42,0.06)",
          },
        ]}
      >
        <Label>Email</Label>
        <Field
          placeholder="Nhập email của bạn"
          keyboardType="email-address"
          autoCapitalize="none"
          value={watch("email")}
          onChangeText={(t) => setValue("email", t, { shouldValidate: true })}
        />
        <ErrorText>{errors.email?.message}</ErrorText>

        <View style={{ height: 12 }} />

        <Label>Mật khẩu</Label>
        <Field
          placeholder="Nhập mật khẩu của bạn"
          secureTextEntry
          value={watch("password")}
          onChangeText={(t) =>
            setValue("password", t, { shouldValidate: true })
          }
        />
        <ErrorText>{errors.password?.message}</ErrorText>

        <View style={styles.rowBetween}>
          <Pressable
            onPress={() => setRemember((v) => !v)}
            style={styles.rememberRow}
          >
            <View
              style={[
                styles.checkOuter,
                {
                  borderColor: remember
                    ? "#10B981"
                    : isDark
                      ? "rgba(255,255,255,0.35)"
                      : "rgba(0,0,0,0.3)",
                },
              ]}
            >
              {remember ? <View style={styles.checkInner} /> : null}
            </View>
            <Text style={[styles.rememberText, { color: text }]}>
              Ghi nhớ tôi
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("ForgotEmail")}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text
              style={[
                styles.linkMuted,
                {
                  color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.55)",
                },
              ]}
            >
              Quên mật khẩu?
            </Text>
          </Pressable>
        </View>

        <ErrorText>{apiError}</ErrorText>

        <View style={{ height: 18 }} />
        <PrimaryButton title="Đăng nhập" onPress={onSubmit} disabled={isSubmitting} />

        <View style={{ height: 18 }} />

        <Text style={[styles.footerText, { color: text }]}>
          Bạn chưa có tài khoản ?
        </Text>
        <Pressable
          onPress={() => navigation.navigate("Register")}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text style={[styles.footerLink, { color: title }]}>Đăng ký</Text>
        </Pressable>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22 },
  scrollContent: { paddingBottom: 28 },
  topRow: { marginTop: 54, marginBottom: 10 },
  title: {
    textAlign: "center",
    fontFamily: "Faustina_700Bold",
    fontSize: 36,
    marginTop: 18,
  },
  subtitle: {
    textAlign: "center",
    fontFamily: "Faustina_500Medium",
    fontSize: 16,
    marginTop: 6,
  },

  form: {
    marginTop: 32,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
  },
  rowBetween: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  rememberRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkOuter: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#10B981",
  },
  rememberText: { fontFamily: "Faustina_500Medium", fontSize: 13.5 },

  linkMuted: { fontFamily: "Faustina_600SemiBold", fontSize: 13.5 },

  footerText: {
    textAlign: "center",
    fontFamily: "Faustina_500Medium",
    fontSize: 14,
  },
  footerLink: {
    textAlign: "center",
    fontFamily: "Faustina_700Bold",
    fontSize: 16,
    marginTop: 6,
  },
});
