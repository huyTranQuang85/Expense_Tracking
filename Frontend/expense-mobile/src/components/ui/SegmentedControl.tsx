import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { fonts, fontSizes, radii } from "../../theme/tokens";

type SegmentItem = {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

type Props = {
  items: SegmentItem[];
  value: string;
  onChange: (key: string) => void;
};

export default function SegmentedControl({ items, value, onChange }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.soft, borderColor: colors.stroke }]}
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={({ pressed }) => [
              styles.item,
              {
                backgroundColor: active ? colors.primary : "transparent",
                borderColor: active ? colors.primary : "transparent",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            {item.icon ? (
              <Ionicons
                name={item.icon}
                size={16}
                color={active ? "#0B1A12" : colors.muted}
                style={{ marginRight: 6 }}
              />
            ) : null}
            <Text
              style={[
                styles.label,
                { color: active ? "#0B1A12" : colors.text },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 4,
    gap: 6,
  },
  item: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: fontSizes.sm,
  },
});
