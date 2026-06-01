const groupContributionService = require("../services/groupContributionService");

exports.getPlans = async (req, res, next) => {
  try {
    const data = await groupContributionService.getPlans(
      Number(req.params.groupId),
      {
        status: req.query.status,
      },
    );

    res.json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

exports.createPlan = async (req, res, next) => {
  try {
    const data = await groupContributionService.createPlan(
      Number(req.params.groupId),
      req.user.id,
      req.body,
    );

    res.status(201).json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

exports.getPlanDetail = async (req, res, next) => {
  try {
    const data = await groupContributionService.getPlanDetail(
      Number(req.params.groupId),
      Number(req.params.planId),
    );

    res.json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

exports.updatePlan = async (req, res, next) => {
  try {
    const data = await groupContributionService.updatePlan(
      Number(req.params.groupId),
      Number(req.params.planId),
      req.body,
    );

    res.json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

exports.upsertAssignments = async (req, res, next) => {
  try {
    const data = await groupContributionService.upsertAssignments(
      Number(req.params.groupId),
      Number(req.params.planId),
      req.body.assignments,
    );

    res.json({
      status: "success",
      message: "Cập nhật phân bổ đóng góp thành công",
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.recordContribution = async (req, res, next) => {
  try {
    const data = await groupContributionService.recordContribution(
      Number(req.params.groupId),
      req.user.id,
      req.body,
    );

    res.status(201).json({
      status: "success",
      message: "Ghi nhận đóng góp thành công",
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.reverseContribution = async (req, res, next) => {
  try {
    const data = await groupContributionService.reverseContribution(
      Number(req.params.groupId),
      Number(req.params.contributionId),
      req.user.id,
      req.body,
    );

    res.json({
      status: "success",
      message: "Hoàn tác đóng góp thành công",
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.getContributions = async (req, res, next) => {
  try {
    const data = await groupContributionService.getContributions(
      Number(req.params.groupId),
      {
        planId: req.query.planId,
        userId: req.query.userId,
        status: req.query.status,
      },
    );

    res.json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};

exports.getProgress = async (req, res, next) => {
  try {
    const data = await groupContributionService.getProgress(
      Number(req.params.groupId),
    );

    res.json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};
