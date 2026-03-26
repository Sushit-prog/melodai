/**
 * Notification Controller
 * @module controllers/notificationController
 */

const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get all notifications for current user
 * @route GET /api/notifications
 * @access Private
 */
const getNotifications = asyncHandler(async (req, res, next) => {
  const userId = req.userId;
  let page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.limit) || 20;
  const unreadOnly = req.query.unread === 'true';

  if (limit > 100) limit = 100;
  if (page < 1) page = 1;

  const query = { userId };
  if (unreadOnly) {
    query.read = false;
  }

  const notifications = await Notification.find(query)
    .populate('payload.actorId', 'username displayName avatar')
    .populate('payload.trackId', 'title')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.getUnreadCount(userId);

  res.json({
    success: true,
    notifications,
    unreadCount,
    totalPages: Math.ceil(total / limit),
  });
});

/**
 * Mark single notification as read
 * @route PATCH /api/notifications/:id/read
 * @access Private
 */
const markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.userId,
  });

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  notification.read = true;
  await notification.save();

  await notification.populate('payload.actorId', 'username displayName avatar');

  res.json({
    success: true,
    notification,
  });
});

/**
 * Mark all notifications as read
 * @route PATCH /api/notifications/read-all
 * @access Private
 */
const markAllAsRead = asyncHandler(async (req, res, next) => {
  const result = await Notification.updateMany(
    { userId: req.userId, read: false },
    { $set: { read: true } }
  );

  res.json({
    success: true,
    count: result.modifiedCount,
  });
});

/**
 * Delete single notification
 * @route DELETE /api/notifications/:id
 * @access Private
 */
const deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.userId,
  });

  if (!notification) {
    throw ApiError.notFound('Notification not found');
  }

  await Notification.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Notification deleted',
  });
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
