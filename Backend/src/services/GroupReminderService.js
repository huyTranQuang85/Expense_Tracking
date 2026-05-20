const pool = require("../db");
const notificationService = require("./notificationService");

function mapGroupReminderRow(row) {
  return {
    id: row.group_reminder_id,
    groupId: row.group_id,
    title: row.title,
    message: row.message,
    remindAt: row.remind_at,
    channel: row.channel,
    isActive: row.is_active,
    isRecurring: row.is_recurring,
    frequency: row.frequency,
    interval: row.interval,
    byWeekday: row.by_weekday,
    byMonthday: row.by_monthday,
    untilDate: row.until_date,
    timezone: row.timezone,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizePayload(payload) {
  return {
    title: String(payload.title || "").trim(),
    message: payload.message || null,
    remindAt: payload.remindAt || payload.remind_at,
    channel: payload.channel || "in_app",
    isRecurring: Boolean(payload.isRecurring ?? payload.is_recurring ?? false),
    frequency: payload.frequency || null,
    interval: payload.interval != null ? Number(payload.interval) : null,
    byWeekday: payload.byWeekday || payload.by_weekday || null,
    byMonthday:
      payload.byMonthday != null
        ? Number(payload.byMonthday)
        : payload.by_monthday != null
          ? Number(payload.by_monthday)
          : null,
    untilDate: payload.untilDate || payload.until_date || null,
    timezone: payload.timezone || "Asia/Ho_Chi_Minh",
  };
}

function validateReminderPayload(data) {
  if (!data.title) {
    const err = new Error("Tiêu đề nhắc nhở là bắt buộc");
    err.status = 400;
    throw err;
  }

  if (!data.remindAt) {
    const err = new Error("Thời gian nhắc nhở là bắt buộc");
    err.status = 400;
    throw err;
  }

  if (!["in_app", "email"].includes(data.channel)) {
    const err = new Error("Kênh nhắc nhở không hợp lệ");
    err.status = 400;
    throw err;
  }

  if (
    data.isRecurring &&
    !["daily", "weekly", "monthly"].includes(data.frequency)
  ) {
    const err = new Error("Tần suất lặp không hợp lệ");
    err.status = 400;
    throw err;
  }

  if (data.interval != null && data.interval < 1) {
    const err = new Error("Khoảng lặp phải lớn hơn hoặc bằng 1");
    err.status = 400;
    throw err;
  }

  if (
    data.byMonthday != null &&
    (data.byMonthday < 1 || data.byMonthday > 31)
  ) {
    const err = new Error("Ngày trong tháng phải từ 1 đến 31");
    err.status = 400;
    throw err;
  }
}

async function getGroupReminders(groupId, options = {}) {
  const includeInactive =
    options.includeInactive === true || options.includeInactive === "true";

  const { rows } = await pool.query(
    `
      SELECT *
      FROM group_reminders
      WHERE group_id = $1
        AND ($2::boolean = true OR is_active = true)
      ORDER BY remind_at ASC, group_reminder_id DESC
    `,
    [groupId, includeInactive],
  );

  return rows.map(mapGroupReminderRow);
}

async function createGroupReminder(groupId, userId, payload) {
  const data = normalizePayload(payload);
  validateReminderPayload(data);

  const { rows } = await pool.query(
    `
      INSERT INTO group_reminders (
        group_id,
        title,
        message,
        remind_at,
        channel,
        is_recurring,
        frequency,
        interval,
        by_weekday,
        by_monthday,
        until_date,
        timezone,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `,
    [
      groupId,
      data.title,
      data.message,
      data.remindAt,
      data.channel,
      data.isRecurring,
      data.isRecurring ? data.frequency : null,
      data.isRecurring ? data.interval || 1 : null,
      data.isRecurring ? data.byWeekday : null,
      data.isRecurring ? data.byMonthday : null,
      data.isRecurring ? data.untilDate : null,
      data.timezone,
      userId,
    ],
  );

  return mapGroupReminderRow(rows[0]);
}

async function updateGroupReminder(groupId, reminderId, payload) {
  const { rows: existedRows } = await pool.query(
    `
      SELECT *
      FROM group_reminders
      WHERE group_id = $1
        AND group_reminder_id = $2
    `,
    [groupId, reminderId],
  );

  if (existedRows.length === 0) {
    const err = new Error("Không tìm thấy nhắc nhở nhóm");
    err.status = 404;
    throw err;
  }

  const current = existedRows[0];

  const data = {
    title:
      payload.title !== undefined
        ? String(payload.title).trim()
        : current.title,
    message: payload.message !== undefined ? payload.message : current.message,
    remindAt:
      payload.remindAt !== undefined
        ? payload.remindAt
        : payload.remind_at !== undefined
          ? payload.remind_at
          : current.remind_at,
    channel: payload.channel !== undefined ? payload.channel : current.channel,
    isRecurring:
      payload.isRecurring !== undefined
        ? Boolean(payload.isRecurring)
        : payload.is_recurring !== undefined
          ? Boolean(payload.is_recurring)
          : current.is_recurring,
    frequency:
      payload.frequency !== undefined ? payload.frequency : current.frequency,
    interval:
      payload.interval !== undefined
        ? Number(payload.interval)
        : current.interval,
    byWeekday:
      payload.byWeekday !== undefined
        ? payload.byWeekday
        : payload.by_weekday !== undefined
          ? payload.by_weekday
          : current.by_weekday,
    byMonthday:
      payload.byMonthday !== undefined
        ? Number(payload.byMonthday)
        : payload.by_monthday !== undefined
          ? Number(payload.by_monthday)
          : current.by_monthday,
    untilDate:
      payload.untilDate !== undefined
        ? payload.untilDate
        : payload.until_date !== undefined
          ? payload.until_date
          : current.until_date,
    timezone:
      payload.timezone !== undefined ? payload.timezone : current.timezone,
    isActive:
      payload.isActive !== undefined
        ? Boolean(payload.isActive)
        : payload.is_active !== undefined
          ? Boolean(payload.is_active)
          : current.is_active,
  };

  validateReminderPayload(data);

  const { rows } = await pool.query(
    `
      UPDATE group_reminders
      SET title = $1,
          message = $2,
          remind_at = $3,
          channel = $4,
          is_active = $5,
          is_recurring = $6,
          frequency = $7,
          interval = $8,
          by_weekday = $9,
          by_monthday = $10,
          until_date = $11,
          timezone = $12,
          updated_at = now()
      WHERE group_id = $13
        AND group_reminder_id = $14
      RETURNING *
    `,
    [
      data.title,
      data.message,
      data.remindAt,
      data.channel,
      data.isActive,
      data.isRecurring,
      data.isRecurring ? data.frequency : null,
      data.isRecurring ? data.interval || 1 : null,
      data.isRecurring ? data.byWeekday : null,
      data.isRecurring ? data.byMonthday : null,
      data.isRecurring ? data.untilDate : null,
      data.timezone,
      groupId,
      reminderId,
    ],
  );

  return mapGroupReminderRow(rows[0]);
}

async function deactivateGroupReminder(groupId, reminderId) {
  const { rows } = await pool.query(
    `
      UPDATE group_reminders
      SET is_active = false,
          updated_at = now()
      WHERE group_id = $1
        AND group_reminder_id = $2
      RETURNING *
    `,
    [groupId, reminderId],
  );

  if (rows.length === 0) {
    const err = new Error("Không tìm thấy nhắc nhở nhóm");
    err.status = 404;
    throw err;
  }

  return mapGroupReminderRow(rows[0]);
}

async function sendReminderNow(groupId, reminderId, actorId) {
  const { rows: reminderRows } = await pool.query(
    `
      SELECT *
      FROM group_reminders
      WHERE group_id = $1
        AND group_reminder_id = $2
        AND is_active = true
    `,
    [groupId, reminderId],
  );

  if (reminderRows.length === 0) {
    const err = new Error("Không tìm thấy nhắc nhở đang hoạt động");
    err.status = 404;
    throw err;
  }

  const reminder = reminderRows[0];

  const { rows: memberRows } = await pool.query(
    `
      SELECT user_id
      FROM group_members
      WHERE group_id = $1
    `,
    [groupId],
  );

  const notifications = [];

  for (const member of memberRows) {
    const notification = await notificationService.createNotification({
      userId: member.user_id,
      type: "reminder",
      title: reminder.title,
      message: reminder.message || reminder.title,
      metadata: {
        action: "group_reminder",
        groupId,
        reminderId,
        triggeredBy: actorId,
      },
    });

    notifications.push(notification);

    await pool.query(
      `
        INSERT INTO group_reminder_logs (
          group_reminder_id,
          group_id,
          user_id,
          channel,
          sent_on
        )
        VALUES ($1, $2, $3, $4, CURRENT_DATE)
        ON CONFLICT (group_reminder_id, user_id, channel, sent_on)
        DO NOTHING
      `,
      [reminderId, groupId, member.user_id, reminder.channel],
    );
  }

  return {
    reminder: mapGroupReminderRow(reminder),
    sentCount: notifications.length,
  };
}

module.exports = {
  mapGroupReminderRow,
  getGroupReminders,
  createGroupReminder,
  updateGroupReminder,
  deactivateGroupReminder,
  sendReminderNow,
};
