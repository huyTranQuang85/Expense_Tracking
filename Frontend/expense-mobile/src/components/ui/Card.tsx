import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { radii } from "../../theme/tokens";

type CardVariant = "default" | "soft" | "outlined";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: CardVariant;
};

export default function Card({ children, style, variant = "default" }: Props) {
  const { mode, colors } = useTheme();
  const isDark = mode === "dark";

  const background =
    variant === "soft" ? colors.soft : variant === "outlined" ? "transparent" : colors.card;

  const borderColor = variant === "outlined" ? colors.stroke : colors.stroke;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: background,
          borderColor,
          shadowOpacity: isDark ? 0 : 0.08,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#0F172A",
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
});
