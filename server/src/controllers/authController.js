/**
 * Authentication Controller
 * @module controllers/authController
 */

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const tokenService = require('../services/tokenService');

/**
 * Register new user
 * @route POST /api/auth/register
 * @access Public
 */
const register = asyncHandler(async (req, res, next) => {
  const { email, password, username, displayName } = req.body;

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw ApiError.conflict('Email already registered');
    }
    throw ApiError.conflict('Username already taken');
  }

  const user = await User.create({
    email,
    password,
    username,
    displayName: displayName || username,
  });

  const { accessToken, refreshToken } = await tokenService.generateTokens(user._id);

  res.status(201).json({
    success: true,
    data: {
      user,
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest('Please provide email and password');
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const { accessToken, refreshToken } = await tokenService.generateTokens(user._id);

  res.json({
    success: true,
    data: {
      user,
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
const logout = asyncHandler(async (req, res, next) => {
  const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];
  
  if (refreshToken) {
    await tokenService.removeRefreshToken(refreshToken);
  }

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * Refresh access token
 * @route POST /api/auth/refresh
 * @access Public
 */
const refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw ApiError.badRequest('Refresh token required');
  }

  const tokens = await tokenService.refreshAccessToken(refreshToken);

  res.json({
    success: true,
    data: tokens,
  });
});

/**
 * Get current user
 * @route GET /api/auth/me
 * @access Private
 */
const getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.userId);

  res.json({
    success: true,
    data: user,
  });
});

/**
 * Google OAuth - initiate
 * @route GET /api/auth/google
 * @access Public
 */
const googleAuth = asyncHandler(async (req, res, next) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CALLBACK_URL } = require('../config/env');
  
  if (!GOOGLE_CLIENT_ID) {
    throw ApiError.internal('Google OAuth not configured');
  }

  const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_CALLBACK_URL}&response_type=code&scope=profile email&access_type=offline`;
  
  res.json({
    success: true,
    data: { url: redirectUrl },
  });
});

/**
 * Google OAuth callback
 * @route GET /api/auth/google/callback
 * @access Public
 */
const googleCallback = asyncHandler(async (req, res, next) => {
  const { code } = req.query;
  
  if (!code) {
    throw ApiError.badRequest('Authorization code required');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenResponse.json();

  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  const googleUser = await userInfoResponse.json();

  let user = await User.findOne({ googleId: googleUser.id });

  if (!user) {
    user = await User.findOne({ email: googleUser.email });
    
    if (user) {
      user.googleId = googleUser.id;
      await user.save();
    } else {
      user = await User.create({
        email: googleUser.email,
        googleId: googleUser.id,
        username: googleUser.email.split('@')[0],
        displayName: googleUser.name,
        avatar: googleUser.picture,
      });
    }
  }

  const authTokens = await tokenService.generateTokens(user._id);

  const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${authTokens.accessToken}&refresh=${authTokens.refreshToken}`;
  res.redirect(redirectUrl);
});

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  googleAuth,
  googleCallback,
};
