import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SettingsScreen from "../screens/SettingsScreen";
import PlaceholderScreen from "../screens/PlaceholderScreen";
// ✅ Wallet screens
import ManageWalletScreen from "../screens/ManageWalletScreen";
import AddWalletScreen from "../screens/wallets/AddWalletScreen";
import EditWalletScreen from "../screens/wallets/EditWalletScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import UpdateProfileScreen from "../screens/ProfileScreen";
import ManageMonthlyBudgetScreen from "../screens/ManageMonthlyBudgetScreen";
import PrivacyPolicyScreen from "../screens/PrivacyPolicyScreen";
export type SettingsStackParamList = {
  Settings: undefined;

  // Wallet flow
  WalletManager: undefined;
  AddWallet: undefined;
  EditWallet: { wallet: any };

  ChangePassword: undefined;
  UpdateProfile: undefined;
  Privacy: undefined;
  BudgetMonth: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Settings" component={SettingsScreen} />

      {/* ✅ Wallet */}
      <Stack.Screen name="WalletManager" component={ManageWalletScreen} />
      <Stack.Screen name="AddWallet" component={AddWalletScreen} />
      <Stack.Screen name="EditWallet" component={EditWalletScreen} />

      {/* các màn còn lại bạn sẽ gửi code sau */}
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="UpdateProfile" component={UpdateProfileScreen} />
      <Stack.Screen name="BudgetMonth" component={ManageMonthlyBudgetScreen} />
      <Stack.Screen name="Privacy" component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  );
}
