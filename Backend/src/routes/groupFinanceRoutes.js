const express = require("express");
const auth = require("../middlewares/authMiddleware");
const groupFinanceController = require("../controllers/groupFinanceController");
const {
  requireGroupMember,
  requireGroupOwner,
} = require("../middlewares/groupAccessMiddleware");

const router = express.Router();

router.use(auth);

// Categories
router.get(
  "/:groupId/categories",
  requireGroupMember,
  groupFinanceController.getCategories,
);

router.post(
  "/:groupId/categories",
  requireGroupOwner,
  groupFinanceController.createCategory,
);

router.patch(
  "/:groupId/categories/:categoryId",
  requireGroupOwner,
  groupFinanceController.updateCategory,
);

router.delete(
  "/:groupId/categories/:categoryId",
  requireGroupOwner,
  groupFinanceController.deleteCategory,
);

// Wallets
router.get(
  "/:groupId/wallets",
  requireGroupMember,
  groupFinanceController.getWallets,
);

router.post(
  "/:groupId/wallets",
  requireGroupOwner,
  groupFinanceController.createWallet,
);

router.patch(
  "/:groupId/wallets/:walletId",
  requireGroupOwner,
  groupFinanceController.updateWallet,
);

router.patch(
  "/:groupId/wallets/:walletId/archive",
  requireGroupOwner,
  groupFinanceController.archiveWallet,
);

// Transactions
router.get(
  "/:groupId/transactions",
  requireGroupMember,
  groupFinanceController.getTransactions,
);

router.post(
  "/:groupId/transactions",
  requireGroupMember,
  groupFinanceController.createTransaction,
);

router.patch(
  "/:groupId/transactions/:transactionId",
  requireGroupMember,
  groupFinanceController.updateTransaction,
);

router.delete(
  "/:groupId/transactions/:transactionId",
  requireGroupMember,
  groupFinanceController.deleteTransaction,
);

// Budgets
router.get(
  "/:groupId/budgets",
  requireGroupMember,
  groupFinanceController.getBudgets,
);

router.post(
  "/:groupId/budgets",
  requireGroupOwner,
  groupFinanceController.createBudget,
);

router.patch(
  "/:groupId/budgets/:budgetId",
  requireGroupOwner,
  groupFinanceController.updateBudget,
);

router.delete(
  "/:groupId/budgets/:budgetId",
  requireGroupOwner,
  groupFinanceController.deleteBudget,
);

router.get(
  "/:groupId/budget-usage",
  requireGroupMember,
  groupFinanceController.getBudgetUsage,
);

module.exports = router;
