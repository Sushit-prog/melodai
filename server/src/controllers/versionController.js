/**
 * Version Controller
 * @module controllers/versionController
 */

const Version = require('../models/Version');
const Track = require('../models/Track');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const EVENT = require('../socket/events');

/**
 * Create new version for a track
 * @route POST /api/versions/:trackId
 * @access Private (Owner or Collaborator)
 */
const createVersion = asyncHandler(async (req, res, next) => {
  const { trackId } = req.params;
  const { url, changelog } = req.body;
  const io = req.app.get('io');

  const track = await Track.findById(trackId);
  if (!track) {
    throw ApiError.notFound('Track not found');
  }

  const isOwner = track.userId.toString() === req.userId.toString();
  const isCollaborator = track.collaborators.some(c => c.userId.toString() === req.userId.toString());

  if (!isOwner && !isCollaborator) {
    throw ApiError.forbidden('Only track owner or collaborators can upload versions');
  }

  const lastVersion = await Version.findOne({ trackId })
    .sort({ versionNumber: -1 })
    .select('versionNumber');

  const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

  const version = await Version.create({
    trackId,
    versionNumber,
    url,
    changelog,
    uploadedBy: req.userId,
  });

  track.versions.push(version._id);
  await track.save();

  await version.populate('uploadedBy', 'username displayName avatar');

  if (io) {
    io.to(`track:${trackId}`).emit(EVENT.VERSION_CREATED, { version });
  }

  const collaboratorsToNotify = track.collaborators.filter(
    c => c.userId.toString() !== req.userId.toString()
  );

  if (!isOwner) {
    collaboratorsToNotify.push({ userId: track.userId });
  }

  for (const collab of collaboratorsToNotify) {
    const notification = await Notification.createNotification({
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

    if (io) {
      io.to(`user:${collab.userId.toString()}`).emit(EVENT.NOTIFICATION_NEW, {
        notification: notification.toObject(),
      });
    }
  }

  res.status(201).json({
    success: true,
    data: version,
  });
});

/**
 * Get all versions for a track
 * @route GET /api/versions/:trackId
 * @access Private (Owner or Collaborator)
 */
const getVersions = asyncHandler(async (req, res, next) => {
  const { trackId } = req.params;

  const track = await Track.findById(trackId);
  if (!track) {
    throw ApiError.notFound('Track not found');
  }

  const isOwner = track.userId.toString() === req.userId.toString();
  const isCollaborator = track.collaborators.some(c => c.userId.toString() === req.userId.toString());

  if (!isOwner && !isCollaborator) {
    throw ApiError.forbidden('Only track owner or collaborators can view versions');
  }

  const versions = await Version.find({ trackId })
    .populate('uploadedBy', 'username avatar')
    .sort({ versionNumber: -1 });

  res.json({
    success: true,
    data: versions,
  });
});

/**
 * Get single version by ID
 * @route GET /api/versions/single/:id
 * @access Private (Owner or Collaborator)
 */
const getVersion = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const version = await Version.findById(id)
    .populate('uploadedBy', 'username avatar');

  if (!version) {
    throw ApiError.notFound('Version not found');
  }

  const track = await Track.findById(version.trackId);
  if (!track) {
    throw ApiError.notFound('Track not found');
  }

  const isOwner = track.userId.toString() === req.userId.toString();
  const isCollaborator = track.collaborators.some(c => c.userId.toString() === req.userId.toString());

  if (!isOwner && !isCollaborator) {
    throw ApiError.forbidden('Only track owner or collaborators can view this version');
  }

  res.json({
    success: true,
    data: version,
  });
});

/**
 * Rollback track to a previous version
 * @route POST /api/versions/:trackId/rollback/:versionId
 * @access Private (Owner only)
 */
const rollbackToVersion = asyncHandler(async (req, res, next) => {
  const { trackId, versionId } = req.params;
  const io = req.app.get('io');

  const track = await Track.findById(trackId);
  if (!track) {
    throw ApiError.notFound('Track not found');
  }

  const isOwner = track.userId.toString() === req.userId.toString();
  if (!isOwner) {
    throw ApiError.forbidden('Only track owner can rollback versions');
  }

  const targetVersion = await Version.findById(versionId);
  if (!targetVersion) {
    throw ApiError.notFound('Version not found');
  }

  if (targetVersion.trackId.toString() !== trackId) {
    throw ApiError.badRequest('Version does not belong to this track');
  }

  const lastVersion = await Version.findOne({ trackId })
    .sort({ versionNumber: -1 })
    .select('versionNumber');

  const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

  const newVersion = await Version.create({
    trackId,
    versionNumber,
    url: targetVersion.url,
    changelog: `Rolled back to version ${targetVersion.versionNumber}`,
    uploadedBy: req.userId,
  });

  track.url = targetVersion.url;
  track.versions.push(newVersion._id);
  await track.save();

  await newVersion.populate('uploadedBy', 'username avatar');

  if (io) {
    io.to(`track:${trackId}`).emit(EVENT.VERSION_ROLLBACK, {
      version: newVersion,
      track: {
        _id: track._id,
        url: track.url,
        title: track.title,
      },
    });
  }

  res.json({
    success: true,
    data: {
      version: newVersion,
      track: {
        _id: track._id,
        url: track.url,
        title: track.title,
      },
    },
  });
});

module.exports = {
  createVersion,
  getVersions,
  getVersion,
  rollbackToVersion,
};
