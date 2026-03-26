/**
 * MongoDB Database Connection with Retry Logic
 * @module config/db
 */

const mongoose = require('mongoose');
const env = require('./env');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

/**
 * Connect to MongoDB with exponential backoff retry
 * @async
 * @function connectDB
 * @returns {Promise<typeof mongoose>}
 */
const connectDB = async () => {
  let retries = 0;

  const connectWithRetry = async () => {
    try {
      console.log(`Attempting MongoDB connection (attempt ${retries + 1}/${MAX_RETRIES})...`);
      
      const conn = await mongoose.connect(env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      retries++;
      
      if (retries >= MAX_RETRIES) {
        console.error('Max retries reached. Could not connect to MongoDB.');
        throw error;
      }

      const delay = RETRY_DELAY_MS * Math.pow(2, retries - 1);
      console.error(`MongoDB connection error: ${error.message}. Retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectWithRetry();
    }
  };

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
    connectWithRetry();
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err);
  });

  return connectWithRetry();
};

module.exports = connectDB;
