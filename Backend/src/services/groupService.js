const pool = require("../db");
const groupMemberService = require("./groupMemberService");

function mapGroupRow(row) {
  return {
    id: row.group_id,
    ownerId: row.owner_id,
    name: row.group_name,
    description: row.description,
    avatarUrl: row.avatar_url,
    isArchived: row.is_archived,
    myRole: row.my_role || undefined,
    memberCount:
      row.member_count !== undefined && row.member_count !== null
        ? Number(row.member_count)
        : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createGroup(userId, payload) {
  const name = String(
    payload.name || payload.group_name || payload.groupName || "",
  ).trim();

  if (!name) {
    const err = new Error("Tên nhóm là bắt buộc");
    err.status = 400;
    throw err;
  }

  const description = payload.description || null;
  const avatarUrl = payload.avatarUrl || payload.avatar_url || null;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
        INSERT INTO family_groups (owner_id, group_name, description, avatar_url)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [userId, name, description, avatarUrl],
    );

    const group = rows[0];

    await groupMemberService.addOwnerToGroup(client, group.group_id, userId);

    await client.query("COMMIT");

    return mapGroupRow({
      ...group,
      my_role: "owner",
      member_count: 1,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function getMyGroups(userId) {
  const { rows } = await pool.query(
    `
      SELECT 
        fg.*,
        gm.role AS my_role,
        COUNT(gm2.group_member_id)::int AS member_count
      FROM family_groups fg
      JOIN group_members gm 
        ON gm.group_id = fg.group_id
       AND gm.user_id = $1
      LEFT JOIN group_members gm2
        ON gm2.group_id = fg.group_id
      WHERE fg.is_archived = false
      GROUP BY fg.group_id, gm.role
      ORDER BY fg.created_at DESC
    `,
    [userId],
  );

  return rows.map(mapGroupRow);
}

async function getGroupById(groupId, userId) {
  const { rows } = await pool.query(
    `
      SELECT 
        fg.*,
        gm.role AS my_role,
        COUNT(gm2.group_member_id)::int AS member_count
      FROM family_groups fg
      JOIN group_members gm
        ON gm.group_id = fg.group_id
       AND gm.user_id = $2
      LEFT JOIN group_members gm2
        ON gm2.group_id = fg.group_id
      WHERE fg.group_id = $1
      GROUP BY fg.group_id, gm.role
    `,
    [groupId, userId],
  );

  if (rows.length === 0) {
    const err = new Error(
      "Không tìm thấy nhóm hoặc bạn không có quyền truy cập",
    );
    err.status = 404;
    throw err;
  }

  return mapGroupRow(rows[0]);
}

async function updateGroup(groupId, payload) {
  const { rows: existedRows } = await pool.query(
    `
      SELECT *
      FROM family_groups
      WHERE group_id = $1
    `,
    [groupId],
  );

  if (existedRows.length === 0) {
    const err = new Error("Không tìm thấy nhóm");
    err.status = 404;
    throw err;
  }

  const current = existedRows[0];

  const name =
    payload.name !== undefined
      ? String(payload.name).trim()
      : payload.group_name !== undefined
        ? String(payload.group_name).trim()
        : current.group_name;

  if (!name) {
    const err = new Error("Tên nhóm không được để trống");
    err.status = 400;
    throw err;
  }

  const description =
    payload.description !== undefined
      ? payload.description
      : current.description;

  const avatarUrl =
    payload.avatarUrl !== undefined
      ? payload.avatarUrl
      : payload.avatar_url !== undefined
        ? payload.avatar_url
        : current.avatar_url;

  const { rows } = await pool.query(
    `
      UPDATE family_groups
      SET group_name = $1,
          description = $2,
          avatar_url = $3,
          updated_at = now()
      WHERE group_id = $4
      RETURNING *
    `,
    [name, description || null, avatarUrl || null, groupId],
  );

  return mapGroupRow(rows[0]);
}

async function archiveGroup(groupId) {
  const { rows } = await pool.query(
    `
      UPDATE family_groups
      SET is_archived = true,
          updated_at = now()
      WHERE group_id = $1
      RETURNING *
    `,
    [groupId],
  );

  if (rows.length === 0) {
    const err = new Error("Không tìm thấy nhóm");
    err.status = 404;
    throw err;
  }

  return mapGroupRow(rows[0]);
}

async function deleteGroup(groupId) {
  const { rowCount } = await pool.query(
    `
      DELETE FROM family_groups
      WHERE group_id = $1
    `,
    [groupId],
  );

  if (rowCount === 0) {
    const err = new Error("Không tìm thấy nhóm");
    err.status = 404;
    throw err;
  }

  return true;
}

async function getGroupDashboard(groupId) {
  const [
    walletResult,
    budgetResult,
    contributionResult,
    monthlyResult,
    memberResult,
  ] = await Promise.all([
    pool.query(
      `
        SELECT *
        FROM v_group_wallet_balances
        WHERE group_id = $1
        ORDER BY group_wallet_id ASC
      `,
      [groupId],
    ),
    pool.query(
      `
        SELECT *
        FROM v_group_budget_usage
        WHERE group_id = $1
        ORDER BY month DESC, group_budget_id DESC
      `,
      [groupId],
    ),
    pool.query(
      `
        SELECT *
        FROM v_group_contribution_progress
        WHERE group_id = $1
        ORDER BY contribution_plan_id DESC
      `,
      [groupId],
    ),
    pool.query(
      `
        SELECT *
        FROM v_group_monthly_summary
        WHERE group_id = $1
        ORDER BY month DESC
        LIMIT 6
      `,
      [groupId],
    ),
    pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM group_members
        WHERE group_id = $1
      `,
      [groupId],
    ),
  ]);

  return {
    memberCount: memberResult.rows[0]?.total || 0,
    wallets: walletResult.rows,
    budgets: budgetResult.rows,
    contributions: contributionResult.rows,
    monthlySummary: monthlyResult.rows,
  };
}

module.exports = {
  mapGroupRow,
  createGroup,
  getMyGroups,
  getGroupById,
  updateGroup,
  archiveGroup,
  deleteGroup,
  getGroupDashboard,
};
