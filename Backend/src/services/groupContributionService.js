const pool = require("../db");

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
    const err = new Error("Ví nhóm nhận đóng góp là bắt buộc");
    err.status = 400;
    throw err;
  }

  if (!title) {
    const err = new Error("Tên quỹ đóng góp là bắt buộc");
    err.status = 400;
    throw err;
  }

  if (targetAmount != null && targetAmount <= 0) {
    const err = new Error("Mục tiêu đóng góp phải lớn hơn 0");
    err.status = 400;
    throw err;
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
    const err = new Error("Không tìm thấy quỹ đóng góp");
    err.status = 404;
    throw err;
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
    const err = new Error("Không tìm thấy quỹ đóng góp");
    err.status = 404;
    throw err;
  }

  const current = existedRows[0];

  const title =
    payload.title !== undefined ? String(payload.title).trim() : current.title;

  if (!title) {
    const err = new Error("Tên quỹ đóng góp không được để trống");
    err.status = 400;
    throw err;
  }

  const status = payload.status !== undefined ? payload.status : current.status;

  if (!["open", "closed", "cancelled"].includes(status)) {
    const err = new Error("Trạng thái quỹ không hợp lệ");
    err.status = 400;
    throw err;
  }

  const targetAmount =
    payload.targetAmount !== undefined
      ? Number(payload.targetAmount)
      : payload.target_amount !== undefined
        ? Number(payload.target_amount)
        : current.target_amount;

  if (targetAmount != null && Number(targetAmount) <= 0) {
    const err = new Error("Mục tiêu đóng góp phải lớn hơn 0");
    err.status = 400;
    throw err;
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
    const err = new Error("Danh sách phân bổ đóng góp không được để trống");
    err.status = 400;
    throw err;
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
      const err = new Error("Không tìm thấy quỹ đóng góp");
      err.status = 404;
      throw err;
    }

    for (const item of assignments) {
      const userId = item.userId || item.user_id;
      const expectedAmount =
        item.expectedAmount !== undefined
          ? Number(item.expectedAmount)
          : Number(item.expected_amount);

      if (!userId || !expectedAmount || expectedAmount <= 0) {
        const err = new Error(
          "Mỗi phân bổ cần userId và expectedAmount hợp lệ",
        );
        err.status = 400;
        throw err;
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

async function recordContribution(groupId, recordedBy, payload) {
  const planId =
    payload.contributionPlanId || payload.contribution_plan_id || null;

  const assignmentId = payload.assignmentId || payload.assignment_id || null;
  const userId = payload.userId || payload.user_id || null;
  const walletId = Number(
    payload.groupWalletId || payload.group_wallet_id || payload.walletId,
  );
  const amount = Number(payload.amount);

  if (!walletId) {
    const err = new Error("Ví nhóm nhận tiền đóng góp là bắt buộc");
    err.status = 400;
    throw err;
  }

  if (!amount || amount <= 0) {
    const err = new Error("Số tiền đóng góp phải lớn hơn 0");
    err.status = 400;
    throw err;
  }

  if (!userId) {
    const err = new Error("Cần chọn thành viên đóng góp");
    err.status = 400;
    throw err;
  }

  const { rows } = await pool.query(
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
        contributed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::timestamptz, now()))
      RETURNING *
    `,
    [
      groupId,
      walletId,
      planId,
      assignmentId,
      userId,
      recordedBy,
      amount,
      payload.note || null,
      payload.contributedAt || payload.contributed_at || null,
    ],
  );

  return getContributionById(groupId, rows[0].contribution_id);
}

async function getContributionById(groupId, contributionId) {
  const { rows } = await pool.query(
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
    const err = new Error("Không tìm thấy lịch sử đóng góp");
    err.status = 404;
    throw err;
  }

  return mapContributionRow(rows[0]);
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
  getContributions,
  getProgress,
};
