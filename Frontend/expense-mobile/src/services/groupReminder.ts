import { api } from "./api";

export type GroupReminder = {
  id: number;
  groupId: number;
  title: string;
  message?: string | null;
  remindAt: string;
  channel: "in_app" | "email";
  isActive: boolean;
  isRecurring: boolean;
  frequency?: "daily" | "weekly" | "monthly" | null;
  interval?: number | null;
  byWeekday?: string | null;
  byMonthday?: number | null;
  untilDate?: string | null;
  timezone?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

function pickData<T>(res: any): T {
  return res.data?.data ?? res.data;
}

export async function getGroupReminders(
  groupId: number,
  params?: { includeInactive?: boolean },
) {
  const res = await api.get(`/api/groups/${groupId}/reminders`, { params });
  return pickData<GroupReminder[]>(res);
}

export async function createGroupReminder(
  groupId: number,
  payload: {
    title: string;
    message?: string;
    remindAt: string;
    channel?: "in_app" | "email";
    isRecurring?: boolean;
    frequency?: "daily" | "weekly" | "monthly" | null;
    interval?: number | null;
    byWeekday?: string | null;
    byMonthday?: number | null;
    untilDate?: string | null;
    timezone?: string;
  },
) {
  const res = await api.post(`/api/groups/${groupId}/reminders`, payload);
  return pickData<GroupReminder>(res);
}

export async function updateGroupReminder(
  groupId: number,
  reminderId: number,
  payload: Partial<{
    title: string;
    message: string | null;
    remindAt: string;
    channel: "in_app" | "email";
    isActive: boolean;
    isRecurring: boolean;
    frequency: "daily" | "weekly" | "monthly" | null;
    interval: number | null;
    byWeekday: string | null;
    byMonthday: number | null;
    untilDate: string | null;
    timezone: string;
  }>,
) {
  const res = await api.patch(
    `/api/groups/${groupId}/reminders/${reminderId}`,
    payload,
  );
  return pickData<GroupReminder>(res);
}

export async function deactivateGroupReminder(
  groupId: number,
  reminderId: number,
) {
  const res = await api.patch(
    `/api/groups/${groupId}/reminders/${reminderId}/deactivate`,
  );
  return res.data;
}

export async function sendGroupReminderNow(
  groupId: number,
  reminderId: number,
) {
  const res = await api.post(
    `/api/groups/${groupId}/reminders/${reminderId}/send-now`,
  );
  return res.data;
}