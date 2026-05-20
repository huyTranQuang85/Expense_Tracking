const groupMemberService = require("../services/groupMemberService");

function getGroupIdFromReq(req) {
  return Number(req.params.groupId || req.params.id);
}

async function requireGroupMember(req, res, next) {
  try {
    const userId = req.user.id;
    const groupId = getGroupIdFromReq(req);

    if (!groupId || Number.isNaN(groupId)) {
      return res.status(400).json({
        status: "error",
        message: "groupId không hợp lệ",
      });
    }

    const isMember = await groupMemberService.isGroupMember(groupId, userId);

    if (!isMember) {
      return res.status(403).json({
        status: "error",
        message: "Bạn không có quyền truy cập nhóm này",
      });
    }

    req.groupId = groupId;
    next();
  } catch (err) {
    next(err);
  }
}

async function requireGroupOwner(req, res, next) {
  try {
    const userId = req.user.id;
    const groupId = getGroupIdFromReq(req);

    if (!groupId || Number.isNaN(groupId)) {
      return res.status(400).json({
        status: "error",
        message: "groupId không hợp lệ",
      });
    }

    const isOwner = await groupMemberService.isGroupOwner(groupId, userId);

    if (!isOwner) {
      return res.status(403).json({
        status: "error",
        message: "Chỉ owner của nhóm mới được thực hiện thao tác này",
      });
    }

    req.groupId = groupId;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  requireGroupMember,
  requireGroupOwner,
};
