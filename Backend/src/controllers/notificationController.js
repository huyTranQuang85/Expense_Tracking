const notificationService = require("../services/notificationService");

exports.getMyNotifications = async (req, res, next) => {
  try {
    const data = await notificationService.getMyNotifications(req.user.id, {
      limit: req.query.limit,
      onlyUnread: req.query.onlyUnread,
    });

    res.json({
      status: "success",
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const total = await notificationService.countUnread(req.user.id);

    res.json({
      status: "success",
      data: { total },
    });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const data = await notificationService.markAsRead(
      req.user.id,
      Number(req.params.notificationId),
    );

    res.json({
      status: "success",
      data,
    });
  } catch (err) {
    next(err);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);

    res.json({
      status: "success",
      message: "Đã đánh dấu tất cả thông báo là đã đọc",
    });
  } catch (err) {
    next(err);
  }
};
