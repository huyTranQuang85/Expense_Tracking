import React, { useMemo, useState } from "react";
import {
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
  getChildCategories,
  getDemoStats,
  getRootCategories,
  resolveCategoryIcon,
} from "./categoryFixtures";

type Props = NativeStackScreenProps<CategoriesStackParamList, "CategoriesList">;

const TAB_ORDER: Array<"income" | "expense"> = ["income", "expense"];

function getFallbackDescription(item: CategoryNode, childCount: number) {
  if (item.description) return item.description;
  return `${childCount} danh mục con`;
}

export default function CategoriesListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"income" | "expense">(
    "income",
  );
  const { categories } = useCategories();

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
            greenSoft: "rgba(78,236,165,0.18)",
            pinkSoft: "rgba(244,114,182,0.18)",
          }
        : {
            bg: "#F4F6FA",
            card: "#FFFFFF",
            cardSoft: "#F8FAFC",
            text: "#111827",
            muted: "rgba(55,65,81,0.72)",
            stroke: "rgba(15,23,42,0.08)",
            green: "#2EC98E",
            greenSoft: "rgba(78,236,165,0.18)",
            pinkSoft: "rgba(251,207,213,0.78)",
          },
    [isDark],
  );

  const stats = getDemoStats(categories);

  const roots = useMemo(() => {
    const base = getRootCategories(selectedType, categories);
    const q = query.trim().toLowerCase();

    return base.filter((item) => {
      if (!q) return true;
      const childCount = getChildCategories(item.id, categories).length;
      return (
        item.name.toLowerCase().includes(q) ||
        getFallbackDescription(item, childCount).toLowerCase().includes(q)
      );
    });
  }, [query, selectedType, categories]);

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
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>
              Danh mục thu chi
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Quản lý danh mục và danh mục con
            </Text>
          </View>

          <Pressable
            onPress={() => navigation.navigate("CategoryForm", { mode: "create" })}
            style={({ pressed }: { pressed: boolean }) => [
              styles.addBtn,
              {
                backgroundColor: colors.green,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <Text style={styles.addBtnText}>Thêm danh mục</Text>
          </Pressable>
        </View>

        <View style={[styles.searchCard, { backgroundColor: colors.card }]}>
          <View
            style={[
              styles.searchBox,
              { backgroundColor: colors.cardSoft, borderColor: colors.stroke },
            ]}
          >
            <Ionicons name="search-outline" size={20} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm kiếm danh mục"
              placeholderTextColor={colors.muted}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>

          <View style={styles.toggleRow}>
            {TAB_ORDER.map((type: "income" | "expense") => {
              const active = selectedType === type;
              const label = type === "income" ? "Thu nhập (1)" : "Chi tiêu (1)";
              const icon = type === "income" ? "💰" : "🪙";
              return (
                <Pressable
                  key={type}
                  onPress={() => setSelectedType(type)}
                  style={({ pressed }: { pressed: boolean }) => [
                    styles.toggleBtn,
                    {
                      backgroundColor: active
                        ? type === "income"
                          ? colors.greenSoft
                          : colors.pinkSoft
                        : colors.cardSoft,
                      borderColor: active
                        ? type === "income"
                          ? colors.green
                          : "rgba(244,114,182,0.5)"
                        : colors.stroke,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text style={styles.toggleEmoji}>{icon}</Text>
                  <Text style={[styles.toggleText, { color: colors.text }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.floatChatWrap}>
          <Pressable
            onPress={() =>
              navigation.navigate("CategoryDetail", { categoryId: "an-uong" })
            }
            style={({ pressed }: { pressed: boolean }) => [
              styles.floatChatBtn,
              {
                backgroundColor: colors.green,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={24}
              color="#fff"
            />
          </Pressable>
        </View>

        <View style={[styles.listCard, { backgroundColor: colors.card }]}>
          <View
            style={[
              styles.listOuter,
              {
                borderColor: colors.stroke,
                backgroundColor: colors.cardSoft,
              },
            ]}
          >
            {roots.map((item: CategoryNode) => {
              const childCount = getChildCategories(item.id, categories).length;

              return (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    navigation.navigate("CategoryDetail", { categoryId: item.id })
                  }
                  style={({ pressed }: { pressed: boolean }) => [
                    styles.categoryRow,
                    {
                      borderColor: item.color,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() =>
                      navigation.navigate("CategoryDetail", { categoryId: item.id })
                    }
                    style={({ pressed }: { pressed: boolean }) => [
                      styles.expandBtn,
                      {
                        backgroundColor: colors.cardSoft,
                        borderColor: colors.stroke,
                        opacity: pressed ? 0.86 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="chevron-down" size={18} color={colors.muted} />
                  </Pressable>

                  <View style={[styles.iconWrap, { backgroundColor: item.color }]}>
                    <Text style={styles.iconText}>
                      {resolveCategoryIcon(item.iconKey)}
                    </Text>
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[styles.itemTitle, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[styles.itemSub, { color: colors.muted }]}
                      numberOfLines={1}
                    >
                      {getFallbackDescription(item, childCount)}
                    </Text>
                  </View>

                  <View style={styles.actionCol}>
                    <Pressable
                      onPress={() =>
                        navigation.navigate("CategoryForm", {
                          mode: "create",
                          categoryId: item.id,
                        })
                      }
                      hitSlop={10}
                      style={({ pressed }: { pressed: boolean }) => [
                        styles.iconAction,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Ionicons name="add" size={24} color="#3B82F6" />
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        navigation.navigate("CategoryForm", {
                          mode: "edit",
                          categoryId: item.id,
                        })
                      }
                      hitSlop={10}
                      style={({ pressed }: { pressed: boolean }) => [
                        styles.iconAction,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Ionicons name="create-outline" size={20} color="#64748B" />
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        navigation.navigate("CategoryDetail", { categoryId: item.id })
                      }
                      hitSlop={10}
                      style={({ pressed }: { pressed: boolean }) => [
                        styles.iconAction,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}

            {roots.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="folder-open-outline" size={54} color={colors.muted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Không tìm thấy danh mục
                </Text>
                <Text style={[styles.emptySub, { color: colors.muted }]}>
                  Thử đổi từ khóa hoặc chuyển sang tab khác.
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.footerStats}>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>
              {stats.totalRoots}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              Tổng danh mục gốc
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>
              {stats.incomeRoots}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              Thu nhập
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.statNum, { color: colors.text }]}>
              {stats.expenseRoots}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              Chi tiêu
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 12,
  },
  title: {
    fontFamily: "Faustina_700Bold",
    fontSize: 26,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: "Faustina_500Medium",
    fontSize: 13,
  },
  addBtn: {
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  addBtnText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13,
    color: "#FFFFFF",
  },

  searchCard: {
    marginTop: 14,
    borderRadius: 22,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Faustina_500Medium",
    fontSize: 14,
  },

  toggleRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  toggleEmoji: {
    fontSize: 18,
  },
  toggleText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 13,
  },

  floatChatWrap: {
    position: "absolute",
    right: 10,
    top: 186,
    zIndex: 10,
  },
  floatChatBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },

  listCard: {
    marginTop: 14,
    borderRadius: 22,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  listOuter: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },

  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#FFF",
    borderWidth: 2,
    marginBottom: 12,
  },
  expandBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 22,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  itemTitle: {
    fontFamily: "Faustina_700Bold",
    fontSize: 14,
  },
  itemSub: {
    marginTop: 2,
    fontFamily: "Faustina_500Medium",
    fontSize: 12,
  },
  actionCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconAction: {
    padding: 2,
  },

  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    paddingHorizontal: 10,
  },
  // icon empty state dùng Ionicons để tránh require()
  emptyTitle: {
    fontFamily: "Faustina_700Bold",
    fontSize: 16,
    textAlign: "center",
  },
  emptySub: {
    marginTop: 4,
    fontFamily: "Faustina_500Medium",
    fontSize: 12.5,
    textAlign: "center",
  },

  footerStats: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  statNum: {
    fontFamily: "Faustina_700Bold",
    fontSize: 18,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: "Faustina_500Medium",
    fontSize: 11.5,
  },
});
