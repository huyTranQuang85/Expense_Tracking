const express = require("express");
const auth = require("../middlewares/authMiddleware");
const groupContributionController = require("../controllers/groupContributionController");
const {
  requireGroupMember,
  requireGroupOwner,
} = require("../middlewares/groupAccessMiddleware");

const router = express.Router();

router.use(auth);

router.get(
  "/:groupId/contribution-plans",
  requireGroupMember,
  groupContributionController.getPlans,
);

router.post(
  "/:groupId/contribution-plans",
  requireGroupOwner,
  groupContributionController.createPlan,
);

router.get(
  "/:groupId/contribution-plans/:planId",
  requireGroupMember,
  groupContributionController.getPlanDetail,
);

router.patch(
  "/:groupId/contribution-plans/:planId",
  requireGroupOwner,
  groupContributionController.updatePlan,
);

router.put(
  "/:groupId/contribution-plans/:planId/assignments",
  requireGroupOwner,
  groupContributionController.upsertAssignments,
);

router.post(
  "/:groupId/contributions",
  requireGroupMember,
  groupContributionController.recordContribution,
);

router.post(
  "/:groupId/contributions/:contributionId/reverse",
  requireGroupMember,
  groupContributionController.reverseContribution,
);

router.get(
  "/:groupId/contributions",
  requireGroupMember,
  groupContributionController.getContributions,
);

router.get(
  "/:groupId/contribution-progress",
  requireGroupMember,
  groupContributionController.getProgress,
);

module.exports = router;
