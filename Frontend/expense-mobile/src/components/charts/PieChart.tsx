import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, G } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

type Slice = {
  value: number;
  color: string;
  label: string;
  icon?: string;
};

type Props = {
  data: Slice[];
  size?: number;
  innerRadius?: number;
  showLegend?: boolean;
  centerLabel?: string;
  currencyFormatter?: (n: number) => string;
};

const COLORS = [
  "#FF6B6B", "#F97316", "#FBBF24", "#22C55E",
  "#06B6D4", "#8B5CF6", "#EC4899", "#6366F1",
  "#14B8A6", "#F43F5E", "#0EA5E9", "#A855F7",
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeDonutSlice(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startAngle: number, endAngle: number
) {
  // Handle nearly full circle
  if (endAngle - startAngle >= 359.99) {
    const s = polarToCartesian(cx, cy, outerR, 0);
    const e = polarToCartesian(cx, cy, outerR, 359.99);
    const is = polarToCartesian(cx, cy, innerR, 0);
    const ie = polarToCartesian(cx, cy, innerR, 359.99);
    return [
      `M ${s.x} ${s.y}`,
      `A ${outerR} ${outerR} 0 1 0 ${e.x} ${e.y}`,
      `A ${outerR} ${outerR} 0 1 0 ${s.x} ${s.y} Z`,
      `M ${is.x} ${is.y}`,
      `A ${innerR} ${innerR} 0 1 1 ${ie.x} ${ie.y}`,
      `A ${innerR} ${innerR} 0 1 1 ${is.x} ${is.y} Z`,
    ].join(" ");
  }
  const start = polarToCartesian(cx, cy, outerR, endAngle);
  const end = polarToCartesian(cx, cy, outerR, startAngle);
  const iStart = polarToCartesian(cx, cy, innerR, startAngle);
  const iEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${start.x} ${start.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${end.x} ${end.y}`,
    `L ${iEnd.x} ${iEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${iStart.x} ${iStart.y}`,
    "Z",
  ].join(" ");
}

function fmtVnd(n: number) {
  const abs = Math.abs(Number(n || 0));
  try {
    return new Intl.NumberFormat("vi-VN").format(abs) + "đ";
  } catch {
    return `${abs}đ`;
  }
}

export default function PieChart({
  data,
  size = 130,
  innerRadius,
  showLegend = true,
  centerLabel,
  currencyFormatter,
}: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 14,
        stiffness: 160,
        mass: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [data, fadeAnim, scaleAnim]);

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  const slices = useMemo(() => {
    if (total === 0) return [];
    const nonZero = data.filter((d) => d.value > 0);
    let angle = 0;
    return nonZero.map((d, i) => {
      const sweep = (d.value / total) * 360;
      const slice = {
        ...d,
        color: d.color || COLORS[i % COLORS.length],
        startAngle: angle,
        endAngle: angle + sweep,
      };
      angle += sweep;
      return slice;
    });
  }, [data, total]);

  const outerR = size / 2 - 2;
  // Default inner = 55% of outer → ring thickness = 45% of outer radius
  const innerR = innerRadius ?? Math.round(outerR * 0.55);

  if (total === 0) {
    return (
      <View style={[styles.emptyBox, { width: size, height: size }]}>
        <Ionicons name="pie-chart-outline" size={36} color="rgba(148,163,184,0.3)" />
        <Text style={styles.emptyText}>Không có dữ liệu</Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Donut Chart - LEFT */}
      <View style={styles.donutContainer}>
        <Svg width={size} height={size}>
          <G>
            {slices.map((s, i) => (
              <Path
                key={i}
                d={describeDonutSlice(
                  size / 2, size / 2,
                  outerR, innerR,
                  s.startAngle, s.endAngle
                )}
                fill={s.color}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={2}
              />
            ))}
          </G>
        </Svg>
      </View>

      {/* Legend - RIGHT */}
      {showLegend && (
        <View style={styles.legend}>
          {slices.map((s, i) => {
            const amount = currencyFormatter
              ? currencyFormatter(s.value)
              : fmtVnd(s.value);
            return (
              <View key={i} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: s.color }]} />
                <Text style={styles.legendLabel} numberOfLines={1}>
                  {s.label}
                </Text>
                <Text style={styles.legendAmount}>{amount}</Text>
              </View>
            );
          })}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  donutContainer: {
    flexShrink: 0,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontFamily: "Faustina_500Medium",
    fontSize: 13,
    color: "rgba(148,163,184,0.6)",
  },
  legend: {
    flex: 1,
    gap: 12,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontFamily: "Faustina_600SemiBold",
    fontSize: 14,
    color: "#1E293B",
    lineHeight: 18,
  },
  legendAmount: {
    fontFamily: "Faustina_700Bold",
    fontSize: 14.5,
    color: "#0F172A",
  },
});