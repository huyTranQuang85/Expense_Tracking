import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ManageWalletScreen from "../screens/ManageWalletScreen";
import AddWalletScreen from "../screens/wallets/AddWalletScreen";
import EditWalletScreen from "../screens/wallets/EditWalletScreen";

export type WalletStackParamList = {
  ManageWallet: undefined;
  AddWallet: undefined;
  EditWallet: { wallet: any };
};

const Stack = createNativeStackNavigator<WalletStackParamList>();

export default function WalletStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ManageWallet" component={ManageWalletScreen} />
      <Stack.Screen name="AddWallet" component={AddWalletScreen} />
      <Stack.Screen name="EditWallet" component={EditWalletScreen} />
    </Stack.Navigator>
  );
}
