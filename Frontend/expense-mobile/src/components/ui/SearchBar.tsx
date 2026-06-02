import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { fonts } from "../../theme/tokens";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
};

export default function SearchBar({ value, onChangeText, placeholder, onClear }: Props) {
  const { mode, colors } = useTheme();
  const isDark = mode === "dark";

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.card,
          borderColor: colors.stroke,
          shadowOpacity: isDark ? 0 : 0.06,
        },
      ]}
    >
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.text }]}
      />
      {!!value && (
        <Pressable onPress={onClear} hitSlop={10}>
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#0F172A",
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
  },
});
