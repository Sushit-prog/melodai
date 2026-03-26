/**
 * S3 Service
 * Handles audio and avatar uploads to Backblaze B2 (S3-compatible)
 * @module services/s3Service
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');

const s3Client = new S3Client({
  region: env.S3_REGION || 'us-east-1',
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

const BUCKET = env.S3_BUCKET;

/**
 * Get file extension from mime type
 * @param {string} mimeType
 * @returns {string}
 */
const getExtension = (mimeType) => {
  const mimeToExt = {
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
    'audio/mp4': 'm4a',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return mimeToExt[mimeType] || 'bin';
};

/**
 * Upload file to S3
 * @async
 * @function uploadFile
 * @param {Buffer} fileBuffer - File content
 * @param {string} fileName - Original filename
 * @param {string} mimeType - MIME type
 * @param {string} folder - Folder path (tracks/avatars)
 * @returns {Promise<{url: string, key: string}>}
 */
const uploadFile = async (fileBuffer, fileName, mimeType, folder = 'tracks') => {
  const key = `${folder}/${uuidv4()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  const url = `${env.S3_ENDPOINT}/${BUCKET}/${key}`;

  return { url, key };
};

/**
 * Generate presigned URL for direct upload
 * @function getPresignedUploadUrl
 * @param {string} fileName - Original filename
 * @param {string} mimeType - MIME type
 * @param {string} folder - Folder path
 * @returns {Promise<{uploadUrl: string, fileUrl: string, key: string}>}
 */
const getPresignedUploadUrl = async (fileName, mimeType, folder = 'tracks') => {
  const ext = getExtension(mimeType);
  const key = `${folder}/${uuidv4()}-${Date.now()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
  const fileUrl = `${env.S3_ENDPOINT}/${BUCKET}/${key}`;

  return { uploadUrl, fileUrl, key };
};

/**
 * Delete file from S3
 * @async
 * @function deleteFile
 * @param {string} key - S3 object key
 * @returns {Promise<void>}
 */
const deleteFile = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await s3Client.send(command);
};

/**
 * Get presigned URL for downloading
 * @function getPresignedDownloadUrl
 * @param {string} key - S3 object key
 * @param {number} expires - Expiration time in seconds
 * @returns {Promise<string>}
 */
const getPresignedDownloadUrl = async (key, expires = 3600) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expires });
};

/**
 * Upload track audio
 * @async
 * @function uploadTrack
 * @param {Buffer} audioBuffer
 * @param {string} fileName
 * @param {string} mimeType
 * @returns {Promise<{url: string, key: string}>}
 */
const uploadTrack = (audioBuffer, fileName, mimeType) => {
  return uploadFile(audioBuffer, fileName, mimeType, 'tracks');
};

/**
 * Upload user avatar
 * @async
 * @function uploadAvatar
 * @param {Buffer} imageBuffer
 * @param {string} fileName
 * @param {string} mimeType
 * @returns {Promise<{url: string, key: string}>}
 */
const uploadAvatar = (imageBuffer, fileName, mimeType) => {
  return uploadFile(imageBuffer, fileName, mimeType, 'avatars');
};

/**
 * Upload audio file to B2
 * @async
 * @function uploadAudio
 * @param {Object} file - Multer file object
 * @param {string} userId - User ID for path organization
 * @returns {Promise<{url: string, key: string}>}
 */
const uploadAudio = async (file, userId) => {
  const ext = getExtension(file.mimetype) || 'bin';
  const key = `tracks/${userId}/${uuidv4()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  const url = `${env.S3_ENDPOINT}/${BUCKET}/${key}`;

  return { url, key };
};

/**
 * Delete audio file from B2
 * @async
 * @function deleteAudio
 * @param {string} fileKey - S3 object key
 * @returns {Promise<void>}
 */
const deleteAudio = async (fileKey) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
  });

  await s3Client.send(command);
};

/**
 * Generate presigned URL for secure audio playback
 * @async
 * @function generatePresignedUrl
 * @param {string} fileKey - S3 object key
 * @param {number} expires - Expiration time in seconds (default 3600)
 * @returns {Promise<string>}
 */
const generatePresignedUrl = async (fileKey, expires = 3600) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expires });
};

module.exports = {
  uploadFile,
  uploadTrack,
  uploadAvatar,
  uploadAudio,
  deleteAudio,
  generatePresignedUrl,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  deleteFile,
  s3Client,
};