/**
 * Authentication Middleware
 * JWT verification middleware
 * @module middleware/auth
 */

const tokenService = require('../services/tokenService');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Verify JWT access token and attach user to request
 * @middleware
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = tokenService.verifyAccessToken(token);

    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(ApiError.unauthorized('Token expired'));
    }
    if (error.name === 'JsonWebTokenError') {
      next(ApiError.unauthorized('Invalid token'));
    }
    next(error);
  }
};

/**
 * Optional authentication - attaches user if token provided
 * @middleware
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = tokenService.verifyAccessToken(token);
    const user = await User.findById(decoded.userId);

    if (user) {
      req.user = user;
      req.userId = user._id;
    }
    
    next();
  } catch (error) {
    next();
  }
};

/**
 * Check if user has required role or is owner
 * @middleware
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Check if user is owner of resource
 * @middleware
 */
const isOwner = (paramName = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    const resourceOwnerId = req.params[paramName] || req.body[paramName];
    
    if (req.user._id.toString() !== resourceOwnerId?.toString()) {
      return next(ApiError.forbidden('Not authorized to access this resource'));
    }

    next();
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  isOwner,
};
