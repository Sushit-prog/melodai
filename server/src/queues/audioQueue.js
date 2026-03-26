/**
 * Audio Processing Queue
 * Handles background audio processing jobs (duration extraction, waveform generation)
 * @module queues/audioQueue
 */

const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const mongoose = require('mongoose');
const getAudioDuration = require('get-audio-duration');
const env = require('../config/env');
const Track = require('../models/Track');
const ApiError = require('../utils/ApiError');

let io;

/**
 * Set io instance from server
 * @function setIO
 * @param {Object} ioInstance - Socket.IO instance
 */
const setIO = (ioInstance) => {
  io = ioInstance;
};

/**
 * Emit upload complete event to user
 * @function emitUploadComplete
 * @param {string} userId - User ID
 * @param {Object} data - Event data
 */
const emitUploadComplete = (userId, data) => {
  if (io) {
    io.to(`user:${userId}`).emit('upload:complete', data);
  }
};

const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

const audioQueue = new Queue('audio-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

/**
 * Generate waveform peaks from audio buffer
 * Simple amplitude sampling - split into 50 chunks, get max amplitude per chunk
 * @async
 * @function generateWaveformPeaks
 * @param {Buffer} audioBuffer - Audio file buffer
 * @param {string} mimeType - MIME type
 * @returns {Promise<number[]>} - Array of 50 amplitude values (0-1)
 */
const generateWaveformPeaks = async (audioBuffer, mimeType) => {
  const NUM_POINTS = 50;
  const peaks = new Array(NUM_POINTS).fill(0);

  const bufferLength = audioBuffer.length;
  const chunkSize = Math.floor(bufferLength / NUM_POINTS);

  for (let i = 0; i < NUM_POINTS; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, bufferLength);
    let maxAmplitude = 0;

    for (let j = start; j < end; j++) {
      const amplitude = Math.abs(audioBuffer[j] - 128);
      if (amplitude > maxAmplitude) {
        maxAmplitude = amplitude;
      }
    }

    peaks[i] = Math.min(maxAmplitude / 128, 1);
  }

  return peaks;
};

/**
 * Process audio job
 * Extracts duration and generates waveform data
 * @async
 * @function processAudioJob
 * @param {Object} job - BullMQ job
 */
const processAudioJob = async (job) => {
  const { trackId, audioUrl, userId } = job.data;

  console.log(`Processing audio for track: ${trackId}`);

  try {
    const track = await Track.findById(trackId);

    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    track.processingStatus = 'processing';
    await track.save();

    const duration = await getAudioDuration.fromBuffer(Buffer.from(await fetch(audioUrl).then(r => r.arrayBuffer())));

    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const waveformData = await generateWaveformPeaks(buffer, track.url.split('.').pop());

    track.duration = Math.round(duration);
    track.waveformData = waveformData;
    track.processingStatus = 'completed';
    track.processingError = null;
    await track.save();

    emitUploadComplete(userId, {
      trackId,
      duration: track.duration,
      waveformData: track.waveformData,
      status: 'completed',
    });

    console.log(`Audio processing complete for track: ${trackId}`);

    return {
      trackId,
      duration: track.duration,
      waveformData: track.waveformData,
    };
  } catch (error) {
    console.error(`Audio processing failed for track ${trackId}:`, error);

    const track = await Track.findById(trackId);
    if (track) {
      track.processingStatus = 'failed';
      track.processingError = error.message;
      await track.save();
    }

    emitUploadComplete(userId, {
      trackId,
      error: error.message,
      status: 'failed',
    });

    throw error;
  }
};

const worker = new Worker('audio-processing', processAudioJob, {
  connection,
  concurrency: 2,
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed:`, error.message);
});

/**
 * Add audio processing job to queue
 * @async
 * @function addAudioJob
 * @param {string} trackId - Track ID
 * @param {string} audioUrl - Audio file URL
 * @param {string} userId - User ID for notifications
 * @returns {Promise<Object>} - Job instance
 */
const addAudioJob = async (trackId, audioUrl, userId) => {
  return audioQueue.add(
    'process-audio',
    { trackId, audioUrl, userId },
    {
      priority: 1,
      timeout: 120000,
    }
  );
};

/**
 * Get queue instance
 * @function getQueue
 * @returns {Queue}
 */
const getQueue = () => audioQueue;

/**
 * Close queue and worker
 * @async
 * @function closeQueue
 */
const closeQueue = async () => {
  await worker.close();
  await audioQueue.close();
  await connection.quit();
};

module.exports = {
  audioQueue,
  addAudioJob,
  getQueue,
  closeQueue,
  processAudioJob,
  setIO,
};