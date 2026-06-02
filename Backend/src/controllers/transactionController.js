const pool = require("../db");
const budgetService = require("../services/budgetService");
const walletService = require("../services/walletService");
const transferService = require("../services/transferService");
const recurringService = require("../services/recurringService");

// Helper: parse int an toàn
const toInt = (value, fallback = null) => {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
};
// format DATE (JS Date) -> 'YYYY-MM-DD'
function formatDateYMD(d) {
  if (!d) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * GET /api/transactions
 * Query hỗ trợ:
 *  - month: 1..12
 *  - year: 2023, 2024,...
 *  - type: 'income' | 'expense'
 *  - q: search theo mô tả / tên danh mục
 */
exports.listTransactions = async (req, res) => {
  const userId = req.user.id;
  const {
    month,
    year,
    type,
    q,
    fromDate,
    toDate,
    walletId,
    categoryId,
  } = req.query;

  try {
    try {
      await recurringService.materializeDueRecurring(userId);
    } catch (err) {
      console.error("materializeDueRecurring error:", err);
    }

    const params = [userId];
    let where = `t.user_id = $1 AND t.deleted_at IS NULL`;

    if (year) {
      params.push(toInt(year));
      where += ` AND EXTRACT(YEAR FROM t.tx_date) = $${params.length}`;
    }

    if (month) {
      params.push(toInt(month));
      where += ` AND EXTRACT(MONTH FROM t.tx_date) = $${params.length}`;
    }

    if (type && ["income", "expense"].includes(type)) {
      params.push(type);
      where += ` AND c.type = $${params.length}`;
    }

    if (fromDate) {
      params.push(fromDate);
      where += ` AND t.tx_date >= $${params.length}`;
    }

    if (toDate) {
      params.push(toDate);
      where += ` AND t.tx_date <= $${params.length}`;
    }

    if (walletId) {
      params.push(walletId);
      where += ` AND t.wallet_id = $${params.length}`;
    }

    if (categoryId) {
      params.push(categoryId);
      where += ` AND t.category_id = $${params.length}`;
    }

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      params.push(`%${q.trim()}%`);
      where += ` AND (t.description ILIKE $${
        params.length - 1
      } OR c.category_name ILIKE $${params.length})`;
    }

    const sql = `
      SELECT
        t.transaction_id,
        t.category_id,
        t.wallet_id,
        t.amount,
        t.description,
        to_char(t.tx_date, 'YYYY-MM-DD') AS tx_date,
        t.transfer_id,
        t.recurring_id,
        c.category_name,
        c.type AS category_type,
        c.icon AS category_icon,
        c.color AS category_color,
        c.is_system AS category_is_system,
        c.group_key AS category_group_key,
          w.wallet_name,
          tr.from_wallet_id,
          tr.to_wallet_id,
          wf.wallet_name AS from_wallet_name,
          wt.wallet_name AS to_wallet_name,
          CASE
            WHEN t.transfer_id IS NULL THEN NULL
            WHEN t.wallet_id = tr.from_wallet_id THEN 'out'
            ELSE 'in'
          END AS transfer_direction
      FROM transactions t
      LEFT JOIN categories c ON c.category_id = t.category_id
      JOIN wallets   w ON w.wallet_id   = t.wallet_id
      LEFT JOIN wallet_transfers tr ON tr.transfer_id = t.transfer_id
      LEFT JOIN wallets wf ON wf.wallet_id = tr.from_wallet_id
      LEFT JOIN wallets wt ON wt.wallet_id = tr.to_wallet_id
      WHERE ${where}
      ORDER BY t.tx_date DESC, t.transaction_id DESC
    `;

    const { rows } = await pool.query(sql, params);

    return res.json({
      status: "success",
      data: rows,
    });
  } catch (error) {
    console.error("listTransactions error:", error);
    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi lấy danh sách giao dịch",
    });
  }
};

/**
 * POST /api/transactions
 * Body: { category_id, wallet_id, amount, description, tx_date }
 */
// helper: chuẩn hóa mọi giá trị tx_date về "YYYY-MM-DD"
function normalizeToDateString(value) {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    // nếu FE gửi linh tinh thì coi như không có -> CURRENT_DATE
    return null;
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // ví dụ 2025-11-28
}

