/**
 * Socket Event Constants
 * @module socket/events
 */

module.exports = {
  UPLOAD_PROGRESS: 'upload:progress',
  UPLOAD_COMPLETE: 'upload:complete',
  UPLOAD_ERROR: 'upload:error',

  TRACK_COMMENT: 'new-comment',
  COMMENT_DELETED: 'comment-deleted',
  COMMENT_REACTION: 'comment-reaction',

  COLLAB_INVITE: 'collab:invite',
  COLLAB_JOIN: 'collab:join',
  COLLAB_LEAVE: 'collab:leave',

  CURSOR_UPDATE: 'cursor:update',
  TYPING_COMMENT: 'typing:comment',
  PRESENCE_UPDATED: 'presence:updated',

  NOTIFICATION_NEW: 'notification:new',
};
