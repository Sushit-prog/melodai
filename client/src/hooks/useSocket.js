import { useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useTrackStore } from '../store/trackStore';

let socket = null;

export const useSocket = () => {
  const { token, isAuthenticated } = useAuthStore();
  const { addNotification, markAllAsRead } = useNotificationStore();
  const { setUploadProgress, setUploadStatus, setUploadError, updateTrack } = useTrackStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      return;
    }

    if (socket?.connected) {
      socketRef.current = socket;
      return;
    }

    socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket error:', error.message);
    });

    socket.on('notification:new', (notification) => {
      addNotification(notification);
    });

    socket.on('upload:progress', ({ trackId, progress }) => {
      setUploadProgress(progress);
    });

    socket.on('upload:complete', ({ trackId, duration, waveformData, status }) => {
      setUploadStatus('complete');
      updateTrack(trackId, { duration, waveformData, processingStatus: status });
    });

    socket.on('upload:error', ({ trackId, error }) => {
      setUploadError(error);
    });

    socket.on('ai:analysis-complete', ({ trackId, analysis }) => {
      updateTrack(trackId, { aiAnalysis: analysis });
    });

    socket.on('ai:analysis-failed', ({ trackId, error }) => {
      console.error('AI analysis failed:', error);
      updateTrack(trackId, { processingStatus: 'failed', processingError: error });
    });

    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('notification:new');
        socket.off('upload:progress');
        socket.off('upload:complete');
        socket.off('upload:error');
        socket.off('ai:analysis-complete');
        socket.off('ai:analysis-failed');
      }
    };
  }, [isAuthenticated, token]);

  const emit = useCallback((event, data) => {
    if (socket?.connected) {
      socket.emit(event, data);
    }
  }, []);

  const on = useCallback((event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  }, []);

  const off = useCallback((event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected: socket?.connected || false,
    emit,
    on,
    off,
  };
};

export const getSocket = () => socket;

export default useSocket;
