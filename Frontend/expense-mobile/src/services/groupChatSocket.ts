import { io, Socket } from "socket.io-client";
import * as SecureStore from "expo-secure-store";
import { TOKEN_KEY } from "./api";
import type { GroupMessage } from "./groupChat";

type ServerToClientEvents = {
  "group:message:new": (message: GroupMessage) => void;
  "group:typing": (data: { groupId: number; userId: string }) => void;
  "group:stop_typing": (data: { groupId: number; userId: string }) => void;
};

type ClientToServerEvents = {
  "group:join": (
    payload: { groupId: number },
    callback?: (res: any) => void,
  ) => void;
  "group:leave": (
    payload: { groupId: number },
    callback?: (res: any) => void,
  ) => void;
  "group:message:send": (
    payload: { groupId: number; content: string },
    callback?: (res: any) => void,
  ) => void;
  "group:typing": (payload: { groupId: number }) => void;
  "group:stop_typing": (payload: { groupId: number }) => void;
};

export type GroupChatSocket = Socket<
  ServerToClientEvents,
  ClientToServerEvents
>;

export async function createGroupChatSocket() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (!baseURL) {
    throw new Error("Thiếu EXPO_PUBLIC_API_BASE_URL");
  }

  if (!token) {
    throw new Error("Thiếu token đăng nhập");
  }

  const socket: GroupChatSocket = io(baseURL, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 800,
  });

  return socket;
}