/**
 * Comment Routes
 * @module routes/comments
 */

const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const asyncHandler = require('../utils/asyncHandler');

router.post('/', authenticate, apiLimiter, [
  body('trackId').isMongoId().withMessage('Invalid track ID'),
  body('text').notEmpty().withMessage('Comment text is required')
    .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),
  body('timestamp').optional().isInt({ min: 0 }),
  body('parentId').optional().isMongoId(),
], asyncHandler(commentController.createComment));

router.get('/track/:trackId', [
  param('trackId').isMongoId().withMessage('Invalid track ID'),
], asyncHandler(commentController.getTrackComments));

router.put('/:id', authenticate, [
  param('id').isMongoId().withMessage('Invalid comment ID'),
  body('text').notEmpty().withMessage('Comment text is required')
    .isLength({ max: 1000 }),
], asyncHandler(commentController.updateComment));

router.delete('/:id', authenticate, [
  param('id').isMongoId().withMessage('Invalid comment ID'),
], asyncHandler(commentController.deleteComment));

router.post('/:id/reactions', authenticate, [
  param('id').isMongoId().withMessage('Invalid comment ID'),
  body('type').isIn(['like', 'heart', 'laugh', 'wow', 'sad']).withMessage('Invalid reaction type'),
], asyncHandler(commentController.addReaction));

router.delete('/:id/reactions', authenticate, [
  param('id').isMongoId().withMessage('Invalid comment ID'),
], asyncHandler(commentController.removeReaction));

router.get('/notifications', authenticate, asyncHandler(commentController.getNotifications));

router.put('/notifications/:id/read', authenticate, [
  param('id').isMongoId().withMessage('Invalid notification ID'),
], asyncHandler(commentController.markNotificationRead));

router.put('/notifications/read-all', authenticate, asyncHandler(commentController.markAllNotificationsRead));

module.exports = router;
