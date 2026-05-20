const groupService = require("../services/groupService");
const groupMemberService = require("../services/groupMemberService");
const groupInvitationService = require("../services/groupInvitationService");

exports.createGroup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const group = await groupService.createGroup(userId, req.body);

    res.status(201).json({
      status: "success",
      data: group,
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyGroups = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const groups = await groupService.getMyGroups(userId);

    res.json({
      status: "success",
      data: groups,
    });
  } catch (err) {
    next(err);
  }
};

exports.getGroupDetail = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const groupId = Number(req.params.groupId);

    const group = await groupService.getGroupById(groupId, userId);

    res.json({
      status: "success",
      data: group,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateGroup = async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);

    const group = await groupService.updateGroup(groupId, req.body);

    res.json({
      status: "success",
      data: group,
    });
  } catch (err) {
    next(err);
  }
};

exports.archiveGroup = async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);

    const group = await groupService.archiveGroup(groupId);

    res.json({
      status: "success",
      message: "Lưu trữ nhóm thành công",
      data: group,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteGroup = async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);

    await groupService.deleteGroup(groupId);

    res.json({
      status: "success",
      message: "Xóa nhóm thành công",
    });
  } catch (err) {
    next(err);
  }
};

exports.getGroupDashboard = async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);

    const dashboard = await groupService.getGroupDashboard(groupId);

    res.json({
      status: "success",
      data: dashboard,
    });
  } catch (err) {
    next(err);
  }
};

exports.getGroupMembers = async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);

    const members = await groupMemberService.getMembersByGroup(groupId);

    res.json({
      status: "success",
      data: members,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateMyNickname = async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = req.user.id;

    const member = await groupMemberService.updateMyNickname(
      groupId,
      userId,
      req.body.nickname,
    );

    res.json({
      status: "success",
      message: "Cập nhật biệt danh thành công",
      data: member,
    });
  } catch (err) {
    next(err);
  }
};

exports.transferOwnership = async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);
    const currentOwnerId = req.user.id;
    const newOwnerId = req.params.userId;

    const member = await groupMemberService.transferOwnership(
      groupId,
      currentOwnerId,
      newOwnerId,
    );

    res.json({
      status: "success",
      message: "Chuyển quyền owner thành công",
      data: member,
    });
  } catch (err) {
    next(err);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);
    const targetUserId = req.params.userId;

    await groupMemberService.removeMember(groupId, targetUserId);

    res.json({
      status: "success",
      message: "Xóa thành viên khỏi nhóm thành công",
    });
  } catch (err) {
    next(err);
  }
};

exports.leaveGroup = async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = req.user.id;

    await groupMemberService.leaveGroup(groupId, userId);

    res.json({
      status: "success",
      message: "Rời nhóm thành công",
    });
  } catch (err) {
    next(err);
  }
};

exports.createInvitation = async (req, res, next) => {
  try {
    const groupId = Number(req.params.groupId);
    const invitedBy = req.user.id;

    const invitation = await groupInvitationService.createInvitation(
      groupId,
      invitedBy,
      req.body,
    );

    res.status(201).json({
      status: "success",
      message: "Tạo lời mời thành công",
      data: invitation,
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyInvitations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const invitations = await groupInvitationService.getMyInvitations(userId);

    res.json({
      status: "success",
      data: invitations,
    });
  } catch (err) {
    next(err);
  }
};

exports.acceptInvitation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const invitationId = Number(req.params.invitationId);

    const result = await groupInvitationService.acceptInvitation(
      invitationId,
      userId,
    );

    res.json({
      status: "success",
      message: "Chấp nhận lời mời thành công",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.declineInvitation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const invitationId = Number(req.params.invitationId);

    const result = await groupInvitationService.declineInvitation(
      invitationId,
      userId,
    );

    res.json({
      status: "success",
      message: "Từ chối lời mời thành công",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.cancelInvitation = async (req, res, next) => {
  try {
    const invitationId = Number(req.params.invitationId);

    const result = await groupInvitationService.cancelInvitation(invitationId);

    res.json({
      status: "success",
      message: "Hủy lời mời thành công",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
