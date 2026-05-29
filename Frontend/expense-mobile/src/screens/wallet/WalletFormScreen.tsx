import React from "react";
import { useRoute } from "@react-navigation/native";
import AddWalletScreen from "./AddWalletScreen";
import EditWalletScreen from "./EditWalletScreen";

export default function WalletFormScreen(props: any) {
  const route: any = useRoute();
  const name = route.name || "";
  if (name === "WalletForm" || name === "AddWallet") return <AddWalletScreen {...props} />;
  return <EditWalletScreen {...props} />;
}
