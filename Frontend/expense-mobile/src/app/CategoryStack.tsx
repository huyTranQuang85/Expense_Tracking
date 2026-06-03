import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import CategoryScreen from "../screens/CategoryScreen";
import AddCategoryScreen from "../screens/categories/AddCategoryScreen";
import EditCategoryScreen from "../screens/categories/EditCategoryScreen";
import type { Category } from "../services/categories";

export type CategoryStackParamList = {
  Category: undefined;
  AddCategory:
    | { type?: "income" | "expense"; parentId?: number | string | null }
    | undefined;
  EditCategory: { cat: Category };
};

const Stack = createNativeStackNavigator<CategoryStackParamList>();

export default function CategoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Category" component={CategoryScreen} />
      <Stack.Screen name="AddCategory" component={AddCategoryScreen} />
      <Stack.Screen name="EditCategory" component={EditCategoryScreen} />
    </Stack.Navigator>
  );
}
