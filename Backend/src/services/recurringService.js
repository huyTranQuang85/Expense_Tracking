const pool = require("../db");

function normalizeToDateString(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addInterval(dateStr, unit, count) {
  const d = new Date(dateStr + "T00:00:00");
  const n = Number(count || 1);
  if (unit === "daily") d.setDate(d.getDate() + n);
  if (unit === "weekly") d.setDate(d.getDate() + n * 7);
  if (unit === "monthly") d.setMonth(d.getMonth() + n);
  if (unit === "yearly") d.setFullYear(d.getFullYear() + n);
  return normalizeToDateString(d);
}

async function listRecurring(userId) {
  const { rows } = await pool.query(
    `
      SELECT r.*, c.category_name, w.wallet_name
      FROM recurring_transactions r
      JOIN categories c ON c.category_id = r.category_id
      JOIN wallets w ON w.wallet_id = r.wallet_id
      WHERE r.user_id = $1
      ORDER BY r.next_run_date ASC, r.recurring_id DESC
    `,
    [userId]
  );

  return rows;
}

async function createRecurring(userId, payload) {
  const {
    categoryId,
    walletId,
    amount,
    description,
    intervalUnit,
    intervalCount,
    startDate,
    endDate,
  } = payload;

  if (!categoryId || !walletId || !amount || !intervalUnit) {
    const err = new Error("Thieu thong tin bat buoc");
    err.status = 400;
    throw err;
  }

  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    const err = new Error("So tien phai lon hon 0");
    err.status = 400;
    throw err;
  }

  const startDateStr = normalizeToDateString(startDate) || normalizeToDateString(new Date());
  const endDateStr = normalizeToDateString(endDate);
  const nextRunDate = startDateStr;

  const { rows } = await pool.query(
    `
      INSERT INTO recurring_transactions
        (user_id, category_id, wallet_id, amount, description, interval_unit, interval_count, start_date, next_run_date, end_date)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8::date, $9::date, $10::date)
      RETURNING *
    `,
    [
      userId,
      categoryId,
      walletId,
      parsedAmount,
      description || null,
      intervalUnit,
      Number(intervalCount || 1),
      startDateStr,
      nextRunDate,
      endDateStr,
    ]
  );

  return rows[0];
}

async function updateRecurring(userId, recurringId, payload) {
  const fields = [];
  const params = [];
  let idx = 1;

  const allowed = {
    categoryId: "category_id",
    walletId: "wallet_id",
    amount: "amount",
    description: "description",
    intervalUnit: "interval_unit",
    intervalCount: "interval_count",
    startDate: "start_date",
    nextRunDate: "next_run_date",
    endDate: "end_date",
    isActive: "is_active",
  };

  Object.keys(allowed).forEach((key) => {
    if (payload[key] === undefined) return;
    const column = allowed[key];
    let value = payload[key];

    if (key === "amount") {
      const amt = Number(value);
      if (!Number.isFinite(amt) || amt <= 0) return;
      value = amt;
    }

    if (key === "intervalCount") value = Number(value || 1);

    if (["startDate", "nextRunDate", "endDate"].includes(key)) {
      value = normalizeToDateString(value);
    }

    fields.push(`${column} = $${idx++}`);
    params.push(value);
  });

  if (!fields.length) return null;

  params.push(recurringId);
  params.push(userId);

  const sql = `
    UPDATE recurring_transactions
    SET ${fields.join(", ")}, updated_at = now()
    WHERE recurring_id = $${idx++} AND user_id = $${idx}
    RETURNING *
  `;

  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}

async function deleteRecurring(userId, recurringId) {
  const { rowCount } = await pool.query(
    "DELETE FROM recurring_transactions WHERE recurring_id = $1 AND user_id = $2",
    [recurringId, userId]
  );
  return rowCount > 0;
}

async function materializeDueRecurring(userId) {
  const today = normalizeToDateString(new Date());

  const { rows } = await pool.query(
    `
      SELECT *
      FROM recurring_transactions
      WHERE user_id = $1
        AND is_active = true
        AND next_run_date <= $2
        AND (end_date IS NULL OR next_run_date <= end_date)
      ORDER BY next_run_date ASC
    `,
    [userId, today]
  );

  for (const rule of rows) {
    let nextDate = rule.next_run_date;
    while (nextDate && nextDate <= today) {
      await pool.query(
        `
          INSERT INTO transactions (user_id, category_id, wallet_id, amount, description, tx_date, recurring_id)
          VALUES ($1, $2, $3, $4, $5, $6::date, $7)
        `,
        [
          userId,
          rule.category_id,
          rule.wallet_id,
          rule.amount,
          rule.description,
          nextDate,
          rule.recurring_id,
        ]
      );

      nextDate = addInterval(nextDate, rule.interval_unit, rule.interval_count);
      if (rule.end_date && nextDate > rule.end_date) {
        break;
      }
    }

    await pool.query(
      `
        UPDATE recurring_transactions
        SET next_run_date = $1::date, updated_at = now()
        WHERE recurring_id = $2 AND user_id = $3
      `,
      [nextDate, rule.recurring_id, userId]
    );
  }

  return true;
}

module.exports = {
  listRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  materializeDueRecurring,
};
