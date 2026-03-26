/**
 * User Model
 * @module models/User
 * @requires mongoose
 * @requires bcryptjs
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const SALT_WORK_FACTOR = 12;

/**
 * User Schema
 * @typedef {Object} UserSchema
 * @property {string} email - User's email (unique, required)
 * @property {string} password - Hashed password
 * @property {string} googleId - Google OAuth ID
 * @property {string} username - Unique username
 * @property {string} displayName - Display name
 * @property {string} bio - User biography
 * @property {string[]} genres - User's music genres
 * @property {string[]} instruments - User's instruments
 * @property {string} avatar - Avatar URL
 * @property {string} plan - Subscription plan (free/pro/team)
 * @property {string} refreshToken - JWT refresh token
 * @property {number[]} embedding - AI embedding vector
 * @property {Date} createdAt - Creation timestamp
 */

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId;
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: [50, 'Display name cannot exceed 50 characters'],
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
  },
  genres: [{
    type: String,
    trim: true,
  }],
  instruments: [{
    type: String,
    trim: true,
  }],
  avatar: {
    type: String,
    default: '',
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'team'],
    default: 'free',
  },
  refreshToken: {
    type: String,
    select: false,
  },
  embedding: {
    type: [Number],
    default: [],
  },
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

/**
 * Hash password before saving
 */
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare password method
 * @param {string} candidatePassword - Plain text password to compare
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Transform output to remove sensitive fields
 */
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  delete user.embedding;
  return user;
};

/**
 * Index for search functionality
 */
userSchema.index({ username: 'text', displayName: 'text' });

module.exports = mongoose.model('User', userSchema);
