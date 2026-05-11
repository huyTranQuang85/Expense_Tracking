const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

// Đăng ký
router.post("/register", authController.register);

// Đăng nhập
router.post("/login", authController.login);
// Cập nhật thông tin user
router.put("/me", authMiddleware, authController.updateProfile);
// Đổi mật khẩu
router.post("/change-password", authMiddleware, authController.changePassword);
module.exports = router;
