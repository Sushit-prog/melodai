/**
 * User Routes
 * @module routes/users
 */

const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const s3Service = require('../services/s3Service');

/**
 * Get user profile
 * @route GET /api/users/:id
 * @access Public
 */
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid user ID'),
], asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-refreshToken -embedding');
  
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  res.json({
    success: true,
    data: user,
  });
}));

/**
 * Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */
router.put('/profile', authenticate, [
  body('displayName').optional().isLength({ max: 50 }),
  body('bio').optional().isLength({ max: 500 }),
  body('genres').optional().isArray(),
  body('instruments').optional().isArray(),
], asyncHandler(async (req, res, next) => {
  const { displayName, bio, genres, instruments } = req.body;

  const user = await User.findByIdAndUpdate(
    req.userId,
    { displayName, bio, genres, instruments },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: user,
  });
}));

/**
 * Update avatar
 * @route PUT /api/users/avatar
 * @access Private
 */
router.put('/avatar', authenticate, asyncHandler(async (req, res, next) => {
  const { avatar } = req.body;

  if (!avatar) {
    throw ApiError.badRequest('Avatar URL is required');
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    { avatar },
    { new: true }
  );

  res.json({
    success: true,
    data: user,
  });
}));

/**
 * Get presigned URL for avatar upload
 * @route POST /api/users/avatar-presign
 * @access Private
 */
router.post('/avatar-presign', authenticate, [
  body('fileName').notEmpty().withMessage('File name is required'),
  body('mimeType').notEmpty().withMessage('MIME type is required'),
], asyncHandler(async (req, res, next) => {
  const { fileName, mimeType } = req.body;

  const result = await s3Service.getPresignedUploadUrl(fileName, mimeType, 'avatars');

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * Follow user
 * @route POST /api/users/:id/follow
 * @access Private
 */
router.post('/:id/follow', authenticate, [
  param('id').isMongoId().withMessage('Invalid user ID'),
], asyncHandler(async (req, res, next) => {
  const userToFollow = await User.findById(req.params.id);

  if (!userToFollow) {
    throw ApiError.notFound('User not found');
  }

  if (req.params.id === req.userId.toString()) {
    throw ApiError.badRequest('You cannot follow yourself');
  }

  const currentUser = await User.findById(req.userId);

  if (!currentUser.following) {
    currentUser.following = [];
  }

  if (currentUser.following.includes(req.params.id)) {
    throw ApiError.conflict('Already following this user');
  }

  currentUser.following.push(req.params.id);
  await currentUser.save();

  res.json({
    success: true,
    message: 'Now following user',
  });
}));

/**
 * Unfollow user
 * @route DELETE /api/users/:id/follow
 * @access Private
 */
router.delete('/:id/follow', authenticate, [
  param('id').isMongoId().withMessage('Invalid user ID'),
], asyncHandler(async (req, res, next) => {
  const currentUser = await User.findById(req.userId);

  currentUser.following = currentUser.following.filter(
    id => id.toString() !== req.params.id
  );
  await currentUser.save();

  res.json({
    success: true,
    message: 'Unfollowed user',
  });
}));

/**
 * Search users
 * @route GET /api/users/search
 * @access Public
 */
router.get('/search', asyncHandler(async (req, res, next) => {
  const { q, page = 1, limit = 20 } = req.query;

  if (!q) {
    throw ApiError.badRequest('Search query is required');
  }

  const users = await User.find({
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { displayName: { $regex: q, $options: 'i' } },
    ],
  })
    .select('-refreshToken -embedding')
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await User.countDocuments({
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { displayName: { $regex: q, $options: 'i' } },
    ],
  });

  res.json({
    success: true,
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
}));

module.exports = router;
