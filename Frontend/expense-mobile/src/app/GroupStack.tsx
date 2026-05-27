export type GroupStackParamList = {
  GroupList: undefined;
  CreateGroup: undefined;
  GroupDetail: { groupId: number };
  GroupMembers: {
    groupId: number;
    groupName?: string;
    myRole?: "owner" | "member";
  };
  GroupInvitations: undefined;
  GroupChat: { groupId: number; groupName?: string };
  GroupWallets: {
    groupId: number;
    groupName?: string;
    myRole?: "owner" | "member";
  };
  GroupCategories: {
    groupId: number;
    groupName?: string;
    myRole?: "owner" | "member";
  };
  GroupTransactions: {
    groupId: number;
    groupName?: string;
  };
  CreateGroupTransaction: {
    groupId: number;
  };
  GroupBudgets: {
    groupId: number;
    groupName?: string;
    myRole?: "owner" | "member";
  };
  CreateGroupBudget: {
    groupId: number;
    defaultMonth?: string;
  };
  GroupContributionPlans: {
    groupId: number;
    groupName?: string;
    myRole?: "owner" | "member";
  };
  CreateContributionPlan: {
    groupId: number;
  };
  ContributionPlanDetail: {
    groupId: number;
    planId: number;
    myRole?: "owner" | "member";
  };
  EditGroup: { groupId: number };
  EditGroupWallet: { groupId: number; walletId: number };
  EditGroupCategory: { groupId: number; categoryId: number };
  EditGroupBudget: {
    groupId: number;
    budgetId: number;
    initialBudget: {
      month: string;
      limitAmount: number;
      alertThreshold: number;
      categoryName?: string | null;
      walletName?: string | null;
    };
  };
  ContributionHistory: { groupId: number; planId?: number };
  GroupReminders: {
    groupId: number;
    groupName?: string;
    myRole?: "owner" | "member";
  };
  CreateGroupReminder: { groupId: number };
  Notifications: undefined;
};
