const pool = require("../db");

function mapGroupBudgetRow(row) {
  return {
    id: row.group_budget_id,
    groupId: row.group_id,
    month: row.month,
    groupCategoryId: row.group_category_id,
    categoryName: row.category_name,
    groupWalletId: row.group_wallet_id,
    walletName: row.wallet_name,
    limitAmount: Number(row.limit_amount),
    alertThreshold: Number(row.alert_threshold),
    notifyInApp: row.notify_in_app,
    notifyEmail: row.notify_email,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeMonth(input) {
  if (!input) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }

  const value = String(input);
  if (/^\d{4}-\d{2}$/.test(value)) {
    return `${value}-01`;
  }

  return value;
}

async function getBudgets(groupId, filters = {}) {
  const params = [groupId];
  const conditions = [`gb.group_id = $1`];

  if (filters.month) {
    params.push(normalizeMonth(filters.month));
    conditions.push(
      `gb.month = date_trunc('month', $${params.length}::date)::date`,
    );
  }

  const { rows } = await pool.query(
    `
      SELECT 
        gb.*,
        gc.category_name,
        gw.wallet_name
      FROM group_budgets gb
      LEFT JOIN group_categories gc ON gc.group_category_id = gb.group_category_id
      LEFT JOIN group_wallets gw ON gw.group_wallet_id = gb.group_wallet_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY gb.month DESC, gb.group_budget_id DESC
    `,
    params,
  );

  return rows.map(mapGroupBudgetRow);
}

async function createBudget(groupId, userId, payload) {
  const categoryId =
    payload.groupCategoryId ||
    payload.group_category_id ||
    payload.categoryId ||
    null;

  const walletId =
    payload.groupWalletId ||
    payload.group_wallet_id ||
    payload.walletId ||
    null;

  const month = normalizeMonth(payload.month);
  const limitAmount = Number(payload.limitAmount || payload.limit_amount);
  const alertThreshold = Number(
    payload.alertThreshold || payload.alert_threshold || 80,
  );

  if (!limitAmount || limitAmount <= 0) {
    const err = new Error("Hạn mức ngân sách phải lớn hơn 0");
    err.status = 400;
    throw err;
  }

  if (![70, 80, 90, 100].includes(alertThreshold)) {
    const err = new Error("Ngưỡng cảnh báo phải là 70, 80, 90 hoặc 100");
    err.status = 400;
    throw err;
  }

  try {
    const { rows } = await pool.query(
      `
      INSERT INTO group_budgets (
        group_id,
        group_category_id,
        group_wallet_id,
        month,
        limit_amount,
        alert_threshold,
        notify_in_app,
        notify_email,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
      [
        groupId,
        categoryId,
        walletId,
        month,
        limitAmount,
        alertThreshold,
        payload.notifyInApp !== undefined
          ? payload.notifyInApp
          : (payload.notify_in_app ?? true),
        payload.notifyEmail !== undefined
          ? payload.notifyEmail
          : (payload.notify_email ?? false),
        userId,
      ],
    );

    return mapGroupBudgetRow(rows[0]);
  } catch (err) {
    if (
      err.code === "23505" &&
      err.constraint ===
        "group_budgets_group_id_category_key_wallet_key_month_key"
    ) {
      const customErr = new Error(
        "Ngân sách cho nhóm, ví, danh mục và tháng này đã tồn tại. Vui lòng chỉnh sửa ngân sách hiện có thay vì tạo mới.",
      );
      customErr.status = 400;
      throw customErr;
    }

    throw err;
  }
}

async function updateBudget(groupId, budgetId, payload) {
  const { rows: existedRows } = await pool.query(
    `
      SELECT *
      FROM group_budgets
      WHERE group_id = $1
        AND group_budget_id = $2
    `,
    [groupId, budgetId],
  );

  if (existedRows.length === 0) {
    const err = new Error("Không tìm thấy ngân sách nhóm");
    err.status = 404;
    throw err;
  }

  const current = existedRows[0];

  const limitAmount =
    payload.limitAmount !== undefined
      ? Number(payload.limitAmount)
      : payload.limit_amount !== undefined
        ? Number(payload.limit_amount)
        : Number(current.limit_amount);

  if (!limitAmount || limitAmount <= 0) {
    const err = new Error("Hạn mức ngân sách phải lớn hơn 0");
    err.status = 400;
    throw err;
  }

  const alertThreshold =
    payload.alertThreshold !== undefined
      ? Number(payload.alertThreshold)
      : payload.alert_threshold !== undefined
        ? Number(payload.alert_threshold)
        : Number(current.alert_threshold);

  if (![70, 80, 90, 100].includes(alertThreshold)) {
    const err = new Error("Ngưỡng cảnh báo phải là 70, 80, 90 hoặc 100");
    err.status = 400;
    throw err;
  }

  const nextCategoryId =
    payload.groupCategoryId !== undefined
      ? payload.groupCategoryId
      : payload.group_category_id !== undefined
        ? payload.group_category_id
        : current.group_category_id;

  const nextWalletId =
    payload.groupWalletId !== undefined
      ? payload.groupWalletId
      : payload.group_wallet_id !== undefined
        ? payload.group_wallet_id
        : current.group_wallet_id;

  const nextMonth =
    payload.month !== undefined ? normalizeMonth(payload.month) : current.month;

  const nextNotifyInApp =
    payload.notifyInApp !== undefined
      ? payload.notifyInApp
      : payload.notify_in_app !== undefined
        ? payload.notify_in_app
        : current.notify_in_app;

  const nextNotifyEmail =
    payload.notifyEmail !== undefined
      ? payload.notifyEmail
      : payload.notify_email !== undefined
        ? payload.notify_email
        : current.notify_email;

  try {
    const { rows } = await pool.query(
      `
      UPDATE group_budgets
      SET group_category_id = $1,
          group_wallet_id = $2,
          month = $3,
          limit_amount = $4,
          alert_threshold = $5,
          notify_in_app = $6,
          notify_email = $7,
          updated_at = now()
      WHERE group_id = $8
        AND group_budget_id = $9
      RETURNING *
    `,
      [
        nextCategoryId,
        nextWalletId,
        nextMonth,
        limitAmount,
        alertThreshold,
        nextNotifyInApp,
        nextNotifyEmail,
        groupId,
        budgetId,
      ],
    );

    return mapGroupBudgetRow(rows[0]);
  } catch (err) {
    if (
      err.code === "23505" &&
      err.constraint ===
        "group_budgets_group_id_category_key_wallet_key_month_key"
    ) {
      const customErr = new Error(
        "Đã tồn tại ngân sách khác cho cùng nhóm, ví, danh mục và tháng này. Vui lòng chọn tháng, ví hoặc danh mục khác.",
      );
      customErr.status = 400;
      throw customErr;
    }

    throw err;
  }
}

async function deleteBudget(groupId, budgetId) {
  const { rowCount } = await pool.query(
    `
      DELETE FROM group_budgets
      WHERE group_id = $1
        AND group_budget_id = $2
    `,
    [groupId, budgetId],
  );

  if (rowCount === 0) {
    const err = new Error("Không tìm thấy ngân sách nhóm");
    err.status = 404;
    throw err;
  }

  return true;
}

async function getBudgetUsage(groupId, filters = {}) {
  const params = [groupId];
  let monthCondition = "";

  if (filters.month) {
    params.push(normalizeMonth(filters.month));
    monthCondition = `AND month = date_trunc('month', $${params.length}::date)::date`;
  }

  const { rows } = await pool.query(
    `
      SELECT *
      FROM v_group_budget_usage
      WHERE group_id = $1
        ${monthCondition}
      ORDER BY month DESC, group_budget_id DESC
    `,
    params,
  );

  return rows.map((row) => ({
    id: row.group_budget_id,
    groupId: row.group_id,
    month: row.month,
    groupCategoryId: row.group_category_id,
    groupWalletId: row.group_wallet_id,
    limitAmount: Number(row.limit_amount),
    alertThreshold: Number(row.alert_threshold),
    spentAmount: Number(row.spent_amount),
    usagePercent: Number(row.usage_percent),
    status: row.status,
  }));
}

module.exports = {
  mapGroupBudgetRow,
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetUsage,
};
