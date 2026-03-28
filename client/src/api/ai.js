import api from './axios';

export const aiApi = {
  getTrackAnalysis: async (trackId) => {
    const response = await api.get(`/ai/track/${trackId}/analysis`);
    return response.data;
  },

  reanalyzeTrack: async (trackId) => {
    const response = await api.post(`/ai/track/${trackId}/reanalyze`);
    return response.data;
  },

  requestGenreTagging: async (trackId) => {
    const response = await api.post('/ai/genre-tag', { trackId });
    return response.data;
  },

  requestMixFeedback: async (trackId, question) => {
    const response = await api.post('/ai/mix-feedback', { trackId, question });
    return response.data;
  },
};

export const streamLyrics = async (params) => {
  const queryString = new URLSearchParams(params).toString();
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(`/api/ai/lyrics?${queryString}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to stream lyrics');
  }

  return response.body;
};
