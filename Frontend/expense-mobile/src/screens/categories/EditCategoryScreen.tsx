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
  updateCategory,
  fetchAllCategories,
} from "../../services/categories";
import { useTheme } from "../../theme/ThemeContext";

const GREEN = "#4EECA5";

// ✅ 2 hàng * 6 cột
const COLORS_2_ROWS = CATEGORY_COLORS.slice(0, 12);

function getErrMsg(e: any) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    "Có lỗi xảy ra"
  );
}

export default function EditCategoryScreen() {
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
            text: "rgba(0,0,0,0.86)",
            muted: "rgba(0,0,0,0.55)",
            border: "rgba(0,0,0,0.08)",
          }
        : {
            bg: "#020617", // slate-950
            card: "rgba(15,23,42,0.96)", // slate-900
            input: "rgba(15,23,42,0.95)",
            text: "rgba(248,250,252,0.96)", // slate-50
            muted: "rgba(148,163,184,0.95)", // slate-400
            border: "rgba(148,163,184,0.45)",
          },
    [isDark],
  );

  const cat: Category | undefined = route.params?.cat;
  const isChild = cat?.parentCategoryId != null;

  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(String(cat?.name ?? ""));
  const [type, setType] = useState<"income" | "expense" | "">(cat?.type ?? "");
  const [iconKey, setIconKey] = useState<string | null>(cat?.icon ?? null);
  const [color, setColor] = useState<string | null>(cat?.color ?? null);

  // ✅ only for child: allow re-parent
  const [all, setAll] = useState<Category[]>([]);
  const [parentId, setParentId] = useState<any>(cat?.parentCategoryId ?? null);

  const [picker, setPicker] = useState<null | "type" | "parent">(null);

  // load categories for parent picker
  useEffect(() => {
    let alive = true;
    (async () => {
      const cats = await fetchAllCategories().catch(() => []);
      if (!alive) return;
      setAll(Array.isArray(cats) ? cats : []);
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

  const typeLabel = useMemo(() => {
    if (type === "income") return "Thu nhập";
    if (type === "expense") return "Chi tiêu";
    return "";
  }, [type]);

  const typeFieldBg = useMemo(() => {
    if (type === "income")
      return isDark ? "rgba(78,236,165,0.22)" : "rgba(78,236,165,0.35)";
    if (type === "expense")
      return isDark ? "rgba(252,165,165,0.22)" : "rgba(252,165,165,0.40)";
    return ui.input;
  }, [type, isDark, ui.input]);

  const parentItems = useMemo(() => {
    if (!type) return [];
    return all
      .filter((c: any) => c.type === type && c.parentCategoryId == null)
      .map((c: any) => ({ label: c.name, value: c.id }));
  }, [all, type]);

  const parentLabel = useMemo(() => {
    if (!parentId) return "";
    return (
      parentItems.find((x) => String(x.value) === String(parentId))?.label ?? ""
    );
  }, [parentItems, parentId]);

  // nếu danh mục cha đổi type => không còn khái niệm parentId
  useEffect(() => {
    if (!isChild) setParentId(null);
  }, [isChild, type]);

  const onSave = async () => {
    if (!cat?.id) return;

    const n = name.trim();
    if (!n) return Alert.alert("Thiếu thông tin", "Vui lòng nhập tên danh mục");
    if (!type)
      return Alert.alert("Thiếu thông tin", "Vui lòng chọn loại danh mục");

    if (isChild && !parentId) {
      return Alert.alert("Thiếu thông tin", "Vui lòng chọn danh mục cha");
    }

    try {
      setSaving(true);

      await updateCategory(cat.id, {
        name: n,
        type,
        parentCategoryId: isChild ? parentId : null,
        icon: iconKey ?? null,
        color: color ?? null,
      });
      Toast.show({
        type: "success",
        text1: "Lưu thay đổi thành công",
      });
      nav.goBack();
    } catch (e) {
      Alert.alert("Không thể lưu", getErrMsg(e));
    } finally {
      setSaving(false);
    }
  };

  if (!cat) {
    return (
      <View
        style={[
          styles.root,
          {
            backgroundColor: ui.bg,
            paddingTop: insets.top,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <Text
          style={{
            fontFamily: "Faustina_700Bold",
            color: ui.text,
          }}
        >
          Thiếu dữ liệu danh mục
        </Text>
        <Pressable onPress={() => nav.goBack()} style={{ marginTop: 12 }}>
          <Text
            style={{
              fontFamily: "Faustina_600SemiBold",
              color: GREEN,
            }}
          >
            Quay lại
          </Text>
        </Pressable>
      </View>
    );
  }

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
        <Pressable
          onPress={() => nav.goBack()}
          hitSlop={10}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color={ui.text} />
        </Pressable>

        <Text style={[styles.h1, { color: ui.text }]}>Chỉnh sửa danh mục</Text>
        <Text style={[styles.h2, { color: ui.muted }]}>
          Chỉnh sửa thông tin danh mục của bạn
        </Text>

        {/* Name */}
        <Text style={[styles.label, { color: ui.text }]}>Tên danh mục</Text>
        <View style={[styles.input, { backgroundColor: ui.input }]}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nhập tên danh mục"
            placeholderTextColor={ui.muted}
            style={[styles.inputText, { color: ui.text }]}
          />
        </View>

        {/* Type (✅ parent đổi được, child khóa) */}
        <Text style={[styles.label, { marginTop: 12, color: ui.text }]}>
          Loại danh mục
        </Text>
        <Pressable
          onPress={() => setPicker("type")}
          disabled={isChild}
          style={[
            styles.select,
            {
              backgroundColor: typeFieldBg,
              opacity: isChild ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.selectText,
              {
                color: type ? ui.text : ui.muted,
              },
            ]}
          >
            {typeLabel || "Chọn loại danh mục"}
          </Text>

          <Ionicons
            name={isChild ? "lock-closed" : "chevron-down"}
            size={16}
            color={ui.muted}
          />
        </Pressable>

        {/* Parent picker (✅ chỉ hiện nếu là child, và KHÔNG khóa) */}
        {isChild ? (
          <>
            <Text style={[styles.label, { marginTop: 12, color: ui.text }]}>
              Danh mục cha
            </Text>
            <Pressable
              onPress={() => setPicker("parent")}
              style={[styles.select, { backgroundColor: ui.input }]}
            >
              <Text
                style={[
                  styles.selectText,
                  {
                    color: parentId ? ui.text : ui.muted,
                  },
                ]}
              >
                {parentLabel || "Chọn danh mục cha"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={ui.muted} />
            </Pressable>
          </>
        ) : null}

        {/* Icon */}
        <Text style={[styles.label, { marginTop: 12, color: ui.text }]}>
          Icon
        </Text>
        <View
          style={[
            styles.panel,
            {
              backgroundColor: ui.card,
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

        {/* Color (✅ 2 hàng đủ màu) */}
        <Text style={[styles.label, { marginTop: 12, color: ui.text }]}>
          Màu sắc
        </Text>
        <View
          style={[
            styles.panel,
            {
              backgroundColor: ui.card,
            },
          ]}
        >
          <View style={styles.colorGrid}>
            {COLORS_2_ROWS.map((c) => {
              const active = c === color;
              return (
                <View key={c} style={styles.colorCellWrap6}>
                  <Pressable
                    onPress={() => setColor(c)}
                    style={[
                      styles.colorCell,
                      { backgroundColor: c },
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
            style={[styles.bottomBtn, { backgroundColor: ui.card }]}
          >
            <Text style={[styles.bottomBtnText, { color: ui.text }]}>Hủy</Text>
          </Pressable>

          <Pressable
            onPress={onSave}
            disabled={saving}
            style={[
              styles.bottomBtn,
              { backgroundColor: GREEN },
              saving ? { opacity: 0.7 } : null,
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
                Lưu thay đổi
              </Text>
            )}
          </Pressable>
        </View>

        {/* Modals */}
        <SelectModal
          visible={picker === "type"}
          title="Chọn loại danh mục"
          items={typeItems}
          selectedValue={type}
          onClose={() => setPicker(null)}
          onPick={(v) => {
            setType(v);
            setPicker(null);
          }}
        />

        <SelectModal
          visible={picker === "parent"}
          title="Chọn danh mục cha"
          items={parentItems}
          selectedValue={parentId}
          onClose={() => setPicker(null)}
          onPick={(v) => {
            setParentId(v);
            setPicker(null);
          }}
        />
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
  },
  inputText: { fontFamily: "Faustina_500Medium" },

  select: {
    marginTop: 8,
    borderRadius: 12,
    height: 42,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: {
    fontFamily: "Faustina_500Medium",
    fontSize: 13,
  },

  panel: {
    marginTop: 8,
    borderRadius: 14,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  iconGrid: { flexDirection: "row", flexWrap: "wrap" },

  // ✅ 6 cột icon
  iconCellWrap: { width: "16.666%", padding: 6 },
  iconCell: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCellActive: { backgroundColor: "rgba(78,236,165,0.22)" },
  iconEmoji: { width: 28, height: 28, fontSize: 24, textAlign: "center" },

  // ✅ 6 cột màu -> 2 hàng (12 màu)
  colorGrid: { flexDirection: "row", flexWrap: "wrap" },
  colorCellWrap6: { width: "16.666%", padding: 6 },
  colorCell: { width: "100%", aspectRatio: 1, borderRadius: 10 },
  colorActive: { borderWidth: 3, borderColor: "#111" },

  bottomRow: { marginTop: 18, flexDirection: "row", gap: 16 },
  bottomBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  bottomBtnText: { fontFamily: "Faustina_700Bold", fontSize: 13 },
});
