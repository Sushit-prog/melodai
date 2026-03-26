/**
 * Authentication Routes
 * @module routes/auth
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const asyncHandler = require('../utils/asyncHandler');

router.post('/register', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('username').isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
], asyncHandler(authController.register));

router.post('/login', authLimiter, [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
], asyncHandler(authController.login));

router.post('/logout', authenticate, asyncHandler(authController.logout));

router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
], asyncHandler(authController.refreshToken));

router.get('/me', authenticate, asyncHandler(authController.getMe));

router.get('/google', asyncHandler(authController.googleAuth));

router.get('/google/callback', asyncHandler(authController.googleCallback));

module.exports = router;
