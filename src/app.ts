import express from 'express';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';
import { env } from './config/env.js';
import { sendError } from './utils/response.js';
import { errorHandler } from './middlewares/errorHandler.js';

const require = createRequire(import.meta.url);
const pino = require('pino');
const pinoHttp = require('pino-http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();

const appLogger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src': ["'self'", 'https://cdn.jsdelivr.net', 'blob:', "'unsafe-inline'"],
      'worker-src': ["'self'", 'blob:'],
      'connect-src': ["'self'", 'https://cdn.jsdelivr.net'],
      'img-src': ["'self'", 'data:', 'https:'],
      'style-src': ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
    },
  },
}));

// CORS configuration
const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];
app.use(cors({
  origin: allowedOrigins || '*',
  credentials: true,
}));

// Rate limiting for public routes
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for auth routes (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: { success: false, error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Request ID middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] as string || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Logger middleware with request ID (simplified output)
app.use(pinoHttp({
  logger: appLogger,
  genReqId: (req: { id?: string }) => req.id,
  serializers: {
    req: (req: { method?: string; url?: string; id?: string }) => ({
      method: req.method,
      url: req.url,
      id: req.id,
    }),
    res: (res: { statusCode?: number }) => ({
      statusCode: res.statusCode,
    }),
  },
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
import routes from './routes/index.js';
import docsRoutes from './routes/docs.routes.js';

// Mount docs route outside /api/v1
app.use('/api-docs', docsRoutes);

// Apply rate limiters to specific routes
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/content', publicLimiter);
app.use('/api/v1/content/live', publicLimiter);

app.use('/api/v1', routes);

// Health check endpoint for Render
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  sendError(res, 'Route not found', 404);
});

app.use("/", (_req, res) => {
  res.json({ message: "All routes are under /api/v1" });
});
// Global error handler
app.use(errorHandler);

export default app;