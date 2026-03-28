import { create } from 'zustand';
import { notificationsApi } from '../api/notifications';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  setNotifications: (notifications) => {
    const unread = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount: unread });
  },

  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + 1,
  })),

  markAsRead: async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n._id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationsApi.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },

  removeNotification: (id) => set((state) => {
    const notification = state.notifications.find((n) => n._id === id);
    return {
      notifications: state.notifications.filter((n) => n._id !== id),
      unreadCount: notification && !notification.read
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount,
    };
  }),

  loadNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await notificationsApi.getNotifications({ limit: 50 });
      get().setNotifications(response.data);
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
