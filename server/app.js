/**
 * Express Application Setup
 * @module app
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./src/config/env');
const errorHandler = require('./src/middleware/errorHandler');
const { apiLimiter } = require('./src/middleware/rateLimiter');

const authRoutes = require('./src/routes/auth');
const trackRoutes = require('./src/routes/tracks');
const commentRoutes = require('./src/routes/comments');
const notificationRoutes = require('./src/routes/notifications');
const versionRoutes = require('./src/routes/versions');
const userRoutes = require('./src/routes/users');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: env.isDevelopment ? '*' : process.env.FRONTEND_URL,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (env.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/users', userRoutes);

app.use((req, res, next) => {
  next(new Error(`Route ${req.originalUrl} not found`));
});

app.use(errorHandler);

module.exports = app;
