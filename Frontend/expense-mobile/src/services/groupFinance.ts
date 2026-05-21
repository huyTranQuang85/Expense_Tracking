import { api } from "./api";

function pickData<T>(res: any): T {
  return res.data?.data ?? res.data;
}

export type GroupCategoryType = "income" | "expense";

export type GroupCategory = {
  id: number;
  groupId: number;
  name: string;
  type: GroupCategoryType;
  icon?: string | null;
  color?: string | null;
  parentGroupCategoryId?: number | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GroupWallet = {
  id: number;
  groupId: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  type: "standard" | "savings" | "other";
  balance: number;
  isArchived: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GroupTransaction = {
  id: number;
  groupId: number;
  groupWalletId: number;
  walletName?: string;
  groupCategoryId: number;
  categoryName?: string;
  categoryType?: GroupCategoryType;
  amount: number;
  description?: string | null;
  txDate: string;
  createdBy?: string;
  createdByName?: string;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

// ===== GROUP CATEGORIES =====
export async function getGroupCategories(
  groupId: number,
  params?: { type?: GroupCategoryType },
) {
  const res = await api.get(`/api/groups/${groupId}/categories`, { params });
  return pickData<GroupCategory[]>(res);
}

export async function createGroupCategory(
  groupId: number,
  payload: {
    name: string;
    type: GroupCategoryType;
    icon?: string;
    color?: string;
  },
) {
  const res = await api.post(`/api/groups/${groupId}/categories`, payload);
  return pickData<GroupCategory>(res);
}

export async function updateGroupCategory(
  groupId: number,
  categoryId: number,
  payload: Partial<{
    name: string;
    type: GroupCategoryType;
    icon: string;
    color: string;
  }>,
) {
  const res = await api.patch(
    `/api/groups/${groupId}/categories/${categoryId}`,
    payload,
  );
  return pickData<GroupCategory>(res);
}

export async function deleteGroupCategory(groupId: number, categoryId: number) {
  const res = await api.delete(
    `/api/groups/${groupId}/categories/${categoryId}`,
  );
  return res.data;
}

// ===== GROUP WALLETS =====
export async function getGroupWallets(
  groupId: number,
  params?: { includeArchived?: boolean },
) {
  const res = await api.get(`/api/groups/${groupId}/wallets`, { params });
  return pickData<GroupWallet[]>(res);
}

export async function createGroupWallet(
  groupId: number,
  payload: {
    name: string;
    description?: string;
    type?: "standard" | "savings" | "other";
    balance?: number;
    color?: string;
    icon?: string;
  },
) {
  const res = await api.post(`/api/groups/${groupId}/wallets`, payload);
  return pickData<GroupWallet>(res);
}

export async function updateGroupWallet(
  groupId: number,
  walletId: number,
  payload: Partial<{
    name: string;
    description: string;
    type: "standard" | "savings" | "other";
    balance: number;
    color: string;
    icon: string;
  }>,
) {
  const res = await api.patch(
    `/api/groups/${groupId}/wallets/${walletId}`,
    payload,
  );
  return pickData<GroupWallet>(res);
}

export async function archiveGroupWallet(groupId: number, walletId: number) {
  const res = await api.patch(
    `/api/groups/${groupId}/wallets/${walletId}/archive`,
  );
  return res.data;
}

// ===== GROUP TRANSACTIONS =====
export async function getGroupTransactions(
  groupId: number,
  params?: {
    walletId?: number;
    categoryId?: number;
    type?: GroupCategoryType;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  },
) {
  const res = await api.get(`/api/groups/${groupId}/transactions`, { params });
  return pickData<GroupTransaction[]>(res);
}

export async function createGroupTransaction(
  groupId: number,
  payload: {
    groupWalletId: number;
    groupCategoryId: number;
    amount: number;
    description?: string;
    txDate?: string;
  },
) {
  const res = await api.post(`/api/groups/${groupId}/transactions`, payload);
  return pickData<GroupTransaction>(res);
}

export async function updateGroupTransaction(
  groupId: number,
  transactionId: number,
  payload: Partial<{
    groupWalletId: number;
    groupCategoryId: number;
    amount: number;
    description: string;
    txDate: string;
  }>,
) {
  const res = await api.patch(
    `/api/groups/${groupId}/transactions/${transactionId}`,
    payload,
  );
  return pickData<GroupTransaction>(res);
}

export async function deleteGroupTransaction(
  groupId: number,
  transactionId: number,
) {
  const res = await api.delete(
    `/api/groups/${groupId}/transactions/${transactionId}`,
  );
  return res.data;
}
// ===== GROUP BUDGETS =====
export type GroupBudget = {
  id: number;
  groupId: number;
  month: string;
  groupCategoryId?: number | null;
  categoryName?: string | null;
  groupWalletId?: number | null;
  walletName?: string | null;
  limitAmount: number;
  alertThreshold: number;
  notifyInApp: boolean;
  notifyEmail: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GroupBudgetUsage = {
  id: number;
  groupId: number;
  month: string;
  groupCategoryId?: number | null;
  groupWalletId?: number | null;
  limitAmount: number;
  alertThreshold: number;
  spentAmount: number;
  usagePercent: number;
  status: "safe" | "warning" | "exceeded" | string;
};

export async function getGroupBudgets(
  groupId: number,
  params?: { month?: string },
) {
  const res = await api.get(`/api/groups/${groupId}/budgets`, { params });
  return pickData<GroupBudget[]>(res);
}

export async function createGroupBudget(
  groupId: number,
  payload: {
    groupCategoryId?: number | null;
    groupWalletId?: number | null;
    month: string;
    limitAmount: number;
    alertThreshold?: number;
    notifyInApp?: boolean;
    notifyEmail?: boolean;
  },
) {
  const res = await api.post(`/api/groups/${groupId}/budgets`, payload);
  return pickData<GroupBudget>(res);
}

export async function updateGroupBudget(
  groupId: number,
  budgetId: number,
  payload: Partial<{
    groupCategoryId: number | null;
    groupWalletId: number | null;
    month: string;
    limitAmount: number;
    alertThreshold: number;
    notifyInApp: boolean;
    notifyEmail: boolean;
  }>,
) {
  const res = await api.patch(
    `/api/groups/${groupId}/budgets/${budgetId}`,
    payload,
  );
  return pickData<GroupBudget>(res);
}

export async function deleteGroupBudget(groupId: number, budgetId: number) {
  const res = await api.delete(`/api/groups/${groupId}/budgets/${budgetId}`);
  return res.data;
}

export async function getGroupBudgetUsage(
  groupId: number,
  params?: { month?: string },
) {
  const res = await api.get(`/api/groups/${groupId}/budget-usage`, { params });
  return pickData<GroupBudgetUsage[]>(res);
}

// ===== GROUP CONTRIBUTIONS =====
export type ContributionPlanStatus = "open" | "closed" | "cancelled";

export type GroupContributionPlan = {
  id: number;
  groupId: number;
  groupWalletId: number;
  walletName?: string;
  title: string;
  description?: string | null;
  targetAmount?: number | null;
  dueDate?: string | null;
  status: ContributionPlanStatus;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GroupContributionAssignment = {
  id: number;
  contributionPlanId: number;
  userId: string;
  userName?: string;
  email?: string;
  expectedAmount: number;
  paidAmount: number;
  status: "unpaid" | "partial" | "paid";
  createdAt?: string;
  updatedAt?: string;
};

export type GroupContributionPlanDetail = GroupContributionPlan & {
  assignments: GroupContributionAssignment[];
};

export type GroupContribution = {
  id: number;
  groupId: number;
  groupWalletId: number;
  contributionPlanId?: number | null;
  assignmentId?: number | null;
  userId: string;
  userName?: string;
  recordedBy?: string;
  recordedByName?: string;
  amount: number;
  note?: string | null;
  contributedAt?: string;
  createdAt?: string;
};

export type GroupContributionProgress = {
  contributionPlanId: number;
  groupId: number;
  groupWalletId: number;
  title: string;
  targetAmount?: number | null;
  dueDate?: string | null;
  planStatus: ContributionPlanStatus;
  totalExpectedAmount: number;
  totalPaidAmount: number;
  remainingAmount: number;
  progressPercent: number;
  memberCount: number;
  paidMemberCount: number;
  partialMemberCount: number;
  unpaidMemberCount: number;
};

export async function getContributionPlans(
  groupId: number,
  params?: { status?: ContributionPlanStatus },
) {
  const res = await api.get(`/api/groups/${groupId}/contribution-plans`, {
    params,
  });
  return pickData<GroupContributionPlan[]>(res);
}

export async function createContributionPlan(
  groupId: number,
  payload: {
    groupWalletId: number;
    title: string;
    description?: string;
    targetAmount?: number | null;
    dueDate?: string | null;
  },
) {
  const res = await api.post(
    `/api/groups/${groupId}/contribution-plans`,
    payload,
  );
  return pickData<GroupContributionPlan>(res);
}

export async function getContributionPlanDetail(
  groupId: number,
  planId: number,
) {
  const res = await api.get(
    `/api/groups/${groupId}/contribution-plans/${planId}`,
  );
  return pickData<GroupContributionPlanDetail>(res);
}

export async function updateContributionPlan(
  groupId: number,
  planId: number,
  payload: Partial<{
    groupWalletId: number;
    title: string;
    description: string | null;
    targetAmount: number | null;
    dueDate: string | null;
    status: ContributionPlanStatus;
  }>,
) {
  const res = await api.patch(
    `/api/groups/${groupId}/contribution-plans/${planId}`,
    payload,
  );
  return pickData<GroupContributionPlan>(res);
}

export async function upsertContributionAssignments(
  groupId: number,
  planId: number,
  assignments: { userId: string; expectedAmount: number }[],
) {
  const res = await api.put(
    `/api/groups/${groupId}/contribution-plans/${planId}/assignments`,
    { assignments },
  );
  return pickData<GroupContributionPlanDetail>(res);
}

export async function recordContribution(
  groupId: number,
  payload: {
    groupWalletId: number;
    contributionPlanId?: number | null;
    assignmentId?: number | null;
    userId: string;
    amount: number;
    note?: string;
  },
) {
  const res = await api.post(`/api/groups/${groupId}/contributions`, payload);
  return pickData<GroupContribution>(res);
}

export async function getGroupContributions(
  groupId: number,
  params?: { planId?: number; userId?: string },
) {
  const res = await api.get(`/api/groups/${groupId}/contributions`, {
    params,
  });
  return pickData<GroupContribution[]>(res);
}

export async function getContributionProgress(groupId: number) {
  const res = await api.get(`/api/groups/${groupId}/contribution-progress`);
  return pickData<GroupContributionProgress[]>(res);
}