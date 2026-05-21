import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ToastConfig } from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";

type Variant = "success" | "error";

function BaseToastCard({
  text1,
  variant,
}: {
  text1?: string;
  variant: Variant;
}) {
  const isSuccess = variant === "success";

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.card, isSuccess ? styles.cardSuccess : styles.cardError]}
      >
        <View
          style={[
            styles.leftAccent,
            { backgroundColor: isSuccess ? "#22C55E" : "#F97373" },
          ]}
        />

        <View style={styles.iconWrap}>
          <Ionicons
            name={isSuccess ? "checkmark-circle" : "alert-circle"}
            size={20}
            color={isSuccess ? "#4ADE80" : "#FCA5A5"}
          />
        </View>

        <Text numberOfLines={2} style={styles.text}>
          {text1}
        </Text>
      </View>
    </View>
  );
}

export const toastConfig: ToastConfig = {
  success: ({ text1 }) => <BaseToastCard text1={text1} variant="success" />,
  error: ({ text1 }) => <BaseToastCard text1={text1} variant="error" />,
};

const styles = StyleSheet.create({
  // bọc ở giữa, phía trên
  wrap: {
    width: "100%",
    alignItems: "center",
  },

  // card chính
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,

    borderRadius: 999, // 🔥 pill
    minWidth: "70%",
    maxWidth: "92%",

    backgroundColor: "#020617", // slate-950
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.6)",

    // shadow
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 10,
  },
  cardSuccess: {
    // nhẹ chút tint xanh
    shadowColor: "#22C55E",
  },
  cardError: {
    shadowColor: "#F97373",
  },

  leftAccent: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 999,
    marginRight: 10,
  },

  iconWrap: {
    marginRight: 8,
  },

  text: {
    flex: 1,
    fontFamily: "Faustina_600SemiBold",
    fontSize: 13.5,
    color: "#E5E7EB",
  },
});
