const express = require("express");
const auth = require("../middlewares/authMiddleware");
const groupChatController = require("../controllers/groupChatController");
const { requireGroupMember } = require("../middlewares/groupAccessMiddleware");

const router = express.Router();

router.use(auth);

router.get(
  "/:groupId/messages",
  requireGroupMember,
  groupChatController.getGroupMessages,
);

router.post(
  "/:groupId/messages",
  requireGroupMember,
  groupChatController.createGroupMessage,
);

module.exports = router;
