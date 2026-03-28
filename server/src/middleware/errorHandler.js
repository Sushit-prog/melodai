/**
 * Error Handler Middleware
 * Global error handling middleware
 * @module middleware/errorHandler
 */

const ApiError = require('../utils/ApiError');
const env = require('../config/env');

/**
 * Development error response
 * @function devError
 * @param {Error} err
 * @param {Object} res
 */
const devError = (err, res) => {
  let statusCode = err.statusCode || err.status || 500;
  if (typeof statusCode !== 'number' || statusCode < 100 || statusCode > 599) {
    statusCode = 500;
  }
  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message: err.message,
    errors: err.errors || [],
    stack: err.stack,
  });
};

/**
 * Production error response
 * @function prodError
 * @param {Error} err
 * @param {Object} res
 */
const prodError = (err, res) => {
  let statusCode = err.statusCode || err.status || 500;
  if (typeof statusCode !== 'number' || statusCode < 100 || statusCode > 599) {
    statusCode = 500;
  }
  if (err.isOperational) {
    return res.status(statusCode).json({
      success: false,
      status: statusCode,
      message: err.message,
      errors: err.errors || [],
    });
  }

  console.error('ERROR:', err);
  
  res.status(500).json({
    success: false,
    status: 500,
    message: env.isDevelopment ? err.message : 'Internal Server Error',
  });
};

/**
 * CastError handler (Mongoose)
 * @function handleCastErrorDB
 * @param {Error} err
 * @returns {ApiError}
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new ApiError(400, message);
};

/**
 * Duplicate key error handler
 * @function handleDuplicateFieldsDB
 * @param {Error} err
 * @returns {ApiError}
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value: ${field}. Please use another value.`;
  return new ApiError(400, message);
};

/**
 * Validation error handler
 * @function handleValidationErrorDB
 * @param {Error} err
 * @returns {ApiError}
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new ApiError(400, message);
};

/**
 * JWT errors handler
 * @function handleJWTError
 * @returns {ApiError}
 */
const handleJWTError = () => 
  ApiError.unauthorized('Invalid token. Please log in again.');

/**
 * JWT expired error handler
 * @function handleJWTExpiredError
 * @returns {ApiError}
 */
const handleJWTExpiredError = () => 
  ApiError.unauthorized('Token expired. Please log in again.');

/**
 * Global error handler middleware
 * @middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.statusCode = err.statusCode || err.status || 500;
  if (typeof error.statusCode !== 'number' || error.statusCode < 100 || error.statusCode > 599) {
    error.statusCode = 500;
  }
  error.message = err.message || 'Server Error';

  if (env.isDevelopment) {
    return devError(err, res);
  }

  if (err.name === 'CastError') {
    error = handleCastErrorDB(err);
  }

  if (err.code === 11000) {
    error = handleDuplicateFieldsDB(err);
  }

  if (err.name === 'ValidationError') {
    error = handleValidationErrorDB(err);
  }

  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }

  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  prodError(error, res);
};

module.exports = errorHandler;
