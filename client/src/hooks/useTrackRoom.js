import { useEffect, useCallback, useState } from 'react';
import { getSocket } from '../socket/socket';

export const useTrackRoom = (trackId) => {
  const [presence, setPresence] = useState([]);
  const [isInRoom, setIsInRoom] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!trackId) return;

    const socket = getSocket();
    if (!socket) return;

    const handlePresenceUpdate = ({ presence: newPresence }) => {
      setPresence(newPresence || []);
    };

    socket.on('presence:updated', handlePresenceUpdate);

    socket.emit('join-track', { trackId }, (response) => {
      if (response.success) {
        setPresence(response.presence || []);
        setIsInRoom(true);
        setError(null);
      } else {
        setError(response.error);
        setIsInRoom(false);
      }
    });

    return () => {
      socket.off('presence:updated', handlePresenceUpdate);
      socket.emit('leave-track', { trackId });
      setIsInRoom(false);
    };
  }, [trackId]);

  const sendCursorUpdate = useCallback((position) => {
    const socket = getSocket();
    if (socket && isInRoom) {
      socket.emit('cursor-update', { trackId, position });
    }
  }, [trackId, isInRoom]);

  const sendTyping = useCallback((isTyping) => {
    const socket = getSocket();
    if (socket && isInRoom) {
      socket.emit('typing-comment', { trackId, isTyping });
    }
  }, [trackId, isInRoom]);

  return {
    presence,
    isInRoom,
    error,
    sendCursorUpdate,
    sendTyping,
  };
};

export default useTrackRoom;
