const groupChatService = require("../services/groupChatService");

function getGroupRoom(groupId) {
  return `group:${groupId}`;
}

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

    const io = req.app.get("io");
    if (io) {
      io.to(getGroupRoom(groupId)).emit("group:message:new", message);
      io.to(getGroupRoom(groupId)).emit("group:stop_typing", {
        groupId,
        userId,
        isTyping: false,
      });
    }

    res.status(201).json({
      status: "success",
      data: message,
    });
  } catch (err) {
    next(err);
  }
};
