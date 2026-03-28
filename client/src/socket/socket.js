import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let socket = null;

export const getSocket = () => socket;

export const initSocket = () => {
  const { token, isAuthenticated } = useAuthStore.getState();

  if (!isAuthenticated || !token) {
    console.log('Socket: No authenticated user, skipping connection');
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  socket = io({
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    if (error.message.includes('Token expired')) {
      useAuthStore.getState().logout();
    }
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const SOCKET_EVENTS = {
  UPLOAD_PROGRESS: 'upload:progress',
  UPLOAD_COMPLETE: 'upload:complete',
  UPLOAD_ERROR: 'upload:error',

  AI_ANALYSIS_COMPLETE: 'ai:analysis-complete',
  AI_ANALYSIS_FAILED: 'ai:analysis-failed',
  AI_FEEDBACK_READY: 'ai:feedback-ready',
  AI_GENRE_TAG_COMPLETE: 'ai:genre-tag-complete',

  NEW_COMMENT: 'new-comment',
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

export default socket;
