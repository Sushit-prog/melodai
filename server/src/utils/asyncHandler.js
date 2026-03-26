/**
 * Async Handler Utility
 * Wraps async route handlers to catch errors and pass them to next()
 * @module utils/asyncHandler
 */

/**
 * Higher-order function that wraps async functions
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function with error handling
 * 
 * @example
 * router.get('/users', asyncHandler(async (req, res, next) => {
 *   const users = await User.find();
 *   res.json(users);
 * }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
