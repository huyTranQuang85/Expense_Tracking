import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
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

const GREEN = "#4EECA5";
const COLORS_2_ROWS = CATEGORY_COLORS.slice(0, 12); // ✅ 2 hàng * 6 cột

function getErrMsg(e: any) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    "Có lỗi xảy ra. Vui lòng thử lại."
  );
}

export default function AddSubCategoryScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { mode } = useTheme();
  const isDark = mode === "dark";

  const parentIdParam = route.params?.parentId ?? null;
  const parentNameParam = route.params?.parentName ?? "";
  const parentTypeParam = route.params?.type as
    | "income"
    | "expense"
    | undefined;

  const ui = useMemo(
    () =>
      !isDark
        ? {
            bg: "#F3F5F7",
            card: "#FFFFFF",
            text: "rgba(0,0,0,0.86)",
            muted: "rgba(0,0,0,0.55)",
            input: "#DADADA",
            border: "rgba(0,0,0,0.08)",
          }
        : {
            bg: "#020617", // slate-950
            card: "rgba(15,23,42,0.96)", // slate-900
            text: "rgba(248,250,252,0.96)", // slate-50
            muted: "rgba(148,163,184,0.95)", // slate-400
            input: "rgba(15,23,42,0.95)", // input bg
            border: "rgba(148,163,184,0.45)",
          },
    [isDark],
  );

  const shadow = isDark ? {} : styles.shadow;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [all, setAll] = useState<Category[]>([]);

  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense" | "">(
    parentTypeParam ?? "",
  );
  const [parentId, setParentId] = useState<any>(parentIdParam); // ✅ auto điền nhưng cho đổi
  const [iconKey, setIconKey] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);

  const [picker, setPicker] = useState<null | "parent">(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const cats = await fetchAllCategories().catch(() => []);
        if (!alive) return;

        setAll(Array.isArray(cats) ? cats : []);

        // infer type từ parent nếu chưa có
        if (!parentTypeParam && parentIdParam != null) {
          const p = (cats as any[]).find(
            (c) => String(c.id) === String(parentIdParam),
          );
          if (p?.type) setType(p.type);
        }
      } catch (e) {
        if (alive) setError(getErrMsg(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [parentIdParam, parentTypeParam]);

  // ✅ list parent cùng type
  const parentItems = useMemo(() => {
    if (!type) return [];
    return all
      .filter((c: any) => c.type === type && c.parentCategoryId == null)
      .map((c: any) => ({ label: c.name, value: c.id }));
  }, [all, type]);

  const parentLabel = useMemo(() => {
    return (
      parentItems.find((x) => String(x.value) === String(parentId))?.label ??
      parentNameParam ??
      ""
    );
  }, [parentItems, parentId, parentNameParam]);

  const typeFieldBg =
    type === "income"
      ? isDark
        ? "rgba(78,236,165,0.22)"
        : "rgba(78,236,165,0.35)"
      : type === "expense"
        ? isDark
          ? "rgba(252,165,165,0.22)"
          : "rgba(252,165,165,0.40)"
        : ui.input;

  const validate = () => {
    if (!name.trim()) return "Vui lòng nhập tên danh mục con";
    if (!type) return "Thiếu loại danh mục";
    if (!parentId) return "Vui lòng chọn danh mục cha";
    return null;
  };

  const onSubmit = async () => {
    const msg = validate();
    if (msg) return setError(msg);

    try {
      setSaving(true);
      setError(null);

      await createCategory({
        name: name.trim(),
        type: type as "income" | "expense",
        parentCategoryId: parentId,
        icon: iconKey ?? null,
        color: color ?? null,
      });

      Toast.show({ type: "success", text1: "Thêm danh mục con thành công" });
      requestAnimationFrame(() => nav.goBack());
    } catch (e) {
      setError(getErrMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const FieldBox = ({
    label,
    value,
    placeholder,
    onPress,
    disabled,
    rightIcon,
    bg,
  }: any) => (
    <View style={{ flex: 1 }}>
      <Text style={[styles.label, { color: ui.text }]}>{label}</Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.select,
          {
            backgroundColor: bg ?? ui.input,
            borderColor: ui.border,
            opacity: disabled ? 0.6 : pressed ? 0.88 : 1,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: "Faustina_600SemiBold",
            color: value ? ui.text : ui.muted,
            fontSize: 13,
          }}
        >
          {value || placeholder}
        </Text>
        {rightIcon}
      </Pressable>
    </View>
  );

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: ui.bg, paddingTop: insets.top + 8 },
      ]}
    >
      <View style={styles.topBar}>
        <Pressable
          onPress={() => nav.goBack()}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Ionicons name="chevron-back" size={26} color={ui.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.h1, { color: ui.text }]}>Thêm danh mục con</Text>
        <Text style={[styles.sub, { color: ui.muted }]}>
          Tạo danh mục con thuộc danh mục cha
        </Text>

        <View style={[styles.card, { backgroundColor: ui.card }, shadow]}>
          {loading ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <>
              <Text style={[styles.label, { color: ui.text }]}>
                Tên danh mục
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: ui.input,
                    borderColor: ui.border,
                  },
                ]}
              >
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Nhập tên danh mục"
                  placeholderTextColor={ui.muted}
                  style={[styles.input, { color: ui.text }]}
                />
              </View>

              <View style={{ height: 12 }} />

              {/* ✅ Type: khóa nhưng UI màu như bạn muốn */}
              <FieldBox
                label="Loại danh mục"
                value={type === "income" ? "Thu nhập" : "Chi tiêu"}
                placeholder=""
                disabled
                bg={typeFieldBg}
                onPress={() => {}}
                rightIcon={
                  <Ionicons name="lock-closed" size={18} color={ui.muted} />
                }
              />

              <View style={{ height: 12 }} />

              {/* ✅ Parent: auto điền nhưng KHÔNG khóa */}
              <FieldBox
                label="Danh mục cha"
                value={parentLabel}
                placeholder="Chọn danh mục cha"
                disabled={!type}
                onPress={() => setPicker("parent")}
                rightIcon={
                  <Ionicons name="chevron-down" size={18} color={ui.muted} />
                }
              />

              <View style={{ height: 14 }} />
              <Text style={[styles.label, { color: ui.text }]}>Icon</Text>

              <View
                style={[
                  styles.panel,
                  {
                    backgroundColor: ui.input,
                    borderColor: ui.border,
                  },
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
                            { opacity: pressed ? 0.85 : 1 },
                          ]}
                        >
                          <Text style={styles.iconEmoji}>{it.icon}</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={{ height: 14 }} />
              <Text style={[styles.label, { color: ui.text }]}>Màu sắc</Text>

              {/* ✅ màu 2 hàng */}
              <View
                style={[
                  styles.panel,
                  {
                    backgroundColor: ui.input,
                    borderColor: ui.border,
                  },
                ]}
              >
                <View style={styles.gridRow}>
                  {COLORS_2_ROWS.map((c) => {
                    const active = c === color;
                    return (
                      <View key={c} style={styles.gridCellWrap}>
                        <Pressable
                          onPress={() => setColor(c)}
                          style={[
                            styles.colorSquare,
                            { backgroundColor: c },
                            active ? styles.colorActive : null,
                          ]}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>

              {error ? (
                <Text style={[styles.err, { color: "#EF4444" }]}>{error}</Text>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.bottomRow}>
          <Pressable
            onPress={() => nav.goBack()}
            style={({ pressed }) => [
              styles.bottomBtn,
              {
                backgroundColor: GREEN,
                opacity: pressed ? 0.88 : 1,
              },
              shadow,
            ]}
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
            disabled={saving || loading}
            style={({ pressed }) => [
              styles.bottomBtn,
              {
                backgroundColor: GREEN,
                opacity: saving || loading ? 0.6 : pressed ? 0.88 : 1,
              },
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
      </ScrollView>

      <SelectModal
        visible={picker === "parent"}
        title="Chọn danh mục cha"
        selectedValue={parentId}
        items={parentItems}
        onClose={() => setPicker(null)}
        onPick={(v) => {
          setParentId(v);
          setPicker(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },
  topBar: { height: 44, justifyContent: "center" },

  h1: { fontFamily: "Faustina_700Bold", fontSize: 20, marginTop: 4 },
  sub: {
    fontFamily: "Faustina_500Medium",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },

  card: { borderRadius: 18, padding: 14 },

  label: { fontFamily: "Faustina_700Bold", fontSize: 13 },

  inputWrap: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: "center",
    marginTop: 6,
  },
  input: { fontFamily: "Faustina_600SemiBold", fontSize: 13 },

  select: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },

  panel: { marginTop: 6, borderRadius: 14, borderWidth: 1, padding: 10 },

  gridRow: { flexDirection: "row", flexWrap: "wrap" },
  gridCellWrap: { width: "16.666%", padding: 6 },

  gridCell: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  gridCellActive: { backgroundColor: "rgba(78,236,165,0.22)" },

  iconEmoji: { width: 28, height: 28, fontSize: 24, textAlign: "center" },

  colorSquare: { width: "100%", aspectRatio: 1, borderRadius: 10 },
  colorActive: { borderWidth: 3, borderColor: "#111" },

  err: { marginTop: 12, fontFamily: "Faustina_600SemiBold" },

  bottomRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  bottomBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBtnText: { fontFamily: "Faustina_700Bold", fontSize: 13 },

  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },

  iconGrid: { flexDirection: "row", flexWrap: "wrap" },
  iconCellWrap: { width: "16.666%", padding: 6 },
  iconCell: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCellActive: { backgroundColor: "rgba(78,236,165,0.22)" },
});
