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
import { CATEGORY_COLORS, CATEGORY_ICONS } from "../../constants/categoryPicker";
import type { RootStackParamList } from "../../../App";
import { useWallets } from "./WalletContext";

type Props = NativeStackScreenProps<RootStackParamList, "WalletForm">;

function formatCurrencyInput(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("vi-VN") : "";
}

function formatCurrency(value: number) {
  try {
    return `${new Intl.NumberFormat("vi-VN").format(Math.abs(value || 0))}đ`;
  } catch {
    return `${Math.abs(value || 0)}đ`;
  }
}

export default function WalletFormScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const { saveWallet, getWallet } = useWallets();

  const mode = route.params?.mode ?? "create";
  const walletId = route.params?.walletId;
  const editing = mode === "edit" && !!walletId;
  const current = editing ? getWallet(walletId) : null;

  const [name, setName] = useState(current?.name ?? "Ví chính");
  const [balanceText, setBalanceText] = useState(
    current ? String(current.balance.toLocaleString("vi-VN")) : "0",
  );
  const [description, setDescription] = useState(current?.description ?? "");
  const [icon, setIcon] = useState(current?.icon ?? CATEGORY_ICONS[0]?.icon ?? "💰");
  const [color, setColor] = useState(current?.color ?? CATEGORY_COLORS[0]);

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
            green: "#2EC98E",
          }
        : {
            bg: "#F4F6FA",
            card: "#FFFFFF",
            cardSoft: "#F8FAFC",
            text: "#111827",
            muted: "rgba(55,65,81,0.72)",
            stroke: "rgba(15,23,42,0.08)",
            green: "#2EC98E",
          },
    [isDark],
  );

  const normalizedBalance = Number(balanceText.replace(/[^\d]/g, "") || 0);

  const onSubmit = () => {
    if (!name.trim()) {
      Alert.alert("Thiếu tên ví", "Vui lòng nhập tên ví trước khi lưu.");
      return;
    }

    saveWallet({
      id: current?.id,
      name,
      description,
      icon,
      color,
      type: current?.type ?? "standard",
      balance: normalizedBalance,
    });

    navigation.navigate("WalletList");
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
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.stroke,
              opacity: pressed ? 0.86 : 1,
            },
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>

        <Text style={[styles.title, { color: colors.text }]}>
          {editing ? "Cập nhật ví" : "Thêm ví mới"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Tạo ví mới để quản lý nguồn tiền
        </Text>

        <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: color }]}> 
          <View style={[styles.previewIcon, { backgroundColor: color }]}> 
            <Text style={styles.previewIconText}>{icon}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.previewName, { color: colors.text }]} numberOfLines={1}>
              {name.trim() || "Ví mới"}
            </Text>
            <Text style={[styles.previewDesc, { color: colors.muted }]} numberOfLines={1}>
              {description.trim() || "Mô tả (tùy chọn)"}
            </Text>
          </View>
          <Text style={[styles.previewBalance, { color }]}>{formatCurrency(normalizedBalance)}</Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card }]}> 
          <Text style={[styles.label, { color: colors.text }]}>Tên ví</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ví chính"
            placeholderTextColor={colors.muted}
            style={[styles.input, { backgroundColor: colors.cardSoft, color: colors.text, borderColor: colors.stroke }]}
          />

          <Text style={[styles.label, { color: colors.text }]}>Số dư ban đầu</Text>
          <View style={[styles.input, styles.moneyInputWrap, { backgroundColor: colors.cardSoft, borderColor: colors.stroke }]}> 
            <Text style={[styles.moneyPrefix, { color: colors.muted }]}>đ</Text>
            <TextInput
              value={balanceText}
              onChangeText={(text) => setBalanceText(formatCurrencyInput(text))}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.muted}
              style={[styles.moneyInput, { color: colors.text }]}
            />
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Mô tả</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Mô tả ví (tùy chọn)"
            placeholderTextColor={colors.muted}
            style={[styles.input, { backgroundColor: colors.cardSoft, color: colors.text, borderColor: colors.stroke }]}
          />

          <Text style={[styles.label, { color: colors.text }]}>Icon</Text>
          <View style={[styles.gridPanel, { backgroundColor: colors.cardSoft, borderColor: colors.stroke }]}> 
            {CATEGORY_ICONS.slice(0, 12).map((item) => {
              const active = icon === item.icon;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setIcon(item.icon)}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    {
                      borderColor: active ? color : colors.stroke,
                      backgroundColor: active ? "rgba(46,201,142,0.16)" : colors.card,
                      opacity: pressed ? 0.82 : 1,
                    },
                  ]}
                >
                  <Text style={styles.iconText}>{item.icon}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Màu sắc</Text>
          <View style={[styles.gridPanel, { backgroundColor: colors.cardSoft, borderColor: colors.stroke }]}> 
            {CATEGORY_COLORS.map((item) => {
              const active = color === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setColor(item)}
                  style={({ pressed }) => [
                    styles.colorBtn,
                    {
                      borderColor: active ? colors.text : "transparent",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={[styles.colorSwatch, { backgroundColor: item }]} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.footerRow}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              styles.footerBtn,
              {
                backgroundColor: color,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <Text style={styles.footerBtnText}>Hủy</Text>
          </Pressable>

          <Pressable
            onPress={onSubmit}
            style={({ pressed }) => [
              styles.footerBtn,
              {
                backgroundColor: colors.green,
                opacity: pressed ? 0.86 : 1,
              },
            ]}
          >
            <Text style={styles.footerBtnText}>{editing ? "Lưu ví" : "Thêm ví"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: {
    marginTop: 12,
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { marginTop: 14, fontFamily: "Faustina_700Bold", fontSize: 32 },
  subtitle: { marginTop: 4, fontFamily: "Faustina_400Regular", fontSize: 14 },
  previewCard: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 2,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  previewIconText: { fontSize: 22 },
  previewName: { fontFamily: "Faustina_700Bold", fontSize: 22 },
  previewDesc: { marginTop: 2, fontFamily: "Faustina_500Medium", fontSize: 13 },
  previewBalance: { fontFamily: "Faustina_700Bold", fontSize: 18 },
  formCard: { marginTop: 14, borderRadius: 20, padding: 14 },
  label: { marginTop: 10, marginBottom: 8, fontFamily: "Faustina_700Bold", fontSize: 14 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: "Faustina_500Medium",
    fontSize: 14,
  },
  moneyInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moneyPrefix: { fontFamily: "Faustina_700Bold", fontSize: 14 },
  moneyInput: { flex: 1, fontFamily: "Faustina_500Medium", fontSize: 14 },
  gridPanel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  iconBtn: {
    width: 52,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 20 },
  colorBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  footerRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  footerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  footerBtnText: { fontFamily: "Faustina_700Bold", color: "#0E1B13", fontSize: 14 },
});
