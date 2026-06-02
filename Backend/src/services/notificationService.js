const pool = require("../db");

function mapNotificationRow(row) {
  return {
    id: row.notification_id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    metadata: row.metadata,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

async function createNotification(payload, client = pool) {
  const { userId, type = "system", title, message, metadata = null } = payload;

  if (!userId) {
    const err = new Error("userId là bắt buộc khi tạo notification");
    err.status = 400;
    throw err;
  }

  if (!message || !String(message).trim()) {
    const err = new Error("Nội dung notification là bắt buộc");
    err.status = 400;
    throw err;
  }

  const { rows } = await client.query(
    `
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [userId, type, title || null, String(message).trim(), metadata],
  );

  return mapNotificationRow(rows[0]);
}

async function createNotificationsBulk(payloads = [], client = pool) {
  if (!Array.isArray(payloads) || payloads.length === 0) {
    return [];
  }

  const created = [];

  for (const payload of payloads) {
    created.push(await createNotification(payload, client));
  }

  return created;
}

async function getMyNotifications(userId, options = {}) {
  const limit = Math.min(Number(options.limit) || 50, 100);
  const onlyUnread =
    options.onlyUnread === true || options.onlyUnread === "true";

  const { rows } = await pool.query(
    `
      SELECT *
      FROM notifications
      WHERE user_id = $1
        AND ($2::boolean = false OR is_read = false)
      ORDER BY created_at DESC
      LIMIT $3
    `,
    [userId, onlyUnread, limit],
  );

  return rows.map(mapNotificationRow);
}

async function countUnread(userId) {
  const { rows } = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM notifications
      WHERE user_id = $1
        AND is_read = false
    `,
    [userId],
  );

  return rows[0].total || 0;
}

async function markAsRead(userId, notificationId) {
  const { rows } = await pool.query(
    `
      UPDATE notifications
      SET is_read = true
      WHERE notification_id = $1
        AND user_id = $2
      RETURNING *
    `,
    [notificationId, userId],
  );

  if (rows.length === 0) {
    const err = new Error("Không tìm thấy thông báo");
    err.status = 404;
    throw err;
  }

  return mapNotificationRow(rows[0]);
}

async function markAllAsRead(userId) {
  await pool.query(
    `
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1
        AND is_read = false
    `,
    [userId],
  );

  return true;
}

module.exports = {
  createNotification,
  createNotificationsBulk,
  getMyNotifications,
  countUnread,
  markAsRead,
  markAllAsRead,
};
