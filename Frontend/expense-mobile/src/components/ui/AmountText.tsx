import React, { useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fontSizes, fonts } from "../../theme/tokens";

type Props = {
  value: number;
  currency?: string;
  emphasize?: boolean;
  showSign?: boolean;
};

function formatMoney(value: number, currency: string) {
  const abs = Math.abs(Number(value || 0));
  try {
    return new Intl.NumberFormat("vi-VN").format(abs) + currency;
  } catch {
    return `${abs}${currency}`;
  }
}

export default function AmountText({
  value,
  currency = "đ",
  emphasize,
  showSign = true,
}: Props) {
  const { colors } = useTheme();
  const isIncome = value >= 0;

  const text = useMemo(() => {
    const prefix = showSign ? (isIncome ? "+" : "-") : "";
    return `${prefix}${formatMoney(value, currency)}`;
  }, [currency, isIncome, showSign, value]);

  return (
    <Text
      style={[
        styles.base,
        {
          color: isIncome ? colors.income : colors.expense,
          fontSize: emphasize ? fontSizes.lg : fontSizes.md,
        },
      ]}
      numberOfLines={1}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fonts.bold,
  },
});
