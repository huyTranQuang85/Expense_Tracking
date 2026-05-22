import React, { useState } from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
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
    <View style={[styles.container, { backgroundColor: bg }]}>
      <GreenBlob />

      <View style={styles.topRow}>
        <BackCircle
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.replace("Login");
          }}
        />
      </View>

      <Text style={[styles.title, { color: title }]}>Xác nhận & đặt lại</Text>
      <Text style={[styles.subtitle, { color: text }]}>
        Nhập mã và mật khẩu mới
      </Text>
      <Text style={[styles.note, { color: muted }]}>Email: {email}</Text>

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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22 },
  topRow: { marginTop: 54, marginBottom: 10 },
  title: {
    textAlign: "center",
    fontFamily: "Faustina_700Bold",
    fontSize: 28,
    marginTop: 6,
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
  form: { marginTop: 22 },
});
