import { api } from "./api";

export type AppNotification = {
  id: number;
  userId: string;
  type: "system" | "group" | "reminder" | string;
  title?: string | null;
  message: string;
  metadata?: any;
  isRead: boolean;
  createdAt: string;
};

function pickData<T>(res: any): T {
  return res.data?.data ?? res.data;
}

export async function getMyNotifications(params?: {
  limit?: number;
  onlyUnread?: boolean;
}) {
  const res = await api.get("/api/notifications", { params });
  return pickData<AppNotification[]>(res);
}

export async function getUnreadNotificationCount() {
  const res = await api.get("/api/notifications/unread-count");
  return pickData<{ total: number }>(res);
}

export async function markNotificationAsRead(notificationId: number) {
  const res = await api.patch(`/api/notifications/${notificationId}/read`);
  return pickData<AppNotification>(res);
}

export async function markAllNotificationsAsRead() {
  const res = await api.patch("/api/notifications/read-all");
  return res.data;
}