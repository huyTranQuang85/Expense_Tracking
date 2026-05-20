const groupChatService = require("../services/groupChatService");

exports.getGroupMessages = async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);

    const messages = await groupChatService.getMessagesByGroup(groupId, {
      limit: req.query.limit,
      beforeId: req.query.beforeId,
    });

    res.json({
      status: "success",
      data: messages,
    });
  } catch (err) {
    next(err);
  }
};

exports.createGroupMessage = async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = req.user.id;

    const message = await groupChatService.createMessage(
      groupId,
      userId,
      req.body,
    );

    res.status(201).json({
      status: "success",
      data: message,
    });
  } catch (err) {
    next(err);
  }
};
