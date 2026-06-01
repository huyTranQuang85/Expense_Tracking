import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { fontSizes, fonts, radii } from "../../theme/tokens";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type Props = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  disabled,
  loading,
  fullWidth,
  style,
}: Props) {
  const { mode, colors } = useTheme();
  const isDark = mode === "dark";

  const palette = {
    primary: {
      bg: colors.primary,
      border: colors.primary,
      text: "#0B1A12",
    },
    secondary: {
      bg: colors.card,
      border: colors.stroke,
      text: colors.text,
    },
    ghost: {
      bg: "transparent",
      border: "transparent",
      text: colors.text,
    },
    danger: {
      bg: colors.danger,
      border: colors.danger,
      text: "#FFFFFF",
    },
  }[variant];

  const sizing = {
    sm: { height: 36, fontSize: fontSizes.sm, paddingHorizontal: 14 },
    md: { height: 46, fontSize: fontSizes.md, paddingHorizontal: 16 },
    lg: { height: 54, fontSize: fontSizes.lg, paddingHorizontal: 18 },
  }[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          height: sizing.height,
          paddingHorizontal: sizing.paddingHorizontal,
          opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
          shadowOpacity: isDark ? 0 : 0.08,
          width: fullWidth ? "100%" : "auto",
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={palette.text} />
        ) : (
          <>
            {icon ? (
              <Ionicons
                name={icon}
                size={18}
                color={palette.text}
                style={styles.icon}
              />
            ) : null}
            <Text style={[styles.text, { color: palette.text, fontSize: sizing.fontSize }]}
              numberOfLines={1}
            >
              {title}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  text: {
    fontFamily: fonts.semibold,
  },
  icon: {
    marginRight: 2,
  },
});
