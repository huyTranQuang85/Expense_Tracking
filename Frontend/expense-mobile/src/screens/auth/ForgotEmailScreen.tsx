import React, { useState } from "react";
import { StyleSheet, Text, View, useColorScheme, SafeAreaView } from "react-native";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { AuthStackParamList } from "../../app/AuthNavigator";
import {
  BackCircle,
  ErrorText,
  Field,
  GreenBlob,
  Label,
  PrimaryButton,
} from "../../components/AuthUI";
import { forgotSendCode } from "../../services/auth";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
});
type FormData = z.infer<typeof schema>;

export default function ForgotEmailScreen({
  navigation,
}: NativeStackScreenProps<AuthStackParamList, "ForgotEmail">) {
  const isDark = useColorScheme() === "dark";
  const bg = isDark ? "#0B0F14" : "#FFFFFF";
  const title = "#4EECA5";
  const text = isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.78)";
  const muted = isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)";

  const [apiError, setApiError] = useState<string | undefined>(undefined);

  const {
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setApiError(undefined);
    try {
      // gọi backend gửi mã (nếu endpoint đúng)
      await forgotSendCode(email);
      navigation.navigate("ForgotReset", { email });
    } catch (e: any) {
      // Nếu backend bạn chưa có endpoint như mình placeholder, vẫn cho đi tiếp để bạn test UI
      navigation.navigate("ForgotReset", { email });
      // hoặc bật lỗi:
      // setApiError(e?.response?.data?.message ?? "Không gửi được mã. Vui lòng thử lại.");
    }
  });

  return (
    <LinearGradient
      colors={useColorScheme() === "dark" ? ["#050816", "#020617"] : ["#F8FBFF", "#ECFDF5"]}
      style={styles.screen}
    >
      <SafeAreaView style={styles.screen}>
        <View style={[styles.container, { backgroundColor: "transparent" }]}> 
          <GreenBlob />

          <View style={styles.topRow}>
            <BackCircle
              onPress={() => {
                if (navigation.canGoBack()) navigation.goBack();
                else navigation.replace("Login");
              }}
            />
          </View>

          <View style={[styles.hero, { backgroundColor: isDark ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.9)", borderColor: isDark ? "rgba(148,163,184,0.4)" : "rgba(15,23,42,0.06)" }]}> 
            <View style={styles.accentBar} />
            <Text style={[styles.kicker, { color: muted }]}>Khôi phục tài khoản</Text>
            <Text style={[styles.title, { color: title }]}>Quên mật khẩu</Text>
            <Text style={[styles.subtitle, { color: text }]}> 
              Nhập email để nhận mã xác nhận
            </Text>
            <Text style={[styles.note, { color: muted }]}> 
              Chúng tôi sẽ gửi mã về email của bạn. Bạn dùng mã đó để đặt lại mật
              khẩu.
            </Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: isDark ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.95)", borderColor: isDark ? "rgba(148,163,184,0.4)" : "rgba(15,23,42,0.06)" }]}> 
            <View style={styles.accentBar} />
            <View style={styles.form}>
              <Label>Email</Label>
              <Field
                placeholder="Nhập email của bạn"
                keyboardType="email-address"
                autoCapitalize="none"
                value={watch("email")}
                onChangeText={(t) => setValue("email", t, { shouldValidate: true })}
              />
              <ErrorText>{errors.email?.message}</ErrorText>
              <ErrorText>{apiError}</ErrorText>

              <View style={{ height: 18 }} />
              <PrimaryButton
                title="Gửi mã"
                onPress={onSubmit}
                disabled={isSubmitting}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22 },
  screen: { flex: 1 },
  topRow: { marginTop: 54, marginBottom: 10 },
  hero: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  kicker: {
    fontFamily: "Faustina_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  title: {
    textAlign: "center",
    fontFamily: "Faustina_700Bold",
    fontSize: 30,
    marginTop: 2,
  },
  subtitle: {
    textAlign: "center",
    fontFamily: "Faustina_500Medium",
    fontSize: 15.5,
    marginTop: 8,
  },
  note: {
    textAlign: "center",
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
    marginTop: 10,
    lineHeight: 17,
  },
  formCard: {
    marginTop: 16,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  form: { marginTop: 4 },
  accentBar: {
    width: 54,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#0EA5E9",
    marginBottom: 12,
  },
});
