/**
 * Notification Model
 * @module models/Notification
 * @requires mongoose
 */

const mongoose = require('mongoose');

/**
 * Notification Types
 * @typedef {('comment'|'invite'|'version'|'collab'|'like'|'follow')} NotificationType
 */

/**
 * Notification Schema
 * @typedef {Object} NotificationSchema
 * @property {mongoose.Schema.Types.ObjectId} userId - Target user
 * @property {NotificationType} type - Notification type
 * @property {Object} payload - Type-specific data
 * @property {boolean} read - Read status
 * @property {Date} createdAt - Creation timestamp
 */

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  type: {
    type: String,
    enum: ['comment', 'invite', 'version', 'collab', 'like', 'follow'],
    required: [true, 'Notification type is required'],
  },
  payload: {
    typeId: mongoose.Schema.Types.ObjectId,
    type: String,
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: String,
    trackTitle: String,
    trackId: { type: mongoose.Schema.Types.ObjectId, ref: 'Track' },
    message: String,
  },
  read: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

/**
 * Index for efficient querying
 */
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

/**
 * Static method to create notification
 * @static
 * @async
 */
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  return notification.populate('payload.actorId', 'username displayName avatar');
};

/**
 * Mark as read
 * @instance
 */
notificationSchema.methods.markAsRead = async function() {
  this.read = true;
  return this.save();
};

/**
 * Static to get unread count
 * @static
 */
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ userId, read: false });
};

module.exports = mongoose.model('Notification', notificationSchema);
