import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createCategory, updateCategory } from "../services/categories";

type RootStackParamList = {
  Home: undefined;
  Categories: undefined;
  AddCategory: { parentId?: string | number } | undefined;
};

export default function AddEditCategoryScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, "AddCategory">) {
  const parentId = route?.params?.parentId;
  const [name, setName] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");

  useEffect(() => {
    if (parentId) setType("expense");
  }, [parentId]);

  const onSave = async () => {
    try {
      await createCategory({ name, type, parentCategoryId: parentId });
    } catch (e) {
      // ignore
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{parentId ? "Thêm danh mục con" : "Thêm danh mục"}</Text>
      <TextInput placeholder="Tên danh mục" value={name} onChangeText={setName} style={styles.input} />

      <View style={{ flexDirection: "row", gap: 8, marginVertical: 12 }}>
        <Pressable onPress={() => setType("expense")} style={[styles.typeBtn, type === "expense" ? styles.typeActive : null]}>
          <Text>Chi tiêu</Text>
        </Pressable>
        <Pressable onPress={() => setType("income")} style={[styles.typeBtn, type === "income" ? styles.typeActive : null]}>
          <Text>Thu nhập</Text>
        </Pressable>
      </View>

      <Pressable onPress={onSave} style={styles.saveBtn}>
        <Text style={{ color: "#fff" }}>Lưu</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F3F5F7" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  input: { backgroundColor: "#fff", padding: 12, borderRadius: 10 },
  typeBtn: { padding: 10, backgroundColor: "#fff", borderRadius: 8 },
  typeActive: { backgroundColor: "#D1FAE5" },
  saveBtn: { marginTop: 20, backgroundColor: "#10B981", padding: 12, borderRadius: 10, alignItems: "center" },
});
