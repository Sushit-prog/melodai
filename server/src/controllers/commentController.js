/**
 * Comment Controller
 * @module controllers/commentController
 */

const Comment = require('../models/Comment');
const Track = require('../models/Track');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const EVENT = require('../socket/events');

/**
 * Create comment on track
 * @route POST /api/comments
 * @access Private
 */
const createComment = asyncHandler(async (req, res, next) => {
  const { trackId, text, timestamp = 0, parentId } = req.body;
  const io = req.app.get('io');

  const track = await Track.findById(trackId);
  if (!track) {
    throw ApiError.notFound('Track not found');
  }

  const isOwner = track.userId.toString() === req.userId.toString();
  const isCollaborator = track.collaborators.some(c => c.userId.toString() === req.userId.toString());

  if (!track.isPublic && !isOwner && !isCollaborator) {
    throw ApiError.forbidden('Cannot comment on private track');
  }

  if (parentId) {
    const parentComment = await Comment.findById(parentId);
    if (!parentComment || parentComment.trackId.toString() !== trackId) {
      throw ApiError.notFound('Parent comment not found');
    }
  }

  const comment = await Comment.create({
    trackId,
    userId: req.userId,
    text,
    timestamp,
    parentId,
  });

  await comment.populate('userId', 'username displayName avatar');

  if (io) {
    io.to(`track:${trackId}`).emit(EVENT.TRACK_COMMENT, { comment });
  }

  if (!isOwner || req.userId.toString() !== track.userId.toString()) {
    const notification = await Notification.createNotification({
      userId: track.userId,
      type: 'comment',
      payload: {
        typeId: comment._id,
        actorId: req.userId,
        actorName: req.user.displayName,
        trackTitle: track.title,
        trackId: track._id,
        message: `${req.user.displayName} commented on "${track.title}"`,
      },
    });

    if (io && track.userId.toString() !== req.userId.toString()) {
      io.to(`user:${track.userId.toString()}`).emit(EVENT.NOTIFICATION_NEW, {
        notification: notification.toObject(),
      });
    }
  }

  res.status(201).json({
    success: true,
    data: comment,
  });
});

/**
 * Get comments for track
 * @route GET /api/comments/:trackId
 * @access Private
 */
const getComments = asyncHandler(async (req, res, next) => {
  const trackId = req.params.trackId;
  let page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 50;
  
  if (limit > 100) limit = 100;
  if (page < 1) page = 1;

  const track = await Track.findById(trackId);
  if (!track) {
    throw ApiError.notFound('Track not found');
  }

  const isOwner = track.userId.toString() === req.userId?.toString();
  const isCollaborator = track.collaborators.some(c => c.userId.toString() === req.userId?.toString());

  if (!track.isPublic && !isOwner && !isCollaborator) {
    throw ApiError.forbidden('Cannot view comments on private track');
  }

  const comments = await Comment.find({ 
    trackId,
    parentId: null,
  })
    .populate('userId', 'username displayName avatar')
    .populate({
      path: 'replies',
      populate: {
        path: 'userId',
        select: 'username displayName avatar',
      },
    })
    .sort('timestamp')
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Comment.countDocuments({ 
    trackId,
    parentId: null,
  });

  res.json({
    success: true,
    data: comments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Update comment
 * @route PUT /api/comments/:id
 * @access Private (Comment owner only)
 */
const updateComment = asyncHandler(async (req, res, next) => {
  const { text } = req.body;
  const io = req.app.get('io');

  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    throw ApiError.notFound('Comment not found');
  }

  if (comment.userId.toString() !== req.userId.toString()) {
    throw ApiError.forbidden('You can only edit your own comments');
  }

  comment.text = text;
  await comment.save();
  await comment.populate('userId', 'username displayName avatar');

  if (io) {
    io.to(`track:${comment.trackId.toString()}`).emit(EVENT.TRACK_COMMENT, { comment });
  }

  res.json({
    success: true,
    data: comment,
  });
});

/**
 * Delete comment
 * @route DELETE /api/comments/:id
 * @access Private (Comment owner or Track owner)
 */
const deleteComment = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);
  const io = req.app.get('io');

  if (!comment) {
    throw ApiError.notFound('Comment not found');
  }

  const track = await Track.findById(comment.trackId);

  const isCommentOwner = comment.userId.toString() === req.userId.toString();
  const isTrackOwner = track.userId.toString() === req.userId.toString();

  if (!isCommentOwner && !isTrackOwner) {
    throw ApiError.forbidden('You can only delete your own comments or comments on your tracks');
  }

  const trackId = comment.trackId.toString();
  const commentId = comment._id.toString();

  await Comment.deleteMany({ parentId: req.params.id });
  await Comment.findByIdAndDelete(req.params.id);

  if (io) {
    io.to(`track:${trackId}`).emit(EVENT.COMMENT_DELETED, { commentId });
  }

  res.json({
    success: true,
    message: 'Comment deleted successfully',
  });
});

