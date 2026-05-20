const { verifyToken } = require("../utils/jwt");

function socketAuthMiddleware(socket, next) {
  try {
    const authToken =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization ||
      "";

    let token = authToken;

    if (typeof token === "string" && token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    if (!token) {
      return next(new Error("Thiếu token xác thực socket"));
    }

    const payload = verifyToken(token);
    const userId = payload.userId || payload.id || payload.user_id;

    if (!userId) {
      return next(new Error("Token không chứa userId hợp lệ"));
    }

    socket.user = {
      id: userId,
    };

    next();
  } catch (err) {
    console.error("socketAuthMiddleware error:", err.message);
    next(new Error("Token socket không hợp lệ hoặc đã hết hạn"));
  }
}

module.exports = socketAuthMiddleware;
