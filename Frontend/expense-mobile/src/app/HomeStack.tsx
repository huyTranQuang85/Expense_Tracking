import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import TransactionTrashScreen from "../screens/TransactionTrashScreen";

export type HomeStackParamList = {
  Home: undefined;
  TransactionTrash: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="TransactionTrash"
        component={TransactionTrashScreen}
      />
    </Stack.Navigator>
  );
}
