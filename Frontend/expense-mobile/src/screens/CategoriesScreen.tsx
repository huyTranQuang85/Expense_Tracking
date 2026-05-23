import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { fetchAllCategories, Category, deleteCategory } from "../services/categories";

type RootStackParamList = {
  Home: undefined;
  Categories: undefined;
  AddCategory: { parentId?: string | number } | undefined;
};

export default function CategoriesScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Categories">) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Category[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const list = await fetchAllCategories().catch(() => []);
        if (!alive) return;
        setItems(list || []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const roots = useMemo(() => items.filter(c => c.parentCategoryId == null && c.type === type), [items, type]);

  const childrenOf = (id: string | number) => items.filter(c => String(c.parentCategoryId) === String(id));

  const onDelete = async (id: string | number) => {
    try {
      await deleteCategory(id).catch(() => null);
      setItems(prev => prev.filter(p => String(p.id) !== String(id)));
    } catch {
      // ignore
    }
  };

  const renderItem = ({ item }: { item: Category }) => {
    const isExpanded = !!expanded[String(item.id)];
    const kids = childrenOf(item.id);
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconBox}><Text>{item.icon ?? "🔘"}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{kids.length} danh mục con</Text>
          </View>
          <Pressable onPress={() => setExpanded(s => ({ ...s, [String(item.id)]: !isExpanded }))} style={styles.iconBtn}>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#0E1B13" />
          </Pressable>
        </View>

        {isExpanded && (
          <View style={styles.children}>
            {kids.map(k => (
              <View key={String(k.id)} style={styles.childRow}>
                <Text style={styles.childName}>{k.name}</Text>
                <View style={styles.childActions}>
                  <Pressable onPress={() => navigation.navigate("AddCategory", { parentId: k.id })} style={styles.smallBtn}>
                    <Ionicons name="add" size={16} color="#fff" />
                  </Pressable>
                  <Pressable onPress={() => navigation.navigate("AddCategory", { parentId: k.parentCategoryId })} style={[styles.smallBtn, { backgroundColor: "#6ee7b7" }]}>
                    <Ionicons name="create" size={16} color="#063" />
                  </Pressable>
                  <Pressable onPress={() => onDelete(k.id)} style={[styles.smallBtn, { backgroundColor: "#fee2e2" }]}>
                    <Ionicons name="trash" size={16} color="#b91c1c" />
                  </Pressable>
                </View>
              </View>
            ))}
            <View style={styles.childAddRow}>
              <Pressable onPress={() => navigation.navigate("AddCategory", { parentId: item.id })} style={styles.addChildBtn}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={{ marginLeft: 8, color: "#fff" }}>Thêm danh mục con</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Danh mục thu chi</Text>
        <Pressable onPress={() => navigation.navigate("AddCategory") } style={styles.addBtn}>
          <Text style={{ color: "#063" }}>Thêm danh mục</Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <TextInput placeholder="Tìm kiếm danh mục" value={q} onChangeText={setQ} style={styles.searchInput} />
      </View>

      <View style={styles.tabRow}>
        <Pressable onPress={() => setType("income")} style={[styles.tab, type === "income" ? styles.tabActive : null]}>
          <Text style={type === "income" ? styles.tabTextActive : styles.tabText}>Thu nhập</Text>
        </Pressable>
        <Pressable onPress={() => setType("expense")} style={[styles.tab, type === "expense" ? styles.tabActive : null]}>
          <Text style={type === "expense" ? styles.tabTextActive : styles.tabText}>Chi tiêu</Text>
        </Pressable>
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
        <FlatList data={roots.filter(r => r.name.toLowerCase().includes(q.trim().toLowerCase()))} keyExtractor={i => String(i.id)} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 120 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F3F5F7" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  addBtn: { backgroundColor: "#D1FAE5", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 22 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", padding: 10, borderRadius: 12, marginBottom: 12 },
  searchInput: { marginLeft: 8, flex: 1 },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: "#fff", alignItems: "center" },
  tabActive: { backgroundColor: "#D1FAE5" },
  tabText: { color: "#374151" },
  tabTextActive: { color: "#065f46", fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center" },
  iconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#E6F9F0", alignItems: "center", justifyContent: "center", marginRight: 10 },
  name: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 12, color: "#6B7280" },
  iconBtn: { padding: 6 },
  children: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  childRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  childName: { color: "#111827" },
  childActions: { flexDirection: "row" },
  smallBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: "#10B981", alignItems: "center", justifyContent: "center", marginLeft: 8 },
  childAddRow: { marginTop: 8, alignItems: "flex-end" },
  addChildBtn: { backgroundColor: "#10B981", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, flexDirection: "row", alignItems: "center" },
});
