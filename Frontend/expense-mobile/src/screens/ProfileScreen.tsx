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
import { LinearGradient } from "expo-linear-gradient";
import { fetchMe, Me, updateMyProfile } from "../services/profile";
import { uploadMyAvatar } from "../services/settings";
import { useTheme } from "../theme/ThemeContext";

const GREEN = "#10B981";
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
  const { mode, colors } = useTheme();
  const isDark = mode === "dark";

  // 🎨 Palette giống Category / Wallet
  const palette: Palette = useMemo(() => {
    return {
      bg: colors.bg,
      card: colors.card,
      text: colors.text,
      muted: colors.muted,
      soft: colors.soft,
      stroke: colors.stroke,
    };
  }, [colors]);

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
    <LinearGradient
      colors={isDark ? ["#080D14", "#0F172A"] : ["#F6F7FB", "#ECFDF5"]}
      style={styles.safe}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: "transparent" }]}> 
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

            <LinearGradient
              colors={isDark ? ["#0F172A", "#064E3B"] : ["#0F172A", "#10B981"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.hero, shadow]}
            >
              <View style={styles.heroIcon}>
                <Ionicons name="person-circle-outline" size={26} color="#FFFFFF" />
              </View>
              <Text style={styles.heroKicker}>Hồ sơ cá nhân</Text>
              <Text style={styles.h1}>Chỉnh sửa hồ sơ</Text>
              <Text style={styles.heroSub}>Cập nhật tên, ảnh đại diện, số điện thoại và tiểu sử.</Text>
            </LinearGradient>

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
              <View style={styles.accentBar} />
              <Text style={[styles.cardTitle, { color: palette.text }]}> 
                Ảnh đại diện
              </Text>

              <View
                style={[styles.avatarBoard, { backgroundColor: palette.soft }]}
              >
                <View style={styles.avatarCenter}>
                  <LinearGradient
                    colors={isDark ? ["#111827", "#064E3B"] : ["#FFFFFF", "#D1FAE5"]}
                    style={styles.avatarCircle}
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
                  </LinearGradient>

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
              <View style={styles.accentBar} />
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
    </LinearGradient>
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

  hero: {
    borderRadius: 26,
    padding: 18,
    marginTop: 10,
    overflow: "hidden",
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  heroKicker: {
    marginTop: 14,
    fontFamily: "Faustina_600SemiBold",
    fontSize: 12,
    color: "rgba(255,255,255,0.82)",
    textTransform: "uppercase",
  },
  heroSub: {
    marginTop: 6,
    fontFamily: "Faustina_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255,255,255,0.82)",
  },

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
    marginTop: 4,
    fontFamily: "Faustina_700Bold",
    fontSize: 25,
    color: "#FFFFFF",
  },

  card: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  accentBar: {
    width: 54,
    height: 4,
    borderRadius: 999,
    backgroundColor: GREEN,
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13,
    marginBottom: 10,
  },

  avatarBoard: {
    borderRadius: 20,
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
    width: 100,
    height: 100,
    borderRadius: 34,
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
    backgroundColor: GREEN,
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
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderWidth: 1,
  },
  input: { fontFamily: "Faustina_500Medium", fontSize: 13, paddingVertical: 8 },

  bioField: {
    minHeight: 96,
    borderRadius: 16,
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
    minHeight: 50,
    borderRadius: 18,
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
