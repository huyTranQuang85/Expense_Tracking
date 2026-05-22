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

      <Text style={[styles.title, { color: title }]}>Quên mật khẩu</Text>
      <Text style={[styles.subtitle, { color: text }]}>
        Nhập email để nhận mã xác nhận
      </Text>
      <Text style={[styles.note, { color: muted }]}>
        Chúng tôi sẽ gửi mã về email của bạn. Bạn dùng mã đó để đặt lại mật
        khẩu.
      </Text>

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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22 },
  topRow: { marginTop: 54, marginBottom: 10 },
  title: {
    textAlign: "center",
    fontFamily: "Faustina_700Bold",
    fontSize: 30,
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
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
    marginTop: 10,
    lineHeight: 17,
  },
  form: { marginTop: 26 },
});
