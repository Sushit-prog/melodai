/**
 * Track Controller
 * @module controllers/trackController
 */

const Track = require('../models/Track');
const Version = require('../models/Version');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const s3Service = require('../services/s3Service');
const { addAudioJob } = require('../queues/audioQueue');

/**
 * Create new track
 * @route POST /api/tracks
 * @access Private
 */
const createTrack = asyncHandler(async (req, res, next) => {
  const { title, description, url, bpm, key, genre, duration, tags, isPublic, waveformData } = req.body;

  const track = await Track.create({
    title,
    description,
    userId: req.userId,
    url,
    bpm,
    key,
    genre,
    duration,
    tags,
    isPublic: isPublic ?? true,
    waveformData: waveformData || [],
  });

  await track.populate('userId', 'username displayName avatar');

  res.status(201).json({
    success: true,
    data: track,
  });
});

/**
 * Get all tracks (public)
 * @route GET /api/tracks
 * @access Public
 */
const getTracks = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, genre, bpm, key, sort = '-createdAt' } = req.query;
  const query = { isPublic: true };

  if (genre) query.genre = genre;
  if (bpm) query.bpm = { $gte: parseInt(bpm) - 10, $lte: parseInt(bpm) + 10 };
  if (key) query.key = key;

  const tracks = await Track.find(query)
    .populate('userId', 'username displayName avatar')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Track.countDocuments(query);

  res.json({
    success: true,
    data: tracks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Get single track
 * @route GET /api/tracks/:id
 * @access Public (if public) / Private (if owner/collaborator)
 */
const getTrack = asyncHandler(async (req, res, next) => {
  const track = await Track.findById(req.params.id)
    .populate('userId', 'username displayName avatar bio genres instruments')
    .populate('collaborators.userId', 'username displayName avatar');

  if (!track) {
    throw ApiError.notFound('Track not found');
  }

  const isOwner = track.userId._id.toString() === req.userId?.toString();
  const isCollaborator = track.collaborators.some(c => c.userId._id.toString() === req.userId?.toString());

  if (!track.isPublic && !isOwner && !isCollaborator) {
    throw ApiError.forbidden('You do not have access to this track');
  }

  if (req.userId && (isOwner || isCollaborator)) {
    track.plays += 1;
    await track.save();
  }

  res.json({
    success: true,
    data: track,
  });
});

/**
 * Update track
 * @route PUT /api/tracks/:id
 * @access Private (Owner only)
 */
const updateTrack = asyncHandler(async (req, res, next) => {
  const { title, description, bpm, key, genre, tags, isPublic } = req.body;

  const track = await Track.findById(req.params.id);

  if (!track) {
    throw ApiError.notFound('Track not found');
  }

  if (track.userId.toString() !== req.userId.toString()) {
    throw ApiError.forbidden('You can only update your own tracks');
  }

  const updatedTrack = await Track.findByIdAndUpdate(
    req.params.id,
    { title, description, bpm, key, genre, tags, isPublic },
    { new: true, runValidators: true }
  ).populate('userId', 'username displayName avatar');

  res.json({
    success: true,
    data: updatedTrack,
  });
});

/**
 * Delete track
 * @route DELETE /api/tracks/:id
 * @access Private (Owner only)
 */
const deleteTrack = asyncHandler(async (req, res, next) => {
  const track = await Track.findById(req.params.id);

  if (!track) {
    throw ApiError.notFound('Track not found');
  }

  if (track.userId.toString() !== req.userId.toString()) {
    throw ApiError.forbidden('You can only delete your own tracks');
  }

  await Track.findByIdAndDelete(req.params.id);
  await Version.deleteMany({ trackId: req.params.id });

  res.json({
    success: true,
    message: 'Track deleted successfully',
  });
});

/**
 * Add collaborator to track
 * @route POST /api/tracks/:id/collaborators
 * @access Private (Owner only)
 */
const addCollaborator = asyncHandler(async (req, res, next) => {
  const { userId, role = 'artist' } = req.body;

  const track = await Track.findById(req.params.id);

  if (!track) {
    throw ApiError.notFound('Track not found');
  }

  if (track.userId.toString() !== req.userId.toString()) {
    throw ApiError.forbidden('Only track owner can add collaborators');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const existingCollab = track.collaborators.find(c => c.userId.toString() === userId);
  if (existingCollab) {
    throw ApiError.conflict('User is already a collaborator');
  }

  track.collaborators.push({ userId, role });
  await track.save();

  await Notification.createNotification({
    userId,
    type: 'collab',
    payload: {
      typeId: track._id,
      actorId: req.userId,
      actorName: req.user.displayName,
      trackTitle: track.title,
      trackId: track._id,
      message: `${req.user.displayName} invited you to collaborate on "${track.title}"`,
    },
  });

  res.status(201).json({
    success: true,
    data: track,
  });
});

/**
 * Remove collaborator
 * @route DELETE /api/tracks/:id/collaborators/:userId
 * @access Private (Owner only)
 */
const removeCollaborator = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const track = await Track.findById(req.params.id);

  if (!track) {
    throw ApiError.notFound('Track not found');
  }

  if (track.userId.toString() !== req.userId.toString()) {
    throw ApiError.forbidden('Only track owner can remove collaborators');
  }

  track.collaborators = track.collaborators.filter(
    c => c.userId.toString() !== userId
  );
  await track.save();

  res.json({
    success: true,
    data: track,
  });
});

/**
 * Create new version
 * @route POST /api/tracks/:id/versions
 * @access Private (Owner/Collaborator)
 */
const createVersion = asyncHandler(async (req, res, next) => {
  const { url, changelog } = req.body;

  const track = await Track.findById(req.params.id);

  if (!track) {
    throw ApiError.notFound('Track not found');
  }

  const isOwner = track.userId.toString() === req.userId.toString();
  const isCollaborator = track.collaborators.some(c => c.userId.toString() === req.userId.toString());

  if (!isOwner && !isCollaborator) {
    throw ApiError.forbidden('Only collaborators can create versions');
  }

  const lastVersion = await Version.findOne({ trackId: track._id })
    .sort({ versionNumber: -1 });

  const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

  const version = await Version.create({
    trackId: track._id,
    versionNumber,
    url,
    changelog,
    uploadedBy: req.userId,
  });

  track.versions.push(version._id);
  await track.save();

  for (const collab of track.collaborators) {
    if (collab.userId.toString() !== req.userId.toString()) {
      await Notification.createNotification({
        userId: collab.userId,
        type: 'version',
        payload: {
          typeId: version._id,
          actorId: req.userId,
          actorName: req.user.displayName,
          trackTitle: track.title,
          trackId: track._id,
          message: `${req.user.displayName} uploaded version ${versionNumber} of "${track.title}"`,
        },
      });
    }
  }

  res.status(201).json({
    success: true,
    data: version,
  });
});

/**
 * Get track versions
 * @route GET /api/tracks/:id/versions
 * @access Private (Owner/Collaborator)
 */
const getVersions = asyncHandler(async (req, res, next) => {
  const track = await Track.findById(req.params.id);

  if (!track) {
    throw ApiError.notFound('Track not found');
  }

  const isOwner = track.userId.toString() === req.userId.toString();
  const isCollaborator = track.collaborators.some(c => c.userId.toString() === req.userId.toString());

  if (!isOwner && !isCollaborator) {
    throw ApiError.forbidden('Only collaborators can view versions');
  }

  const versions = await Version.find({ trackId: track._id })
    .populate('uploadedBy', 'username displayName avatar')
    .sort('-versionNumber');

  res.json({
    success: true,
    data: versions,
  });
});

/**
 * Get presigned upload URL
 * @route POST /api/tracks/presign
 * @access Private
 */
const getPresignedUrl = asyncHandler(async (req, res, next) => {
  const { fileName, mimeType, folder = 'tracks' } = req.body;

  const result = await s3Service.getPresignedUploadUrl(fileName, mimeType, folder);

  res.json({
    success: true,
    data: result,
  });
});

/**
 * Get user's tracks
 * @route GET /api/tracks/user/:userId
 * @access Public
 */
const getUserTracks = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;

  const tracks = await Track.find({ 
    userId: req.params.userId,
    isPublic: true,
  })
    .populate('userId', 'username displayName avatar')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Track.countDocuments({ userId: req.params.userId, isPublic: true });

  res.json({
    success: true,
    data: tracks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
    });
});

