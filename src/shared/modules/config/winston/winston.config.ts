import { trace } from '@opentelemetry/api';
import { join } from 'path';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ElasticsearchTransport } from 'winston-elasticsearch';

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

const ecsFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(
    ({
      timestamp,
      level,
      message,
      stack,
      context,
      traceId,
      spanId,
      ...meta
    }) => {
      const activeSpan = trace.getActiveSpan();
      const spanContext = activeSpan?.spanContext();

      const ecsLog: any = {
        '@timestamp': timestamp,
        'ecs.version': '8.0.0',
        'log.level': level,
        message,
        'service.name': 'api-unidades-organizacionais',
      };

      if (spanContext?.traceId || traceId || meta.traceId) {
        ecsLog['trace.id'] = spanContext?.traceId || traceId || meta.traceId;
      }

      if (spanContext?.spanId || spanId || meta.spanId) {
        ecsLog['span.id'] = spanContext?.spanId || spanId || meta.spanId;
      }

      if (context) {
        ecsLog['service.component'] = context;
      }

      if (stack) {
        ecsLog['error.stack_trace'] = stack;
      }

      if (Object.keys(meta).length > 0) {
        ecsLog.metadata = meta;
      }

      return JSON.stringify(ecsLog);
    },
  ),
);

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
    format: process.env.NODE_ENV === 'production' ? ecsFormat : logFormat,
  });
};

export const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? ecsFormat : logFormat,
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
      : [
          new winston.transports.Console({
            format: ecsFormat,
          }),
        ]),

    // Elasticsearch transport for centralized logging
    ...(process.env.ELASTICSEARCH_NODE
      ? [
          new ElasticsearchTransport({
            level: 'info',
            clientOpts: {
              node: process.env.ELASTICSEARCH_NODE,
            },
            index: 'api-unidades-organizacionais-logs',
            transformer: (logData: any) => {
              const transformed = {
                '@timestamp': new Date().toISOString(),
                message: logData.message,
                severity: logData.level,
                fields: logData.meta,
                'service.name': 'api-unidades-organizacionais',
              };

              // Add trace context if available
              const activeSpan = trace.getActiveSpan();
              const spanContext = activeSpan?.spanContext();
              if (spanContext) {
                transformed['trace.id'] = spanContext.traceId;
                transformed['span.id'] = spanContext.spanId;
              }

              return transformed;
            },
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
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.printf(
      ({
        timestamp,
        method,
        url,
        statusCode,
        responseTime,
        ip,
        traceId,
        spanId,
      }) => {
        // Get trace context from OpenTelemetry if not provided
        const activeSpan = trace.getActiveSpan();
        const spanContext = activeSpan?.spanContext();

        if (process.env.NODE_ENV === 'production') {
          const duration = Number(responseTime) || 0;
          return JSON.stringify({
            '@timestamp': timestamp,
            'ecs.version': '8.0.0',
            'log.level': 'http',
            'service.name': 'api-unidades-organizacionais',
            'trace.id': spanContext?.traceId || traceId,
            'span.id': spanContext?.spanId || spanId,
            'http.request.method': method,
            'url.path': url,
            'http.response.status_code': statusCode,
            'event.duration': duration * 1000000,
            'client.ip': ip,
          });
        }
        return `${timestamp} [HTTP] ${method} ${url} ${statusCode} - ${responseTime}ms - ${ip}`;
      },
    ),
  ),
  transports: [createDailyRotateTransport('http-%DATE%.log', 'http')],
});
