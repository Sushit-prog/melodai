/**
 * Track Model
 * @module models/Track
 * @requires mongoose
 */

const mongoose = require('mongoose');

/**
 * Collaborator Schema (subdocument)
 * @typedef {Object} CollaboratorSchema
 * @property {mongoose.Schema.Types.ObjectId} userId - Reference to User
 * @property {string} role - Role (producer/mixer/engineer/artist)
 */

const collaboratorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['producer', 'mixer', 'engineer', 'artist', 'composer'],
    default: 'artist',
  },
}, { _id: false });

/**
 * AI Analysis Schema (subdocument)
 * @typedef {Object} AIAnalysisSchema
 * @property {string} mood - Detected mood
 * @property {string[]} detectedGenres - Detected genres
 * @property {number} energy - Energy level (0-1)
 * @property {Object} bpm - BPM detection
 * @property {string} key - Musical key
 */

const aiAnalysisSchema = new mongoose.Schema({
  mood: { type: String },
  detectedGenres: [String],
  energy: { type: Number, min: 0, max: 1 },
  bpm: { type: Number },
  key: { type: String },
  instrumentation: [String],
  tempoCurve: [Number],
}, { _id: false });

/**
 * Track Schema
 * @typedef {Object} TrackSchema
 * @property {string} title - Track title
 * @property {string} description - Track description
 * @property {mongoose.Schema.Types.ObjectId} userId - Owner User reference
 * @property {CollaboratorSchema[]} collaborators - Collaborators array
 * @property {string} url - Audio file URL
 * @property {number[]} waveformData - Waveform visualization data
 * @property {number} bpm - Beats per minute
 * @property {string} key - Musical key
 * @property {string} genre - Primary genre
 * @property {number} duration - Duration in seconds
 * @property {string[]} tags - Searchable tags
 * @property {AIAnalysisSchema} aiAnalysis - AI analysis results
 * @property {mongoose.Schema.Types.ObjectId[]} versions - Version references
 * @property {boolean} isPublic - Visibility flag
 * @property {number} plays - Play count
 * @property {Date} createdAt - Creation timestamp
 */

const trackSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Track title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  collaborators: [collaboratorSchema],
  url: {
    type: String,
    required: true,
  },
  waveformData: {
    type: [Number],
    default: [],
  },
  bpm: {
    type: Number,
    min: [20, 'BPM must be at least 20'],
    max: [300, 'BPM cannot exceed 300'],
  },
  key: {
    type: String,
    enum: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 
           'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
           'N/A'],
    default: 'N/A',
  },
  genre: {
    type: String,
    trim: true,
  },
  duration: {
    type: Number,
    min: 0,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  aiAnalysis: {
    type: aiAnalysisSchema,
    default: {},
  },
  versions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Version',
  }],
  isPublic: {
    type: Boolean,
    default: true,
  },
  plays: {
    type: Number,
    default: 0,
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  processingError: {
    type: String,
    default: null,
  },
  fileKey: {
    type: String,
  },
}, {
  timestamps: true,
});

/**
 * Virtual for getting collaborator IDs
 */
trackSchema.virtual('collaboratorIds', {
  ref: 'User',
  localField: 'collaborators.userId',
  foreignField: '_id',
});

/**
 * Check if user is owner or collaborator
 * @param {mongoose.Schema.Types.ObjectId} userId
 * @returns {boolean}
 */
trackSchema.methods.isAccessibleBy = function(userId) {
  if (this.isPublic) return true;
  
  const userIdStr = userId.toString();
  if (this.userId.toString() === userIdStr) return true;
  
  return this.collaborators.some(c => c.userId.toString() === userIdStr);
};

/**
 * Indexes for efficient querying
 */
trackSchema.index({ userId: 1, createdAt: -1 });
trackSchema.index({ isPublic: 1, createdAt: -1 });
trackSchema.index({ tags: 1 });
trackSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Track', trackSchema);
