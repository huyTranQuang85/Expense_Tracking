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
import { LinearGradient } from "expo-linear-gradient";

export function GreenBlob() {
  return (
    <LinearGradient
      colors={["rgba(16,185,129,0.26)", "rgba(37,99,235,0.12)", "transparent"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.accentPanel}
    />
  );
}

export function BackCircle({ onPress }: { onPress: () => void }) {
  const isDark = useColorScheme() === "dark";
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.backCircle,
        {
          backgroundColor: isDark ? "rgba(15,23,42,0.76)" : "#FFFFFF",
          borderColor: isDark ? "rgba(148,163,184,0.26)" : "rgba(15,23,42,0.08)",
        },
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
          borderColor: isDark ? "rgba(148,163,184,0.24)" : "rgba(15,23,42,0.08)",
          color: isDark ? "white" : "#111",
          shadowOpacity: isDark ? 0 : 0.06,
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
  accentPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 260,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: "Faustina_600SemiBold",
    fontSize: 16,
    marginBottom: 6,
  },
  input: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontFamily: "Faustina_400Regular",
    fontSize: 14,
    shadowColor: "#000",
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  primaryBtn: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
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
