const crypto = require("crypto");
const pool = require("../db");
const groupMemberService = require("./groupMemberService");

function mapInvitationRow(row) {
  return {
    id: row.invitation_id,
    groupId: row.group_id,
    groupName: row.group_name,
    invitedEmail: row.invited_email,
    invitedUserId: row.invited_user_id,
    invitedBy: row.invited_by,
    invitedByName: row.invited_by_name,
    status: row.status,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createInvitation(groupId, invitedBy, payload) {
  const email = String(payload.email || payload.invited_email || "")
    .trim()
    .toLowerCase();

  if (!email) {
    const err = new Error("Email người được mời là bắt buộc");
    err.status = 400;
    throw err;
  }
  const notificationService = require("./notificationService");
  const { rows: userRows } = await pool.query(
    `
      SELECT user_id, email
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email],
  );

  const invitedUser = userRows[0] || null;

  if (invitedUser) {
    const isMember = await groupMemberService.isGroupMember(
      groupId,
      invitedUser.user_id,
    );

    if (isMember) {
      const err = new Error("Người dùng này đã là thành viên của nhóm");
      err.status = 400;
      throw err;
    }
  }

  const { rows: pendingRows } = await pool.query(
    `
      SELECT *
      FROM group_invitations
      WHERE group_id = $1
        AND invited_email = $2
        AND status = 'pending'
      LIMIT 1
    `,
    [groupId, email],
  );

  if (pendingRows.length > 0) {
    const err = new Error("Email này đã có lời mời đang chờ xử lý");
    err.status = 400;
    throw err;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const { rows } = await pool.query(
    `
      INSERT INTO group_invitations (
        group_id,
        invited_email,
        invited_user_id,
        invited_by,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, now() + interval '7 days')
      RETURNING *
    `,
    [
      groupId,
      email,
      invitedUser ? invitedUser.user_id : null,
      invitedBy,
      tokenHash,
    ],
  );
  if (invitedUser) {
    const { rows: groupRows } = await pool.query(
      `
      SELECT group_name
      FROM family_groups
      WHERE group_id = $1
    `,
      [groupId],
    );

    const groupName = groupRows[0]?.group_name || "một nhóm";

    await notificationService.createNotification({
      userId: invitedUser.user_id,
      type: "group",
      title: "Bạn có lời mời vào nhóm",
      message: `Bạn được mời tham gia nhóm "${groupName}".`,
      metadata: {
        action: "group_invitation",
        groupId,
        invitationId: rows[0].invitation_id,
        groupName,
      },
    });
  }
  return {
    ...mapInvitationRow(rows[0]),
    token,
  };
}

async function getMyInvitations(userId) {
  const { rows: userRows } = await pool.query(
    `
      SELECT email
      FROM users
      WHERE user_id = $1
    `,
    [userId],
  );

  if (userRows.length === 0) {
    const err = new Error("Không tìm thấy người dùng");
    err.status = 404;
    throw err;
  }

  const email = userRows[0].email;

  const { rows } = await pool.query(
    `
      SELECT 
        gi.*,
        fg.group_name,
        u.user_name AS invited_by_name
      FROM group_invitations gi
      JOIN family_groups fg ON fg.group_id = gi.group_id
      LEFT JOIN users u ON u.user_id = gi.invited_by
      WHERE gi.invited_email = $1
        AND gi.status = 'pending'
        AND (gi.expires_at IS NULL OR gi.expires_at > now())
      ORDER BY gi.created_at DESC
    `,
    [email],
  );

  return rows.map(mapInvitationRow);
}

async function acceptInvitation(invitationId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows: userRows } = await client.query(
      `
        SELECT user_id, email
        FROM users
        WHERE user_id = $1
      `,
      [userId],
    );

    if (userRows.length === 0) {
      const err = new Error("Không tìm thấy người dùng");
      err.status = 404;
      throw err;
    }

    const user = userRows[0];

    const { rows: invitationRows } = await client.query(
      `
        SELECT *
        FROM group_invitations
        WHERE invitation_id = $1
          AND status = 'pending'
        FOR UPDATE
      `,
      [invitationId],
    );

    if (invitationRows.length === 0) {
      const err = new Error("Không tìm thấy lời mời đang chờ xử lý");
      err.status = 404;
      throw err;
    }

    const invitation = invitationRows[0];

    if (
      String(invitation.invited_email).toLowerCase() !==
      String(user.email).toLowerCase()
    ) {
      const err = new Error("Lời mời này không thuộc về tài khoản của bạn");
      err.status = 403;
      throw err;
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      const err = new Error("Lời mời đã hết hạn");
      err.status = 400;
      throw err;
    }

    const { rows: memberRows } = await client.query(
      `
        SELECT 1
        FROM group_members
        WHERE group_id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [invitation.group_id, userId],
    );

    if (memberRows.length === 0) {
      await client.query(
        `
          INSERT INTO group_members (group_id, user_id, role)
          VALUES ($1, $2, 'member')
        `,
        [invitation.group_id, userId],
      );
    }

    const { rows } = await client.query(
      `
        UPDATE group_invitations
        SET status = 'accepted',
            invited_user_id = $1,
            accepted_at = now(),
            updated_at = now()
        WHERE invitation_id = $2
        RETURNING *
      `,
      [userId, invitationId],
    );

    await client.query("COMMIT");

    return mapInvitationRow(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function declineInvitation(invitationId, userId) {
  const { rows: userRows } = await pool.query(
    `
      SELECT email
      FROM users
      WHERE user_id = $1
    `,
    [userId],
  );

  if (userRows.length === 0) {
    const err = new Error("Không tìm thấy người dùng");
    err.status = 404;
    throw err;
  }

  const { rows } = await pool.query(
    `
      UPDATE group_invitations
      SET status = 'declined',
          updated_at = now()
      WHERE invitation_id = $1
        AND invited_email = $2
        AND status = 'pending'
      RETURNING *
    `,
    [invitationId, userRows[0].email],
  );

  if (rows.length === 0) {
    const err = new Error("Không tìm thấy lời mời hợp lệ");
    err.status = 404;
    throw err;
  }

  return mapInvitationRow(rows[0]);
}

async function cancelInvitation(invitationId) {
  const { rows } = await pool.query(
    `
      UPDATE group_invitations
      SET status = 'cancelled',
          updated_at = now()
      WHERE invitation_id = $1
        AND status = 'pending'
      RETURNING *
    `,
    [invitationId],
  );

  if (rows.length === 0) {
    const err = new Error("Không tìm thấy lời mời đang chờ xử lý");
    err.status = 404;
    throw err;
  }

  return mapInvitationRow(rows[0]);
}

module.exports = {
  mapInvitationRow,
  createInvitation,
  getMyInvitations,
  acceptInvitation,
  declineInvitation,
  cancelInvitation,
};
