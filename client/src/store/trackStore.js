import { create } from 'zustand';

export const useTrackStore = create((set, get) => ({
  tracks: [],
  currentTrack: null,
  uploadProgress: 0,
  uploadStatus: 'idle',
  uploadError: null,
  versions: [],
  isLoading: false,
  error: null,

  setTracks: (tracks) => set({ tracks }),

  addTrack: (track) => set((state) => ({
    tracks: [track, ...state.tracks],
  })),

  setCurrentTrack: (track) => set({ currentTrack: track }),

  updateTrack: (id, updates) => set((state) => ({
    tracks: state.tracks.map((t) =>
      t._id === id ? { ...t, ...updates } : t
    ),
    currentTrack: state.currentTrack?._id === id
      ? { ...state.currentTrack, ...updates }
      : state.currentTrack,
  })),

  removeTrack: (id) => set((state) => ({
    tracks: state.tracks.filter((t) => t._id !== id),
    currentTrack: state.currentTrack?._id === id ? null : state.currentTrack,
  })),

  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  setUploadStatus: (status) => set({ uploadStatus: status }),

  setUploadError: (error) => set({ uploadError: error, uploadStatus: 'error' }),

  resetUpload: () => set({
    uploadProgress: 0,
    uploadStatus: 'idle',
    uploadError: null,
  }),

  setVersions: (versions) => set({ versions }),

  addVersion: (version) => set((state) => ({
    versions: [version, ...state.versions],
  })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),
}));
