import { useEffect, useState } from 'react';
import { useNotificationStore } from '../store/notificationStore';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X } from 'lucide-react';
import Spinner from './Spinner';

export const NotificationDropdown = ({ onClose }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, loadNotifications, markAsRead, markAllAsRead, isLoading } = useNotificationStore();

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    
    if (notification.payload?.trackId) {
      navigate(`/track/${notification.payload.trackId}`);
    }
    onClose();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'comment':
        return '💬';
      case 'collab':
        return '🤝';
      case 'version':
        return '📝';
      case 'like':
        return '❤️';
      default:
        return '🔔';
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="absolute right-0 mt-2 w-80 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <h3 className="text-sm font-semibold text-white">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <button
              key={notification._id}
              onClick={() => handleNotificationClick(notification)}
              className={`w-full px-4 py-3 text-left hover:bg-zinc-700 transition-colors border-b border-zinc-700 last:border-0 ${
                !notification.read ? 'bg-zinc-700/50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 line-clamp-2">
                    {notification.payload?.message || 'New notification'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {formatTime(notification.createdAt)}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5" />
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
