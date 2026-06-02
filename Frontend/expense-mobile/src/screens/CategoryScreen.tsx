// src/screens/CategoryScreen.tsx
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
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Toast from "react-native-toast-message";

import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import {
  Category,
  fetchAllCategories,
  deleteCategory,
} from "../services/categories";
import { fetchMe, Me } from "../services/profile";

// ✅ dùng ThemeContext thay vì useColorScheme
import { useTheme } from "../theme/ThemeContext";

const GREEN = "#10B981";
const INCOME_BG = "rgba(110,231,183,0.55)";
const EXPENSE_BG = "rgba(252,165,165,0.55)";

const safeText = (x: any) => String(x ?? "");
const parentIdOf = (c: any) =>
  c?.parentCategoryId ??
  c?.parent_category_id ??
  c?.parentId ??
  c?.parent_id ??
  null;

const colorOf = (c: any) =>
  (c?.color ?? c?.colorHex ?? c?.color_hex ?? "").trim();

const isParent = (c: any) => parentIdOf(c) == null;

const getErrMsg = (e: any) =>
  e?.response?.data?.message ||
  e?.response?.data?.error ||
  e?.message ||
  "Có lỗi xảy ra";

const normalizeColor = (c?: string) => {
  const x = (c || "").trim();
  return x && x.startsWith("#") ? x : x ? `#${x}` : "";
};

function categoryIonIcon(
  type: "income" | "expense" | string,
  name?: string,
): keyof typeof Ionicons.glyphMap {
  const text = safeText(name).toLowerCase();
  if (type === "income") {
    if (text.includes("lương")) return "briefcase-outline";
    if (text.includes("đầu tư")) return "trending-up-outline";
    if (text.includes("thưởng")) return "sparkles-outline";
    return "cash-outline";
  }

  if (text.includes("ăn") || text.includes("uống")) return "restaurant-outline";
  if (text.includes("mua")) return "bag-outline";
  if (text.includes("nhà")) return "home-outline";
  if (text.includes("xe") || text.includes("xăng")) return "car-outline";
  if (text.includes("học")) return "school-outline";
  if (text.includes("sức") || text.includes("thuốc")) return "medkit-outline";
  return "pricetag-outline";
}

