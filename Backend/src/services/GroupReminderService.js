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

  const remindDate = new Date(data.remindAt);
  if (Number.isNaN(remindDate.getTime())) {
    const err = new Error("Thời gian nhắc nhở không hợp lệ");
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

function toDateOnly(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonthsClamped(date, months, monthDay = null) {
  const next = new Date(date);
  const originalHours = next.getHours();
  const originalMinutes = next.getMinutes();
  const originalSeconds = next.getSeconds();
  const originalMs = next.getMilliseconds();

  const targetDay = monthDay || next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);

  const lastDay = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();
  next.setDate(Math.min(targetDay, lastDay));
  next.setHours(originalHours, originalMinutes, originalSeconds, originalMs);
  return next;
}

function normalizeWeekdays(value) {
  if (!value) return [];
  if (Array.isArray(value))
    return value.map(Number).filter((v) => v >= 0 && v <= 6);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((v) => v >= 0 && v <= 6);
  }
  return [];
}

function getNextReminderDate(reminder, now = new Date()) {
  if (!reminder.is_recurring) return null;

  const interval = Math.max(Number(reminder.interval || 1), 1);
  const current = new Date(reminder.remind_at);
  let next;

  if (reminder.frequency === "daily") {
    next = addDays(current, interval);
  } else if (reminder.frequency === "weekly") {
    const weekdays = normalizeWeekdays(reminder.by_weekday);

    if (weekdays.length > 0) {
      next = new Date(current);
      for (let i = 1; i <= 7 * interval + 7; i += 1) {
        const candidate = addDays(current, i);
        if (weekdays.includes(candidate.getDay()) && candidate > current) {
          next = candidate;
          break;
        }
      }
    } else {
      next = addDays(current, 7 * interval);
    }
  } else if (reminder.frequency === "monthly") {
    next = addMonthsClamped(current, interval, reminder.by_monthday);
  } else {
    return null;
  }

  // Nếu server bị tắt lâu, nhảy tới lần kế tiếp trong tương lai để không gửi bù hàng loạt.
  let guard = 0;
  while (next <= now && guard < 366) {
    const pseudoReminder = { ...reminder, remind_at: next };
    next = getNextReminderDate(pseudoReminder, new Date(next.getTime() - 1));
    guard += 1;
    if (!next) break;
  }

  if (!next || Number.isNaN(next.getTime())) return null;

  if (reminder.until_date) {
    const untilDate = new Date(
      `${toDateOnly(new Date(reminder.until_date))}T23:59:59`,
    );
    if (next > untilDate) return null;
  }

  return next;
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

async function createReminderNotifications(
  client,
  reminder,
  actorId = null,
  action = "group_reminder",
) {
  const { rows: memberRows } = await client.query(
    `
      SELECT user_id
      FROM group_members
      WHERE group_id = $1
    `,
    [reminder.group_id],
  );

  let sentCount = 0;

  for (const member of memberRows) {
    const logResult = await client.query(
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
        RETURNING group_reminder_log_id
      `,
      [
        reminder.group_reminder_id,
        reminder.group_id,
        member.user_id,
        reminder.channel,
      ],
    );

    if (logResult.rows.length === 0) continue;

    await client.query(
      `
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          metadata
        )
        VALUES ($1, 'reminder', $2, $3, $4)
      `,
      [
        member.user_id,
        reminder.title,
        reminder.message || reminder.title,
        {
          action,
          groupId: reminder.group_id,
          reminderId: reminder.group_reminder_id,
          triggeredBy: actorId,
          remindAt: reminder.remind_at,
        },
      ],
    );

    sentCount += 1;
  }

  return sentCount;
}

async function sendReminderNow(groupId, reminderId, actorId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows: reminderRows } = await client.query(
      `
        SELECT *
        FROM group_reminders
        WHERE group_id = $1
          AND group_reminder_id = $2
          AND is_active = true
        FOR UPDATE
      `,
      [groupId, reminderId],
    );

    if (reminderRows.length === 0) {
      const err = new Error("Không tìm thấy nhắc nhở đang hoạt động");
      err.status = 404;
      throw err;
    }

    const reminder = reminderRows[0];
    const sentCount = await createReminderNotifications(
      client,
      reminder,
      actorId,
      "group_reminder_manual",
    );

    await client.query("COMMIT");

    return {
      reminder: mapGroupReminderRow(reminder),
      sentCount,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function processDueGroupReminders(options = {}) {
  const limit = Math.min(Number(options.limit) || 50, 200);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows: reminderRows } = await client.query(
      `
        SELECT *
        FROM group_reminders
        WHERE is_active = true
          AND channel = 'in_app'
          AND remind_at <= now()
        ORDER BY remind_at ASC, group_reminder_id ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      `,
      [limit],
    );

    let reminderCount = 0;
    let notificationCount = 0;
    const now = new Date();

    for (const reminder of reminderRows) {
      const sentCount = await createReminderNotifications(
        client,
        reminder,
        null,
        "group_reminder_due",
      );

      notificationCount += sentCount;
      reminderCount += 1;

      if (reminder.is_recurring) {
        const nextDate = getNextReminderDate(reminder, now);

        if (nextDate) {
          await client.query(
            `
              UPDATE group_reminders
              SET remind_at = $1,
                  updated_at = now()
              WHERE group_reminder_id = $2
            `,
            [nextDate.toISOString(), reminder.group_reminder_id],
          );
        } else {
          await client.query(
            `
              UPDATE group_reminders
              SET is_active = false,
                  updated_at = now()
              WHERE group_reminder_id = $1
            `,
            [reminder.group_reminder_id],
          );
        }
      } else {
        await client.query(
          `
            UPDATE group_reminders
            SET is_active = false,
                updated_at = now()
            WHERE group_reminder_id = $1
          `,
          [reminder.group_reminder_id],
        );
      }
    }

    await client.query("COMMIT");

    return {
      reminderCount,
      notificationCount,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  mapGroupReminderRow,
  getGroupReminders,
  createGroupReminder,
  updateGroupReminder,
  deactivateGroupReminder,
  sendReminderNow,
  processDueGroupReminders,
};
