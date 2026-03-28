import api, { uploadApi } from './axios';

export const tracksApi = {
  getTracks: async (params = {}) => {
    const response = await api.get('/tracks', { params });
    return response.data;
  },

  getTrack: async (id) => {
    const response = await api.get(`/tracks/${id}`);
    return response.data;
  },

  getUserTracks: async (userId, params = {}) => {
    const response = await api.get(`/tracks/user/${userId}`, { params });
    return response.data;
  },

  createTrack: async (data) => {
    const response = await api.post('/tracks', data);
    return response.data;
  },

  updateTrack: async (id, data) => {
    const response = await api.put(`/tracks/${id}`, data);
    return response.data;
  },

  deleteTrack: async (id) => {
    const response = await api.delete(`/tracks/${id}`);
    return response.data;
  },

  uploadTrack: async (formData, onProgress) => {
    const response = await uploadApi.post('/tracks/upload', formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return response.data;
  },

  getPresignedUrl: async (fileName, mimeType, folder = 'tracks') => {
    const response = await api.post('/tracks/presign', { fileName, mimeType, folder });
    return response.data;
  },

  addCollaborator: async (trackId, userId, role = 'artist') => {
    const response = await api.post(`/tracks/${trackId}/collaborators`, { userId, role });
    return response.data;
  },

  removeCollaborator: async (trackId, userId) => {
    const response = await api.delete(`/tracks/${trackId}/collaborators/${userId}`);
    return response.data;
  },

  getVersions: async (trackId) => {
    const response = await api.get(`/tracks/${trackId}/versions`);
    return response.data;
  },

  createVersion: async (trackId, formData, onProgress) => {
    const response = await uploadApi.post(`/tracks/${trackId}/versions`, formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return response.data;
  },
};
