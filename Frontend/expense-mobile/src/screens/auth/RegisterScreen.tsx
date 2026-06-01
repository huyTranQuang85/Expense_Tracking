import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
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
import { register } from "../../services/auth";

const schema = z
  .object({
    name: z.string().min(2, "Họ và tên tối thiểu 2 ký tự"),
    email: z.string().email("Email không hợp lệ"),
    password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
    confirm: z.string().min(6, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirm"],
  });

type FormData = z.infer<typeof schema>;

type Props = NativeStackScreenProps<AuthStackParamList, "Register"> & {
  onAuthSuccess?: () => void;
};

export default function RegisterScreen({ navigation, onAuthSuccess }: Props) {
  const isDark = useColorScheme() === "dark";
  const bg = isDark ? "#080D14" : "#F6F7FB";
  const title = isDark ? "#34D399" : "#047857";
  const text = isDark ? "rgba(248,250,252,0.9)" : "#475569";

  const [apiError, setApiError] = useState<string | undefined>(undefined);

  const {
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async (data) => {
    setApiError(undefined);
    try {
      await register({
        fullName: data.name,
        email: data.email,
        password: data.password,
      });

      onAuthSuccess?.();
    } catch (e: any) {
      setApiError(
        e?.response?.data?.message ?? "Đăng ký thất bại. Vui lòng thử lại.",
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

      <Text style={[styles.title, { color: title }]}>Đăng Ký</Text>
      <Text style={[styles.subtitle, { color: text }]}>
        Tạo tài khoản mới của bạn
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
        <Label>Họ và tên</Label>
        <Field
          placeholder="Nhập họ và tên của bạn"
          value={watch("name")}
          onChangeText={(t) => setValue("name", t, { shouldValidate: true })}
        />
        <ErrorText>{errors.name?.message}</ErrorText>

        <View style={{ height: 10 }} />

        <Label>Email</Label>
        <Field
          placeholder="Nhập email của bạn"
          keyboardType="email-address"
          autoCapitalize="none"
          value={watch("email")}
          onChangeText={(t) => setValue("email", t, { shouldValidate: true })}
        />
        <ErrorText>{errors.email?.message}</ErrorText>

        <View style={{ height: 10 }} />

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

        <View style={{ height: 10 }} />

        <Label>Xác nhận mật khẩu</Label>
        <Field
          placeholder="Xác nhận mật khẩu của bạn"
          secureTextEntry
          value={watch("confirm")}
          onChangeText={(t) => setValue("confirm", t, { shouldValidate: true })}
        />
        <ErrorText>{errors.confirm?.message}</ErrorText>

        <ErrorText>{apiError}</ErrorText>

        <View style={{ height: 18 }} />
        <PrimaryButton
          title="Đăng Ký"
          onPress={onSubmit}
          disabled={isSubmitting}
        />

        <View style={{ height: 18 }} />
        <Text style={[styles.footerText, { color: text, textAlign: "center" }]}>
          Đã có tài khoản ?
        </Text>
        <Text
          onPress={() => navigation.replace("Login")}
          style={[styles.footerLink, { color: title, textAlign: "center" }]}
        >
          Đăng nhập
        </Text>
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
    marginTop: 26,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
  },
  footerText: { fontFamily: "Faustina_500Medium", fontSize: 14 },
  footerLink: { fontFamily: "Faustina_700Bold", fontSize: 16, marginTop: 6 },
});
