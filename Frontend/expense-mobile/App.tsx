import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "./src/theme/ThemeContext";
import HomeScreen from "./src/screens/HomeScreen";

export type RootStackParamList = {
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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return <SafeAreaProvider></SafeAreaProvider>;
}
