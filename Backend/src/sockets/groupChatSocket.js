const socketAuthMiddleware = require("../middlewares/socketAuthMiddleware");
const groupMemberService = require("../services/groupMemberService");
const groupChatService = require("../services/groupChatService");

function getGroupRoom(groupId) {
  return `group:${groupId}`;
}

function registerGroupChatSocket(io) {
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}, user: ${socket.user.id}`);

    socket.on("group:join", async (payload, callback) => {
      try {
        const groupId = Number(payload?.groupId);

        if (!groupId || Number.isNaN(groupId)) {
          throw new Error("groupId không hợp lệ");
        }

        const isMember = await groupMemberService.isGroupMember(
          groupId,
          socket.user.id,
        );

        if (!isMember) {
          throw new Error("Bạn không có quyền tham gia phòng chat nhóm này");
        }

        socket.join(getGroupRoom(groupId));

        if (typeof callback === "function") {
          callback({
            status: "success",
            message: "Đã tham gia phòng chat nhóm",
            groupId,
          });
        }
      } catch (err) {
        console.error("group:join error:", err.message);

        if (typeof callback === "function") {
          callback({
            status: "error",
            message: err.message,
          });
        }
      }
    });

    socket.on("group:leave", async (payload, callback) => {
      try {
        const groupId = Number(payload?.groupId);

        if (!groupId || Number.isNaN(groupId)) {
          throw new Error("groupId không hợp lệ");
        }

        socket.leave(getGroupRoom(groupId));

        if (typeof callback === "function") {
          callback({
            status: "success",
            message: "Đã rời phòng chat nhóm",
            groupId,
          });
        }
      } catch (err) {
        console.error("group:leave error:", err.message);

        if (typeof callback === "function") {
          callback({
            status: "error",
            message: err.message,
          });
        }
      }
    });

    socket.on("group:message:send", async (payload, callback) => {
      try {
        const groupId = Number(payload?.groupId);
        const content = payload?.content;

        if (!groupId || Number.isNaN(groupId)) {
          throw new Error("groupId không hợp lệ");
        }

        const message = await groupChatService.createMessage(
          groupId,
          socket.user.id,
          {
            content,
            messageType: "text",
          },
        );

        io.to(getGroupRoom(groupId)).emit("group:message:new", message);

        if (typeof callback === "function") {
          callback({
            status: "success",
            data: message,
          });
        }
      } catch (err) {
        console.error("group:message:send error:", err.message);

        if (typeof callback === "function") {
          callback({
            status: "error",
            message: err.message,
          });
        }
      }
    });

    socket.on("group:typing", async (payload) => {
      const groupId = Number(payload?.groupId);

      if (!groupId || Number.isNaN(groupId)) return;

      socket.to(getGroupRoom(groupId)).emit("group:typing", {
        groupId,
        userId: socket.user.id,
      });
    });

    socket.on("group:stop_typing", async (payload) => {
      const groupId = Number(payload?.groupId);

      if (!groupId || Number.isNaN(groupId)) return;

      socket.to(getGroupRoom(groupId)).emit("group:stop_typing", {
        groupId,
        userId: socket.user.id,
      });
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = registerGroupChatSocket;
