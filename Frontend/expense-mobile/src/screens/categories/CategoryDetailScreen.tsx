import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CategoriesStackParamList } from "./CategoriesNavigator";
import {
  buildCategoryDescription,
  getAvailableColorItems,
  getAvailableIconItems,
  getCategoryById,
  getChildCategories,
  getRootCategories,
  resolveCategoryIcon,
} from "./categoryFixtures";
import { useCategories } from "./CategoriesContext";

type Props = NativeStackScreenProps<
  CategoriesStackParamList,
  "CategoryDetail"
>;

export default function CategoryDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const { categories, deleteCategory } = useCategories();

  const categoryId = route.params?.categoryId ?? "an-uong";
  const category = getCategoryById(categoryId, categories);
  const children = getChildCategories(categoryId, categories);

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

  const iconCount = getAvailableIconItems().length;
  const colorCount = getAvailableColorItems().length;
  const parent = category?.parentId
    ? getCategoryById(category.parentId, categories)
    : null;
  const siblingCount = parent
    ? getChildCategories(parent.id, categories).length
    : getRootCategories(category?.type, categories).length;

  if (!category) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <View style={{ height: insets.top, backgroundColor: colors.bg }} />
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Không tìm thấy danh mục
          </Text>
          <Text style={[styles.emptySub, { color: colors.muted }]}>
            Danh mục đã bị xóa hoặc không tồn tại.
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.backBtn,
              {
                backgroundColor: colors.green,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <Text style={styles.backBtnText}>Quay lại</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
              styles.iconBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.stroke,
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={() =>
              navigation.navigate("CategoryForm", {
                mode: "edit",
                categoryId: category.id,
              })
            }
            style={({ pressed }) => [
              styles.smallAction,
              {
                backgroundColor: colors.card,
                borderColor: colors.stroke,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <Ionicons name="create-outline" size={16} color={colors.text} />
            <Text style={[styles.smallActionText, { color: colors.text }]}>
              Chỉnh sửa
            </Text>
          </Pressable>
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.card }]}>
          <View style={[styles.heroIcon, { backgroundColor: category.color }]}>
            <Text style={styles.heroEmoji}>
              {resolveCategoryIcon(category.iconKey)}
            </Text>
          </View>

          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {category.name}
          </Text>

          <Text style={[styles.heroSub, { color: colors.muted }]}>
            {category.description || buildCategoryDescription(children.length)}
          </Text>

          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    category.type === "income" ? "rgba(78,236,165,0.18)" : "rgba(251,207,213,0.78)",
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: colors.text }]}>
                {category.type === "income" ? "Thu nhập" : "Chi tiêu"}
              </Text>
            </View>

            <View
              style={[
                styles.badge,
                { backgroundColor: colors.cardSoft, borderColor: colors.stroke },
              ]}
            >
              <Text style={[styles.badgeText, { color: colors.text }]}>
                {children.length} danh mục con
              </Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={[styles.infoBox, { backgroundColor: colors.cardSoft }]}>
              <Text style={[styles.infoNum, { color: colors.text }]}>
                {iconCount}
              </Text>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>
                icon có sẵn
              </Text>
            </View>
            <View style={[styles.infoBox, { backgroundColor: colors.cardSoft }]}>
              <Text style={[styles.infoNum, { color: colors.text }]}>
                {colorCount}
              </Text>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>
                màu có sẵn
              </Text>
            </View>
            <View style={[styles.infoBox, { backgroundColor: colors.cardSoft }]}>
              <Text style={[styles.infoNum, { color: colors.text }]}>
                {siblingCount}
              </Text>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>
                cùng cấp
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Thông tin danh mục
          </Text>

          <View style={styles.rowInfo}>
            <Text style={[styles.rowLabel, { color: colors.muted }]}>
              Danh mục cha
            </Text>
            <Text style={[styles.rowValue, { color: colors.text }]}>
              {parent?.name ?? "Không có"}
            </Text>
          </View>

          <View style={styles.rowInfo}>
            <Text style={[styles.rowLabel, { color: colors.muted }]}>Icon</Text>
            <Text style={[styles.rowValue, { color: colors.text }]}>
              {resolveCategoryIcon(category.iconKey)}
            </Text>
          </View>

          <View style={styles.rowInfo}>
            <Text style={[styles.rowLabel, { color: colors.muted }]}>Màu</Text>
            <View
              style={[
                styles.colorPreview,
                { backgroundColor: category.color || colors.green },
              ]}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Danh mục con
            </Text>

            <Pressable
              onPress={() =>
                navigation.navigate("CategoryForm", {
                  mode: "create",
                  categoryId: category.id,
                })
              }
              style={({ pressed }) => [
                styles.inlineBtn,
                {
                  backgroundColor: colors.green,
                  opacity: pressed ? 0.86 : 1,
                },
              ]}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.inlineBtnText}>Thêm con</Text>
            </Pressable>
          </View>

          {children.length > 0 ? (
            children.map((child) => (
              <Pressable
                key={child.id}
                onPress={() =>
                  navigation.navigate("CategoryDetail", { categoryId: child.id })
                }
                style={({ pressed }) => [
                  styles.childRow,
                  {
                    backgroundColor: colors.cardSoft,
                    borderColor: colors.stroke,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={[styles.childIcon, { backgroundColor: child.color }]}>
                  <Text style={styles.childEmoji}>
                    {resolveCategoryIcon(child.iconKey)}
                  </Text>
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.childTitle, { color: colors.text }]}>
                    {child.name}
                  </Text>
                  <Text style={[styles.childSub, { color: colors.muted }]}>
                    {child.description || "Danh mục con"}
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    navigation.navigate("CategoryForm", {
                      mode: "edit",
                      categoryId: child.id,
                    })
                  }
                  hitSlop={10}
                >
                  <Ionicons name="create-outline" size={20} color={colors.muted} />
                </Pressable>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyChildren}>
              <Text style={[styles.emptyChildrenTitle, { color: colors.text }]}>
                Chưa có danh mục con
              </Text>
              <Text style={[styles.emptyChildrenSub, { color: colors.muted }]}>
                Bấm “Thêm con” để tạo danh mục nhỏ cho nhóm này.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={() =>
              navigation.navigate("CategoryForm", {
                mode: "create",
                categoryId: category.id,
              })
            }
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: colors.green,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <Text style={styles.actionBtnText}>Thêm danh mục con</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              deleteCategory(category.id);
              navigation.goBack();
            }}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: colors.danger,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <Text style={styles.actionBtnText}>Xóa danh mục</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  smallAction: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  smallActionText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13,
  },

  heroCard: {
    marginTop: 14,
    borderRadius: 22,
    padding: 18,
    alignItems: "center",
  },
  heroIcon: {
    width: 74,
    height: 74,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  heroEmoji: {
    fontSize: 30,
  },
  heroTitle: {
    marginTop: 14,
    fontFamily: "Faustina_700Bold",
    fontSize: 26,
    textAlign: "center",
  },
  heroSub: {
    marginTop: 6,
    fontFamily: "Faustina_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  badgeRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  badge: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 12.5,
  },
  infoGrid: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  infoBox: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  infoNum: {
    fontFamily: "Faustina_700Bold",
    fontSize: 18,
  },
  infoLabel: {
    marginTop: 2,
    fontFamily: "Faustina_500Medium",
    fontSize: 11.5,
    textAlign: "center",
  },

  section: {
    marginTop: 14,
    borderRadius: 22,
    padding: 16,
  },
  sectionTitle: {
    fontFamily: "Faustina_700Bold",
    fontSize: 16,
  },
  rowInfo: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  rowLabel: {
    fontFamily: "Faustina_500Medium",
    fontSize: 13,
  },
  rowValue: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13,
  },
  colorPreview: {
    width: 34,
    height: 34,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  inlineBtn: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inlineBtnText: {
    fontFamily: "Faustina_700Bold",
    color: "#fff",
    fontSize: 12.5,
  },
  childRow: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  childIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  childEmoji: {
    fontSize: 20,
  },
  childTitle: {
    fontFamily: "Faustina_700Bold",
    fontSize: 14,
  },
  childSub: {
    marginTop: 2,
    fontFamily: "Faustina_500Medium",
    fontSize: 12,
  },
  emptyChildren: {
    paddingVertical: 18,
    alignItems: "center",
  },
  emptyChildrenTitle: {
    fontFamily: "Faustina_700Bold",
    fontSize: 15,
  },
  emptyChildrenSub: {
    marginTop: 4,
    fontFamily: "Faustina_500Medium",
    fontSize: 12.5,
    textAlign: "center",
  },

  actionsRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontFamily: "Faustina_700Bold",
    color: "#FFFFFF",
    fontSize: 13.5,
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: "Faustina_700Bold",
    fontSize: 18,
    textAlign: "center",
  },
  emptySub: {
    marginTop: 6,
    fontFamily: "Faustina_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  backBtn: {
    marginTop: 16,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: {
    fontFamily: "Faustina_700Bold",
    color: "#fff",
    fontSize: 13,
  },
});
