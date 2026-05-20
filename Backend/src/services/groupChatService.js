const pool = require("../db");
const groupMemberService = require("./groupMemberService");

function mapGroupMessageRow(row) {
  return {
    id: row.group_message_id,
    groupId: row.group_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
    senderAvatarUrl: row.sender_avatar_url,
    messageType: row.message_type,
    content: row.content,
    createdAt: row.created_at,
  };
}

async function getMessagesByGroup(groupId, options = {}) {
  const limit = Math.min(Number(options.limit) || 50, 100);
  const beforeId = options.beforeId ? Number(options.beforeId) : null;

  const params = [groupId, limit];
  let beforeCondition = "";

  if (beforeId) {
    params.push(beforeId);
    beforeCondition = `AND gm.group_message_id < $3`;
  }

  const { rows } = await pool.query(
    `
      SELECT 
        gm.*,
        u.user_name AS sender_name,
        u.email AS sender_email,
        u.avatar_url AS sender_avatar_url
      FROM group_messages gm
      LEFT JOIN users u ON u.user_id = gm.sender_id
      WHERE gm.group_id = $1
        ${beforeCondition}
      ORDER BY gm.group_message_id DESC
      LIMIT $2
    `,
    params,
  );

  return rows.reverse().map(mapGroupMessageRow);
}

async function createMessage(groupId, senderId, payload) {
  const content = String(payload.content || "").trim();
  const messageType = payload.messageType || payload.message_type || "text";

  if (!content) {
    const err = new Error("Nội dung tin nhắn không được để trống");
    err.status = 400;
    throw err;
  }

  if (!["text", "system"].includes(messageType)) {
    const err = new Error("Loại tin nhắn không hợp lệ");
    err.status = 400;
    throw err;
  }

  const isMember = await groupMemberService.isGroupMember(groupId, senderId);

  if (!isMember) {
    const err = new Error("Bạn không phải thành viên của nhóm này");
    err.status = 403;
    throw err;
  }

  const { rows } = await pool.query(
    `
      INSERT INTO group_messages (
        group_id,
        sender_id,
        message_type,
        content
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [groupId, senderId, messageType, content],
  );

  const messageId = rows[0].group_message_id;

  const { rows: fullRows } = await pool.query(
    `
      SELECT 
        gm.*,
        u.user_name AS sender_name,
        u.email AS sender_email,
        u.avatar_url AS sender_avatar_url
      FROM group_messages gm
      LEFT JOIN users u ON u.user_id = gm.sender_id
      WHERE gm.group_message_id = $1
    `,
    [messageId],
  );

  return mapGroupMessageRow(fullRows[0]);
}

async function createSystemMessage(groupId, content) {
  const cleanContent = String(content || "").trim();

  if (!cleanContent) return null;

  const { rows } = await pool.query(
    `
      INSERT INTO group_messages (
        group_id,
        sender_id,
        message_type,
        content
      )
      VALUES ($1, NULL, 'system', $2)
      RETURNING *
    `,
    [groupId, cleanContent],
  );

  return mapGroupMessageRow(rows[0]);
}

module.exports = {
  mapGroupMessageRow,
  getMessagesByGroup,
  createMessage,
  createSystemMessage,
};
