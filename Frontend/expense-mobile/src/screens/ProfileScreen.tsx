// src/screens/UpdateProfileScreen.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { fetchMe, Me, updateMyProfile } from "../services/profile";
import { uploadMyAvatar } from "../services/settings";
import { useTheme } from "../theme/ThemeContext";

const GREEN = "#34D399";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";

type Palette = {
  bg: string;
  card: string;
  soft: string;
  text: string;
  muted: string;
  stroke: string;
};

const pickName = (me?: Me) => me?.user_name ?? "";
const pickEmail = (me?: Me) => me?.email ?? "";
const pickPhone = (me?: Me) => me?.phone ?? "";
const pickBio = (me?: Me) => me?.bio ?? "";
const pickAvatar = (me?: Me) => me?.avatar_url ?? "";

function normalizeAvatarUri(uri?: string) {
  if (!uri) return "";
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  if (uri.startsWith("/")) return `${API_BASE_URL}${uri}`;
  return uri;
}

function isLocalFileUri(uri: string) {
  return uri.startsWith("file://") || uri.startsWith("content://");
}

export default function UpdateProfileScreen({ navigation }: any) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  // 🎨 Palette giống Category / Wallet
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [me, setMe] = useState<Me | null>(null);

  const [avatarUri, setAvatarUri] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [bio, setBio] = useState<string>("");

  // animation
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(10)).current;

  const animateIn = useCallback(() => {
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

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const m = await fetchMe();
      setMe(m);

      setAvatarUri(pickAvatar(m) || "");
      setFullName(pickName(m) || "");
      setEmail(pickEmail(m) || "");
      setPhone(pickPhone(m) || "");
      setBio(pickBio(m) || "");
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message ?? "Không tải được thông tin."
      );
    } finally {
      setLoading(false);
      animateIn();
    }
  }, [animateIn]);

  useEffect(() => {
    load();
  }, [load]);

  const onPickAvatar = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Cần quyền truy cập ảnh",
        "Bạn hãy cho phép để chọn ảnh đại diện."
      );
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!res.canceled) setAvatarUri(res.assets?.[0]?.uri ?? "");
  }, []);

  const onCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onSave = useCallback(async () => {
    if (!fullName.trim()) {
      Alert.alert("Thiếu thông tin", "Họ và tên không được để trống.");
      return;
    }

    try {
      setSaving(true);

      let avatarUrlToSave: string | null = avatarUri ? avatarUri : null;

      // nếu là file local thì upload trước
      if (avatarUrlToSave && isLocalFileUri(avatarUrlToSave)) {
        const uploadedUser = await uploadMyAvatar(avatarUrlToSave);
        avatarUrlToSave = uploadedUser.avatar_url ?? null;
        if (avatarUrlToSave) setAvatarUri(avatarUrlToSave);
      }

      const updated = await updateMyProfile({
        fullName: fullName.trim(),
        phoneNumber: phone,
        bio: bio.trim() ? bio.trim() : null,
        avatarUrl: avatarUrlToSave,
      });

      setMe(updated);

      Toast.show({
        type: "success",
        text1: "Đã lưu thay đổi",
      });

      navigation.goBack();
    } catch (e: any) {
      Alert.alert(
        "Lỗi",
        e?.response?.data?.message ?? "Không lưu được thay đổi."
      );
    } finally {
      setSaving(false);
    }
  }, [avatarUri, bio, fullName, navigation, phone]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={palette.text} />
          <Text style={[styles.loadingText, { color: palette.muted }]}>
            Đang tải...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasAvatar = !!avatarUri;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
      <View style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Top row (back only) */}
          <View style={styles.topRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={({ pressed }) => [
                styles.backBtn,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.stroke,
                  opacity: pressed ? 0.8 : 1,
                },
                shadow,
              ]}
            >
              <Ionicons name="arrow-back" size={20} color={palette.text} />
            </Pressable>
          </View>

          <Text style={[styles.h1, { color: palette.text }]}>
            Chỉnh sửa hồ sơ cá nhân
          </Text>

          <Animated.View
            style={{ opacity: fade, transform: [{ translateY: rise }] }}
          >
            {/* Avatar card */}
            <View
              style={[
                styles.card,
                { backgroundColor: palette.card, borderColor: palette.stroke },
                shadow,
              ]}
            >
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                Ảnh đại diện
              </Text>

              <View
                style={[styles.avatarBoard, { backgroundColor: palette.soft }]}
              >
                <View style={styles.avatarCenter}>
                  <View
                    style={[
                      styles.avatarCircle,
                      { backgroundColor: isDark ? "#020617" : "#FFFFFF" },
                    ]}
                  >
                    {hasAvatar ? (
                      <Image
                        source={{ uri: normalizeAvatarUri(avatarUri) }}
                        style={styles.avatarImg}
                      />
                    ) : (
                      <View style={styles.logoFallback}>
                        <Text style={styles.logoText}>BP</Text>
                      </View>
                    )}
                  </View>

                  <Pressable
                    onPress={onPickAvatar}
                    style={({ pressed }) => [
                      styles.cameraBtn,
                      { opacity: pressed ? 0.9 : 1 },
                    ]}
                  >
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>

                <Text style={[styles.avatarHint, { color: palette.muted }]}>
                  Nhấn vào biểu tượng máy ảnh để thay đổi ảnh
                </Text>
              </View>
            </View>

            {/* Info card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.stroke,
                  marginTop: 14,
                },
                shadow,
              ]}
            >
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                Thông tin cá nhân
              </Text>

              <Text style={[styles.label, { color: palette.text }]}>
                Họ và tên
              </Text>
              <View
                style={[
                  styles.field,
                  {
                    backgroundColor: palette.soft,
                    borderColor: palette.stroke,
                  },
                ]}
              >
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Nhập họ và tên"
                  placeholderTextColor={palette.muted}
                  style={[styles.input, { color: palette.text }]}
                />
              </View>

              <Text
                style={[styles.label, { color: palette.text, marginTop: 10 }]}
              >
                Email
              </Text>
              <View
                style={[
                  styles.field,
                  {
                    backgroundColor: palette.soft,
                    borderColor: palette.stroke,
                    opacity: 0.75,
                  },
                ]}
              >
                <TextInput
                  value={email}
                  editable={false}
                  placeholder="Email"
                  placeholderTextColor={palette.muted}
                  style={[styles.input, { color: palette.text }]}
                />
              </View>

              <Text
                style={[styles.label, { color: palette.text, marginTop: 10 }]}
              >
                Số điện thoại
              </Text>
              <View
                style={[
                  styles.field,
                  {
                    backgroundColor: palette.soft,
                    borderColor: palette.stroke,
                  },
                ]}
              >
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor={palette.muted}
                  style={[styles.input, { color: palette.text }]}
                />
              </View>

              <Text
                style={[styles.label, { color: palette.text, marginTop: 10 }]}
              >
                Tiểu sử
              </Text>
              <View
                style={[
                  styles.bioField,
                  {
                    backgroundColor: palette.soft,
                    borderColor: palette.stroke,
                  },
                ]}
              >
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder=" "
                  placeholderTextColor={palette.muted}
                  multiline
                  style={[styles.bioInput, { color: palette.text }]}
                />
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable
                onPress={onCancel}
                disabled={saving}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.stroke,
                    opacity: saving ? 0.55 : pressed ? 0.9 : 1,
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
                onPress={onSave}
                disabled={saving}
                style={({ pressed }) => [
                  styles.btn,
                  {
                    backgroundColor: GREEN,
                    borderColor: "transparent",
                    opacity: saving ? 0.55 : pressed ? 0.9 : 1,
                  },
                  shadow,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#052E1B" />
                ) : (
                  <Text
                    style={[
                      styles.btnText,
                      { color: "#052E1B" }, // đồng bộ các màn khác
                    ]}
                  >
                    Lưu thay đổi
                  </Text>
                )}
              </Pressable>
            </View>
          </Animated.View>

          <View style={{ height: 18 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // giống Home / Wallet: page giữa, maxWidth
  page: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  container: { paddingBottom: 10 },

  center: { alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 10, fontFamily: "Faustina_400Regular" },

  topRow: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  h1: {
    marginTop: 10,
    fontFamily: "Faustina_700Bold",
    fontSize: 18,
  },

  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginTop: 12,
  },
  cardTitle: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13,
    marginBottom: 10,
  },

  avatarBoard: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  avatarCenter: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  avatarCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  logoFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontFamily: "Faustina_700Bold", fontSize: 28, color: "#0F2B46" },

  cameraBtn: {
    position: "absolute",
    right: "34%",
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3C79FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: {
    marginTop: 6,
    fontFamily: "Faustina_400Regular",
    fontSize: 11.5,
    textAlign: "center",
  },

  label: { fontFamily: "Faustina_700Bold", fontSize: 12.5, marginBottom: 6 },
  field: {
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderWidth: 1,
  },
  input: { fontFamily: "Faustina_500Medium", fontSize: 13, paddingVertical: 8 },

  bioField: {
    minHeight: 96,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderWidth: 1,
  },
  bioInput: {
    fontFamily: "Faustina_400Regular",
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: "top",
  },

  actions: { flexDirection: "row", gap: 14, marginTop: 16 },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  btnText: { fontFamily: "Faustina_700Bold", fontSize: 14 },

  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
});
