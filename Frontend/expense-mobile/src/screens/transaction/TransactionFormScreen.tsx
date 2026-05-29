import React from "react";
import { View } from "react-native";
import { useRoute } from "@react-navigation/native";
import AddTransactionScreen from "./AddTransactionScreen";
import EditTransactionScreen from "./EditTransactionScreen";

export default function TransactionFormScreen(props: any) {
  const route: any = useRoute();
  const name = route.name || "";

  if (name === "EditTransaction") return <EditTransactionScreen {...props} />;
  return <AddTransactionScreen {...props} />;
}
