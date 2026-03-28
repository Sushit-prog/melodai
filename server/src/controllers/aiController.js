/**
 * AI Controller
 * @module controllers/aiController
 */

const Track = require('../models/Track');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const aiService = require('../services/aiService');
const { addGenreTagJob, addMixFeedbackJob } = require('../queues/aiQueue');

const getTrackAnalysis = asyncHandler(async (req, res, next) => {
  const track = await Track.findById(req.params.id)
    .select('aiAnalysis title');

  if (!track) {
    throw ApiError.notFound('Track not found');
  }

  const isOwner = track.userId?.toString() === req.userId?.toString();
  const isCollaborator = track.collaborators?.some(
    c => c.userId?.toString() === req.userId?.toString()
  );

  if (!track.isPublic && !isOwner && !isCollaborator) {
    throw ApiError.forbidden('You do not have access to this track');
  }

  if (!track.aiAnalysis || Object.keys(track.aiAnalysis).length === 0) {
    throw ApiError.notFound('No AI analysis available for this track');
  }

  res.json({
    success: true,
    data: {
      trackId: track._id,
      title: track.title,
      analysis: track.aiAnalysis,
    },
  });
});

const requestGenreTagging = asyncHandler(async (req, res, next) => {
  const { trackId } = req.body;

  if (!trackId) {
    throw ApiError.badRequest('Track ID is required');
  }

  const track = await Track.findById(trackId);

  if (!track) {
    throw ApiError.notFound('Track not found');
  }

  const isOwner = track.userId.toString() === req.userId.toString();
  const isCollaborator = track.collaborators.some(
    c => c.userId.toString() === req.userId.toString()
  );

  if (!isOwner && !isCollaborator) {
    throw ApiError.forbidden('You do not have access to this track');
  }

  const job = await addGenreTagJob(trackId, req.userId.toString());

  res.json({
    success: true,
    data: {
      jobId: job.id,
      trackId,
      message: 'Genre tagging job queued',
    },
  });
});

const requestMixFeedback = asyncHandler(async (req, res, next) => {
  const { trackId, question } = req.body;

  if (!trackId) {
    throw ApiError.badRequest('Track ID is required');
  }

  if (!question || question.trim().length === 0) {
    throw ApiError.badRequest('Question is required');
  }

  const track = await Track.findById(trackId);

  if (!track) {
    throw ApiError.notFound('Track not found');
  }

  const isOwner = track.userId.toString() === req.userId.toString();
  const isCollaborator = track.collaborators.some(
    c => c.userId.toString() === req.userId.toString()
  );

  if (!isOwner && !isCollaborator) {
    throw ApiError.forbidden('You do not have access to this track');
  }

  const job = await addMixFeedbackJob(
    trackId,
    track.url,
    req.userId.toString(),
    question.trim()
  );

  res.json({
    success: true,
    data: {
      jobId: job.id,
      trackId,
      message: 'Mix feedback job queued. You will receive the result via socket.',
    },
  });
});

const getLyrics = asyncHandler(async (req, res, next) => {
  const { genre, mood, context, style } = req.query;

  if (!genre && !mood && !context) {
    throw ApiError.badRequest('At least one of genre, mood, or context is required');
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.on('close', () => {
    res.end();
  });

  try {
    const stream = aiService.streamLyrics(
      genre || 'pop',
      mood || 'uplifting',
      context || 'life and growth',
      style || 'verse-chorus'
    );

    for await (const chunk of stream) {
      res.write(chunk);
    }

    res.write('\n\n[DONE]');
    res.end();
  } catch (error) {
    console.error('SSE lyric streaming error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate lyrics',
      });
    } else {
      res.write(`\n\n[ERROR] ${error.message}`);
      res.end();
    }
  }
});

const reanalyzeTrack = asyncHandler(async (req, res, next) => {
  const track = await Track.findById(req.params.id);

  if (!track) {
    throw ApiError.notFound('Track not found');
  }

  const isOwner = track.userId.toString() === req.userId.toString();

  if (!isOwner) {
    throw ApiError.forbidden('Only track owner can trigger re-analysis');
  }

  const { addAnalysisJob } = require('../queues/aiQueue');
  const job = await addAnalysisJob(
    track._id.toString(),
    track.url,
    req.userId.toString()
  );

  res.json({
    success: true,
    data: {
      jobId: job.id,
      trackId: track._id,
      message: 'Re-analysis job queued',
    },
  });
});

module.exports = {
  getTrackAnalysis,
  requestGenreTagging,
  requestMixFeedback,
  getLyrics,
  reanalyzeTrack,
};
