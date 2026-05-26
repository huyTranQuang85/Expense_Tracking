import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

export default function TypingDots() {
  const a = useRef(new Animated.Value(0.2)).current;
  const b = useRef(new Animated.Value(0.2)).current;
  const c = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const pulse = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.2,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
      );

    const A = pulse(a, 0);
    const B = pulse(b, 120);
    const C = pulse(c, 240);

    A.start();
    B.start();
    C.start();

    return () => {
      A.stop();
      B.stop();
      C.stop();
    };
  }, [a, b, c]);

  return (
    <View style={styles.row}>
      <Animated.View style={[styles.dot, { opacity: a }]} />
      <Animated.View style={[styles.dot, { opacity: b }]} />
      <Animated.View style={[styles.dot, { opacity: c }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, paddingVertical: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#98A2B3" },
});