exports.createTransaction = async (req, res) => {
  const userId = req.user.id;
  const { category_id, wallet_id, amount, description, tx_date } = req.body;

  if (!category_id || !wallet_id || !amount) {
    return res.status(400).json({
      status: "error",
      message: "category_id, wallet_id và amount là bắt buộc",
    });
  }

  const amt = Number(amount);
  if (!(amt > 0)) {
    return res.status(400).json({
      status: "error",
      message: "Số tiền phải lớn hơn 0",
    });
  }

  // CHỖ QUAN TRỌNG: normalize ngày gửi từ FE
  const txDateStr = normalizeToDateString(tx_date);

  try {
    const wallet = await walletService.getWalletById(userId, wallet_id);
    if (!wallet) {
      return res.status(404).json({
        status: "error",
        message: "Khong tim thay vi",
      });
    }

    if (wallet.isArchived || wallet.isFrozen) {
      return res.status(400).json({
        status: "error",
        message: "Vi dang bi an hoac dong bang",
      });
    }

    const insertSql = `
      INSERT INTO transactions (
        user_id, category_id, wallet_id, amount, description, tx_date
      )
      VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE))
      RETURNING transaction_id, user_id, category_id, wallet_id, amount, description, tx_date
    `;

    const values = [
      userId,
      category_id,
      wallet_id,
      amt,
      description || null,
      txDateStr, // đã normalize, hoặc null
    ];

    const { rows } = await pool.query(insertSql, values);
    const tx = rows[0];

    // sau khi tạo giao dịch → check ngân sách tháng của giao dịch
    try {
      await budgetService.checkAndLogBudgetAlertsForUser(userId, tx.tx_date);
    } catch (err) {
      console.error("checkAndLogBudgetAlertsForUser (create) error:", err);
      // không throw để tránh vỡ API
    }

    return res.status(201).json({
      status: "success",
      data: tx,
    });
  } catch (error) {
    console.error("createTransaction error:", error);

    if (
      error.message?.includes("Category") ||
      error.message?.includes("Wallet")
    ) {
      return res.status(400).json({
        status: "error",
        message: error.message,
        detail: error.detail || null,
        code: error.code || null,
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi tạo giao dịch",
    });
  }
};

/**
 * PUT /api/transactions/:id
 * Body: { category_id?, wallet_id?, amount?, description?, tx_date? }
 */
exports.updateTransaction = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { category_id, wallet_id, amount, description, tx_date } = req.body;

  if (!id) {
    return res.status(400).json({
      status: "error",
      message: "Thiếu transaction id",
    });
  }

  if (amount !== undefined) {
    const amt = Number(amount);
    if (!(amt > 0)) {
      return res.status(400).json({
        status: "error",
        message: "Số tiền phải lớn hơn 0",
      });
    }
  }

  // Normalize ngày update (nếu có)
  const txDateStr = normalizeToDateString(tx_date);

  try {
    if (wallet_id) {
      const wallet = await walletService.getWalletById(userId, wallet_id);
      if (!wallet) {
        return res.status(404).json({
          status: "error",
          message: "Khong tim thay vi",
        });
      }

      if (wallet.isArchived || wallet.isFrozen) {
        return res.status(400).json({
          status: "error",
          message: "Vi dang bi an hoac dong bang",
        });
      }
    }

    const updateSql = `
      UPDATE transactions
      SET
        category_id = COALESCE($1, category_id),
        wallet_id   = COALESCE($2, wallet_id),
        amount      = COALESCE($3, amount),
        description = COALESCE($4, description),
        tx_date     = COALESCE($5::date, tx_date),
        updated_at  = now()
      WHERE transaction_id = $6
        AND user_id = $7
        AND deleted_at IS NULL
      RETURNING transaction_id, user_id, category_id, wallet_id, amount, description, to_char(tx_date, 'YYYY-MM-DD') AS tx_date
    `;

    const values = [
      category_id || null,
      wallet_id || null,
      amount !== undefined ? Number(amount) : null,
      description || null,
      txDateStr, // đã chuẩn hoá, hoặc null -> giữ nguyên giá trị cũ
      id,
      userId,
    ];

    const { rows } = await pool.query(updateSql, values);

    if (rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Giao dịch không tồn tại hoặc đã bị xoá",
      });
    }

    const updatedTx = rows[0];

    // Sau khi cập nhật giao dịch → check & log cảnh báo ngân sách
    try {
      await budgetService.checkAndLogBudgetAlertsForUser(
        userId,
        updatedTx.tx_date
      );
    } catch (err) {
      console.error("checkAndLogBudgetAlertsForUser (update) error:", err);
    }

    return res.json({
      status: "success",
      data: updatedTx,
    });
  } catch (error) {
    console.error(" updateTransaction error:", error);

    if (
      error.message?.includes("Category") ||
      error.message?.includes("Wallet")
    ) {
      return res.status(400).json({
        status: "error",
        message: error.message,
        detail: error.detail || null,
        code: error.code || null,
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi cập nhật giao dịch",
    });
  }
};

