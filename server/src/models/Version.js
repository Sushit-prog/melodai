/**
 * Version Model
 * @module models/Version
 * @requires mongoose
 */

const mongoose = require('mongoose');

/**
 * Version Schema
 * @typedef {Object} VersionSchema
 * @property {mongoose.Schema.Types.ObjectId} trackId - Parent Track reference
 * @property {number} versionNumber - Version number (1, 2, 3...)
 * @property {string} url - Audio file URL for this version
 * @property {string} changelog - Description of changes
 * @property {mongoose.Schema.Types.ObjectId} uploadedBy - User who uploaded
 * @property {Date} createdAt - Creation timestamp
 */

const versionSchema = new mongoose.Schema({
  trackId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track',
    required: [true, 'Track ID is required'],
  },
  versionNumber: {
    type: Number,
    required: [true, 'Version number is required'],
    min: [1, 'Version number must be at least 1'],
  },
  url: {
    type: String,
    required: [true, 'Audio URL is required'],
  },
  changelog: {
    type: String,
    maxlength: [1000, 'Changelog cannot exceed 1000 characters'],
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required'],
  },
}, {
  timestamps: true,
});

/**
 * Ensure unique version number per track
 */
versionSchema.index({ trackId: 1, versionNumber: 1 }, { unique: true });

/**
 * Pre-save hook to auto-increment version number
 */
versionSchema.pre('save', async function(next) {
  if (this.isNew && !this.versionNumber) {
    const lastVersion = await this.constructor.findOne({ trackId: this.trackId })
      .sort({ versionNumber: -1 })
      .select('versionNumber');
    
    this.versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;
  }
  next();
});

module.exports = mongoose.model('Version', versionSchema);
