import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop, Line, G, Text as SvgText } from "react-native-svg";

type Bar = {
  label: string;
  value: number;
  color?: string;
  gradient?: [string, string];
};

type Props = {
  data: Bar[];
  height?: number;
  barWidth?: number;
  showValues?: boolean;
  unit?: string;
  gridLines?: number;
};

const DEFAULT_GRADIENT: [string, string] = ["#10B981", "#059669"];

function fmtShort(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "tr";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return n.toLocaleString("vi-VN");
}

export default function BarChart({
  data,
  height = 180,
  barWidth = 32,
  showValues = true,
  unit = "đ",
  gridLines = 3,
}: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 1,
        damping: 14,
        stiffness: 120,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [data, fadeAnim, slideAnim]);

  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);

  const chartWidth = data.length * (barWidth + 14) + 20;
  const padding = { top: 8, bottom: 28, left: 0, right: 0 };
  const drawHeight = height - padding.top - padding.bottom;

  const gridValues = useMemo(() => {
    const vals: number[] = [];
    for (let i = 1; i <= gridLines; i++) {
      vals.push((maxValue / gridLines) * i);
    }
    return vals;
  }, [maxValue, gridLines]);

  if (data.length === 0) {
    return (
      <View style={[styles.emptyBox, { height }]}>
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
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          }],
        },
      ]}
    >
      <Svg width={chartWidth} height={height}>
        {gridValues.map((val, i) => {
          const y = height - padding.bottom - (val / maxValue) * drawHeight;
          return (
            <G key={i}>
              <Line
                x1={10}
                y1={y}
                x2={chartWidth - 10}
                y2={y}
                stroke="rgba(148,163,184,0.08)"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            </G>
          );
        })}

        {data.map((bar, i) => {
          const barH = Math.max((bar.value / maxValue) * drawHeight, 3);
          const x = 10 + i * (barWidth + 14);
          const y = height - padding.bottom - barH;

          return (
            <G key={i}>
              <Defs>
                <LinearGradient
                  id={`barGrad_${i}`}
                  x1="0%"
                  y1="100%"
                  x2="0%"
                  y2="0%"
                >
                  <Stop
                    offset="0%"
                    stopColor={bar.gradient?.[1] || bar.color || DEFAULT_GRADIENT[1]}
                    stopOpacity="1"
                  />
                  <Stop
                    offset="100%"
                    stopColor={bar.gradient?.[0] || bar.color || DEFAULT_GRADIENT[0]}
                    stopOpacity="1"
                  />
                </LinearGradient>
              </Defs>

              {/* Bar shadow */}
              <Rect
                x={x + 2}
                y={y + 2}
                width={barWidth}
                height={barH}
                rx={barWidth / 2}
                ry={barWidth / 2}
                fill="rgba(0,0,0,0.15)"
                opacity={0.3}
              />

              {/* Main bar */}
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={barWidth / 2}
                ry={barWidth / 2}
                fill={`url(#barGrad_${i})`}
              />

              {/* Top highlight cap */}
              {barH > 6 && (
                <Rect
                  x={x + 2}
                  y={y}
                  width={barWidth - 4}
                  height={4}
                  rx={2}
                  ry={2}
                  fill="rgba(255,255,255,0.25)"
                />
              )}

              {/* Label */}
              <SvgText
                x={x + barWidth / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize={10}
                fill="rgba(148,163,184,0.9)"
                fontFamily="Faustina_600SemiBold"
              >
                {bar.label}
              </SvgText>

              {/* Value pill */}
              {showValues && barH > 20 && (
                <G>
                  <Rect
                    x={x + barWidth / 2 - 16}
                    y={y - 18}
                    width={32}
                    height={16}
                    rx={8}
                    ry={8}
                    fill={bar.gradient?.[0] || bar.color || DEFAULT_GRADIENT[0]}
                    opacity={0.2}
                  />
                  <SvgText
                    x={x + barWidth / 2}
                    y={y - 7}
                    textAnchor="middle"
                    fontSize={9}
                    fill="rgba(148,163,184,0.9)"
                    fontFamily="Faustina_700Bold"
                  >
                    {fmtShort(bar.value)}
                  </SvgText>
                </G>
              )}
            </G>
          );
        })}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    paddingVertical: 8,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: "Faustina_500Medium",
    fontSize: 12,
    color: "rgba(148,163,184,0.6)",
  },
});