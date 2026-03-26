/**
 * Comment Routes
 * @module routes/comments
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authenticate } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const asyncHandler = require('../utils/asyncHandler');

router.post('/', authenticate, apiLimiter, [
  body('trackId').isMongoId().withMessage('Invalid track ID'),
  body('text').notEmpty().withMessage('Comment text is required')
    .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),
  body('timestamp').optional().isFloat({ min: 0 }),
  body('parentId').optional().isMongoId(),
], asyncHandler(commentController.createComment));

router.get('/:trackId', authenticate, [
  param('trackId').isMongoId().withMessage('Invalid track ID'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], asyncHandler(commentController.getComments));

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

module.exports = router;