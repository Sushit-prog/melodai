/**
 * Track Routes
 * @module routes/tracks
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();
const trackController = require('../controllers/trackController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { apiLimiter, uploadLimiter } = require('../middleware/rateLimiter');
const { uploadAudio } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');

router.post('/upload', authenticate, uploadLimiter, uploadAudio, asyncHandler(trackController.uploadTrack));

router.post('/', authenticate, [
  body('title').notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('url').notEmpty().withMessage('Audio URL is required'),
  body('bpm').optional().isInt({ min: 20, max: 300 }).withMessage('BPM must be between 20 and 300'),
  body('key').optional().isIn(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 
    'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm', 'N/A']),
  body('isPublic').optional().isBoolean(),
  body('tags').optional().isArray(),
], asyncHandler(trackController.createTrack));

router.get('/', optionalAuth, asyncHandler(trackController.getTracks));

router.get('/user/:userId', optionalAuth, [
  param('userId').isMongoId().withMessage('Invalid user ID'),
], asyncHandler(trackController.getUserTracks));

router.get('/:id', optionalAuth, [
  param('id').isMongoId().withMessage('Invalid track ID'),
], asyncHandler(trackController.getTrack));

router.put('/:id', authenticate, [
  param('id').isMongoId().withMessage('Invalid track ID'),
  body('title').optional().isLength({ max: 200 }),
  body('bpm').optional().isInt({ min: 20, max: 300 }),
], asyncHandler(trackController.updateTrack));

router.delete('/:id', authenticate, [
  param('id').isMongoId().withMessage('Invalid track ID'),
], asyncHandler(trackController.deleteTrack));

router.post('/:id/collaborators', authenticate, [
  param('id').isMongoId().withMessage('Invalid track ID'),
  body('userId').isMongoId().withMessage('Invalid user ID'),
  body('role').optional().isIn(['producer', 'mixer', 'engineer', 'artist', 'composer']),
], asyncHandler(trackController.addCollaborator));

router.delete('/:id/collaborators/:userId', authenticate, [
  param('id').isMongoId().withMessage('Invalid track ID'),
  param('userId').isMongoId().withMessage('Invalid user ID'),
], asyncHandler(trackController.removeCollaborator));

router.post('/:id/versions', authenticate, uploadLimiter, [
  param('id').isMongoId().withMessage('Invalid track ID'),
  body('url').notEmpty().withMessage('Version URL is required'),
  body('changelog').optional().isLength({ max: 1000 }),
], asyncHandler(trackController.createVersion));

router.get('/:id/versions', authenticate, [
  param('id').isMongoId().withMessage('Invalid track ID'),
], asyncHandler(trackController.getVersions));

router.post('/presign', authenticate, uploadLimiter, [
  body('fileName').notEmpty().withMessage('File name is required'),
  body('mimeType').notEmpty().withMessage('MIME type is required'),
  body('folder').optional().isIn(['tracks', 'avatars']),
], asyncHandler(trackController.getPresignedUrl));

module.exports = router;
