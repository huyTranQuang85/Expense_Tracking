const groupCategoryService = require("../services/groupCategoryService");
const groupWalletService = require("../services/groupWalletService");
const groupTransactionService = require("../services/groupTransactionService");
const groupBudgetService = require("../services/groupBudgetService");

// ===== GROUP CATEGORIES =====
exports.getCategories = async (req, res, next) => {
  try {
    const data = await groupCategoryService.getCategories(
      Number(req.params.groupId),
      {
        type: req.query.type,
      },
    );

    res.json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const data = await groupCategoryService.createCategory(
      Number(req.params.groupId),
      req.user.id,
      req.body,
    );

    res.status(201).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const data = await groupCategoryService.updateCategory(
      Number(req.params.groupId),
      Number(req.params.categoryId),
      req.body,
    );

    res.json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    await groupCategoryService.deleteCategory(
      Number(req.params.groupId),
      Number(req.params.categoryId),
    );

    res.json({
      status: "success",
      message: "Xóa danh mục nhóm thành công",
    });
  } catch (err) {
    next(err);
  }
};

// ===== GROUP WALLETS =====
exports.getWallets = async (req, res, next) => {
  try {
    const data = await groupWalletService.getWallets(
      Number(req.params.groupId),
      {
        includeArchived: req.query.includeArchived,
      },
    );

    res.json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

exports.createWallet = async (req, res, next) => {
  try {
    const data = await groupWalletService.createWallet(
      Number(req.params.groupId),
      req.user.id,
      req.body,
    );

    res.status(201).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

exports.updateWallet = async (req, res, next) => {
  try {
    const data = await groupWalletService.updateWallet(
      Number(req.params.groupId),
      Number(req.params.walletId),
      req.body,
    );

    res.json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

exports.archiveWallet = async (req, res, next) => {
  try {
    const data = await groupWalletService.archiveWallet(
      Number(req.params.groupId),
      Number(req.params.walletId),
    );

    res.json({
      status: "success",
      message: "Lưu trữ ví nhóm thành công",
      data,
    });
  } catch (err) {
    next(err);
  }
};

// ===== GROUP TRANSACTIONS =====
exports.getTransactions = async (req, res, next) => {
  try {
    const data = await groupTransactionService.getTransactions(
      Number(req.params.groupId),
      req.query,
    );

    res.json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

exports.createTransaction = async (req, res, next) => {
  try {
    const data = await groupTransactionService.createTransaction(
      Number(req.params.groupId),
      req.user.id,
      req.body,
    );

    res.status(201).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

exports.updateTransaction = async (req, res, next) => {
  try {
    const data = await groupTransactionService.updateTransaction(
      Number(req.params.groupId),
      Number(req.params.transactionId),
      req.body,
      req.user.id,
    );

    res.json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

exports.deleteTransaction = async (req, res, next) => {
  try {
    await groupTransactionService.deleteTransaction(
      Number(req.params.groupId),
      Number(req.params.transactionId),
      req.user.id,
    );

    res.json({
      status: "success",
      message: "Xóa giao dịch nhóm thành công",
    });
  } catch (err) {
    next(err);
  }
};

// ===== GROUP BUDGETS =====
exports.getBudgets = async (req, res, next) => {
  try {
    const data = await groupBudgetService.getBudgets(
      Number(req.params.groupId),
      {
        month: req.query.month,
      },
    );

    res.json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

exports.createBudget = async (req, res, next) => {
  try {
    const data = await groupBudgetService.createBudget(
      Number(req.params.groupId),
      req.user.id,
      req.body,
    );

    res.status(201).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

exports.updateBudget = async (req, res, next) => {
  try {
    const data = await groupBudgetService.updateBudget(
      Number(req.params.groupId),
      Number(req.params.budgetId),
      req.body,
    );

    res.json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

exports.deleteBudget = async (req, res, next) => {
  try {
    await groupBudgetService.deleteBudget(
      Number(req.params.groupId),
      Number(req.params.budgetId),
    );

    res.json({
      status: "success",
      message: "Xóa ngân sách nhóm thành công",
    });
  } catch (err) {
    next(err);
  }
};

exports.getBudgetUsage = async (req, res, next) => {
  try {
    const data = await groupBudgetService.getBudgetUsage(
      Number(req.params.groupId),
      {
        month: req.query.month,
      },
    );

    res.json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};