/**
 * Upload track with audio file
 * @route POST /api/tracks/upload
 * @access Private
 */
const uploadTrack = asyncHandler(async (req, res, next) => {
  const { title, description, bpm, key, genre, tags, isPublic } = req.body;

  if (!req.file) {
    throw ApiError.badRequest('Audio file is required');
  }

  const { url, key: fileKey } = await s3Service.uploadAudio(req.file, req.userId.toString());

  const track = await Track.create({
    title: title || req.file.originalname.replace(/\.[^/.]+$/, ''),
    description,
    userId: req.userId,
    url,
    fileKey,
    bpm: bpm ? parseInt(bpm) : undefined,
    key,
    genre,
    tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
    isPublic: isPublic !== 'false',
    waveformData: [],
    duration: 0,
    processingStatus: 'processing',
  });

  await track.populate('userId', 'username displayName avatar');

  await addAudioJob(track._id.toString(), url, req.userId.toString());

  res.status(201).json({
    success: true,
    data: {
      track,
      message: 'Track uploaded. Processing audio...',
    },
  });
});

module.exports = {
  createTrack,
  uploadTrack,
  getTracks,
  getTrack,
  updateTrack,
  deleteTrack,
  addCollaborator,
  removeCollaborator,
  createVersion,
  getVersions,
  getPresignedUrl,
  getUserTracks,
};
