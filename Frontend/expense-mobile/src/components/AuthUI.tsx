import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function GreenBlob() {
  return <View style={styles.blob} />;
}

export function BackCircle({ onPress }: { onPress: () => void }) {
  const isDark = useColorScheme() === "dark";
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.backCircle,
        { borderColor: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" },
      ]}
    >
      <Ionicons
        name="chevron-back"
        size={18}
        color={isDark ? "white" : "black"}
      />
    </Pressable>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  const isDark = useColorScheme() === "dark";
  return (
    <Text
      style={[
        styles.label,
        { color: isDark ? "rgba(255,255,255,0.88)" : "#222" },
      ]}
    >
      {children}
    </Text>
  );
}

export function Field(props: React.ComponentProps<typeof TextInput>) {
  const isDark = useColorScheme() === "dark";
  return (
    <TextInput
      placeholderTextColor={
        isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)"
      }
      style={[
        styles.input,
        {
          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "white",
          borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)",
          color: isDark ? "white" : "#111",
          shadowOpacity: isDark ? 0 : 0.18,
        },
      ]}
      {...props}
    />
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryBtn,
        { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={styles.primaryBtnText}>{title}</Text>
    </Pressable>
  );
}

export function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    right: -120,
    top: -110,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: "#BFF5B6",
  },
  backCircle: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1.6,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: "Faustina_600SemiBold",
    fontSize: 16,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: "Faustina_400Regular",
    fontSize: 14,
    shadowColor: "#000",
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  primaryBtn: {
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4EECA5",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  primaryBtnText: {
    fontFamily: "Faustina_700Bold",
    fontSize: 16,
    color: "#0E1B13",
  },
  error: {
    marginTop: 6,
    color: "#FF5C5C",
    fontFamily: "Faustina_500Medium",
    fontSize: 12.5,
  },
});
