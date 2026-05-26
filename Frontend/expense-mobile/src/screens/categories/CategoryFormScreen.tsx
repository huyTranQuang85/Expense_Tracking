import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategoriesStackParamList } from "./CategoriesNavigator";
import { useCategories } from "./CategoriesContext";
import {
  CategoryNode,
  CategoryType,
  getAvailableColorItems,
  getAvailableIconItems,
  getCategoryById,
  getRootCategories,
  normalizeCategoryType,
  resolveCategoryIcon,
} from "./categoryFixtures";

type Props = NativeStackScreenProps<CategoriesStackParamList, "CategoryForm">;

const TYPE_OPTIONS: Array<{ key: CategoryType; label: string; emoji: string }> =
  [
    { key: "income", label: "Thu nhập", emoji: "💰" },
    { key: "expense", label: "Chi tiêu", emoji: "🪙" },
  ];

function getDefaultFormValues(
  current?: CategoryNode | null,
  parent?: CategoryNode | null,
) {
  return {
    name: current?.name ?? "",
    type: current?.type ?? parent?.type ?? "expense",
    parentId:
      current?.parentId !== undefined
        ? current.parentId
        : parent?.id ?? null,
    iconKey: current?.iconKey ?? "resume",
    color: current?.color ?? "#2EC98E",
  };
}

export default function CategoryFormScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const { categories, getCategory, createCategory, updateCategory } =
    useCategories();

  const mode = route.params?.mode ?? "create";
  const categoryId = route.params?.categoryId;
  const current = getCategory(categoryId);
  const parent = mode === "create" ? getCategory(categoryId) : null;

  const initialValues = useMemo(
    () => getDefaultFormValues(current, parent),
    [current, parent],
  );

  const [name, setName] = useState(initialValues.name);
  const [type, setType] = useState<CategoryType>(initialValues.type);
  const [parentId, setParentId] = useState<string | null>(initialValues.parentId);
  const [iconKey, setIconKey] = useState(initialValues.iconKey);
  const [color, setColor] = useState(initialValues.color);

  const colors = useMemo(
    () =>
      isDark
        ? {
            bg: "#0B0F14",
            card: "#111827",
            cardSoft: "#172032",
            text: "#F5F7FA",
            muted: "rgba(226,232,240,0.68)",
            stroke: "rgba(148,163,184,0.22)",
            green: "#4EECA5",
            danger: "#FB7185",
          }
        : {
            bg: "#F4F6FA",
            card: "#FFFFFF",
            cardSoft: "#F8FAFC",
            text: "#111827",
            muted: "rgba(55,65,81,0.72)",
            stroke: "rgba(15,23,42,0.08)",
            green: "#2EC98E",
            danger: "#EF4444",
          },
    [isDark],
  );

  const rootOptions = getRootCategories(type, categories).filter(
    (item) => item.id !== current?.id,
  );
  const iconOptions = getAvailableIconItems().slice(0, 18);
  const colorOptions = getAvailableColorItems().slice(0, 12);

  const submitLabel =
    mode === "edit" ? "Cập nhật danh mục" : parent ? "Tạo danh mục con" : "Tạo danh mục";

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Thiếu tên", "Vui lòng nhập tên danh mục.");
      return;
    }

    const payload = {
      name: trimmedName,
      type: normalizeCategoryType(type),
      parentId,
      iconKey,
      color,
    };

    if (mode === "edit" && current) {
      updateCategory({ ...payload, id: current.id });
      navigation.goBack();
      return;
    }

    const created = createCategory(payload);
    navigation.replace("CategoryDetail", { categoryId: created.id });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={{ height: insets.top, backgroundColor: colors.bg }} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.stroke,
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>

          <Text style={[styles.pageTitle, { color: colors.text }]}>
            {mode === "edit" ? "Chỉnh sửa danh mục" : "Thêm danh mục"}
          </Text>

          <View style={{ width: 44 }} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>Tên danh mục</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nhập tên danh mục"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.cardSoft },
            ]}
          />

          <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
            Loại danh mục
          </Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map((item) => {
              const active = type === item.key;
              const locked = mode === "edit" && current?.type === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => !locked && setType(item.key)}
                  style={({ pressed }) => [
                    styles.typeBtn,
                    {
                      backgroundColor: active
                        ? item.key === "income"
                          ? "rgba(78,236,165,0.18)"
                          : "rgba(251,207,213,0.78)"
                        : colors.cardSoft,
                      borderColor: active
                        ? item.key === "income"
                          ? colors.green
                          : "rgba(244,114,182,0.5)"
                        : colors.stroke,
                      opacity: pressed ? 0.92 : locked ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={styles.typeEmoji}>{item.emoji}</Text>
                  <Text style={[styles.typeText, { color: colors.text }]}>
                    {item.label}
                  </Text>
                  {locked ? (
                    <Ionicons name="lock-closed" size={14} color={colors.muted} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
            Danh mục cha
          </Text>
          <View style={styles.parentList}>
            <Pressable
              onPress={() => setParentId(null)}
              style={({ pressed }) => [
                styles.parentItem,
                {
                  backgroundColor: parentId === null ? colors.green : colors.cardSoft,
                  borderColor: colors.stroke,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              <Text style={[styles.parentText, { color: colors.text }]}>
                Không có danh mục cha
              </Text>
            </Pressable>

            {rootOptions.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setParentId(item.id)}
                style={({ pressed }) => [
                  styles.parentItem,
                  {
                    backgroundColor:
                      parentId === item.id ? colors.green : colors.cardSoft,
                    borderColor: colors.stroke,
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
              >
                <Text style={styles.parentEmoji}>
                  {resolveCategoryIcon(item.iconKey)}
                </Text>
                <Text style={[styles.parentText, { color: colors.text }]}>
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
            Icon
          </Text>
          <View style={styles.grid}>
            {iconOptions.map((item) => {
              const active = iconKey === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setIconKey(item.key)}
                  style={({ pressed }) => [
                    styles.gridItem,
                    {
                      backgroundColor: active ? colors.green : colors.cardSoft,
                      borderColor: active ? colors.green : colors.stroke,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text style={styles.gridEmoji}>{resolveCategoryIcon(item.key)}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
            Màu sắc
          </Text>
          <View style={styles.colorGrid}>
            {colorOptions.map((item) => {
              const active = color === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setColor(item)}
                  style={({ pressed }) => [
                    styles.colorItem,
                    {
                      backgroundColor: item,
                      borderColor: active ? colors.text : "rgba(0,0,0,0.08)",
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: colors.green,
              opacity: pressed ? 0.86 : 1,
            },
          ]}
        >
          <Text style={styles.submitText}>{submitLabel}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: {
    marginTop: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Faustina_700Bold",
    fontSize: 18,
  },
  card: {
    borderRadius: 22,
    padding: 16,
  },
  label: {
    fontFamily: "Faustina_700Bold",
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontFamily: "Faustina_500Medium",
    fontSize: 14,
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  typeEmoji: { fontSize: 16 },
  typeText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13,
  },
  parentList: {
    gap: 10,
  },
  parentItem: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  parentEmoji: {
    fontSize: 18,
  },
  parentText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridItem: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gridEmoji: {
    fontSize: 22,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorItem: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 2,
  },
  submitBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontFamily: "Faustina_700Bold",
    color: "#FFFFFF",
    fontSize: 14,
  },
});
