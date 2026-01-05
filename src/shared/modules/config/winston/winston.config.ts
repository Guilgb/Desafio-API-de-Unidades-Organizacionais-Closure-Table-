import { join } from 'path';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  query: 4,
  debug: 5,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
  query: 'blue',
};

winston.addColors(colors);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(
    ({ timestamp, level, message, stack, context, ...meta }) => {
      let log = `${timestamp} [${level.toUpperCase()}]`;

      if (context) {
        log += ` [${context}]`;
      }

      log += `: ${message}`;

      if (stack) {
        log += `\n${stack}`;
      }

      const metaStr =
        Object.keys(meta).length > 0
          ? `\n${JSON.stringify(meta, null, 2)}`
          : '';
      log += metaStr;

      return log;
    },
  ),
);

const createDailyRotateTransport = (filename: string, level?: string) => {
  return new DailyRotateFile({
    filename: join(process.cwd(), 'logs', filename),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level,
    format: logFormat,
  });
};

export const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    createDailyRotateTransport('application-%DATE%.log'),

    createDailyRotateTransport('error-%DATE%.log', 'error'),

    createDailyRotateTransport('database-%DATE%.log', 'query'),

    ...(process.env.NODE_ENV === 'development'
      ? [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize({ all: true }),
              logFormat,
            ),
          }),
        ]
      : []),
  ],
});

export const dbLogger = winston.createLogger({
  levels,
  level: 'query',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.printf(({ timestamp, message, parameters, duration }) => {
      let log = `${timestamp} [SQL]`;

      if (duration !== undefined) {
        log += ` (${duration}ms)`;
      }

      log += `:\n${message}`;

      if (Array.isArray(parameters) && parameters.length > 0) {
        log += `\nParameters: ${JSON.stringify(parameters)}`;
      }

      return `${log}\n${'-'.repeat(80)}`;
    }),
  ),
  transports: [createDailyRotateTransport('sql-queries-%DATE%.log')],
});

export const httpLogger = winston.createLogger({
  levels,
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      ({ timestamp, method, url, statusCode, responseTime, ip }) => {
        return `${timestamp} [HTTP] ${method} ${url} ${statusCode} - ${responseTime}ms - ${ip}`;
      },
    ),
  ),
  transports: [createDailyRotateTransport('http-%DATE%.log', 'http')],
});