/**
 * DELETE /api/transactions/:id
 * => soft delete (set deleted_at)
 */
exports.deleteTransaction = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      status: "error",
      message: "Thiếu transaction id",
    });
  }

  try {
    const deleteSql = `
  UPDATE transactions
  SET deleted_at = now(), updated_at = now()
  WHERE transaction_id = $1
    AND user_id = $2
    AND deleted_at IS NULL
  RETURNING transaction_id, tx_date
`;

    const { rows } = await pool.query(deleteSql, [id, userId]);

    if (rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Giao dịch không tồn tại hoặc đã bị xoá trước đó",
      });
    }

    const deletedTx = rows[0];

    // Sau khi xoá giao dịch → check & log cảnh báo ngân sách (tháng của giao dịch)
    try {
      await budgetService.checkAndLogBudgetAlertsForUser(
        userId,
        deletedTx.tx_date
      );
    } catch (err) {
      console.error("checkAndLogBudgetAlertsForUser (delete) error:", err);
    }

    return res.json({
      status: "success",
      message: "Xoá giao dịch thành công",
    });
  } catch (error) {
    console.error("deleteTransaction error:", error);
    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi xoá giao dịch",
    });
  }
};

/**
 * GET /api/transactions/trash
 * => danh sách giao dịch đã xoá mềm
 */
exports.listDeletedTransactions = async (req, res) => {
  const userId = req.user.id;

  try {
    const sql = `
      SELECT
        t.transaction_id,
        t.category_id,
        t.wallet_id,
        t.amount,
        t.description,
        to_char(t.tx_date, 'YYYY-MM-DD') AS tx_date,
        t.deleted_at,
        c.category_name,
        c.type AS category_type,
        w.wallet_name
      FROM transactions t
      JOIN categories c ON c.category_id = t.category_id
      JOIN wallets   w ON w.wallet_id   = t.wallet_id
      WHERE t.user_id = $1
        AND t.deleted_at IS NOT NULL
      ORDER BY t.deleted_at DESC, t.tx_date DESC, t.transaction_id DESC
      LIMIT 200
    `;

    const { rows } = await pool.query(sql, [userId]);

    return res.json({
      status: "success",
      data: rows,
    });
  } catch (error) {
    console.error("listDeletedTransactions error:", error);
    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi lấy giỏ rác giao dịch",
    });
  }
};

/**
 * POST /api/transactions/:id/restore
 * => khôi phục giao dịch (deleted_at = NULL)
 */

exports.restoreTransaction = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      status: "error",
      message: "Thiếu transaction id",
    });
  }

  // format tiền giống các API khác
  const formatCurrency = (value) =>
    new Intl.NumberFormat("vi-VN").format(Number(value || 0)) + "đ";

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // 1. Lấy giao dịch đang ở giỏ rác + loại (income/expense) + số dư ví hiện tại
    const selectSql = `
      SELECT
        t.transaction_id,
        t.amount,
        t.wallet_id,
         t.tx_date,
        t.deleted_at,
        c.type    AS category_type,
        w.balance AS wallet_balance      -- balance NUMERIC(14,2)
      FROM transactions t
      JOIN categories c ON c.category_id = t.category_id
      JOIN wallets   w ON w.wallet_id   = t.wallet_id
      WHERE t.transaction_id = $1
        AND t.user_id = $2
        AND t.deleted_at IS NOT NULL
      FOR UPDATE
    `;

    const { rows } = await client.query(selectSql, [id, userId]);

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        status: "error",
        message: "Giao dịch không tồn tại hoặc không nằm trong giỏ rác",
      });
    }

    const txRow = rows[0];
    const txDate = txRow.tx_date;

    // 2. Nếu là chi tiêu thì kiểm tra xem có làm ví âm không
    if (txRow.category_type === "expense") {
      const amount = Number(txRow.amount || 0); // NUMERIC -> Number
      const walletBalance = Number(txRow.wallet_balance); // NUMERIC -> Number

      if (amount > walletBalance) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          status: "error",
          code: "INSUFFICIENT_BALANCE",
          message:
            "Giao dịch này sẽ làm số dư ví của bạn âm. Số dư hiện tại: " +
            formatCurrency(walletBalance),
        });
      }
    }

    // 3. Khôi phục giao dịch (deleted_at = NULL)
    const restoreSql = `
      UPDATE transactions
      SET deleted_at = NULL,
          updated_at = now()
      WHERE transaction_id = $1
        AND user_id = $2
        AND deleted_at IS NOT NULL
      RETURNING transaction_id
    `;

    const restoreResult = await client.query(restoreSql, [id, userId]);

    if (restoreResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        status: "error",
        message: "Giao dịch không tồn tại hoặc không nằm trong giỏ rác",
      });
    }

    await client.query("COMMIT");

    // 4. Check lại budget (không để vỡ response nếu lỗi)
    try {
      await budgetService.checkAndLogBudgetAlertsForUser(userId, txDate);
    } catch (err) {
      console.error("checkAndLogBudgetAlertsForUser (restore) error:", err);
    }

    return res.json({
      status: "success",
      message: "Khôi phục giao dịch thành công",
    });
  } catch (error) {
    console.error("restoreTransaction error:", error);
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (e) {
        console.error("rollback error:", e);
      }
    }
    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi khôi phục giao dịch",
    });
  } finally {
    if (client) client.release();
  }
};

