import api from './axios';

export const commentsApi = {
  getComments: async (trackId, params = {}) => {
    const response = await api.get(`/comments/${trackId}`, { params });
    return response.data;
  },

  createComment: async (data) => {
    const response = await api.post('/comments', data);
    return response.data;
  },

  updateComment: async (id, text) => {
    const response = await api.put(`/comments/${id}`, { text });
    return response.data;
  },

  deleteComment: async (id) => {
    const response = await api.delete(`/comments/${id}`);
    return response.data;
  },

  addReaction: async (commentId, type) => {
    const response = await api.post(`/comments/${commentId}/reactions`, { type });
    return response.data;
  },

  removeReaction: async (commentId) => {
    const response = await api.delete(`/comments/${commentId}/reactions`);
    return response.data;
  },
};
