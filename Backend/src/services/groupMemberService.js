const pool = require("../db");

function mapGroupMemberRow(row) {
  return {
    id: row.group_member_id,
    groupId: row.group_id,
    userId: row.user_id,
    userName: row.user_name,
    email: row.email,
    avatarUrl: row.avatar_url,
    nickname: row.nickname,
    role: row.role,
    joinedAt: row.joined_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function isGroupMember(groupId, userId) {
  const { rows } = await pool.query(
    `
      SELECT 1
      FROM group_members
      WHERE group_id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [groupId, userId],
  );

  return rows.length > 0;
}

async function isGroupOwner(groupId, userId) {
  const { rows } = await pool.query(
    `
      SELECT 1
      FROM group_members
      WHERE group_id = $1
        AND user_id = $2
        AND role = 'owner'
      LIMIT 1
    `,
    [groupId, userId],
  );

  return rows.length > 0;
}

async function getMembersByGroup(groupId) {
  const { rows } = await pool.query(
    `
      SELECT 
        gm.*,
        u.user_name,
        u.email,
        u.avatar_url
      FROM group_members gm
      JOIN users u ON u.user_id = gm.user_id
      WHERE gm.group_id = $1
      ORDER BY 
        CASE WHEN gm.role = 'owner' THEN 0 ELSE 1 END,
        gm.joined_at ASC
    `,
    [groupId],
  );

  return rows.map(mapGroupMemberRow);
}

async function addOwnerToGroup(client, groupId, userId) {
  const { rows } = await client.query(
    `
      INSERT INTO group_members (group_id, user_id, role)
      VALUES ($1, $2, 'owner')
      RETURNING *
    `,
    [groupId, userId],
  );

  return rows[0];
}

async function addMemberToGroup(groupId, userId, nickname = null) {
  const existed = await isGroupMember(groupId, userId);

  if (existed) {
    const err = new Error("Người dùng đã là thành viên của nhóm");
    err.status = 400;
    throw err;
  }

  const { rows } = await pool.query(
    `
      INSERT INTO group_members (group_id, user_id, nickname, role)
      VALUES ($1, $2, $3, 'member')
      RETURNING *
    `,
    [groupId, userId, nickname || null],
  );

  return rows[0];
}

async function updateMyNickname(groupId, userId, nickname) {
  const cleanNickname = nickname ? String(nickname).trim() : null;

  const { rows } = await pool.query(
    `
      UPDATE group_members
      SET nickname = $1,
          updated_at = now()
      WHERE group_id = $2
        AND user_id = $3
      RETURNING *
    `,
    [cleanNickname, groupId, userId],
  );

  if (rows.length === 0) {
    const err = new Error("Không tìm thấy thành viên trong nhóm");
    err.status = 404;
    throw err;
  }

  return rows[0];
}

async function transferOwnership(groupId, currentOwnerId, newOwnerId) {
  if (String(currentOwnerId) === String(newOwnerId)) {
    const err = new Error("Người nhận quyền owner đang là owner hiện tại");
    err.status = 400;
    throw err;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows: currentOwnerRows } = await client.query(
      `
        SELECT *
        FROM group_members
        WHERE group_id = $1
          AND user_id = $2
          AND role = 'owner'
        FOR UPDATE
      `,
      [groupId, currentOwnerId],
    );

    if (currentOwnerRows.length === 0) {
      const err = new Error("Bạn không phải owner hiện tại của nhóm");
      err.status = 403;
      throw err;
    }

    const { rows: newOwnerRows } = await client.query(
      `
        SELECT *
        FROM group_members
        WHERE group_id = $1
          AND user_id = $2
        FOR UPDATE
      `,
      [groupId, newOwnerId],
    );

    if (newOwnerRows.length === 0) {
      const err = new Error(
        "Người nhận quyền owner không phải thành viên của nhóm",
      );
      err.status = 404;
      throw err;
    }

    await client.query(
      `
        UPDATE group_members
        SET role = 'member',
            updated_at = now()
        WHERE group_id = $1
          AND user_id = $2
      `,
      [groupId, currentOwnerId],
    );

    const { rows } = await client.query(
      `
        UPDATE group_members
        SET role = 'owner',
            updated_at = now()
        WHERE group_id = $1
          AND user_id = $2
        RETURNING *
      `,
      [groupId, newOwnerId],
    );

    await client.query(
      `
        UPDATE family_groups
        SET owner_id = $1,
            updated_at = now()
        WHERE group_id = $2
      `,
      [newOwnerId, groupId],
    );

    await client.query("COMMIT");

    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function removeMember(groupId, targetUserId) {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM group_members
      WHERE group_id = $1
        AND user_id = $2
    `,
    [groupId, targetUserId],
  );

  if (rows.length === 0) {
    const err = new Error("Không tìm thấy thành viên trong nhóm");
    err.status = 404;
    throw err;
  }

  if (rows[0].role === "owner") {
    const err = new Error(
      "Không thể xóa owner khỏi nhóm. Hãy chuyển quyền owner trước.",
    );
    err.status = 400;
    throw err;
  }

  await pool.query(
    `
      DELETE FROM group_members
      WHERE group_id = $1
        AND user_id = $2
    `,
    [groupId, targetUserId],
  );

  return true;
}

async function leaveGroup(groupId, userId) {
  const { rows } = await pool.query(
    `
      SELECT role
      FROM group_members
      WHERE group_id = $1
        AND user_id = $2
    `,
    [groupId, userId],
  );

  if (rows.length === 0) {
    const err = new Error("Bạn không phải thành viên của nhóm");
    err.status = 404;
    throw err;
  }

  if (rows[0].role === "owner") {
    const err = new Error(
      "Owner không thể rời nhóm trước khi chuyển quyền owner cho thành viên khác",
    );
    err.status = 400;
    throw err;
  }

  await pool.query(
    `
      DELETE FROM group_members
      WHERE group_id = $1
        AND user_id = $2
    `,
    [groupId, userId],
  );

  return true;
}

module.exports = {
  mapGroupMemberRow,
  isGroupMember,
  isGroupOwner,
  getMembersByGroup,
  addOwnerToGroup,
  addMemberToGroup,
  updateMyNickname,
  transferOwnership,
  removeMember,
  leaveGroup,
};
