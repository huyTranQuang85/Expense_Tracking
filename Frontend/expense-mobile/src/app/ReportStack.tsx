import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ReportScreen from "../screens/ReportScreen";

export type ReportStackParamList = {
  Report: undefined;
};

const Stack = createNativeStackNavigator<ReportStackParamList>();

export default function ReportStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Report" component={ReportScreen} />
    </Stack.Navigator>
  );
}
