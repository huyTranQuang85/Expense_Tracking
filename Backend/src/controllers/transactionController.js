const pool = require("../db");
const budgetService = require("../services/budgetService");

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
  const { month, year, type, q } = req.query;

  try {
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
        c.category_name,
        c.type AS category_type,
        w.wallet_name
      FROM transactions t
      JOIN categories c ON c.category_id = t.category_id
      JOIN wallets   w ON w.wallet_id   = t.wallet_id
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

