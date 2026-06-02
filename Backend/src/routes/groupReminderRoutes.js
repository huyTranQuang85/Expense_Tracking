const express = require("express");
const auth = require("../middlewares/authMiddleware");
const groupReminderController = require("../controllers/groupReminderController");
const {
  requireGroupMember,
  requireGroupOwner,
} = require("../middlewares/groupAccessMiddleware");

const router = express.Router();

router.use(auth);

router.get(
  "/:groupId/reminders",
  requireGroupMember,
  groupReminderController.getGroupReminders,
);

router.post(
  "/:groupId/reminders",
  requireGroupOwner,
  groupReminderController.createGroupReminder,
);

router.patch(
  "/:groupId/reminders/:reminderId",
  requireGroupOwner,
  groupReminderController.updateGroupReminder,
);

router.patch(
  "/:groupId/reminders/:reminderId/deactivate",
  requireGroupOwner,
  groupReminderController.deactivateGroupReminder,
);

router.post(
  "/:groupId/reminders/:reminderId/send-now",
  requireGroupOwner,
  groupReminderController.sendReminderNow,
);

module.exports = router;
