import React, { useCallback, useEffect, useState } from "react";
import { AppState, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigatorScreenParams } from "@react-navigation/native";

import HomeStack from "./HomeStack";
import CategoryStack from "./CategoryStack";
import ReportStack from "./ReportStack";
import SettingsStack, { SettingsStackParamList } from "./SettingsStack";
import ChatbotOverlay from "../components/chatbot/ChatbotOverlay";
import GroupStack from "./GroupStack";
import { useTheme } from "../theme/ThemeContext";
import { getUnreadNotificationCount } from "../services/notifications";

export type MainTabParamList = {
  HomeTab: undefined;
  CategoryTab: undefined;
  GroupTab: undefined;
  ReportTab: undefined;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList> | undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({
  focused,
  name,
  isDark,
  badgeCount = 0,
}: {
  focused: boolean;
  name: React.ComponentProps<typeof Ionicons>["name"];
  isDark: boolean;
  badgeCount?: number;
}) {
  const activeColor = isDark ? "#34D399" : "#16A34A";
  const inactiveColor = isDark ? "#E5E7EB" : "#94A3B8";

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale: focused ? 1.08 : 1 }],
        minWidth: 34,
      }}
    >
      <View style={{ position: "relative" }}>
        <Ionicons
          name={name}
          size={24}
          color={focused ? activeColor : inactiveColor}
        />

        {badgeCount > 0 && (
          <View
            style={{
              position: "absolute",
              top: -8,
              right: -10,
              minWidth: 17,
              height: 17,
              borderRadius: 9,
              paddingHorizontal: 4,
              backgroundColor: "#EF4444",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1.5,
              borderColor: isDark ? "#020617" : "#FFFFFF",
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 9,
                fontFamily: "Faustina_700Bold",
                lineHeight: 11,
              }}
            >
              {badgeCount > 99 ? "99+" : badgeCount}
            </Text>
          </View>
        )}
      </View>

      {focused && (
        <View
          style={{
            marginTop: 3,
            width: 6,
            height: 3,
            borderRadius: 999,
            backgroundColor: activeColor,
          }}
        />
      )}
    </View>
  );
}

export default function MainTabs() {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const refreshUnreadNotificationCount = useCallback(async () => {
    try {
      const data = await getUnreadNotificationCount();
      setUnreadNotificationCount(Number(data?.total || 0));
    } catch {
      setUnreadNotificationCount(0);
    }
  }, []);

  useEffect(() => {
    refreshUnreadNotificationCount();

    const interval = setInterval(refreshUnreadNotificationCount, 30000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshUnreadNotificationCount();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [refreshUnreadNotificationCount]);

  return (
    <ChatbotOverlay>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            height: 62,
            paddingTop: 10,
            paddingBottom: 12,
            backgroundColor: isDark ? "#020617" : "#FFFFFF",
            borderTopColor: isDark
              ? "rgba(148,163,184,0.35)"
              : "rgba(15,23,42,0.08)",
          },
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeStack}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                isDark={isDark}
                name={focused ? "home" : "home-outline"}
              />
            ),
          }}
        />

        <Tab.Screen
          name="CategoryTab"
          component={CategoryStack}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                isDark={isDark}
                name={focused ? "folder" : "folder-outline"}
              />
            ),
          }}
        />

        <Tab.Screen
          name="GroupTab"
          component={GroupStack}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                isDark={isDark}
                name={focused ? "people" : "people-outline"}
                badgeCount={unreadNotificationCount}
              />
            ),
          }}
          listeners={{
            tabPress: () => {
              refreshUnreadNotificationCount();
            },
          }}
        />

        <Tab.Screen
          name="ReportTab"
          component={ReportStack}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                isDark={isDark}
                name={focused ? "pie-chart" : "pie-chart-outline"}
              />
            ),
          }}
        />

        <Tab.Screen
          name="SettingsTab"
          component={SettingsStack}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                isDark={isDark}
                name={focused ? "settings" : "settings-outline"}
              />
            ),
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate("SettingsTab", {
                screen: "Settings",
              });
            },
          })}
        />
      </Tab.Navigator>
    </ChatbotOverlay>
  );
}
