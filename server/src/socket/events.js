/**
 * Socket Event Constants
 * @module socket/events
 */

module.exports = {
  UPLOAD_PROGRESS: 'upload:progress',
  UPLOAD_COMPLETE: 'upload:complete',
  UPLOAD_ERROR: 'upload:error',

  AI_ANALYSIS_COMPLETE: 'ai:analysis-complete',
  AI_ANALYSIS_FAILED: 'ai:analysis-failed',
  AI_FEEDBACK_READY: 'ai:feedback-ready',
  AI_GENRE_TAG_COMPLETE: 'ai:genre-tag-complete',

  TRACK_COMMENT: 'new-comment',
  COMMENT_DELETED: 'comment-deleted',
  COMMENT_REACTION: 'comment-reaction',

  COLLAB_INVITE: 'collab:invite',
  COLLAB_JOIN: 'collab:join',
  COLLAB_LEAVE: 'collab:leave',

  VERSION_CREATED: 'version:created',
  VERSION_ROLLBACK: 'version:rollback',

  CURSOR_UPDATE: 'cursor:update',
  TYPING_COMMENT: 'typing:comment',
  PRESENCE_UPDATED: 'presence:updated',

  NOTIFICATION_NEW: 'notification:new',
};
