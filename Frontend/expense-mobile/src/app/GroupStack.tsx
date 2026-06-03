import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import GroupListScreen from "../screens/groups/GroupListScreen";
import CreateGroupScreen from "../screens/groups/CreateGroupScreen";
import GroupDetailScreen from "../screens/groups/GroupDetailScreen";
import GroupMembersScreen from "../screens/groups/GroupMembersScreen";
import GroupInvitationsScreen from "../screens/groups/GroupInvitationsScreen";
import GroupChatScreen from "../screens/groups/GroupChatScreen";
import GroupWalletsScreen from "../screens/groups/GroupWalletsScreen";
import GroupCategoriesScreen from "../screens/groups/GroupCategoriesScreen";
import GroupTransactionsScreen from "../screens/groups/GroupTransactionsScreen";
import CreateGroupTransactionScreen from "../screens/groups/CreateGroupTransactionScreen";
import GroupBudgetsScreen from "../screens/groups/GroupBudgetsScreen";
import CreateGroupBudgetScreen from "../screens/groups/CreateGroupBudgetScreen";
import GroupContributionPlansScreen from "../screens/groups/GroupContributionPlansScreen";
import CreateContributionPlanScreen from "../screens/groups/CreateContributionPlanScreen";
import ContributionPlanDetailScreen from "../screens/groups/ContributionPlanDetailScreen";
import EditGroupScreen from "../screens/groups/EditGroupScreen";
import EditGroupWalletScreen from "../screens/groups/EditGroupWalletScreen";
import EditGroupCategoryScreen from "../screens/groups/EditGroupCategoryScreen";
import EditGroupBudgetScreen from "../screens/groups/EditGroupBudgetScreen";
import ContributionHistoryScreen from "../screens/groups/ContributionHistoryScreen";
import GroupRemindersScreen from "../screens/groups/GroupRemindersScreen";
import CreateGroupReminderScreen from "../screens/groups/CreateGroupReminderScreen";
import NotificationsScreen from "../screens/groups/NotificationsScreen";
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

const Stack = createNativeStackNavigator<GroupStackParamList>();

export default function GroupStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GroupList" component={GroupListScreen} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen name="GroupMembers" component={GroupMembersScreen} />
      <Stack.Screen
        name="GroupInvitations"
        component={GroupInvitationsScreen}
      />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} />
      <Stack.Screen name="GroupWallets" component={GroupWalletsScreen} />
      <Stack.Screen name="GroupCategories" component={GroupCategoriesScreen} />
      <Stack.Screen
        name="GroupTransactions"
        component={GroupTransactionsScreen}
      />
      <Stack.Screen
        name="CreateGroupTransaction"
        component={CreateGroupTransactionScreen}
      />
      <Stack.Screen name="GroupBudgets" component={GroupBudgetsScreen} />
      <Stack.Screen
        name="CreateGroupBudget"
        component={CreateGroupBudgetScreen}
      />
      <Stack.Screen
        name="GroupContributionPlans"
        component={GroupContributionPlansScreen}
      />
      <Stack.Screen
        name="CreateContributionPlan"
        component={CreateContributionPlanScreen}
      />
      <Stack.Screen
        name="ContributionPlanDetail"
        component={ContributionPlanDetailScreen}
      />
      <Stack.Screen name="EditGroup" component={EditGroupScreen} />
      <Stack.Screen name="EditGroupWallet" component={EditGroupWalletScreen} />
      <Stack.Screen
        name="EditGroupCategory"
        component={EditGroupCategoryScreen}
      />
      <Stack.Screen name="EditGroupBudget" component={EditGroupBudgetScreen} />
      <Stack.Screen
        name="ContributionHistory"
        component={ContributionHistoryScreen}
      />
      <Stack.Screen name="GroupReminders" component={GroupRemindersScreen} />
      <Stack.Screen
        name="CreateGroupReminder"
        component={CreateGroupReminderScreen}
      />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}
