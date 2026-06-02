import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/auth/LoginScreen";
import ForgotEmailScreen from "../screens/auth/ForgotEmailScreen";
import ForgotResetScreen from "../screens/auth/ForgotResetScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotEmail: undefined;
  ForgotReset: { email: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

type Props = {
  onAuthSuccess?: () => void;
};

export default function AuthNavigator({ onAuthSuccess }: Props) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} onAuthSuccess={onAuthSuccess} />}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {(props) => <RegisterScreen {...props} onAuthSuccess={onAuthSuccess} />}
      </Stack.Screen>
      <Stack.Screen name="ForgotEmail" component={ForgotEmailScreen} />
      <Stack.Screen name="ForgotReset" component={ForgotResetScreen} />
    </Stack.Navigator>
  );
}
