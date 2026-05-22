import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { uploadMyAvatar } from "../services/settings";

import { Ionicons } from "@expo/vector-icons";
import { updateProfile } from "../services/auth";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";

function normalizeAvatarUri(uri?: string | null) {
  if (!uri) return "";
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  if (uri.startsWith("/")) return `${API_BASE_URL}${uri}`;
  return uri;
}

function isLocalFileUri(uri: string) {
  return uri.startsWith("file://") || uri.startsWith("content://");
}

export const SETUP_PROFILE_DONE_KEY = "setup_profile_done";

type Props = {
  navigation: any;
  route: { params?: { fullName?: string; email?: string } };
};

export default function SetupProfileScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";

  const bg = isDark ? "#0B0F14" : "#FFFFFF";
  const text = isDark ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.82)";
  const muted = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)";
  const card = isDark ? "rgba(255,255,255,0.06)" : "#F6F6F6";
  const field = isDark ? "rgba(255,255,255,0.08)" : "#DADADA";
  const btn = "#4EECA5";

  const preFullName = route?.params?.fullName ?? "";
  const preEmail = route?.params?.email ?? "";

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Cần quyền truy cập ảnh",
        "Bạn hãy cho phép để chọn ảnh đại diện.",
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!res.canceled) setAvatarUri(res.assets[0]?.uri ?? null);
  };

  const goNext = async () => {
    await SecureStore.setItemAsync(SETUP_PROFILE_DONE_KEY, "1");
    navigation.reset({
      index: 0,
      routes: [{ name: "SetupBudget" }],
    });
  };

  const onComplete = async () => {
    try {
      setSaving(true);
      // Backend bạn có updateProfile /me: mình gửi fullName/phone/bio
      let avatarUrl: string | undefined = avatarUri ?? undefined;

      if (avatarUrl && isLocalFileUri(avatarUrl)) {
        const uploadedUser = await uploadMyAvatar(avatarUrl);
        avatarUrl = uploadedUser.avatar_url ?? undefined;
      }

      await updateProfile({
        fullName: preFullName || undefined,
        phone: phone || undefined,
        bio: bio || undefined,
        ...(avatarUrl ? { avatarUrl } : {}), // chỉ gửi nếu có
      });

      await goNext();
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message ??
          "Không lưu được thông tin. Bạn có thể bấm Bỏ qua.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bg, paddingTop: insets.top + 8 },
      ]}
    >
      <Text style={[styles.h1, { color: text }]}>Làm quen trước nhé !</Text>
      <Text style={[styles.sub, { color: muted }]}>
        Thêm thông tin để cá nhân hóa trải nghiệm của bạn
      </Text>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 18 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Card */}
        <View style={[styles.avatarCard, { backgroundColor: card }]}>
          <Text style={[styles.label, { color: text }]}>Ảnh đại diện</Text>

          <Pressable onPress={pickAvatar} style={styles.avatarBox}>
            {avatarUri ? (
              <Image
                source={{ uri: normalizeAvatarUri(avatarUri) }}
                style={styles.avatarImg}
              />
            ) : (
              <Image
                source={require("../../img/up-arrow.png")}
                style={styles.avatarPlaceholder}
                resizeMode="contain"
              />
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </Pressable>

          <Text style={[styles.hint, { color: muted }]}>
            Tải lên ảnh đại diện của bạn (Tùy chọn)
          </Text>
        </View>

        {/* Info Card */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: "rgba(78,236,165,0.16)" },
          ]}
        >
          <Text style={[styles.label, { color: text }]}>Họ và tên</Text>
          <View style={[styles.readonly, { backgroundColor: field }]}>
            <Text style={[styles.readonlyText, { color: muted }]}>
              {preFullName
                ? preFullName
                : "Tên tự động cập nhật từ form đăng ký"}
            </Text>
          </View>

          <Text style={[styles.label, { color: text, marginTop: 10 }]}>
            Email
          </Text>
          <View style={[styles.readonly, { backgroundColor: field }]}>
            <Text style={[styles.readonlyText, { color: muted }]}>
              {preEmail ? preEmail : "Email tự động cập nhật từ form đăng ký"}
            </Text>
          </View>

          <Text style={[styles.label, { color: text, marginTop: 10 }]}>
            Số điện thoại
          </Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder=" "
            placeholderTextColor={muted}
            style={[
              styles.input,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#E9E9E9",
                color: text,
              },
            ]}
          />

          <Text style={[styles.label, { color: text, marginTop: 10 }]}>
            Giới thiệu về bạn
          </Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Kể về bản thân, mục tiêu tài chính, câu nói yêu thích hoặc lý do bạn sử dụng ứng dụng này..."
            placeholderTextColor={muted}
            multiline
            style={[
              styles.bio,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#E9E9E9",
                color: text,
              },
            ]}
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={goNext}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: btn, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.btnText}>Bỏ qua</Text>
          </Pressable>

          <Pressable
            disabled={saving}
            onPress={onComplete}
            style={({ pressed }) => [
              styles.btn,
              {
                backgroundColor: btn,
                opacity: saving ? 0.55 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={styles.btnText}>Hoàn thành</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18 },
  h1: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: "Faustina_700Bold",
    fontSize: 20,
  },
  sub: {
    marginTop: 6,
    textAlign: "center",
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
  },

  avatarCard: {
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  label: { fontFamily: "Faustina_700Bold", fontSize: 14, marginBottom: 8 },
  avatarBox: {
    height: 150,
    borderRadius: 12,
    backgroundColor: "#D9D9D9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarPlaceholder: { width: 70, height: 70 },
  avatarImg: { width: "100%", height: "100%" },
  cameraBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#3C79FF",
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    marginTop: 8,
    textAlign: "center",
    fontFamily: "Faustina_400Regular",
    fontSize: 11.5,
  },

  infoCard: {
    marginTop: 14,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  readonly: {
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  readonlyText: { fontFamily: "Faustina_500Medium", fontSize: 12.5 },
  input: {
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontFamily: "Faustina_500Medium",
    fontSize: 12.5,
  },
  bio: {
    minHeight: 86,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
  },

  actions: { flexDirection: "row", gap: 14, marginTop: 14 },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  btnText: { fontFamily: "Faustina_700Bold", fontSize: 14.5, color: "#0E1B13" },
});
