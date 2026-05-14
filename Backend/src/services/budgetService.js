const pool = require("../db");
const { sendBudgetAlertEmail } = require("./emailService");

/**
 * Helper: map 1 row budget -> object trả về cho FE
 */
function mapBudgetRow(row, extra = {}) {
  if (!row) return null;
  return {
    id: row.budget_id,
    month: row.month, // Date
    limitAmount: Number(row.limit_amount),
    alertThreshold: row.alert_threshold, // 70 | 80 | 90 | 100
    notifyInApp: row.notify_in_app,
    notifyEmail: row.notify_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...extra,
  };
}
function normalizeMonthDate(input) {
  const now = new Date();

  if (!input) {
    // không truyền gì -> lấy tháng hiện tại
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), 1);
  }

  if (typeof input === "string") {
    // hỗ trợ "YYYY-MM-DD" hoặc "YYYY-MM-DDT..."
    const onlyDate = input.slice(0, 10);
    const [yStr, mStr] = onlyDate.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    if (y && m) {
      return new Date(y, m - 1, 1);
    }
  }

  const d = new Date(input);
  if (!Number.isNaN(d.getTime())) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  // fallback
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Lấy budget tháng hiện tại (global – tất cả chi tiêu, mọi ví)
 * + tính tổng chi tiêu tháng và % đã dùng
 */
async function getCurrentBudget(userId) {
  // 1. Lấy budget global (category_id NULL, wallet_id NULL) của tháng hiện tại
  const { rows: budgetRows } = await pool.query(
    `
    SELECT *
    FROM budgets
    WHERE user_id = $1
      AND month = date_trunc('month', CURRENT_DATE)::date
      AND category_id IS NULL
      AND wallet_id IS NULL
    LIMIT 1
    `,
    [userId]
  );

  if (budgetRows.length === 0) {
    return null; // user chưa set hạn mức
  }

  const b = budgetRows[0];

  // 2. Tính tổng chi tiêu tháng này (chỉ expense, chưa bị soft delete)
  const { rows: spendRows } = await pool.query(
    `
    SELECT COALESCE(SUM(t.amount), 0) AS total
    FROM transactions t
    JOIN categories c ON c.category_id = t.category_id
    WHERE t.user_id = $1
      AND t.deleted_at IS NULL
      AND c.type = 'expense'
      AND t.tx_date >= date_trunc('month', CURRENT_DATE)::date
      AND t.tx_date <  (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
    `,
    [userId]
  );

  const spent = Number(spendRows[0].total);
  const limit = Number(b.limit_amount);
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;

  const isOverThreshold = percentage >= b.alert_threshold;
  const isOverLimit = spent > limit;

  return mapBudgetRow(b, {
    spentThisMonth: spent,
    percentage,
    isOverThreshold,
    isOverLimit,
  });
}

/**
 * Tạo / cập nhật budget tháng hiện tại (global)
 * payload: { limitAmount, alertThreshold, notifyInApp, notifyEmail }
 */
async function upsertCurrentBudget(userId, payload) {
  const {
    limitAmount,
    alertThreshold = 80,
    notifyInApp,
    notifyEmail,
  } = payload;

  const limit = Number(limitAmount);
  if (!Number.isFinite(limit) || limit <= 0) {
    const err = new Error("LIMIT_INVALID");
    err.type = "LIMIT_INVALID";
    throw err;
  }

  const allowedThresholds = [70, 80, 90, 100];
  if (!allowedThresholds.includes(Number(alertThreshold))) {
    const err = new Error("THRESHOLD_INVALID");
    err.type = "THRESHOLD_INVALID";
    throw err;
  }

  // Tháng hiện tại (dùng chung cho SELECT / INSERT)
  const monthExpr = `date_trunc('month', CURRENT_DATE)::date`;

  // Kiểm tra đã có budget global tháng này chưa
  const { rows: existingRows } = await pool.query(
    `
    SELECT *
    FROM budgets
    WHERE user_id = $1
      AND month = ${monthExpr}
      AND category_id IS NULL
      AND wallet_id IS NULL
    LIMIT 1
    `,
    [userId]
  );

  let budgetRow;

  if (existingRows.length === 0) {
    // Chưa có → INSERT
    const { rows } = await pool.query(
      `
      INSERT INTO budgets (
        user_id, category_id, wallet_id, month,
        limit_amount, alert_threshold, notify_in_app, notify_email
      )
      VALUES (
        $1, NULL, NULL,
        ${monthExpr},
        $2, $3,
        COALESCE($4, false),
        COALESCE($5, false)
      )
      RETURNING *
      `,
      [userId, limit, alertThreshold, notifyInApp, notifyEmail]
    );
    budgetRow = rows[0];
  } else {
    // Đã có → UPDATE
    const existing = existingRows[0];
    const { rows } = await pool.query(
      `
      UPDATE budgets
      SET
        limit_amount   = $2,
        alert_threshold = $3,
        notify_in_app  = COALESCE($4, notify_in_app),
        notify_email   = COALESCE($5, notify_email),
        updated_at     = now()
      WHERE budget_id = $1
      RETURNING *
      `,
      [existing.budget_id, limit, alertThreshold, notifyInApp, notifyEmail]
    );
    budgetRow = rows[0];
  }

  // Sau khi update xong, tính luôn % đã dùng rồi trả về
  const current = await getCurrentBudget(userId);

  // đề phòng getCurrentBudget trả null (không nên)
  return (
    current ||
    mapBudgetRow(budgetRow, {
      spentThisMonth: 0,
      percentage: 0,
      isOverLimit: false,
      isOverThreshold: false,
    })
  );
}

/**
 * (Option) Lịch sử budget vài tháng gần đây
 */
async function listBudgetHistory(userId, months = 6) {
  const m = Math.max(1, Math.min(24, Number(months) || 6));

  const { rows } = await pool.query(
    `
    SELECT *
    FROM budgets
    WHERE user_id = $1
      AND category_id IS NULL
      AND wallet_id IS NULL
    ORDER BY month DESC
    LIMIT $2
    `,
    [userId, m]
  );

  return rows.map((row) => mapBudgetRow(row));
}



module.exports = {
  getCurrentBudget,
  upsertCurrentBudget,
  listBudgetHistory,
};
