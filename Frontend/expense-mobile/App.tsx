import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/theme/ThemeContext";
import HomeScreen from "./src/screens/HomeScreen";
import CategoriesNavigator from "./src/screens/categories/CategoriesNavigator";
import { CategoriesProvider } from "./src/screens/categories/CategoriesContext";

type RootStackParamList = {
  Home: undefined;
  Categories: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <CategoriesProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Categories"
              screenOptions={{ headerShown: false }}
            >
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Categories" component={CategoriesNavigator} />
            </Stack.Navigator>
          </NavigationContainer>
        </CategoriesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
