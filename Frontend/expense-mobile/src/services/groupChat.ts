import { api } from "./api";

export type GroupMessage = {
  id: number;
  groupId: number;
  senderId?: string | null;
  senderName?: string | null;
  senderEmail?: string | null;
  senderAvatarUrl?: string | null;
  messageType: "text" | "system";
  content: string;
  createdAt: string;
};

function pickData<T>(res: any): T {
  return res.data?.data ?? res.data;
}

export async function getGroupMessages(
  groupId: number,
  params?: {
    limit?: number;
    beforeId?: number;
  },
) {
  const res = await api.get(`/api/groups/${groupId}/messages`, { params });
  return pickData<GroupMessage[]>(res);
}

export async function sendGroupMessageRest(
  groupId: number,
  payload: { content: string },
) {
  const res = await api.post(`/api/groups/${groupId}/messages`, payload);
  return pickData<GroupMessage>(res);
}