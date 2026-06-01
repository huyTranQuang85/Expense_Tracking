const walletService = require("../services/walletService");

exports.getMyWallets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const includeArchived = String(req.query.includeArchived || "false") === "true";
    const wallets = await walletService.getWalletsByUser(userId, { includeArchived });

    res.json({
      status: "success",
      data: wallets,
    });
  } catch (err) {
    next(err);
  }
};

exports.getWalletStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fromDate, toDate } = req.query;

    const stats = await walletService.getWalletStatsByUser(userId, {
      fromDate: fromDate || null,
      toDate: toDate || null,
    });

    res.json({
      status: "success",
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

exports.createWallet = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const payload = req.body;

    const wallet = await walletService.createWallet(userId, payload);

    res.status(201).json({
      status: "success",
      data: wallet,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateWallet = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const walletId = Number(req.params.id);
    const payload = req.body;

    const wallet = await walletService.updateWallet(userId, walletId, payload);

    res.json({
      status: "success",
      data: wallet,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteWallet = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const walletId = Number(req.params.id);

    await walletService.deleteWallet(userId, walletId);

    res.json({
      status: "success",
      message: "Xóa ví thành công",
    });
  } catch (err) {
    next(err);
  }
};
