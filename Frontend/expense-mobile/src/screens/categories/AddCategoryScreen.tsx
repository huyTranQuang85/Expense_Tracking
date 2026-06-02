import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import SelectModal from "../../components/SelectModal";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
} from "../../constants/categoryPicker";
import {
  Category,
  createCategory,
  fetchAllCategories,
} from "../../services/categories";
import { useTheme } from "../../theme/ThemeContext";

const GREEN = "#10B981";

function getErrMsg(e: any) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    "Có lỗi xảy ra"
  );
}

export default function AddCategoryScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { mode } = useTheme();
  const isDark = mode === "dark";

  const ui = useMemo(
    () =>
      !isDark
        ? {
            bg: "#F3F5F7",
            card: "#FFFFFF",
            input: "#DADADA",
            text: "#111111",
            muted: "rgba(0,0,0,0.55)",
            border: "rgba(15,23,42,0.08)",
          }
        : {
            bg: "#020617", // slate-950
            card: "rgba(15,23,42,0.96)", // slate-900
            input: "rgba(15,23,42,0.95)", // input bg
            text: "rgba(248,250,252,0.96)", // slate-50
            muted: "rgba(148,163,184,0.95)", // slate-400
            border: "rgba(148,163,184,0.45)", // border
          },
    [isDark],
  );

  const shadow = isDark ? {} : styles.shadow;

  const initialType = route.params?.type as "income" | "expense" | undefined;
  const initialParentId = route.params?.parentId ?? null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense" | "">("");
  const [parentId, setParentId] = useState<number | string | null>(null);

  const [iconKey, setIconKey] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);

  const [allCategories, setAllCategories] = useState<Category[]>([]);

  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [parentModalOpen, setParentModalOpen] = useState(false);

  // init from params
  useEffect(() => {
    if (initialType) setType(initialType);
    if (initialParentId != null) setParentId(initialParentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load categories for parent picker
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const cats = await fetchAllCategories();
        if (!alive) return;
        setAllCategories(Array.isArray(cats) ? cats : []);
      } catch (e) {
        Alert.alert("Lỗi", getErrMsg(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const typeItems = useMemo(
    () => [
      { label: "Thu nhập", value: "income" },
      { label: "Chi tiêu", value: "expense" },
    ],
    [],
  );

  const parentItems = useMemo(() => {
    if (!type) return [{ label: "Không có", value: null }];

    const parents = allCategories
      .filter((c) => c.type === type && c.parentCategoryId == null)
      .map((c) => ({ label: c.name, value: c.id }));

    return [{ label: "Không có", value: null }, ...parents];
  }, [allCategories, type]);

  const typeLabel = useMemo(() => {
    if (type === "income") return "Thu nhập";
    if (type === "expense") return "Chi tiêu";
    return "Chọn danh mục";
  }, [type]);

  const parentLabel = useMemo(() => {
    if (!parentId) return "Không có";
    return (
      parentItems.find((x) => String(x.value) === String(parentId))?.label ??
      "Không có"
    );
  }, [parentItems, parentId]);

  // Nếu đổi type, reset parent
  useEffect(() => {
    setParentId(null);
  }, [type]);

  const onSubmit = async () => {
    const n = name.trim();
    if (!n) return Alert.alert("Thiếu thông tin", "Vui lòng nhập tên danh mục");
    if (!type)
      return Alert.alert("Thiếu thông tin", "Vui lòng chọn loại danh mục");

    try {
      setSaving(true);
      await createCategory({
        name: n,
        type,
        parentCategoryId: parentId ?? null,
        icon: iconKey ?? null,
        color: color ?? null,
      });
      Toast.show({
        type: "success",
        text1: "Danh mục đã được tạo thành công !",
      });
      nav.goBack();
    } catch (e) {
      Alert.alert("Không thể tạo danh mục", getErrMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={[styles.root, { backgroundColor: ui.bg, paddingTop: insets.top }]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <Pressable
          onPress={() => nav.goBack()}
          hitSlop={10}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color={ui.text} />
        </Pressable>

        <Text style={[styles.h1, { color: ui.text }]}>Thêm danh mục</Text>
        <Text style={[styles.h2, { color: ui.muted }]}>
          Tạo danh mục mới để phân loại giao dịch
        </Text>

        {loading ? (
          <View style={{ paddingVertical: 20 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <>
            {/* Name */}
            <Text style={[styles.label, { color: ui.text }]}>Tên danh mục</Text>
            <View
              style={[
                styles.input,
                { backgroundColor: ui.input, borderColor: ui.border },
              ]}
            >
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nhập tên danh mục"
                placeholderTextColor={ui.muted}
                style={[styles.inputText, { color: ui.text }]}
              />
            </View>

            {/* Type */}
            <Text style={[styles.label, { marginTop: 12, color: ui.text }]}>
              Loại danh mục
            </Text>
            <Pressable
              onPress={() => setTypeModalOpen(true)}
              style={[
                styles.select,
                { backgroundColor: ui.input, borderColor: ui.border },
              ]}
            >
              <Text
                style={[
                  styles.selectText,
                  { color: type ? ui.text : ui.muted },
                ]}
              >
                {typeLabel}
              </Text>
              <Ionicons name="chevron-down" size={16} color={ui.muted} />
            </Pressable>

            {/* Parent */}
            <Text style={[styles.label, { marginTop: 12, color: ui.text }]}>
              Danh mục cha (tùy chọn)
            </Text>
            <Pressable
              onPress={() => {
                if (!type)
                  return Alert.alert(
                    "Thông báo",
                    "Vui lòng chọn loại danh mục trước",
                  );
                setParentModalOpen(true);
              }}
              style={[
                styles.select,
                {
                  backgroundColor: ui.input,
                  borderColor: ui.border,
                  opacity: type ? 1 : 0.6,
                },
              ]}
            >
              <Text
                style={[
                  styles.selectText,
                  { color: parentId ? ui.text : ui.muted },
                ]}
              >
                {parentLabel}
              </Text>
              <Ionicons name="chevron-down" size={16} color={ui.muted} />
            </Pressable>

            {/* Icon */}
            <Text style={[styles.label, { marginTop: 12, color: ui.text }]}>
              Icon
            </Text>
            <View
              style={[
                styles.panel,
                { backgroundColor: ui.card, borderColor: ui.border },
                shadow,
              ]}
            >
              <ScrollView
                style={{ maxHeight: 220 }}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                contentContainerStyle={styles.iconGrid}
              >
                {CATEGORY_ICONS.map((it) => {
                  const active = it.icon === iconKey;
                  return (
                    <View key={it.key} style={styles.iconCellWrap}>
                      <Pressable
                        onPress={() => setIconKey(it.icon)}
                        style={({ pressed }) => [
                          styles.iconCell,
                          active && styles.iconCellActive,
                          {
                            opacity: pressed ? 0.85 : 1,
                            backgroundColor: active
                              ? "rgba(78,236,165,0.22)"
                              : "transparent",
                          },
                        ]}
                      >
                        <Text style={styles.iconEmoji}>{it.icon}</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* Color */}
            <Text style={[styles.label, { marginTop: 12, color: ui.text }]}>
              Màu sắc
            </Text>
            <View
              style={[
                styles.panel,
                { backgroundColor: ui.card, borderColor: ui.border },
                shadow,
              ]}
            >
              <View style={styles.colorGrid}>
                {CATEGORY_COLORS.map((c) => {
                  const active = c === color;
                  return (
                    <View key={c} style={styles.colorCellWrap}>
                      <Pressable
                        onPress={() => setColor(c)}
                        style={[
                          styles.colorCell,
                          {
                            backgroundColor: c,
                            borderColor: active ? ui.text : "transparent",
                          },
                          active && styles.colorActive,
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.bottomRow}>
              <Pressable
                onPress={() => nav.goBack()}
                style={[styles.bottomBtn, { backgroundColor: GREEN }, shadow]}
              >
                <Text
                  style={[
                    styles.bottomBtnText,
                    { color: isDark ? "#052E1B" : "#0E1B13" },
                  ]}
                >
                  Hủy
                </Text>
              </Pressable>

              <Pressable
                onPress={onSubmit}
                disabled={saving}
                style={[
                  styles.bottomBtn,
                  { backgroundColor: GREEN, opacity: saving ? 0.7 : 1 },
                  shadow,
                ]}
              >
                {saving ? (
                  <ActivityIndicator />
                ) : (
                  <Text
                    style={[
                      styles.bottomBtnText,
                      { color: isDark ? "#052E1B" : "#0E1B13" },
                    ]}
                  >
                    Thêm danh mục
                  </Text>
                )}
              </Pressable>
            </View>

            {/* Modals */}
            <SelectModal
              visible={typeModalOpen}
              title="Chọn loại danh mục"
              items={typeItems}
              selectedValue={type}
              onClose={() => setTypeModalOpen(false)}
              onPick={(v) => {
                setType(v);
                setTypeModalOpen(false);
              }}
            />

            <SelectModal
              visible={parentModalOpen}
              title="Chọn danh mục cha"
              items={parentItems}
              selectedValue={parentId}
              onClose={() => setParentModalOpen(false)}
              onPick={(v) => {
                setParentId(v ?? null);
                setParentModalOpen(false);
              }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  backBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  h1: {
    marginTop: 8,
    fontFamily: "Faustina_700Bold",
    fontSize: 20,
  },
  h2: {
    marginTop: 4,
    fontFamily: "Faustina_500Medium",
  },

  label: {
    marginTop: 12,
    fontFamily: "Faustina_700Bold",
    fontSize: 13,
  },

  input: {
    marginTop: 8,
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderWidth: 1,
  },
  inputText: {
    fontFamily: "Faustina_500Medium",
    fontSize: 13.5,
  },

  select: {
    marginTop: 8,
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
  },
  selectText: {
    fontFamily: "Faustina_500Medium",
    fontSize: 13.5,
  },

  panel: {
    marginTop: 8,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },

  iconGrid: { flexDirection: "row", flexWrap: "wrap" },
  // 6 cột
  iconCellWrap: { width: "16.666%", padding: 6 },
  iconCell: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCellActive: {},

  iconEmoji: {
    width: 28,
    height: 28,
    fontSize: 24,
    textAlign: "center",
  },

  colorGrid: { flexDirection: "row", flexWrap: "wrap" },
  // 8 cột
  colorCellWrap: { width: "12.5%", padding: 6 },
  colorCell: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 2,
  },
  colorActive: {},

  bottomRow: { marginTop: 18, flexDirection: "row", gap: 16 },
  bottomBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBtnText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13,
  },

  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});
