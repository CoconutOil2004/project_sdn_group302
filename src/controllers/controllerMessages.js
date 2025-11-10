const mongoose = require("mongoose");
const Message = require("../models/messages");
const User = require("../models/users");
const Club = require("../models/clubs");
const Event = require("../models/events");

const ALLOWED_TYPES = ["DIRECT", "USER_CLUB", "CLUB_BROADCAST", "EVENT"];
const MAX_USER_SUGGESTIONS = 100;

const createHttpError = (status, message) => {
  const err = new Error(message);
  err.statusCode = status;
  return err;
};

const getCurrentUserId = (req) => {
  const rawId = req.user && (req.user._id || req.user.id);
  if (!rawId || !mongoose.Types.ObjectId.isValid(rawId)) {
    throw createHttpError(401, "Không xác định được người dùng đăng nhập");
  }
  return new mongoose.Types.ObjectId(rawId);
};

const toObjectId = (value, fieldPath) => {
  if (!value) {
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw createHttpError(422, `Giá trị ${fieldPath} không hợp lệ`);
  }
  return new mongoose.Types.ObjectId(value);
};

const normalizeParticipants = (participantsInput = []) => {
  if (!Array.isArray(participantsInput) || participantsInput.length === 0) {
    throw createHttpError(422, "participants phải là mảng và không được rỗng");
  }

  return participantsInput.map((participant, idx) => {
    const normalized = {};

    if (participant.userId) {
      normalized.userId = toObjectId(participant.userId, `participants[${idx}].userId`);
    }
    if (participant.clubId) {
      normalized.clubId = toObjectId(participant.clubId, `participants[${idx}].clubId`);
    }
    if (participant.eventId) {
      normalized.eventId = toObjectId(participant.eventId, `participants[${idx}].eventId`);
    }

    if (!normalized.userId && !normalized.clubId && !normalized.eventId) {
      throw createHttpError(422, `participants[${idx}] phải chứa userId, clubId hoặc eventId`);
    }

    return normalized;
  });
};

const sanitizeAttachments = (attachmentsInput = []) => {
  if (!Array.isArray(attachmentsInput) || attachmentsInput.length === 0) {
    return [];
  }

  return attachmentsInput
    .filter((item) => item && typeof item.url === "string" && item.url.trim().length > 0)
    .map((item) => ({
      url: item.url.trim(),
      name: typeof item.name === "string" ? item.name.trim() : "",
      size:
        typeof item.size === "number" && Number.isFinite(item.size)
          ? item.size
          : undefined,
    }));
};

const buildThreadKey = (type, participants) => {
  const tokens = participants
    .map((participant) => {
      if (participant.userId) {
        return `user:${participant.userId.toString()}`;
      }
      if (participant.clubId) {
        return `club:${participant.clubId.toString()}`;
      }
      if (participant.eventId) {
        return `event:${participant.eventId.toString()}`;
      }
      return "unknown";
    })
    .sort();

  return `${type}:${tokens.join("|")}`;
};

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildUserSearchCondition = (search) => {
  if (!search || typeof search !== "string") {
    return null;
  }

  const trimmed = search.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const regex = new RegExp(escapeRegex(trimmed), "i");
    return {
      $or: [{ name: regex }, { email: regex }],
    };
  } catch (error) {
    return null;
  }
};

const populateMessageQuery = (query) =>
  query
    .populate("sender", "name avatar role")
    .populate("participants.userId", "name avatar role")
    .populate("participants.clubId", "name logo managerId")
    .populate("participants.eventId", "title clubId date");

const formatParticipant = (participant) => {
  if (!participant) {
    return null;
  }

  const formatted = {};

  if (participant.userId) {
    const user = participant.userId;
    formatted.user = user && user._id ? { _id: user._id, name: user.name, avatar: user.avatar || "", role: user.role } : { _id: participant.userId };
  }

  if (participant.clubId) {
    const club = participant.clubId;
    formatted.club = club && club._id ? { _id: club._id, name: club.name, logo: club.logo || "", managerId: club.managerId } : { _id: participant.clubId };
  }

  if (participant.eventId) {
    const event = participant.eventId;
    formatted.event = event && event._id ? { _id: event._id, title: event.title, clubId: event.clubId, date: event.date } : { _id: participant.eventId };
  }

  return formatted;
};

const formatParticipants = (participants = []) =>
  participants
    .map((participant) => formatParticipant(participant))
    .filter(Boolean);

