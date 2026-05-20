const groupReminderService = require("../services/groupReminderService");

exports.getGroupReminders = async (req, res, next) => {
  try {
    const data = await groupReminderService.getGroupReminders(
      Number(req.params.groupId),
      {
        includeInactive: req.query.includeInactive,
      },
    );

    res.json({
      status: "success",
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.createGroupReminder = async (req, res, next) => {
  try {
    const data = await groupReminderService.createGroupReminder(
      Number(req.params.groupId),
      req.user.id,
      req.body,
    );

    res.status(201).json({
      status: "success",
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateGroupReminder = async (req, res, next) => {
  try {
    const data = await groupReminderService.updateGroupReminder(
      Number(req.params.groupId),
      Number(req.params.reminderId),
      req.body,
    );

    res.json({
      status: "success",
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.deactivateGroupReminder = async (req, res, next) => {
  try {
    const data = await groupReminderService.deactivateGroupReminder(
      Number(req.params.groupId),
      Number(req.params.reminderId),
    );

    res.json({
      status: "success",
      message: "Đã tắt nhắc nhở nhóm",
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.sendReminderNow = async (req, res, next) => {
  try {
    const data = await groupReminderService.sendReminderNow(
      Number(req.params.groupId),
      Number(req.params.reminderId),
      req.user.id,
    );

    res.json({
      status: "success",
      message: "Đã gửi nhắc nhở đến thành viên nhóm",
      data,
    });
  } catch (err) {
    next(err);
  }
};
