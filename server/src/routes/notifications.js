/**
 * Notification Routes
 * @module routes/notifications
 */

const express = require('express');
const { param, query } = require('express-validator');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', authenticate, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('unread').optional().isBoolean(),
], asyncHandler(notificationController.getNotifications));

router.patch('/:id/read', authenticate, [
  param('id').isMongoId().withMessage('Invalid notification ID'),
], asyncHandler(notificationController.markAsRead));

router.patch('/read-all', authenticate, asyncHandler(notificationController.markAllAsRead));

router.delete('/:id', authenticate, [
  param('id').isMongoId().withMessage('Invalid notification ID'),
], asyncHandler(notificationController.deleteNotification));

module.exports = router;
