const pool = require("../db");

function createHttpError(message, status = 400, code = null) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function mapPlanRow(row) {
  return {
    id: row.contribution_plan_id,
    groupId: row.group_id,
    groupWalletId: row.group_wallet_id,
    walletName: row.wallet_name,
    title: row.title,
    description: row.description,
    targetAmount: row.target_amount != null ? Number(row.target_amount) : null,
    dueDate: row.due_date,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAssignmentRow(row) {
  return {
    id: row.assignment_id,
    contributionPlanId: row.contribution_plan_id,
    userId: row.user_id,
    userName: row.user_name,
    email: row.email,
    expectedAmount: Number(row.expected_amount),
    paidAmount: Number(row.paid_amount),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapContributionRow(row) {
  return {
    id: row.contribution_id,
    groupId: row.group_id,
    groupWalletId: row.group_wallet_id,
    contributionPlanId: row.contribution_plan_id,
    assignmentId: row.assignment_id,
    userId: row.user_id,
    userName: row.user_name,
    recordedBy: row.recorded_by,
    recordedByName: row.recorded_by_name,
    amount: Number(row.amount),
    note: row.note,
    contributedAt: row.contributed_at,
    sourceWalletId: row.source_wallet_id,
    personalTransactionId: row.personal_transaction_id,
    status: row.status || "completed",
    reversedAt: row.reversed_at,
    reversedBy: row.reversed_by,
    reverseReason: row.reverse_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getPlans(groupId, filters = {}) {
  const params = [groupId];
  const conditions = [`gcp.group_id = $1`];

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`gcp.status = $${params.length}`);
  }

  const { rows } = await pool.query(
    `
      SELECT 
        gcp.*,
        gw.wallet_name
      FROM group_contribution_plans gcp
      JOIN group_wallets gw ON gw.group_wallet_id = gcp.group_wallet_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY gcp.created_at DESC
    `,
    params,
  );

  return rows.map(mapPlanRow);
}

async function createPlan(groupId, userId, payload) {
  const walletId = Number(
    payload.groupWalletId || payload.group_wallet_id || payload.walletId,
  );
  const title = String(payload.title || "").trim();
  const description = payload.description || null;
  const targetAmount =
    payload.targetAmount !== undefined
      ? Number(payload.targetAmount)
      : payload.target_amount !== undefined
        ? Number(payload.target_amount)
        : null;

  if (!walletId) {
    throw createHttpError("Ví nhóm nhận đóng góp là bắt buộc");
  }

  if (!title) {
    throw createHttpError("Tên quỹ đóng góp là bắt buộc");
  }

  if (targetAmount != null && targetAmount <= 0) {
    throw createHttpError("Mục tiêu đóng góp phải lớn hơn 0");
  }

  const { rows } = await pool.query(
    `
      INSERT INTO group_contribution_plans (
        group_id,
        group_wallet_id,
        title,
        description,
        target_amount,
        due_date,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      groupId,
      walletId,
      title,
      description,
      targetAmount,
      payload.dueDate || payload.due_date || null,
      userId,
    ],
  );

  return mapPlanRow(rows[0]);
}

async function getPlanDetail(groupId, planId) {
  const { rows: planRows } = await pool.query(
    `
      SELECT 
        gcp.*,
        gw.wallet_name
      FROM group_contribution_plans gcp
      JOIN group_wallets gw ON gw.group_wallet_id = gcp.group_wallet_id
      WHERE gcp.group_id = $1
        AND gcp.contribution_plan_id = $2
    `,
    [groupId, planId],
  );

  if (planRows.length === 0) {
    throw createHttpError("Không tìm thấy quỹ đóng góp", 404);
  }

  const { rows: assignmentRows } = await pool.query(
    `
      SELECT 
        gca.*,
        u.user_name,
        u.email
      FROM group_contribution_assignments gca
      JOIN users u ON u.user_id = gca.user_id
      WHERE gca.contribution_plan_id = $1
      ORDER BY u.user_name ASC
    `,
    [planId],
  );

  return {
    ...mapPlanRow(planRows[0]),
    assignments: assignmentRows.map(mapAssignmentRow),
  };
}

async function updatePlan(groupId, planId, payload) {
  const { rows: existedRows } = await pool.query(
    `
      SELECT *
      FROM group_contribution_plans
      WHERE group_id = $1
        AND contribution_plan_id = $2
    `,
    [groupId, planId],
  );

  if (existedRows.length === 0) {
    throw createHttpError("Không tìm thấy quỹ đóng góp", 404);
  }

  const current = existedRows[0];

  const title =
    payload.title !== undefined ? String(payload.title).trim() : current.title;

  if (!title) {
    throw createHttpError("Tên quỹ đóng góp không được để trống");
  }

  const status = payload.status !== undefined ? payload.status : current.status;

  if (!["open", "closed", "cancelled"].includes(status)) {
    throw createHttpError("Trạng thái quỹ không hợp lệ");
  }

  const targetAmount =
    payload.targetAmount !== undefined
      ? Number(payload.targetAmount)
      : payload.target_amount !== undefined
        ? Number(payload.target_amount)
        : current.target_amount;

  if (targetAmount != null && Number(targetAmount) <= 0) {
    throw createHttpError("Mục tiêu đóng góp phải lớn hơn 0");
  }

  const { rows } = await pool.query(
    `
      UPDATE group_contribution_plans
      SET group_wallet_id = $1,
          title = $2,
          description = $3,
          target_amount = $4,
          due_date = $5,
          status = $6,
          updated_at = now()
      WHERE group_id = $7
        AND contribution_plan_id = $8
      RETURNING *
    `,
    [
      payload.groupWalletId !== undefined
        ? payload.groupWalletId
        : payload.group_wallet_id !== undefined
          ? payload.group_wallet_id
          : current.group_wallet_id,
      title,
      payload.description !== undefined
        ? payload.description
        : current.description,
      targetAmount,
      payload.dueDate !== undefined
        ? payload.dueDate
        : payload.due_date !== undefined
          ? payload.due_date
          : current.due_date,
      status,
      groupId,
      planId,
    ],
  );

  return mapPlanRow(rows[0]);
}

async function upsertAssignments(groupId, planId, assignments = []) {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    throw createHttpError("Danh sách phân bổ đóng góp không được để trống");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows: planRows } = await client.query(
      `
        SELECT *
        FROM group_contribution_plans
        WHERE group_id = $1
          AND contribution_plan_id = $2
        FOR UPDATE
      `,
      [groupId, planId],
    );

    if (planRows.length === 0) {
      throw createHttpError("Không tìm thấy quỹ đóng góp", 404);
    }

    for (const item of assignments) {
      const userId = item.userId || item.user_id;
      const expectedAmount =
        item.expectedAmount !== undefined
          ? Number(item.expectedAmount)
          : Number(item.expected_amount);

      if (!userId || !expectedAmount || expectedAmount <= 0) {
        throw createHttpError(
          "Mỗi phân bổ cần userId và expectedAmount hợp lệ",
        );
      }

      await client.query(
        `
          INSERT INTO group_contribution_assignments (
            contribution_plan_id,
            user_id,
            expected_amount
          )
          VALUES ($1, $2, $3)
          ON CONFLICT (contribution_plan_id, user_id)
          DO UPDATE SET 
            expected_amount = EXCLUDED.expected_amount,
            updated_at = now()
        `,
        [planId, userId, expectedAmount],
      );
    }

    await client.query("COMMIT");

    return getPlanDetail(groupId, planId);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function assertGroupMember(client, groupId, userId, message) {
  const { rows } = await client.query(
    `
      SELECT role
      FROM group_members
      WHERE group_id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [groupId, userId],
  );

  if (rows.length === 0) {
    throw createHttpError(
      message || "Người dùng không phải thành viên nhóm",
      403,
    );
  }

  return rows[0];
}

async function validateGroupWallet(client, groupId, walletId) {
  const { rows } = await client.query(
    `
      SELECT group_wallet_id
      FROM group_wallets
      WHERE group_wallet_id = $1
        AND group_id = $2
        AND is_archived = false
      LIMIT 1
    `,
    [walletId, groupId],
  );

  if (rows.length === 0) {
    throw createHttpError("Ví nhóm không tồn tại hoặc đã bị lưu trữ", 404);
  }
}

async function validatePersonalExpenseCategory(client, userId, categoryId) {
  const { rows } = await client.query(
    `
      SELECT category_id
      FROM categories
      WHERE category_id = $1
        AND type = 'expense'
        AND (user_id IS NULL OR user_id = $2)
      LIMIT 1
    `,
    [categoryId, userId],
  );

  if (rows.length === 0) {
    throw createHttpError(
      "Danh mục cá nhân không hợp lệ hoặc không phải chi tiêu",
      400,
    );
  }
}

async function getContributionById(groupId, contributionId, client = pool) {
  const { rows } = await client.query(
    `
      SELECT 
        gc.*,
        u1.user_name AS user_name,
        u2.user_name AS recorded_by_name
      FROM group_contributions gc
      LEFT JOIN users u1 ON u1.user_id = gc.user_id
      LEFT JOIN users u2 ON u2.user_id = gc.recorded_by
      WHERE gc.group_id = $1
        AND gc.contribution_id = $2
    `,
    [groupId, contributionId],
  );

  if (rows.length === 0) {
    throw createHttpError("Không tìm thấy lịch sử đóng góp", 404);
  }

  return mapContributionRow(rows[0]);
}

async function recordContribution(groupId, recordedBy, payload) {
  const planId =
    payload.contributionPlanId || payload.contribution_plan_id || null;

  const assignmentId = payload.assignmentId || payload.assignment_id || null;
  const userId = payload.userId || payload.user_id || null;
  const walletId = Number(
    payload.groupWalletId || payload.group_wallet_id || payload.walletId,
  );
  const amount = Number(payload.amount);
  const sourceWalletId =
    payload.sourceWalletId !== undefined
      ? Number(payload.sourceWalletId)
      : payload.source_wallet_id !== undefined
        ? Number(payload.source_wallet_id)
        : null;
  const sourceCategoryId =
    payload.sourceCategoryId !== undefined
      ? Number(payload.sourceCategoryId)
      : payload.source_category_id !== undefined
        ? Number(payload.source_category_id)
        : null;
  const contributedAt = payload.contributedAt || payload.contributed_at || null;
  const note = payload.note || null;

  if (!walletId) {
    throw createHttpError("Ví nhóm nhận tiền đóng góp là bắt buộc");
  }

  if (!amount || amount <= 0) {
    throw createHttpError("Số tiền đóng góp phải lớn hơn 0");
  }

  if (!userId) {
    throw createHttpError("Cần chọn thành viên đóng góp");
  }

  if (sourceWalletId && !sourceCategoryId) {
    throw createHttpError("Cần chọn danh mục cá nhân cho khoản đóng góp nhóm");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const recorderMember = await assertGroupMember(
      client,
      groupId,
      recordedBy,
      "Người ghi nhận không phải thành viên nhóm",
    );

    await assertGroupMember(
      client,
      groupId,
      userId,
      "Người đóng góp không phải thành viên nhóm",
    );

    await validateGroupWallet(client, groupId, walletId);

    let personalTransactionId = null;

    if (sourceWalletId) {
      if (
        String(recordedBy) !== String(userId) &&
        recorderMember.role !== "owner"
      ) {
        throw createHttpError(
          "Bạn chỉ có thể chuyển tiền từ ví cá nhân của chính mình",
          403,
        );
      }

      const { rows: walletRows } = await client.query(
        `
          SELECT wallet_id, balance
          FROM wallets
          WHERE wallet_id = $1
            AND user_id = $2
            AND is_archived = false
          FOR UPDATE
        `,
        [sourceWalletId, userId],
      );

      if (walletRows.length === 0) {
        throw createHttpError(
          "Ví cá nhân không tồn tại hoặc đã bị lưu trữ",
          404,
        );
      }

      if (Number(walletRows[0].balance) < amount) {
        throw createHttpError(
          "Số dư ví cá nhân không đủ",
          400,
          "INSUFFICIENT_BALANCE",
        );
      }

      await validatePersonalExpenseCategory(client, userId, sourceCategoryId);

      const description = note || `Đóng góp quỹ nhóm #${groupId}`;

      const { rows: txRows } = await client.query(
        `
          INSERT INTO transactions (
            user_id,
            category_id,
            wallet_id,
            amount,
            description,
            tx_date
          )
          VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE))
          RETURNING transaction_id
        `,
        [
          userId,
          sourceCategoryId,
          sourceWalletId,
          amount,
          description,
          normalizeDate(contributedAt),
        ],
      );

      personalTransactionId = txRows[0].transaction_id;
    }

    const { rows } = await client.query(
      `
        INSERT INTO group_contributions (
          group_id,
          group_wallet_id,
          contribution_plan_id,
          assignment_id,
          user_id,
          recorded_by,
          amount,
          note,
          contributed_at,
          source_wallet_id,
          personal_transaction_id,
          status
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          COALESCE($9::timestamptz, now()),
          $10, $11, 'completed'
        )
        RETURNING contribution_id
      `,
      [
        groupId,
        walletId,
        planId,
        assignmentId,
        userId,
        recordedBy,
        amount,
        note,
        contributedAt,
        sourceWalletId,
        personalTransactionId,
      ],
    );

    const contributionId = rows[0].contribution_id;
    const contribution = await getContributionById(
      groupId,
      contributionId,
      client,
    );

    await client.query("COMMIT");

    return contribution;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function reverseContribution(
  groupId,
  contributionId,
  reversedBy,
  payload = {},
) {
  const reason = payload.reason ? String(payload.reason).trim() : null;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
        SELECT *
        FROM group_contributions
        WHERE group_id = $1
          AND contribution_id = $2
        FOR UPDATE
      `,
      [groupId, contributionId],
    );

    if (rows.length === 0) {
      throw createHttpError("Không tìm thấy lịch sử đóng góp", 404);
    }

    const contribution = rows[0];

    if (contribution.status !== "completed") {
      throw createHttpError("Khoản đóng góp đã được hoàn tác trước đó", 400);
    }

    const member = await assertGroupMember(
      client,
      groupId,
      reversedBy,
      "Bạn không phải thành viên của nhóm này",
    );

    const isRecorder =
      contribution.recorded_by &&
      String(contribution.recorded_by) === String(reversedBy);

    if (member.role !== "owner" && !isRecorder) {
      throw createHttpError(
        "Bạn không có quyền hoàn tác khoản đóng góp này",
        403,
      );
    }

    if (contribution.personal_transaction_id) {
      await client.query(
        `
          UPDATE transactions
          SET deleted_at = now(),
              updated_at = now()
          WHERE transaction_id = $1
            AND deleted_at IS NULL
        `,
        [contribution.personal_transaction_id],
      );
    }

    const { rows: updatedRows } = await client.query(
      `
        UPDATE group_contributions
        SET status = 'reversed',
            reversed_at = now(),
            reversed_by = $1,
            reverse_reason = $2,
            updated_at = now()
        WHERE group_id = $3
          AND contribution_id = $4
          AND status = 'completed'
        RETURNING contribution_id
      `,
      [reversedBy, reason, groupId, contributionId],
    );

    if (updatedRows.length === 0) {
      throw createHttpError("Khoản đóng góp đã được hoàn tác trước đó", 400);
    }

    const result = await getContributionById(groupId, contributionId, client);

    await client.query("COMMIT");

    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getContributions(groupId, filters = {}) {
  const params = [groupId];
  const conditions = [`gc.group_id = $1`];

  if (filters.planId) {
    params.push(Number(filters.planId));
    conditions.push(`gc.contribution_plan_id = $${params.length}`);
  }

  if (filters.userId) {
    params.push(filters.userId);
    conditions.push(`gc.user_id = $${params.length}`);
  }

  if (filters.status && ["completed", "reversed"].includes(filters.status)) {
    params.push(filters.status);
    conditions.push(`gc.status = $${params.length}`);
  }

  const { rows } = await pool.query(
    `
      SELECT 
        gc.*,
        u1.user_name AS user_name,
        u2.user_name AS recorded_by_name
      FROM group_contributions gc
      LEFT JOIN users u1 ON u1.user_id = gc.user_id
      LEFT JOIN users u2 ON u2.user_id = gc.recorded_by
      WHERE ${conditions.join(" AND ")}
      ORDER BY gc.contributed_at DESC, gc.contribution_id DESC
    `,
    params,
  );

  return rows.map(mapContributionRow);
}

async function getProgress(groupId) {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM v_group_contribution_progress
      WHERE group_id = $1
      ORDER BY contribution_plan_id DESC
    `,
    [groupId],
  );

  return rows.map((row) => ({
    contributionPlanId: row.contribution_plan_id,
    groupId: row.group_id,
    groupWalletId: row.group_wallet_id,
    title: row.title,
    targetAmount: row.target_amount != null ? Number(row.target_amount) : null,
    dueDate: row.due_date,
    planStatus: row.plan_status,
    totalExpectedAmount: Number(row.total_expected_amount),
    totalPaidAmount: Number(row.total_paid_amount),
    remainingAmount: Number(row.remaining_amount),
    progressPercent: Number(row.progress_percent),
    memberCount: Number(row.member_count),
    paidMemberCount: Number(row.paid_member_count),
    partialMemberCount: Number(row.partial_member_count),
    unpaidMemberCount: Number(row.unpaid_member_count),
  }));
}

module.exports = {
  getPlans,
  createPlan,
  getPlanDetail,
  updatePlan,
  upsertAssignments,
  recordContribution,
  reverseContribution,
  getContributionById,
  getContributions,
  getProgress,
};
