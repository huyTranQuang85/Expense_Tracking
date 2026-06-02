import * as SecureStore from "expo-secure-store";

const isWeb = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export async function getItem(key: string) {
  if (isWeb) {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string) {
  if (isWeb) {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string) {
  if (isWeb) {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}