const formatMessageDoc = (doc) => {
  if (!doc) {
    return null;
  }

  const message =
    typeof doc.toObject === "function"
      ? doc.toObject({ depopulate: false })
      : { ...doc };
  const formatted = {
    _id: message._id,
    threadKey: message.threadKey,
    type: message.type,
    content: message.content,
    attachments: (message.attachments || []).map((item) => ({
      url: item.url,
      name: item.name || "",
      size: item.size,
    })),
    meta: {
      isPinned: Boolean(message.meta && message.meta.isPinned),
      isSystem: Boolean(message.meta && message.meta.isSystem),
    },
    createdAt: message.createdAt,
    participants: formatParticipants(message.participants),
    readBy: (message.readBy || []).map((entry) => ({
      userId: entry.userId,
      readAt: entry.readAt,
    })),
  };

  if (message.sender) {
    formatted.sender =
      message.sender && message.sender._id
        ? {
            _id: message.sender._id,
            name: message.sender.name,
            avatar: message.sender.avatar || "",
            role: message.sender.role,
          }
        : {
            _id: message.sender,
          };
  }

  return formatted;
};

const isClubManager = (club, userId) =>
  club && club.managerId && club.managerId.equals(userId);

const isClubMember = (club, userId) =>
  club && Array.isArray(club.members) && club.members.some((member) => member.userId && member.userId.equals(userId));

const ensureThreadAccess = async ({ user, type, participants, action }) => {
  const userId = new mongoose.Types.ObjectId(user._id || user.id);
  const isAdmin = user.role === "admin";

  if (!ALLOWED_TYPES.includes(type)) {
    throw createHttpError(422, "Loại hội thoại không hợp lệ");
  }

  if (type === "DIRECT") {
    const userParticipants = participants.filter((participant) => participant.userId);

    if (userParticipants.length !== participants.length || userParticipants.length < 2) {
      throw createHttpError(422, "DIRECT thread yêu cầu ít nhất 2 userId");
    }

    const hasAccess = userParticipants.some((participant) => participant.userId.equals(userId));

    if (!isAdmin && !hasAccess) {
      throw createHttpError(403, "Bạn không có quyền truy cập cuộc hội thoại này");
    }

    return {};
  }

  if (type === "USER_CLUB") {
    const clubParticipant = participants.find((participant) => participant.clubId);
    const userParticipant = participants.find((participant) => participant.userId);

    if (!clubParticipant || !userParticipant) {
      throw createHttpError(422, "USER_CLUB thread yêu cầu userId và clubId");
    }

    const club = await Club.findById(clubParticipant.clubId).select("managerId members.userId");

    if (!club) {
      throw createHttpError(404, "Câu lạc bộ không tồn tại");
    }

    const isRequester = userParticipant.userId && userParticipant.userId.equals(userId);
    const manager = isClubManager(club, userId);

    if (!isAdmin && !isRequester && !manager) {
      throw createHttpError(403, "Bạn không có quyền truy cập hội thoại giữa thành viên và câu lạc bộ này");
    }

    return { club };
  }

  if (type === "CLUB_BROADCAST") {
    const clubParticipant = participants.find((participant) => participant.clubId);

    if (!clubParticipant) {
      throw createHttpError(422, "CLUB_BROADCAST thread yêu cầu clubId");
    }

    const club = await Club.findById(clubParticipant.clubId).select("managerId members.userId");

    if (!club) {
      throw createHttpError(404, "Câu lạc bộ không tồn tại");
    }

    const manager = isClubManager(club, userId);
    const member = isClubMember(club, userId);

    if (action === "create" || action === "pin") {
      if (!isAdmin && !manager) {
        throw createHttpError(403, "Chỉ quản trị câu lạc bộ hoặc admin được phép thực hiện thao tác này");
      }
    } else if (!isAdmin && !manager && !member) {
      throw createHttpError(403, "Bạn không thuộc câu lạc bộ này");
    }

    return { club };
  }

  if (type === "EVENT") {
    const eventParticipant = participants.find((participant) => participant.eventId);

    if (!eventParticipant) {
      throw createHttpError(422, "EVENT thread yêu cầu eventId");
    }

    const event = await Event.findById(eventParticipant.eventId).select("participants.userId clubId");

    if (!event) {
      throw createHttpError(404, "Sự kiện không tồn tại");
    }

    if (isAdmin) {
      return { event };
    }

    const participant = Array.isArray(event.participants)
      ? event.participants.some((item) => item.userId && item.userId.equals(userId))
      : false;

    let club;
    let manager = false;

    if (event.clubId) {
      club = await Club.findById(event.clubId).select("managerId members.userId");
      manager = isClubManager(club, userId);
    }

    if (!participant && !manager) {
      throw createHttpError(403, "Bạn không tham gia sự kiện này");
    }

    return { event, club };
  }

  return {};
};