/**
 * Add reaction to comment
 * @route POST /api/comments/:id/reactions
 * @access Private
 */
const addReaction = asyncHandler(async (req, res, next) => {
  const { type } = req.body;
  const io = req.app.get('io');

  const validTypes = ['like', 'heart', 'laugh', 'wow', 'sad'];
  if (!validTypes.includes(type)) {
    throw ApiError.badRequest('Invalid reaction type');
  }

  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    throw ApiError.notFound('Comment not found');
  }

  const existingReactionIndex = comment.reactions.findIndex(
    r => r.userId.toString() === req.userId.toString()
  );

  let reactionAction = 'added';
  if (existingReactionIndex > -1) {
    if (comment.reactions[existingReactionIndex].type === type) {
      comment.reactions.splice(existingReactionIndex, 1);
      reactionAction = 'removed';
    } else {
      comment.reactions[existingReactionIndex].type = type;
      reactionAction = 'changed';
    }
  } else {
    comment.reactions.push({ userId: req.userId, type });
  }

  await comment.save();
  await comment.populate('userId', 'username displayName avatar');

  if (io) {
    io.to(`track:${comment.trackId.toString()}`).emit(EVENT.COMMENT_REACTION, {
      comment,
      reaction: { userId: req.userId.toString(), type, action: reactionAction },
    });
  }

  res.json({
    success: true,
    data: comment,
  });
});

/**
 * Remove reaction from comment
 * @route DELETE /api/comments/:id/reactions
 * @access Private
 */
const removeReaction = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    throw ApiError.notFound('Comment not found');
  }

  comment.reactions = comment.reactions.filter(
    r => r.userId.toString() !== req.userId.toString()
  );

  await comment.save();
  await comment.populate('userId', 'username displayName avatar');

  res.json({
    success: true,
    data: comment,
  });
});

/**
 * Get notifications
 * @route GET /api/comments/notifications
 * @access Private
 */
const getNotifications = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, unread } = req.query;

  const query = { userId: req.userId };
  if (unread === 'true') {
    query.read = false;
  }

  const notifications = await Notification.find(query)
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.getUnreadCount(req.userId);

  res.json({
    success: true,
    data: notifications,
    unreadCount,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Mark notification as read
 * @route PUT /api/comments/notifications/:id/read
 * @access Private
 */
const markNotificationRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.userId,
  });

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  await notification.markAsRead();

  res.json({
    success: true,
    data: notification,
  });
});

/**
 * Mark all notifications as read
 * @route PUT /api/comments/notifications/read-all
 * @access Private
 */
const markAllNotificationsRead = asyncHandler(async (req, res, next) => {
  await Notification.updateMany(
    { userId: req.userId, read: false },
    { $set: { read: true } }
  );

  res.json({
    success: true,
    message: 'All notifications marked as read',
  });
});

module.exports = {
  createComment,
  getComments,
  getTrackComments: getComments,
  updateComment,
  updateComment,
  deleteComment,
  addReaction,
  removeReaction,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
