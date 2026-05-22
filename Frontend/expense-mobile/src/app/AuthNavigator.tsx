import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/auth/LoginScreen";
import ForgotEmailScreen from "../screens/auth/ForgotEmailScreen";
import ForgotResetScreen from "../screens/auth/ForgotResetScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import SetupProfileScreen from "../screens/SetupProfileScreen";
import SetupBudgetScreen from "../screens/SetupBudgetScreen";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotEmail: undefined;
  ForgotReset: { email: string };
  SetupProfile: { fullName?: string; email?: string } | undefined;
  SetupBudget: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotEmail" component={ForgotEmailScreen} />
      <Stack.Screen name="ForgotReset" component={ForgotResetScreen} />
      <Stack.Screen name="SetupProfile" component={SetupProfileScreen} />
      <Stack.Screen name="SetupBudget" component={SetupBudgetScreen} />
    </Stack.Navigator>
  );
}
