import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/theme/ThemeContext";
import HomeScreen from "./src/screens/HomeScreen";
import CategoriesNavigator from "./src/screens/categories/CategoriesNavigator";
import { CategoriesProvider } from "./src/screens/categories/CategoriesContext";
import TransactionListScreen from "./src/screens/transaction/TransactionListScreen";
import TransactionFormScreen from "./src/screens/transaction/TransactionFormScreen";
import TransactionTrashScreen from "./src/screens/transaction/TransactionTrashScreen";
import { TransactionProvider } from "./src/screens/transaction/TransactionContext";

export type RootStackParamList = {
  Home: undefined;
  Categories: undefined;
  TransactionList: undefined;
  AddTransaction: undefined;
  EditTransaction: { tx?: any; txId?: string | number } | undefined;
  TransactionTrash: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <CategoriesProvider>
          <TransactionProvider>
            <NavigationContainer>
              <Stack.Navigator
                initialRouteName="TransactionList"
                screenOptions={{ headerShown: false }}
              >
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Categories" component={CategoriesNavigator} />
                <Stack.Screen name="TransactionList" component={TransactionListScreen} />
                <Stack.Screen name="AddTransaction" component={TransactionFormScreen} />
                <Stack.Screen name="EditTransaction" component={TransactionFormScreen} />
                <Stack.Screen name="TransactionTrash" component={TransactionTrashScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </TransactionProvider>
        </CategoriesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
