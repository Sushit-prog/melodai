/**
 * Socket Manager
 * Handles socket authentication, presence, and room management
 * @module socket/socketManager
 */

const jwt = require('jsonwebtoken');
const tokenService = require('../services/tokenService');
const User = require('../models/User');
const Track = require('../models/Track');
const EVENT = require('./events');

const trackPresence = new Map();

const typingTimers = new Map();

/**
 * Authenticate socket connection via JWT
 * @param {Object} socket - Socket.IO socket instance
 * @param {Function} next - Next callback
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.auth.accessToken;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = tokenService.verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('username displayName avatar');

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.user = user;
    socket.userId = user._id.toString();
    socket.username = user.username;
    socket.avatar = user.avatar;
    socket.currentTrackRoom = null;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'));
    }
    next(new Error('Authentication error: ' + error.message));
  }
};

/**
 * Join user's personal room for notifications
 * @param {Object} socket - Socket.IO socket instance
 * @param {string} userId - User ID
 */
const joinUserRoom = (socket, userId) => {
  socket.join(`user:${userId}`);
};

/**
 * Get presence list for a track
 * @param {string} trackId - Track ID
 * @returns {Array} Array of user presence objects
 */
const getPresenceList = (trackId) => {
  const presence = trackPresence.get(trackId);
  if (!presence) return [];
  return Array.from(presence).map(s => ({
    userId: s.userId,
    username: s.username,
    avatar: s.avatar,
    socketId: s.socketId,
  }));
};

/**
 * Add user to track room and presence
 * @param {Object} socket - Socket.IO socket instance
 * @param {string} trackId - Track ID
 * @param {Function} callback - Callback function
 */
const joinTrackRoom = async (socket, trackId, callback) => {
  try {
    const track = await Track.findById(trackId);

    if (!track) {
      return callback({ success: false, error: 'Track not found' });
    }

    const isOwner = track.userId.toString() === socket.userId;
    const isCollaborator = track.collaborators.some(c => c.userId.toString() === socket.userId);

    if (!track.isPublic && !isOwner && !isCollaborator) {
      return callback({ success: false, error: 'Access denied' });
    }

    if (socket.currentTrackRoom) {
      leaveTrackRoom(socket, socket.currentTrackRoom);
    }

    if (!trackPresence.has(trackId)) {
      trackPresence.set(trackId, new Set());
    }

    const presenceSet = trackPresence.get(trackId);
    presenceSet.add({
      userId: socket.userId,
      username: socket.username,
      avatar: socket.avatar,
      socketId: socket.id,
    });

    socket.join(`track:${trackId}`);
    socket.currentTrackRoom = trackId;

    const presence = getPresenceList(trackId);
    socket.to(`track:${trackId}`).emit(EVENT.PRESENCE_UPDATED, { presence });

    callback({ success: true, presence });
  } catch (error) {
    callback({ success: false, error: error.message });
  }
};

/**
 * Remove user from track room and presence
 * @param {Object} socket - Socket.IO socket instance
 * @param {string} trackId - Track ID
 */
const leaveTrackRoom = (socket, trackId) => {
  const presenceSet = trackPresence.get(trackId);
  if (presenceSet) {
    presenceSet.delete(socket.userId);
    if (presenceSet.size === 0) {
      trackPresence.delete(trackId);
    }
  }

  socket.leave(`track:${trackId}`);
  socket.currentTrackRoom = null;

  const presence = getPresenceList(trackId);
  socket.to(`track:${trackId}`).emit(EVENT.PRESENCE_UPDATED, { presence });
};

/**
 * Broadcast cursor position to track room
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Socket.IO socket instance
 * @param {string} trackId - Track ID
 * @param {number} position - Position in seconds
 */
const broadcastCursorUpdate = (io, socket, trackId, position) => {
  socket.to(`track:${trackId}`).emit(EVENT.CURSOR_UPDATE, {
    userId: socket.userId,
    username: socket.username,
    avatar: socket.avatar,
    position,
  });
};

/**
 * Broadcast typing status to track room
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Socket.IO socket instance
 * @param {string} trackId - Track ID
 * @param {boolean} isTyping - Whether user is typing
 */
const broadcastTyping = (io, socket, trackId, isTyping) => {
  clearTimeout(typingTimers.get(socket.id));

  socket.to(`track:${trackId}`).emit(EVENT.TYPING_COMMENT, {
    userId: socket.userId,
    username: socket.username,
    isTyping,
  });

  if (isTyping) {
    const timer = setTimeout(() => {
      socket.to(`track:${trackId}`).emit(EVENT.TYPING_COMMENT, {
        userId: socket.userId,
        username: socket.username,
        isTyping: false,
      });
      typingTimers.delete(socket.id);
    }, 5000);
    typingTimers.set(socket.id, timer);
  }
};

/**
 * Handle socket disconnection
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Socket.IO socket instance
 */
const handleDisconnect = (io, socket) => {
  if (socket.currentTrackRoom) {
    leaveTrackRoom(socket, socket.currentTrackRoom);
  }

  typingTimers.delete(socket.id);
};

/**
 * Setup socket event handlers
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Socket.IO socket instance
 */
const setupSocketHandlers = (io, socket) => {
  socket.on('join-track', (data, callback) => {
    if (!data || !data.trackId) {
      return callback({ success: false, error: 'trackId required' });
    }
    joinTrackRoom(socket, data.trackId, callback);
  });

  socket.on('leave-track', (data) => {
    if (data && data.trackId) {
      leaveTrackRoom(socket, data.trackId);
    }
  });

  socket.on('cursor-update', (data) => {
    if (data && data.trackId && typeof data.position === 'number') {
      broadcastCursorUpdate(io, socket, data.trackId, data.position);
    }
  });

  socket.on('typing-comment', (data) => {
    if (data && data.trackId && typeof data.isTyping === 'boolean') {
      broadcastTyping(io, socket, data.trackId, data.isTyping);
    }
  });

  socket.on('disconnect', () => {
    handleDisconnect(io, socket);
  });
};

module.exports = {
  authenticateSocket,
  joinUserRoom,
  joinTrackRoom,
  leaveTrackRoom,
  handleDisconnect,
  setupSocketHandlers,
  getPresenceList,
};
