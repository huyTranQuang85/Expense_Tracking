const pool = require("../db");

// Map 1 row DB -> object trả về cho FE
function mapWalletRow(row) {
  return {
    id: row.wallet_id,
    name: row.wallet_name,
    description: row.description,
    icon: row.icon,
    type: row.type,
    balance: Number(row.balance),
    color: row.color,
    isArchived: row.is_archived,
    isFrozen: row.is_frozen,
    currencyCode: row.currency_code,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

async function getWalletsByUser(userId, options = {}) {
  const { includeArchived = false } = options;
  const sql = `
    SELECT *
    FROM wallets
    WHERE user_id = $1
      ${includeArchived ? "" : "AND is_archived = false"}
    ORDER BY wallet_id ASC
  `;
  const { rows } = await pool.query(sql, [userId]);
  return rows.map(mapWalletRow);
}

async function getWalletById(userId, walletId) {
  const { rows } = await pool.query(
    "SELECT * FROM wallets WHERE wallet_id = $1 AND user_id = $2",
    [walletId, userId]
  );
  return rows[0] ? mapWalletRow(rows[0]) : null;
}

async function createWallet(userId, payload) {
  // chấp nhận name, wallet_name, walletName
  let name = payload.name || payload.wallet_name || payload.walletName || "";
  const color = payload.color || "#4ECDC4";
  name = name.trim();
  if (!name) {
    const err = new Error("Tên ví là bắt buộc");
    err.status = 400;
    throw err;
  }

  const description = payload.description;
  const icon = payload.icon;
  const type = payload.type || "standard";
  const currencyCode = payload.currencyCode || payload.currency_code || "VND";
  const isFrozen = Boolean(payload.isFrozen || payload.is_frozen || false);

  const initialBalance = payload.balance != null ? Number(payload.balance) : 0;

  if (initialBalance < 0) {
    const err = new Error("Số dư ban đầu không được âm");
    err.status = 400;
    throw err;
  }

  const sql = `
    INSERT INTO wallets (user_id, wallet_name, description, icon, type, currency_code, balance, color, is_frozen)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const { rows } = await pool.query(sql, [
    userId,
    name,
    description || null,
    icon || null,
    type,
    currencyCode,
    initialBalance,
    color,
    isFrozen,
  ]);

  return mapWalletRow(rows[0]);
}

async function updateWallet(userId, walletId, updates) {
  const {
    name,
    description,
    icon,
    type,
    balance,
    color,
    isArchived,
    isFrozen,
    currencyCode,
  } = updates;

  // kiểm tra ví có thuộc user không
  const { rows: existedRows } = await pool.query(
    "SELECT * FROM wallets WHERE wallet_id = $1 AND user_id = $2",
    [walletId, userId]
  );
  if (existedRows.length === 0) {
    const err = new Error("Không tìm thấy ví");
    err.status = 404;
    throw err;
  }

  const current = existedRows[0];

  if (balance != null && Number(balance) < 0) {
    const err = new Error("Số dư không được âm");
    err.status = 400;
    throw err;
  }

  const sql = `
    UPDATE wallets
    SET wallet_name = $1,
        description = $2,
        icon        = $3,
        type        = $4,
        currency_code = $5,
        balance     = $6,
        color       = $7,
        is_archived = $8,
        is_frozen   = $9,
        archived_at = CASE WHEN $8 THEN COALESCE(archived_at, now()) ELSE NULL END,
        updated_at  = now()
    WHERE wallet_id = $10 AND user_id = $11
    RETURNING *
  `;

  const { rows } = await pool.query(sql, [
    name != null ? name : current.wallet_name,
    description != null ? description : current.description,
    icon != null ? icon : current.icon,
    type != null ? type : current.type,
    currencyCode != null ? currencyCode : current.currency_code,
    balance != null ? Number(balance) : current.balance,
    color != null ? color : current.color,
    isArchived != null ? Boolean(isArchived) : current.is_archived,
    isFrozen != null ? Boolean(isFrozen) : current.is_frozen,
    walletId,
    userId,
  ]);

  return mapWalletRow(rows[0]);
}

async function deleteWallet(userId, walletId) {
  // kiểm tra có transaction nào dùng ví này không
  const { rows: txRows } = await pool.query(
    `
      SELECT 1 
      FROM transactions 
      WHERE wallet_id = $1 
        AND user_id = $2
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [walletId, userId]
  );

  if (txRows.length > 0) {
    const err = new Error(
      "Không thể xóa ví vì đang có giao dịch liên quan. Vui lòng xoá / chuyển giao dịch trước."
    );
    err.status = 400;
    throw err;
  }

  // xóa cứng luôn (hoặc set is_archived = true tuỳ chiến lược)
  const { rowCount } = await pool.query(
    "DELETE FROM wallets WHERE wallet_id = $1 AND user_id = $2",
    [walletId, userId]
  );

  if (rowCount === 0) {
    const err = new Error("Không tìm thấy ví");
    err.status = 404;
    throw err;
  }

  return true;
}

async function getWalletStatsByUser(userId, options = {}) {
  const { fromDate, toDate } = options;
  const params = [userId];
  const where = ["t.user_id = $1", "t.deleted_at IS NULL"];

  if (fromDate) {
    params.push(fromDate);
    where.push(`t.tx_date >= $${params.length}`);
  }

  if (toDate) {
    params.push(toDate);
    where.push(`t.tx_date <= $${params.length}`);
  }

  const sql = `
    SELECT
      w.wallet_id,
      w.wallet_name,
      w.currency_code,
      w.balance,
      w.color,
      w.icon,
      w.type,
      w.is_archived,
      w.is_frozen,
      COALESCE(SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE 0 END), 0) AS income_total,
      COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expense_total
    FROM wallets w
    LEFT JOIN transactions t ON t.wallet_id = w.wallet_id
    LEFT JOIN categories c ON c.category_id = t.category_id
    WHERE w.user_id = $1
      AND (c.is_system IS NULL OR c.is_system = false)
      ${where.length ? "AND " + where.slice(1).join(" AND ") : ""}
    GROUP BY w.wallet_id
    ORDER BY w.wallet_id ASC
  `;

  const { rows } = await pool.query(sql, params);
  return rows.map((row) => ({
    id: row.wallet_id,
    name: row.wallet_name,
    balance: Number(row.balance),
    currencyCode: row.currency_code,
    color: row.color,
    icon: row.icon,
    type: row.type,
    isArchived: row.is_archived,
    isFrozen: row.is_frozen,
    incomeTotal: Number(row.income_total),
    expenseTotal: Number(row.expense_total),
  }));
}

module.exports = {
  getWalletsByUser,
  getWalletById,
  createWallet,
  updateWallet,
  deleteWallet,
  getWalletStatsByUser,
};
