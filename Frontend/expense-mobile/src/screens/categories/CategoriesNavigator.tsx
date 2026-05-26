import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CategoriesListScreen from "./CategoriesListScreen";
import CategoryFormScreen from "./CategoryFormScreen";
import CategoryDetailScreen from "./CategoryDetailScreen";

export type CategoriesStackParamList = {
  CategoriesList: undefined;
  CategoryForm: { mode: "create" | "edit"; categoryId?: string } | undefined;
  CategoryDetail: { categoryId?: string } | undefined;
};

const Stack = createNativeStackNavigator<CategoriesStackParamList>();

export default function CategoriesNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CategoriesList" component={CategoriesListScreen} />
      <Stack.Screen name="CategoryForm" component={CategoryFormScreen} />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
    </Stack.Navigator>
  );
}
