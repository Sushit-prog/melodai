/**
 * Multer Upload Configuration
 * Handles multipart/form-data file uploads
 * @module middleware/upload
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const audioMimeTypes = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
];

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (audioMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only audio files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

const uploadAudio = upload.single('audio');

module.exports = {
  uploadAudio,
  upload,
};