const authService = require("../services/authService");

async function register(req, res) {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "fullName, email, password là bắt buộc",
      });
    }

    const result = await authService.registerUser({
      fullName,
      email,
      password,
    });

    return res.status(201).json({
      status: "success",
      data: result,
    });
  } catch (err) {
    if (err.type === "EMAIL_EXISTS") {
      return res.status(409).json({
        status: "error",
        message: "Email đã được sử dụng",
      });
    }

    console.error("register error:", err);
    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi đăng ký",
    });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email và mật khẩu là bắt buộc",
      });
    }

    const result = await authService.loginUser({ email, password });

    return res.json({
      status: "success",
      data: result,
    });
  } catch (err) {
    if (err.type === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        status: "error",
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    console.error("login error:", err);
    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi đăng nhập",
    });
  }
}

async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { fullName, phoneNumber, bio, avatarUrl } = req.body;

    const user = await authService.updateProfile(userId, {
      fullName,
      phoneNumber,
      bio,
      avatarUrl,
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Không tìm thấy người dùng",
      });
    }

    return res.json({
      status: "success",
      data: { user },
    });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi cập nhật hồ sơ",
    });
  }
}
async function changePassword(req, res) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: "error",
        message: "currentPassword và newPassword là bắt buộc",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Mật khẩu mới phải có ít nhất 6 ký tự",
      });
    }

    await authService.changePassword(userId, currentPassword, newPassword);

    return res.json({
      status: "success",
      message: "Đổi mật khẩu thành công",
    });
  } catch (err) {
    if (err.type === "INVALID_CURRENT_PASSWORD") {
      return res.status(400).json({
        status: "error",
        message: "Mật khẩu hiện tại không đúng",
      });
    }

    console.error("changePassword error:", err);
    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi đổi mật khẩu",
    });
  }
}

module.exports = {
  register,
  login,
  updateProfile,
  changePassword,
};