/**
 * DELETE /api/transactions/:id/force
 * => xoá vĩnh viễn một giao dịch trong giỏ rác
 * (chỉ xóa những cái đã deleted_at != NULL để tránh lệch số dư)
 */
exports.forceDeleteTransaction = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      status: "error",
      message: "Thiếu transaction id",
    });
  }

  try {
    const sql = `
      DELETE FROM transactions
      WHERE transaction_id = $1
        AND user_id = $2
        AND deleted_at IS NOT NULL
      RETURNING transaction_id
    `;

    const { rows } = await pool.query(sql, [id, userId]);

    if (rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Giao dịch không tồn tại trong giỏ rác",
      });
    }

    // Xóa vĩnh viễn giao dịch đã soft delete: không ảnh hưởng ví/budget
    return res.json({
      status: "success",
      message: "Đã xoá vĩnh viễn giao dịch",
    });
  } catch (error) {
    console.error("forceDeleteTransaction error:", error);
    return res.status(500).json({
      status: "error",
      message: "Lỗi server khi xoá vĩnh viễn giao dịch",
    });
  }
};

exports.createTransfer = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const transfer = await transferService.createTransfer(userId, {
      fromWalletId: req.body.fromWalletId ?? req.body.from_wallet_id,
      toWalletId: req.body.toWalletId ?? req.body.to_wallet_id,
      amount: req.body.amount,
      description: req.body.description,
      txDate: req.body.txDate ?? req.body.tx_date,
    });

    res.status(201).json({
      status: "success",
      data: transfer,
    });
  } catch (err) {
    next(err);
  }
};

exports.listRecurring = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const rows = await recurringService.listRecurring(userId);
    res.json({ status: "success", data: rows });
  } catch (err) {
    next(err);
  }
};

exports.createRecurring = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const payload = {
      categoryId: req.body.categoryId ?? req.body.category_id,
      walletId: req.body.walletId ?? req.body.wallet_id,
      amount: req.body.amount,
      description: req.body.description,
      intervalUnit: req.body.intervalUnit ?? req.body.interval_unit,
      intervalCount: req.body.intervalCount ?? req.body.interval_count,
      startDate: req.body.startDate ?? req.body.start_date,
      endDate: req.body.endDate ?? req.body.end_date,
    };

    const row = await recurringService.createRecurring(userId, payload);
    res.status(201).json({ status: "success", data: row });
  } catch (err) {
    next(err);
  }
};

exports.updateRecurring = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const recurringId = Number(req.params.id);

    const row = await recurringService.updateRecurring(userId, recurringId, {
      categoryId: req.body.categoryId ?? req.body.category_id,
      walletId: req.body.walletId ?? req.body.wallet_id,
      amount: req.body.amount,
      description: req.body.description,
      intervalUnit: req.body.intervalUnit ?? req.body.interval_unit,
      intervalCount: req.body.intervalCount ?? req.body.interval_count,
      startDate: req.body.startDate ?? req.body.start_date,
      nextRunDate: req.body.nextRunDate ?? req.body.next_run_date,
      endDate: req.body.endDate ?? req.body.end_date,
      isActive: req.body.isActive ?? req.body.is_active,
    });

    if (!row) {
      return res.status(404).json({ status: "error", message: "Khong tim thay" });
    }

    res.json({ status: "success", data: row });
  } catch (err) {
    next(err);
  }
};

exports.deleteRecurring = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const recurringId = Number(req.params.id);
    const ok = await recurringService.deleteRecurring(userId, recurringId);
    if (!ok) {
      return res.status(404).json({ status: "error", message: "Khong tim thay" });
    }
    res.json({ status: "success", message: "Da xoa" });
  } catch (err) {
    next(err);
  }
};