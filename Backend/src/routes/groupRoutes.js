const express = require("express");
const auth = require("../middlewares/authMiddleware");
const groupController = require("../controllers/groupController");
const {
  requireGroupMember,
  requireGroupOwner,
} = require("../middlewares/groupAccessMiddleware");

const router = express.Router();

router.use(auth);

// Group chính
router.post("/", groupController.createGroup);
router.get("/", groupController.getMyGroups);
router.get("/invitations/my", groupController.getMyInvitations);

router.post(
  "/invitations/:invitationId/accept",
  groupController.acceptInvitation,
);

router.post(
  "/invitations/:invitationId/decline",
  groupController.declineInvitation,
);

router.get("/:groupId", requireGroupMember, groupController.getGroupDetail);

router.patch("/:groupId", requireGroupOwner, groupController.updateGroup);

router.patch(
  "/:groupId/archive",
  requireGroupOwner,
  groupController.archiveGroup,
);

router.delete("/:groupId", requireGroupOwner, groupController.deleteGroup);

router.get(
  "/:groupId/dashboard",
  requireGroupMember,
  groupController.getGroupDashboard,
);

// Members
router.get(
  "/:groupId/members",
  requireGroupMember,
  groupController.getGroupMembers,
);

router.patch(
  "/:groupId/members/me/nickname",
  requireGroupMember,
  groupController.updateMyNickname,
);

router.patch(
  "/:groupId/members/:userId/transfer-owner",
  requireGroupOwner,
  groupController.transferOwnership,
);

router.delete(
  "/:groupId/members/:userId",
  requireGroupOwner,
  groupController.removeMember,
);

router.post("/:groupId/leave", requireGroupMember, groupController.leaveGroup);

// Invitations
router.post(
  "/:groupId/invitations",
  requireGroupOwner,
  groupController.createInvitation,
);

router.post(
  "/:groupId/invitations/:invitationId/cancel",
  requireGroupOwner,
  groupController.cancelInvitation,
);

module.exports = router;