const getThreadLatestMessage = async (threadKey) =>
  populateMessageQuery(Message.findOne({ threadKey }).sort({ createdAt: -1 }));

const createMessageDocument = async ({
  threadKey,
  type,
  participants,
  senderId,
  content,
  attachments,
  baseMeta = {},
  isSystem = false,
}) => {
  const message = new Message({
    threadKey,
    type,
    participants,
    sender: senderId,
    content,
    attachments,
    meta: {
      isPinned: Boolean(baseMeta.isPinned),
      isSystem: Boolean(isSystem || baseMeta.isSystem),
    },
    readBy: [
      {
        userId: senderId,
        readAt: new Date(),
      },
    ],
  });

  await message.save();

  return populateMessageQuery(Message.findById(message._id));
};

const handleErrorResponse = (res, error) => {
  const status = error.statusCode || 500;
  return res.status(status).json({
    success: false,
    error: error.message || "Lỗi máy chủ",
  });
};

const buildThreadSummary = ({ threadKey, type, participants, lastMessage, unreadCount = 0, messageCount }) => ({
  threadKey,
  type,
  participants: formatParticipants(participants),
  meta: {
    isPinned: Boolean(lastMessage && lastMessage.meta && lastMessage.meta.isPinned),
    isSystem: Boolean(lastMessage && lastMessage.meta && lastMessage.meta.isSystem),
  },
  lastMessage: formatMessageDoc(lastMessage),
  unreadCount,
  messageCount,
});

const buildThreadMatchConditions = async (user) => {
  const userId = new mongoose.Types.ObjectId(user._id || user.id);
  const isAdmin = user.role === "admin";

  if (isAdmin) {
    return {
      $or: [
        { type: "DIRECT" },
        { type: "USER_CLUB" },
        { type: "CLUB_BROADCAST" },
        { type: "EVENT" },
      ],
    };
  }

  const userDoc = await User.findById(userId).select("joinedClubs.clubId");
  const joinedClubIds = Array.isArray(userDoc && userDoc.joinedClubs)
    ? userDoc.joinedClubs
        .filter((item) => item.clubId)
        .map((item) => item.clubId)
    : [];

  const managedClubs = await Club.find({ managerId: userId }).select("_id");
  const managedClubIds = managedClubs.map((club) => club._id);

  const clubIds = [...new Set([...joinedClubIds.map((id) => id.toString()), ...managedClubIds.map((id) => id.toString())])].map((id) => new mongoose.Types.ObjectId(id));

  const eventDocs = await Event.find({
    $or: [
      { "participants.userId": userId },
      { clubId: { $in: clubIds } },
    ],
  }).select("_id");

  const eventIds = eventDocs.map((event) => event._id);

  const conditions = [
    { type: "DIRECT", "participants.userId": userId },
    {
      type: "USER_CLUB",
      $or: [
        { "participants.userId": userId },
        clubIds.length > 0 ? { "participants.clubId": { $in: clubIds } } : null,
      ].filter(Boolean),
    },
  ];

  if (clubIds.length > 0) {
    conditions.push({ type: "CLUB_BROADCAST", "participants.clubId": { $in: clubIds } });
  }

  if (eventIds.length > 0) {
    conditions.push({ type: "EVENT", "participants.eventId": { $in: eventIds } });
  }

  return { $or: conditions };
};

