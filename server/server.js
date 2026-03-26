/**
 * Server Entry Point
 * @module server
 */

const app = require('./app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');
const { setIO: setAudioQueueIO } = require('./src/queues/audioQueue');

let io;

const PORT = env.PORT;

const startServer = async () => {
  try {
    await connectDB();
    
    const httpServer = createServer(app);

    const pubClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
    const subClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });

    io = new Server(httpServer, {
      cors: {
        origin: env.isDevelopment ? '*' : process.env.FRONTEND_URL,
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    io.adapter(createAdapter(pubClient, subClient));

    setAudioQueueIO(io);

    io.use((socket, next) => {
      const userId = socket.handshake.auth.userId;
      if (!userId) {
        return next(new Error('Authentication error'));
      }
      socket.userId = userId;
      next();
    });

    io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}, user: ${socket.userId}`);
      
      socket.join(`user:${socket.userId}`);
      
      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });

    httpServer.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    MelodAI Server                          ║
╠═══════════════════════════════════════════════════════════╣
║  Environment: ${env.NODE_ENV.padEnd(45)}║
║  Port: ${PORT.toString().padEnd(50)}║
║  API: http://localhost:${PORT}/api${' '.repeat(30)}║
║  Socket.IO: enabled${' '.repeat(37)}║
╚═══════════════════════════════════════════════════════════╝
      `);
    });

    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      
      io.close(() => console.log('Socket.IO closed'));
      
      httpServer.close(async () => {
        console.log('HTTP server closed');
        
        await pubClient.quit();
        await subClient.quit();
        console.log('Redis clients closed');
        
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        
        process.exit(0);
      });

      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

const getIO = () => io;

module.exports = { io, getIO };

startServer();