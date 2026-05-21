import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";

type Item = { label: string; value: any; subLabel?: string };

export default function SelectModal({
  visible,
  title,
  items,
  selectedValue,
  onClose,
  onPick,
}: {
  visible: boolean;
  title: string;
  items: Item[];
  selectedValue?: any;
  onClose: () => void;
  onPick: (value: any) => void;
}) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  const cardBg = isDark ? "rgba(20, 32, 60, 0.97)" : "#FFFFFF"; // slate-900 vs white
  const text = isDark ? "rgba(248,250,252,0.96)" : "rgba(15,23,42,0.94)";
  const muted = isDark ? "rgba(148,163,184,0.96)" : "rgba(100,116,139,1)";
  const overlayBg = isDark ? "rgba(15,23,42,0.75)" : "rgba(15,23,42,0.45)";
  const activeBg = isDark
    ? "rgba(34,197,94,0.20)" // emerald-500
    : "rgba(78,236,165,0.18)";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: overlayBg }]}
        onPress={onClose}
      >
        <Pressable
          style={[styles.sheet, { backgroundColor: cardBg }]}
          onPress={() => {}}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: text }]}>{title}</Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={[styles.close, { color: muted }]}>Đóng</Text>
            </Pressable>
          </View>

          <ScrollView
            style={{ maxHeight: 360 }}
            showsVerticalScrollIndicator={true}
          >
            {items.map((it) => {
              const active = String(it.value) === String(selectedValue);
              return (
                <Pressable
                  key={String(it.value)}
                  onPress={() => onPick(it.value)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      opacity: pressed ? 0.85 : 1,
                      backgroundColor: active ? activeBg : "transparent",
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.label, { color: text }]}
                      numberOfLines={1}
                    >
                      {it.label}
                    </Text>
                    {it.subLabel ? (
                      <Text
                        style={[styles.subLabel, { color: muted }]}
                        numberOfLines={1}
                      >
                        {it.subLabel}
                      </Text>
                    ) : null}
                  </View>
                  {active ? (
                    <Text style={[styles.tick, { color: text }]}>✓</Text>
                  ) : null}
                </Pressable>
              );
            })}
            {items.length === 0 ? (
              <Text style={[styles.empty, { color: muted }]}>
                Không có dữ liệu
              </Text>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  sheet: { borderRadius: 18, padding: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: { fontFamily: "Faustina_700Bold", fontSize: 16 },
  close: { fontFamily: "Faustina_600SemiBold", fontSize: 13 },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  label: { fontFamily: "Faustina_700Bold", fontSize: 13.5 },
  subLabel: { fontFamily: "Faustina_500Medium", fontSize: 12, marginTop: 2 },
  tick: { fontFamily: "Faustina_700Bold", fontSize: 16, paddingHorizontal: 6 },
  empty: {
    textAlign: "center",
    paddingVertical: 18,
    fontFamily: "Faustina_500Medium",
  },
});
