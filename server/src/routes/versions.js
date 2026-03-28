/**
 * Version Routes
 * @module routes/versions
 */

const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const versionController = require('../controllers/versionController');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.get('/:trackId', authenticate, [
  param('trackId').isMongoId().withMessage('Invalid track ID'),
], asyncHandler(versionController.getVersions));

router.get('/single/:id', authenticate, [
  param('id').isMongoId().withMessage('Invalid version ID'),
], asyncHandler(versionController.getVersion));

router.post('/:trackId', authenticate, [
  param('trackId').isMongoId().withMessage('Invalid track ID'),
  body('url').notEmpty().withMessage('URL is required'),
  body('changelog').optional().isLength({ max: 1000 }),
], asyncHandler(versionController.createVersion));

router.post('/:trackId/rollback/:versionId', authenticate, [
  param('trackId').isMongoId().withMessage('Invalid track ID'),
  param('versionId').isMongoId().withMessage('Invalid version ID'),
], asyncHandler(versionController.rollbackToVersion));

module.exports = router;
