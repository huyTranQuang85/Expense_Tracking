const pool = require("../db");
const groupNotificationService = require("./groupNotificationService");

function mapGroupTransactionRow(row) {
  return {
    id: row.group_transaction_id,
    groupId: row.group_id,
    groupWalletId: row.group_wallet_id,
    walletName: row.wallet_name,
    groupCategoryId: row.group_category_id,
    categoryName: row.category_name,
    categoryType: row.category_type || row.type,
    amount: Number(row.amount),
    description: row.description,
    txDate: row.tx_date,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getTransactions(groupId, filters = {}) {
  const params = [groupId];
  const conditions = [`gt.group_id = $1`, `gt.deleted_at IS NULL`];

  if (filters.walletId) {
    params.push(Number(filters.walletId));
    conditions.push(`gt.group_wallet_id = $${params.length}`);
  }

  if (filters.categoryId) {
    params.push(Number(filters.categoryId));
    conditions.push(`gt.group_category_id = $${params.length}`);
  }

  if (filters.type && ["income", "expense"].includes(filters.type)) {
    params.push(filters.type);
    conditions.push(`gc.type = $${params.length}`);
  }

  if (filters.fromDate) {
    params.push(filters.fromDate);
    conditions.push(`gt.tx_date >= $${params.length}`);
  }

  if (filters.toDate) {
    params.push(filters.toDate);
    conditions.push(`gt.tx_date <= $${params.length}`);
  }

  const limit = Math.min(Number(filters.limit) || 50, 100);
  params.push(limit);

  const { rows } = await pool.query(
    `
      SELECT 
        gt.*,
        gw.wallet_name,
        gc.category_name,
        gc.type AS category_type,
        u.user_name AS created_by_name
      FROM group_transactions gt
      JOIN group_wallets gw ON gw.group_wallet_id = gt.group_wallet_id
      JOIN group_categories gc ON gc.group_category_id = gt.group_category_id
      LEFT JOIN users u ON u.user_id = gt.created_by
      WHERE ${conditions.join(" AND ")}
      ORDER BY gt.tx_date DESC, gt.group_transaction_id DESC
      LIMIT $${params.length}
    `,
    params,
  );

  return rows.map(mapGroupTransactionRow);
}

async function createTransaction(groupId, userId, payload) {
  const walletId = Number(
    payload.groupWalletId || payload.group_wallet_id || payload.walletId,
  );
  const categoryId = Number(
    payload.groupCategoryId || payload.group_category_id || payload.categoryId,
  );
  const amount = Number(payload.amount);
  const description = payload.description || null;
  const txDate =
    payload.txDate || payload.tx_date || new Date().toISOString().slice(0, 10);

  if (!walletId) {
    const err = new Error("Ví nhóm là bắt buộc");
    err.status = 400;
    throw err;
  }

  if (!categoryId) {
    const err = new Error("Danh mục nhóm là bắt buộc");
    err.status = 400;
    throw err;
  }

  if (!amount || amount <= 0) {
    const err = new Error("Số tiền giao dịch phải lớn hơn 0");
    err.status = 400;
    throw err;
  }

  const { rows } = await pool.query(
    `
      INSERT INTO group_transactions (
        group_id,
        group_wallet_id,
        group_category_id,
        amount,
        description,
        tx_date,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [groupId, walletId, categoryId, amount, description, txDate, userId],
  );

  const transaction = await getTransactionById(
    groupId,
    rows[0].group_transaction_id,
  );

  await groupNotificationService.handleGroupTransactionChanged(
    groupId,
    userId,
    transaction,
    "group_transaction_created",
  );

  return transaction;
}

async function getTransactionById(groupId, transactionId) {
  const { rows } = await pool.query(
    `
      SELECT 
        gt.*,
        gw.wallet_name,
        gc.category_name,
        gc.type AS category_type,
        u.user_name AS created_by_name
      FROM group_transactions gt
      JOIN group_wallets gw ON gw.group_wallet_id = gt.group_wallet_id
      JOIN group_categories gc ON gc.group_category_id = gt.group_category_id
      LEFT JOIN users u ON u.user_id = gt.created_by
      WHERE gt.group_id = $1
        AND gt.group_transaction_id = $2
    `,
    [groupId, transactionId],
  );

  if (rows.length === 0) {
    const err = new Error("Không tìm thấy giao dịch nhóm");
    err.status = 404;
    throw err;
  }

  return mapGroupTransactionRow(rows[0]);
}

async function updateTransaction(
  groupId,
  transactionId,
  payload,
  actorUserId = null,
) {
  const { rows: existedRows } = await pool.query(
    `
      SELECT *
      FROM group_transactions
      WHERE group_id = $1
        AND group_transaction_id = $2
        AND deleted_at IS NULL
    `,
    [groupId, transactionId],
  );

  if (existedRows.length === 0) {
    const err = new Error("Không tìm thấy giao dịch nhóm");
    err.status = 404;
    throw err;
  }

  const current = existedRows[0];

  const walletId =
    payload.groupWalletId !== undefined
      ? Number(payload.groupWalletId)
      : payload.group_wallet_id !== undefined
        ? Number(payload.group_wallet_id)
        : current.group_wallet_id;

  const categoryId =
    payload.groupCategoryId !== undefined
      ? Number(payload.groupCategoryId)
      : payload.group_category_id !== undefined
        ? Number(payload.group_category_id)
        : current.group_category_id;

  const amount =
    payload.amount !== undefined
      ? Number(payload.amount)
      : Number(current.amount);

  if (!amount || amount <= 0) {
    const err = new Error("Số tiền giao dịch phải lớn hơn 0");
    err.status = 400;
    throw err;
  }

  const { rows } = await pool.query(
    `
      UPDATE group_transactions
      SET group_wallet_id = $1,
          group_category_id = $2,
          amount = $3,
          description = $4,
          tx_date = $5,
          updated_at = now()
      WHERE group_id = $6
        AND group_transaction_id = $7
      RETURNING *
    `,
    [
      walletId,
      categoryId,
      amount,
      payload.description !== undefined
        ? payload.description
        : current.description,
      payload.txDate || payload.tx_date || current.tx_date,
      groupId,
      transactionId,
    ],
  );

  const transaction = await getTransactionById(
    groupId,
    rows[0].group_transaction_id,
  );

  await groupNotificationService.handleGroupTransactionChanged(
    groupId,
    actorUserId || transaction.createdBy,
    transaction,
    "group_transaction_updated",
  );

  return transaction;
}

async function deleteTransaction(groupId, transactionId, actorUserId = null) {
  const { rows } = await pool.query(
    `
      UPDATE group_transactions
      SET deleted_at = now(),
          updated_at = now()
      WHERE group_id = $1
        AND group_transaction_id = $2
        AND deleted_at IS NULL
      RETURNING *
    `,
    [groupId, transactionId],
  );

  if (rows.length === 0) {
    const err = new Error("Không tìm thấy giao dịch nhóm");
    err.status = 404;
    throw err;
  }

  const deleted = rows[0];

  await groupNotificationService.handleGroupTransactionChanged(
    groupId,
    actorUserId || deleted.created_by,
    deleted,
    "group_transaction_deleted",
  );

  return true;
}

module.exports = {
  mapGroupTransactionRow,
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
