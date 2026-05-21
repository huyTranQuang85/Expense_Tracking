// src/components/AppToast.tsx
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AppToast({
  visible,
  message,
  type = "success",
  duration = 1600,
  onHide,
}: {
  visible: boolean;
  message: string;
  type?: "success" | "error";
  duration?: number;
  onHide: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    if (!visible) return;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -10,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onHide();
      });
    }, duration);

    return () => clearTimeout(t);
  }, [visible, duration, onHide, opacity, translateY]);

  if (!visible) return null;

  const isSuccess = type === "success";

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        style={[styles.box, isSuccess ? styles.successBox : styles.errorBox]}
      >
        <View style={styles.iconWrap}>
          <Ionicons
            name={isSuccess ? "checkmark-circle" : "warning"}
            size={20}
            color={isSuccess ? "#4ADE80" : "#F97373"}
          />
        </View>

        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    zIndex: 999,
    alignItems: "center",
  },
  box: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    minWidth: "70%",
    maxWidth: "92%",

    // shadow
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  successBox: {
    backgroundColor: "#022C22",
    borderLeftWidth: 3,
    borderLeftColor: "#22C55E",
  },
  errorBox: {
    backgroundColor: "#450A0A",
    borderLeftWidth: 3,
    borderLeftColor: "#F97373",
  },
  iconWrap: {
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontFamily: "Faustina_600SemiBold",
    color: "#F9FAFB",
    fontSize: 13.5,
  },
});
