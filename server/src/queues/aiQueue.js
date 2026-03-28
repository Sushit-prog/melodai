/**
 * AI Processing Queue
 * Handles background AI analysis jobs (audio analysis, genre tagging, mix feedback)
 * @module queues/aiQueue
 */

const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const Track = require('../models/Track');
const aiService = require('../services/aiService');
const env = require('../config/env');
const EVENT = require('../socket/events');

let io;

const setIO = (ioInstance) => {
  io = ioInstance;
};

const emitAIEvent = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const aiQueue = new Queue('audio-processing', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 50,
    removeOnFail: 50,
  },
});

const processAnalysisJob = async (job) => {
  const { trackId, audioUrl, userId } = job.data;

  console.log(`AI Analysis job started for track: ${trackId}`);

  try {
    const track = await Track.findById(trackId);

    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    const analysis = await aiService.analyzeTrack(audioUrl);

    track.aiAnalysis = {
      bpm: analysis.bpm,
      key: analysis.key,
      mood: analysis.mood,
      detectedGenres: analysis.detectedGenres,
      energy: analysis.energy,
      instrumentation: analysis.instrumentation,
    };

    await track.save();

    emitAIEvent(userId, EVENT.AI_ANALYSIS_COMPLETE, {
      trackId,
      analysis: track.aiAnalysis,
    });

    console.log(`AI Analysis complete for track: ${trackId}`);

    return {
      trackId,
      analysis: track.aiAnalysis,
    };
  } catch (error) {
    console.error(`AI Analysis failed for track ${trackId}:`, error);

    emitAIEvent(userId, EVENT.AI_ANALYSIS_FAILED, {
      trackId,
      error: error.message,
    });

    throw error;
  }
};

const processGenreTagJob = async (job) => {
  const { trackId, userId } = job.data;

  console.log(`Genre tagging job started for track: ${trackId}`);

  try {
    const track = await Track.findById(trackId);

    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    const metadata = {
      bpm: track.bpm || track.aiAnalysis?.bpm,
      key: track.key || track.aiAnalysis?.key,
      energy: track.aiAnalysis?.energy,
      instrumentation: track.aiAnalysis?.instrumentation,
    };

    const genres = await aiService.suggestGenres(metadata);

    if (track.aiAnalysis) {
      track.aiAnalysis.detectedGenres = genres;
    } else {
      track.aiAnalysis = { detectedGenres: genres };
    }

    await track.save();

    emitAIEvent(userId, EVENT.AI_GENRE_TAG_COMPLETE, {
      trackId,
      genres,
    });

    return {
      trackId,
      genres,
    };
  } catch (error) {
    console.error(`Genre tagging failed for track ${trackId}:`, error);
    throw error;
  }
};

const processMixFeedbackJob = async (job) => {
  const { trackId, audioUrl, userId, userQuestion } = job.data;

  console.log(`Mix feedback job started for track: ${trackId}`);

  try {
    const feedback = await aiService.getMixFeedback(audioUrl, userQuestion);

    emitAIEvent(userId, EVENT.AI_FEEDBACK_READY, {
      trackId,
      feedback,
    });

    return {
      trackId,
      feedback,
    };
  } catch (error) {
    console.error(`Mix feedback failed for track ${trackId}:`, error);
    throw error;
  }
};

const worker = new Worker('audio-processing', async (job) => {
  switch (job.name) {
    case 'analyze-audio':
      return processAnalysisJob(job);
    case 'genre-tag':
      return processGenreTagJob(job);
    case 'mix-feedback':
      return processMixFeedbackJob(job);
    default:
      throw new Error(`Unknown job type: ${job.name}`);
  }
}, {
  connection,
  concurrency: 1,
});

worker.on('completed', (job) => {
  console.log(`AI Job ${job.id} (${job.name}) completed successfully`);
});

worker.on('failed', (job, error) => {
  console.error(`AI Job ${job?.id} failed:`, error.message);
});

const addAnalysisJob = async (trackId, audioUrl, userId) => {
  return aiQueue.add(
    'analyze-audio',
    { trackId, audioUrl, userId },
    {
      priority: 2,
      timeout: 180000,
    }
  );
};

const addGenreTagJob = async (trackId, userId) => {
  return aiQueue.add(
    'genre-tag',
    { trackId, userId },
    {
      priority: 3,
      timeout: 60000,
    }
  );
};

const addMixFeedbackJob = async (trackId, audioUrl, userId, userQuestion) => {
  return aiQueue.add(
    'mix-feedback',
    { trackId, audioUrl, userId, userQuestion },
    {
      priority: 3,
      timeout: 120000,
    }
  );
};

const getQueue = () => aiQueue;

const closeQueue = async () => {
  await worker.close();
  await aiQueue.close();
  await connection.quit();
};

module.exports = {
  aiQueue,
  addAnalysisJob,
  addGenreTagJob,
  addMixFeedbackJob,
  getQueue,
  closeQueue,
  setIO,
};
