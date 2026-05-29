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
import { forgotResetPassword } from "../../services/auth";

const schema = z
  .object({
    code: z.string().min(4, "Mã xác nhận tối thiểu 4 ký tự"),
    newPassword: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
    confirmNewPassword: z.string().min(6, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((v) => v.newPassword === v.confirmNewPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmNewPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function ForgotResetScreen({
  navigation,
  route,
}: NativeStackScreenProps<AuthStackParamList, "ForgotReset">) {
  const { email } = route.params;

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
    defaultValues: { code: "", newPassword: "", confirmNewPassword: "" },
  });

  const onSubmit = handleSubmit(async (data) => {
    setApiError(undefined);
    try {
      await forgotResetPassword({
        email,
        code: data.code,
        newPassword: data.newPassword,
      });
      alert("Đặt lại mật khẩu thành công!");
      navigation.replace("Login");
    } catch (e: any) {
      setApiError(
        e?.response?.data?.message ??
          "Không đặt lại được mật khẩu. Vui lòng thử lại.",
      );
    }
  });

  return (
    <LinearGradient
      colors={isDark ? ["#050816", "#020617"] : ["#F8FBFF", "#ECFDF5"]}
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
            <Text style={[styles.title, { color: title }]}>Xác nhận & đặt lại</Text>
            <Text style={[styles.subtitle, { color: text }]}> 
              Nhập mã và mật khẩu mới
            </Text>
            <Text style={[styles.note, { color: muted }]}>Email: {email}</Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: isDark ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.95)", borderColor: isDark ? "rgba(148,163,184,0.4)" : "rgba(15,23,42,0.06)" }]}> 
            <View style={styles.accentBar} />
            <View style={styles.form}>
              <Label>Mã xác nhận</Label>
              <Field
                placeholder="Nhập mã xác nhận"
                value={watch("code")}
                onChangeText={(t) => setValue("code", t, { shouldValidate: true })}
              />
              <ErrorText>{errors.code?.message}</ErrorText>

              <View style={{ height: 10 }} />

              <Label>Mật khẩu mới</Label>
              <Field
                placeholder="Nhập mật khẩu mới"
                secureTextEntry
                value={watch("newPassword")}
                onChangeText={(t) =>
                  setValue("newPassword", t, { shouldValidate: true })
                }
              />
              <ErrorText>{errors.newPassword?.message}</ErrorText>

              <View style={{ height: 10 }} />

              <Label>Xác nhận mật khẩu mới</Label>
              <Field
                placeholder="Nhập lại mật khẩu mới"
                secureTextEntry
                value={watch("confirmNewPassword")}
                onChangeText={(t) =>
                  setValue("confirmNewPassword", t, { shouldValidate: true })
                }
              />
              <ErrorText>{errors.confirmNewPassword?.message}</ErrorText>

              <ErrorText>{apiError}</ErrorText>

              <View style={{ height: 18 }} />
              <PrimaryButton
                title="Đổi mật khẩu"
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
    fontSize: 28,
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
    fontFamily: "Faustina_500Medium",
    fontSize: 12.5,
    marginTop: 10,
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
