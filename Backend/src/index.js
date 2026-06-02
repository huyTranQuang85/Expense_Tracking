const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const pool = require("./db");
const errorHandler = require("./middlewares/errorHandler");

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());

// ====== STATIC FILES ======
// Serve uploaded files, e.g. /uploads/avatars/avatar.jpg
// Folder structure: Backend/uploads/...
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ====== ROUTES ======
const authRoutes = require("./routes/authRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const walletRoutes = require("./routes/walletRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");

const groupRoutes = require("./routes/groupRoutes");
const groupFinanceRoutes = require("./routes/groupFinanceRoutes");
const groupContributionRoutes = require("./routes/groupContributionRoutes");
const groupChatRoutes = require("./routes/groupChatRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const groupReminderRoutes = require("./routes/groupReminderRoutes");
const registerGroupChatSocket = require("./sockets/groupChatSocket");
const {
  startGroupReminderScheduler,
} = require("./schedulers/groupReminderScheduler");

// ====== SOCKET.IO ======
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
});

registerGroupChatSocket(io);

// Cho controller khác dùng io nếu sau này cần emit notification
app.set("io", io);

// ====== HEALTH CHECK ======
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT 1 as ok");

    res.json({
      status: "ok",
      db: result.rows[0].ok,
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "DB error",
    });
  }
});

// ====== USE ROUTES ======
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/wallets", walletRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/chatbot", chatbotRoutes);

app.use("/api/groups", groupRoutes);
app.use("/api/groups", groupFinanceRoutes);
app.use("/api/groups", groupContributionRoutes);
app.use("/api/groups", groupChatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/groups", groupReminderRoutes);

// ====== ERROR HANDLER ======
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
