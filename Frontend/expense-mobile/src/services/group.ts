import { api } from "./api";

export type GroupRole = "owner" | "member";

export type FamilyGroup = {
  id: number;
  ownerId?: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  isArchived?: boolean;
  myRole?: GroupRole;
  memberCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type GroupMember = {
  id: number;
  groupId: number;
  userId: string;
  userName?: string;
  email?: string;
  avatarUrl?: string | null;
  nickname?: string | null;
  role: GroupRole;
  joinedAt?: string;
};

export type GroupInvitation = {
  id: number;
  groupId: number;
  groupName?: string;
  invitedEmail: string;
  invitedUserId?: string | null;
  invitedBy?: string;
  invitedByName?: string | null;
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  expiresAt?: string;
  acceptedAt?: string | null;
  createdAt?: string;
};

function pickData<T>(res: any): T {
  return res.data?.data ?? res.data;
}

export async function getMyGroups() {
  const res = await api.get("/api/groups");
  return pickData<FamilyGroup[]>(res);
}

export async function createGroup(payload: {
  name: string;
  description?: string;
  avatarUrl?: string;
}) {
  const res = await api.post("/api/groups", payload);
  return pickData<FamilyGroup>(res);
}

export async function getGroupDetail(groupId: number) {
  const res = await api.get(`/api/groups/${groupId}`);
  return pickData<FamilyGroup>(res);
}

export async function updateGroup(
  groupId: number,
  payload: {
    name?: string;
    description?: string | null;
    avatarUrl?: string | null;
  },
) {
  const res = await api.patch(`/api/groups/${groupId}`, payload);
  return pickData<FamilyGroup>(res);
}

export async function archiveGroup(groupId: number) {
  const res = await api.patch(`/api/groups/${groupId}/archive`);
  return res.data;
}

export async function deleteGroup(groupId: number) {
  const res = await api.delete(`/api/groups/${groupId}`);
  return res.data;
}

export async function getGroupDashboard(groupId: number) {
  const res = await api.get(`/api/groups/${groupId}/dashboard`);
  return pickData<any>(res);
}

export async function getGroupMembers(groupId: number) {
  const res = await api.get(`/api/groups/${groupId}/members`);
  return pickData<GroupMember[]>(res);
}

export async function updateMyNickname(groupId: number, nickname: string) {
  const res = await api.patch(`/api/groups/${groupId}/members/me/nickname`, {
    nickname,
  });
  return pickData<GroupMember>(res);
}

export async function removeGroupMember(groupId: number, userId: string) {
  const res = await api.delete(`/api/groups/${groupId}/members/${userId}`);
  return res.data;
}

export async function leaveGroup(groupId: number) {
  const res = await api.post(`/api/groups/${groupId}/leave`);
  return res.data;
}

export async function transferGroupOwner(groupId: number, userId: string) {
  const res = await api.patch(
    `/api/groups/${groupId}/members/${userId}/transfer-owner`,
  );
  return pickData<GroupMember>(res);
}

export async function createGroupInvitation(
  groupId: number,
  payload: { email: string },
) {
  const res = await api.post(`/api/groups/${groupId}/invitations`, payload);
  return pickData<GroupInvitation>(res);
}

export async function getMyGroupInvitations() {
  const res = await api.get("/api/groups/invitations/my");
  return pickData<GroupInvitation[]>(res);
}

export async function acceptGroupInvitation(invitationId: number) {
  const res = await api.post(`/api/groups/invitations/${invitationId}/accept`);
  return pickData<GroupInvitation>(res);
}

export async function declineGroupInvitation(invitationId: number) {
  const res = await api.post(`/api/groups/invitations/${invitationId}/decline`);
  return pickData<GroupInvitation>(res);
}

export async function cancelGroupInvitation(
  groupId: number,
  invitationId: number,
) {
  const res = await api.post(
    `/api/groups/${groupId}/invitations/${invitationId}/cancel`,
  );
  return res.data;
}