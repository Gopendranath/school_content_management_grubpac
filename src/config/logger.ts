import { createRequire } from 'module';
import { env } from './env.js';

const require = createRequire(import.meta.url);
const pino = require('pino');

const pinoConfig = {
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
};

const pinoTransport = env.NODE_ENV === 'production' ? undefined : {
  target: 'pino-pretty',
  options: {
    colorize: true,
  },
};

export const logger = pinoTransport
  ? pino(pinoConfig, pino.transport(pinoTransport))
  : pino(pinoConfig);
