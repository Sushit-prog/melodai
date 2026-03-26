/**
 * Custom API Error Class
 * @module utils/ApiError
 */

class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {string[]} [errors] - Array of validation errors
   * @param {string} [stack] - Error stack trace
   */
  constructor(
    statusCode,
    message,
    errors = [],
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Create a 400 Bad Request error
   * @static
   * @param {string} message 
   * @param {string[]} [errors]
   * @returns {ApiError}
   */
  static badRequest(message, errors = []) {
    return new ApiError(400, message, errors);
  }

  /**
   * Create a 401 Unauthorized error
   * @static
   * @param {string} [message]
   * @returns {ApiError}
   */
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  /**
   * Create a 403 Forbidden error
   * @static
   * @param {string} message 
   * @returns {ApiError}
   */
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  /**
   * Create a 404 Not Found error
   * @static
   * @param {string} message 
   * @returns {ApiError}
   */
  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }

  /**
   * Create a 409 Conflict error
   * @static
   * @param {string} message 
   * @returns {ApiError}
   */
  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  /**
   * Create a 500 Internal Server Error
   * @static
   * @param {string} [message]
   * @returns {ApiError}
   */
  static internal(message = 'Internal Server Error') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
