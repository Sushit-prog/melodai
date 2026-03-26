/**
 * Comment Model
 * @module models/Comment
 * @requires mongoose
 */

const mongoose = require('mongoose');

/**
 * Reaction Schema (subdocument)
 * @typedef {Object} ReactionSchema
 * @property {mongoose.Schema.Types.ObjectId} userId - User who reacted
 * @property {string} type - Reaction type (like/heart/laugh)
 */

const reactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['like', 'heart', 'laugh', 'wow', 'sad'],
    required: true,
  },
}, { _id: false });

/**
 * Comment Schema
 * @typedef {Object} CommentSchema
 * @property {mongoose.Schema.Types.ObjectId} trackId - Parent Track reference
 * @property {mongoose.Schema.Types.ObjectId} userId - Comment author
 * @property {string} text - Comment text
 * @property {number} timestamp - Position in track (seconds)
 * @property {mongoose.Schema.Types.ObjectId} parentId - Reply target
 * @property {ReactionSchema[]} reactions - Reactions array
 * @property {Date} createdAt - Creation timestamp
 */

const commentSchema = new mongoose.Schema({
  trackId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track',
    required: [true, 'Track ID is required'],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  text: {
    type: String,
    required: [true, 'Comment text is required'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    trim: true,
  },
  timestamp: {
    type: Number,
    min: 0,
    default: 0,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
  },
  reactions: [reactionSchema],
}, {
  timestamps: true,
});

/**
 * Virtual for reply count
 */
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
});

/**
 * Get reaction counts
 */
commentSchema.methods.getReactionCounts = function() {
  const counts = {};
  this.reactions.forEach(r => {
    counts[r.type] = (counts[r.type] || 0) + 1;
  });
  return counts;
};

/**
 * Indexes
 */
commentSchema.index({ trackId: 1, timestamp: 1 });
commentSchema.index({ parentId: 1, createdAt: 1 });
commentSchema.index({ userId: 1 });

module.exports = mongoose.model('Comment', commentSchema);
