/**
 * Rate Limiter Middleware
 * @module middleware/rateLimiter
 */

const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: () => {
    throw ApiError.tooManyRequests('Too many requests from this IP, please try again later.');
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(ApiError.tooManyRequests('Too many requests from this IP, please try again later.'));
  },
});

/**
 * Authentication endpoints rate limiter
 * 10 requests per 15 minutes
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: () => {
    throw ApiError.tooManyRequests('Too many authentication attempts, please try again later.');
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(ApiError.tooManyRequests('Too many authentication attempts, please try again later.'));
  },
});

/**
 * Upload rate limiter
 * 20 requests per hour
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: () => {
    throw ApiError.tooManyRequests('Too many upload attempts, please try again later.');
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(ApiError.tooManyRequests('Too many upload attempts, please try again later.'));
  },
});

/**
 * Create custom rate limiter
 * @function createLimiter
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} max - Max requests per window
 * @param {string} message - Error message
 * @returns {Function}
 */
const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: () => {
      throw ApiError.tooManyRequests(message);
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  createLimiter,
};
