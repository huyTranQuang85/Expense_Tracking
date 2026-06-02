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

async function getOrCreateSystemCategory({ type, groupKey, name, icon, color }) {
  const { rows } = await pool.query(
    `
      SELECT category_id
      FROM categories
      WHERE user_id IS NULL
        AND is_system = true
        AND group_key = $1
        AND type = $2
      LIMIT 1
    `,
    [groupKey, type]
  );

  if (rows.length) return rows[0].category_id;

  const insert = await pool.query(
    `
      INSERT INTO categories (user_id, category_name, type, icon, color, group_key, is_system)
      VALUES (NULL, $1, $2, $3, $4, $5, true)
      RETURNING category_id
    `,
    [name, type, icon || null, color || null, groupKey]
  );

  return insert.rows[0].category_id;
}

async function ensureTransferCategories() {
  const incomeCategoryId = await getOrCreateSystemCategory({
    type: "income",
    groupKey: "transfer_in",
    name: "Chuyen tien vao vi",
    icon: "🔁",
    color: "#38BDF8",
  });

  const expenseCategoryId = await getOrCreateSystemCategory({
    type: "expense",
    groupKey: "transfer_out",
    name: "Chuyen tien giua vi",
    icon: "🔁",
    color: "#38BDF8",
  });

  return { incomeCategoryId, expenseCategoryId };
}

async function createTransfer(userId, payload) {
  const { fromWalletId, toWalletId, amount, description, txDate } = payload;

  if (!fromWalletId || !toWalletId || !amount) {
    const err = new Error("fromWalletId, toWalletId, amount la bat buoc");
    err.status = 400;
    throw err;
  }

  if (String(fromWalletId) === String(toWalletId)) {
    const err = new Error("Vi nguon va vi nhan phai khac nhau");
    err.status = 400;
    throw err;
  }

  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    const err = new Error("So tien phai lon hon 0");
    err.status = 400;
    throw err;
  }

  const txDateStr = normalizeToDateString(txDate);

  const { rows: walletRows } = await pool.query(
    `
      SELECT wallet_id, is_archived, is_frozen
      FROM wallets
      WHERE user_id = $1 AND wallet_id = ANY($2::bigint[])
    `,
    [userId, [fromWalletId, toWalletId]]
  );

  if (walletRows.length !== 2) {
    const err = new Error("Khong tim thay vi nguon hoac vi nhan");
    err.status = 404;
    throw err;
  }

  const frozen = walletRows.find((w) => w.is_frozen);
  if (frozen) {
    const err = new Error("Vi dang bi dong bang, khong the chuyen tien");
    err.status = 400;
    throw err;
  }

  const archived = walletRows.find((w) => w.is_archived);
  if (archived) {
    const err = new Error("Vi dang bi an, khong the chuyen tien");
    err.status = 400;
    throw err;
  }

  const { incomeCategoryId, expenseCategoryId } = await ensureTransferCategories();

  const transferInsert = await pool.query(
    `
      INSERT INTO wallet_transfers (user_id, from_wallet_id, to_wallet_id, amount, description, tx_date)
      VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE))
      RETURNING *
    `,
    [userId, fromWalletId, toWalletId, parsedAmount, description || null, txDateStr]
  );

  const transfer = transferInsert.rows[0];

  await pool.query(
    `
      INSERT INTO transactions (user_id, category_id, wallet_id, amount, description, tx_date, transfer_id)
      VALUES
        ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7),
        ($1, $8, $9, $4, $5, COALESCE($6::date, CURRENT_DATE), $7)
    `,
    [
      userId,
      expenseCategoryId,
      fromWalletId,
      parsedAmount,
      description || "Chuyen tien",
      txDateStr,
      transfer.transfer_id,
      incomeCategoryId,
      toWalletId,
    ]
  );

  return transfer;
}

module.exports = {
  createTransfer,
};