export default function CategoryScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();

  // ⭐ LẤY MODE TỪ THEME CONTEXT
  const { mode, colors } = useTheme();
  const isDark = mode === "dark";

  // Enable layout animation on Android
  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // 🎨 Palette theo dark / light, giống style các màn khác
  const ui = useMemo(() => {
    const bg = colors.bg;
    const card = colors.card;
    const text = colors.text;
    const muted = colors.muted;
    const inputBg = isDark ? "rgba(15,23,42,0.9)" : "rgba(148,163,184,0.12)";
    const line = isDark ? "rgba(30,41,59,0.9)" : "rgba(15,23,42,0.08)";
    const subCard = isDark ? "rgba(15,23,42,0.9)" : "rgba(15,23,42,0.03)";
    const stroke = isDark ? "rgba(51,65,85,1)" : "rgba(15,23,42,0.06)";
    return { bg, card, text, muted, inputBg, line, subCard, stroke };
  }, [colors, isDark]);

  const shadow = isDark ? {} : styles.shadow;

  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<Category[]>([]);
  const [tab, setTab] = useState<"income" | "expense">("income");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  // me
  const [me, setMe] = useState<Me | null>(null);
  useMemo(() => me?.user_name || "BestPlace", [me]); // giữ y như code cũ

  // page animation
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(10)).current;
  const pop = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    fade.setValue(0);
    rise.setValue(10);
    pop.setValue(0);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(pop, {
        toValue: 1,
        damping: 14,
        stiffness: 180,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise, pop]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [m, cats] = await Promise.all([fetchMe(), fetchAllCategories()]);
      setMe(m);
      setAll(Array.isArray(cats) ? cats : []);
    } catch (e) {
      Alert.alert("Lỗi", getErrMsg(e));
    } finally {
      setLoading(false);
      animateIn();
    }
  }, [animateIn]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const counts = useMemo(() => {
    const incomeParents = all.filter(
      (c: any) => c.type === "income" && isParent(c)
    ).length;
    const expenseParents = all.filter(
      (c: any) => c.type === "expense" && isParent(c)
    ).length;
    return { incomeParents, expenseParents };
  }, [all]);

  const grouped = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const byType = all.filter((c) => c.type === tab);

    const parents = byType.filter(isParent);
    const children = byType.filter((c) => !isParent(c));

    const childMap = new Map<string, Category[]>();
    for (const ch of children) {
      const pid = String(parentIdOf(ch));
      const arr = childMap.get(pid) ?? [];
      arr.push(ch);
      childMap.set(pid, arr);
    }

    parents.sort((a, b) =>
      safeText(a.name).localeCompare(safeText(b.name), "vi")
    );
    for (const [k, arr] of childMap) {
      arr.sort((a, b) =>
        safeText(a.name).localeCompare(safeText(b.name), "vi")
      );
      childMap.set(k, arr);
    }

    if (!qq) {
      return parents.map((p) => ({
        parent: p,
        children: childMap.get(String(p.id)) ?? [],
      }));
    }

    const result: { parent: Category; children: Category[] }[] = [];
    for (const p of parents) {
      const kids = childMap.get(String(p.id)) ?? [];
      const pMatch = safeText(p.name).toLowerCase().includes(qq);
      const kidMatch = kids.filter((k) =>
        safeText(k.name).toLowerCase().includes(qq)
      );

      if (pMatch) result.push({ parent: p, children: kids });
      else if (kidMatch.length) result.push({ parent: p, children: kidMatch });
    }

    return result;
  }, [all, tab, q]);

  const toggleExpand = (id: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const key = String(id);
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const onPressAddParent = () => {
    nav.navigate("AddCategory", { mode: "parent", type: tab });
  };

  const onPressAddChild = (parent: Category) => {
    nav.navigate("AddSubCategory", {
      parentId: parent.id,
      parentName: parent.name,
      type: parent.type,
    });
  };

  const onPressEdit = (cat: Category) => {
    nav.navigate("EditCategory", { cat });
  };

  const openDelete = (cat: Category) => {
    setDeleteTarget(cat);
    setDeleteOpen(true);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteCategory(deleteTarget.id);
      setDeleteOpen(false);
      setDeleteTarget(null);

      Toast.show({ type: "success", text1: "Xóa danh mục thành công" });
      await load();
    } catch (e) {
      setDeleteOpen(false);
      Alert.alert("Không thể xóa", getErrMsg(e));
    } finally {
      setDeleting(false);
    }
  };

  const searchOpen = q.trim().length > 0;

  return (
    <View style={[styles.root, { backgroundColor: ui.bg }]}>
      <View style={{ height: insets.top, backgroundColor: ui.bg }} />

      <View style={styles.page}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: 10,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{ opacity: fade, transform: [{ translateY: rise }] }}
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.title, { color: ui.text }]}>
                  Danh mục thu chi
                </Text>
                <Text style={[styles.subtitle, { color: ui.muted }]}>
                  Quản lý danh mục và danh mục con
                </Text>
              </View>

              <Pressable
                onPress={onPressAddParent}
                android_ripple={{ color: "rgba(6,59,43,0.12)" }}
                style={({ pressed }) => [
                  styles.addBtn,
                  { opacity: pressed && Platform.OS !== "android" ? 0.92 : 1 },
                ]}
              >
                <Text style={styles.addBtnText}>Thêm danh mục</Text>
              </Pressable>
            </View>

            {/* Search */}
            <View
              style={[styles.searchBox, { backgroundColor: ui.card }, shadow]}
            >
              <View
                style={[
                  styles.searchInner,
                  { backgroundColor: ui.inputBg, borderColor: ui.stroke },
                ]}
              >
                <Ionicons name="search" size={18} color={ui.muted} />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Tìm kiếm danh mục"
                  placeholderTextColor={ui.muted}
                  style={[styles.searchInput, { color: ui.text }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {!!q && (
                  <Pressable onPress={() => setQ("")} hitSlop={10}>
                    <Ionicons name="close-circle" size={18} color={ui.muted} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Tabs */}
            <Animated.View
              style={{
                transform: [
                  {
                    scale: pop.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.99, 1],
                    }),
                  },
                ],
              }}
            >
              <View
                style={[styles.tabsCard, { backgroundColor: ui.card }, shadow]}
              >
                <Pressable
                  onPress={() => setTab("income")}
                  android_ripple={{ color: "rgba(15,23,42,0.06)" }}
                  style={[
                    styles.tabPill,
                    {
                      backgroundColor:
                        tab === "income" ? INCOME_BG : ui.inputBg,
                      borderColor:
                        tab === "income" ? "rgba(16,185,129,0.35)" : ui.stroke,
                    },
                  ]}
                >
                  <Ionicons name="cash-outline" size={18} color={ui.text} />
                  <Text style={[styles.tabText, { color: ui.text }]}>
                    Thu nhập{" "}
                    <Text style={[styles.tabCount, { color: ui.muted }]}>
                      ({counts.incomeParents})
                    </Text>
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setTab("expense")}
                  android_ripple={{ color: "rgba(15,23,42,0.06)" }}
                  style={[
                    styles.tabPill,
                    {
                      backgroundColor:
                        tab === "expense" ? EXPENSE_BG : ui.inputBg,
                      borderColor:
                        tab === "expense" ? "rgba(239,68,68,0.28)" : ui.stroke,
                    },
                  ]}
                >
                  <Ionicons name="card-outline" size={18} color={ui.text} />
                  <Text style={[styles.tabText, { color: ui.text }]}>
                    Chi tiêu{" "}
                    <Text style={[styles.tabCount, { color: ui.muted }]}>
                      ({counts.expenseParents})
                    </Text>
                  </Text>
                </Pressable>
              </View>
            </Animated.View>

            {/* List card */}
            <View
              style={[styles.listCard, { backgroundColor: ui.card }, shadow]}
            >
              {loading ? (
                <View style={{ paddingVertical: 18 }}>
                  <ActivityIndicator />
                </View>
              ) : grouped.length === 0 ? (
                <Text style={[styles.empty, { color: ui.muted }]}>
                  Chưa có danh mục nào
                </Text>
              ) : (
                <View>
                  {grouped.map(({ parent, children }) => {
                    const pColor = normalizeColor(colorOf(parent)) || "#CBD5E1";
                    const pIcon = categoryIonIcon(parent.type, parent.name);

                    const isOpen = searchOpen
                      ? true
                      : !!expanded[String(parent.id)];

                    return (
                      <View key={String(parent.id)} style={styles.groupBlock}>
                        {/* Parent card */}
                        <View
                          style={[
                            styles.parentCard,
                            {
                              backgroundColor: ui.subCard,
                              borderColor: ui.stroke,
                              borderTopColor: pColor,
                              borderLeftColor: pColor,
                            },
                          ]}
                        >
                          <Pressable
                            onPress={() => toggleExpand(parent.id)}
                            hitSlop={8}
                            style={({ pressed }) => [
                              styles.expandBtn,
                              pressed && { opacity: 0.8 },
                              {
                                backgroundColor: isDark
                                  ? "rgba(15,23,42,0.7)"
                                  : "rgba(15,23,42,0.05)",
                              },
                            ]}
                          >
                            <Ionicons
                              name={isOpen ? "chevron-down" : "chevron-forward"}
                              size={18}
                              color={ui.muted}
                            />
                          </Pressable>

                          <View
                            style={[
                              styles.iconCircle,
                              {
                                backgroundColor: pColor,
                                borderColor: isDark
                                  ? "rgba(15,23,42,0.8)"
                                  : "rgba(255,255,255,0.55)",
                              },
                            ]}
                          >
                            <Ionicons name={pIcon} size={20} color="#FFFFFF" />
                          </View>

                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              style={[styles.parentName, { color: ui.text }]}
                              numberOfLines={1}
                            >
                              {safeText(parent.name)}
                            </Text>
                            <Text
                              style={[styles.parentSub, { color: ui.muted }]}
                            >
                              {children.length} danh mục con
                            </Text>
                          </View>

                          <View style={styles.parentActions}>
                            <Pressable
                              onPress={() => onPressAddChild(parent)}
                              hitSlop={10}
                              android_ripple={{
                                color: "rgba(37,99,235,0.12)",
                                borderless: true,
                              }}
                              style={styles.actionIconWrap}
                            >
                              <Ionicons name="add" size={20} color="#2563EB" />
                            </Pressable>

                            <Pressable
                              onPress={() => onPressEdit(parent)}
                              hitSlop={10}
                              android_ripple={{
                                color: "rgba(15,23,42,0.10)",
                                borderless: true,
                              }}
                              style={styles.actionIconWrap}
                            >
                              <Ionicons
                                name="create-outline"
                                size={18}
                                color={ui.muted}
                              />
                            </Pressable>

                            <Pressable
                              onPress={() => openDelete(parent)}
                              hitSlop={10}
                              android_ripple={{
                                color: "rgba(239,68,68,0.12)",
                                borderless: true,
                              }}
                              style={styles.actionIconWrap}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={18}
                                color="#EF4444"
                              />
                            </Pressable>
                          </View>
                        </View>

                        {/* Children */}
                        {isOpen ? (
                          <View
                            style={[
                              styles.childrenWrap,
                              {
                                borderColor: ui.stroke,
                                backgroundColor: isDark
                                  ? "rgba(15,23,42,0.85)"
                                  : "rgba(255,255,255,0.02)",
                              },
                            ]}
                          >
                            {children.map((c) => {
                              const cColor =
                                normalizeColor(colorOf(c)) || pColor;
                              const cIcon = categoryIonIcon(c.type, c.name);
                              return (
                                <View
                                  key={String(c.id)}
                                  style={[
                                    styles.childRow,
                                    { borderTopColor: ui.line },
                                  ]}
                                >
                                  <View style={styles.childIndent} />

                                  <View
                                    style={[
                                      styles.iconCircleSmall,
                                      {
                                        backgroundColor: cColor,
                                        borderColor: ui.stroke,
                                      },
                                    ]}
                                  >
                                    <Ionicons name={cIcon} size={17} color="#FFFFFF" />
                                  </View>

                                  <Text
                                    style={[
                                      styles.childName,
                                      { color: ui.text },
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {safeText(c.name)}
                                  </Text>

                                  <View style={styles.childActions}>
                                    <Pressable
                                      onPress={() => onPressEdit(c)}
                                      hitSlop={10}
                                      android_ripple={{
                                        color: "rgba(15,23,42,0.10)",
                                        borderless: true,
                                      }}
                                      style={styles.actionIconWrap}
                                    >
                                      <Ionicons
                                        name="create-outline"
                                        size={18}
                                        color={ui.muted}
                                      />
                                    </Pressable>

                                    <Pressable
                                      onPress={() => openDelete(c)}
                                      hitSlop={10}
                                      android_ripple={{
                                        color: "rgba(239,68,68,0.12)",
                                        borderless: true,
                                      }}
                                      style={styles.actionIconWrap}
                                    >
                                      <Ionicons
                                        name="trash-outline"
                                        size={18}
                                        color="#EF4444"
                                      />
                                    </Pressable>
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </View>

      <ConfirmDeleteModal
        visible={deleteOpen}
        title="Xóa danh mục"
        message={`Bạn chắc chắn muốn xóa "${deleteTarget?.name ?? ""}"?`}
        deleting={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={doDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  page: {
    flex: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 16,
  },

  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  title: { fontFamily: "Faustina_700Bold", fontSize: 22 },
  subtitle: {
    marginTop: 6,
    fontFamily: "Faustina_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },

  addBtn: {
    backgroundColor: GREEN,
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: Platform.OS === "android" ? 4 : 0,
  },
  addBtnText: {
    fontFamily: "Faustina_700Bold",
    color: "#063B2B",
    fontSize: 13.5,
  },

  searchBox: { marginTop: 14, borderRadius: 18, padding: 12 },
  searchInner: {
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontFamily: "Faustina_500Medium", fontSize: 13.5 },

  tabsCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 10,
    flexDirection: "row",
    gap: 10,
  },
  tabPill: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  tabText: { fontFamily: "Faustina_700Bold", fontSize: 13 },
  tabCount: { fontFamily: "Faustina_600SemiBold" },

  listCard: { marginTop: 12, borderRadius: 18, padding: 12 },

  groupBlock: { marginBottom: 12 },

  parentCard: {
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },

  expandBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  parentName: { fontFamily: "Faustina_700Bold", fontSize: 14 },
  parentSub: {
    fontFamily: "Faustina_400Regular",
    fontSize: 12.5,
    marginTop: 2,
  },

  parentActions: { flexDirection: "row", alignItems: "center", gap: 6 },

  actionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  childrenWrap: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingBottom: 6,
  },

  childRow: {
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  childIndent: { width: 26 },

  iconCircleSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  childName: { flex: 1, fontFamily: "Faustina_600SemiBold", fontSize: 13 },

  childActions: { flexDirection: "row", alignItems: "center", gap: 6 },

  empty: {
    textAlign: "center",
    paddingVertical: 18,
    fontFamily: "Faustina_500Medium",
  },
});
