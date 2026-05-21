import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

const GREEN = "#4EECA5";
const RED = "#EF4444";

export default function ConfirmDeleteModal({
  visible,
  title,
  message,
  deleting,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  deleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDark = useColorScheme() === "dark";
  const cardBg = isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF";
  const text = isDark ? "rgba(255,255,255,0.92)" : "#111";
  const muted = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.6)";

  const canClose = !deleting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (canClose) onCancel();
      }}
    >
      <Pressable
        style={styles.overlay}
        onPress={() => {
          if (canClose) onCancel();
        }}
      >
        <Pressable
          style={[styles.card, { backgroundColor: cardBg }]}
          onPress={() => {}}
        >
          <Text style={[styles.title, { color: text }]}>{title}</Text>
          <Text style={[styles.message, { color: muted }]}>{message}</Text>

          <View style={styles.row}>
            <Pressable
              onPress={onCancel}
              disabled={!canClose}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: GREEN },
                (!canClose || pressed) && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.btnText}>Hủy</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={!canClose}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: RED },
                (!canClose || pressed) && { opacity: 0.8 },
              ]}
            >
              {deleting ? (
                <ActivityIndicator />
              ) : (
                <Text style={[styles.btnText, { color: "#fff" }]}>Xóa</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 18,
    padding: 16,
  },
  title: {
    fontFamily: "Faustina_700Bold",
    fontSize: 16,
  },
  message: {
    marginTop: 8,
    fontFamily: "Faustina_500Medium",
    lineHeight: 18,
  },
  row: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  btn: {
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
  btnText: {
    fontFamily: "Faustina_700Bold",
    color: "#0E1B13",
  },
});
