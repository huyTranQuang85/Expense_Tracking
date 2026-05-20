const pool = require("../db");

function mapGroupWalletRow(row) {
  return {
    id: row.group_wallet_id,
    groupId: row.group_id,
    name: row.wallet_name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    type: row.type,
    balance: Number(row.balance),
    isArchived: row.is_archived,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getWallets(groupId, options = {}) {
  const includeArchived =
    options.includeArchived === true || options.includeArchived === "true";

  const { rows } = await pool.query(
    `
      SELECT *
      FROM group_wallets
      WHERE group_id = $1
        AND ($2::boolean = true OR is_archived = false)
      ORDER BY group_wallet_id ASC
    `,
    [groupId, includeArchived],
  );

  return rows.map(mapGroupWalletRow);
}

async function createWallet(groupId, userId, payload) {
  const name = String(
    payload.name || payload.wallet_name || payload.walletName || "",
  ).trim();
  const description = payload.description || null;
  const icon = payload.icon || null;
  const color = payload.color || "#4ECDC4";
  const type = payload.type || "standard";
  const balance = payload.balance != null ? Number(payload.balance) : 0;

  if (!name) {
    const err = new Error("Tên ví nhóm là bắt buộc");
    err.status = 400;
    throw err;
  }

  if (!["standard", "savings", "other"].includes(type)) {
    const err = new Error("Loại ví không hợp lệ");
    err.status = 400;
    throw err;
  }

  if (balance < 0) {
    const err = new Error("Số dư ban đầu không được âm");
    err.status = 400;
    throw err;
  }

  const { rows } = await pool.query(
    `
      INSERT INTO group_wallets (
        group_id,
        wallet_name,
        description,
        icon,
        color,
        type,
        balance,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [groupId, name, description, icon, color, type, balance, userId],
  );

  return mapGroupWalletRow(rows[0]);
}

async function updateWallet(groupId, walletId, payload) {
  const { rows: existedRows } = await pool.query(
    `
      SELECT *
      FROM group_wallets
      WHERE group_wallet_id = $1
        AND group_id = $2
    `,
    [walletId, groupId],
  );

  if (existedRows.length === 0) {
    const err = new Error("Không tìm thấy ví nhóm");
    err.status = 404;
    throw err;
  }

  const current = existedRows[0];

  const name =
    payload.name !== undefined
      ? String(payload.name).trim()
      : payload.wallet_name !== undefined
        ? String(payload.wallet_name).trim()
        : current.wallet_name;

  if (!name) {
    const err = new Error("Tên ví nhóm không được để trống");
    err.status = 400;
    throw err;
  }

  const type = payload.type !== undefined ? payload.type : current.type;

  if (!["standard", "savings", "other"].includes(type)) {
    const err = new Error("Loại ví không hợp lệ");
    err.status = 400;
    throw err;
  }

  const balance =
    payload.balance !== undefined
      ? Number(payload.balance)
      : Number(current.balance);

  if (balance < 0) {
    const err = new Error("Số dư ví không được âm");
    err.status = 400;
    throw err;
  }

  const { rows } = await pool.query(
    `
      UPDATE group_wallets
      SET wallet_name = $1,
          description = $2,
          icon = $3,
          color = $4,
          type = $5,
          balance = $6,
          updated_at = now()
      WHERE group_wallet_id = $7
        AND group_id = $8
      RETURNING *
    `,
    [
      name,
      payload.description !== undefined
        ? payload.description
        : current.description,
      payload.icon !== undefined ? payload.icon : current.icon,
      payload.color !== undefined ? payload.color : current.color,
      type,
      balance,
      walletId,
      groupId,
    ],
  );

  return mapGroupWalletRow(rows[0]);
}

async function archiveWallet(groupId, walletId) {
  const { rows } = await pool.query(
    `
      UPDATE group_wallets
      SET is_archived = true,
          updated_at = now()
      WHERE group_wallet_id = $1
        AND group_id = $2
      RETURNING *
    `,
    [walletId, groupId],
  );

  if (rows.length === 0) {
    const err = new Error("Không tìm thấy ví nhóm");
    err.status = 404;
    throw err;
  }

  return mapGroupWalletRow(rows[0]);
}

module.exports = {
  mapGroupWalletRow,
  getWallets,
  createWallet,
  updateWallet,
  archiveWallet,
};
