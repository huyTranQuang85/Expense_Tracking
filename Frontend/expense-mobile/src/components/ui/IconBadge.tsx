import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
};

export default function IconBadge({
  icon,
  size = 36,
  color,
  backgroundColor,
  style,
}: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor ?? colors.soft,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.52)} color={color ?? colors.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
});
