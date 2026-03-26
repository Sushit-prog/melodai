/**
 * Token Service
 * Handles JWT generation and refresh
 * @module services/tokenService
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

/**
 * Generate access and refresh tokens for a user
 * @async
 * @function generateTokens
 * @param {mongoose.Schema.Types.ObjectId} userId
 * @returns {Promise<{accessToken: string, refreshToken: string}>}
 */
const generateTokens = async (userId) => {
  const accessToken = jwt.sign(
    { userId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRE }
  );

  const refreshToken = jwt.sign(
    { userId },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRE }
  );

  await User.findByIdAndUpdate(userId, { refreshToken });

  return { accessToken, refreshToken };
};

/**
 * Verify access token
 * @function verifyAccessToken
 * @param {string} token
 * @returns {Object} - Decoded token payload
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

/**
 * Verify refresh token
 * @function verifyRefreshToken
 * @param {string} token
 * @returns {Object} - Decoded token payload
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

/**
 * Refresh access token using refresh token
 * @async
 * @function refreshAccessToken
 * @param {string} refreshToken
 * @returns {Promise<{accessToken: string, refreshToken: string}>}
 */
const refreshAccessToken = async (refreshToken) => {
  const decoded = verifyRefreshToken(refreshToken);
  
  const user = await User.findById(decoded.userId);
  
  if (!user || user.refreshToken !== refreshToken) {
    throw new Error('Invalid refresh token');
  }

  return generateTokens(user._id);
};

/**
 * Remove refresh token (logout)
 * @async
 * @function removeRefreshToken
 * @param {string} refreshToken
 * @returns {Promise<void>}
 */
const removeRefreshToken = async (refreshToken) => {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    await User.findByIdAndUpdate(decoded.userId, { refreshToken: null });
  } catch (error) {
    console.warn('Logout: Invalid refresh token');
  }
};

module.exports = {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  refreshAccessToken,
  removeRefreshToken,
};
