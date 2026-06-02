import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CategoryScreen from "./CategoryScreen";
import AddCategoryScreen from "./AddCategoryScreen";
import AddSubCategoryScreen from "./AddSubCategoryScreen";
import EditCategoryScreen from "./EditCategoryScreen";
import type { CategoryStackParamList } from "../../app/CategoryStack";

const Stack = createNativeStackNavigator<CategoryStackParamList>();

export default function CategoriesNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Category" component={CategoryScreen} />
      <Stack.Screen name="AddCategory" component={AddCategoryScreen} />
      <Stack.Screen name="AddSubCategory" component={AddSubCategoryScreen} />
      <Stack.Screen name="EditCategory" component={EditCategoryScreen} />
    </Stack.Navigator>
  );
}
