const groupReminderService = require("../services/groupReminderService");

let timer = null;
let running = false;

async function runGroupReminderTick() {
  if (running) return;

  running = true;

  try {
    const result = await groupReminderService.processDueGroupReminders({
      limit: 100,
    });

    if (result.reminderCount > 0 || result.notificationCount > 0) {
      console.log(
        `[groupReminderScheduler] processed reminders=${result.reminderCount}, notifications=${result.notificationCount}`,
      );
    }
  } catch (err) {
    console.error("[groupReminderScheduler] error:", err.message);
  } finally {
    running = false;
  }
}

function startGroupReminderScheduler(options = {}) {
  const intervalMs = Number(options.intervalMs || process.env.GROUP_REMINDER_INTERVAL_MS || 60000);

  if (timer) return timer;

  const safeIntervalMs = Number.isFinite(intervalMs) && intervalMs >= 10000 ? intervalMs : 60000;

  // Chạy trễ vài giây để server kịp mount routes/socket trước.
  setTimeout(runGroupReminderTick, 5000);
  timer = setInterval(runGroupReminderTick, safeIntervalMs);

  console.log(`[groupReminderScheduler] started, interval=${safeIntervalMs}ms`);
  return timer;
}

function stopGroupReminderScheduler() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  console.log("[groupReminderScheduler] stopped");
}

module.exports = {
  startGroupReminderScheduler,
  stopGroupReminderScheduler,
  runGroupReminderTick,
};
