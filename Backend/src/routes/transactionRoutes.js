const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const transactionController = require("../controllers/transactionController");

// Tất cả routes dưới đây đều yêu cầu đăng nhập
router.use(authMiddleware);

// Lấy danh sách giao dịch (có filter)
router.get("/", transactionController.listTransactions);

// Recurring transactions
router.get("/recurring", transactionController.listRecurring);
router.post("/recurring", transactionController.createRecurring);
router.put("/recurring/:id", transactionController.updateRecurring);
router.delete("/recurring/:id", transactionController.deleteRecurring);

// Chuyen tien giua vi
router.post("/transfer", transactionController.createTransfer);

// Tạo giao dịch mới
router.post("/", transactionController.createTransaction);

// Cập nhật giao dịch
router.put("/:id", transactionController.updateTransaction);

// LẤY GIỎ RÁC
router.get("/trash", transactionController.listDeletedTransactions);

// KHÔI PHỤC
router.post("/:id/restore", transactionController.restoreTransaction);

// Xoá mềm giao dịch
router.delete("/:id", transactionController.deleteTransaction);

// XOÁ VĨNH VIỄN (chỉ những cái đã soft delete)
router.delete("/:id/force", transactionController.forceDeleteTransaction);

module.exports = router;
