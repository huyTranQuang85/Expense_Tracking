const pool = require("../db");
const notificationService = require("./notificationService");

function toNumber(value) {
  return value == null ? null : Number(value);
}

async function getGroupMembers(groupId, excludeUserId = null) {
  const params = [groupId];
  let excludeSql = "";

  if (excludeUserId) {
    params.push(excludeUserId);
    excludeSql = `AND gm.user_id <> $${params.length}`;
  }

  const { rows } = await pool.query(
    `
      SELECT gm.user_id, u.user_name
      FROM group_members gm
      JOIN users u ON u.user_id = gm.user_id
      WHERE gm.group_id = $1
        ${excludeSql}
    `,
    params,
  );

  return rows;
}

async function notifyGroupTransaction(
  groupId,
  actorUserId,
  transaction,
  action = "group_transaction_created",
) {
  const members = await getGroupMembers(groupId, actorUserId);

  if (members.length === 0) {
    return [];
  }

  const amount = toNumber(transaction.amount);
  const titleByAction = {
    group_transaction_created: "Có giao dịch nhóm mới",
    group_transaction_updated: "Giao dịch nhóm đã được cập nhật",
    group_transaction_deleted: "Giao dịch nhóm đã được xóa",
  };

  const messageByAction = {
    group_transaction_created: `Nhóm vừa phát sinh giao dịch ${amount != null ? amount.toLocaleString("vi-VN") + "đ" : ""}`,
    group_transaction_updated: `Một giao dịch nhóm vừa được cập nhật`,
    group_transaction_deleted: `Một giao dịch nhóm vừa được xóa`,
  };

  return notificationService.createNotificationsBulk(
    members.map((member) => ({
      userId: member.user_id,
      type: "transaction",
      title: titleByAction[action] || "Có cập nhật giao dịch nhóm",
      message: messageByAction[action] || "Nhóm vừa có cập nhật giao dịch",
      metadata: {
        action,
        groupId,
        transactionId: transaction.id || transaction.group_transaction_id,
        groupWalletId: transaction.groupWalletId || transaction.group_wallet_id,
        groupCategoryId:
          transaction.groupCategoryId || transaction.group_category_id,
        amount,
      },
    })),
  );
}

async function checkAndNotifyBudgetAlerts(groupId, txDate) {
  const { rows: usageRows } = await pool.query(
    `
      SELECT v.*
      FROM v_group_budget_usage v
      JOIN group_budgets gb ON gb.group_budget_id = v.group_budget_id
      WHERE v.group_id = $1
        AND v.month = date_trunc('month', $2::date)::date
        AND gb.notify_in_app = true
        AND (
          v.usage_percent >= v.alert_threshold
          OR v.spent_amount > v.limit_amount
        )
    `,
    [groupId, txDate],
  );

  const notifications = [];

  for (const usage of usageRows) {
    const usagePercent = toNumber(usage.usage_percent) || 0;
    const spentAmount = toNumber(usage.spent_amount) || 0;
    const limitAmount = toNumber(usage.limit_amount) || 0;

    const thresholds = [];

    if (usagePercent >= Number(usage.alert_threshold)) {
      thresholds.push(Number(usage.alert_threshold));
    }

    if (spentAmount > limitAmount) {
      thresholds.push(101);
    }

    for (const threshold of thresholds) {
      const { rows: logRows } = await pool.query(
        `
          INSERT INTO group_budget_alert_logs (
            group_id,
            group_budget_id,
            threshold,
            sent_on,
            channel
          )
          VALUES ($1, $2, $3, CURRENT_DATE, 'in_app')
          ON CONFLICT (group_id, group_budget_id, threshold, sent_on, channel)
          DO NOTHING
          RETURNING group_budget_alert_log_id
        `,
        [groupId, usage.group_budget_id, threshold],
      );

      if (logRows.length === 0) {
        continue;
      }

      const members = await getGroupMembers(groupId);

      const title =
        threshold === 101
          ? "Ngân sách nhóm đã vượt mức"
          : "Ngân sách nhóm sắp vượt mức";

      const message =
        threshold === 101
          ? `Nhóm đã chi ${spentAmount.toLocaleString("vi-VN")}đ / ${limitAmount.toLocaleString("vi-VN")}đ.`
          : `Nhóm đã dùng ${usagePercent}% ngân sách.`;

      const created = await notificationService.createNotificationsBulk(
        members.map((member) => ({
          userId: member.user_id,
          type: "budget",
          title,
          message,
          metadata: {
            action: "group_budget_alert",
            groupId,
            groupBudgetId: usage.group_budget_id,
            threshold,
            usagePercent,
            spentAmount,
            limitAmount,
            month: usage.month,
          },
        })),
      );

      notifications.push(...created);
    }
  }

  return notifications;
}

async function handleGroupTransactionChanged(
  groupId,
  actorUserId,
  transaction,
  action,
) {
  try {
    await notifyGroupTransaction(groupId, actorUserId, transaction, action);
  } catch (err) {
    console.error("⚠️ notifyGroupTransaction error:", err);
  }

  try {
    const txDate = transaction.txDate || transaction.tx_date || new Date();
    await checkAndNotifyBudgetAlerts(groupId, txDate);
  } catch (err) {
    console.error("⚠️ checkAndNotifyBudgetAlerts error:", err);
  }
}

module.exports = {
  getGroupMembers,
  notifyGroupTransaction,
  checkAndNotifyBudgetAlerts,
  handleGroupTransactionChanged,
};
