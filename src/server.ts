import app from './app.js';
import { createRequire } from 'module';
import { env } from './config/env.js';

const require = createRequire(import.meta.url);
const pino = require('pino');

const serverLogger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
});

const server = app.listen(env.PORT, () => {
  serverLogger.info(`Server running on port ${env.PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  serverLogger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    serverLogger.info('Process terminated');
  });
});

process.on('SIGINT', () => {
  serverLogger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    serverLogger.info('Process terminated');
  });
});