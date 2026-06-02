const socketAuthMiddleware = require("../middlewares/socketAuthMiddleware");
const groupMemberService = require("../services/groupMemberService");
const groupChatService = require("../services/groupChatService");
const pool = require("../db");

function getGroupRoom(groupId) {
  return `group:${groupId}`;
}

const typingThrottle = new Map();
const TYPING_THROTTLE_MS = 800;

// groupId(string) -> userId(string) -> Set<socketId>
const onlineByGroup = new Map();
// socketId -> Set<groupId(string)>
const groupsBySocket = new Map();

function shouldThrottleTyping(socketId, groupId, eventName) {
  const key = `${socketId}:${groupId}:${eventName}`;
  const now = Date.now();
  const last = typingThrottle.get(key) || 0;

  if (now - last < TYPING_THROTTLE_MS) {
    return true;
  }

  typingThrottle.set(key, now);
  return false;
}

async function getSocketUserProfile(userId) {
  const { rows } = await pool.query(
    `
      SELECT user_id, user_name, avatar_url
      FROM users
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  return rows[0] || null;
}

async function validateTypingPayload(groupId, userId) {
  if (!groupId || Number.isNaN(groupId)) {
    return false;
  }

  return groupMemberService.isGroupMember(groupId, userId);
}

function addPresence(groupId, userId, socketId) {
  const groupKey = String(groupId);
  const userKey = String(userId);

  if (!onlineByGroup.has(groupKey)) {
    onlineByGroup.set(groupKey, new Map());
  }

  const groupMap = onlineByGroup.get(groupKey);

  if (!groupMap.has(userKey)) {
    groupMap.set(userKey, new Set());
  }

  groupMap.get(userKey).add(socketId);

  if (!groupsBySocket.has(socketId)) {
    groupsBySocket.set(socketId, new Set());
  }

  groupsBySocket.get(socketId).add(groupKey);
}

function removePresence(groupId, userId, socketId) {
  const groupKey = String(groupId);
  const userKey = String(userId);
  const groupMap = onlineByGroup.get(groupKey);

  if (groupMap) {
    const socketSet = groupMap.get(userKey);

    if (socketSet) {
      socketSet.delete(socketId);

      if (socketSet.size === 0) {
        groupMap.delete(userKey);
      }
    }

    if (groupMap.size === 0) {
      onlineByGroup.delete(groupKey);
    }
  }

  const socketGroups = groupsBySocket.get(socketId);

  if (socketGroups) {
    socketGroups.delete(groupKey);

    if (socketGroups.size === 0) {
      groupsBySocket.delete(socketId);
    }
  }
}

async function getOnlineUsersForGroup(groupId) {
  const groupMap = onlineByGroup.get(String(groupId));
  const userIds = groupMap ? Array.from(groupMap.keys()) : [];

  if (userIds.length === 0) {
    return [];
  }

  const { rows } = await pool.query(
    `
      SELECT user_id, user_name, avatar_url
      FROM users
      WHERE user_id = ANY($1::uuid[])
    `,
    [userIds],
  );

  const byId = new Map(rows.map((row) => [String(row.user_id), row]));

  return userIds.map((userId) => {
    const row = byId.get(String(userId));

    return {
      userId: String(userId),
      userName: row?.user_name || null,
      avatarUrl: row?.avatar_url || null,
    };
  });
}

async function emitPresence(io, groupId) {
  try {
    const onlineUsers = await getOnlineUsersForGroup(groupId);

    io.to(getGroupRoom(groupId)).emit("group:presence:update", {
      groupId: Number(groupId),
      onlineCount: onlineUsers.length,
      onlineUsers,
    });
  } catch (err) {
    console.error("group:presence:update error:", err.message);
  }
}

async function removeSocketFromAllPresence(io, socket) {
  const groupIds = Array.from(groupsBySocket.get(socket.id) || []);

  for (const groupId of groupIds) {
    removePresence(groupId, socket.user.id, socket.id);
    await emitPresence(io, groupId);
  }
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
        addPresence(groupId, socket.user.id, socket.id);

        if (typeof callback === "function") {
          callback({
            status: "success",
            message: "Đã tham gia phòng chat nhóm",
            groupId,
          });
        }

        await emitPresence(io, groupId);
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

        removePresence(groupId, socket.user.id, socket.id);
        socket.leave(getGroupRoom(groupId));

        if (typeof callback === "function") {
          callback({
            status: "success",
            message: "Đã rời phòng chat nhóm",
            groupId,
          });
        }

        await emitPresence(io, groupId);
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
        socket.to(getGroupRoom(groupId)).emit("group:stop_typing", {
          groupId,
          userId: socket.user.id,
          isTyping: false,
        });

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
      try {
        const groupId = Number(payload?.groupId);

        if (shouldThrottleTyping(socket.id, groupId, "typing")) return;

        const isMember = await validateTypingPayload(groupId, socket.user.id);
        if (!isMember) return;

        const profile = await getSocketUserProfile(socket.user.id);

        socket.to(getGroupRoom(groupId)).emit("group:typing", {
          groupId,
          userId: socket.user.id,
          userName: profile?.user_name,
          avatarUrl: profile?.avatar_url,
          isTyping: true,
        });
      } catch (err) {
        console.error("group:typing error:", err.message);
      }
    });

    socket.on("group:stop_typing", async (payload) => {
      try {
        const groupId = Number(payload?.groupId);

        const isMember = await validateTypingPayload(groupId, socket.user.id);
        if (!isMember) return;

        socket.to(getGroupRoom(groupId)).emit("group:stop_typing", {
          groupId,
          userId: socket.user.id,
          isTyping: false,
        });
      } catch (err) {
        console.error("group:stop_typing error:", err.message);
      }
    });

    socket.on("disconnect", async () => {
      for (const key of typingThrottle.keys()) {
        if (key.startsWith(`${socket.id}:`)) {
          typingThrottle.delete(key);
        }
      }

      await removeSocketFromAllPresence(io, socket);

      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = registerGroupChatSocket;