const createOrGetThread = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const sender = { _id: userId, role: req.user.role };

    const { type, participants: participantsInput, content, attachments: attachmentsInput, meta } = req.body || {};

    if (!type) {
      throw createHttpError(422, "type là bắt buộc");
    }

    const participants = normalizeParticipants(participantsInput);
    const attachments = sanitizeAttachments(attachmentsInput);

    await ensureThreadAccess({ user: sender, type, participants, action: "create" });

    const threadKey = buildThreadKey(type, participants);

    const existingThread = await Message.findOne({ threadKey }).sort({ createdAt: -1 });
    const baseMeta = existingThread && existingThread.meta ? existingThread.meta : {};

    let populatedMessage = null;

    let messageContent = content;
    let messageIsSystem = meta && meta.isSystem;
    let shouldCreateMessage = Boolean(content) || attachments.length > 0;

    if (!existingThread && !shouldCreateMessage) {
      const initiatorName = req.user && req.user.name ? req.user.name : "hệ thống";
      messageContent = `Cuộc trò chuyện được tạo bởi ${initiatorName}.`;
      messageIsSystem = true;
      shouldCreateMessage = true;
    }

    if (shouldCreateMessage) {
      populatedMessage = await createMessageDocument({
        threadKey,
        type,
        participants,
        senderId: userId,
        content: messageContent,
        attachments,
        baseMeta: baseMeta,
        isSystem: messageIsSystem,
      });
    }

    const latest = populatedMessage || (await getThreadLatestMessage(threadKey));

    if (!latest) {
      throw createHttpError(500, "Không thể khởi tạo hội thoại");
    }

    const response = buildThreadSummary({
      threadKey,
      type,
      participants: latest.participants,
      lastMessage: latest,
      unreadCount: 0,
    });

    return res.status(populatedMessage && !existingThread ? 201 : 200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const sendMessage = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const sender = { _id: userId, role: req.user.role };
    const { threadKey } = req.params;
    const { content, attachments: attachmentsInput, meta } = req.body || {};

    if (!threadKey) {
      throw createHttpError(422, "threadKey là bắt buộc");
    }

    if (!content && (!Array.isArray(attachmentsInput) || attachmentsInput.length === 0)) {
      throw createHttpError(422, "Tin nhắn phải có nội dung hoặc tệp đính kèm");
    }

    const thread = await getThreadLatestMessage(threadKey);

    if (!thread) {
      throw createHttpError(404, "Không tìm thấy hội thoại");
    }

    await ensureThreadAccess({ user: sender, type: thread.type, participants: thread.participants, action: "send" });

    const attachments = sanitizeAttachments(attachmentsInput);

    const newMessage = await createMessageDocument({
      threadKey,
      type: thread.type,
      participants: thread.participants.map((participant) => ({
        userId: participant.userId && participant.userId._id ? participant.userId._id : participant.userId,
        clubId: participant.clubId && participant.clubId._id ? participant.clubId._id : participant.clubId,
        eventId: participant.eventId && participant.eventId._id ? participant.eventId._id : participant.eventId,
      })),
      senderId: userId,
      content,
      attachments,
      baseMeta: thread.meta,
      isSystem: meta && meta.isSystem,
    });

    const formattedMessage = formatMessageDoc(newMessage);

    return res.status(201).json({
      success: true,
      data: formattedMessage,
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const getThreadMessages = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const currentUser = { _id: userId, role: req.user.role };
    const { threadKey } = req.params;
    const { page: pageParam, limit: limitParam } = req.query;

    if (!threadKey) {
      throw createHttpError(422, "threadKey là bắt buộc");
    }

    const page = Number.parseInt(pageParam, 10) > 0 ? Number.parseInt(pageParam, 10) : 1;
    const limit = Number.parseInt(limitParam, 10) > 0 ? Number.parseInt(limitParam, 10) : 20;
    const skip = (page - 1) * limit;

    const thread = await getThreadLatestMessage(threadKey);

    if (!thread) {
      throw createHttpError(404, "Không tìm thấy hội thoại");
    }

    await ensureThreadAccess({ user: currentUser, type: thread.type, participants: thread.participants, action: "read" });

    const messages = await populateMessageQuery(
      Message.find({ threadKey })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    );

    const total = await Message.countDocuments({ threadKey });

    const formattedMessages = messages.map((message) => formatMessageDoc(message));

    return res.status(200).json({
      success: true,
      data: {
        threadKey,
        type: thread.type,
        participants: formatParticipants(thread.participants),
        pagination: {
          page,
          limit,
          total,
          totalPages: total > 0 ? Math.ceil(total / limit) : 0,
        },
        items: formattedMessages,
      },
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const listThreads = async (req, res) => {
  try {
    const user = req.user;
    const userId = getCurrentUserId(req);
    const { page: pageParam, limit: limitParam, type } = req.query;

    const page = Number.parseInt(pageParam, 10) > 0 ? Number.parseInt(pageParam, 10) : 1;
    const limit = Number.parseInt(limitParam, 10) > 0 ? Number.parseInt(limitParam, 10) : 20;
    const skip = (page - 1) * limit;

    const baseMatch = await buildThreadMatchConditions({ ...user, _id: userId });

    if (type && ALLOWED_TYPES.includes(type)) {
      baseMatch.$and = baseMatch.$and || [];
      baseMatch.$and.push({ type });
    }

    const pipeline = [
      { $match: baseMatch },
      {
        $addFields: {
          readUserIds: {
            $map: {
              input: "$readBy",
              as: "entry",
              in: "$$entry.userId",
            },
          },
        },
      },
      {
        $addFields: {
          isRead: {
            $in: [userId, "$readUserIds"],
          },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$threadKey",
          type: { $first: "$type" },
          participants: { $first: "$participants" },
          meta: { $first: "$meta" },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [{ $eq: ["$isRead", true] }, 0, 1],
            },
          },
          messageCount: { $sum: 1 },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
      {
        $facet: {
          items: [
            { $skip: skip },
            { $limit: limit },
          ],
          total: [{ $count: "count" }],
        },
      },
      {
        $project: {
          items: 1,
          total: {
            $cond: [
              { $gt: [{ $size: "$total" }, 0] },
              { $arrayElemAt: ["$total.count", 0] },
              0,
            ],
          },
        },
      },
    ];

    const aggregateResult = await Message.aggregate(pipeline);
    const items = (aggregateResult[0] && aggregateResult[0].items) || [];
    const total = (aggregateResult[0] && aggregateResult[0].total) || 0;

    await Message.populate(items, [
      { path: "participants.userId", select: "name avatar role" },
      { path: "participants.clubId", select: "name logo managerId" },
      { path: "participants.eventId", select: "title clubId date" },
      { path: "lastMessage.sender", select: "name avatar role" },
      { path: "lastMessage.participants.userId", select: "name avatar role" },
      { path: "lastMessage.participants.clubId", select: "name logo managerId" },
      { path: "lastMessage.participants.eventId", select: "title clubId date" },
    ]);

    const formattedThreads = items.map((item) =>
      buildThreadSummary({
        threadKey: item._id,
        type: item.type,
        participants: item.participants,
        lastMessage: item.lastMessage,
        unreadCount: item.unreadCount,
        messageCount: item.messageCount,
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        pagination: {
          page,
          limit,
          total,
          totalPages: total > 0 ? Math.ceil(total / limit) : 0,
        },
        items: formattedThreads,
      },
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const listAvailableUsers = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { search, limit: limitParam } = req.query;

    const searchCondition = buildUserSearchCondition(search);
    const limit = Number.parseInt(limitParam, 10) > 0 ? Number.parseInt(limitParam, 10) : 50;
    const normalizedLimit = Math.min(limit, MAX_USER_SUGGESTIONS);

    const match = {
      _id: { $ne: currentUserId },
      status: { $ne: "blocked" },
    };

    if (searchCondition) {
      match.$or = searchCondition.$or;
    }

    const users = await User.find(match)
      .select("_id name email avatar role")
      .sort({ name: 1 })
      .limit(normalizedLimit);

    return res.status(200).json({
      success: true,
      data: users.map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || "",
        role: user.role,
      })),
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const markRead = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const currentUser = { _id: userId, role: req.user.role };
    const { threadKey } = req.params;

    if (!threadKey) {
      throw createHttpError(422, "threadKey là bắt buộc");
    }

    const thread = await getThreadLatestMessage(threadKey);

    if (!thread) {
      throw createHttpError(404, "Không tìm thấy hội thoại");
    }

    await ensureThreadAccess({ user: currentUser, type: thread.type, participants: thread.participants, action: "read" });

    const result = await Message.updateMany(
      {
        threadKey,
        "readBy.userId": { $ne: userId },
      },
      {
        $push: {
          readBy: {
            userId,
            readAt: new Date(),
          },
        },
      }
    );

    return res.status(200).json({
      success: true,
      data: {
        threadKey,
        updatedCount: result.modifiedCount || 0,
      },
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const updatePinStatus = async (req, res, shouldPin) => {
  try {
    const userId = getCurrentUserId(req);
    const currentUser = { _id: userId, role: req.user.role };
    const { threadKey } = req.params;

    if (!threadKey) {
      throw createHttpError(422, "threadKey là bắt buộc");
    }

    const thread = await getThreadLatestMessage(threadKey);

    if (!thread) {
      throw createHttpError(404, "Không tìm thấy hội thoại");
    }

    await ensureThreadAccess({
      user: currentUser,
      type: thread.type,
      participants: thread.participants,
      action: shouldPin ? "pin" : "read",
    });

    await Message.updateMany(
      { threadKey },
      { $set: { "meta.isPinned": shouldPin } }
    );

    return res.status(200).json({
      success: true,
      data: {
        threadKey,
        meta: {
          isPinned: shouldPin,
        },
      },
    });
  } catch (error) {
    return handleErrorResponse(res, error);
  }
};

const pin = (req, res) => updatePinStatus(req, res, true);

const unpin = (req, res) => updatePinStatus(req, res, false);

module.exports = {
  createOrGetThread,
  sendMessage,
  getThreadMessages,
  listThreads,
  markRead,
  pin,
  unpin,
  listAvailableUsers,
};