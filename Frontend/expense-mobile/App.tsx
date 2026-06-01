import React from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import AuthNavigator from "./src/app/AuthNavigator";
import HomeScreen from "./src/screens/HomeScreen";
import CategoriesNavigator from "./src/screens/categories/CategoriesNavigator";
import { CategoriesProvider } from "./src/screens/categories/CategoriesContext";
import TransactionListScreen from "./src/screens/transaction/TransactionManagerScreen";
import TransactionFormScreen from "./src/screens/transaction/TransactionFormScreen";
import TransactionTrashScreen from "./src/screens/transaction/TransactionTrashScreen";
import { TransactionProvider } from "./src/screens/transaction/TransactionContext";
import WalletListScreen from "./src/screens/wallet/WalletListScreen";
import WalletFormScreen from "./src/screens/wallet/WalletFormScreen";
import { WalletProvider } from "./src/screens/wallet/WalletContext";
import { me } from "./src/services/auth";
import { TOKEN_KEY } from "./src/services/api";
import UpdateProfileScreen from "./src/screens/ProfileScreen";
import ChangePasswordScreen from "./src/screens/ChangePasswordScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ManageMonthlyBudgetScreen from "./src/screens/ManageMonthlyBudgetScreen";

export type RootStackParamList = {
  RootTabs: undefined;
  Home: undefined;
  Categories: undefined;
  TransactionList: undefined;
  AddTransaction: undefined;
  EditTransaction: { tx?: any; txId?: string | number } | undefined;
  TransactionTrash: undefined;
  WalletList: undefined;
  WalletForm:
    | {
        mode: "create" | "edit";
        walletId?: string;
      }
    | undefined;
  EditWallet: { wallet: any };
  WalletManager: undefined;
  BudgetMonth: undefined;
  UpdateProfile: undefined;
  ChangePassword: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.stroke,
            shadowOpacity: isDark ? 0 : 0.1,
            elevation: isDark ? 0 : 10,
          },
        ],
        tabBarIcon: ({ color, size }) => {
          const name =
            route.name === "Home"
              ? "grid"
              : route.name === "TransactionList"
              ? "receipt"
              : route.name === "Categories"
              ? "pricetag"
              : "wallet";
          return <Ionicons name={name as any} size={size - 1} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Tổng quan" }} />
      <Tab.Screen name="TransactionList" component={TransactionListScreen} options={{ title: "Giao dịch" }} />
      <Tab.Screen name="Categories" component={CategoriesNavigator} options={{ title: "Danh mục" }} />
      <Tab.Screen name="WalletList" component={WalletListScreen} options={{ title: "Ví" }} />
    </Tab.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === "ios" ? 86 : 70,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 22 : 10,
    borderTopWidth: 1,
    shadowColor: "#0F172A",
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
  },
  tabItem: {
    borderRadius: 18,
    marginHorizontal: 4,
  },
  tabLabel: {
    fontSize: 11.5,
    fontFamily: "Faustina_600SemiBold",
    marginTop: 2,
  },
});

export default function App() {
  const [authReady, setAuthReady] = React.useState(false);
  const [authenticated, setAuthenticated] = React.useState(false);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) {
          if (alive) setAuthenticated(false);
          return;
        }

        await me();
        if (alive) setAuthenticated(true);
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
        if (alive) setAuthenticated(false);
      } finally {
        if (alive) setAuthReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const handleAuthSuccess = React.useCallback(() => {
    setAuthenticated(true);
  }, []);

  if (!authReady) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <CategoriesProvider>
          <TransactionProvider>
            <WalletProvider>
              <NavigationContainer key={authenticated ? "app" : "auth"}>
                {authenticated ? (
                  <Stack.Navigator
                    initialRouteName="RootTabs"
                    screenOptions={{ headerShown: false }}
                  >
                    <Stack.Screen name="RootTabs" component={MainTabs} />
                    <Stack.Screen
                      name="AddTransaction"
                      component={TransactionFormScreen}
                    />
                    <Stack.Screen
                      name="EditTransaction"
                      component={TransactionFormScreen}
                    />
                    <Stack.Screen
                      name="TransactionTrash"
                      component={TransactionTrashScreen}
                    />
                    <Stack.Screen name="WalletForm" component={WalletFormScreen} />
                    <Stack.Screen name="EditWallet" component={WalletFormScreen} />
                    <Stack.Screen
                      name="WalletManager"
                      component={WalletListScreen}
                    />
                    <Stack.Screen
                      name="BudgetMonth"
                      component={ManageMonthlyBudgetScreen}
                    />
                    <Stack.Screen name="Categories" component={CategoriesNavigator} />
                    <Stack.Screen
                      name="UpdateProfile"
                      component={UpdateProfileScreen}
                    />
                    <Stack.Screen
                      name="ChangePassword"
                      component={ChangePasswordScreen}
                    />
                    <Stack.Screen name="Settings">
                      {(props) => (
                        <SettingsScreen
                          {...props}
                          onLogout={() => setAuthenticated(false)}
                        />
                      )}
                    </Stack.Screen>
                  </Stack.Navigator>
                ) : (
                  <AuthNavigator onAuthSuccess={handleAuthSuccess} />
                )}
              </NavigationContainer>
            </WalletProvider>
          </TransactionProvider>
        </CategoriesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
