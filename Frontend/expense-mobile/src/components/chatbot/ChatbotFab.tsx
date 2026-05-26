// src/components/chatbot/ChatbotFab.tsx
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  bottomOffset: number; // khoảng cách tới tab bar + safe area
  onPress: () => void;
};

const FAB_SIZE = 58;
const MARGIN = 12;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export default function ChatbotFab({ bottomOffset, onPress }: Props) {
  const { width: screenW, height: screenH } = Dimensions.get("window");

  // vị trí mặc định (mép phải, ngay trên tab bar)
  const defaultX = screenW - FAB_SIZE - MARGIN;
  const defaultY = Math.max(MARGIN, screenH - bottomOffset - FAB_SIZE - MARGIN);

  const translate = useRef(
    new Animated.ValueXY({ x: defaultX, y: defaultY }),
  ).current;
  const basePosRef = useRef({ x: defaultX, y: defaultY });
  const bottomOffsetRef = useRef(bottomOffset);

  // cập nhật khi bottomOffset đổi (tab bar / safe area đổi)
  useEffect(() => {
    bottomOffsetRef.current = bottomOffset;
    const maxY = screenH - bottomOffsetRef.current - FAB_SIZE - MARGIN;
    const current = basePosRef.current;

    const next = {
      x: current.x,
      y: clamp(current.y, MARGIN, maxY),
    };

    basePosRef.current = next;
    translate.setValue(next);
  }, [bottomOffset, screenH, translate]);

  const touchRef = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        // nếu di chuyển chút là bắt đầu drag
        return Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2;
      },
      onPanResponderGrant: (_, gesture) => {
        touchRef.current = {
          startX: gesture.moveX,
          startY: gesture.moveY,
          startTime: Date.now(),
        };
      },
      onPanResponderMove: (_, gesture) => {
        const base = basePosRef.current;
        const maxY = screenH - bottomOffsetRef.current - FAB_SIZE - MARGIN;

        const nextX = clamp(
          base.x + gesture.dx,
          MARGIN,
          screenW - FAB_SIZE - MARGIN,
        );
        const nextY = clamp(base.y + gesture.dy, MARGIN, maxY);

        translate.setValue({ x: nextX, y: nextY });
      },
      onPanResponderRelease: (_, gesture) => {
        const { dx, dy } = gesture;
        const dt = Date.now() - touchRef.current.startTime;

        // nếu không kéo mấy & thời gian ngắn -> coi như click
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5 && dt < 250) {
          onPress();
          return;
        }

        const base = basePosRef.current;
        const maxY = screenH - bottomOffsetRef.current - FAB_SIZE - MARGIN;

        let nextX = clamp(base.x + dx, MARGIN, screenW - FAB_SIZE - MARGIN);
        let nextY = clamp(base.y + dy, MARGIN, maxY);

        // snap mép trái/phải như assistive touch
        const centerX = nextX + FAB_SIZE / 2;
        if (centerX > screenW / 2) {
          nextX = screenW - FAB_SIZE - MARGIN;
        } else {
          nextX = MARGIN;
        }

        const target = { x: nextX, y: nextY };
        basePosRef.current = target;

        Animated.spring(translate, {
          toValue: target,
          useNativeDriver: false,
          bounciness: 12,
        }).start();
      },
    }),
  ).current;

  const animatedStyle = {
    position: "absolute" as const,
    left: translate.x,
    top: translate.y,
    zIndex: 20,
    elevation: 20,
  };

  return (
    <Animated.View style={animatedStyle} {...panResponder.panHandlers}>
      <View style={styles.button}>
        <LinearGradient
          colors={["#36C29F", "#0EB47C", "#03624D"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Ionicons name="chatbubbles-outline" size={26} color="#ECFEFF" />
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    backgroundColor: "#03624D",
  },
  gradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
